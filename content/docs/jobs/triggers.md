---
title: "Build Triggers"
description: "Kích hoạt build bằng webhook, lịch hoặc dependency."
---

Build trigger đưa một job vào hàng đợi; nó không bảo đảm build sẽ chạy ngay, checkout được revision nào, hay được quyền triển khai. Một trigger tốt phải trả lời được ba câu hỏi: **sự kiện nào được phép tạo build, một thay đổi tạo bao nhiêu build, và làm sao truy được nguyên nhân của build đó**.

<Callout type="info" title="Phạm vi">
  Trang này dùng Jenkins LTS, Git plugin và Declarative Pipeline làm ví dụ. Endpoint, payload và trường cấu hình webhook là contract của SCM source/plugin đang cài, không phải contract chung của Jenkins core. Kiểm tra phiên bản plugin, **Pipeline Syntax → Snippet Generator** và tài liệu plugin của controller trước khi áp dụng vào job thật.
</Callout>

## Mục lục

- [Mục tiêu](#mục-tiêu)
- [Chọn trigger theo loại công việc](#chọn-trigger-theo-loại-công-việc)
  - [Các khái niệm cần tách biệt](#các-khái-niệm-cần-tách-biệt)
  - [Bảng chọn nhanh](#bảng-chọn-nhanh)
- [Webhook: sự kiện từ SCM](#webhook-sự-kiện-từ-scm)
  - [Luồng sự kiện và revision](#luồng-sự-kiện-và-revision)
  - [Thiết lập có kiểm soát](#thiết-lập-có-kiểm-soát)
  - [Lọc sự kiện và tránh build thừa](#lọc-sự-kiện-và-tránh-build-thừa)
  - [Bảo vệ endpoint webhook](#bảo-vệ-endpoint-webhook)
- [Poll SCM: hỏi SCM xem có thay đổi](#poll-scm-hỏi-scm-xem-có-thay-đổi)
  - [Khác với build theo lịch](#khác-với-build-theo-lịch)
  - [Cấu hình và giới hạn vận hành](#cấu-hình-và-giới-hạn-vận-hành)
- [Lịch cron: chạy theo thời điểm](#lịch-cron-chạy-theo-thời-điểm)
  - [Năm trường cron và ký tự H](#năm-trường-cron-và-ký-tự-h)
  - [Ví dụ lịch an toàn](#ví-dụ-lịch-an-toàn)
  - [Timezone, thời điểm bận và độ trễ](#timezone-thời-điểm-bận-và-độ-trễ)
- [Upstream và downstream: dependency giữa job](#upstream-và-downstream-dependency-giữa-job)
  - [Upstream trigger](#upstream-trigger)
  - [Kích hoạt downstream tường minh](#kích-hoạt-downstream-tường-minh)
  - [Thiết kế dependency không tạo vòng lặp](#thiết-kế-dependency-không-tạo-vòng-lặp)
- [Dedupe sự kiện và concurrency](#dedupe-sự-kiện-và-concurrency)
  - [Nguồn build trùng thường gặp](#nguồn-build-trùng-thường-gặp)
  - [Chọn chính sách hàng đợi](#chọn-chính-sách-hàng-đợi)
- [Lab sandbox: xác minh timer và Poll SCM](#lab-sandbox-xác-minh-timer-và-poll-scm)
  - [Chuẩn bị](#chuẩn-bị)
  - [Jenkinsfile timer vô hại](#jenkinsfile-timer-vô-hại)
  - [Thử Poll SCM và webhook](#thử-poll-scm-và-webhook)
  - [Kết quả mong đợi và dọn dẹp](#kết-quả-mong-đợi-và-dọn-dẹp)
- [Troubleshooting](#troubleshooting)
- [Checklist xác minh trước khi bật production](#checklist-xác-minh-trước-khi-bật-production)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mục tiêu

Sau bài này, người học có thể:

- phân biệt webhook, Poll SCM, lịch cron và dependency trigger; chọn cơ chế theo nguồn sự kiện thay vì bật mọi lựa chọn;
- viết và đọc lịch Jenkins cron, dùng `H` để phân tán tải, đồng thời dự kiến queue delay và timezone;
- cấu hình quan hệ upstream/downstream có điều kiện kết quả, không tạo vòng lặp hay side effect lặp;
- giảm build trùng bằng lọc event, quiet period và chính sách concurrency phù hợp;
- kiểm tra endpoint webhook, quyền của SCM/plugin và bằng chứng cause/revision trước khi tin kết quả build.

## Chọn trigger theo loại công việc

### Các khái niệm cần tách biệt

Một **trigger** quyết định lúc Jenkins tạo một queue item. **SCM checkout** quyết định revision mà build thực sự lấy. **Executor/agent** quyết định lúc queue item được chạy. Ba việc này có thể cách nhau nhiều phút; một commit mới xuất hiện trong khoảng đó có thể làm kết quả checkout khác với điều người gửi webhook mong đợi nếu job/plugin không pin revision theo event.

**Poll SCM** không phải lệnh build định kỳ. Đến lịch poll, Jenkins hỏi SCM/plugin xem có thay đổi liên quan đến job hay không; chỉ có thay đổi thì mới enqueue build. **Build periodically** hoặc `cron(...)` enqueue build theo lịch dù source không đổi. Một downstream trigger lại dựa vào kết quả của job khác, không dựa trực tiếp vào SCM.

<Callout type="warn" title="Trigger không phải authorization">
  Một push, pull request hoặc parameter có thể là dữ liệu do người khác kiểm soát. Việc nó tạo được build không cấp quyền đọc credential, publish artifact hay deploy. Tách agent và credential của build nguồn không tin cậy khỏi pipeline release; chỉ cho side effect sau policy/approval đã được xác định.
</Callout>

### Bảng chọn nhanh

| Nhu cầu | Cơ chế ưu tiên | Khi không phù hợp | Bằng chứng cần xem |
| --- | --- | --- | --- |
| Chạy CI nhanh sau push/PR | Webhook của SCM source/plugin | Jenkins không có endpoint HTTPS đáng tin hoặc SCM không gửi được event | Delivery/event log ở SCM, cause của build, revision checkout |
| Có CI khi webhook không dùng được | Poll SCM với lịch thưa | Nhiều repository lớn, rate limit chặt hoặc cần phản hồi gần thời gian thực | Poll log, request/rate limit SCM, revision đã phát hiện |
| Quét, report hoặc kiểm tra định kỳ | `cron(...)` / Build periodically | Chỉ muốn chạy khi source đổi | Lịch hiệu lực, timezone, cause `TimerTrigger`, queue delay |
| Chạy job sau quality gate khác | Upstream trigger hoặc `build` step | Dependency không rõ, có thể tạo chu trình, hoặc cần dữ liệu/revision cụ thể | Upstream build URL/number/result, parameters, artifact/checksum |

Mỗi job nên có một trigger chính được owner giải thích được. Có thể dùng webhook làm đường chính và Poll SCM làm phương án dự phòng, nhưng phải chủ động dedupe; bật cả webhook, poll và cron cho cùng một CI mà không có policy sẽ tạo queue noise và làm khó truy vết.

## Webhook: sự kiện từ SCM

Webhook là HTTP request do dịch vụ SCM gửi tới endpoint của Jenkins hoặc SCM plugin khi có sự kiện như push, pull request hay merge request. Nó thường nhanh hơn Poll SCM vì Jenkins không phải liên tục hỏi SCM. Tuy nhiên, Jenkins chỉ nên tin một request sau khi endpoint/plugin đã xác thực nguồn và job/plugin đã áp dụng đúng policy event.

### Luồng sự kiện và revision

```text
Developer push/PR
       │
       ▼
SCM tạo event có delivery ID, repository, ref và revision
       │ HTTPS + xác thực chữ ký/token/IP policy
       ▼
Reverse proxy / Jenkins endpoint của SCM plugin
       │ plugin lọc event và tìm job/branch phù hợp
       ▼
Jenkins queue ── chờ quiet period, executor và agent ──► build
       │                                                   │
       └── lưu cause/delivery metadata                 checkout revision
                                                            │
                                                            ▼
                                               test / policy / kết quả
```

Payload báo **sự kiện**, không phải mặc định là nguồn chân lý duy nhất cho revision. Với Multibranch Pipeline, branch source plugin thường index repository rồi chọn Jenkinsfile/revision theo discovery strategy của nó. Với Pipeline from SCM hoặc Freestyle Git job, cấu hình SCM của job quyết định ref nào được checkout. Hãy xác minh trên build page và console log: repository URL, branch/ref, commit SHA, trigger cause và thời điểm nhận event.

Không suy diễn rằng mọi event đều là push vào nhánh chính. PR/MR opened, synchronize, comment, tag và delete event có ngữ nghĩa khác nhau. Một event delete không nên cố checkout ref đã mất; một event từ fork có thể chạy Jenkinsfile/code không tin cậy. Chỉ đăng ký loại event và branch/PR discovery mà job thực sự cần.

### Thiết lập có kiểm soát

1. **Xác định SCM source.** Ghi rõ repository, source plugin, job/folder nhận event và owner. Trên Jenkins, xem plugin đã cài và tài liệu đúng nhà cung cấp; không đoán endpoint từ một tutorial của plugin khác.
2. **Dùng URL công khai có TLS.** SCM phải đi được đến reverse proxy/Jenkins qua hostname chuẩn, certificate hợp lệ và đường dẫn endpoint do plugin công bố. Không mở port quản trị, `JENKINS_HOME` hay endpoint debug để “cho webhook chạy”.
3. **Tạo webhook ở repository sandbox trước.** Chọn event hẹp, chẳng hạn push vào một branch lab. Dùng secret/signature verification nếu SCM và plugin hỗ trợ; secret chỉ nằm trong credential/configuration được phê duyệt, không nằm trong Jenkinsfile hay URL.
4. **Liên kết event với đúng job.** Kiểm tra repository URL, branch spec/discovery strategy, credential read-only và quyền folder/job. Một endpoint nhận event không có nghĩa mọi repository được quyền kích hoạt mọi job.
5. **Gửi event thử vô hại.** Push một thay đổi text vào repository sandbox hoặc dùng cơ chế test delivery của SCM nếu nó không lộ payload nhạy cảm. Đối chiếu delivery ID/thời điểm ở SCM với build cause, commit SHA và job ở Jenkins.
6. **Chỉ sau đó mới thêm production.** Bật webhook cho từng repository/job theo change review, theo dõi tỷ lệ delivery fail và giữ đường rollback là disable webhook hoặc disable job — không phải tắt bảo vệ Jenkins toàn cục.

Một số plugin tự quản lý webhook khi có credential đủ quyền, số khác yêu cầu tạo webhook thủ công trong SCM. Đây là khác biệt capability của plugin và policy SCM. Cấp credential quản lý webhook riêng, scope hẹp và quyền tối thiểu; không tái sử dụng credential deploy/release chỉ để tạo hook.

### Lọc sự kiện và tránh build thừa

Lọc càng sớm càng tốt nhưng đừng phụ thuộc vào một lớp duy nhất:

- Tại SCM, chỉ chọn event cần thiết và giới hạn repository; tránh gửi cả push, tag, issue, comment và PR event đến một job không xử lý chúng.
- Tại branch source/job, chỉ discovery branch/PR/tag theo policy. Không build tag, fork hay PR nếu không có nhu cầu và trust model tương ứng.
- Trong Jenkinsfile, dùng `when` hoặc policy rõ ràng để chặn stage có side effect khi branch/revision không thuộc allowlist. Việc chặn stage không thay thế lọc webhook vì build vẫn tốn executor.
- Đặt một quy ước: một commit trên nhánh CI có một job owner chính. Nếu Multibranch đã quản lý branch, không tạo thêm Freestyle/Pipeline poll cùng ref trừ khi mục đích khác và đã có dedupe.

SCM có thể retry delivery sau timeout; cùng push có thể tạo push event, branch indexing và Poll SCM; người dùng cũng có thể bấm **Build Now**. Xem phần [Dedupe sự kiện và concurrency](#dedupe-sự-kiện-và-concurrency) trước khi coi mỗi request là một build cần giữ lại.

### Bảo vệ endpoint webhook

| Kiểm soát | Cách áp dụng | Không được thay thế bằng |
| --- | --- | --- |
| TLS và hostname chuẩn | Kết thúc TLS ở reverse proxy/Jenkins theo chuẩn tổ chức; SCM xác minh certificate | HTTP, certificate bỏ kiểm tra hoặc URL IP tạm thời |
| Xác thực nguồn | Bật chữ ký HMAC/shared secret, token hoặc cơ chế plugin/SCM hỗ trợ; verify trước khi tạo build | So sánh một header tự tạo trong Jenkinsfile |
| Network policy | Chỉ cho dải IP/egress chính thức của SCM đi tới endpoint qua firewall/WAF/proxy khi tổ chức có nguồn IP đáng tin | Mở rộng mọi endpoint Jenkins ra Internet |
| Quyền Jenkins | Anonymous/overall read, job build/configure và credential scope theo least privilege | Cho webhook identity quyền Configure/Administer |
| CSRF | Giữ CSRF protection của Jenkins; chỉ dùng exemption hẹp do plugin endpoint tài liệu hóa | Tắt CSRF protection toàn cục để sửa lỗi 403 |
| Audit và rate limit | Lưu delivery ID, repository, event type, response/status và build URL; alert burst/failure | Log payload, Authorization header hoặc secret |

Không ghi shared secret, personal access token hay chuỗi chữ ký vào Jenkinsfile, parameter, URL query, console output hoặc artifact. Nếu nghi lộ secret webhook, rotate ở SCM và Jenkins/plugin theo quy trình, kiểm tra delivery/build gần đó và thu hẹp quyền; xóa một log không thu hồi được bản sao đã bị đọc.

<Callout type="error" title="Không để webhook biến thành đường chạy code đặc quyền">
  Jenkinsfile từ branch/PR có thể thay đổi `agent`, lệnh shell và cách dùng credential. Build từ fork hoặc contributor chưa tin cậy phải ở agent/pool cô lập, không nhận credential publish/deploy và không có đường mạng production. Bảo vệ endpoint chỉ xác minh nguồn event; nó không làm source code an toàn.
</Callout>

## Poll SCM: hỏi SCM xem có thay đổi

Poll SCM chạy một kiểm tra SCM theo lịch. Khi plugin phát hiện thay đổi phù hợp với repository/ref của job, Jenkins mới tạo build. Nó hữu ích làm fallback cho webhook hoặc cho SCM nội bộ không hỗ trợ callback, nhưng chi phí tăng theo số job, tần suất, lịch sử/ref cần kiểm tra và độ trễ SCM.

### Khác với build theo lịch

| Đặc điểm | Poll SCM | `cron(...)` / Build periodically |
| --- | --- | --- |
| Đến lịch thì làm gì? | Hỏi SCM có thay đổi không | Enqueue build ngay |
| Không có commit mới | Không tạo build | Vẫn tạo build |
| Phù hợp | CI dựa trên source change | Nightly test, refresh report, kiểm tra expiry |
| Nguy cơ chính | SCM API/Git traffic, rate limit, nhiều poll cùng lúc | Thừa build, đụng tài nguyên lúc giờ cao điểm |
| Cause thường cần thấy | SCM change/polling liên quan | Timer trigger |

Đừng dùng `cron` để giả Poll SCM rồi để shell tự `git pull` và quyết định có chạy hay không. Jenkins sẽ vẫn chiếm queue/agent, khó ghi cause và dễ lệch checkout. Hãy dùng SCM integration của job/plugin cho thay đổi source; dùng timer cho công việc vốn cần chạy dù source không đổi.

### Cấu hình và giới hạn vận hành

Trong Declarative Pipeline, trigger poll có dạng sau. `H` phân tán minute giữa job; lịch chỉ là ví dụ, hãy chọn khoảng dựa trên RPO CI, số repository và quota SCM.

```groovy
pipeline {
  agent none

  triggers {
    pollSCM('H/15 * * * 1-5')
  }

  stages {
    stage('Check on a sandbox agent') {
      agent { label 'ci-sandbox' }
      steps {
        echo 'The job was started after SCM polling detected a change.'
      }
    }
  }
}
```

Để poll có ý nghĩa, job phải có SCM definition mà Jenkins/plugin có thể kiểm tra. Với **Pipeline script from SCM**, cấu hình SCM của job và Jenkinsfile phải trỏ source sandbox đúng. Với Freestyle, cấu hình Git nằm ở **Source Code Management** và Poll SCM nằm trong **Build Triggers**. Multibranch Pipeline thường dùng branch source indexing/webhook; đừng thêm Poll SCM cho từng child branch chỉ vì muốn “chắc chắn” trước khi kiểm tra tài liệu plugin.

Đo trước khi rút ngắn lịch:

- số job poll, số remote/ref, kích thước/history Git và cache mirror trên agent/controller;
- request/authentication failures, SCM API rate limit và thời gian poll p95;
- tỷ lệ poll không tạo build so với số build có giá trị;
- queue delay sau khi nhiều poll cùng phát hiện thay đổi.

Bắt đầu thưa, ví dụ mỗi 15 hoặc 30 phút cho fallback, phân tán bằng `H`, rồi điều chỉnh bằng số liệu. Không đặt `* * * * *` cho nhiều job trên controller production chỉ để bù một webhook chưa được chẩn đoán. Sửa URL, DNS, TLS, signature hoặc plugin của webhook trước; nếu Poll SCM là cơ chế chính, ghi rõ quota và capacity owner.

## Lịch cron: chạy theo thời điểm

Jenkins dùng cron gồm năm trường. Declarative Pipeline khai báo timer bằng `triggers { cron('...') }`; Freestyle dùng **Build periodically** trong UI. Timer đưa build vào queue bất kể source có đổi hay không.

### Năm trường cron và ký tự H

```text
MINUTE  HOUR  DAY-OF-MONTH  MONTH  DAY-OF-WEEK
  0-59   0-23      1-31      1-12      0-7 (0 và 7 là Chủ nhật)
```

Các toán tử thường dùng là `*` (mọi giá trị), `,` (danh sách), `-` (khoảng) và `/` (bước). Jenkins bổ sung **`H`**: một giá trị hash ổn định từ tên đầy đủ của job, dùng để không dồn tất cả job vào cùng phút/giờ. `H` không phải ngẫu nhiên mỗi lần chạy; đổi tên hoặc di chuyển job/folder có thể đổi thời điểm hash.

Ví dụ `H 2 * * 1-5` chạy một lần trong giờ 02 theo ngày làm việc, nhưng phút thực tế khác nhau giữa các job. `H H * * *` phân tán cả giờ lẫn phút cho tác vụ chạy mỗi ngày. `H/15 * * * *` có ý nghĩa chạy theo bước 15 phút được phân tán, không phải cam kết mọi job chạy đúng phút `00`, `15`, `30`, `45`.

<Callout type="idea" title="Dùng H thay cho 0 khi có thể">
  `0 * * * *` khiến mọi job cùng chạy ở phút 0 mỗi giờ. Với nhiều job, dùng `H * * * *` hoặc lịch có `H` làm giảm đỉnh queue, Git traffic và load controller mà vẫn giữ lịch ổn định cho từng job.
</Callout>

### Ví dụ lịch an toàn

| Lịch | Ý nghĩa | Dùng cho | Lưu ý |
| --- | --- | --- | --- |
| `H H * * *` | Mỗi ngày một lần, giờ/phút phân tán | Report hoặc kiểm tra vệ sinh không có side effect | Không dùng nếu phải chạy đúng một giờ nghiệp vụ cố định. |
| `H 2 * * 1-5` | Một lần trong giờ 02, thứ Hai–Sáu | Nightly test ngày làm việc | Phút là hash; ghi timezone của controller. |
| `H/15 * * * 1-5` | Khoảng 15 phút ngày làm việc, lệch giữa job | Fallback Poll SCM hoặc kiểm tra nhẹ | Đo quota SCM và tổng số job trước khi dùng. |
| `H 6 * * 1` | Mỗi thứ Hai trong giờ 06 | Báo cáo tuần | Nếu báo cáo phụ thuộc dữ liệu tháng, xử lý ngày lễ/múi giờ trong logic đã review. |
| `0 0 1 * *` | Đúng 00:00 ngày đầu tháng | Công việc phải theo mốc lịch cố định | Có thể tạo thundering herd; chỉ dùng khi độ chính xác thời điểm quan trọng. |

Mẫu Declarative cho nightly check vô hại:

```groovy
pipeline {
  agent none

  triggers {
    cron('H 2 * * 1-5')
  }

  options {
    skipDefaultCheckout(true)
    disableConcurrentBuilds()
    timeout(time: 5, unit: 'MINUTES')
  }

  stages {
    stage('Scheduled sandbox check') {
      agent { label 'ci-sandbox' }
      steps {
        echo 'Scheduled check only; no deploy, credential, network, or cleanup action.'
      }
    }
  }
}
```

### Timezone, thời điểm bận và độ trễ

Cron được Jenkins diễn giải theo timezone đang hiệu lực trên controller trừ khi cấu hình trigger/instance của bạn quy định khác. Do daylight-saving time, một giờ địa phương có thể lặp hoặc không tồn tại ở vùng có DST. Kiểm tra timezone controller, bản Jenkins/plugin và lịch hiệu lực trên instance; ghi timezone như một phần contract vận hành, ví dụ “khoảng 02:00 UTC”, thay vì chỉ ghi “2 giờ sáng”.

Timer chỉ tạo queue item. Build thực tế có thể muộn vì quiet period, controller tải cao, agent offline, executor hết chỗ, lock, `disableConcurrentBuilds()` hoặc maintenance window. Do đó không dùng Jenkins timer đơn thuần cho deadline pháp lý, cutover chính xác từng phút hoặc thao tác một lần không thể lặp. Những việc đó cần owner, timezone/holiday calendar, idempotency, alert khi trễ và cơ chế xác nhận completion riêng.

Nếu hai lịch có thể chồng nhau, hãy tính thời gian chạy p95/p99 và queue delay. Chọn một trong các cách: giảm tần suất, tách resource pool, để build cũ hoàn thành rồi queue build kế tiếp, hoặc làm công việc idempotent có lock/lease ở hệ thống đích. Không giải quyết bằng cách tắt timeout hay cho phép vô hạn concurrent build.

## Upstream và downstream: dependency giữa job

Dependency trigger phù hợp khi đầu ra hay quality gate của job A là điều kiện để job B bắt đầu. Nó không tự truyền artifact, commit SHA, parameter, credential hoặc ý nghĩa “đã release”. Những dữ liệu đó phải được truyền/xác minh tường minh theo contract của hai job.

### Upstream trigger

Job downstream có thể khai báo trigger từ job upstream và threshold kết quả. Trong Declarative Pipeline, cú pháp tham khảo là:

```groovy
pipeline {
  agent none

  triggers {
    upstream(
      upstreamProjects: 'platform/compile-and-test',
      threshold: hudson.model.Result.SUCCESS
    )
  }

  stages {
    stage('Consume verified input') {
      agent { label 'ci-sandbox' }
      steps {
        echo 'Run only after the named upstream job succeeds.'
      }
    }
  }
}
```

`upstreamProjects` là tên/path job Jenkins, không phải URL repository. Xác nhận folder path sau khi đổi tên/move job; dùng tên không mơ hồ và một owner cho cạnh dependency. `SUCCESS` là ngưỡng chặt cho bước tiếp theo có side effect. Nếu chọn threshold như `UNSTABLE`, phải ghi rõ tại sao test/cảnh báo unstable vẫn an toàn cho downstream; không dùng ngưỡng lỏng để che quality gate.

Với Freestyle, lựa chọn UI thường là **Build after other projects are built**. Tên và khả năng chính xác phụ thuộc core/plugin, nhưng nguyên tắc không đổi: ghi upstream cụ thể, result threshold, owner và cách khôi phục khi upstream bị rename/disable.

### Kích hoạt downstream tường minh

Khi Pipeline A biết chính xác lúc nào cần gọi B, dùng `build` step tường minh. Mẫu dưới chỉ truyền metadata sandbox allowlist; downstream vẫn phải validate input và tự áp dụng quyền của nó.

```groovy
stage('Request downstream verification') {
  steps {
    build(
      job: 'platform/downstream-verification',
      wait: true,
      propagate: false,
      parameters: [
        string(name: 'UPSTREAM_BUILD_URL', value: env.BUILD_URL ?: ''),
        string(name: 'SOURCE_REVISION', value: 'sandbox-revision')
      ]
    )
  }
}
```

`wait: true` khiến Pipeline A chờ B kết thúc. `propagate: false` giúp A tự kiểm tra kết quả trả về và quyết định thông điệp/rollback theo policy, thay vì tự động ném lỗi ngay; nó không biến failure của B thành success về mặt vận hành. Trong workflow thật, truyền commit SHA từ SCM metadata đã kiểm chứng, build URL/number và artifact version/checksum theo contract; không truyền free-form job name, credential ID, command, URL đích deploy hoặc secret qua parameter.

Nếu A không cần biết kết quả B ngay, `wait: false` chỉ enqueue B rồi tiếp tục. Cách này phù hợp notification hay tác vụ tách biệt, không phù hợp quality gate mà A phải dựa vào. Ghi correlation ID/build URL để vẫn truy được chuỗi khi B thất bại sau đó.

### Thiết kế dependency không tạo vòng lặp

Vẽ dependency theo một hướng, ví dụ `compile-and-test → package → sandbox-verification`. Không tạo cả “A triggers B” và “B triggers A”, cũng không để cron/webhook trên B kích hoạt lại A mà không có guard. Vòng lặp có thể tạo hàng trăm build, đặc biệt khi mỗi job lại publish commit/tag hoặc gọi webhook.

Trước khi nối hai job, trả lời rõ:

1. Job nào là owner của checkout/revision và artifact producer?
2. Điều kiện kết quả nào cho phép bước tiếp theo, và `UNSTABLE` có ý nghĩa gì?
3. B nhận artifact/version nào, bằng đường nào, và xác minh checksum ở đâu?
4. Khi B retry hoặc A bị chạy lại, side effect có idempotent không?
5. Ai dừng chuỗi khi queue tăng hoặc một dependency bị disable?

Dùng tên job theo domain và ghi upstream/downstream graph trong description/runbook. Khi cần nhiều branch/PR, ưu tiên Multibranch/SCM-aware design thay vì hard-code một ma trận tên child job dễ drift.

## Dedupe sự kiện và concurrency

### Nguồn build trùng thường gặp

Một commit có thể tạo hơn một queue item vì webhook retry, push event chồng với Poll SCM, branch indexing, cron, upstream trigger, manual rebuild hoặc hai webhook rule cùng match. Build trùng không luôn vô hại: chúng có thể cạnh tranh workspace/cache, ghi đè cùng version, gửi notification lặp hoặc deploy hai lần.

Bắt đầu điều tra từ evidence của từng build: **Build Cause**, timestamp nhận event, repository/ref/SHA, queue time, agent, parameter và downstream build URL. Đừng suy ra “webhook bị lỗi” chỉ vì có hai build; một build có thể là manual hoặc timer, và SCM delivery retry có thể là hậu quả Jenkins/proxy trả timeout.

### Chọn chính sách hàng đợi

| Mục tiêu | Kiểm soát | Trade-off và điều kiện |
| --- | --- | --- |
| Không chạy cùng lúc hai build của một job | `options { disableConcurrentBuilds() }` | Build mới chờ build trước; phù hợp test/scan dùng cùng tài nguyên. Queue có thể dài khi commit dày. |
| Chỉ giữ thay đổi mới nhất cho CI hủy được | `disableConcurrentBuilds(abortPrevious: true)` khi bản Jenkins/plugin hỗ trợ | Build cũ bị hủy. Chỉ dùng cho test/scan idempotent, không deploy/migration/publish hay cleanup có thể làm hỏng build khác. |
| Gom event gần nhau | Quiet period ở job/trigger theo UI hoặc Pipeline option đã xác minh | Tăng latency và không thay delivery dedupe; chọn thời gian bằng số liệu push burst. |
| Không tạo event thừa | Lọc webhook/branch source, tắt trigger chồng chéo | Cần owner của mapping repository → job. |
| Chống side effect trùng | Version bất biến, idempotency key, lock/lease ở hệ thống đích | `disableConcurrentBuilds` chỉ bảo vệ một job, không bảo vệ hai job/controller khác nhau. |

Mẫu CI an toàn mặc định thường là serialize, không hủy build đang chạy:

```groovy
options {
  disableConcurrentBuilds()
  timeout(time: 20, unit: 'MINUTES')
  buildDiscarder(logRotator(numToKeepStr: '30'))
}
```

Nếu mục tiêu là “chỉ cần trạng thái mới nhất”, dùng hủy build cũ chỉ sau khi xác nhận tất cả stage có thể bị interruption giữa chừng. Đặc biệt không để `post { always { ... } }` xóa một path dùng chung, revoke resource của build khác, hay publish “latest” khi build bị hủy. Mọi publish/deploy cần version bất biến và kiểm soát concurrency ở hệ thống đích, không chỉ ở Jenkins.

## Lab sandbox: xác minh timer và Poll SCM

Lab này tạo console output vô hại trên agent sandbox. Nó không dùng credential, không gọi API bên ngoài, không publish/deploy và không xóa path. Cần một Jenkins lab, agent Unix có label `ci-sandbox`, Pipeline plugin và quyền tạo/xóa job sandbox. Không thay label bằng built-in node/controller nếu không có sandbox agent.

### Chuẩn bị

1. Tạo một Pipeline job tạm tên `trigger-timer-lab`; chọn **Pipeline script** và dán Jenkinsfile ở phần kế tiếp.
2. Xác nhận `ci-sandbox` là pool tách biệt, online và có executor. Đặt built-in node/controller là `0` executor trong môi trường production theo policy quản trị.
3. Lưu job, dùng **Build Now** một lần để kiểm tra cú pháp, label và output. Manual build là baseline; nó không chứng minh timer đã chạy.
4. Ghi tên job đầy đủ, timezone controller và thời điểm lưu. Jenkins dùng tên job để tính `H`, nên không đổi tên job trong lúc quan sát lịch.

### Jenkinsfile timer vô hại

```groovy
pipeline {
  agent none

  triggers {
    cron('H/5 * * * *')
  }

  options {
    skipDefaultCheckout(true)
    disableConcurrentBuilds()
    timeout(time: 3, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  stages {
    stage('Record trigger safely') {
      agent { label 'ci-sandbox' }
      steps {
        echo "Sandbox timer build number: ${env.BUILD_NUMBER}"
        echo 'No checkout, credential, network, artifact, deploy, or filesystem cleanup was requested.'
      }
    }
  }
}
```

`H/5` giúp lab không đợi quá lâu nhưng vẫn không ép mọi job chạy đúng cùng phút. Chỉ dùng tần suất này cho một job lab ngắn hạn; sau bài thực hành, disable/xóa job để không để timer test chạy mãi.

### Thử Poll SCM và webhook

Để kiểm tra Poll SCM, tạo **một job sandbox riêng** thay vì đổi job timer. Cấu hình job đó với repository Git sandbox do bạn được phép sửa; dùng credential read-only nếu repository private. Với Freestyle, bật **Poll SCM** và dùng `H/15 * * * 1-5`. Với Pipeline from SCM, xác nhận SCM definition của job và khai báo `pollSCM('H/15 * * * 1-5')` trong Jenkinsfile sau khi kiểm tra syntax trên controller.

Thực hiện theo thứ tự:

1. Đợi một chu kỳ poll khi repository không đổi. Kết quả đúng là **không có build mới** từ Poll SCM.
2. Commit/push một thay đổi text vô hại vào branch sandbox đã cấu hình. Không dùng secret, tag release hay branch production.
3. Đợi chu kỳ tiếp theo. Mở build mới, ghi cause và commit SHA checkout. Kết quả đúng là có đúng một build do SCM change/poll, trừ khi job còn trigger khác đã được ghi nhận.
4. Nếu đã có endpoint webhook được quản trị, thêm webhook chỉ cho repository/branch sandbox và event push hẹp. Gửi một thay đổi text khác, rồi đối chiếu delivery ID ở SCM với build cause, SHA và thời điểm ở Jenkins.
5. Khi webhook đã chứng minh hoạt động, **tắt Poll SCM trong job webhook thử nghiệm** hoặc giữ fallback theo policy dedupe đã viết. Không để cả hai chạy mơ hồ rồi suy đoán từ số build.

Không dùng nút “test webhook” để paste payload/secret vào Jenkins console. Delivery history của SCM và log plugin/proxy đã kiểm soát là nơi phù hợp để điều tra status HTTP; chỉ lưu metadata cần thiết, không lưu header xác thực hay payload nhạy cảm.

### Kết quả mong đợi và dọn dẹp

| Thử nghiệm | Kết quả mong đợi | Bằng chứng |
| --- | --- | --- |
| Manual baseline | Một build `SUCCESS`, hai dòng console vô hại | Build number, agent `ci-sandbox`, không checkout/credential/network |
| Timer | Một build mới sau thời điểm hash của job; có timer cause | Thời điểm queue/build và cause trên build page |
| Poll không đổi source | Không có build Poll SCM mới | Poll log/timestamp và build history không tăng từ poll |
| Poll sau push sandbox | Một build checkout đúng SHA sandbox | Cause, repository/ref/SHA và console checkout |
| Webhook sandbox | Delivery thành công liên kết với build đúng job/SHA | Delivery ID/status ở SCM, build URL/cause/timestamp |

Khi xong, disable hoặc xóa hai job sandbox theo policy đội ngũ, xóa webhook sandbox ở SCM nếu bạn có quyền và không còn cần evidence, rồi kiểm tra không còn timer/poll hoạt động. Không xóa workspace bằng shell, không xóa build history/job production và không thu hồi credential không thuộc lab.

## Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Cách chẩn đoán và xử lý an toàn |
| --- | --- | --- |
| SCM báo webhook `404` | Sai endpoint/path, reverse proxy route sai hoặc plugin chưa cung cấp endpoint đó | Lấy endpoint từ tài liệu plugin đang cài, kiểm reverse-proxy route/TLS; không mở thêm endpoint hay đoán URL. |
| SCM báo `401`/`403` | Signature/token sai, permission/policy endpoint hoặc CSRF/plugin mismatch | Đối chiếu cấu hình plugin và SCM, rotate secret nếu cần; không tắt CSRF hay cấp Administer để thử. |
| SCM timeout nhưng Jenkins có build | Proxy/controller phản hồi chậm nên SCM retry delivery | So sánh delivery ID/timestamps, HTTP access log đã được bảo vệ và cause; thêm dedupe/quiet period, xử lý latency. |
| Có hai hoặc nhiều build cho một commit | Webhook + poll/indexing/manual/upstream cùng hoạt động, hoặc SCM retry | Phân loại cause từng build, tắt trigger chồng hoặc serialize; không chỉ xóa build record để che triệu chứng. |
| Poll SCM luôn build dù không có commit mới | Sai SCM/ref, plugin behavior/configuration hoặc workspace/SCM metadata không ổn định | Kiểm SCM definition và poll log trên job sandbox, cập nhật/fix plugin theo change process; đừng thay bằng cron. |
| Poll SCM không bao giờ build | Không có SCM definition có thể poll, sai credential/ref, lịch chưa đến hoặc SCM không truy cập được | Kiểm trigger schedule, repo/ref/credential read-only và log; test một commit sandbox rồi chờ chu kỳ. |
| Timer không chạy đúng phút kỳ vọng | `H` phân tán lịch, timezone controller, DST hoặc queue delay | Xem full job name, timezone và cause/queue time; chỉ dùng giờ/phút cố định khi requirement thực sự cần. |
| Build nằm trong queue | Agent/label/executor thiếu, concurrency/lock hoặc quiet period | Đọc queue reason và node status; tăng capacity đúng pool hoặc điều chỉnh lịch, không route source code sang controller. |
| Downstream không chạy | Sai job path, upstream threshold chưa đạt, job disabled hoặc thiếu quyền build | Kiểm exact full name/result/cause và quyền; không nới threshold hoặc quyền trước khi hiểu dependency. |
| Vòng lặp build | A/B trigger lẫn nhau hoặc publish tạo event quay lại | Disable một cạnh trong sandbox, vẽ graph, thêm guard/idempotency và chỉ bật lại sau review. |

## Checklist xác minh trước khi bật production

- [ ] Mỗi job có owner, mục đích trigger, repository/branch hoặc upstream rõ ràng; trigger thừa đã được tắt hoặc có lý do được ghi lại.
- [ ] Tôi phân biệt trigger, SCM checkout và thời điểm executor chạy; build evidence có cause, repository/ref và commit SHA.
- [ ] Webhook dùng endpoint do source plugin tài liệu hóa, HTTPS/certificate hợp lệ, xác thực nguồn, quyền tối thiểu và audit/rate-limit phù hợp.
- [ ] CSRF protection vẫn bật; không có secret trong URL, Jenkinsfile, parameter, console, artifact hoặc delivery evidence.
- [ ] Event webhook chỉ gồm loại event/repository/branch cần thiết; PR/fork không tin cậy không nhận credential hay agent có đường production.
- [ ] Poll SCM chỉ dùng khi có SCM definition hợp lệ và capacity/quota đã đo; lịch dùng `H` và không poll mỗi phút không có bằng chứng.
- [ ] Timer được phân biệt với Poll SCM; timezone, DST, queue delay và hành vi khi trễ đã được ghi thành contract vận hành.
- [ ] Upstream/downstream có exact job path, threshold, revision/artifact contract, owner và không có chu trình.
- [ ] Chính sách dedupe/concurrency đã chọn: lọc event, quiet period khi cần, serialize hoặc chỉ hủy build cũ cho công việc interruptible.
- [ ] Publish/deploy có idempotency/version bất biến và lock/lease ở hệ thống đích; không chỉ dựa vào `disableConcurrentBuilds()`.
- [ ] Lab sandbox đã đối chiếu manual, timer, Poll SCM hoặc webhook bằng cause, timestamp và SHA; timer/poll/webhook lab đã được dọn hoặc disable.

## Nguồn Jenkins chính thức

- [Jenkins Pipeline Syntax: triggers](https://www.jenkins.io/doc/book/pipeline/syntax/#triggers) — `cron`, `pollSCM`, `upstream` và các Declarative directive liên quan.
- [Jenkins Pipeline Syntax: cron](https://www.jenkins.io/doc/book/pipeline/syntax/#cron-syntax) — năm trường cron, `H` và ví dụ lịch Jenkins.
- [Pipeline: Build Step](https://www.jenkins.io/doc/pipeline/steps/pipeline-build-step/) — `build`, `wait`, `propagate` và parameters cho downstream job.
- [Git plugin](https://plugins.jenkins.io/git/) — SCM polling, Git integration và compatibility của plugin.
- [GitHub plugin](https://plugins.jenkins.io/github/) — webhook integration cho GitHub khi plugin này là source đã chọn.
- [Jenkins: CSRF Protection](https://www.jenkins.io/doc/book/security/csrf-protection/) — crumb protection và nguyên tắc bảo vệ request.
- [Jenkins: Securing Jenkins](https://www.jenkins.io/doc/book/security/) — authentication, authorization và hardening controller.
- [Jenkins: Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — scope và quyền tối thiểu cho credential SCM/plugin.
- [Jenkins: Managing Plugins](https://www.jenkins.io/doc/book/managing/plugins/) — kiểm tra, cập nhật và vận hành plugin có kiểm soát.

## Đọc tiếp

<Cards>
  <Card title="Freestyle Project" href="/docs/jobs/freestyle" description="Cấu hình SCM, trigger và build step qua UI." />
  <Card title="Biến môi trường Jenkins" href="/docs/jobs/environment-variables" description="Hiểu scope biến, parameter và bảo vệ secret trong build." />
  <Card title="Tổng quan Pipeline" href="/docs/pipelines/overview" description="Đặt trigger trong Pipeline as Code có review." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Thu hẹp credential của SCM, publish và deploy." />
</Cards>
