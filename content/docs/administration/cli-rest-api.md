---
title: "Jenkins CLI & HTTP Remote API"
description: "Dùng Jenkins CLI và HTTP Remote API để quan sát, tự động hóa có kiểm soát và bảo vệ credential."
---

<Callout type="info" title="Phạm vi">
  Trang này nói về Jenkins core CLI và HTTP Remote API. Thay `https://jenkins.example.invalid/jenkins` bằng URL sandbox của bạn; mọi user, token, job và `REQUEST_ID` dưới đây chỉ là placeholder. Bắt đầu bằng thao tác chỉ đọc, dùng quyền nhỏ nhất và xem trigger build là một thay đổi cần kiểm soát.
</Callout>

Jenkins có web UI tiện cho con người, còn CLI và HTTP API phù hợp khi script hoặc hệ thống khác cần lặp lại một thao tác. Chúng không phải một API giao dịch chung: endpoint, permission, dữ liệu trả về và hành vi retry phụ thuộc Jenkins core, cấu hình authorization, phiên bản và đôi khi plugin.

## Mục lục

- [Chọn đúng giao diện tự động hóa](#chọn-đúng-giao-diện-tự-động-hóa)
- [Mô hình request và ranh giới tin cậy](#mô-hình-request-và-ranh-giới-tin-cậy)
- [Xác thực, quyền và CSRF](#xác-thực-quyền-và-csrf)
  - [Giữ token ngoài URL, history, argv và log](#giữ-token-ngoài-url-history-argv-và-log)
  - [Quyền tối thiểu](#quyền-tối-thiểu)
  - [Crumb cho request thay đổi](#crumb-cho-request-thay-đổi)
- [Jenkins CLI](#jenkins-cli)
  - [Kết nối HTTP(S), WebSocket và SSH](#kết-nối-https-websocket-và-ssh)
  - [Kiểm tra chỉ đọc](#kiểm-tra-chỉ-đọc)
- [HTTP Remote API chỉ đọc](#http-remote-api-chỉ-đọc)
  - [JSON, tree, depth và cửa sổ dữ liệu](#json-tree-depth-và-cửa-sổ-dữ-liệu)
  - [URL encoding, status và timeout](#url-encoding-status-và-timeout)
- [Mutation có kiểm soát](#mutation-có-kiểm-soát)
  - [Trigger build không nhân đôi](#trigger-build-không-nhân-đôi)
- [Lab sandbox](#lab-sandbox)
  - [Chuẩn bị và kiểm tra chỉ đọc](#chuẩn-bị-và-kiểm-tra-chỉ-đọc)
  - [Một mutation tùy chọn](#một-mutation-tùy-chọn)
  - [Kết quả và cleanup](#kết-quả-và-cleanup)
- [Vận hành an toàn và tương thích](#vận-hành-an-toàn-và-tương-thích)
- [Troubleshooting](#troubleshooting)
- [Checklist trước khi automation](#checklist-trước-khi-automation)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Chọn đúng giao diện tự động hóa

Bốn khái niệm dưới đây thường bị gọi chung là “Jenkins API”, nhưng chúng có ranh giới khác nhau.

| Giao diện               | Dành cho                                 | Use case tốt                                                    | Cần tránh giả định                                                                 |
| ----------------------- | ---------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Web UI**              | Người vận hành tương tác                 | khám phá cấu hình, xác nhận thay đổi, xem form và log           | HTML là contract ổn định cho script; tự động hóa browser dễ vỡ khi UI/plugin đổi.  |
| **Jenkins CLI**         | Lệnh Jenkins có tên, chạy từ terminal/CI | `who-am-i`, `version`, linter hoặc lệnh quản trị đã được review | mọi lệnh đều an toàn hoặc có cùng permission; `help` của controller là nguồn thật. |
| **HTTP Remote API**     | Client HTTP lấy model Jenkins            | đọc job/build/queue ở JSON/XML/Python; trigger endpoint cụ thể  | đây là REST CRUD hoàn chỉnh hoặc mọi resource đều có cùng schema.                  |
| **Plugin-specific API** | Tích hợp do plugin bổ sung               | dùng tính năng mà Jenkins core không có                         | endpoint, payload, permission và compatibility của plugin là Jenkins core bảo đảm. |

Quy ước thực tế là tách automation thành hai đường. **Read-only** chỉ quan sát, ví dụ lấy version, job, build và queue. **Mutating** tạo build, đổi config hoặc xóa resource; nó cần owner, phạm vi job/folder rõ ràng, xác nhận và audit. Đừng thay thế UI bằng cách scrape HTML; dùng CLI hoặc endpoint tài liệu hóa của core/plugin.

<Callout type="warn" title="Plugin không phải Jenkins core">
  Một plugin có thể thêm CLI command, JSON field, action URL hoặc endpoint riêng, và có thể đổi chúng khi nâng plugin. Pin/test compatibility trên staging, đọc tài liệu của chính plugin và kiểm tra permission thực tế. Các URL `/api/json`, `/crumbIssuer/api/json` và `buildWithParameters` trong ví dụ là giả định Jenkins core; job parameter, pipeline xử lý `REQUEST_ID` và authorization vẫn là runtime assumptions.
</Callout>

## Mô hình request và ranh giới tin cậy

```text
┌───────────────────┐   HTTPS, auth, timeout    ┌──────────────────────┐
│ Script / CLI user │ ─────────────────────────►│ Reverse proxy + TLS  │
└───────────────────┘                           └──────────┬───────────┘
          ▲                                                │ private HTTP(S)
          │ status, JSON, CLI output                       ▼
          │                                      ┌──────────────────────┐
          └───────────────────────────────────── │ Jenkins controller   │
                                                 │ authz + crumb + audit│
                                                 └──────────┬───────────┘
                                                            │
                                                            ▼
                                                 ┌──────────────────────┐
                                                 │ Job / queue / agent  │
                                                 └──────────────────────┘
```

Client chỉ gọi URL HTTPS canonical của controller. Reverse proxy kết thúc TLS hoặc chuyển tiếp TLS, áp dụng giới hạn ở edge và **không** để upstream Jenkins/port controller lộ trực tiếp ra Internet. Proxy phải hỗ trợ upload, redirect và WebSocket khi CLI/agent cần chúng; đặt timeout đủ lớn cho endpoint hợp lệ nhưng không vô hạn. Cấu hình URL public, forwarded headers và TLS nhất quán trước khi debug API; xem [Jenkins sau Reverse Proxy và TLS](/docs/installation/reverse-proxy-tls).

Không biến Jenkins thành endpoint công khai chỉ để webhook hoặc script truy cập. Giới hạn network bằng VPN, private network, firewall/security group hoặc identity-aware proxy; allowlist client khi phù hợp. Rate limit ở proxy bảo vệ controller khỏi polling dày đặc, nhưng không được che mất audit log hoặc làm retry tạo side effect.

## Xác thực, quyền và CSRF

Với HTTP/CLI qua HTTP(S), dùng tài khoản Jenkins riêng cho automation và **API token** của tài khoản đó. API token thay cho password; rotation/revoke theo chính sách tổ chức. CLI cũng có thể dùng transport **WebSocket** khi controller hỗ trợ, hoặc **SSH** khi Jenkins đã bật SSH CLI và user đã đăng public key. Transport không thay thế authorization: cùng user vẫn chỉ có quyền Jenkins được cấp.

### Giữ token ngoài URL, history, argv và log

Không đặt token trong URL query/userinfo, shell history, `curl -u user:token`, command line/process argv, output debug, artifact, ticket, log hoặc repository. Biến môi trường cũng có thể bị process con, diagnostic dump hoặc log CI đọc được; dùng secret store của runner và file credential tạm có quyền đọc hạn chế khi công cụ hỗ trợ.

Ví dụ dưới đây dùng `--netrc-file` để token không xuất hiện trong command line. File được hệ thống secret tạo ngoài repo, permission `0600`, và hostname phải khớp `JENKINS_URL`:

```text
machine jenkins.example.invalid
login <jenkins-automation-user>
password <api-token-from-secret-store>
```

Thiết lập biến **không chứa secret** trong shell hiện tại:

```bash
export JENKINS_URL='https://jenkins.example.invalid/jenkins'
export JENKINS_AUTH_FILE="$HOME/.config/jenkins/automation.netrc"
```

Không dùng `set -x` trong script có request xác thực. CI nên mask secret, tắt command echo quanh bước nhạy cảm, giới hạn ai xem build log và xóa credential file tạm sau job.

### Quyền tối thiểu

Permission do authorization strategy và folder/job quyết định; không cấp `Overall/Administer` cho một script chỉ để “hết 403”. Mức tối thiểu điển hình là:

| Tác vụ                                                | Permission Jenkins tối thiểu thường cần                 | Ghi chú                                                              |
| ----------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| Nhận diện controller/tài khoản, đọc dữ liệu được phép | `Overall/Read`                                          | Đây là baseline để Jenkins cho phép đọc; object còn cần quyền riêng. |
| Đọc job/build cụ thể                                  | `Overall/Read` + `Job/Read` trên job/folder đó          | Không cấp đọc toàn controller nếu chỉ cần một folder.                |
| Trigger build                                         | `Overall/Read` + `Job/Read` + `Job/Build` trên job đích | Không đồng nghĩa có quyền sửa job.                                   |
| Sửa cấu hình job                                      | thêm `Job/Configure` trên job đích                      | Chỉ cấp cho automation cấu hình đã được review.                      |
| Hủy build                                             | thêm `Job/Cancel` trên job đích                         | Chỉ khi workflow thật sự cần rollback/hủy.                           |

CLI command tự kiểm tra permission riêng; `help` hoặc `who-am-i` có thể thành công trong khi command khác bị từ chối. Plugin có thể đưa thêm permission. Xác nhận bằng một service account trong sandbox, không suy ra từ tài khoản administrator.

### Crumb cho request thay đổi

Jenkins dùng CSRF protection (crumb) để bảo vệ request thay đổi trạng thái. Khi xác thực bằng API token, Jenkins core hiện đại miễn crumb cho API request; tuy vậy client phải không giả định mọi controller, reverse proxy, SSO bridge hay plugin đều xử lý giống nhau. Với session/cookie hoặc password authentication, lấy crumb trước POST và gửi lại header do response chỉ định.

```bash
crumb_json=$(curl --fail-with-body --silent --show-error \
  --connect-timeout 5 --max-time 20 \
  --netrc-file "$JENKINS_AUTH_FILE" \
  "$JENKINS_URL/crumbIssuer/api/json")

crumb_field=$(printf '%s' "$crumb_json" | jq -r '.crumbRequestField')
crumb_value=$(printf '%s' "$crumb_json" | jq -r '.crumb')
test "$crumb_field" != null && test "$crumb_value" != null
```

Không in `crumb_json`; crumb không thay quyền xác thực. Nếu endpoint trả `403 No valid crumb` dù token hợp lệ, kiểm tra base URL/proxy, auth method và policy/controller trước khi quyết định thêm crumb. Không tắt global CSRF protection để chữa lỗi một script.

## Jenkins CLI

Tải `jenkins-cli.jar` từ **chính controller** qua URL như `$JENKINS_URL/jnlpJars/jenkins-cli.jar`, kiểm tra theo quy trình supply-chain của tổ chức, rồi giữ artifact/version cùng controller mà nó phục vụ. `java -jar jenkins-cli.jar help` trên controller là danh mục command và usage đáng tin cậy nhất; command khả dụng thay đổi theo core và plugin.

### Kết nối HTTP(S), WebSocket và SSH

CLI HTTP(S) dùng URL controller và API token. WebSocket tránh yêu cầu full-duplex HTTP truyền thống khi proxy cho phép upgrade WebSocket; dùng `-webSocket` nếu controller/đường đi đã hỗ trợ. Đừng bật tùy chọn chỉ vì một bài mẫu dùng nó: kiểm tra CLI `help`, controller LTS và proxy trước.

```bash
# HTTP(S) CLI; file auth chứa <user>:<api-token>, không commit file này.
java -jar jenkins-cli.jar -s "$JENKINS_URL" \
  -auth @"$HOME/.config/jenkins/cli-auth" who-am-i

# Cùng lệnh qua WebSocket khi Jenkins và reverse proxy đã hỗ trợ.
java -jar jenkins-cli.jar -s "$JENKINS_URL" -webSocket \
  -auth @"$HOME/.config/jenkins/cli-auth" version
```

`cli-auth` phải nằm ngoài repository, permission `0600`, chỉ gồm `<jenkins-user>:<api-token>`. Cú pháp `-auth @file` giữ secret ra khỏi argv, nhưng đường dẫn file và tên user vẫn có thể hiện trong log; không log nội dung file.

SSH CLI là phương án riêng, không phải SSH agent. Nó chỉ dùng được khi administrator đã bật SSH CLI, công khai SSH endpoint/port phù hợp và tài khoản Jenkins có public key được cấu hình. Ví dụ minh họa, thay mọi placeholder theo endpoint Jenkins công bố:

```bash
ssh -i "$HOME/.ssh/jenkins_cli_ed25519" \
  -p '<jenkins-cli-ssh-port>' \
  '<jenkins-user>@jenkins.example.invalid' version
```

Không tự mở SSH port qua Internet. Xác minh host key, giữ private key trong secret store/SSH agent và áp dụng cùng permission Jenkins cho user SSH. Nếu controller chỉ công bố HTTP(S) CLI, không suy diễn một SSH port từ port agent hoặc port hệ điều hành.

### Kiểm tra chỉ đọc

Hai lệnh nhỏ này xác nhận URL, transport, authentication và authorization mà không tạo build:

```bash
java -jar jenkins-cli.jar -s "$JENKINS_URL" \
  -auth @"$HOME/.config/jenkins/cli-auth" who-am-i

java -jar jenkins-cli.jar -s "$JENKINS_URL" \
  -auth @"$HOME/.config/jenkins/cli-auth" version
```

Kết quả mong đợi là danh tính service account (không phải token) và version controller. Đặt `--` hoặc quote cẩn thận cho input do người dùng cung cấp nếu command hỗ trợ argument; không ghép input vào shell string.

## HTTP Remote API chỉ đọc

HTTP Remote API biểu diễn object Jenkins theo URL resource: controller/view có `$JENKINS_URL/api/json`, một job có `$JENKINS_URL/job/<job-name>/api/json`, folder lồng nhau có nhiều đoạn `/job/<folder>/job/<job>`. JSON là lựa chọn thông dụng cho script; XML hoặc Python representation cũng có thể có. Response model không phải schema versioned cứng: chỉ đọc field cần thiết và chịu được field mới/mất.

### JSON, tree, depth và cửa sổ dữ liệu

Không lấy toàn bộ controller rồi lọc ở client. `tree` chọn field cần dùng, `depth` mở rộng model theo cấp và range `{start,end}` tạo một cửa sổ phần tử trong danh sách. `curl --get --data-urlencode` bảo đảm các ký tự `[]`, `,`, `{}` trong tree được URL-encode thay vì tự nối query string.

```bash
# Chỉ liệt kê tên và URL job mà account được phép thấy.
curl --fail-with-body --silent --show-error \
  --connect-timeout 5 --max-time 20 \
  --netrc-file "$JENKINS_AUTH_FILE" \
  --get "$JENKINS_URL/api/json" \
  --data-urlencode 'tree=jobs[name,url]'

# Một cửa sổ 5 build mới trong response của job placeholder.
JOB_PATH='job/example-readonly-job'
curl --fail-with-body --silent --show-error \
  --connect-timeout 5 --max-time 20 \
  --netrc-file "$JENKINS_AUTH_FILE" \
  --get "$JENKINS_URL/$JOB_PATH/api/json" \
  --data-urlencode 'tree=builds[number,url,result,building]{0,5}'
```

Range trong `tree` là giới hạn dữ liệu response, không phải cursor giao dịch. Khi cần quét dài, dùng các cửa sổ nhỏ, lưu watermark bền vững (ví dụ build number đã xử lý), chấp nhận dữ liệu thay đổi giữa hai request và không mặc định `depth=2` sẽ rẻ. Kiểm tra `tree` trên Jenkins sandbox vì plugin/job type có thể bổ sung field hoặc list khác.

### URL encoding, status và timeout

Tên job/folder chứa space, `/`, `%` hoặc Unicode phải được encode **mỗi path segment**, không encode cả URL hay dùng tên hiển thị chưa chuẩn hóa. Với job lồng nhau, tạo đúng các segment `/job/<encoded-name>`; không ghép input chưa encode vào URL. Encode query bằng `--data-urlencode` như trên.

Luôn đặt `--connect-timeout` và `--max-time`. `curl --fail-with-body` biến HTTP `4xx/5xx` thành lỗi nhưng vẫn cho body chẩn đoán có kiểm soát; không ghi body có thể chứa metadata nhạy cảm ra log dùng chung. Phân loại response trước khi retry:

| HTTP status / lỗi       | Ý nghĩa thường gặp                                           | Hành động an toàn                                                           |
| ----------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `200`                   | Đọc thành công                                               | Parse JSON, kiểm tra field cần thiết.                                       |
| `201`, `302` hoặc `303` | Mutation được nhận/chuyển hướng tùy endpoint                 | Không suy ra build hoàn tất; theo dõi queue/build bằng GET.                 |
| `400`                   | URL/parameter/validation sai                                 | Sửa input; không retry mù.                                                  |
| `401`                   | Chưa xác thực hoặc token sai                                 | Rotate/kiểm tra secret và URL; không in token.                              |
| `403`                   | Thiếu permission hoặc crumb/CSRF bị từ chối                  | So permission, crumb và proxy; không cấp Administer để thử.                 |
| `404`                   | Sai path, object không tồn tại hoặc bị che bởi authorization | Xác minh URL/permission bằng sandbox; không đoán object tồn tại.            |
| `429`                   | Bị rate limit ở proxy/gateway                                | Tôn trọng `Retry-After`; giảm polling.                                      |
| `5xx`, reset, timeout   | Controller/proxy/network có thể lỗi                          | GET có thể retry với backoff; POST chỉ retry khi có bằng chứng idempotency. |

Dùng exponential backoff có jitter và giới hạn tổng thời gian. Poll queue/build chậm dần thay vì mỗi giây; ghi request ID, endpoint đã được che bớt và status vào audit log, không ghi auth header/token hoặc full response mặc định.

## Mutation có kiểm soát

Mutation nên chạy trong change window hoặc workflow có owner. Trước POST, script cần xác nhận environment/job, đọc trạng thái hiện tại, in **ý định không nhạy cảm** và yêu cầu xác nhận tương tác (trừ khi CI đã có approval/audit tương đương). Chỉ gọi endpoint của job cụ thể, không dùng tài khoản có quyền toàn cục.

### Trigger build không nhân đôi

`POST .../buildWithParameters` có thể trả thành công sau khi controller đã nhận request nhưng client lại timeout. Jenkins Remote API không cung cấp generic idempotency key cho mọi trigger. Vì vậy retry POST tự động sau một timeout có thể tạo hai build.

Thiết kế job sandbox để nhận parameter `REQUEST_ID` và lưu/kiểm tra giá trị đó ở một nơi bền vững mà job kiểm soát (ví dụ record của hệ thống đích). Khi request cùng ID đã được xử lý, job phải thoát thành công mà không làm lại side effect. Đó là **idempotency ở workflow**, không phải thuộc tính mặc định của Jenkins. Trong script client, sau POST mơ hồ chỉ retry các GET quan sát queue/build; điều tra trước khi trigger lại.

Ví dụ sau chỉ áp dụng cho job parameterized đã được owner phê duyệt. Nó lấy crumb để tương thích cả deployment yêu cầu crumb; API-token authentication thường được miễn crumb ở Jenkins core hiện đại. `REQUEST_ID` là placeholder do caller tạo một lần và giữ ổn định khi quan sát lại, không tự sinh ID mới trong vòng retry.

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${JENKINS_URL:?set a sandbox base URL}"
: "${JENKINS_AUTH_FILE:?set a protected netrc path}"
JOB_PATH='job/example-controlled-job'
REQUEST_ID='change-<approved-ticket>-<unique-id>'

printf 'Will trigger %s with REQUEST_ID=%s on %s\n' \
  "$JOB_PATH" "$REQUEST_ID" "$JENKINS_URL"
read -r -p 'Type TRIGGER to continue: ' confirmation
test "$confirmation" = 'TRIGGER'

crumb_json=$(curl --fail-with-body --silent --show-error \
  --connect-timeout 5 --max-time 20 --netrc-file "$JENKINS_AUTH_FILE" \
  "$JENKINS_URL/crumbIssuer/api/json")
crumb_field=$(printf '%s' "$crumb_json" | jq -r '.crumbRequestField')
crumb_value=$(printf '%s' "$crumb_json" | jq -r '.crumb')
test "$crumb_field" != null && test "$crumb_value" != null

curl --fail-with-body --silent --show-error \
  --connect-timeout 5 --max-time 20 --netrc-file "$JENKINS_AUTH_FILE" \
  -X POST -H "$crumb_field: $crumb_value" \
  --data-urlencode "REQUEST_ID=$REQUEST_ID" \
  "$JENKINS_URL/$JOB_PATH/buildWithParameters"

printf 'Trigger submitted. Do not retry this POST on a timeout; poll queue/build with GET.\n'
```

`curl` chỉ gửi token từ netrc file; crumb header là tạm thời và không được ghi log. Production client nên lấy response header `Location` của queue khi có, tương quan nó với `REQUEST_ID`, rồi poll URL đó bằng exponential backoff có giới hạn. Không được coi connection timeout là bằng chứng không có build nào được schedule.

## Lab sandbox

Lab này không dùng Jenkins production, không cần tạo/delete job và không in secret. Cần một controller local/isolated đã có service account chỉ đọc, cùng một job có sẵn tên `example-readonly-job`. Mutation là tùy chọn và chỉ dùng job disposable đã được chuẩn bị trước.

### Chuẩn bị và kiểm tra chỉ đọc

1. Đặt `JENKINS_URL` là HTTPS URL sandbox và để netrc/CLI auth file ngoài repository, quyền `0600`.
2. Tải CLI jar từ sandbox; không tái dùng jar không rõ nguồn.
3. Chạy `who-am-i`, `version` và hai lệnh JSON ở phần trước.
4. Ghi lại version, service account và status code vào ghi chú lab; không ghi token hoặc raw auth header.

```bash
# Ví dụ kiểm tra permission của file secret trên Linux/macOS.
chmod 600 "$JENKINS_AUTH_FILE" "$HOME/.config/jenkins/cli-auth"
java -jar jenkins-cli.jar -s "$JENKINS_URL" \
  -auth @"$HOME/.config/jenkins/cli-auth" who-am-i
```

### Một mutation tùy chọn

Chỉ làm bước này khi owner đã tạo sẵn `example-controlled-job`, account có đúng `Job/Build` tại job đó và job có contract `REQUEST_ID` idempotent. Điền approved ticket/unique ID, chạy script ở phần trước, gõ `TRIGGER`, rồi poll queue/build bằng GET. Không thử endpoint create/delete/disable job trong lab này.

### Kết quả và cleanup

Kết quả chỉ đọc mong đợi: CLI trả user/version; JSON chỉ chứa field được yêu cầu; request sai quyền trả `403` thay vì thành công. Kết quả mutation mong đợi: một request được audit, tối đa một build nhận `REQUEST_ID`, và workflow chứng minh cùng ID không lặp side effect.

Cleanup không destructive: xóa file response tạm và shell history entry nếu shell hỗ trợ, hủy/revoke token **chỉ khi token đó được tạo riêng cho lab**, đóng terminal và để owner xử lý build/job theo policy. Không xóa job, build history, queue item hoặc credential dùng chung. Giữ log đã redaction theo retention policy để đối chiếu audit.

## Vận hành an toàn và tương thích

- Đặt rate limit, WAF/proxy policy và TLS ở edge; vẫn allow method/path cần thiết cho CLI WebSocket và API đã duyệt. Test redirect, context path và WebSocket sau mỗi thay đổi proxy.
- Dùng timeout phân biệt connect/total, retry GET với backoff+jitter và giới hạn attempt. Với POST, chỉ retry khi endpoint/workflow có idempotency đã kiểm chứng; nếu không, tìm queue/build/audit trước.
- Ghi audit event gồm service account, thời điểm, ticket, action, resource, `REQUEST_ID`, status và correlation ID. Redact token, cookie, crumb, auth header, request body nhạy cảm và full response.
- Đọc controller/system log khi cần điều tra authz, crumb hoặc queue; không tăng log level hoặc dump credential trên production chỉ để debug. Theo dõi capacity, queue và lỗi API bằng [Monitoring Jenkins](/docs/administration/monitoring), và liên hệ log với [Jenkins logs](/docs/administration/logs).
- Nâng Jenkins LTS và plugin theo change management. Kiểm tra CLI `help`, endpoint `api/json`, authentication/crumb behavior và plugin integrations trong sandbox sau nâng cấp. Static code block ở trang này không chứng minh controller runtime có plugin, job parameter, SSH CLI hay WebSocket.

<Callout type="error" title="Không dùng automation như bypass quyền">
  Không hard-code credential, tắt CSRF, mở port controller hoặc cấp `Overall/Administer` để một script “chạy được”. Sửa ranh giới network, service account, permission và contract idempotency trước. Credential trong Pipeline có ranh giới riêng; xem [Credentials trong Pipeline](/docs/pipelines/credentials).
</Callout>

## Troubleshooting

| Triệu chứng                | Kiểm tra theo thứ tự                                                                        | Không nên làm                                  |
| -------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| CLI không kết nối          | URL canonical, DNS/TLS, proxy timeout, `jenkins-cli.jar` cùng controller, rồi thử `version` | Đổi sang HTTP public hoặc bỏ TLS verification. |
| `401 Unauthorized`         | hostname khớp netrc, service account, token chưa revoke, thời gian hệ thống                 | Dán token vào `curl -u`/URL để “test nhanh”.   |
| `403 No valid crumb`       | auth method, crumb issuer, header field response, Jenkins URL/forwarded headers             | Tắt CSRF protection.                           |
| `403` ở job API            | `Overall/Read`, `Job/Read`/`Job/Build` đúng folder/job, matrix/role authorization           | Cấp Administer hoặc đọc job khác để suy diễn.  |
| `404` cho job biết là có   | từng segment `/job/...` đã encode, context path, authorization masking                      | Retry vô hạn hoặc bỏ encode path.              |
| API chậm/`429`             | tree/depth quá rộng, polling interval, `Retry-After`, proxy rate limit, controller health   | Tăng concurrency hoặc polling mỗi giây.        |
| POST timeout               | audit, queue/build theo `REQUEST_ID`, proxy/controller log                                  | Retry POST và tạo build thứ hai.               |
| WebSocket/SSH CLI thất bại | controller LTS, proxy upgrade, CLI transport được bật, SSH endpoint/key                     | Nhầm port agent/OS SSH với CLI SSH.            |

## Checklist trước khi automation

- [ ] URL là HTTPS canonical sau reverse proxy; upstream controller không public.
- [ ] Service account riêng, API token/SSH key được lưu trong secret store hoặc file `0600`, ngoài repo.
- [ ] Token không có trong URL, history, argv, log, artifact, ticket hoặc source code; tracing đã redact.
- [ ] Đã kiểm tra `Overall/Read` và đúng job/folder permission tối thiểu trên sandbox.
- [ ] CLI transport (HTTP(S), WebSocket hoặc SSH) được controller và proxy hỗ trợ, không suy đoán từ ví dụ.
- [ ] GET dùng `tree`/range hợp lý, URL được encode theo segment, timeout/backoff/rate limit được đặt.
- [ ] POST có owner, confirmation/approval, crumb handling và audit/correlation; workflow có `REQUEST_ID` idempotent nếu cần retry/khôi phục.
- [ ] HTTP status, `403` crumb/authz, timeout và `429` có nhánh xử lý rõ; POST mơ hồ không bị retry mù.
- [ ] Endpoint/field/plugin được test lại sau mỗi nâng Jenkins LTS hoặc plugin.

## Nguồn Jenkins chính thức

- [Jenkins CLI](https://www.jenkins.io/doc/book/managing/cli/)
- [Jenkins Remote Access API](https://www.jenkins.io/doc/book/using/remote-access-api/)
- [API token](https://www.jenkins.io/doc/book/using/using-credentials/#api-token)
- [CSRF Protection](https://www.jenkins.io/doc/book/security/csrf-protection/)
- [Jenkins permissions](https://www.jenkins.io/doc/book/security/access-control/permissions/)
- [Reverse proxy](https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/)

## Đọc tiếp

<Cards>
  <Card title="Jenkins sau Reverse Proxy và TLS" href="/docs/installation/reverse-proxy-tls" description="Chuẩn hóa URL public, forwarded headers và TLS trước khi gọi API." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Giảm rủi ro lộ secret khi Pipeline gọi hệ thống ngoài." />
</Cards>
