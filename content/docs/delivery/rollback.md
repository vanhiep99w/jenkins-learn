---
title: "Rollback Strategy"
description: "Thiết kế rollback ứng dụng và database an toàn."
---

<Callout type="warn" title="Rollback là một quyết định vận hành">
  Rollback không đồng nghĩa chạy lại một lệnh deploy cũ. Trước khi đổi trạng thái, xác nhận artifact đang chạy, artifact known-good, trạng thái migration, phạm vi ảnh hưởng và người chịu trách nhiệm. Nếu trạng thái đích chưa rõ, dừng promotion và đọc state bằng quyền chỉ đọc; không retry hoặc rollback mù quáng.
</Callout>

Rollback tốt giảm thời gian khôi phục nhưng không được biến Jenkins thành nơi tự ý sửa production. Jenkins chỉ điều phối gate, approval và evidence. Artifact repository, nền tảng deploy, database, feature-flag service và hệ thống quan sát vẫn phải có policy, identity và audit riêng.

## Mục lục

- [Mục tiêu và nguyên tắc](#mục-tiêu-và-nguyên-tắc)
  - [Rollback và forward-fix](#rollback-và-forward-fix)
  - [Tiêu chí quyết định](#tiêu-chí-quyết-định)
- [Artifact bất biến và release metadata](#artifact-bất-biến-và-release-metadata)
  - [Known-good không chỉ là build xanh](#known-good-không-chỉ-là-build-xanh)
  - [Evidence tối thiểu](#evidence-tối-thiểu)
- [Giảm blast radius trước khi rollback](#giảm-blast-radius-trước-khi-rollback)
  - [Feature flag](#feature-flag)
  - [Traffic và cấu hình](#traffic-và-cấu-hình)
- [Database tương thích khi quay lui](#database-tương-thích-khi-quay-lui)
  - [Expand, migrate, contract](#expand-migrate-contract)
  - [Khi binary rollback không an toàn](#khi-binary-rollback-không-an-toàn)
- [Runbook rollback](#runbook-rollback)
  - [Điều kiện vào và phân quyền](#điều-kiện-vào-và-phân-quyền)
  - [Các bước thực thi](#các-bước-thực-thi)
  - [1. Dừng mở rộng phạm vi](#1-dừng-mở-rộng-phạm-vi)
  - [2. Quan sát state thực tế](#2-quan-sát-state-thực-tế)
  - [3. Chọn và xác minh candidate](#3-chọn-và-xác-minh-candidate)
  - [4. Phê duyệt và thực hiện action hẹp](#4-phê-duyệt-và-thực-hiện-action-hẹp)
  - [5. Xác minh sau action](#5-xác-minh-sau-action)
  - [6. Ghi evidence và theo dõi](#6-ghi-evidence-và-theo-dõi)
  - [Tiêu chí hoàn tất](#tiêu-chí-hoàn-tất)
- [Jenkins Pipeline: gate và approval](#jenkins-pipeline-gate-và-approval)
  - [Hợp đồng script và trust boundary](#hợp-đồng-script-và-trust-boundary)
  - [Jenkinsfile tham khảo](#jenkinsfile-tham-khảo)
  - [Đọc outcome đúng cách](#đọc-outcome-đúng-cách)
- [Rollback drill và runbook rehearsal](#rollback-drill-và-runbook-rehearsal)
- [Lab không-production an toàn](#lab-không-production-an-toàn)
  - [Điều kiện và Jenkinsfile lab](#điều-kiện-và-jenkinsfile-lab)
  - [Kết quả mong đợi](#kết-quả-mong-đợi)
- [Troubleshooting](#troubleshooting)
- [Checklist xác minh](#checklist-xác-minh)
- [Nguồn chính thức](#nguồn-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mục tiêu và nguyên tắc

Sau bài này, bạn có thể chọn rollback, forward-fix hoặc giữ nguyên trạng thái dựa trên evidence; quay về đúng artifact bất biến; tắt một capability bằng feature flag theo policy; và tránh đưa binary cũ lên schema mới không tương thích. Mục tiêu là khôi phục dịch vụ có kiểm soát, không phải làm build dashboard trở lại màu xanh.

### Rollback và forward-fix

**Rollback** triển khai lại một artifact known-good đã tồn tại và đã được xác minh. Ví dụ, release hiện tại chạy `catalog-api@sha256:new`; rollback phải yêu cầu chính xác `catalog-api@sha256:known-good`, không checkout một commit cũ rồi build lại.

**Forward-fix** tạo release mới để sửa lỗi. Đây thường là lựa chọn an toàn hơn khi release mới đã ghi dữ liệu theo dạng mà binary cũ không hiểu, hoặc migration đã thay đổi schema theo chiều không đảo được. Giữ nguyên trạng thái cũng có thể đúng khi tín hiệu chưa đủ tin cậy và việc thay đổi tiếp sẽ tăng blast radius.

| Lựa chọn | Phù hợp khi | Điều kiện tối thiểu |
| --- | --- | --- |
| Rollback artifact | Lỗi rõ sau deploy; previous digest tương thích với schema/config hiện tại. | Có digest known-good, evidence health trước đó và quyền deploy hẹp. |
| Tắt feature flag | Lỗi nằm sau capability có thể tắt độc lập. | Flag có owner, audit, default/fallback rõ và đã được thử. |
| Forward-fix | Schema/data/config mới không an toàn cho binary cũ. | Owner ứng dụng và database đồng ý; release mới qua gate cần thiết. |
| Giữ trạng thái, điều tra | Deploy bị timeout hoặc state đích chưa xác định. | Đọc trạng thái bằng API/platform evidence trước quyết định tiếp theo. |

### Tiêu chí quyết định

Không dùng một ngưỡng chung cho mọi service. Owner sản phẩm, on-call, database owner và release policy quyết định ngưỡng cụ thể. Tuy vậy, quyết định cần trả lời các câu hỏi sau trước khi Jenkins thực hiện action:

1. **Tác động có thật không?** Đối chiếu error rate, latency, saturation, synthetic check, business signal và thời điểm release. Một alert đơn lẻ có thể là lỗi quan sát; nhiều tín hiệu cùng hướng mạnh hơn.
2. **State thực tế là gì?** Đọc digest/revision đang chạy, rollout state, traffic split, config/flag state và migration version. Console Jenkins không phải source of truth duy nhất.
3. **Rollback candidate có còn dùng được không?** Xác minh digest, checksum/chữ ký theo policy, retention registry và health evidence của lần chạy tốt trước đó.
4. **Contract có tương thích không?** Kiểm API consumer, schema/database, queue message, cache format và cấu hình. Nếu chưa biết, không ép binary cũ chạy.
5. **Ai phê duyệt và ai thực thi?** Production cần owner/approver theo change policy. Người sửa Jenkinsfile hay publish artifact không nên là approver duy nhất cho chính thay đổi đó.

<Callout type="error" title="Timeout không chứng minh deploy chưa xảy ra">
  Mất kết nối giữa agent và deployment API có thể xảy ra sau khi API đã nhận yêu cầu. Trước retry, undo hoặc đóng incident, query trạng thái đích bằng identity chỉ đọc và ghi kết quả vào release record.
</Callout>

## Artifact bất biến và release metadata

### Known-good không chỉ là build xanh

Artifact bất biến là package, binary hoặc OCI image không đổi bytes sau publish. Với image, dùng reference `repository@sha256:...`; tag chỉ phù hợp để con người tìm kiếm vì tag có thể bị ghi đè. Release rollback phải dùng cùng loại identity bất biến với release ban đầu.

**Known-good** không chỉ là build từng thành công. Nó là artifact có provenance phù hợp, đã qua gate của policy, từng chạy khỏe trong context tương thích và còn có thể lấy/verify. Một digest từng pass staging không mặc nhiên là production rollback candidate nếu production config, migration hoặc traffic model đã thay đổi.

| Cách làm | Vấn đề | Quy tắc an toàn |
| --- | --- | --- |
| Deploy lại branch hoặc commit cũ | Dependency, toolchain và input build có thể đã đổi. | Chỉ deploy artifact đã publish theo digest/coordinate bất biến. |
| Dùng tag `previous` | Tag có thể bị di chuyển hoặc xóa. | Lưu digest previous/current trong release record. |
| Dùng lịch sử rollout duy nhất | Lịch sử có thể hết retention và không bao gồm config/schema. | Liên kết rollout với manifest và evidence release. |
| Chọn build xanh bất kỳ | Không biết bytes đó có từng khỏe ở context hiện tại không. | Xác minh compatibility và health evidence trước khi chọn. |

### Evidence tối thiểu

Release manifest không chứa secret. Nó là record đã review, có thể ký/xác minh theo policy, nối artifact với source, gate và action. Tên hệ thống, URL nội bộ hoặc token không cần có trong manifest để nó có giá trị.

| Nhóm | Dữ liệu hoặc reference cần giữ | Dùng khi rollback |
| --- | --- | --- |
| Artifact | logical name, version, immutable digest, checksum và chữ ký/attestation nếu policy dùng | Fetch đúng bytes và verify integrity. |
| Provenance | source revision, build URL/number, builder/toolchain và policy version | Điều tra artifact được tạo từ đâu. |
| Quality | test/scan result, waiver có expiry, staging health evidence | Đánh giá candidate có thực sự known-good. |
| Deployment | target logical, current/previous digest, rollout ID/time và deploy identity | Biết target đã nhận thay đổi nào. |
| Decision | incident/change ID, reason, decision owner, approver và outcome | Audit quyết định rollback hay forward-fix. |
| Data | migration version, compatibility assessment, backup/restore reference nếu có | Ngăn binary rollback làm hỏng dữ liệu thêm. |

Jenkins `fingerprint` giúp nối file qua build, nhưng không thay SHA-256, chữ ký hoặc artifact repository có immutability. Build retention Jenkins cũng không thay retention của registry/audit store. Thử đọc lại manifest và tải candidate theo lịch để phát hiện retention làm mất đường rollback trước sự cố thật.

## Giảm blast radius trước khi rollback

Rollback artifact có thể mất vài phút hoặc không an toàn. Trong thời gian đó, một control tách biệt có thể giảm tác động. Các control này không thay artifact rollback và mỗi control cần owner, audit, quyền tối thiểu cùng một runbook riêng.

### Feature flag

**Feature flag** là configuration có kiểm soát bật/tắt một capability tại runtime. Ví dụ, release mới có endpoint export; flag `export_v2` mặc định tắt đến khi telemetry cho thấy nó ổn định. Khi endpoint gây lỗi, tắt flag có thể giảm traffic vào capability mà không thay toàn bộ binary.

| Flag phù hợp | Không phù hợp |
| --- | --- |
| Có fallback đã kiểm thử, scope rõ, default an toàn và telemetry cho cả hai nhánh. | Dùng như biến môi trường bí mật, công tắc không có owner, hoặc cách bỏ qua authorization. |
| Thay đổi có identity, timestamp, reason, expiry/review và audit record. | Flag tồn tại vĩnh viễn, không biết trạng thái trước release hoặc không thể khôi phục state cũ. |
| Permission chỉ cho operator/release role được phê duyệt. | Cấp quyền toggle production cho PR, CI không tin cậy hoặc mọi developer. |

Một flag không rollback migration, message đã publish hay side effect đã thực hiện. Trước khi toggle, ghi current state, desired state, scope tenant/traffic, reason và owner. Sau khi toggle, kiểm telemetry trong cửa sổ policy; không kết luận thành công chỉ vì API flag trả `200`.

### Traffic và cấu hình

Canary, blue/green hoặc traffic split có thể cô lập release mới nếu platform hỗ trợ. Chúng cần ownership của ingress/service mesh/load balancer và metric theo revision. Jenkins không nên sửa traffic route trực tiếp nếu GitOps controller hay platform controller là source of truth; hai reconciler cùng ghi một resource sẽ tạo race.

Cấu hình cũng là một release input. Nếu rollback binary mà config mới không tương thích, service vẫn có thể fail. Pin config revision/reference trong release metadata; đánh giá config rollback như change riêng. Không dùng config edit khẩn cấp vô danh để "sửa nhanh", rồi mất khả năng tái hiện state.

## Database tương thích khi quay lui

### Expand, migrate, contract

Schema và data thường sống lâu hơn một binary release, vì vậy database cần thay đổi theo nhiều release. Mẫu **expand, migrate, contract** giữ compatibility trong giai đoạn chuyển tiếp:

1. **Expand:** thêm cột, bảng, index hoặc API mới theo cách không phá consumer cũ. Ví dụ thêm `display_name` nullable, không xóa `name`.
2. **Migrate:** release application có thể đọc cả `name` và `display_name`; backfill chạy có batch, rate limit, checkpoint và quan sát. Chỉ chuyển writer/reader sau khi evidence cho thấy dữ liệu phù hợp.
3. **Contract:** chỉ sau khi mọi consumer cũ đã bị loại và rollback window kết thúc, xóa cột/contract cũ trong release tách biệt. Đây không phải action tự động trong `post { failure }`.

| Thay đổi | Binary cũ có thể chạy? | Hướng rollback an toàn |
| --- | --- | --- |
| Thêm cột nullable, code cũ bỏ qua | Thường có thể, nhưng vẫn cần test. | Rollback artifact sau khi xác minh query/constraint. |
| Thêm cột rồi dual-write | Có thể nếu code cũ chấp nhận schema mở rộng. | Tắt flag hoặc rollback code; giữ data mới cho forward path. |
| Đổi kiểu cột, xóa cột hoặc constraint chặt hơn | Thường không. | Forward-fix, compatibility layer hoặc restore đã phê duyệt. |
| Backfill/side effect dữ liệu | Không suy ra được chỉ từ binary version. | Dừng batch, đánh giá integrity; restore chỉ theo runbook DBA. |

### Khi binary rollback không an toàn

Dừng rollback artifact và chuyển sang decision owner khi có một trong các dấu hiệu sau: migration destructive đã chạy; dữ liệu mới không còn parse được bởi version cũ; event schema không tương thích đã được publish; config/secret contract đã đổi; hoặc backup/restore chưa được xác minh. Lựa chọn có thể là forward-fix, feature flag, read-only/degraded mode hoặc restore dữ liệu theo kế hoạch được phê duyệt.

<Callout type="warn" title="Không tự rollback database từ Jenkins">
  Lệnh đảo migration có thể xóa dữ liệu, lock bảng hoặc không đảo được side effect. Jenkins có thể record decision và chạy gate đã phê duyệt, nhưng database owner phải xác nhận migration state, backup/restore evidence, giới hạn dữ liệu và kế hoạch recovery.
</Callout>

## Runbook rollback

### Điều kiện vào và phân quyền

Kích hoạt runbook khi health/telemetry đã xác nhận tác động theo ngưỡng policy, hoặc khi owner quyết định rủi ro của release cao hơn rủi ro quay lui. Chỉ dùng production lane từ protected branch/job; pull request, fork và agent không tin cậy không được nhận credential publish, deploy hoặc flag production.

Trước action, release commander hoặc owner ghi incident/change ID, target logical, reason, current digest, rollback digest, migration/flag assessment và người ra quyết định. Approval Jenkins là evidence hữu ích nhưng không thay Jenkins authorization, IAM của deployment platform, RBAC database hoặc change-management policy.

### Các bước thực thi

<Steps>
<Step>

### 1. Dừng mở rộng phạm vi

Dừng promotion sang môi trường kế tiếp. Nếu policy cho phép, pause canary/auto-sync hoặc tắt capability bằng flag đã được rehearsed. Ghi state trước action; không xóa workload, đổi tag hay chạy cleanup rộng để "bắt đầu lại".

</Step>
<Step>

### 2. Quan sát state thực tế

Dùng API/platform command chỉ đọc theo target đã allowlist để thu current digest/revision, rollout, traffic split, feature flag, migration version và tín hiệu health. Nếu deploy timeout hoặc state mâu thuẫn, giữ trạng thái là **unknown** và escalation thay vì gửi lệnh lần hai.

</Step>
<Step>

### 3. Chọn và xác minh candidate

Lấy rollback candidate từ release record, không từ tên tag. Verify manifest, digest/checksum, provenance/chữ ký theo policy, availability ở repository, health evidence trước đó và compatibility database/config. Nếu bất kỳ điều kiện nào không đạt, dừng và chọn forward-fix hoặc data recovery theo owner.

</Step>
<Step>

### 4. Phê duyệt và thực hiện action hẹp

Đưa current/candidate digest, target logical, impact, change/incident ID và assessment migration vào approval. Deployer identity chỉ được gọi API cho workload/môi trường allowlist. Giữ lock hẹp quanh deploy và verification để một release khác không ghi đè kết quả.

</Step>
<Step>

### 5. Xác minh sau action

Xác nhận target thực sự chạy candidate digest, rollout hoàn tất, smoke check pass và telemetry ổn định trong cửa sổ policy. Kiểm tra flag/traffic/config đã ở state mong muốn. Rollback chỉ hoàn tất sau bước này, không phải khi deploy command trả exit code `0`.

</Step>
<Step>

### 6. Ghi evidence và theo dõi

Record action, identity, timestamp, before/after digest, health outcome và residual risk vào release/incident record đã redact. Giữ release lỗi là `FAILURE`, `ABORTED` hoặc outcome phù hợp; tạo work item cho nguyên nhân gốc, flag cleanup và contract migration.

</Step>
</Steps>

### Tiêu chí hoàn tất

Một rollback được coi là hoàn tất khi tất cả điều sau đúng: target state đọc lại khớp candidate immutable reference; health/smoke/telemetry đạt ngưỡng trong thời gian quan sát; dữ liệu và dependency không có dấu hiệu incompatibility; traffic/flag/config ở state được ghi nhận; và release record có decision owner cùng evidence. Nếu còn unknown, result đúng là rollback chưa được xác minh, không phải thành công giả.

## Jenkins Pipeline: gate và approval

### Hợp đồng script và trust boundary

Mẫu Pipeline dưới điều phối rollback nhưng không nhúng endpoint, credential hay lệnh platform-specific. Trước khi dùng, đội vận hành phải review/test các script nội bộ trong controller sandbox và xác minh plugin, agent label, credential scope, lock resource, IAM cùng target allowlist.

- `ci/read-release-state` chỉ đọc target logical và ghi state đã redact vào `rollback/current-state.json`.
- `ci/verify-rollback-candidate` kiểm manifest, digest, provenance và compatibility assessment; nó từ chối candidate thiếu evidence.
- `ci/assess-rollback-safety` kiểm migration/flag/config contract và trả non-zero khi cần forward-fix hoặc escalation.
- `ci/deploy-known-good` chỉ nhận target logical allowlist và digest đã verify; API đích phải idempotent hoặc có deployment ID để query state.
- `ci/verify-rollback` xác minh digest thực tế và health theo policy; `ci/record-release-event` ghi event đã redact ra audit store đã phê duyệt.

`skipDefaultCheckout(true)` cố ý chặn checkout ngầm. Mỗi stage chạy script bên dưới thực hiện `checkout scm` rõ ràng trước khi dùng `./ci/*`; job phải cấu hình `scm` chỉ tới repository automation đã review, ref được bảo vệ và revision của build đã được Jenkins chọn, không nhận repository/ref từ parameter, PR hoặc fork. Checkout này là trust boundary: chỉ source đó được phép chạy trên `trusted-release-linux`; code không tin cậy không được dùng label này hoặc credential deploy.

Không bind credential ở cấp pipeline hoặc cho stage `input`. Agent `trusted-release-linux` phải tách khỏi agent chạy code PR. `lock` bên dưới cần [Lockable Resources plugin](https://plugins.jenkins.io/lockable-resources/); xác minh plugin và resource trên controller trước khi chuẩn hóa. Nếu chưa có, không giả định Jenkins core tạo distributed lock.

### Jenkinsfile tham khảo

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    disableConcurrentBuilds()
    timeout(time: 45, unit: 'MINUTES')
  }

  parameters {
    choice(
      name: 'TARGET',
      choices: ['staging', 'production'],
      description: 'Logical environment; scripts enforce their own allowlist.'
    )
    string(
      name: 'INCIDENT_OR_CHANGE_ID',
      defaultValue: '',
      trim: true,
      description: 'Reference only; do not enter secrets or customer data.'
    )
  }

  stages {
    stage('Read actual state') {
      agent { label 'trusted-release-linux' }
      steps {
        // Explicit, trusted SCM checkout; implicit checkout is disabled globally.
        checkout scm
        sh '''#!/bin/sh
          set -eu
          test -n "$INCIDENT_OR_CHANGE_ID"
          mkdir -p rollback
          ./ci/read-release-state --environment "$TARGET" \
            --output rollback/current-state.json
          test -s rollback/current-state.json
        '''
        archiveArtifacts artifacts: 'rollback/current-state.json', fingerprint: true
        stash name: 'current-state', includes: 'rollback/current-state.json'
      }
    }

    stage('Verify rollback candidate') {
      agent { label 'trusted-release-linux' }
      steps {
        // Each agent gets only the job's trusted SCM revision before scripts run.
        checkout scm
        unstash 'current-state'
        sh '''#!/bin/sh
          set -eu
          ./ci/verify-rollback-candidate \
            --environment "$TARGET" \
            --current rollback/current-state.json \
            --output rollback/decision.json
          ./ci/assess-rollback-safety --decision rollback/decision.json
        '''
        archiveArtifacts artifacts: 'rollback/decision.json', fingerprint: true
        stash name: 'rollback-decision', includes: 'rollback/decision.json'
      }
    }

    stage('Approve production rollback') {
      when {
        beforeInput true
        expression { params.TARGET == 'production' }
      }
      options { timeout(time: 15, unit: 'MINUTES') }
      input {
        message 'Approve the recorded target, current digest, known-good digest, migration assessment, and incident/change reference?'
        ok 'Approve rollback'
        submitter 'release-managers'
        submitterParameter 'ROLLBACK_APPROVER'
      }
      agent { label 'trusted-release-linux' }
      steps {
        // The approval does not authorize an untrusted source checkout.
        checkout scm
        unstash 'rollback-decision'
        sh '''#!/bin/sh
          set -eu
          ./ci/record-release-event \
            --event rollback-approved \
            --environment "$TARGET" \
            --decision rollback/decision.json \
            --approver "$ROLLBACK_APPROVER" \
            --reference "$INCIDENT_OR_CHANGE_ID"
        '''
      }
    }

    stage('Deploy and verify known-good artifact') {
      agent { label 'trusted-release-linux' }
      steps {
        // Re-checkout because this stage may run in a separate agent workspace.
        checkout scm
        unstash 'rollback-decision'
        lock(resource: "rollback-${params.TARGET}-catalog-api") {
          sh '''#!/bin/sh
            set -eu
            ./ci/deploy-known-good --environment "$TARGET" \
              --decision rollback/decision.json
            ./ci/verify-rollback --environment "$TARGET" \
              --decision rollback/decision.json \
              --output rollback/verification.json
            ./ci/record-release-event \
              --event rollback-verified \
              --environment "$TARGET" \
              --decision rollback/decision.json \
              --verification rollback/verification.json \
              --reference "$INCIDENT_OR_CHANGE_ID"
          '''
        }
        archiveArtifacts artifacts: 'rollback/verification.json', fingerprint: true
      }
    }
  }

  post {
    always {
      echo "Rollback run ${env.BUILD_NUMBER}: ${currentBuild.currentResult}"
    }
    aborted {
      echo 'Approval or run was aborted. Read target state before any later action.'
    }
    failure {
      echo 'Rollback is not verified. Preserve evidence and escalate with target state.'
    }
  }
}
```

### Đọc outcome đúng cách

`input` có timeout và `submitter` để approval không chờ vô hạn và có identity record, nhưng group name là ví dụ; xác minh security realm và quyền thật. Đặt gate tự động trước `input` để approver thấy candidate đã được kiểm. Approval timeout hoặc explicit abort không tự chọn rollback khác và không chứng minh deploy stage đã không chạy.

`disableConcurrentBuilds()` chỉ tuần tự hóa cùng job. `lock` chỉ bảo vệ các job cũng dùng cùng resource name, vì vậy target platform vẫn cần optimistic concurrency/idempotency và readback state. Không giữ lock khi làm approval; lock chỉ bao deploy và verify. Không bọc deploy, migration assessment hay health gate bằng `retry` để làm xanh kết quả.

## Rollback drill và runbook rehearsal

Rollback drill là rehearsal có giới hạn thời gian, target sandbox/staging, observer và tiêu chí pass/fail. Drill phải chứng minh được con người, evidence và control phối hợp ra sao; nó không chỉ là chạy một lệnh `undo`.

| Mục drill | Evidence cần thu | Kết quả đạt |
| --- | --- | --- |
| Tìm candidate | Manifest, digest, provenance và health record của candidate | Operator chọn đúng artifact không dùng tag di động. |
| Phát hiện failure | Alert/synthetic signal giả hoặc sandbox telemetry, timestamp và owner acknowledgement | Policy kích hoạt đúng người trong deadline đã đặt. |
| Decision | Current state, migration/flag assessment, incident record và approval | Lý do rollback/forward-fix rõ, không suy đoán state. |
| Thực thi | Before/after digest, deploy ID, identity và lock/queue record | Chỉ target sandbox được đổi; không tác động môi trường khác. |
| Xác minh | Smoke, telemetry window, flag/traffic state và residual risk | Digest known-good thật sự chạy và tín hiệu phục hồi. |
| Phục hồi capability | Candidate/read evidence còn lấy được sau retention/restore scenario | Repository/audit access không làm mất đường rollback. |

Diễn tập ít nhất khi thay deploy platform, release manifest, migration framework, feature-flag service, IAM/credential hoặc retention policy; tần suất cụ thể do risk owner đặt. Sau drill, ghi thời gian phát hiện, thời gian quyết định, thời gian khôi phục, bước thủ công, evidence thiếu và action owner. Không tuyên bố RTO/RPO đạt nếu drill không đo chúng.

## Lab không-production an toàn

### Điều kiện và Jenkinsfile lab

Lab này chỉ tạo một manifest text và state giả trong workspace Jenkins. Nó không checkout SCM, không dùng credential, không gọi network, không deploy, không tạo container/cluster và không xóa file. Cần Jenkins LTS có Declarative Pipeline, Pipeline: Basic Steps, `archiveArtifacts`, Linux agent label `rollback-lab`, shell POSIX và `sha256sum`. Xác minh plugin/agent trên sandbox; Jenkinsfile tĩnh không chứng minh runtime capability.

Tạo Pipeline job sandbox, chọn **Pipeline script**, rồi dán Jenkinsfile. `SCENARIO` mô phỏng quyết định; nó không là action rollback thật.

```groovy
pipeline {
  agent { label 'rollback-lab' }

  options {
    // Keep the lab self-contained: no implicit SCM checkout occurs.
    skipDefaultCheckout(true)
  }

  parameters {
    choice(
      name: 'SCENARIO',
      choices: ['success', 'unsafe-schema', 'approval-abort'],
      description: 'Creates training-only evidence; no external system is contacted.'
    )
  }

  stages {
    stage('Create immutable training artifact') {
      steps {
        sh '''#!/bin/sh
          set -eu
          LAB_ROOT="$WORKSPACE/rollback-lab-$BUILD_NUMBER"
          mkdir -p "$LAB_ROOT"
          printf '%s\n' 'rollback-training-v1' > "$LAB_ROOT/catalog-api.training"
          sha256sum "$LAB_ROOT/catalog-api.training" > "$LAB_ROOT/SHA256SUMS"
          DIGEST="sha256:$(awk '{print $1}' "$LAB_ROOT/SHA256SUMS")"
          printf '%s\n' "current=sha256:simulated-new" > "$LAB_ROOT/current-state.txt"
          printf '%s\n' "candidate=$DIGEST" > "$LAB_ROOT/decision.txt"
          printf '%s\n' 'schema=backward-compatible-training-only' >> "$LAB_ROOT/decision.txt"
        '''
      }
    }

    stage('Evaluate rollback safety') {
      steps {
        script {
          if (params.SCENARIO == 'unsafe-schema') {
            error 'Intentional lab stop: simulated schema is not safe for binary rollback.'
          }
        }
        sh '''#!/bin/sh
          set -eu
          LAB_ROOT="$WORKSPACE/rollback-lab-$BUILD_NUMBER"
          grep -Fqx 'schema=backward-compatible-training-only' "$LAB_ROOT/decision.txt"
          sha256sum --check "$LAB_ROOT/SHA256SUMS"
        '''
      }
    }

    stage('Simulated approval') {
      steps {
        script {
          if (params.SCENARIO == 'approval-abort') {
            currentBuild.result = 'ABORTED'
            error 'Intentional lab abort before any simulated deployment.'
          }
        }
        echo 'Training approval simulated; no external action is available in this lab.'
      }
    }

    stage('Record simulated rollback verification') {
      steps {
        sh '''#!/bin/sh
          set -eu
          LAB_ROOT="$WORKSPACE/rollback-lab-$BUILD_NUMBER"
          CANDIDATE="$(awk -F= '/^candidate=/ {print $2}' "$LAB_ROOT/decision.txt")"
          printf '%s\n' "verified=$CANDIDATE" > "$LAB_ROOT/verification.txt"
          grep -Fqx "verified=$CANDIDATE" "$LAB_ROOT/verification.txt"
        '''
        archiveArtifacts artifacts: "rollback-lab-${env.BUILD_NUMBER}/current-state.txt,rollback-lab-${env.BUILD_NUMBER}/decision.txt,rollback-lab-${env.BUILD_NUMBER}/SHA256SUMS,rollback-lab-${env.BUILD_NUMBER}/verification.txt", allowEmptyArchive: false
      }
    }
  }
}
```

### Kết quả mong đợi

| `SCENARIO` | Kết quả Jenkins mong đợi | Evidence |
| --- | --- | --- |
| `success` | `SUCCESS`; stage cuối archive bốn file training. | Checksum báo `OK`; `verification.txt` có cùng candidate digest với `decision.txt`. |
| `unsafe-schema` | `FAILURE` tại `Evaluate rollback safety`; stage approval và verification không chạy. | Console chỉ ra đây là failure có chủ đích; không có deploy/network action. |
| `approval-abort` | Build dừng với outcome abort/failure tùy semantics runtime của Pipeline; verification không chạy. | Console có marker abort có chủ đích; không có deploy/network action. |

Lab chỉ xác minh flow file, checksum, outcome stage và behavior runtime của sandbox. Nó không chứng minh `input`, lock plugin, artifact repository, IAM, database compatibility, feature flag, production deploy hay telemetry. Các file training cần xem lại được archive thành build artifacts và được giữ/xóa theo build/artifact retention policy của job, với quota và ACL phù hợp; retention này không bảo đảm workspace trên agent còn tồn tại. Workspace chỉ là tạm thời và phải được dọn sau build theo policy cleanup của agent/workspace; dùng workspace/job sandbox riêng.

## Troubleshooting

| Triệu chứng | Kiểm tra bằng evidence | Hành động an toàn |
| --- | --- | --- |
| Không tìm được previous artifact | Release record, manifest, registry retention, digest và ACL đọc | Dừng; không rebuild từ commit cũ hoặc deploy tag đoán chừng. |
| Rollback deploy timeout | Deployment/platform event, current digest/revision, API request ID | Query state chỉ đọc trước retry, undo hoặc forward-fix. |
| Candidate verify fail | Checksum, signature/provenance policy, manifest/source revision | Chặn candidate; điều tra evidence hoặc chọn candidate khác đã được phê duyệt. |
| Approval không hiện hoặc bị từ chối | `when`, `beforeInput`, timeout, submitter group, Jenkins authorization | Sửa policy/runtime trên sandbox; không bỏ `submitter` để vượt gate. |
| Lock chờ lâu | Lock owner/queue, target release record và change window | Điều phối owner, xác nhận current state; không xóa lock tùy tiện. |
| Target quay lại digest cũ nhưng service vẫn lỗi | Config/flag/traffic state, migration version, smoke và telemetry | Đánh giá compatibility hoặc forward-fix; không lặp rollback mà không có giả thuyết. |
| Binary cũ lỗi database | Schema version, migration history, backfill status, DBA assessment | Dừng artifact rollback; dùng expand/contract, forward-fix hoặc restore đã phê duyệt. |
| Feature flag toggle không giảm lỗi | Flag scope/default, audit event, metrics theo capability, cache propagation | Xác minh state propagation; chọn rollback/traffic control theo runbook. |
| Evidence archive thiếu hoặc có dữ liệu nhạy cảm | Archive allowlist, console log, manifest/redaction và retention ACL | Chỉ archive file allowlist đã redact; rotate credential nếu nghi ngờ lộ. |

## Checklist xác minh

- [ ] Release record có target logical, current/previous digest, source/build provenance, gate evidence, decision owner và incident/change reference.
- [ ] Candidate rollback dùng artifact bất biến còn lấy/verify được; không dùng tag di động hay rebuild source cũ.
- [ ] Candidate đã được đánh giá known-good cho environment và config hiện tại, không chỉ từng có build xanh.
- [ ] State đích được đọc lại trước action và sau action; timeout/abort không bị diễn giải thành chưa deploy hoặc success.
- [ ] Feature flag, traffic và config có owner, audit, fallback/rollback state và đã được rehearsed; chúng không thay artifact rollback.
- [ ] Database migration dùng expand/migrate/contract khi phù hợp; destructive migration, backfill và restore có database owner riêng.
- [ ] Pipeline chặn PR/fork trước credential release, dùng identity deploy quyền tối thiểu và không in/archived secret.
- [ ] Production approval nêu target, current/candidate digest, migration assessment và reference; có timeout và separation of duties theo policy.
- [ ] Concurrency có lock hẹp cùng state/idempotency control ở target; deploy và health gate không được retry mù.
- [ ] Rollback drill đã đo detection, decision, recovery, evidence retrieval và các bước thủ công; action sau drill có owner/hạn xử lý.
- [ ] Lab chỉ dùng data giả, không network/credential/deploy/destructive command và phân biệt static/runtime evidence với production proof.

## Nguồn chính thức

- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — Declarative Pipeline, `when`, `input`, `options`, `post` và parameters.
- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/) — Pipeline as Code, environment và credential usage.
- [Pipeline: Input Step](https://www.jenkins.io/doc/pipeline/steps/pipeline-input-step/) — approval, `submitter` và input parameters.
- [Pipeline: Basic Steps](https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/) — `timeout`, `retry`, `stash`, archive và interruption behavior.
- [Jenkins: Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — scope credential và giới hạn secret exposure.
- [Jenkins fingerprints](https://www.jenkins.io/doc/book/using/fingerprints/) — nối artifact qua các build Jenkins.
- [Lockable Resources plugin](https://plugins.jenkins.io/lockable-resources/) — lock resource phụ thuộc plugin.
- [Jenkins Controller Isolation](https://www.jenkins.io/doc/book/security/controller-isolation/) — tách controller, agent và workload không tin cậy.
- [Kubernetes Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) — rollout status và revision của Deployment.
- [Martin Fowler: Feature Toggles](https://martinfowler.com/articles/feature-toggles.html) — mô hình và trade-off feature flag.

## Đọc tiếp

<Cards>
  <Card title="Promotion Artifact Qua Môi Trường" href="/docs/delivery/environment-promotion" description="Promote cùng artifact digest qua dev, staging và production." />
  <Card title="Quality Gates" href="/docs/delivery/quality-gates" description="Thiết kế gate, evidence, waiver và failure outcome rõ ràng." />
  <Card title="Triển khai ứng dụng lên Kubernetes" href="/docs/delivery/kubernetes-deployment" description="Verify rollout, RBAC hẹp và rollback Deployment có kiểm soát." />
  <Card title="Jenkins & GitOps" href="/docs/delivery/gitops" description="Rollback desired state bằng commit trỏ tới digest known-good." />
  <Card title="Điều kiện và phê duyệt input" href="/docs/pipelines/when-input" description="Đặt trust gate và approval có timeout đúng thứ tự." />
  <Card title="Xử lý lỗi và Retry" href="/docs/pipelines/error-handling" description="Giữ failure, timeout và abort trung thực." />
  <Card title="Build Artifacts" href="/docs/jobs/artifacts" description="Thiết kế checksum, fingerprint, retention và artifact storage." />
</Cards>
