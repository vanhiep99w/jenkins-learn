---
title: "Tích hợp GitHub"
description: "Kết nối Jenkins với GitHub App, webhook, Multibranch Pipeline và trạng thái kiểm thử theo nguyên tắc quyền tối thiểu."
---

<Callout type="warn" title="Phạm vi và điều kiện">
  Tài liệu này mô tả cấu hình và runbook cho GitHub.com hoặc GitHub Enterprise Server có plugin/phiên bản tương thích. Tên app, organization, repository, installation ID, URL và khóa trong ví dụ đều là dữ liệu giả. Không dán private key, webhook secret, token hay payload production vào Jenkinsfile, Git hoặc Console Output.
</Callout>

GitHub báo thay đổi source; Jenkins quyết định build nào được tạo và chạy Jenkinsfile của revision nào. Hai hệ thống chỉ đáng tin khi identity GitHub App, webhook receiver, discovery policy, agent và credential release được tách thành các capability có scope hẹp. Một webhook hợp lệ có thể khởi động indexing, nhưng không biến code pull request thành code tin cậy.

## Mục lục

- [Mục tiêu và mô hình tin cậy](#mục-tiêu-và-mô-hình-tin-cậy)
  - [Kết quả cần đạt](#kết-quả-cần-đạt)
  - [Luồng từ GitHub đến Jenkins](#luồng-từ-github-đến-jenkins)
- [Chọn identity GitHub](#chọn-identity-github)
  - [GitHub App, PAT và SSH](#github-app-pat-và-ssh)
  - [Permission và phạm vi installation](#permission-và-phạm-vi-installation)
  - [Private key, rotation và audit](#private-key-rotation-và-audit)
- [Plugin và Multibranch discovery](#plugin-và-multibranch-discovery)
  - [Điều kiện runtime](#điều-kiện-runtime)
  - [Branch, pull request và merge strategy](#branch-pull-request-và-merge-strategy)
  - [Fork, Jenkinsfile và release gate](#fork-jenkinsfile-và-release-gate)
- [Webhook GitHub](#webhook-github)
  - [Sự kiện, chữ ký và tính lặp](#sự-kiện-chữ-ký-và-tính-lặp)
  - [Thiết kế endpoint và vận hành](#thiết-kế-endpoint-và-vận-hành)
- [Commit status và Checks API](#commit-status-và-checks-api)
  - [Hai mô hình phản hồi](#hai-mô-hình-phản-hồi)
  - [Quyền ghi, context và retry](#quyền-ghi-context-và-retry)
  - [Jenkinsfile tham chiếu](#jenkinsfile-tham-chiếu)
- [Cấu hình triển khai có kiểm soát](#cấu-hình-triển-khai-có-kiểm-soát)
- [Lab local tái lập không cần GitHub](#lab-local-tái-lập-không-cần-github)
  - [Tạo payload fixture có guard](#tạo-payload-fixture-có-guard)
  - [Xác minh tĩnh và kết quả mong đợi](#xác-minh-tĩnh-và-kết-quả-mong-đợi)
  - [Cleanup có guard](#cleanup-có-guard)
- [Troubleshooting](#troubleshooting)
- [Checklist trước go-live](#checklist-trước-go-live)
- [Trade-offs và giới hạn](#trade-offs-và-giới-hạn)
- [Nguồn chính thức và đọc tiếp](#nguồn-chính-thức-và-đọc-tiếp)

## Mục tiêu và mô hình tin cậy

### Kết quả cần đạt

Sau khi hoàn thành, bạn có thể:

- chọn GitHub App thay cho credential cá nhân khi Jenkins cần truy cập nhiều repository có lifecycle rõ;
- cấp installation và permission nhỏ nhất cho checkout, pull request discovery, commit status hoặc check run;
- cấu hình GitHub Branch Source và Multibranch Pipeline để discovery theo branch/pull request có review;
- xác minh webhook, chống suy luận từ event giả và xử lý delivery lặp hoặc đến sai thứ tự;
- phân biệt commit status với check run, cũng như giới hạn quyền ghi của từng cơ chế;
- tách build fork không tin cậy khỏi credential publish/release, rồi chỉ cấp capability sau gate branch/trust;
- chạy lab local chỉ parse fixture công khai, không gửi request đến GitHub hay Jenkins.

### Luồng từ GitHub đến Jenkins

```text
GitHub App installation ── quyền hẹp ──► GitHub API / repository đã chọn
          │                                      │
          │ webhook có chữ ký                    │ branch/PR metadata
          ▼                                      ▼
Webhook endpoint do plugin quản lý ──► Branch Source indexing ──► job con Multibranch
                                                                         │
                           PR hoặc fork: agent/pool không đặc quyền ────┤
                           branch tin cậy: gate + credential scope ────┤
                                                                         ▼
                                             build result ──► status hoặc check run
```

Webhook và API identity có trách nhiệm khác nhau. Webhook xác thực nguồn delivery và kích hoạt Jenkins cập nhật state. GitHub App xác thực Jenkins khi plugin clone metadata, đọc source hoặc công bố feedback. Cả hai phải có secret/permission riêng, owner, rotation và audit.

## Chọn identity GitHub

### GitHub App, PAT và SSH

| Cơ chế | Cách nhận diện | Phù hợp | Giới hạn/rủi ro |
| --- | --- | --- | --- |
| **GitHub App** | App có private key; GitHub cấp installation access token ngắn hạn cho installation được chọn | Jenkins server integration, nhiều repository, webhook, status/checks và audit theo app | Cần quản lý private key, installation scope, permission và plugin hỗ trợ App. |
| **PAT** | Token gắn với một user hoặc service account | Migration ngắn hạn hay tool chưa hỗ trợ App | Lifecycle phụ thuộc account; scope có thể rộng; không dùng PAT cá nhân làm identity Jenkins lâu dài. |
| **SSH deploy key** | Key pair gắn với một repository hoặc account SSH | Git clone/push Git transport hẹp | Không thay GitHub API identity cho webhook, PR metadata, status hoặc checks. |

GitHub App là lựa chọn mặc định khi Jenkins tích hợp GitHub API. App có identity độc lập với nhân sự, installation có thể giới hạn theo organization và repository, còn token được GitHub phát hành cho installation. PAT và SSH không phải sai về mặt kỹ thuật; chúng chỉ giải quyết capability khác. Không dùng SSH key để mong plugin tạo check run, và không dùng PAT quyền rộng chỉ vì app chưa được cấu hình.

### Permission và phạm vi installation

Bắt đầu với installation chỉ cho repository Jenkins thực sự cần. Khi setup App, chọn account/organization đúng owner, chọn repository cụ thể thay vì toàn bộ organization nếu số lượng cho phép, rồi ghi App slug, installation scope, owner và mục đích trong inventory an toàn.

Permission cụ thể phụ thuộc discovery và feedback đang bật. Bảng sau là baseline để review, không phải lệnh cấp quyền hàng loạt:

| Nhu cầu | GitHub App permission cần xem xét | Giới hạn cần giữ |
| --- | --- | --- |
| Đọc metadata repository | `Metadata: Read` | Metadata là permission cơ bản của App; vẫn giới hạn installation repository. |
| Clone/đọc source | `Contents: Read` | Không cấp write nếu Jenkins không commit/tag/push. |
| Discover pull request | `Pull requests: Read` | Chỉ thêm khi source strategy thực sự cần PR metadata. |
| Ghi commit status | `Commit statuses: Read and write` | Chỉ cho app publish context Jenkins đã định nghĩa. |
| Tạo/cập nhật check run | `Checks: Read and write` | Chỉ thêm khi dùng Checks API/plugin hỗ trợ check run. |

Không cấp `Administration`, `Members`, `Secrets`, organization owner hay permission write không liên quan chỉ để chữa `403`. Nếu Jenkins cần tạo pull request hoặc push repository cấu hình, tách App/installation đó khỏi App chỉ đọc source khi policy yêu cầu separation of duties.

GitHub App cũng có lựa chọn đăng ký webhook event. Chọn đúng event mà source plugin cần, thường gồm `push` và `pull_request` cho Multibranch discovery. Chỉ đăng ký thêm event sau khi biết consumer và xử lý của nó. App permission không thay webhook secret, và webhook secret không cấp GitHub API permission.

### Private key, rotation và audit

Private key của GitHub App dùng để chứng minh app identity khi plugin xin installation access token. Nó là secret có khả năng ký, không phải file cấu hình thông thường. Lưu key trong Jenkins Credentials kiểu phù hợp với plugin hoặc secret manager được kiểm soát; Jenkinsfile chỉ được tham chiếu credential/server name theo cơ chế plugin, không chứa PEM, base64 hay path key tự tạo.

Áp dụng các guardrail sau:

- đặt credential trong folder/system scope hẹp nhất, có owner, consumer, purpose và review date;
- chỉ agent/controller component thật sự cần plugin mới được dùng capability; code fork không nhận binding secret release;
- không `echo`, `cat`, `printenv`, archive workspace hoặc bật `set -x` trong scope có key/token;
- tạo key mới theo quy trình, cập nhật credential bằng change review, smoke test trên sandbox, rồi thu hồi key cũ sau thời gian chuyển đổi;
- đối chiếu GitHub audit log, Jenkins build/audit record, App installation changes, webhook delivery ID và change record khi điều tra.

Installation access token có thời hạn do GitHub quyết định và plugin thường tự làm mới; không tự cache hay in token để "giúp" plugin. Khi nghi ngờ key lộ, disable/rotate key theo incident process, review installation scope và kiểm các log/artifact có thể đã nhận dữ liệu nhạy cảm.

## Plugin và Multibranch discovery

### Điều kiện runtime

GitHub Branch Source là **plugin**, không phải Jenkins core. Nó làm việc cùng Branch API, SCM API, Git/Git client, Pipeline và GitHub API integration để discovery repository, branch và pull request. Khả năng chính xác, tên credential type, source behaviors, webhook registration, status publisher và Pipeline step phụ thuộc version Jenkins LTS cùng bộ plugin đang chạy.

Trước go-live, platform owner cần xác minh trên controller sandbox:

1. Jenkins LTS, GitHub Branch Source, GitHub API, Git/Git client, Branch API, SCM API và Pipeline dependencies tương thích, đã review advisory.
2. GitHub server configuration dùng GitHub App credential đã tạo đúng installation; DNS, TLS/CA, proxy và rate-limit phù hợp.
3. Multibranch job có owner, repository source, script path, discovery behavior, orphaned-item retention và scan fallback rõ ràng.
4. Webhook endpoint đang được plugin cấu hình/ghi nhận, public Jenkins URL dùng HTTPS và GitHub delivery nhận response hợp lệ.
5. Plugin UI, Pipeline Syntax và log runtime xác nhận behavior; không suy ra field hoặc step từ một ví dụ trên Internet.

### Branch, pull request và merge strategy

Multibranch Pipeline tạo job con từ branch và SCM change request mà source plugin phát hiện. Mỗi build phải kiểm đúng commit và Jenkinsfile của revision được chọn; build branch không được dùng source từ branch khác chỉ vì tên job giống nhau.

Pull request có ba cách checkout thường gặp. Tên/availability chính xác của behavior cần đọc trong plugin UI đúng version:

| Chiến lược PR | Nội dung kiểm | Lợi ích | Điều cần hiểu |
| --- | --- | --- | --- |
| Head của PR | Commit hiện tại của nhánh nguồn | Biết chính xác contributor đã gửi gì | Không kiểm tương tác với base branch mới nhất. |
| Merge thử với base hiện tại | Kết quả merge do hosting/source plugin tạo | Gần điều mà merge có thể tạo ra | Kết quả có thể thay đổi khi base branch tiến lên. |
| Cả head và merge thử | Hai build/report riêng | Phân biệt lỗi branch nguồn và lỗi tích hợp | Tăng tải, report/context cần phân biệt rõ. |

Chọn strategy theo branch protection của repository. Nếu required check yêu cầu merge thử nhưng Jenkins chỉ test head, pull request có thể xanh trên source mà vẫn lỗi khi ghép với base. Nếu chạy cả hai, dùng context/check name có ý nghĩa để reviewer biết kết quả nào là required. Không bảo vệ merge chỉ bằng một status mơ hồ như `build`.

Webhook khởi động nhanh indexing/build; periodic scan giới hạn có thể là fallback khi delivery bị mất. Scan không là cơ chế polling vô hạn: đặt cadence theo số repository, GitHub API rate limit và capacity Jenkins. Orphaned-item strategy chỉ xóa job con theo retention được owner duyệt; nó không là cleanup credential hoặc audit record.

### Fork, Jenkinsfile và release gate

GitHub fork và pull request là boundary tin cậy. Contributor có thể sửa Jenkinsfile, shared script, dependency, test output hoặc URL. Do đó build fork chỉ nên có agent/pod untrusted, egress hẹp và credential đọc tối thiểu nếu thật sự cần. Không cấp private key App có quyền write, token publish, deploy credential, cache ghi chung hoặc agent release cho code đó.

Một model an toàn:

- Pull request/fork chạy test, lint và scan trên pool `untrusted-pr`; kết quả phản hồi về GitHub do plugin/server policy đã review, không do shell nhận token từ Jenkinsfile.
- Chỉ `main` đã được branch protection và không phải change request mới vào stage publish/release trên pool `trusted-release`.
- Stage trusted dùng `when { beforeAgent true ... }`, checkout `scm` của chính run sau gate và chỉ bind credential trong closure ngắn.
- GitHub review, Jenkins authorization, agent isolation và quyền target là các control độc lập. Approval giao diện không biến PR fork thành trusted.

Không chạy Jenkinsfile của PR fork trên controller. Khi cần retest sau maintainer approval, dùng policy source plugin/Jenkins được team review và ghi actor/revision đã được approved; đừng tạo một nút "build with production secrets".

## Webhook GitHub

### Sự kiện, chữ ký và tính lặp

GitHub webhook gửi HTTP request cùng event type trong header `X-GitHub-Event`, delivery identifier và payload JSON. Với GitHub App, chọn các event tối thiểu cần cho discovery. `push` thường báo cập nhật branch; `pull_request` có action như `opened`, `synchronize`, `reopened` hoặc `closed`. Một event không mặc nhiên có nghĩa job cần publish/release.

Webhook receiver phải xác minh `X-Hub-Signature-256` dựa trên raw request body và webhook secret trước khi tin payload. Verification dùng HMAC SHA-256 và so sánh constant-time; không parse payload rồi tự ghép lại để tính signature vì bytes có thể khác. Khi plugin là receiver, cấu hình webhook secret ở GitHub và plugin theo tài liệu version đang cài; không viết receiver tự chế trong Jenkinsfile.

Delivery có thể được redeliver, đến trễ hoặc khác thứ tự. Idempotency là bắt buộc: dùng delivery ID/run metadata để điều tra, để plugin indexing xác định state hiện tại từ GitHub API và không coi cùng event là một release lần hai. Webhook signature xác minh nguồn delivery, không xác minh code trong commit là an toàn.

### Thiết kế endpoint và vận hành

GitHub cần gọi được Jenkins URL canonical qua HTTPS. Với GitHub integration phổ biến, endpoint webhook thường được plugin expose dưới path do cấu hình/tài liệu plugin chỉ định; xác minh URL hiển thị trên controller trước khi nhập vào GitHub, thay vì đoán path hoặc tự tạo endpoint. Nếu một plugin yêu cầu route chuẩn như `/github-webhook/`, dùng đúng public Jenkins base URL và route đó sau khi đã kiểm trong runtime.

- Đặt reverse proxy/TLS, DNS và Jenkins URL canonical trước khi cấu hình webhook. Không public port nội bộ hay bỏ TLS để GitHub delivery thành công.
- Cho phép ingress hẹp theo hạ tầng tổ chức. IP allowlist có thể là lớp bổ sung, không thay verification signature.
- Trả response nhanh để receiver không bị retry vì làm việc nặng. Indexing/build nên chạy async theo plugin queue.
- Quan sát delivery status ở GitHub, access log/redacted plugin log, queue/indexing log Jenkins và GitHub API rate limit. Không log raw payload nếu nó có dữ liệu không cần thiết.
- Rotate webhook secret phối hợp: thay secret ở receiver và GitHub endpoint theo change window, kiểm một delivery sandbox rồi thu hồi giá trị cũ. Không gửi secret qua curl command, ticket hay chat.

## Commit status và Checks API

### Hai mô hình phản hồi

**Commit status** gắn một trạng thái ngắn vào một commit SHA. Nó có `context` ổn định, state như `pending`, `success`, `failure` hoặc `error`, cùng description/target URL không nhạy cảm. Branch protection có thể yêu cầu một context cụ thể. Đây là mô hình đơn giản khi chỉ cần pass/fail của một pipeline.

**Check run** của Checks API gắn vào `head_sha`. Nó có lifecycle `queued`/`in_progress`/`completed`, conclusion khi hoàn tất, details URL và có thể đính annotation theo file/line. Check run phù hợp khi tool trả nhiều finding có vị trí hoặc khi UI cần tách nhiều bước; nó không phải cùng resource với commit status.

| Thuộc tính | Commit status | Check run |
| --- | --- | --- |
| Định danh hiển thị | `context` | Tên check run và app tạo nó |
| Tiến trình | State trực tiếp | Status rồi conclusion khi completed |
| Chi tiết code | Không có annotation chuẩn của Checks API | Có annotation/path/line theo schema API |
| Quyền App cần xem xét | `Commit statuses: Read and write` | `Checks: Read and write` |
| Cách dùng tốt | Tín hiệu required check đơn giản, context ổn định | Kết quả giàu chi tiết, có link/annotation reviewable |

Không đặt URL có token, query dữ liệu nhạy cảm hoặc Console Output mở rộng quyền vào target/details URL. Link về Jenkins build chỉ hữu ích khi GitHub user được quyền xem build; nếu không, dùng release/evidence system được phân quyền hoặc description đã redact.

### Quyền ghi, context và retry

GitHub App chỉ tạo status/check trong installation repository được cấp quyền. `Contents: Write` không thay `Commit statuses: Write`, và status permission không thay Checks permission. Nếu GitHub trả `403`, kiểm installation repository, App permission, policy organization và API endpoint trước; không đổi App thành quyền organization rộng.

Dùng context check ổn định, ví dụ `ci/jenkins/unit` hoặc `ci/jenkins/trusted-main`. Không đưa build number vào context required vì branch protection sẽ thấy mỗi build là context khác. Build number có thể nằm ở description/details URL hoặc external ID của check run. Khi retry cùng SHA/context, GitHub và Jenkins UI có thể hiển thị nhiều record/history; release policy phải đọc attempt cuối có correlation build URL thay vì chỉ nhìn một dòng cũ.

Với check run, cập nhật cùng check run trong lifecycle nếu integration hỗ trợ. Nếu retry tạo check run mới, đặt name/external identifier và details URL đủ phân biệt attempt nhưng giữ required check name theo policy. Annotation phải là dữ liệu đã lọc; không đẩy source fragment, path, message hoặc stack trace chứa secret/PII. Kiểm API limits/batching và conclusion value trong tài liệu GitHub đang dùng, vì plugin/version có thể quyết định cách map Jenkins result.

### Jenkinsfile tham chiếu

Mẫu dưới chạy test cho mọi source nhưng chỉ publish release từ `main` không phải change request. `githubNotify` là Pipeline step do GitHub integration plugin cung cấp trên một số runtime, không phải Jenkins core. Xác minh presence, parameter và server mapping qua **Pipeline Syntax** của controller trước khi dùng; nếu runtime không có step này, để GitHub Branch Source/job publisher đã review thực hiện feedback thay vì tự gọi REST API với token trong shell.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timeout(time: 25, unit: 'MINUTES')
  }

  stages {
    stage('Test source revision') {
      agent { label 'linux && untrusted-pr' }
      steps {
        checkout scm
        sh '''#!/bin/sh
          set -eu
          ./ci/test-required
        '''
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/junit.xml'
        }
        cleanup {
          deleteDir()
        }
      }
    }

    stage('Publish trusted artifact') {
      when {
        beforeAgent true
        allOf {
          branch 'main'
          not { changeRequest() }
        }
      }
      agent { label 'linux && trusted-release' }
      steps {
        checkout scm
        script {
          githubNotify(
            context: 'ci/jenkins/trusted-main',
            description: 'Trusted artifact publication is running',
            status: 'PENDING'
          )
        }
        withCredentials([
          string(credentialsId: 'artifact-publish-token', variable: 'PUBLISH_TOKEN')
        ]) {
          sh '''#!/bin/sh
            set -eu
            set +x
            ./ci/publish-immutable-artifact
          '''
        }
      }
      post {
        success {
          githubNotify(
            context: 'ci/jenkins/trusted-main',
            description: 'Trusted artifact publication passed',
            status: 'SUCCESS'
          )
        }
        failure {
          githubNotify(
            context: 'ci/jenkins/trusted-main',
            description: 'Trusted artifact publication failed',
            status: 'FAILURE'
          )
        }
        cleanup {
          deleteDir()
        }
      }
    }
  }
}
```

`Test source revision` không bind credential publish. Trong production, pool `untrusted-pr` và `trusted-release` phải tách filesystem, network, user và executor; label chỉ route scheduler, không là ACL. Stage publish checkout `scm` sau branch/trust gate, nên script `./ci/publish-immutable-artifact` đến từ revision `main` mà Jenkins đã chọn cho run. `githubNotify` không nhận token trong Jenkinsfile; GitHub server/App mapping thuộc cấu hình plugin đã review. Một Jenkinsfile parse được không chứng minh step tồn tại, App có quyền status, source plugin chọn đúng SHA hay GitHub branch protection nhận đúng context.

## Cấu hình triển khai có kiểm soát

Quy trình dưới là thiết kế operator-facing, không phải cú pháp áp dụng tự động cho mọi plugin version:

1. **Đăng ký App.** Platform owner tạo GitHub App test, webhook secret trong secret system, installation chỉ cho repository sandbox và permission baseline cần thiết. Ghi owner, App ID/slug, installation scope, event subscription và ngày review; không ghi private key/secret vào change record.
2. **Cài và kiểm plugin.** Cài GitHub Branch Source cùng dependency theo plugin catalog đã phê duyệt. Ghi Jenkins LTS/plugin version, advisory review, GitHub Enterprise Server compatibility nếu có và rollback baseline.
3. **Cấu hình GitHub server.** Trong Jenkins system configuration, thêm GitHub server/App credential bằng UI hoặc configuration management có secret source được duyệt. Test connection chỉ trên sandbox; log metadata tối thiểu, không export credential configuration.
4. **Tạo Multibranch sandbox.** Chọn repository sandbox, script path, branch discovery, pull request strategy và orphaned-item retention. Trigger một indexing chủ động để xác minh API identity; đừng chờ webhook là bằng chứng đầu tiên.
5. **Thêm webhook.** Lấy callback URL từ plugin/runtime, đặt HTTPS URL, secret và event tối thiểu ở GitHub. Gửi delivery kiểm tra của repository sandbox, xem GitHub delivery response và Jenkins indexing log đã redact.
6. **Kiểm thử allow/deny.** Tạo branch, PR nội bộ, PR fork nếu policy cho phép, push và retry delivery sandbox. Chứng minh untrusted run không có credential release; chứng minh `main` trusted có context/status theo policy.
7. **Promote và vận hành.** Mở installation scope dần, đặt rate-limit/queue monitoring, rotation calendar, audit review, incident/rollback owner. Mỗi permission mới là một thay đổi capability cần review.

Không cài plugin hoặc tạo App production trực tiếp để thử ví dụ. Nếu UI credential type, webhook behavior hoặc status publisher khác documentation, dừng tại sandbox và lấy evidence từ runtime trước khi đổi policy.

## Lab local tái lập không cần GitHub

Lab chỉ tạo JSON fixture dưới thư mục tạm, rồi assert shape của một `pull_request` delivery. Nó không có HTTP listener, không gửi request, không có webhook secret, không gọi GitHub API/Jenkins API và không xác minh HMAC. Cần POSIX shell, Python 3, `mktemp`, `grep` và `find`; không dùng `sudo`.

### Tạo payload fixture có guard

Chạy các block trong cùng shell để giữ `LAB_ROOT`.

```bash
set -eu
LAB_PARENT="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
LAB_ROOT="$(mktemp -d "$LAB_PARENT/jenkins-github-webhook-lab.XXXXXXXX")"
MARKER="$LAB_ROOT/.jenkins-github-webhook-lab"
printf '%s\n' 'owned-by-github-integration-runbook' > "$MARKER"

case "$LAB_ROOT" in
  "$LAB_PARENT"/jenkins-github-webhook-lab.*) ;;
  *) printf '%s\n' 'Refuse: path is outside expected prefix.' >&2; exit 1 ;;
esac
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
test "$(cat "$MARKER")" = 'owned-by-github-integration-runbook'

cat > "$LAB_ROOT/pull-request-opened.json" <<'EOF'
{
  "action": "opened",
  "installation": {"id": 123456},
  "repository": {
    "full_name": "training-org/widget-api",
    "private": true
  },
  "pull_request": {
    "number": 42,
    "head": {"ref": "feature/webhook-lab", "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
    "base": {"ref": "main"}
  }
}
EOF
printf 'LAB_ROOT=%s\n' "$LAB_ROOT"
```

`X-GitHub-Event` là HTTP header ngoài JSON trong delivery thật. Lab cố định nó bằng biến shell công khai thay vì bịa chữ ký hoặc gửi HTTP.

### Xác minh tĩnh và kết quả mong đợi

```bash
set -eu
: "${LAB_ROOT:?Run the fixture block in this shell first}"
EVENT_NAME='pull_request'
test -f "$LAB_ROOT/.jenkins-github-webhook-lab"
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
python3 - <<'PY' "$EVENT_NAME" "$LAB_ROOT/pull-request-opened.json"
import json
from pathlib import Path
import re
import sys

event_name, payload_path = sys.argv[1:]
payload = json.loads(Path(payload_path).read_text(encoding='utf-8'))
assert event_name == 'pull_request'
assert payload['action'] in {'opened', 'synchronize', 'reopened'}
assert isinstance(payload['installation']['id'], int)
assert payload['repository']['full_name'] == 'training-org/widget-api'
assert payload['pull_request']['base']['ref'] == 'main'
assert re.fullmatch(r'[0-9a-f]{40}', payload['pull_request']['head']['sha'])
print('event=pull_request action=opened base=main installation=123456: PASS')
PY
grep -q '"private": true' "$LAB_ROOT/pull-request-opened.json"
```

Kết quả mong đợi là dòng `event=pull_request action=opened base=main installation=123456: PASS`. Đây chỉ xác minh event/action, branch, installation ID và SHA fixture có shape mong muốn. Nó không xác minh GitHub header, HMAC, TLS, plugin, webhook URL, API permission, Jenkins indexing hoặc build runtime.

Nếu có Jenkins/GitHub sandbox do owner phê duyệt, runtime test kế tiếp phải dùng App/installation và webhook secret sandbox khác production. Xác minh delivery `ping`, branch push và PR event qua plugin log đã redact; không dùng payload fixture này để giả mạo production delivery.

### Cleanup có guard

Chỉ cleanup sau khi đã giữ output cần học. Hàm không gọi GitHub, Jenkins, Docker hay cluster cleanup.

```bash
cleanup_lab() {
  test -n "${LAB_ROOT:-}"
  test -n "${LAB_PARENT:-}"
  case "$LAB_ROOT" in
    "$LAB_PARENT"/jenkins-github-webhook-lab.*) ;;
    *) printf '%s\n' 'Refuse unexpected cleanup path.' >&2; return 1 ;;
  esac
  test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
  test -f "$LAB_ROOT/.jenkins-github-webhook-lab"
  test "$(cat "$LAB_ROOT/.jenkins-github-webhook-lab")" = 'owned-by-github-integration-runbook'
  find "$LAB_ROOT" -depth -delete
}
cleanup_lab
test ! -e "$LAB_ROOT"
printf '%s\n' 'guarded local cleanup: PASS'
```

Nếu guard thất bại, dừng và kiểm tra path. Không đổi parent/prefix/marker để ép xóa và không áp dụng hàm này cho workspace Jenkins, `JENKINS_HOME`, registry, namespace hay repository.

## Troubleshooting

| Triệu chứng | Kiểm tra có evidence | Hướng xử lý an toàn |
| --- | --- | --- |
| Webhook delivery thất bại | GitHub delivery ID/status, URL canonical, TLS/DNS/proxy, receiver log đã redact | Sửa URL/certificate/route đã xác nhận; không bỏ HTTPS hoặc tắt signature verification. |
| Delivery `401`/signature mismatch | Raw-body handling của plugin, secret mapping, rotation window, event endpoint | Đồng bộ secret theo change record và test sandbox; không in secret/payload để so sánh. |
| Không có job branch/PR | Source repository, discovery behavior, indexing log, App installation/permission, script path | Chạy indexing sandbox và sửa scope/strategy chính xác; không cấp App organization-wide. |
| `403` GitHub API | Installation repository, App permission, policy organization, plugin server mapping | Thêm đúng permission namespaced theo nhu cầu; không dùng PAT admin hoặc App quyền quá rộng. |
| PR check không đúng merge strategy | PR source/base SHA, source behavior, branch protection required check | Chọn head/merge strategy đúng policy và đặt context/check name rõ ràng. |
| Fork thấy credential hoặc chạy release | Folder credential scope, `when`, agent label/pool, source trust policy, build log | Dừng job, rotate secret nếu nghi lộ, tách agent/credential và chỉ release từ branch tin cậy. |
| Status/check bị trùng sau retry | SHA, context/name, build URL, delivery ID, attempt chronology | Giữ context required ổn định, đọc attempt cuối có correlation; không xóa history để che failure. |
| Jenkins queue hoặc API bị quá tải | Scan cadence, webhook burst, rate-limit header/metrics, executor/indexing queue | Giới hạn scan/fan-out và tăng capacity có đo; không retry vô hạn hoặc giảm validation. |

## Checklist trước go-live

- [ ] GitHub App có owner, App slug/installation inventory, repository scope nhỏ nhất, permission map và lịch review/rotation.
- [ ] Private key và webhook secret ở secret system/Credentials scope hẹp; không nằm trong Jenkinsfile, Git, shell argv, log, artifact hay ticket.
- [ ] Jenkins LTS, GitHub Branch Source và dependency đã được review compatibility/advisory; UI/step/plugin behavior đã smoke test sandbox.
- [ ] Jenkins URL canonical, HTTPS, DNS, proxy, CA và endpoint webhook plugin đã được xác minh từ GitHub path hợp lệ.
- [ ] Webhook event tối thiểu, signature verification, delivery log redaction, duplicate/out-of-order behavior và scan fallback có owner/monitoring.
- [ ] Discovery branch/PR, script path, merge strategy, required context/check và orphaned-item retention phù hợp branch protection.
- [ ] PR/fork chạy trên boundary untrusted; không có credential publish/deploy, privileged agent, cache ghi chung hoặc network release.
- [ ] Branch trusted có gate trước agent/checkout/binding release; credential chỉ nằm trong closure ngắn và shell không tracing.
- [ ] Commit status hoặc Checks API có permission write đúng, context/name ổn định, URL đã redact và retry/correlation semantics được review.
- [ ] Lab fixture chỉ dùng data giả, marker/prefix/parent guard; static pass không bị diễn giải thành webhook/Jenkins runtime pass.
- [ ] Có rollback cho plugin/App configuration, plan rotate secret/key, audit retention và incident owner khi GitHub integration bị compromise.

## Trade-offs và giới hạn

- **GitHub App** tạo lifecycle/audit tốt hơn PAT cá nhân, nhưng cần vận hành key, installation và plugin support. **PAT service account** có thể là cầu nối tạm thời khi owner/expiry/scope được quản lý; không phải mặc định lâu dài.
- **Webhook** giảm độ trễ và API polling, nhưng delivery không là transaction exactly-once. **Periodic scan** là fallback hữu ích, nhưng tiêu thụ rate limit/capacity và không thay signature verification.
- **Merge thử** gần integration thực tế hơn head PR, nhưng thay đổi theo base branch và tăng build. Chọn theo required-check policy, không theo cách dễ xanh nhất.
- **Commit status** đơn giản cho gate rõ ràng. **Checks API** giàu annotation nhưng đòi permission/integration mapping phức tạp hơn; đừng bật cả hai chỉ để có thêm biểu tượng nếu branch protection không cần.
- **Plugin-managed feedback** giảm nhu cầu shell giữ API token. Đổi lại, cần kiểm đúng plugin version/runtime và hạn chế ai có thể cấu hình job/server integration.

## Nguồn chính thức và đọc tiếp

- [GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-creating-github-apps/about-creating-github-apps)
- [Choosing permissions for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/choosing-permissions-for-a-github-app)
- [Authenticating as a GitHub App installation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-an-installation)
- [Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- [Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Commit statuses REST API](https://docs.github.com/en/rest/commits/statuses)
- [Check runs REST API](https://docs.github.com/en/rest/checks/runs)
- [GitHub Branch Source plugin](https://plugins.jenkins.io/github-branch-source/)
- [GitHub plugin](https://plugins.jenkins.io/github/)
- [Jenkins Multibranch Pipeline](https://www.jenkins.io/doc/book/pipeline/multibranch/)
- [Jenkins: Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/)

<Cards>
  <Card title="Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Đặt Pipeline as Code, review revision và kiểm syntax đúng runtime." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Giữ secret scope hẹp, không leak qua log, argv hoặc workspace." />
  <Card title="Xác thực Jenkins" href="/docs/security/authentication" description="Tách identity, security realm và vòng đời account khỏi GitHub App." />
  <Card title="Authorization & RBAC" href="/docs/security/authorization" description="Review quyền Jenkins, folder scope và separation of duties." />
</Cards>
