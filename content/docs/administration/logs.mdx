---
title: "Logs & Diagnostics"
description: "Chẩn đoán Jenkins bằng System Log Recorder, Console Output, Support Core bundle và centralized logging một cách an toàn."
---

<Callout type="info" title="Phạm vi">
  Trang này phân biệt log của Jenkins controller, agent/Remoting và từng build. Các ví dụ chỉ đọc dữ liệu hoặc thực hiện trong sandbox; không tăng mức log, tải bundle hay mở endpoint log trên production chỉ để thử.
</Callout>

Khi Jenkins có sự cố, hãy xác định **đúng nguồn log** trước khi đổi cấu hình. Console Output trả lời lệnh nào của một build đã chạy và lỗi đầu tiên là gì. System Log Recorder giúp quan sát mã chạy trong controller. Log của service, container hoặc agent giải thích process có khởi động, bị restart hay mất kết nối hay không. Các nguồn này bổ sung cho nhau, không nguồn nào thay thế nguồn khác.

## Mục lục

- [Mục tiêu và phạm vi](#mục-tiêu-và-phạm-vi)
- [Bản đồ nguồn log](#bản-đồ-nguồn-log)
  - [Luồng chẩn đoán](#luồng-chẩn-đoán)
  - [Chọn nguồn theo triệu chứng](#chọn-nguồn-theo-triệu-chứng)
- [System Log Recorder cho controller](#system-log-recorder-cho-controller)
  - [Chọn logger category và level](#chọn-logger-category-và-level)
  - [Quy trình thu thập có thời hạn](#quy-trình-thu-thập-có-thời-hạn)
- [Agent, Remoting và Console Output](#agent-remoting-và-console-output)
  - [Đọc ba lớp log](#đọc-ba-lớp-log)
  - [Khi agent mất kết nối](#khi-agent-mất-kết-nối)
- [Support Core bundle](#support-core-bundle)
  - [Dữ liệu, redaction và quyền](#dữ-liệu-redaction-và-quyền)
  - [Tạo và xử lý bundle an toàn](#tạo-và-xử-lý-bundle-an-toàn)
- [Centralized logging và forwarder](#centralized-logging-và-forwarder)
  - [Trường có cấu trúc và correlation ID](#trường-có-cấu-trúc-và-correlation-id)
  - [Retention, chi phí và kiểm soát truy cập](#retention-chi-phí-và-kiểm-soát-truy-cập)
- [Lệnh read-only theo môi trường](#lệnh-read-only-theo-môi-trường)
- [Lab sandbox tạo lỗi có chủ đích](#lab-sandbox-tạo-lỗi-có-chủ-đích)
  - [Chuẩn bị và chạy lab](#chuẩn-bị-và-chạy-lab)
  - [Kết quả mong đợi](#kết-quả-mong-đợi)
- [Troubleshooting](#troubleshooting)
- [Checklist xử lý sự cố](#checklist-xử-lý-sự-cố)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mục tiêu và phạm vi

Sau bài này, bạn có thể chọn đúng log cho một sự cố Jenkins, tạo một recorder hẹp và tạm thời, và chuyển bằng chứng cần thiết cho người có quyền mà không sao chép secret. Bạn cũng có thể đánh giá một Support Core bundle hoặc pipeline centralized logging như dữ liệu nhạy cảm cần được bảo vệ.

## Bản đồ nguồn log

| Thành phần | Nguồn chính | Trả lời câu hỏi nào | Không chứng minh điều gì |
| --- | --- | --- | --- |
| Jenkins controller | System Log Recorder, service/container log | Jenkins core hoặc plugin trên controller đã làm gì? | Lệnh bên trong workspace agent đã chạy ra sao. |
| Agent và Jenkins Remoting | Log service `agent.jar`, log host/container agent | Kết nối, reconnect, JVM hay process agent có vấn đề gì? | Cấu hình nội bộ controller đã lỗi thế nào. |
| Một build | Trang build → **Console Output** | Command, stage, exit code và lỗi đầu tiên của build là gì? | Toàn bộ health của controller hoặc agent. |
| Support Core | Diagnostic bundle của plugin | Snapshot hỗ trợ về cấu hình và trạng thái được plugin thu thập | Bundle đã tự động loại hết dữ liệu nhạy cảm. |
| Hệ thống tập trung | Forwarder và log backend | Mẫu lỗi qua nhiều nguồn, theo thời gian và correlation ID | Quyền Jenkins hay retention của chính Jenkins. |

Các tên category, menu và tập dữ liệu bundle thay đổi theo Jenkins LTS, plugin và policy của tổ chức. Đối chiếu giao diện instance đang chạy; không copy một category hay setting từ bài viết khác rồi bật rộng trên production.

### Luồng chẩn đoán

```text
┌───────────────┐     build event      ┌────────────────────┐
│ User / webhook│ ───────────────────► │ Jenkins controller │
└───────────────┘                      │ System Log Recorder│
                                       └─────────┬──────────┘
                                                 │ Remoting task/status
                                                 ▼
                                       ┌────────────────────┐
                                       │ Agent process      │
                                       │ agent service log  │
                                       └─────────┬──────────┘
                                                 │ command output
                                                 ▼
                                       ┌────────────────────┐
                                       │ Build Console      │
                                       │ Output             │
                                       └─────────┬──────────┘
                                                 │ selected records only
                                                 ▼
                                       ┌────────────────────┐
                                       │ Private forwarder  │
                                       │ / log backend      │
                                       └────────────────────┘
```

Bắt đầu từ build URL, build number, job/folder, revision, agent/node và khoảng thời gian có timezone. Dùng chúng để ghép các nguồn. Không suy đoán chỉ từ dòng cuối như `Finished: FAILURE`; lỗi nguyên nhân thường xuất hiện trước các dòng cleanup hoặc retry.

### Chọn nguồn theo triệu chứng

| Triệu chứng | Đọc trước | Đọc tiếp nếu chưa đủ | Hành động an toàn |
| --- | --- | --- | --- |
| Một stage trả non-zero | Console Output của đúng build | Log tool/test trên agent nếu có | Ghi lỗi đầu tiên, exit code, revision và node; không in lại environment. |
| Job ở queue hoặc controller báo lỗi plugin | System Log Recorder của controller | Service/container log controller | Giới hạn category vào scheduler hoặc plugin đang nghi ngờ. |
| Agent offline hoặc reconnect | Log service agent và controller category Remoting | Network/proxy log do owner của chúng quản lý | So khớp timestamp, node name và transport trước khi mở firewall. |
| Controller restart, OOM hoặc không lên UI | `journalctl` hoặc `docker logs` của controller | System Log Recorder sau khi controller hoạt động | Giữ một cửa sổ thời gian nhỏ và báo cho owner host. |
| Lỗi lặp trên nhiều controller/agent | Backend centralized logging | Bundle chỉ khi support yêu cầu | Query theo correlation ID và thời gian, không export toàn bộ index. |

## System Log Recorder cho controller

**System Log Recorder** là recorder dựa trên Java logging của Jenkins controller. Trong UI, administrator thường tạo recorder tại **Manage Jenkins → System Log**, đặt tên có mục đích và thêm logger/category với level cần quan sát. Recorder này hữu ích cho đường code controller như queue, plugin, SCM integration hoặc Remoting ở phía controller. Nó không phải Console Output của build và không thay log của process agent.

Chỉ người có quyền quản trị phù hợp mới nên tạo, xem hoặc thay đổi recorder. Tạo recorder là thay đổi chẩn đoán vào controller, vì vậy ticket/sự cố cần nêu owner, lý do, category, level, thời điểm hết hạn và người xóa recorder.

### Chọn logger category và level

Category là namespace Java của phần cần quan sát, không phải tên job tùy ý. Chọn category từ stack trace, tên plugin, tài liệu plugin hoặc log sẵn có. Ví dụ minh họa, không phải danh sách bắt buộc:

| Sự cố hẹp | Điểm bắt đầu khả dĩ | Level đầu tiên | Khi nào tăng chi tiết |
| --- | --- | --- | --- |
| Pipeline flow của plugin | Namespace plugin xuất hiện trong stack trace, ví dụ `org.jenkinsci.plugins.workflow` | `INFO` hoặc `FINE` | Chỉ tăng một category con khi `INFO` không đủ cho một build tái hiện được. |
| Git/SCM plugin | Namespace của plugin xuất hiện trong lỗi, ví dụ `hudson.plugins.git` | `INFO` hoặc `FINE` | Xác nhận job sandbox và khoảng thời gian ngắn trước khi dùng `FINER`. |
| Kênh controller–agent | `hudson.remoting` hoặc namespace Remoting xuất hiện trong lỗi | `INFO` hoặc `FINE` | Dùng `FINE` ngắn hạn để đối chiếu một reconnect cụ thể. |
| Jenkins core/scheduler | Package xuất hiện trong stack trace của Jenkins core | `INFO` | Chỉ chọn package con đã xác định; không chọn root logger. |

Các level cao hơn `INFO` như `FINE`, `FINER` và `FINEST` có thể tạo rất nhiều record. `DEBUG` là cách gọi quen thuộc ở một số thư viện, nhưng Jenkins dùng Java logging levels; đừng giả định một nút “DEBUG toàn cục” là lựa chọn đúng. Không bật root logger, không chọn category quá rộng và không để `FINEST` hoặc tương đương chạy vô hạn.

<Callout type="warn" title="Recorder phải có giới hạn">
  Trước khi tăng mức log, phải có sự cố tái hiện được, category hẹp, build/node sandbox nếu có thể, thời điểm bắt đầu–kết thúc và owner xóa recorder. Log chi tiết có thể tăng I/O, che khuất lỗi chính và chứa dữ liệu nhạy cảm do plugin hoặc request ghi ra.
</Callout>

### Quy trình thu thập có thời hạn

1. Từ Console Output hoặc stack trace, ghi chính xác plugin/package nghi ngờ và khoảng thời gian sự cố.
2. Tạo recorder tên có thể truy vết, ví dụ `incident-123-remoting-2025-03-08`; thêm **một** category hẹp ở `INFO` hoặc `FINE` theo dữ kiện.
3. Tái hiện **một lần** trong job/node sandbox, hoặc đợi đúng sự kiện cần quan sát. Không chạy lại release hay production build chỉ để tạo log.
4. Xuất/ghi lại phần record liên quan theo quy trình incident: thời gian, logger, message, exception, build URL và node. Redact trước khi đưa vào ticket.
5. Hạ level hoặc xóa recorder ngay sau cửa sổ đã định. Xác nhận lại không còn category debug tạm thời.

Nếu không biết category, hãy giữ `INFO`, tìm tên package trong exception và hỏi maintainer/plugin support. Tăng độ rộng của logger để “bắt mọi thứ” thường làm bằng chứng kém hơn, không tốt hơn.

## Agent, Remoting và Console Output

Controller phân lịch và giữ System Log Recorder. Agent chạy process build trong workspace. **Jenkins Remoting** là kênh giao tiếp giữa hai phía. Vì vậy cùng một triệu chứng như “build mất kết nối” có thể có record ở controller, log `agent.jar` và Console Output; mỗi record nhìn thấy một phần khác nhau của sự kiện.

### Đọc ba lớp log

| Lớp | Ví dụ bằng chứng | Cách dùng đúng |
| --- | --- | --- |
| Controller/system | Exception plugin, quyết định queue, sự kiện channel ở phía controller | Dùng recorder hẹp để biết Jenkins nhận và xử lý sự kiện ra sao. |
| Agent/Remoting | `agent.jar` reconnect, lỗi TLS/DNS, JVM restart, disk hoặc process bị kill | Đọc log service/container của agent và đối chiếu node name, transport, timestamp. |
| Build Console Output | `checkout`, command test, `stderr`, exit code, `Finished: FAILURE` | Mở build cụ thể, đọc từ trên xuống đến lỗi nguyên nhân đầu tiên. |

Console Output có thể chứa output của command do repository hoặc tool tạo ra. Credential masking chỉ là lớp giảm lộ lọt, không phải cam kết rằng mọi biến thể secret, URL, artifact hay dòng tool đều được che. Không dùng `set -x`, `printenv`, `env`, `curl -v` hay dump workspace để chẩn đoán một build có secret.

### Khi agent mất kết nối

1. Ghi build URL, node, agent launch method (WebSocket, inbound TCP hay khác) và thời điểm chính xác.
2. Mở log process agent trước. Tìm restart, certificate/DNS, socket đóng hoặc thiếu disk; không paste agent secret vào command để “test nhanh”.
3. Trong controller, xem record Remoting đúng cửa sổ thời gian. Một reconnect phía agent không tự chứng minh controller hay network là nguyên nhân.
4. Mở Console Output để xác định build dừng trước, trong hay sau command nào. Lỗi workspace có thể là hậu quả của agent mất kết nối.
5. Chỉ owner network/proxy thay đổi rule hoặc timeout sau khi ba lớp có timestamp khớp nhau.

Đọc [Tổng quan về agents](/docs/agents/overview) và [Inbound Agents](/docs/agents/inbound-agents) để hiểu queue, executor và hướng kết nối trước khi sửa hạ tầng agent.

## Support Core bundle

[Support Core plugin](https://plugins.jenkins.io/support-core/) tạo **support bundle** để hỗ trợ chẩn đoán. Bundle thường tập hợp dữ liệu controller như thông tin Jenkins/core/plugin, cấu hình đã chọn, log/record chẩn đoán, thread dump hoặc thông tin môi trường tùy version và lựa chọn khi tạo. Đây là snapshot để người hỗ trợ tái tạo bối cảnh, không phải backup đầy đủ và không thay thế quy trình backup/restore đã được tổ chức kiểm thử.

Phạm vi thực tế do version Support Core, Jenkins core, plugin đã cài và lựa chọn collection quyết định. Trước khi tạo, mở màn hình bundle của chính instance và review danh sách file/collector được chọn. Không coi bundle là bằng chứng rằng mọi secret đã được tự động ẩn.

### Dữ liệu, redaction và quyền

| Rủi ro dữ liệu | Biện pháp trước khi tải hoặc chia sẻ |
| --- | --- |
| Secret, credential, token, private key, URL có token | Không thêm output/file chứa chúng vào bundle. Review archive; nếu nghi ngờ lộ, không gửi và xử lý như security incident/rotate theo policy. |
| PII hoặc dữ liệu nhạy cảm nghiệp vụ | Giảm phạm vi collection, redact định danh không cần thiết và dùng kênh chia sẻ được phê duyệt. |
| Tên host, topology, plugin inventory, đường dẫn | Xem là dữ liệu vận hành nhạy cảm; chỉ chia sẻ phần cần cho người nhận đã xác minh. |
| Build Console Output hoặc cấu hình job | Có thể chứa output do user/repository tạo; review theo case, không suy luận masking đã đủ. |

Redaction của plugin chỉ có thể xử lý những pattern/dữ liệu mà nó biết và có thể khác theo version. Nó không nhìn thấy secret đã bị mã hóa, biến đổi, ghi trong artifact hay được tool in theo dạng khác. Quy tắc an toàn là **review thủ công nội dung và phạm vi trước khi chia sẻ**, đồng thời không đưa secret vào log ngay từ đầu.

Bundle phải được tải bởi tài khoản có quyền phù hợp theo security matrix của tổ chức, lưu vào nơi mã hóa với ACL tối thiểu và ghi nhận người nhận/mục đích. Không đính bundle vào ticket công khai, chat công cộng, issue public hay gửi qua email không được phê duyệt. Đặt retention ngắn, có owner và quy trình xóa; retention của bundle không tự kế thừa retention build hay backup.

### Tạo và xử lý bundle an toàn

1. Mở ticket nội bộ, xác định sự cố, owner, Jenkins URL, khoảng thời gian và người nhận đã được phép.
2. Vào trang Support Core của controller; review collector/files và chỉ chọn phạm vi cần thiết. Không thêm workspace, home directory hay output chứa credential để “cho đủ dữ liệu”.
3. Tạo bundle khi đủ quyền, tải về kho nội bộ được mã hóa và kiểm tra nội dung theo quy trình redact của tổ chức.
4. Chia sẻ bản đã review qua kênh hỗ trợ đã phê duyệt, với thời hạn truy cập và danh sách người nhận tối thiểu.
5. Ghi hash, nơi lưu, thời điểm xóa và xác nhận xóa khi case đóng. Nếu phát hiện secret/PII, dừng chia sẻ và làm theo quy trình incident thay vì chỉ xóa dòng nhìn thấy.

<Callout type="error" title="Bundle không phải vùng an toàn cho bí mật">
  Không tạo bundle để gửi ra ngoài mặc định. Một bundle có thể chứa metadata và log đủ để tăng blast radius; redaction không thay thế review, quyền tải, chia sẻ có kiểm soát và retention ngắn.
</Callout>

## Centralized logging và forwarder

Centralized logging sao chép record cần thiết từ controller, agent và hạ tầng liên quan đến một backend riêng để tìm kiếm và alert. Một **forwarder** có thể là agent đọc journald/file, collector container runtime hoặc collector nền tảng. Jenkins không tự biến mọi record thành structured log, cũng không cấu hình/đảm bảo forwarder bên ngoài thay bạn.

| Môi trường | Nguồn forwarder có thể đọc | Giả định cần xác minh |
| --- | --- | --- |
| Jenkins cài như Linux service | journald hoặc file log của service `jenkins` | Host dùng systemd, unit name/log driver và quyền đọc journal đúng với bản cài. |
| Jenkins trong Docker | stdout/stderr của **đúng** container hoặc logging driver | Container name, runtime, logging driver, volume và lifecycle container không làm mất record trước khi forward. |
| Jenkins trên Kubernetes | stdout/stderr pod/container và metadata workload | Collector, namespace, RBAC, retention node và pod restart behavior do cluster quyết định. |
| Agent | Log service `agent.jar` hoặc stdout container agent | Agent có identity/machine/pod metadata riêng; không gán nhầm record controller. |
| System Log Recorder | Record controller được UI/Jenkins lưu hoặc xuất theo integration đã phê duyệt | Plugin/exporter là dependency riêng, có version, quyền và failure mode riêng. |

Không cài plugin chỉ vì muốn có forwarding nếu chưa review maintainer, version, quyền, network egress và cách plugin xử lý dữ liệu. Tương tự, không giả định `journalctl` có mặt trong container, hay `docker logs` tồn tại trên host systemd. Hãy ghi rõ lớp nào tạo record và lớp nào vận chuyển nó.

### Trường có cấu trúc và correlation ID

Một backend chỉ hữu ích khi record truy vấn được. Chuẩn hóa field không nhạy cảm ở forwarder hoặc parser, thay vì nhét JSON vào Console Output. Ví dụ một record đã được chuẩn hóa có thể là:

```json
{
  "timestamp": "2025-03-08T10:14:03Z",
  "source": "jenkins-controller",
  "component": "remoting",
  "level": "WARN",
  "jenkins_url": "https://jenkins.example.invalid/",
  "job_full_name": "sandbox/log-lab",
  "build_number": 17,
  "node_name": "lab-agent-01",
  "correlation_id": "inc-1234",
  "message": "Channel closed while build was running"
}
```

Dùng `correlation_id` từ incident/request hoặc một build identifier không nhạy cảm để nối controller, agent, reverse proxy và build. Các field tối thiểu thường gồm `timestamp` chuẩn UTC, `source`, `environment`, `component`, `level`, `job_full_name`, `build_number`, `node_name` và `correlation_id` khi có. Không đưa credential ID nhạy cảm, token, request header, toàn bộ command line, email cá nhân hay nội dung workspace vào field chỉ để tiện search.

### Retention, chi phí và kiểm soát truy cập

Log tập trung tăng khả năng truy vết nhưng cũng tăng volume, chi phí lưu trữ và số người có thể đọc dữ liệu. Thiết kế policy theo nguồn và mục đích:

- **Retention:** đặt thời hạn riêng cho raw debug, Console Output đã forward, audit và bundle metadata. Debug recorder có retention ngắn nhất; legal hold hoặc incident có quy trình ngoại lệ rõ ràng.
- **Chi phí:** đo ingest, cardinality của field và kích thước event. Giới hạn category/level tại nguồn trước khi scale backend; không giải quyết hóa đơn bằng cách xóa record của sự cố đang mở.
- **Access control:** tách role đọc controller, agent, security incident và vận hành platform; dùng SSO/RBAC, audit truy vấn/export và least privilege.
- **Network:** forwarder chỉ egress đến endpoint private đã xác thực bằng TLS. Backend và endpoint ingest không được public Internet; đặt sau private network/VPN, allowlist, xác thực workload và rate limit theo policy.
- **Resilience:** định nghĩa khi backend/forwarder down: buffer giới hạn, alert và cách tránh block Jenkins build. Logging không được trở thành một dependency khiến controller hoặc agent không thể hoạt động.

Không expose trang System Log, file log, `journalctl` output, Kibana/Grafana-like dashboard hay endpoint ingest ra công khai để “debug từ xa”. Đó là dữ liệu vận hành nhạy cảm và có thể tiết lộ topology, job hoặc output build.

## Lệnh read-only theo môi trường

Chỉ chạy các lệnh sau trên host/container mà bạn được phép xem. Chúng không thay đổi cấu hình, nhưng output vẫn có thể nhạy cảm: lưu/truyền nó theo policy, giới hạn khoảng thời gian và không paste nguyên log vào nơi công khai.

```bash
journalctl --unit jenkins --since '30 minutes ago' --no-pager -n 200
systemctl status jenkins --no-pager
docker logs --since 30m --tail 200 <controller-container>
```

Lệnh đầu và lệnh thứ hai dành cho Linux host dùng systemd; lệnh Docker yêu cầu thay `<controller-container>` bằng tên/ID controller đã xác minh. Trong Jenkins UI, mở **Manage Jenkins → System Log → `<recorder-name>`** để xem record controller, hoặc mở **`<JENKINS_URL>/job/<folder-or-job>/<build-number>/console`** cho Console Output của một build cụ thể. Đây là mẫu đường dẫn UI; không dựng URL log công khai và không chia sẻ URL có token.

## Lab sandbox tạo lỗi có chủ đích

Lab này tạo một Pipeline thất bại có kiểm soát để luyện liên kết build Console Output với một recorder controller hẹp. Dùng controller lab, folder/job `sandbox/log-lab`, agent lab không có credential và một người có quyền quản trị recorder. Không chạy trên built-in node production, không dùng repository thật và không tạo support bundle trong lab này.

### Chuẩn bị và chạy lab

1. Tạo một **Pipeline** tên `sandbox/log-lab`. Chọn agent label chỉ trỏ đến agent sandbox, ví dụ `log-lab`; nếu không có agent sandbox thì dừng lab thay vì chạy trên controller.
2. Trước khi chạy, ghi thời điểm UTC và tạo System Log Recorder tạm thời. Chỉ chọn một category liên quan đến Pipeline/flow mà stack trace của instance gợi ý, bắt đầu ở `INFO` hoặc `FINE`; ghi thời điểm xóa recorder sau lab.
3. Dán Jenkinsfile không có secret sau vào job rồi chọn **Build Now**:

```groovy
pipeline {
  agent { label 'log-lab' }

  stages {
    stage('Create a known failure') {
      steps {
        echo 'correlation_id=log-lab-001 scenario=intentional-failure'
        error('LOG_LAB_INTENTIONAL_FAILURE: stop after a safe marker')
      }
    }
  }

  post {
    always {
      echo 'correlation_id=log-lab-001 cleanup=observed'
    }
  }
}
```

4. Mở Console Output của chính build đó. Sau đó mở recorder trong cửa sổ thời gian đã ghi, chỉ đối chiếu record liên quan đến build/sự cố.
5. Xóa recorder hoặc trả level về trạng thái trước lab. Xác nhận không còn category chi tiết tạm thời, rồi lưu build URL và vài dòng đã redact vào ghi chú lab nội bộ.

### Kết quả mong đợi

- Build kết thúc `FAILURE`; Console Output có marker `correlation_id=log-lab-001`, thông điệp `LOG_LAB_INTENTIONAL_FAILURE` và dòng post `cleanup=observed`.
- Agent sandbox chạy stage; không có credential, token, `printenv` hay dump workspace trong output.
- Recorder chỉ có record của category/cửa sổ đã chọn. Có thể không có một dòng khớp từng marker Console Output vì recorder và build log là hai nguồn khác nhau; đó là kết quả bình thường.
- Sau cleanup, không còn recorder `FINE`/chi tiết của lab. Nếu một record bất ngờ chứa dữ liệu nhạy cảm, dừng copy/chia sẻ và báo owner theo incident process.

## Troubleshooting

| Vấn đề | Kiểm tra theo thứ tự | Tránh làm |
| --- | --- | --- |
| Không thấy record trong System Log Recorder | Xác nhận đúng controller, category, level, thời gian và sự cố có tái hiện | Bật root logger hoặc `FINEST` trên mọi category. |
| Console Output không giải thích agent offline | So node/timestamp với log agent, rồi record Remoting phía controller | Kết luận network lỗi chỉ từ `Finished: FAILURE`. |
| `journalctl` không thấy Jenkins | Kiểm tra đây có phải host systemd/unit `jenkins` hay Jenkins chạy trong container | Cài/chỉnh logging driver hoặc restart service chỉ để lấy log. |
| `docker logs` trống hoặc thiếu lịch sử | Xác minh đúng container, logging driver, lifecycle và collector runtime | Giả định container stdout có toàn bộ System Log Recorder hoặc build output. |
| Bundle quá lớn hoặc chứa dữ liệu không nên gửi | Dừng chia sẻ, review collector/file, redact theo policy và đánh giá incident | Nén lại hay upload công khai để “gửi nhanh”. |
| Query centralized logging không nối được các nguồn | Kiểm tra UTC, source, job/build/node và correlation ID | Thêm secret/PII vào record để tăng khả năng tìm kiếm. |
| Backend log down | Kiểm tra alert, buffer và policy drop/retry của forwarder | Mở endpoint ingest public hoặc để Jenkins block vô hạn. |

## Checklist xử lý sự cố

- [ ] Tôi có build URL/number, job/folder, revision, node và khoảng thời gian UTC.
- [ ] Tôi đã chọn Console Output, controller recorder hoặc agent/service log theo triệu chứng thay vì trộn chúng.
- [ ] Recorder (nếu cần) có category hẹp, level thấp nhất có ích, owner và thời điểm xóa.
- [ ] Tôi không in environment, secret, credential, private key, header hay workspace vào log/ticket.
- [ ] Tôi đã review phạm vi bundle và redact trước khi tải/chia sẻ; không coi redaction là bảo đảm tuyệt đối.
- [ ] Bundle/log export có người nhận được phép, kho mã hóa, ACL tối thiểu và retention/cleanup đã ghi nhận.
- [ ] Forwarder/backend có structured fields, correlation ID không nhạy cảm, RBAC và endpoint private.
- [ ] Tôi đã trả recorder về trạng thái cũ và lưu bằng chứng tối thiểu đã redact.

## Nguồn Jenkins chính thức

- [Viewing logs](https://www.jenkins.io/doc/book/system-administration/viewing-logs/)
- [Jenkins System Log](https://www.jenkins.io/doc/book/system-administration/system-log/)
- [Support Core plugin](https://plugins.jenkins.io/support-core/)
- [Managing Security](https://www.jenkins.io/doc/book/security/managing-security/)
- [Jenkins in Docker](https://www.jenkins.io/doc/book/installing/docker/)
- [Jenkins Remoting](https://www.jenkins.io/doc/book/using/using-agents/)

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Đặt controller, agent, job và build vào cùng mô hình nền tảng." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu đường đi của request, queue, executor và workspace." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Đọc log controller trong ngữ cảnh container và persistent volume." />
  <Card title="Tổng quan Jenkins Pipeline" href="/docs/pipelines/overview" description="Quay lại Console Output, stage và bằng chứng của từng build." />
</Cards>
