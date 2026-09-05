---
title: "Tích hợp GitLab"
description: "Kết nối GitLab với Jenkins bằng Multibranch, webhook và commit status theo nguyên tắc least privilege."
---

<Callout type="info" title="Phạm vi và giả định">
  Trang này mô tả Jenkins Multibranch Pipeline dùng GitLab Branch Source plugin cùng GitLab.com hoặc GitLab self-managed. Tên plugin, endpoint, field UI và hành vi discovery là dữ liệu runtime; pin Jenkins core/plugin, kiểm tra trên sandbox và đọc tài liệu của đúng version trước khi đưa vào môi trường thật.
</Callout>

GitLab cung cấp repository, Merge Request (MR), webhook và API; Jenkins phát hiện source, checkout revision rồi chạy Jenkinsfile. Không thành phần nào tự cấp trust cho code hoặc secret. Một tích hợp tốt phải phân biệt trigger với quyền release, Git transport với GitLab API, và status hiển thị với policy merge.

## Mục lục

- [Mục tiêu và mô hình](#mục-tiêu-và-mô-hình)
  - [Các thành phần và ranh giới](#các-thành-phần-và-ranh-giới)
  - [GitLab.com và self-managed](#gitlabcom-và-self-managed)
- [Kết nối GitLab an toàn](#kết-nối-gitlab-an-toàn)
  - [Plugin, URL và TLS](#plugin-url-và-tls)
  - [Chọn credential đúng nhiệm vụ](#chọn-credential-đúng-nhiệm-vụ)
  - [Least privilege, rotation và audit](#least-privilege-rotation-và-audit)
- [Webhook: trigger không phải trust](#webhook-trigger-không-phải-trust)
  - [Secret token, event và delivery](#secret-token-event-và-delivery)
  - [Idempotency, retry và scan](#idempotency-retry-và-scan)
- [Multibranch và Merge Request](#multibranch-và-merge-request)
  - [Discovery, source và target](#discovery-source-và-target)
  - [Fork, code không tin cậy và release](#fork-code-không-tin-cậy-và-release)
  - [Không nhầm Jenkins với GitLab CI](#không-nhầm-jenkins-với-gitlab-ci)
- [Commit status và protected branch](#commit-status-và-protected-branch)
  - [Context và vòng đời status](#context-và-vòng-đời-status)
  - [Permission, duplicate build và trạng thái cuối](#permission-duplicate-build-và-trạng-thái-cuối)
- [Mẫu cấu hình và Jenkinsfile](#mẫu-cấu-hình-và-jenkinsfile)
  - [Checklist cấu hình Multibranch](#checklist-cấu-hình-multibranch)
  - [Jenkinsfile không truyền token](#jenkinsfile-không-truyền-token)
- [Vận hành webhook và status](#vận-hành-webhook-và-status)
- [Lab local với fixture vô hại](#lab-local-với-fixture-vô-hại)
  - [Tạo và kiểm tra payload giả](#tạo-và-kiểm-tra-payload-giả)
  - [Kết quả và cleanup có guard](#kết-quả-và-cleanup-có-guard)
- [Troubleshooting](#troubleshooting)
- [Checklist áp dụng](#checklist-áp-dụng)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Nguồn chính thức](#nguồn-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mục tiêu và mô hình

Sau bài này, bạn có thể thiết kế một Jenkins Multibranch Pipeline phát hiện branch và MR từ GitLab, giới hạn credential theo nhiệm vụ, xác minh webhook, đọc commit status đúng ngữ cảnh và giữ release capability ngoài luồng code chưa tin cậy. Cách kiểm thử Jenkinsfile riêng với runtime integration được trình bày tại [Kiểm thử Jenkinsfile](/docs/pipelines/testing).

### Các thành phần và ranh giới

| Thành phần | Trách nhiệm | Không tự bảo đảm |
| --- | --- | --- |
| GitLab project/group | Source, branch/MR policy, webhook delivery và API/status | Jenkins agent an toàn, Jenkinsfile đúng hoặc release được phép. |
| GitLab Branch Source plugin | Discovery branch/MR, tạo child job Multibranch và dùng GitLab API theo cấu hình | Mọi GitLab API behavior, secret scope hay status policy ở mọi version. |
| Jenkins controller | Nhận trigger, index source, queue/build và lưu result | Webhook sender đáng tin hoặc artifact được phê duyệt. |
| Agent | Checkout và chạy Jenkinsfile của revision được chọn | Source có quyền dùng credential, network hoặc deploy. |
| Protected branch/MR policy | Yêu cầu review/status trước merge | Authorization Jenkins, credential scope hoặc isolation agent. |

```mermaid
flowchart LR
  A[GitLab push hoặc MR event] --> B[Webhook endpoint plugin]
  B --> C[Validate token và event]
  C --> D[Index Multibranch]
  D --> E[Branch hoặc MR child job]
  E --> F[Checkout revision và Jenkinsfile]
  F --> G{Trust tier?}
  G -->|Untrusted MR or fork| H[Ephemeral CI: test không secret]
  G -->|Protected branch after merge| I[Trusted lane: release gates]
  H --> J[Commit status theo context]
  I --> J
  J --> K[GitLab MR/protected branch policy]
```

Repository này đã cấu hình renderer Mermaid trong `source.config.ts`; khi copy tài liệu sang một Fumadocs khác, cần renderer tương đương. Sơ đồ là mô hình policy, không phải bằng chứng plugin đã chạy.

### GitLab.com và self-managed

GitLab.com là dịch vụ GitLab vận hành; GitLab self-managed do tổ chức vận hành có base URL, version, CA/TLS, reverse proxy, network và policy riêng. Đừng thay base URL GitLab.com vào self-managed, hoặc tắt kiểm tra certificate để “kết nối được”.

| Điểm cần chốt | GitLab.com | Self-managed |
| --- | --- | --- |
| Base URL API/web | Dùng URL chính thức GitLab.com theo tài liệu hiện hành | Dùng URL canonical của instance, gồm context path nếu có. |
| TLS/CA | Xác minh certificate công khai hợp lệ | Agent/controller phải trust CA nội bộ qua quản trị image/OS, không dùng bypass TLS. |
| Feature/version | Kiểm tra plan và tài liệu GitLab.com | Kiểm tra version instance, feature flag, plugin compatibility và API behavior thực tế. |
| Network | Egress allowlist đến GitLab.com | DNS, proxy, firewall, callback ingress và allowlist theo topology nội bộ. |
| Upgrade | GitLab SaaS quản lý service | Owner phải thử Jenkins/plugin webhook/API trên staging trước upgrade GitLab. |

## Kết nối GitLab an toàn

### Plugin, URL và TLS

GitLab Branch Source plugin là integration cần cài từ nguồn Jenkins đã được duyệt, pin version, review dependency/advisory và thử trên controller sandbox. Nó khác với các GitLab plugin có tên gần giống; đừng trộn UI, webhook endpoint hay Pipeline step của plugin khác vào cấu hình này. Dùng **Pipeline Syntax** và trang cấu hình của controller để lấy field/name đúng version.

Tạo GitLab server connection trong phạm vi global hoặc folder theo khả năng plugin và policy. Ghi owner, base URL canonical, credential ID, certificate/CA trust source, plugin/core/JDK version, webhook callback URL và test evidence. Một URL hợp lệ trong UI không chứng minh controller đi được qua DNS/proxy, API token có quyền, hay GitLab gửi callback thành công.

<Callout type="warn" title="Không đưa token vào clone URL">
  Không dùng remote dạng `https://user:token@host/group/project.git`, query token hay lệnh có token trong argv. Git transport credential và GitLab API credential được quản lý trong Jenkins Credentials với scope hẹp; Console Output, process list, artifact và webhook payload không được chứa giá trị secret.
</Callout>

### Chọn credential đúng nhiệm vụ

| Nhu cầu | Cơ chế phù hợp | Quyền tối thiểu cần thiết | Không dùng thay thế |
| --- | --- | --- | --- |
| Clone/fetch Git qua HTTPS | Jenkins Username with password hoặc token theo Git transport được GitLab hỗ trợ | Đọc đúng project/repository | Token API quyền rộng chỉ vì clone thuận tiện. |
| Clone/fetch Git qua SSH | Deploy key hoặc SSH key do GitLab/Jenkins quản lý | Read-only cho đúng project nếu chỉ checkout | SSH key như credential mặc định để gọi GitLab API/status. |
| Discovery MR/branch, đọc metadata, publish status | GitLab project/group access token hoặc personal access token của service identity, theo plugin hỗ trợ | API scope/project nhỏ nhất mà plugin phiên bản đó yêu cầu | Token cá nhân của developer hoặc account admin dùng chung. |
| Đăng nhập người dùng vào GitLab OAuth | OAuth application theo quy trình GitLab/SSO | Scope, redirect URI và consent tối thiểu | Credential machine-to-machine của Jenkins job. |
| Webhook validation | Secret token riêng cho một webhook | Chỉ xác thực delivery vào endpoint | GitLab API token, SSH private key hoặc password Jenkins. |

Project access token giảm scope vào một project; group access token có phạm vi rộng hơn; personal access token gắn với user/service account và dễ có blast radius lớn nếu cấp sai. Plugin có thể yêu cầu scope API khác nhau theo feature/version. Chọn token type và exact scope dựa trên plugin documentation/version rồi thử bằng service identity sandbox; không suy diễn từ token type sang permission Jenkins.

OAuth phục vụ delegated user authorization. Nó có redirect URI, consent và vòng đời khác token của service account. SSH xác thực Git transport, không gửi được webhook và không thay API token cho commit status. Giữ ba capability này tách nhau để một credential lộ không biến thành quyền quản trị GitLab.

### Least privilege, rotation và audit

Đặt credential trong folder chứa Multibranch job khi policy cho phép, để PR/job ngoài scope không nhìn thấy hoặc dùng được. Người có thể đổi Jenkinsfile, SCM source, agent label hoặc credential binding có thể biến job thành đường thực thi capability; review `Job/Configure`, credentials permission và agent trust cùng nhau. [Credentials & Secrets](/docs/security/credentials-secrets) giải thích vì sao masking không phải security boundary.

Mỗi credential cần owner, purpose, project/group scope, Jenkins credential ID, GitLab token name/reference, ngày hết hạn hoặc lịch review và revoke path. Rotate bằng token mới, thử discovery/status trên sandbox, đổi từng consumer, quan sát audit/delivery, rồi revoke token cũ sau overlap window. Không in hoặc dán old/new token vào ticket, console hay Jenkinsfile.

## Webhook: trigger không phải trust

### Secret token, event và delivery

GitLab webhook gửi HTTP request đến endpoint do integration/plugin công bố. Secret token được cấu hình ở GitLab và endpoint dùng nó để xác minh request; nó không phải chữ ký payload chung cho mọi GitLab integration. Với webhook do GitLab gửi, receiver phải xác thực header secret theo integration/version, từ chối token thiếu/sai mà không log giá trị, và chỉ chấp nhận HTTPS qua URL canonical đã được review.

Không tự viết một endpoint Groovy/shell nhận webhook để so sánh token. Dùng endpoint do plugin đã review cung cấp hoặc một gateway nội bộ có validation, rate limit, body-size limit, TLS termination và observability được owner vận hành. Nếu gateway tự xác thực, dùng so sánh constant-time của runtime phù hợp; không echo header/body khi request fail.

Event name chỉ cho biết loại event như push hoặc Merge Request; action cho biết thao tác cụ thể như mở/cập nhật/đóng MR tùy payload/version. Webhook có thể đến muộn, bị gửi lại hoặc đến đồng thời. Source of truth là GitLab API và revision/ref mà Jenkins checkout, không phải kết luận chỉ từ event name.

| Dữ liệu delivery cần lưu đã redact | Dùng để làm gì | Không lưu |
| --- | --- | --- |
| Event type/action, project logical ID, MR IID hoặc ref, commit SHA | Route workflow và điều tra | Secret header/token, cookie, authorization header. |
| Delivery/event identifier khi GitLab/version cung cấp | Deduplicate và nối retry | Raw payload không cần thiết hoặc PII dư thừa. |
| Thời gian nhận, HTTP outcome, Jenkins scan/build reference | Chẩn đoán callback/queue | URL có credential, full request body hay response nhạy cảm. |

### Idempotency, retry và scan

Một delivery không nên tạo nhiều publish/deploy side effect. Jenkins Multibranch có thể nhận webhook, chạy periodic scan hoặc được người vận hành index cùng lúc. Thiết kế build idempotent theo **revision SHA** và artifact digest: test có thể chạy nhiều lần, nhưng publish phải dùng version/digest bất biến; deploy/release phải có gate branch protected, lock hoặc request ID theo hệ đích.

Khi GitLab retry vì endpoint timeout hoặc mạng lỗi, nhận lại request không có nghĩa build trước chưa được tạo. Trước replay thủ công, đối chiếu delivery reference, Multibranch scan time, child job, revision SHA, queue item và status context. Retry callback chỉ sau khi endpoint/plugin health đã được sửa; không dùng replay để cấp thêm quyền hoặc để che build failure.

Webhook là trigger tối ưu độ trễ, còn periodic scan/index là reconciliation dự phòng khi delivery mất. Đặt interval/capacity phù hợp project, theo dõi scan trễ và giới hạn duplicate build theo policy. Không dùng `retry` quanh publish/deploy để làm status xanh.

## Multibranch và Merge Request

### Discovery, source và target

Multibranch Pipeline tạo child job cho branch/MR mà **source plugin đang chạy** discovery. GitLab Branch Source discovery behavior, strategies MR và revision checkout phụ thuộc plugin version/cấu hình. Xác minh trong sandbox rằng plugin đang tạo đúng branch/MR, Jenkinsfile path và revision trước khi biến một status thành required check.

Một MR có ít nhất hai revision cần phân biệt:

- **Source branch SHA:** commit do tác giả MR đề xuất. Build source trả lời “thay đổi của tác giả chạy thế nào trên source hiện tại?”.
- **Target branch SHA:** commit nền mà MR nhắm tới. Target có thể tiến lên sau khi MR được mở.
- **Merged result/merge ref nếu plugin/GitLab strategy hỗ trợ:** kết quả tổng hợp source với target tại thời điểm cụ thể. Nó gần merge hơn nhưng phải ghi đúng SHA/strategy vì target đổi sẽ làm kết quả cũ không còn tương ứng.

Không gọi mọi MR build là “merge result”. Hiển thị trong log/evidence `BRANCH_NAME`, source SHA, target ref/SHA nếu có và discovery strategy đã cấu hình. Các biến Multibranch tiêu chuẩn như `CHANGE_ID`, `CHANGE_TARGET`, `CHANGE_BRANCH` hoặc `CHANGE_FORK` chỉ dùng sau khi controller/plugin sandbox chứng minh chúng có mặt với semantics mong muốn.

### Fork, code không tin cậy và release

Jenkinsfile, dependency và script trong MR fork thuộc input không tin cậy. Chạy chúng trên agent ephemeral riêng, egress hẹp và không có artifact publish, signing, deploy, token GitLab write, registry write, production data hoặc release credential. Đừng dùng approval của MR làm cách cấp secret cho source chưa tin cậy.

Chỉ để lane trusted release chạy sau merge vào protected branch hoặc từ release revision được policy chấp thuận. Lane đó dùng agent/credential/network tách biệt, checkout SHA xác định và xác minh status/gate bắt buộc. Branch protection GitLab, Jenkins authorization và credential scope là ba control khác nhau; cần cả ba.

### Không nhầm Jenkins với GitLab CI

GitLab CI chạy `.gitlab-ci.yml` và tạo biến `CI_*` theo GitLab runner/pipeline context. Jenkins chạy `Jenkinsfile` và Multibranch exposes build metadata theo Jenkins/plugin. Đừng giả định biến GitLab CI như `CI_MERGE_REQUEST_IID`, `CI_JOB_TOKEN` hay GitLab pipeline status tự xuất hiện trong Jenkins.

Nếu Jenkinsfile cần MR metadata, lấy từ capability mà GitLab Branch Source plugin/Multibranch version đã xác minh, hoặc query API qua integration đã review trong lane tin cậy. Không thêm API token vào Jenkinsfile để bù một biến thiếu. Với policy branch, dùng Jenkins Multibranch `when`/metadata đã kiểm thử, và giữ release capability ở lane branch protected.

## Commit status và protected branch

### Context và vòng đời status

GitLab commit status liên kết trạng thái external CI với một commit SHA. **Context/name** phải ổn định và mô tả gate, ví dụ `jenkins/unit`, `jenkins/integration` hoặc `jenkins/release-policy`; protected branch/MR policy tham chiếu context đó. Đổi tên tùy ý làm required status không khớp dù build thành công.

| Thời điểm | Status phù hợp | Ý nghĩa cho người review |
| --- | --- | --- |
| Jenkins đã nhận/queue công việc | `pending` hoặc trạng thái khởi đầu plugin hỗ trợ | Chưa có kết quả; không phải pass. |
| Check đang chạy | `running` nếu plugin/API version biểu diễn | Tiến trình còn tiếp diễn. |
| Gate bắt buộc đạt | `success` | Đúng revision/context đã pass. |
| Test, policy hoặc build lỗi | `failed` | Không được merge/release nếu policy yêu cầu context này. |
| Người dùng hoặc timeout dừng run | `canceled` khi integration map được semantics này | Không phải `success`; cần policy quyết định retry. |
| Check có chủ đích không áp dụng | `skipped` chỉ khi policy/tool version định nghĩa rõ | Không dùng để né required gate. |

GitLab và plugin có thể map result Jenkins sang states khác nhau theo version. Xác nhận mapping của `SUCCESS`, `FAILURE`, `UNSTABLE`, `ABORTED` và trạng thái queue trên sandbox, rồi ghi policy explicit. Không coi `UNSTABLE` là success chỉ vì một UI hiển thị màu khác.

### Permission, duplicate build và trạng thái cuối

Identity publish status cần quyền API đúng project/commit và scope tối thiểu plugin yêu cầu. Quyền đọc source không tự cho ghi status; ngược lại token status rộng không nên dùng để clone hay push branch. Nếu plugin không publish được status, build result Jenkins vẫn là evidence, nhưng GitLab policy có thể không thấy required check; coi đó là integration failure cần xử lý, không merge thủ công vì “Jenkins xanh”.

Một SHA có thể có nhiều build do webhook retry, re-index hoặc trigger thủ công. Giữ context stable và policy chọn run authoritative, ví dụ build gần nhất của cùng revision/strategy. Không để build cũ của target SHA khác ghi `success` cho source SHA mới. Mỗi status evidence cần có commit SHA, MR/branch ref, build URL, plugin version/context và timestamp; không gửi token hoặc raw webhook vào status description.

Protected branch nên yêu cầu review, required status contexts và quyền merge nhỏ nhất theo GitLab policy. Bot Jenkins không cần bypass protection để report status. Khi context required bị đổi, thực hiện migration có review: publish context mới song song, cập nhật policy, xác minh MR sandbox, rồi bỏ context cũ. Không đổi policy trực tiếp trong một release incident.

## Mẫu cấu hình và Jenkinsfile

### Checklist cấu hình Multibranch

Đây là checklist UI/policy, không phải XML hoặc JCasC để copy. Tên checkbox, credential type, endpoint và discovery strategy phải lấy từ GitLab Branch Source plugin của controller đích.

1. Trên controller sandbox, review Jenkins core/JDK, GitLab Branch Source, Pipeline, Git và Credentials plugins; pin version, đọc advisory và lưu version manifest.
2. Tạo connection đến GitLab canonical URL với credential **service identity** scope project/group hẹp. Xác minh TLS/CA và API read/status capability bằng project sandbox.
3. Tạo Multibranch Pipeline trong folder chứa credential scope phù hợp. Chọn source GitLab project, Jenkinsfile path và branch/MR discovery strategy có owner.
4. Cấu hình webhook theo URL do plugin instance công bố, một secret token riêng và event scope tối thiểu. Test delivery bằng project sandbox; không gửi token trong query string hay log response body.
5. Chạy branch sandbox, MR source và nếu supported một merged-result case. Ghi checkout SHA, target/base context, build environment variables hiện diện, commit status context/state và duplicate behavior.
6. Chỉ sau các test trên, đặt context vào GitLab protected-branch/MR required policy. Giữ release credential/deploy condition riêng cho protected branch sau merge.

### Jenkinsfile không truyền token

Jenkinsfile này minh họa build code trong Multibranch. Nó không gọi GitLab API, không gửi status bằng một plugin step giả định và không nạp GitLab token. GitLab Branch Source/plugin configuration là nơi discovery và status publisher được cấu hình theo runtime. Ví dụ cần Pipeline: Declarative, GitLab Branch Source, Git plugin, JUnit plugin và agent `untrusted-ci-linux`; `junit` cần report XML thật của dự án.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timeout(time: 20, unit: 'MINUTES')
  }

  stages {
    stage('Checkout revision selected by Multibranch') {
      agent { label 'untrusted-ci-linux' }
      steps {
        checkout scm
        sh 'git rev-parse HEAD'
      }
    }

    stage('Unit gate') {
      agent { label 'untrusted-ci-linux' }
      steps {
        sh './ci/run-unit-tests'
      }
      post {
        always {
          junit allowEmptyResults: false,
            testResults: 'reports/junit/*.xml'
        }
      }
    }

    stage('Protected-branch release gate') {
      when {
        beforeAgent true
        branch 'main'
      }
      agent { label 'trusted-release-linux' }
      steps {
        sh './ci/verify-release-policy'
      }
    }
  }
}
```

`branch 'main'` là điều kiện Declarative Multibranch; nó không chứng minh GitLab đã áp branch protection hoặc revision đến sau merge. Xác minh tên branch và trust của source trên controller sandbox, rồi thêm policy protected-branch/release độc lập. Không dùng điều kiện `when` này để cấp credential cho code fork/MR. [Jenkinsfile](/docs/pipelines/jenkinsfile) and [Xử lý lỗi và Retry](/docs/pipelines/error-handling) cover syntax, exit codes and failure propagation.

## Vận hành webhook và status

Đặt alert cho webhook delivery failure, callback TLS/HTTP error, Multibranch indexing delay, status publish failure, queue growth, duplicate-build rate và token expiry. Mỗi alert nên link một evidence reference đã redact: project logical ID, revision SHA, delivery/event reference, controller/plugin version, scan/build URL và timestamp UTC.

Khi endpoint webhook, credential, GitLab version, reverse proxy hoặc plugin đổi, test lại trên sandbox vì một thay đổi có thể làm context path, secret validation, merge-ref discovery hoặc status mapping thay đổi. Giữ rollback cho connection/plugin configuration và phối hợp GitLab/Jenkins owner. Không thay một lỗi `401`, `403` hoặc TLS bằng broad token, admin permission, tắt CSRF hay bỏ TLS verification.

## Lab local với fixture vô hại

Lab chỉ tạo JSON payload giả và validator static trong directory tạm. Nó không có GitLab token, không gọi GitLab/Jenkins, không mở listener, không gửi webhook, không tạo project/MR hay publish status. Cần shell POSIX, `mktemp` và Python 3; tất cả ID/URL trong fixture là training-only.

### Tạo và kiểm tra payload giả

```bash
set -eu
umask 077

LAB_PARENT="${TMPDIR:-/tmp}"
LAB_PREFIX='jenkins-gitlab-webhook-lab.'
LAB_ROOT="$(mktemp -d "${LAB_PARENT%/}/${LAB_PREFIX}XXXXXX")"
LAB_ROOT="$(cd -- "$LAB_ROOT" && pwd -P)"
LAB_PARENT="$(cd -- "$LAB_PARENT" && pwd -P)"
case "$LAB_ROOT" in
  "${LAB_PARENT%/}/${LAB_PREFIX}"*) ;;
  *) printf 'Refuse unexpected lab path: %s\n' "$LAB_ROOT" >&2; exit 1 ;;
esac
[ "$(dirname -- "$LAB_ROOT")" = "$LAB_PARENT" ] || {
  printf 'Refuse non-direct lab child: %s\n' "$LAB_ROOT" >&2
  exit 1
}
: > "$LAB_ROOT/.lab-owned"

cat > "$LAB_ROOT/merge-request-event.json" <<'EOF'
{
  "object_kind": "merge_request",
  "project": {"id": 42, "path_with_namespace": "training/group/project"},
  "object_attributes": {"iid": 7, "action": "update", "source_branch": "feature/training", "target_branch": "main", "last_commit": {"id": "0123456789abcdef0123456789abcdef01234567"}}
}
EOF
cat > "$LAB_ROOT/status-policy.json" <<'EOF'
{"context":"jenkins/unit","allowed_states":["pending","running","success","failed","canceled","skipped"]}
EOF

python3 - "$LAB_ROOT" <<'PY'
import json
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
event = json.loads((root / 'merge-request-event.json').read_text())
policy = json.loads((root / 'status-policy.json').read_text())
attrs = event['object_attributes']
assert event['object_kind'] == 'merge_request'
assert attrs['action'] == 'update'
assert attrs['target_branch'] == 'main'
assert re.fullmatch(r'[0-9a-f]{40}', attrs['last_commit']['id'])
assert policy['context'] == 'jenkins/unit'
assert set(policy['allowed_states']) == {
    'pending', 'running', 'success', 'failed', 'canceled', 'skipped'
}
print('Fixture validation: PASS')
PY
printf 'Lab fixture directory: %s\n' "$LAB_ROOT"
```

Kết quả mong đợi là `Fixture validation: PASS` và một directory mang prefix lab. Đây chỉ kiểm chứng shape của fixture và policy static; nó không xác minh GitLab webhook token/header, GitLab API, GitLab Branch Source, Jenkins status publisher, merge ref hoặc TLS runtime.

### Kết quả và cleanup có guard

Chạy cleanup trong cùng shell sau khi đã đọc fixture. Guard canonicalize parent/root, kiểm direct child, prefix và marker trước khi xóa đúng directory do `mktemp` tạo. Nó không xóa `JENKINS_HOME`, workspace, Git repository, controller, credential hay bất cứ path do người dùng nhập.

```bash
set -eu
: "${LAB_ROOT:?Run the creation block in this shell}"
LAB_PARENT="${TMPDIR:-/tmp}"
LAB_PREFIX='jenkins-gitlab-webhook-lab.'
LAB_PARENT="$(cd -- "$LAB_PARENT" && pwd -P)"
test -d "$LAB_ROOT"
LAB_ROOT="$(cd -- "$LAB_ROOT" && pwd -P)"

case "$LAB_ROOT" in
  "${LAB_PARENT%/}/${LAB_PREFIX}"*)
    [ "$(dirname -- "$LAB_ROOT")" = "$LAB_PARENT" ] || {
      printf 'Refuse cleanup: non-direct lab child.\n' >&2
      exit 1
    }
    test -f "$LAB_ROOT/.lab-owned"
    rm -rf -- "$LAB_ROOT"
    printf 'Removed guarded GitLab webhook fixture.\n'
    ;;
  *)
    printf 'Refuse cleanup outside the lab prefix: %s\n' "$LAB_ROOT" >&2
    exit 1
    ;;
esac
```

## Troubleshooting

| Dấu hiệu | Kiểm tra có evidence | Hành động an toàn |
| --- | --- | --- |
| GitLab webhook báo lỗi HTTP/TLS | Callback URL canonical, proxy path, certificate chain, plugin endpoint/version, delivery timestamp | Sửa URL/TLS/proxy ở sandbox; không tắt verification hoặc log secret token. |
| Webhook đến nhưng không có build | Event/action, project mapping, Multibranch source/filter, index log, queue và revision | Trigger index sandbox, đối chiếu SHA; không tạo job/script endpoint ad-hoc. |
| MR build checkout nhầm revision | Source SHA, target SHA, discovery strategy, merge-ref support/version và `git rev-parse HEAD` | Sửa strategy/config rồi test lại MR sandbox; không gọi source build là merged result. |
| Status không hiện hoặc context không required | Credential API scope, project permission, plugin publisher config, context name, GitLab policy | Sửa service identity/config; không bypass merge protection vì Jenkins UI xanh. |
| Một commit có nhiều run/status | Delivery reference, index history, queue/build URL, SHA và status timestamp | Deduplicate side effect theo SHA/digest; giữ test rerun observable. |
| `401` hoặc `403` từ GitLab | Base URL, token expiry/scope, project membership, proxy/TLS, audit event | Rotate/cấp quyền tối thiểu đúng service identity; không paste token vào command để thử. |
| Fork MR có thể chạm release lane | Discovery/trust policy, agent label, credential scope, Jenkinsfile conditions | Tách pool/capability; chỉ release sau protected merge. |
| Self-managed upgrade làm integration lỗi | GitLab/Jenkins/plugin versions, API compatibility, callback path và CA | Roll back theo change plan hoặc cập nhật compatibility matrix sau sandbox test. |

## Checklist áp dụng

- [ ] GitLab.com/self-managed base URL, TLS/CA, proxy/context path, network và version compatibility được ghi rõ và thử trên sandbox.
- [ ] GitLab Branch Source, Git, Pipeline và Credentials plugins có version pin, owner, advisory/dependency review và runtime test; không trộn behavior plugin khác tên gần giống.
- [ ] Git transport, GitLab API/status, OAuth và webhook secret dùng credential/capability riêng với project/group scope nhỏ nhất.
- [ ] Token có owner, credential ID/reference, expiry/rotation/revoke path và audit; không có trong URL, argv, query, header command line, log, artifact hay fixture.
- [ ] Webhook dùng HTTPS endpoint do plugin/gateway đã review, secret validation, event/action filtering, delivery evidence redact, size/rate control và retry/deduplication plan.
- [ ] Multibranch discovery strategy, Jenkinsfile path, source SHA, target SHA và merge-result behavior được chứng minh ở controller sandbox.
- [ ] MR/fork không tin cậy chạy pool cô lập, không credential write/release/deploy; protected branch sau merge mới vào trusted release lane.
- [ ] Jenkins Multibranch metadata không bị nhầm với GitLab CI `CI_*` variables; mọi field/condition được kiểm tra trên runtime.
- [ ] Commit status có context ổn định, state mapping đã test, permission đúng project và policy required check rõ; `UNSTABLE`/abort không bị báo success.
- [ ] Duplicate webhook/index/manual build không tạo publish/deploy trùng; release gắn revision SHA và artifact digest bất biến.
- [ ] Lab chỉ dùng fixture local, static validation và cleanup marker/prefix/parent guard; không gửi webhook hoặc dùng secret thật.

## Tự kiểm tra

1. Vì sao webhook secret token không thay branch protection hoặc Jenkins authorization? Nêu control nào quyết định trigger, merge và capability chạy code.
2. Một MR source SHA pass nhưng target branch đã tiến lên. Evidence nào cho biết build đó là source hay merged result, và khi nào cần build lại?
3. Vì sao SSH deploy key không phải credential phù hợp để GitLab Branch Source publish commit status?
4. Khi một `jenkins/unit` status bị required, điều gì xảy ra nếu plugin đổi context thành `unit`? Bạn sẽ migrate policy thế nào để không chặn nhầm MR?
5. Webhook retry và periodic indexing đều thấy cùng SHA. Những step nào có thể chạy lại, và side effect nào phải deduplicate theo digest/request identity?
6. Tại sao `CI_MERGE_REQUEST_IID` không nên được chép thẳng vào Jenkinsfile? Bạn sẽ xác minh metadata Multibranch nào trên controller đích?

## Nguồn chính thức

- [GitLab webhooks](https://docs.gitlab.com/user/project/integrations/webhooks/) — event, secret token, delivery và cấu hình webhook theo version GitLab.
- [GitLab Merge Requests](https://docs.gitlab.com/user/project/merge_requests/) — MR, source/target branch và workflow review.
- [GitLab commit status API](https://docs.gitlab.com/api/commits/#post-the-build-status-to-a-commit) — context/name, trạng thái và quyền API liên quan.
- [GitLab protected branches](https://docs.gitlab.com/user/project/repository/branches/protected/) — quyền push/merge và policy branch.
- [GitLab access tokens](https://docs.gitlab.com/user/profile/personal_access_tokens/) — vòng đời token; đối chiếu project/group token với version instance đang dùng.
- [GitLab Branch Source plugin](https://plugins.jenkins.io/gitlab-branch-source/) — Multibranch integration, configuration và compatibility cần kiểm tra runtime.
- [Jenkins Multibranch Pipeline](https://www.jenkins.io/doc/book/pipeline/multibranch/) — branch discovery, child job và Jenkinsfile theo revision.
- [Jenkins: Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — credential scope và permission.
- [Credentials Binding plugin](https://plugins.jenkins.io/credentials-binding/) — binding ngắn, masking và giới hạn file/workspace.
- [Jenkins: Managing Plugins](https://www.jenkins.io/doc/book/managing/plugins/) — review lifecycle, dependency và advisory plugin.

## Đọc tiếp

<Cards>
  <Card title="Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Giữ Pipeline as Code reviewable và kiểm tra syntax/runtime đúng ranh giới." />
  <Card title="Kiểm thử Jenkinsfile" href="/docs/pipelines/testing" description="Tách lint/mock khỏi kiểm thử controller, plugin và agent sandbox." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Nạp credential ngắn hạn, không lộ qua argv, log hay artifact." />
  <Card title="Quality Gates" href="/docs/delivery/quality-gates" description="Thiết kế required status, evidence và release gate không làm xanh giả." />
</Cards>
