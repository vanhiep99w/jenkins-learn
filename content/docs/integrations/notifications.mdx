---
title: "Notifications từ Jenkins"
description: "Thiết kế email, Slack và Microsoft Teams notifications có kiểm soát, giữ nguyên build result và tránh notification fatigue."
---

<Callout type="warn" title="Phạm vi và an toàn">
  Ví dụ dùng recipient, channel, credential ID và endpoint giả. Lab chỉ ghi payload vào file local; không gửi email, Slack, Teams hay HTTP request ra ngoài. Plugin, SMTP relay, tenant Teams, credential type và syntax step phải được xác minh trên Jenkins sandbox trước khi áp dụng.
</Callout>

Notification tốt là một tín hiệu có hành động, không phải bản sao Console Output. Người nhận cần biết build nào đổi trạng thái, mức độ ảnh hưởng, bằng chứng ở đâu và ai xử lý tiếp. Thiết kế phải giữ nguyên kết quả build gốc, không đưa secret/dữ liệu nhạy cảm vào payload và tránh biến mỗi retry thành một cơn mưa thông báo.

## Mục lục

- [Mục tiêu và nguyên tắc](#mục-tiêu-và-nguyên-tắc)
  - [Kết quả cần đạt](#kết-quả-cần-đạt)
  - [Luồng notification an toàn](#luồng-notification-an-toàn)
- [Kênh và plugin](#kênh-và-plugin)
  - [Email Extension](#email-extension)
  - [Slack](#slack)
  - [Microsoft Teams và HTTP client](#microsoft-teams-và-http-client)
  - [Điều kiện runtime chung](#điều-kiện-runtime-chung)
- [Post semantics và build result](#post-semantics-và-build-result)
  - [Điều kiện cần dùng](#điều-kiện-cần-dùng)
  - [Không che failure, abort hoặc timeout](#không-che-failure-abort-hoặc-timeout)
- [Template và credential-aware delivery](#template-và-credential-aware-delivery)
  - [Dữ liệu được phép đưa vào template](#dữ-liệu-được-phép-đưa-vào-template)
  - [Secret, TLS và egress](#secret-tls-và-egress)
  - [Timeout, retry và async delivery](#timeout-retry-và-async-delivery)
- [Chống notification fatigue](#chống-notification-fatigue)
- [Jenkinsfile tham chiếu](#jenkinsfile-tham-chiếu)
  - [Đọc dependency và trust boundary](#đọc-dependency-và-trust-boundary)
- [Lab local không gửi ra ngoài](#lab-local-không-gửi-ra-ngoài)
  - [Tạo fake sink có guard](#tạo-fake-sink-có-guard)
  - [Kiểm payload và kết quả mong đợi](#kiểm-payload-và-kết-quả-mong-đợi)
  - [Cleanup có guard](#cleanup-có-guard)
- [Troubleshooting](#troubleshooting)
- [Checklist trước go-live](#checklist-trước-go-live)
- [Trade-offs và giới hạn](#trade-offs-và-giới-hạn)
- [Nguồn chính thức và đọc tiếp](#nguồn-chính-thức-và-đọc-tiếp)

## Mục tiêu và nguyên tắc

### Kết quả cần đạt

Sau khi hoàn thành, bạn có thể:

- chọn Email Extension, Slack plugin, Teams integration hoặc HTTP client phù hợp capability thay vì gọi shell với webhook URL;
- dùng `post` để phân biệt `failure`, `unstable`, `fixed`, `aborted` và `always` mà không đổi kết quả build gốc;
- tạo payload tối thiểu, có context đủ để điều tra và không chứa secret, raw log, artifact nhạy cảm hay dữ liệu người dùng chưa được lọc;
- nạp credential qua plugin/credential-aware step, kiểm soát TLS/CA, egress, rotation và quyền tối thiểu;
- thiết kế deduplication, cooldown, digest và escalation để giảm notification fatigue;
- kiểm thử payload bằng fake sink local có guard, không cần SMTP, Slack, Teams hoặc Jenkins runtime.

### Luồng notification an toàn

```text
Pipeline result và evidence đã redact
             │
             ▼
post condition theo policy ──► template tối thiểu ──► plugin hoặc queue delivery
             │                                                  │
             │                                                  ▼
             └──── failure/abort không bị che ─────► email, chat, hoặc on-call audience
                                                               │
                                                               ▼
                                                dedup, cooldown, escalation, audit
```

`post` là nơi quyết định **có nên phát tín hiệu** sau khi build kết thúc. Nó không phải lý do để gửi payload đầy đủ hay chạy notification ở mọi đường. Bằng chứng như report/artifact đã lọc phải được publish trước; notification chỉ liên kết đến evidence có quyền truy cập phù hợp.

## Kênh và plugin

### Email Extension

[Email Extension Plugin](https://plugins.jenkins.io/email-ext/) cung cấp step `emailext` và trigger/template email mở rộng hơn Jenkins Mailer cơ bản. Nó cần SMTP relay, TLS/CA, identity gửi, recipient policy và plugin version tương thích Jenkins LTS. SMTP server, credential và default recipient thuộc Jenkins system/folder configuration theo policy; không đặt password SMTP trong `Jenkinsfile`.

`emailext` phù hợp khi email cần subject/body đã review, recipient provider hoặc template được quản trị. Dùng recipient allowlist như mailbox service/team; không lấy địa chỉ từ commit author, branch name, build parameter hoặc nội dung pull request. Email có thể bị forward/lưu giữ lâu, vì vậy chỉ gửi result, build number, link evidence đã phân quyền và runbook reference.

```groovy
emailext(
  subject: '[CI] catalog-api build #42 failed',
  body: 'Build failed. Open the authorized Jenkins build record for evidence.',
  to: 'ci-alerts@example.invalid'
)
```

Đoạn trên minh họa step, không phải lệnh đã chạy. Recipient và dữ liệu subject/body phải do owner cấu hình; không thay `#42` bằng commit message hoặc username chưa được sanitize.

### Slack

[Slack Notification Plugin](https://plugins.jenkins.io/slack/) cung cấp các Pipeline step như `slackSend`. Plugin thường dùng cấu hình workspace/channel/credential của Jenkins hoặc credential ID do plugin/runtime hỗ trợ. Tên field, OAuth scope, bot token, token credential, thread behavior và permission channel phải lấy từ **Pipeline Syntax** và hướng dẫn plugin của phiên bản đang cài.

Slack plugin phù hợp khi cần gửi message ngắn đến channel đã review, update message/thread hoặc liên kết build. Không gửi Slack webhook/token qua `curl`, URL query, parameter build hoặc shell command. Bot/app Slack chỉ cần quyền post vào channel được phép; không cấp quyền quản trị workspace để xử lý một lỗi gửi tin.

```groovy
slackSend(
  channel: '#ci-alerts',
  color: 'danger',
  message: 'catalog-api: build #42 failed; inspect the authorized Jenkins build record.'
)
```

Channel trong ví dụ là tên giả. Trước khi dùng, xác minh plugin có `slackSend`, credential đã được map vào Jenkins và user/channel có quyền xem link Jenkins. Một plugin step không phải Jenkins core và không tự cung cấp Slack workspace, network route hay token rotation.

### Microsoft Teams và HTTP client

Teams thay đổi theo tenant và chính sách Microsoft. Các lựa chọn thường gặp là Teams workflow/connector do tenant quản trị, Office 365 Connector plugin nếu tenant/version còn hỗ trợ, hoặc HTTP client gọi integration endpoint được owner phê duyệt. Đừng bịa endpoint hoặc giả định một Incoming Webhook còn được tenant bật: xác minh cách integration hiện hành với Teams administrator.

| Cách tích hợp | Khi phù hợp | Điều phải kiểm tra |
| --- | --- | --- |
| Teams workflow/connector được quản trị | Tenant có workflow nhận notification và owner vận hành | Authentication, destination, retention, permission gửi và endpoint lifecycle. |
| Office 365 Connector plugin | Controller đã phê duyệt plugin và tenant hỗ trợ connector đó | Plugin version/advisory, Pipeline step thật, credential handling và connector policy. |
| HTTP Request Plugin hoặc client credential-aware | Có gateway notification nội bộ hay API tenant đã review | TLS/CA, auth credential ID, allowlist egress, timeout, idempotency key và response contract. |

Generic HTTP không làm secret an toàn hơn. Webhook URL đôi khi chính là credential; lưu nó như secret text/file theo cơ chế plugin hỗ trợ, không nhúng vào Jenkinsfile, query URL, argv, log hay payload. Nếu client chỉ cho truyền token trong command line, dùng integration khác hoặc một adapter credential-aware thay vì chấp nhận lộ token.

### Điều kiện runtime chung

Email Extension, Slack, Office 365 Connector và HTTP Request đều là plugin capabilities. Jenkins core/Pipeline core không tự cài SMTP client, Slack API, Teams tenant access hay generic HTTP policy. Trước production, xác minh:

- Jenkins LTS, plugin versions/dependencies và security advisory theo plugin catalog;
- agent/controller nơi step chạy, certificate trust store, DNS, proxy và egress allowlist;
- credential type/ID, folder scope, permission sử dụng, owner, rotation/revocation;
- recipient/channel/connector allowlist, audit log, retention và data classification;
- timeout, retry, non-blocking policy và hành vi khi plugin/service không phản hồi.

## Post semantics và build result

### Điều kiện cần dùng

Declarative `post` có semantics theo kết quả Pipeline và lịch sử run, không theo thứ tự block trong file. Các condition được đánh giá theo thứ tự cố định; `always` ở đầu và `cleanup` ở cuối. Đọc [Hành động hậu xử lý Pipeline](/docs/pipelines/post-actions) để có danh sách/thứ tự đầy đủ trước khi ghép nhiều condition.

| Condition | Khi nên notification | Không được suy ra |
| --- | --- | --- |
| `always` | Publish evidence đã lọc hoặc ghi telemetry delivery; thường **không** broadcast mọi build | `always` chạy cả failure/abort, nên không tự là lý do gửi chat/email. |
| `failure` | Alert đến owner/on-call khi build không đạt | Không xác định nguyên nhân; link evidence thay vì gửi raw log. |
| `unstable` | Quality signal cần triage theo policy | Không phải `SUCCESS` và không nên tự retry để làm dashboard xanh. |
| `fixed` | Thông báo recovery khi result hiện tại thành công sau result không thành công trước đó | Build đầu không có trạng thái trước; không dùng làm evidence bắt buộc. |
| `aborted` | Báo owner nếu abort/timeout cần điều tra hoặc giữ resource | Không đoán người dùng hay code là nguyên nhân. |

`changed` có thể hữu ích cho dedup state transition, nhưng `fixed` diễn tả recovery rõ hơn. Không gửi cả `changed` và `fixed` cho cùng một lần recovery nếu audience/message giống nhau. `success` thường không broadcast; dùng nó cho digest theo lịch hoặc `fixed` để giảm spam.

### Không che failure, abort hoặc timeout

Notification failure là triệu chứng delivery, không được biến test `FAILURE` thành `SUCCESS`, cũng không được nuốt `ABORTED`/timeout. Giữ `currentBuild.currentResult` làm signal gốc, log failure delivery đã redact và đưa failure delivery vào metric/queue riêng nếu nó non-blocking.

Một wrapper non-blocking chỉ phù hợp khi policy nói rõ channel đó không quyết định quality/release. Nếu wrapper dùng `catchError`, đặt `catchInterruptions: false` để Abort/timeout lan truyền, và không gán build result tốt hơn kết quả hiện tại. Nếu notification là control bắt buộc, để step fail rõ ràng hoặc chuyển nó sang delivery service có SLA; đừng catch rồi im lặng.

```groovy
catchError(
  buildResult: 'SUCCESS',
  stageResult: 'UNSTABLE',
  catchInterruptions: false,
  message: 'Non-blocking notification delivery failed'
) {
  slackSend(channel: '#ci-alerts', color: 'danger', message: 'Sanitized notification')
}
```

`buildResult: 'SUCCESS'` không nâng một build đã xấu lên xanh; nó giữ signal build hiện có trong khi stage wrapper hiển thị delivery problem. Parameter và behavior vẫn phụ thuộc phiên bản Pipeline: Basic Steps/Slack plugin. Tạo snippet và thử `success`, `failure`, `unstable`, `fixed`, `aborted` trên controller sandbox trước khi coi wrapper là policy production.

## Template và credential-aware delivery

### Dữ liệu được phép đưa vào template

Dùng allowlist field do Pipeline/controller tạo, thay vì dump environment hoặc nối trực tiếp metadata SCM. Một template có thể gồm:

| Field | Ví dụ an toàn | Lưu ý |
| --- | --- | --- |
| Service label cố định | `catalog-api` | Lấy từ cấu hình reviewed, không từ parameter tự do. |
| Result | `FAILURE` | Dùng `currentBuild.currentResult` khi post chạy. |
| Build reference | `build #42` | Không cần đưa full environment. |
| Evidence link | Jenkins build URL đã được phân quyền | Không có token/query nhạy cảm và recipient phải được phép xem. |
| Action | `Triage owner: platform-oncall` | Link runbook/change record không nhạy cảm. |

Branch, commit subject, author name, PR title, user parameter, console output và artifact metadata có thể do contributor kiểm soát hoặc chứa PII/secret. Nếu policy cần chúng, sanitize trên server-side theo allowlist, length limit, escaping của Markdown/HTML/JSON và data classification; không cho raw value vào subject, channel mention, URL hay template expression. Không gửi raw stack trace, request header, environment, secret path, token, private key hoặc artifact content qua notification.

### Secret, TLS và egress

Credential giao nhận có thể là SMTP password, Slack bot token, connector URL, client certificate hoặc OAuth credential. Dùng Jenkins Credentials/plugin credential-aware step hoặc secret file ngắn hạn do plugin hỗ trợ. Jenkinsfile chỉ tham chiếu credential ID khi cần; giữ ID ở folder/job scope nhỏ nhất và review ai có `Job/Configure` hoặc permission dùng credential.

- Không đặt token/private key trong URL query, `curl` argument, Jenkinsfile, build parameter, log, artifact, email body hay chat message.
- Không bật `set -x`, `printenv`, verbose HTTP/SMTP debug hoặc archive toàn workspace khi binding còn hiệu lực.
- Dùng HTTPS/TLS, CA chain và hostname validation đã được platform quản lý. Không tắt verification để vượt lỗi certificate.
- Allowlist egress chỉ đến SMTP relay, Slack/Teams/gateway hoặc proxy cần thiết. PR/fork không nhận đường egress/credential notification đặc quyền.
- Rotate credential có overlap/change record nếu provider hỗ trợ, thử sandbox, thu hồi phiên bản cũ và đối chiếu audit. Khi nghi lộ, revoke/rotate theo incident process, không chỉ xóa log.

Xem [Credentials trong Pipeline](/docs/pipelines/credentials) và [Credentials & Secrets](/docs/security/credentials-secrets) để chọn binding/scope và bảo vệ workspace.

### Timeout, retry và async delivery

Notification API chậm không được giữ executor vô hạn. Đặt timeout nhỏ theo channel/SLA và xem HTTP/SMTP/plugin timeout thực tế, không chỉ timeout Pipeline tổng. Retry chỉ cho lỗi tạm thời đã phân loại như connection reset hoặc `429`, có số attempt nhỏ, backoff/jitter và deadline tổng.

Một retry có thể tạo email/chat trùng. Dùng idempotency/dedup key như `job-full-name + build-number + event-type` tại notification gateway hoặc store delivery; không dùng key từ secret hoặc message text chưa lọc. Nếu email provider không hỗ trợ idempotency, ưu tiên không retry trực tiếp hoặc dùng gateway queue có deduplication.

Async delivery tách Pipeline khỏi channel: Pipeline ghi event đã redact vào queue/gateway nội bộ rồi worker gửi/tái thử theo rate limit. Gateway cần authentication, egress policy, dead-letter/alert, audit, retention và owner. Nó không làm notification "miễn phí"; chỉ chuyển failure mode từ Jenkins vào delivery platform. Khi delivery là mandatory control, pipeline cần nhận acknowledgement theo policy, không chỉ HTTP accepted.

## Chống notification fatigue

Mỗi notification có severity, audience, dedup key, cooldown, escalation owner và thời hạn. Không dùng một channel cho mọi event. Policy ví dụ dưới phải được team điều chỉnh theo service/SLO, không phải threshold phổ quát.

| Tình huống | Audience | Chính sách anti-fatigue | Escalation |
| --- | --- | --- | --- |
| CI PR failure | Tác giả/PR và channel CI có opt-in | Chỉ status/check; không email broad; dedup theo SHA + context | Không escalation tự động trừ khi repo policy yêu cầu. |
| `UNSTABLE` lặp lại | Owner quality | Cooldown theo job + failure signature, digest theo khoảng thời gian | Mở ticket khi vượt ngưỡng đã định nghĩa. |
| Main/release failure | Service owner/on-call | Một alert cho state transition; update thread/message thay vì gửi từng retry | Escalate theo on-call policy nếu chưa ack hoặc SLO bị ảnh hưởng. |
| Build `fixed` | Người đã nhận failure | Một recovery notification cho lần chuyển non-success sang success | Không gửi thêm `changed` cùng audience. |
| `ABORTED` | Build owner | Chỉ báo nếu timeout/abort làm resource/change bị dở dang | Escalate khi target state chưa rõ. |
| Deployment health fail | On-call + change owner | Alert ngay, attach digest/change ref đã redact, suppress duplicate incident | Incident process và rollback decision owner. |

Dùng cooldown ở consumer/gateway thay vì để mỗi Jenkinsfile tự tính thời gian thiếu nhất quán. Digest nên tổng hợp events không khẩn cấp, vẫn giữ individual evidence links. Suppression cần expiry và audit: tắt alert vô thời hạn chỉ biến fatigue thành blind spot. Mọi escalation phải có người chịu trách nhiệm, đường ack và runbook; không dùng channel mention toàn tổ chức làm mặc định.

## Jenkinsfile tham chiếu

Mẫu này là Pipeline Multibranch. Nó archive evidence trước, chỉ gửi message trong các condition đã chọn và không inject secret. Email/Slack server credential được cấu hình ngoài Jenkinsfile qua plugin. `main` được xem là trusted **chỉ khi** source plugin, SCM branch protection, folder permission, agent isolation và review Jenkinsfile đã được vận hành đúng.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timeout(time: 20, unit: 'MINUTES')
  }

  stages {
    stage('Test') {
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
          archiveArtifacts allowEmptyArchive: true,
            artifacts: 'reports/junit.xml,logs/notification-safe/**', fingerprint: true
        }
        cleanup {
          deleteDir()
        }
      }
    }
  }

  post {
    always {
      script {
        env.NOTIFICATION_RESULT = currentBuild.currentResult ?: 'UNKNOWN'
        echo "Notification policy observed result: ${env.NOTIFICATION_RESULT}"
      }
    }
    failure {
      catchError(
        buildResult: 'SUCCESS',
        stageResult: 'UNSTABLE',
        catchInterruptions: false,
        message: 'Non-blocking failure notification was not delivered'
      ) {
        emailext(
          subject: '[CI] catalog-api build failed',
          body: 'A build failed. Open the authorized Jenkins build record for evidence.',
          to: 'ci-alerts@example.invalid'
        )
        slackSend(
          channel: '#ci-alerts',
          color: 'danger',
          message: 'catalog-api build failed; inspect the authorized Jenkins build record.'
        )
      }
    }
    unstable {
      echo 'UNSTABLE is recorded for the quality owner; use cooldown/digest policy before broadcasting.'
    }
    fixed {
      catchError(
        buildResult: 'SUCCESS',
        stageResult: 'UNSTABLE',
        catchInterruptions: false,
        message: 'Non-blocking recovery notification was not delivered'
      ) {
        slackSend(
          channel: '#ci-alerts',
          color: 'good',
          message: 'catalog-api build recovered; previous non-success state is now fixed.'
        )
      }
    }
    aborted {
      echo 'Build aborted; notify the owner only when timeout or target-state policy requires it.'
    }
    cleanup {
      echo 'No external cleanup is performed by this notification example.'
    }
  }
}
```

### Đọc dependency và trust boundary

- `post`, `failure`, `unstable`, `fixed`, `aborted`, `always` và `cleanup` là Declarative Pipeline syntax. `junit`, `archiveArtifacts`, `catchError` và `timeout` cần Pipeline/JUnit plugin behavior của runtime; kiểm trong Pipeline Syntax.
- `emailext` cần Email Extension + SMTP configuration. `slackSend` cần Slack plugin + Slack credential/server configuration. Nếu một step không tồn tại hoặc parameter khác, không thay bằng shell `curl`; lấy snippet từ controller hoặc dùng gateway credential-aware đã review.
- `catchError` quanh `failure` notification có `catchInterruptions: false`. Nó không sửa failure test thành success; delivery issue còn hiện ở stage/post metadata/log. Với notification `fixed`, policy có thể chọn blocking hoặc non-blocking khác, nhưng phải kiểm runtime và không gửi duplicate với `changed`.
- Build test chạy trên pool `untrusted-pr`; mẫu không bind notification credential trong stage build. Production cần pool `trusted-release` khác cho stage có credential phát hành. Label không tự là boundary nếu executor/user/filesystem/network còn dùng chung.
- Template cố ý không dùng branch, commit author, commit message, build parameter hay raw log. `catalog-api`, recipient và channel là static configuration reviewed; phải thay theo service owner, không theo input contributor.

## Lab local không gửi ra ngoài

Lab tạo email text và JSON chat payload trong một fake sink dưới `$TMPDIR`, sau đó kiểm tra shape/redaction bằng Python. Nó không mở socket, không có URL/token, không gọi SMTP/Slack/Teams/Jenkins API và không chứng minh plugin hoặc network runtime. Cần POSIX shell, Bash, Python 3, `mktemp`, `find` và `grep`; không dùng `sudo`.

### Tạo fake sink có guard

Lưu script sau thành `notification-lab.sh` trên máy lab. Nó chỉ tạo directory do `mktemp` trả về dưới direct parent canonical `$TMPDIR`.

```bash
#!/usr/bin/env bash
set -euo pipefail

LAB_PARENT="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
LAB_ROOT="$(mktemp -d "$LAB_PARENT/jenkins-notification-lab.XXXXXXXX")"
MARKER="$LAB_ROOT/.jenkins-notification-lab"
printf '%s\n' 'owned-by-notifications-runbook' > "$MARKER"

case "$LAB_ROOT" in
  "$LAB_PARENT"/jenkins-notification-lab.*) ;;
  *) printf '%s\n' 'Refuse: path is outside expected prefix.' >&2; exit 1 ;;
esac
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
test "$(cat "$MARKER")" = 'owned-by-notifications-runbook'

cat > "$LAB_ROOT/email.txt" <<'EOF'
To: ci-alerts@example.invalid
Subject: [CI] catalog-api build failed

result=FAILURE
build_number=42
action=inspect-authorized-build-record
EOF
cat > "$LAB_ROOT/chat.json" <<'EOF'
{"service":"catalog-api","result":"FAILURE","build_number":42,"action":"inspect-authorized-build-record"}
EOF
printf 'LAB_ROOT=%s\n' "$LAB_ROOT"
```

### Kiểm payload và kết quả mong đợi

```bash
bash -n notification-lab.sh
source ./notification-lab.sh

# `source` giữ LAB_ROOT trong shell hiện tại để validation và cleanup dùng cùng path.
: "${LAB_ROOT:?Source notification-lab.sh before validation}"
test -f "$LAB_ROOT/.jenkins-notification-lab"
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
python3 - <<'PY' "$LAB_ROOT"
import json
from pathlib import Path
import sys

root = Path(sys.argv[1])
email = (root / 'email.txt').read_text(encoding='utf-8')
payload = json.loads((root / 'chat.json').read_text(encoding='utf-8'))
assert 'result=FAILURE' in email
assert payload == {
    'service': 'catalog-api',
    'result': 'FAILURE',
    'build_number': 42,
    'action': 'inspect-authorized-build-record',
}
for forbidden in ('token', 'password', 'secret', 'authorization', 'private_key'):
    assert forbidden not in email.lower()
    assert forbidden not in json.dumps(payload).lower()
print('notification fake-sink validation: PASS')
PY
grep -q '^Subject: \[CI\] catalog-api build failed$' "$LAB_ROOT/email.txt"
```

Kết quả mong đợi là `notification fake-sink validation: PASS`. Khi chạy script theo dạng process riêng, biến `LAB_ROOT` không quay về shell cha; đó là tính chất shell, không phải lỗi lab. Có thể source script trong shell tin cậy hoặc export path đã in sau khi tự kiểm tra parent/prefix/marker. Lab chỉ chứng minh payload giả không có marker nhạy cảm; không xác minh SMTP, Slack/Teams credential, HTTP TLS, plugin, recipient permission, rate limit hoặc delivery.

### Cleanup có guard

Chỉ cleanup path lab vừa kiểm. Không áp dụng hàm này cho workspace Jenkins, `JENKINS_HOME`, mail queue, channel/chat history hoặc storage production.

```bash
cleanup_lab() {
  test -n "${LAB_ROOT:-}"
  test -n "${LAB_PARENT:-}"
  case "$LAB_ROOT" in
    "$LAB_PARENT"/jenkins-notification-lab.*) ;;
    *) printf '%s\n' 'Refuse unexpected cleanup path.' >&2; return 1 ;;
  esac
  test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
  test -f "$LAB_ROOT/.jenkins-notification-lab"
  test "$(cat "$LAB_ROOT/.jenkins-notification-lab")" = 'owned-by-notifications-runbook'
  find "$LAB_ROOT" -depth -delete
}
cleanup_lab
test ! -e "$LAB_ROOT"
printf '%s\n' 'guarded local cleanup: PASS'
```

## Troubleshooting

| Triệu chứng | Kiểm tra có evidence | Hành động an toàn |
| --- | --- | --- |
| `emailext` hoặc `slackSend` không được nhận diện | Plugin inventory/version, Pipeline Syntax, job/folder context | Cài/review đúng plugin hoặc lấy snippet runtime; không thay bằng token trong shell. |
| Email/chat không đến | Recipient/channel allowlist, plugin log đã redact, SMTP/Slack/Teams audit, TLS/DNS/proxy, rate limit | Kiểm credential/route với owner; không in token, bật debug có secret hay tắt TLS. |
| Build xanh bị chuyển đỏ vì notification | Post step failure policy, `catchError`, plugin timeout và build result log | Phân loại mandatory/non-blocking, giữ result gốc và sửa wrapper đã test; không reset result thủ công. |
| Abort bị coi như delivery success | `catchInterruptions`, timeout/abort log và post condition | Rethrow interruption hoặc đặt `catchInterruptions: false`; không nuốt `ABORTED`. |
| Chat/email bị spam | Context/state transition, retry count, dedup key, cooldown, channel audience | Update/dedup message, dùng digest/escalation policy; không tắt mọi alert vô thời hạn. |
| `fixed` không xuất hiện | Previous build result, build history retention, exact post semantics | Xem history và policy; không dùng `fixed` như action bắt buộc. |
| Credential/endpoint bị lộ | Jenkinsfile diff, console, artifact, URL/query, audit provider | Revoke/rotate, đánh giá phạm vi leak và sửa design; không chỉ xóa log. |
| HTTP response chậm hoặc `429` | Plugin timeout, gateway correlation ID, provider rate limit, queue metrics | Bounded backoff/dedup hoặc async gateway; không retry vô hạn từ mọi post block. |

## Checklist trước go-live

- [ ] Mỗi channel có owner, audience, severity, recipient/channel allowlist, data classification, retention và escalation runbook.
- [ ] Jenkins LTS, Email Extension/Slack/Teams/HTTP plugin và dependency đã review version, advisory, Pipeline Syntax và runtime behavior.
- [ ] SMTP/Slack/Teams/gateway credential nằm ở Jenkins Credentials hoặc secret system scope hẹp; Jenkinsfile/payload/log/argv/URL không chứa secret.
- [ ] TLS, CA, hostname validation, DNS/proxy và egress allowlist đã được kiểm; không có bypass certificate verification.
- [ ] Template chỉ dùng field allowlist đã sanitize; không có raw branch/commit/user input, full console log, artifact nhạy cảm, environment hoặc request header.
- [ ] `post` phân biệt `always`, `failure`, `unstable`, `fixed`, `aborted` và `cleanup`; evidence được publish trước cleanup/notification.
- [ ] Notification error policy không làm xanh failure hoặc nuốt abort/timeout; mandatory delivery có acknowledgement/owner rõ.
- [ ] Timeout, retry backoff, rate limit, idempotency/dedup key, async queue/dead-letter và audit delivery được thiết kế theo channel.
- [ ] Fatigue policy có cooldown, digest, state transition, suppression expiry và escalation; recovery không gửi duplicate với `changed`.
- [ ] PR/fork không nhận notification credential đặc quyền hay egress release; trusted branch/release gate đứng trước credential bind.
- [ ] Lab chỉ sinh fake sink local với canonical parent/prefix/marker guard; static pass không bị xem là notification runtime pass.

## Trade-offs và giới hạn

- **Email** bền và phù hợp escalation/formal record, nhưng chậm và dễ tạo hộp thư quá tải. **Chat** nhanh và hỗ trợ thread/update, nhưng retention/access do workspace/tenant quyết định.
- **Plugin-specific step** giảm tự viết auth/protocol nhưng phụ thuộc plugin lifecycle/runtime. **Generic HTTP gateway** thống nhất policy/dedup, nhưng cần platform riêng, SLA và audit vận hành.
- **Non-blocking notification** giữ CI phản hồi nhanh khi chat lỗi, nhưng cần metric/alert delivery riêng. **Mandatory notification** tăng assurance cho một control, đổi lại channel outage có thể chặn release.
- **Dedup/cooldown** giảm fatigue nhưng có thể che recurrence nếu key/suppression sai. Luôn đặt expiry, audit và đường escalation cho incident nghiêm trọng.

## Nguồn chính thức và đọc tiếp

- [Jenkins Pipeline Syntax — post](https://www.jenkins.io/doc/book/pipeline/syntax/#post)
- [Jenkins Pipeline steps reference](https://www.jenkins.io/doc/pipeline/steps/)
- [Pipeline: Basic Steps](https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/)
- [Email Extension Plugin](https://plugins.jenkins.io/email-ext/)
- [Slack Notification Plugin](https://plugins.jenkins.io/slack/)
- [Office 365 Connector Plugin](https://plugins.jenkins.io/office-365-connector/)
- [HTTP Request Plugin](https://plugins.jenkins.io/http_request/)
- [Jenkins: Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/)
- [Microsoft Teams documentation](https://learn.microsoft.com/en-us/microsoftteams/)

<Cards>
  <Card title="Hành động hậu xử lý Pipeline" href="/docs/pipelines/post-actions" description="Thiết kế post conditions, evidence và cleanup theo kết quả build." />
  <Card title="Xử lý lỗi và Retry" href="/docs/pipelines/error-handling" description="Giữ failure/abort trung thực, timeout và retry có giới hạn." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Bind credential scope hẹp và tránh leak qua log, argv hay workspace." />
  <Card title="Credentials & Secrets" href="/docs/security/credentials-secrets" description="Quản lý owner, rotation, revocation và trust boundary cho secret." />
  <Card title="Audit & Compliance" href="/docs/security/audit-compliance" description="Giữ evidence delivery đã redact, retention và ownership rõ ràng." />
</Cards>
