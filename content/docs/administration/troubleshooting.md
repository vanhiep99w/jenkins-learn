---
title: "Troubleshooting Jenkins"
description: "Chẩn đoán queue, agent, Pipeline và controller theo bằng chứng, với thay đổi nhỏ và xác minh rõ ràng."
---

Sự cố Jenkins thường biểu hiện giống nhau: build chờ mãi, agent mất kết nối, Pipeline không tiến triển hoặc controller phản hồi chậm. Trang này biến các biểu hiện đó thành một quy trình có thể lặp lại: xác định người chịu trách nhiệm và mức độ ảnh hưởng, giữ timeline, thu bằng chứng chỉ đọc, rồi chỉ thay đổi nhỏ khi giả thuyết đã đủ mạnh.

<Callout type="warn" title="Ưu tiên an toàn trong incident">
  Không restart controller, xóa queue item/workspace, tăng executor hoặc tắt plugin chỉ để “thử xem có hết không”. Những thao tác đó có thể che mất failure, làm mất bằng chứng hoặc khuếch đại incident. Không dán token, mật khẩu, private key hay nội dung credential vào ticket, log hay Support Core bundle.
</Callout>

## Mục lục

- [Nguyên tắc và phân loại sự cố](#nguyên-tắc-và-phân-loại-sự-cố)
  - [Severity, ownership và timeline](#severity-ownership-và-timeline)
  - [Bảng phân biệt nhanh](#bảng-phân-biệt-nhanh)
- [Decision tree chẩn đoán](#decision-tree-chẩn-đoán)
- [Thu thập bằng chứng chỉ đọc](#thu-thập-bằng-chứng-chỉ-đọc)
  - [UI, queue và computer](#ui-queue-và-computer)
  - [Log, process và metrics](#log-process-và-metrics)
  - [Support Core và gói escalation](#support-core-và-gói-escalation)
- [Queue bị tắc](#queue-bị-tắc)
  - [Label không khớp](#label-không-khớp)
  - [Executor và capacity cạn](#executor-và-capacity-cạn)
- [Agent offline](#agent-offline)
  - [Network, authentication và Java](#network-authentication-và-java)
  - [Workspace và lỗi phân biệt](#workspace-và-lỗi-phân-biệt)
- [Pipeline treo](#pipeline-treo)
  - [Timeout, input, lock và step](#timeout-input-lock-và-step)
  - [Đọc thread và log mà không che lỗi](#đọc-thread-và-log-mà-không-che-lỗi)
- [Controller chậm hoặc crash](#controller-chậm-hoặc-crash)
  - [JVM, heap và thread](#jvm-heap-và-thread)
  - [Disk, I/O và plugin](#disk-io-và-plugin)
- [Thay đổi nhỏ, rollback và xác minh](#thay-đổi-nhỏ-rollback-và-xác-minh)
- [Lab sandbox: queue và timeout có chủ đích](#lab-sandbox-queue-và-timeout-có-chủ-đích)
- [Checklist incident](#checklist-incident)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Nguyên tắc và phân loại sự cố

Một triệu chứng không phải là nguyên nhân. Ví dụ, build ở trạng thái `Waiting for next available executor` có thể do không có node thỏa label, executor đang bận, quota của provisioner đã hết, hoặc controller không kịp provision. Ghi lại câu thông báo nguyên văn, thời điểm theo múi giờ thống nhất và phạm vi bị ảnh hưởng trước khi sửa.

### Severity, ownership và timeline

Người nhận incident phải chỉ định **incident owner**: một người điều phối quyết định, cập nhật trạng thái và giữ bằng chứng. Owner không nhất thiết là người sửa hệ thống. Chỉ định thêm người ghi chép timeline và người liên lạc nếu incident lớn.

| Severity | Dấu hiệu thực tế                                                        | Hành động ban đầu                                                            | Cập nhật                                      |
| -------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| SEV1     | Controller không phục vụ; hầu hết build không chạy; nguy cơ mất dữ liệu | Mở incident, chỉ định owner, bảo toàn log/JVM evidence, gọi on-call nền tảng | Theo quy ước trực vận hành, ví dụ 15 phút/lần |
| SEV2     | Một pool agent hoặc luồng phát hành quan trọng bị dừng                  | Khoanh vùng pool/job, thu queue và agent evidence, có rollback chuẩn bị sẵn  | Theo quy ước đội, ví dụ 30 phút/lần           |
| SEV3     | Một job/nhánh bị ảnh hưởng, có đường vòng an toàn                       | Xác minh phạm vi, tạo ticket, sửa nhỏ có review                              | Khi có phát hiện hoặc trước SLA               |

Timeline phải có dữ kiện có thể kiểm tra: `10:14 UTC — build #281 bắt đầu chờ label linux-docker`; không ghi phỏng đoán như “agent chắc bị hỏng”. Lưu URL build/queue item, build number, node name, phiên bản Jenkins/plugin liên quan và timestamp của log. Khi timestamp giữa controller, agent và hệ thống metrics lệch nhau, dùng một mốc UTC để đối chiếu.

### Bảng phân biệt nhanh

| Triệu chứng quan sát được             | Phạm vi thường gặp            | Bằng chứng quyết định                                           | Đừng kết luận vội                                  |
| ------------------------------------- | ----------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Build chưa có executor                | Routing/capacity              | Lý do tại `/queue`, label expression, node online và executor   | Không phải mọi queue đều là thiếu CPU              |
| Node hiện `Offline` hoặc channel đóng | Một agent/pool                | Offline cause, launcher log, network reachability, Java version | Không suy ra controller crash từ một agent offline |
| Build có executor nhưng log không đổi | Pipeline/step/dependency      | Stage đang chạy, `input`, `timeout`, lock, external service log | Không nhầm với queue vì executor đã được cấp       |
| UI, API và nhiều build cùng chậm/lỗi  | Controller hoặc hạ tầng chung | JVM/GC, heap, disk/I/O, thread dump, service/container log      | Không tăng executor để chữa controller quá tải     |

## Decision tree chẩn đoán

Dùng flow này cho mỗi incident. Một nhánh chỉ dẫn đến **giả thuyết**, không phải giấy phép thay đổi lớn. Nếu bằng chứng mâu thuẫn, quay lại phạm vi và thu thêm dữ liệu.

```text
┌───────────────────────────────────┐
│ Triệu chứng + SEV + incident owner│
└─────────────────┬─────────────────┘
                  ▼
┌───────────────────────────────────┐
│ Phạm vi: 1 build, 1 pool, hay toàn│
│ controller? Ghi timeline UTC.     │
└─────────────────┬─────────────────┘
                  ▼
        ┌─────────────────────┐
        │ Build có executor?  │
        └───────┬────────┬────┘
           Không│        │Có
                ▼        ▼
       ┌─────────────┐  ┌─────────────────────────┐
       │ Queue:      │  │Stage/step có tiến triển?│
       │ label/node/ │  └─────────┬───────────┬───┘
       │ executor?   │       Không│           │Có
       └──────┬──────┘            ▼           ▼
              │           ┌──────────────┐  Kiểm tra lỗi
              ▼           │ input/lock/  │  nghiệp vụ/log job
      Thu evidence        │ timeout/I-O? │
      → giả thuyết        └──────┬───────┘
              │                  │
              └────────┬─────────┘
                       ▼
      ┌──────────────────────────────────┐
      │ Chỉ thay đổi nhỏ, có rollback    │
      │ → xác minh metric/log/build mới  │
      └──────────────────────────────────┘
                       │
                       ▼
      Không đủ evidence hoặc controller diện rộng?
      → escalation kèm bundle, timeline, tác động
```

<Callout type="info" title="Thứ tự bằng chứng">
  Ưu tiên dữ liệu ít biến đổi: trạng thái UI, timestamp, queue reason, node configuration đã hiển thị, log và metrics. Chụp/ghi chúng trước một thay đổi có thể làm job rời queue hoặc agent reconnect.
</Callout>

## Thu thập bằng chứng chỉ đọc

### UI, queue và computer

Các đường dẫn sau chỉ dùng để quan sát khi tài khoản của bạn có quyền đọc. Không cần gọi API có credential để thực hiện triage ban đầu.

| Nơi xem                    | Cần ghi lại                                                     | Câu hỏi trả lời                                 |
| -------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| Jenkins UI `/queue/`       | Queue reason, job/build, thời gian chờ, label expression        | Job đang chờ node nào, hay chỉ thiếu executor?  |
| Jenkins UI `/computer/`    | `Online`/`Offline`, số executor bận/rảnh, labels, offline cause | Có node phù hợp và khả dụng không?              |
| Trang build và Console Log | Stage hiện tại, timestamp, dòng cuối, build URL                 | Build chưa được schedule hay đã kẹt trong step? |
| System Log/Log Recorder    | Logger liên quan, exception và timestamp                        | Controller/launcher/plugin đã báo lỗi gì?       |
| Dashboard metrics          | Queue length/age, executor utilization, GC, heap, disk latency  | Sự cố cục bộ hay có xu hướng toàn hệ thống?     |

Lệnh dưới đây chỉ đọc trạng thái của host chạy controller. Chạy từ bastion hoặc console đã được cấp quyền; thay `jenkins` bằng tên service thực tế nếu khác.

```bash
# systemd: xem trạng thái và log gần đây, không thay đổi service
systemctl status jenkins --no-pager
journalctl -u jenkins --since '30 minutes ago' --no-pager

# Docker: xem container và log gần đây, không restart container
docker ps --filter 'name=jenkins'
docker logs --since 30m <jenkins-container>

# Host: xem dung lượng và I/O/CPU tức thời
df -h
df -ih
uptime
```

`journalctl` và `docker logs` có thể chứa URL repository, tên job hoặc dữ liệu nhạy cảm do plugin in ra. Lọc/redact trước khi gửi ra ngoài phạm vi incident; không dùng `set -x` trong script thu thập vì nó có thể in biến môi trường.

### Log, process và metrics

Khi controller chậm, lấy hai hoặc ba thread dump cách nhau 30–60 giây **chỉ khi runbook nội bộ cho phép**. Các dump cách nhau giúp phân biệt thread đang tiến triển với deadlock hoặc I/O chờ lâu. Chụp Java process bằng công cụ đã được phê duyệt; không tự ý `kill -9` JVM để “lấy lại UI”.

Đối chiếu ít nhất các nhóm tín hiệu sau:

- **JVM:** heap used/max, GC pause, số thread, `OutOfMemoryError`, thời điểm restart hoặc exit code.
- **Disk/I/O:** dung lượng và inode của `JENKINS_HOME`, latency/throughput disk, lỗi `No space left on device`, filesystem read-only.
- **Controller:** HTTP latency/error rate, queue length và tuổi item lâu nhất.
- **Agent/pool:** online count, executor utilization, provisioning failure/quota, reconnect count.
- **Pipeline:** stage duration theo baseline, bước external gọi đâu và exit/timeout của nó.

Metrics là bằng chứng xu hướng, còn log là bằng chứng sự kiện. Heap tăng đều cùng GC pause dài ủng hộ giả thuyết JVM pressure; queue tăng trong khi toàn bộ executor cùng bận ủng hộ capacity pressure. Một spike đơn lẻ không đủ để kết luận nguyên nhân gốc.

### Support Core và gói escalation

[Support Core](https://plugins.jenkins.io/support-core/) có thể tạo bundle cho người vận hành hoặc Jenkins support. Chỉ tạo theo chính sách truy cập và retention của tổ chức, vì bundle có thể bao gồm cấu hình, log và metadata nhạy cảm. Rà soát quyền truy cập, mã hóa khi truyền và redaction trước khi đính kèm ticket.

Gói escalation nên có:

- Incident owner, severity, phạm vi kinh doanh và timeline UTC.
- URL/bản build, queue reason hoặc node offline cause; tên job có thể pseudonymize nếu cần.
- Jenkins core version, Java version, plugin thay đổi gần nhất và loại triển khai (systemd, container hoặc Kubernetes).
- Log excerpt có timestamp, metrics snapshot/range và thread dump được phép thu thập.
- Các giả thuyết đã loại trừ, thay đổi nhỏ đã làm, kết quả và rollback state.
- Support Core bundle hoặc vị trí lưu nội bộ có kiểm soát truy cập, **không** gửi credential hay secret thô.

## Queue bị tắc

Queue là nơi Jenkins giữ task trước khi cấp executor. Bắt đầu bằng reason ở `/queue/`, sau đó đối chiếu expression của job với labels trên `/computer/`. Xem giải thích nền tảng về controller và queue trong [Kiến trúc Jenkins](/docs/getting-started/architecture), và quy tắc định tuyến trong [Labels & Executors](/docs/agents/labels-executors).

### Label không khớp

Dấu hiệu điển hình là queue reason nói không có node phù hợp, trong khi có executor rảnh ở node khác. So sánh **toàn bộ** label expression, không chỉ một từ trong đó: `linux && docker && jdk21` không thể chạy trên node chỉ có `linux docker`.

| Bằng chứng                            | Giả thuyết                                               | Thay đổi nhỏ có thể review                                                               | Xác minh                                                     |
| ------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Không node online nào khớp expression | Jenkinsfile dùng label không tồn tại hoặc agent pool mất | Sửa label thành contract đúng, hoặc khôi phục đúng pool theo thay đổi đã phê duyệt       | Queue reason biến mất và build chạy trên node đúng toolchain |
| Node khớp label nhưng `Offline`       | Agent/launcher/pool unavailable                          | Chuyển sang quy trình agent offline bên dưới                                             | Node `Online`, channel ổn định rồi queue được schedule       |
| Dynamic pod/cloud không xuất hiện     | Provisioner, quota hoặc template lỗi                     | Điều chỉnh quota/template qua change đã review; không đổi label để né năng lực cần thiết | Event provision thành công, node mang label đúng             |

Không dùng `agent any` làm cách chữa mặc định. Nó có thể vô tình đưa build release vào node không có toolchain hoặc boundary phù hợp. Đọc [Pipeline agents](/docs/pipelines/agents) trước khi thay agent directive.

### Executor và capacity cạn

Nếu có node khớp và online nhưng mọi executor đều bận, đây là saturation. Đối chiếu thời gian chạy với baseline: một executor “bận” 20 phút có thể là build bình thường, nhưng toàn pool kéo dài gấp nhiều lần baseline cần điều tra Pipeline hoặc external dependency.

1. Ghi số executor bận/rảnh theo từng label pool, queue age và top job chiếm slot.
2. Kiểm tra job có giới hạn concurrency, throttle, lock hoặc upstream dependency không.
3. Phân biệt pool hết capacity với controller chậm: pool hết capacity vẫn có UI/log phản hồi bình thường và executor thực sự chạy build; controller chậm thường làm nhiều thao tác cùng trễ.
4. Chỉ tăng capacity khi có headroom CPU/RAM/disk và workload cho phép concurrency. Lập change có sizing, expiry/rollback và owner.

<Callout type="idea" title="Xác minh capacity bằng workload đại diện">
  Sau khi thêm một agent hoặc executor đã được phê duyệt, chạy một build sandbox hoặc canary cùng label. Theo dõi queue age, thời gian build và tải host. Queue ngắn hơn nhưng agent swap hoặc I/O bão hòa không phải là khắc phục thành công.
</Callout>

## Agent offline

Agent offline là vấn đề kết nối hoặc lifecycle của node; nó khác với node online nhưng không có executor rảnh. Ghi offline cause ở `/computer/`, phương thức launch (inbound, SSH, container/Kubernetes) và thời điểm disconnect đầu tiên. [Tổng quan agents](/docs/agents/overview) cung cấp mô hình controller–agent; các cách dùng agent trong Pipeline nằm ở [Pipeline agents](/docs/pipelines/agents).

### Network, authentication và Java

Kiểm tra theo thứ tự gần nguồn lỗi nhất. Nếu controller không thấy agent kết nối, kiểm tra endpoint/network trước; nếu connection bị từ chối sau khi kết nối, kiểm tra authentication/agent secret theo cơ chế nội bộ mà không hiển thị secret; nếu channel mở rồi đóng, kiểm tra log Java/launcher và tương thích version.

| Nhóm                   | Evidence chỉ đọc                                                         | Cách phân biệt                                             | Hướng xử lý an toàn                                                                              |
| ---------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Network/DNS/TLS        | Launcher log, DNS/reachability probe được phê duyệt, TLS error/timestamp | Timeout/refused khác với authentication denied             | Chuyển evidence cho network team hoặc sửa DNS/certificate qua change; không tắt TLS verification |
| Authentication         | Controller/agent log báo unauthorized, token/secret mismatch (đã redact) | Xảy ra sau khi tới được endpoint                           | Xoay/cấp lại secret qua secret manager và quy trình đã duyệt; không in secret để so sánh         |
| Java/remoting          | `java -version` trên agent, remoting/launcher exception                  | `UnsupportedClassVersionError` chỉ ra incompatibility Java | Dùng Java version được Jenkins LTS hỗ trợ, cập nhật image/toolchain có rollback                  |
| Lifecycle/provisioning | Pod/VM event, quota, image pull, launcher lifecycle                      | Node biến mất sau idle/provision failure                   | Sửa template/quota/image qua review, kiểm tra agent mới nhận label đúng                          |

Với agent chạy service, chỉ đọc log dịch vụ trước:

```bash
# Ví dụ host agent dùng systemd: tên service tùy cài đặt
systemctl status jenkins-agent --no-pager
journalctl -u jenkins-agent --since '30 minutes ago' --no-pager
java -version

# Ví dụ agent container: chỉ xem trạng thái và log
docker ps --filter 'name=jenkins-agent'
docker logs --since 30m <agent-container>
```

Không sao chép command line chứa `-secret`, JNLP secret hay biến môi trường nhạy cảm vào ticket. Khi cần chứng minh cấu hình, dùng tên secret reference hoặc fingerprint đã được chính sách cho phép.

### Workspace và lỗi phân biệt

Agent `Online` không khẳng định workspace dùng được. Một build có thể fail ở checkout hoặc step đầu do permission, full disk, stale mount hoặc đường dẫn workspace biến mất. Đây là lỗi **sau khi đã schedule**, nên không chữa bằng cách sửa label hay tăng executor.

| Biểu hiện                             | Evidence                                            | Kết luận có thể kiểm tra                          |
| ------------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| Build vẫn ở queue                     | Không có executor; reason nhắc label/node           | Routing hoặc agent availability                   |
| Build đã có executor, fail ở checkout | Console log, filesystem permission/dung lượng agent | Workspace/SCM/credential access, không phải queue |
| Nhiều agent cùng fail ở checkout      | Timestamp và lỗi chung trên SCM/mount               | Shared dependency hoặc credential policy          |
| Chỉ một agent fail                    | Node log, `df -h`, ownership workspace trên node đó | Host/image/workspace cục bộ                       |

Chỉ dọn workspace theo runbook đã duyệt và sau khi lưu build log/evidence; không xóa hàng loạt workspace để che một lỗi permission hay đầy disk. Nếu cần rollback image/template, ưu tiên phiên bản agent đã biết hoạt động và xác minh bằng canary.

## Pipeline treo

Pipeline “treo” chỉ nên được gọi khi có executor nhưng stage/step không có tiến triển ngoài thời lượng dự kiến. Mở build page, xác định stage cuối có timestamp và xem console log từ điểm đó. Hành vi xử lý lỗi và timeout có thể đối chiếu trong [Pipeline error handling](/docs/pipelines/error-handling), còn cấu trúc Pipeline ở [Tổng quan Pipeline](/docs/pipelines/overview).

### Timeout, input, lock và step

| Dấu hiệu                                 | Evidence                                                     | Giả thuyết                                         | Thay đổi/xác minh                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Trang build hiển thị prompt chờ duyệt    | `input` message, approver policy, thời điểm chờ              | Pipeline chờ quyết định của người dùng, không treo | Owner phê duyệt hoặc hủy theo change policy; thêm timeout có thông báo cho lần sau                 |
| Log dừng ở resource lock                 | Tên resource, holder build, queue của lock                   | Contention hoặc holder bị kẹt                      | Kiểm tra holder trước; chỉ release lock theo runbook và xác minh resource nhất quán                |
| Step gọi API/CLI không trả về            | Dòng log cuối, timeout phía client/server, health dependency | External service hoặc step đang chờ I/O            | Đặt timeout có chủ đích, kiểm tra dependency; không bọc `catchError` để biến failure thành success |
| Không có log mới nhưng CPU/I/O agent cao | PID/process, thread dump được phép, disk/network metric      | Process còn chạy hoặc I/O blocked                  | Thu evidence rồi dừng build theo policy; sửa limit/retry/timeout có rollback                       |

`timeout` là guardrail, không thay thế chẩn đoán. Đặt timeout ở scope phù hợp và để build kết thúc rõ là `ABORTED`/`FAILURE`; đừng nuốt lỗi bằng `try/catch` hoặc `catchError` rồi báo xanh. Đối với `input`, ghi người duyệt và lý do vào thay đổi/ticket, không đưa URL có token vào message.

### Đọc thread và log mà không che lỗi

Nếu nhiều Pipeline cùng kẹt trong cùng step/plugin, mở rộng phạm vi sang controller/plugin. Nếu chỉ một build kẹt ở một external endpoint, bắt đầu ở dependency và agent mạng. So sánh ba mốc: lúc stage bắt đầu, lần log cuối và thời điểm metric đổi. Điều này phân biệt step im lặng nhưng còn chạy với step không còn tiến trình.

Các lỗi cần được giữ nguyên trạng thái:

- `timeout` phải ghi thông báo có action, không tự retry vô hạn.
- `input` cần owner/approver rõ ràng và expiry phù hợp.
- `lock` cần định danh resource và holder có thể truy vết.
- Retry chỉ dành cho failure tạm thời đã biết; log đủ attempt và failure cuối.
- Một Pipeline phải fail trung thực nếu test/deploy thất bại. Không đổi kết quả thành `SUCCESS` chỉ để giảm alert.

## Controller chậm hoặc crash

Khi UI, queue và nhiều build cùng chậm, coi đây là incident controller hoặc hạ tầng chung cho đến khi dữ liệu bác bỏ. Bắt đầu bằng availability, service/container log, timeline restart và tài nguyên host. Tài liệu [cài Jenkins bằng Docker](/docs/installation/docker) và [cài Jenkins trên Linux](/docs/installation/linux) mô tả bối cảnh triển khai thường gặp; chúng không thay thế runbook khôi phục của tổ chức.

### JVM, heap và thread

| Tín hiệu                                                 | Ủng hộ giả thuyết                 | Bước tiếp theo không phá hủy                                                                                   |
| -------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `OutOfMemoryError`, process exit/restart, heap gần max   | Heap pressure hoặc leak           | Giữ log/heap evidence theo runbook, kiểm tra workload/plugin thay đổi, escalation trước restart ngoài kế hoạch |
| GC pause dài, UI latency tăng, heap dao động cao         | GC pressure/cấp phát quá mức      | Đối chiếu heap, GC, queue, build load; lập change sizing JVM có rollback                                       |
| Nhiều thread cùng chờ I/O hoặc lock ở nhiều dump         | Storage/network/plugin contention | Lấy dump cách nhau, kiểm tra dependency và owner hạ tầng                                                       |
| Một endpoint/UI action chậm, các action khác bình thường | Plugin/view/API path cụ thể       | Khoanh logger/plugin, thử canary theo change; không tắt hàng loạt plugin                                       |

JVM heap không phải là toàn bộ memory của host/container. Đối chiếu memory limit, process RSS, native memory và các sidecar nếu có. Tăng `-Xmx` khi container không có memory headroom có thể làm container bị OOM kill, nên mọi thay đổi heap phải có baseline, giới hạn, rollback và quan sát sau triển khai.

### Disk, I/O và plugin

`JENKINS_HOME` hết byte hoặc inode có thể làm controller không ghi queue/config/build metadata. Disk latency cao có thể nhìn giống JVM freeze vì nhiều thread chờ filesystem. Đừng xóa build history, artifact hoặc plugin để giải phóng chỗ trong lúc chưa có retention plan và backup/approval.

Plugin là giả thuyết hợp lý khi stack trace/logger chỉ rõ namespace plugin hoặc lỗi bắt đầu ngay sau cập nhật. Nó không phải bằng chứng chỉ vì plugin “mới cài”. Ghi plugin ID/version, Jenkins LTS/Java version, stack trace đã redact và mốc thay đổi. Trong maintenance window hoặc canary được phê duyệt, rollback về phiên bản đã biết hoạt động; xác minh health, queue và một build đại diện. Nếu crash lặp lại hoặc nghi OOM/data corruption, escalation ngay kèm bundle thay vì thử nâng/hạ nhiều plugin.

<Callout type="error" title="Không restart mù">
  Restart có thể làm queue thay đổi, cắt channel agent, mất process đang chạy và xoá dấu vết tạm thời trong memory. Chỉ restart khi incident owner chấp thuận theo runbook, sau khi thu evidence tối thiểu và có kế hoạch truyền thông/rollback.
</Callout>

## Thay đổi nhỏ, rollback và xác minh

Một thay đổi tốt chỉ kiểm tra một giả thuyết: sửa một label contract, khôi phục một agent template, đặt timeout cho một step hoặc rollback một plugin đã xác định. Trước khi thực hiện, ghi owner, cửa sổ thay đổi, tác động dự kiến và điều kiện rollback.

| Giả thuyết                    | Thay đổi nhỏ                              | Rollback chuẩn bị trước                                 | Tiêu chí xác minh                                     |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Label typo                    | Sửa expression của một job sandbox/canary | Khôi phục Jenkinsfile/config revision trước             | Build vào đúng node và toolchain, queue reason hết    |
| Pool thiếu capacity           | Thêm một agent canary đã approved         | Drain/xóa agent canary theo runbook                     | Queue age giảm, host không bão hòa, job không lỗi mới |
| Input không có expiry         | Thêm timeout + message/action rõ          | Revert Jenkinsfile revision                             | Build timeout trung thực, alert/timeline đủ dữ liệu   |
| Plugin regression có evidence | Rollback một plugin trong cửa sổ bảo trì  | Quay lại version trước nếu rollback gây lỗi tương thích | Health, log, queue và canary ổn định                  |

Sau thay đổi, không chỉ nhìn build “xanh”. So sánh với baseline ít nhất: queue age/length, executor utilization, latency/error rate controller, reconnect agent và log mới trong một khoảng quan sát phù hợp. Cập nhật timeline bằng kết quả, giữ evidence, rồi quyết định đóng incident hay escalation. Nếu thay đổi làm tác động tăng hoặc tiêu chí không đạt, rollback ngay theo kế hoạch và ghi lại.

## Lab sandbox: queue và timeout có chủ đích

Lab này chỉ dành cho Jenkins sandbox tách production. Trước khi chạy, tạo hoặc kiểm tra một agent sandbox riêng mang label `troubleshooting-lab` tại `/computer/`; built-in node phải giữ `0` executor. Không chạy lab `input` nếu không có agent mang label này, và không gán label đó cho agent production. Với môi trường local, có thể thay bằng một label sandbox riêng tương đương đã kiểm tra, nhưng không dùng `any` cho lab có `input` vì nó giữ executor. Lab tạo hai failure dễ nhận biết mà không cần credential thật: label không tồn tại làm build chờ queue, và `input` có timeout làm build kết thúc rõ ràng. Dùng job riêng như `troubleshooting-lab`; không chạy trên job release.

```groovy
pipeline {
  agent none

  stages {
    stage('Queue: label không tồn tại') {
      agent { label 'lab-unavailable' }
      options { timeout(time: 2, unit: 'MINUTES') }
      steps {
        echo 'Nếu không có agent mang lab-unavailable, stage sẽ chờ trong queue.'
      }
    }
  }
}
```

1. Xác nhận sandbox không có node nào mang label `lab-unavailable`; ghi lại `/computer/` trước khi chạy.
2. Lưu Jenkinsfile vào `troubleshooting-lab` và chạy một build. Mở `/queue/` và Console Log trong lúc build chờ.
3. Kết quả mong đợi: queue reason cho biết không có node phù hợp; sau hai phút, build kết thúc `ABORTED` do timeout. Đây là timeout có chủ đích, không phải controller failure.
4. Lưu URL build, reason và timestamp vào ghi chú lab. Hủy build sớm chỉ nếu cần giải phóng sandbox; không thay đổi labels của production agent.

Để mô phỏng `input` chờ duyệt, thay stage trên bằng stage ràng buộc vào agent sandbox đã kiểm tra. Nếu `/computer/` không hiển thị agent `Online` mang label `troubleshooting-lab`, dừng lab thay vì đổi sang built-in node hoặc `any`.

```groovy
pipeline {
  agent { label 'troubleshooting-lab' }

  stages {
    stage('Input có expiry') {
      steps {
        timeout(time: 2, unit: 'MINUTES') {
          input message: 'Lab only: xác nhận bạn đã quan sát trạng thái chờ', ok: 'Tiếp tục'
        }
        echo 'Chỉ chạy khi một người đã duyệt input.'
      }
    }
  }
}
```

Kết quả mong đợi: UI hiển thị action chờ duyệt; nếu không duyệt trong hai phút, build là `ABORTED` với dấu vết timeout. Nếu duyệt, log đi đến `Chỉ chạy...`. So sánh lab này với queue lab: lab `input` đã giữ executor, còn queue lab chưa được cấp executor. Sau lab, giữ build record để học tập theo retention policy; chỉ xóa job sandbox khi owner sandbox cho phép.

## Checklist incident

- [ ] Có severity, incident owner, phạm vi và timeline UTC.
- [ ] Đã phân biệt queue trước executor với Pipeline sau executor.
- [ ] Đã ghi queue reason, labels, agent state/offline cause hoặc stage/step cuối.
- [ ] Đã thu log/metrics chỉ đọc và redact dữ liệu nhạy cảm.
- [ ] Đã kiểm tra JVM/heap/thread hoặc disk/I/O khi phạm vi là controller.
- [ ] Support Core bundle, nếu có, được lưu/chia sẻ theo chính sách và không chứa secret thô.
- [ ] Mọi thay đổi có giả thuyết, owner, rollback và tiêu chí xác minh.
- [ ] Không restart, xóa dữ liệu, tắt plugin hoặc che failure một cách mù quáng.
- [ ] Đã cập nhật timeline, kết quả xác minh và quyết định đóng/escalate.

## Nguồn Jenkins chính thức

- [Jenkins: Managing Nodes](https://www.jenkins.io/doc/book/managing/nodes/)
- [Jenkins: Using agents](https://www.jenkins.io/doc/book/using/using-agents/)
- [Jenkins Pipeline Syntax: `timeout` và `input`](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Jenkins: Managing plugins](https://www.jenkins.io/doc/book/managing/plugins/)
- [Jenkins: System Administration](https://www.jenkins.io/doc/book/system-administration/)
- [Jenkins: Scaling](https://www.jenkins.io/doc/book/scaling/)
- [Support Core plugin](https://plugins.jenkins.io/support-core/)

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn lại thành phần và luồng cơ bản." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu controller, agent, queue và executor." />
  <Card title="Labels & Executors" href="/docs/agents/labels-executors" description="Chẩn đoán routing và capacity của agent pool." />
  <Card title="Pipeline error handling" href="/docs/pipelines/error-handling" description="Thiết kế timeout, retry và failure minh bạch." />
</Cards>
