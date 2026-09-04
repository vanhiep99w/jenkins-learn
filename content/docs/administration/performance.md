---
title: "Hiệu năng Jenkins"
description: "Đo baseline, tìm bottleneck controller hoặc agent, và cải thiện Jenkins theo thay đổi nhỏ có thể xác minh."
---

Hiệu năng Jenkins không phải một con số CPU hay số executor. Một build chậm có thể đang đợi trong queue, bị nghẽn ở controller, tranh chấp disk trên agent, hoặc chờ SCM, registry và test service bên ngoài. Tài liệu này hướng dẫn biến triệu chứng đó thành số đo, giả thuyết và thay đổi có thể đảo ngược.

<Callout type="info" title="Nguyên tắc an toàn">
  Dùng Jenkins LTS, Java được LTS đó hỗ trợ và plugin đã được phê duyệt. Tên metric, hành vi Pipeline durability và tác động plugin thay đổi theo core/plugin/version; xác minh trên sandbox của chính bạn trước khi áp dụng cấu hình hay ngưỡng ở production.
</Callout>

## Mục lục

- [Mục tiêu và mô hình hiệu năng](#mục-tiêu-và-mô-hình-hiệu-năng)
  - [Luồng và ranh giới bottleneck](#luồng-và-ranh-giới-bottleneck)
- [Lập baseline và SLI](#lập-baseline-và-sli)
  - [Các chỉ số cần ghi](#các-chỉ-số-cần-ghi)
  - [Dashboard và query khởi điểm](#dashboard-và-query-khởi-điểm)
- [Phân tích bottleneck](#phân-tích-bottleneck)
  - [Controller: điều phối, JVM và storage](#controller-điều-phối-jvm-và-storage)
  - [Agent và build: executor, workspace và mạng](#agent-và-build-executor-workspace-và-mạng)
  - [Pipeline, log và plugin](#pipeline-log-và-plugin)
- [Tuning theo vòng lặp an toàn](#tuning-theo-vòng-lặp-an-toàn)
  - [Các thay đổi thường có ích](#các-thay-đổi-thường-có-ích)
  - [Thay đổi cần tránh](#thay-đổi-cần-tránh)
- [Dữ liệu build và retention](#dữ-liệu-build-và-retention)
- [Capacity planning](#capacity-planning)
- [Lab sandbox với mock workload](#lab-sandbox-với-mock-workload)
  - [Chuẩn bị và chạy](#chuẩn-bị-và-chạy)
  - [Kết quả mong đợi và cleanup](#kết-quả-mong-đợi-và-cleanup)
- [Troubleshooting](#troubleshooting)
- [Checklist vận hành](#checklist-vận-hành)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mục tiêu và mô hình hiệu năng

Sau bài này, bạn có thể đặt baseline cho dịch vụ CI, phân biệt nơi chậm, và thực hiện một thay đổi nhỏ với tiêu chí thành công cùng rollback rõ ràng. Đọc [Kiến trúc Jenkins](/docs/getting-started/architecture) trước nếu controller, queue, executor và workspace còn mới.

### Luồng và ranh giới bottleneck

```text
Trigger ──► Controller ──► Build Queue ──► Agent/executor ──► Build, test, publish
                │                │                  │                    │
                │                │                  │                    └─ SCM, registry,
                │                │                  │                       artifact store, network
                │                │                  │
                │                │                  └─ CPU, RAM, disk I/O, workspace, cache
                │                └─ queue wait, label, lock, provisioning
                └─ HTTP/UI, scheduling, JVM heap/GC/threads, JENKINS_HOME I/O
```

**Controller bottleneck** xuất hiện khi UI/API chậm, queue được xử lý chậm, JVM có GC pause dài, thread bị chặn hoặc filesystem `JENKINS_HOME` chậm. Controller điều phối và giữ metadata; nó không phải nơi chạy build production. Đặt built-in node là `0` executors để không để workload cạnh tranh trực tiếp với controller.

**Agent/build bottleneck** xuất hiện khi queue chỉ tăng ở một pool label, executor bận, workspace đầy, I/O wait cao, cache cold, hoặc một stage chờ dịch vụ ngoài. Executor rảnh ở `windows` không giúp Pipeline cần `linux && docker`. Cách đọc labels, queue và executor theo pool nằm trong [Labels & Executors](/docs/agents/labels-executors).

<Callout type="warn" title="Queue dài không tự chứng minh controller chậm">
  Trước khi restart hay tăng capacity, đọc lý do trong Build Queue và phân tách theo label. Lock, throttle, agent offline, quota dynamic agent và label không khớp đều có thể tạo queue dài dù controller vẫn khỏe.
</Callout>

## Lập baseline và SLI

Baseline là ảnh chụp **hành vi bình thường** trong một cửa sổ đại diện, ví dụ hai tuần có giờ cao điểm, cache warm/cold và loại workload rõ ràng. Đừng trộn hotfix nhỏ với nightly integration lớn. Gắn mỗi số đo với controller, pool label, job class và phiên bản Jenkins/plugin để so sánh sau thay đổi có ý nghĩa.

SLI (service level indicator) là phép đo outcome; SLO là mục tiêu được đội chịu trách nhiệm đồng thuận. Ví dụ: “p95 queue wait của `hotfix-linux` dưới 5 phút trong 28 ngày” có ích hơn “queue phải bằng 0”. Nó mô tả pool, percentile và cửa sổ đo.

### Các chỉ số cần ghi

| Lớp           | SLI / tín hiệu baseline                                                        | Câu hỏi nó trả lời                                                       |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Throughput    | Số build hoàn tất thành công/thất bại mỗi giờ; số stage hoặc artifact publish  | Hệ thống hoàn tất được bao nhiêu công việc, không chỉ bắt đầu bao nhiêu? |
| Latency       | Queue wait và runtime p50/p95; latency UI/API tại proxy                        | Người dùng chờ bao lâu trước khi build bắt đầu và hoàn tất?              |
| Queue         | Queue length, tuổi item, lý do chờ, phân nhóm label/priority                   | Thiếu capability, executor hay bị policy chặn?                           |
| Executor      | `busy / online`, concurrency thật và thời gian giữ slot                        | Saturation có nằm ở đúng pool cần chạy workload không?                   |
| Controller    | CPU, RSS/JVM heap used/max, GC pause/count, thread state, HTTP error/latency   | Điều phối có bị CPU, memory, thread hay request pressure làm chậm?       |
| Storage       | Free bytes/inodes và latency/I/O wait của `JENKINS_HOME`, workspace, cache     | Metadata, log, checkout hoặc artifact có bị storage làm nghẽn?           |
| Agent/network | CPU, RAM/swap, disk/I/O, agent online, Remoting reconnect, DNS/TLS/SCM latency | Lệnh build chậm do host, kết nối hay dependency ngoài Jenkins?           |

Theo dõi metrics và dashboard theo hướng dẫn [Monitoring & Metrics](/docs/administration/monitoring); log controller, agent và Console Output cần được đối chiếu theo thời điểm tại [Logs & Diagnostics](/docs/administration/logs). Metrics chỉ cho biết **cái gì** xấu đi; log và build URL giúp tìm **vì sao**.

### Dashboard và query khởi điểm

Một dashboard vận hành tối thiểu có hàng controller (availability, HTTP, heap/GC, threads, `JENKINS_HOME`), hàng queue/executor theo pool, hàng agent (online, CPU/RAM/disk/I/O) và hàng Pipeline (queue wait, runtime, result, stage chậm). Dashboard cần cho drill-down từ pool sang Nodes, Build Queue và build URL; không dùng một tổng số executor toàn hệ thống làm capacity.

Query sau là điểm bắt đầu **minh họa** cho Prometheus Metrics Plugin với namespace `ci`. Xem `/prometheus/` của instance sandbox để xác nhận tên metric và labels trước; không sao chép query hoặc threshold vào production nếu metric không tồn tại.

```promql
# Saturation executor trên từng pool nếu collector có label pool.
sum by (pool) (ci_jenkins_executors_busy)
/ clamp_min(sum by (pool) (ci_jenkins_executors_online), 1)

# Queue hiện tại; lọc pool/label theo labels thực tế của exporter.
sum by (pool) (ci_jenkins_executors_queue_length)

# Tốc độ build hoàn tất trong 15 phút, chỉ hợp lệ khi counter này có trên instance.
sum(increase(ci_jenkins_builds_successful_build_count[15m]))
```

Ghi tên query, interval scrape, label filters và nguồn dữ liệu cùng baseline. Đối với queue wait và runtime không có metric chuẩn phù hợp, dùng dữ liệu build đã chuẩn hóa hoặc dashboard plugin được phê duyệt; không bịa metric để làm dashboard trông đầy đủ.

## Phân tích bottleneck

Bắt đầu từ thay đổi so với baseline: queue p95 tăng nhưng runtime giữ nguyên là dấu hiệu scheduling/capacity; runtime tăng trong khi queue ổn định thường nằm ở agent, Pipeline hay dependency. Cùng lúc kiểm tra một thay đổi gần đây về Jenkins LTS, Java, plugin, image agent, SCM hoặc artifact storage.

### Controller: điều phối, JVM và storage

| Triệu chứng                        | Bằng chứng cần so sánh                                                         | Hướng điều tra an toàn                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| UI/API chậm và queue cập nhật muộn | Proxy latency/error, CPU, runnable/blocked threads, queue age                  | Kiểm tra request burst, plugin/thay đổi gần đây và log controller; không kết luận từ CPU một thời điểm. |
| Heap cao sau GC hoặc GC pause tăng | Heap used/max theo thời gian, old generation, allocation/GC pause, OOM/restart | Xác nhận Java/Jenkins LTS support matrix, plugin compatibility và leak đã biết trước khi đổi JVM flags. |
| `JENKINS_HOME` chậm/gần đầy        | Free bytes, inodes, I/O latency/iowait, số build/log/artifact                  | Kiểm tra retention, backup task, filesystem/volume và scan trước khi tăng disk.                         |
| Thread tăng hoặc bị block          | Thread count/state, stack trace hẹp, thời điểm cùng slow request               | Liên hệ thread với I/O, plugin hay lock; chỉ thu dump theo incident process.                            |

JVM heap là vùng nhớ Java, không phải dung lượng disk. Tăng `-Xmx` chỉ hợp lý khi số đo cho thấy memory pressure và host vẫn còn RAM headroom. Heap quá lớn có thể tăng thời gian GC; heap vượt RAM có thể dẫn đến swap/OOM. Chỉ dùng JVM options đã được Java và Jenkins LTS hiện tại hỗ trợ, lưu cấu hình cũ để rollback và thay đổi trong sandbox trước.

Thread dump hoặc heap dump có thể chứa URL, tên job, tham số, environment, đường dẫn và đôi khi dữ liệu nhạy cảm do plugin giữ trong bộ nhớ. Thu thập ở phạm vi tối thiểu, chỉ khi owner đã phê duyệt, lưu mã hóa với ACL hẹp và review/redact trước khi chia sẻ. Không dán dump vào ticket công khai hay console log. Xem [Logs & Diagnostics](/docs/administration/logs) để xử lý diagnostic bundle và log theo quy trình an toàn.

### Agent và build: executor, workspace và mạng

Nếu controller ổn định nhưng runtime stage tăng, mở Console Output của vài build đại diện và đối chiếu node, workspace, CPU/RAM, I/O wait, free inodes, cache hit/miss và network. Một executor chỉ là slot scheduler; nó không thêm CPU core, RAM, IOPS, Docker daemon, port hay license.

- **Queue wait cao, executor bận:** kiểm tra pool label, build dài, fan-out và policy lock/throttle. Thêm agent tương đương thường cô lập tốt hơn nhồi nhiều executor lên một host.
- **Runtime tăng khi tăng concurrency:** CPU throttling, RAM pressure/swap, disk I/O hoặc network/registry có thể đang tranh chấp. Hạ concurrency và đo lại từng tài nguyên.
- **Workspace/cache đầy hoặc checkout chậm:** đo dung lượng/inodes và I/O trên agent; xóa dữ liệu theo retention đã phê duyệt, không xóa workspace đang chạy.
- **Agent offline/reconnect:** so log agent, controller Remoting, DNS/TLS và network loss theo timestamp. Restart controller không sửa quota cloud, image agent hay route mạng.

Đặt agent ở cấp Pipeline hoặc stage một cách có chủ đích. [Chọn agent cho Pipeline](/docs/pipelines/agents) giải thích allocation/workspace; [Parallel và Matrix](/docs/pipelines/parallel) giúp ước lượng fan-out trước khi một commit xin hàng chục executor cùng lúc.

### Pipeline, log và plugin

Pipeline CPS (Continuation Passing Style) lưu trạng thái để Pipeline có thể tiếp tục sau restart. CPS có chi phí trên controller, đặc biệt khi script Groovy thao tác collection lớn, lặp hàng nghìn bước nhỏ, giữ object lớn hoặc tạo fan-out quá rộng. Giữ logic nặng trong tool trên agent, chia stage hợp lý, và tránh biến Jenkinsfile thành bộ xử lý dữ liệu lớn.

**Pipeline durability** quyết định mức độ thường xuyên Pipeline lưu checkpoint và độ chịu lỗi khi controller bị gián đoạn. Durability cao hơn có thể tăng I/O/controller overhead; durability thấp hơn có thể mất nhiều tiến trình hơn khi sự cố. Chọn preset theo mức quan trọng và recovery objective của workload, xác minh tên/ý nghĩa setting trên Jenkins LTS và Pipeline: Job plugin đang dùng, rồi thử restart simulation chỉ trong sandbox. Không đổi durability toàn cục để chữa một build chậm mà không có bằng chứng.

Large Console Output cũng là tải I/O, truyền dữ liệu và lưu metadata. Không in dependency tree, môi trường, payload API hay từng dòng progress vô ích. Giữ log đủ để điều tra lỗi, dùng mức log tool phù hợp và phát hiện dòng lặp. Không “tối ưu” bằng cách che lỗi hoặc tắt log cần cho audit.

Plugin có thể thêm listeners, UI/API calls, SCM polling, fingerprinting hay Pipeline step. Khi latency thay đổi gần thời điểm cài/nâng plugin, lập danh sách core, Java, plugin và dependency versions; đọc release notes, yêu cầu core và advisory. Nâng hoặc gỡ plugin chỉ sau backup/rollback plan và kiểm thử sandbox. Lập kế hoạch nâng cấp theo [Nâng cấp Jenkins](/docs/installation/upgrade), không dùng bản Java mới hoặc plugin mới ngoài compatibility range của Jenkins LTS.

## Tuning theo vòng lặp an toàn

Mọi tuning nên đi theo cùng một thứ tự để một cải thiện cục bộ không tạo regression khó truy vết:

1. **Đo:** chốt baseline, scope controller/pool/job và SLI success criteria. Giữ bản sao dashboard/query, thời gian và phiên bản.
2. **Đặt giả thuyết:** ví dụ “pool `linux-docker` bão hòa; queue p95 tăng vì hai build image cùng tranh disk”, không phải “Jenkins cần nhiều executor”.
3. **Thay đổi nhỏ:** chỉ đổi một biến có thể đảo ngược, chẳng hạn thêm một agent cùng label hoặc giảm log của một tool.
4. **Load test/sandbox:** chạy workload đại diện, bao gồm concurrency và cache state có liên quan. Không benchmark trên production hay dùng build release làm test.
5. **Verify hoặc rollback:** so p50/p95, throughput, error rate và CPU/RAM/I/O trước/sau trong cửa sổ đủ dài. Roll back ngay nếu SLI xấu hơn, lỗi tăng hoặc headroom biến mất; ghi kết quả kể cả khi giả thuyết sai.

### Các thay đổi thường có ích

| Phát hiện đã có bằng chứng                     | Thay đổi nhỏ có thể thử                                                           | Xác minh và rollback                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Một pool đúng label bão hòa, host còn headroom | Thêm một agent cùng toolchain/label hoặc thêm một executor duy nhất trong sandbox | Queue p95 giảm mà runtime/error/resource không xấu; xóa agent mới hoặc trả executor cũ nếu không đạt. |
| Stage giữ executor trong lúc chờ approval      | Dùng `agent none` ở phạm vi chờ, chỉ xin agent khi chạy lệnh                      | Executor hold time giảm; khôi phục Jenkinsfile nếu workspace contract bị ảnh hưởng.                   |
| Workspace/cache tăng vô hạn                    | Áp dụng retention/dọn dẹp có lịch trên dữ liệu không còn dùng                     | Free bytes/inodes và checkout giữ ổn định; dừng policy mới nếu xóa nhầm dữ liệu cần giữ.              |
| Console Output cực lớn                         | Giảm verbosity của tool ở job sandbox, giữ marker lỗi cần thiết                   | Log volume/I/O giảm mà chẩn đoán vẫn đủ; trả level cũ nếu mất dữ kiện.                                |
| Controller I/O tăng do dữ liệu build           | Điều chỉnh retention/fingerprint/scan đã xác minh trên một folder sandbox         | Thời gian scan và I/O giảm, restore/audit vẫn đáp ứng policy; khôi phục setting trước.                |

### Thay đổi cần tránh

- Không tăng executors chỉ vì queue dài. Xác định label, lock, CPU/RAM, disk I/O và external dependency trước.
- Không tăng heap để che memory leak, GC issue hay swap; không sao chép JVM flags từ Internet hoặc từ Java khác version.
- Không cài, gỡ hay nâng plugin trực tiếp trên production để thử hiệu năng. Plugin/version mới có thể đổi serialization, metrics hoặc compatibility.
- Không restart controller để giải quyết agent offline, storage đầy hay registry chậm. Tạo backup và kiểm tra quy trình [Backup & Restore](/docs/administration/backup-restore) trước thay đổi có rủi ro dữ liệu.

## Dữ liệu build và retention

`JENKINS_HOME` thường giữ cấu hình, build records, Pipeline state, Console Output và metadata. Agent giữ source checkout, workspace và cache. Artifact có thể ở controller filesystem, object store hoặc repository manager. Phân biệt nơi lưu giúp tránh “dọn disk Jenkins” nhưng lại xóa sai loại dữ liệu.

| Dữ liệu                    | Rủi ro hiệu năng                               | Hướng kiểm soát                                                                                         |
| -------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Workspace/cache trên agent | Cạn bytes/inodes, scan/chown chậm, cache stale | Có quota và cleanup theo job/agent lifecycle; không dọn workspace của build đang chạy.                  |
| Console log/Pipeline state | Tăng I/O, lưu trữ và tải đọc UI                | Tránh log quá lớn; chọn durability theo recovery requirement đã kiểm thử.                               |
| Artifact                   | Chiếm controller disk, upload/download chậm    | Đặt retention và chuyển artifact lớn/phục vụ lâu dài sang external artifact storage đã kiểm soát quyền. |
| Fingerprint                | Scan file lớn, metadata tăng theo build        | Chỉ fingerprint artifact cần truy vết; không fingerprint toàn bộ tree/dependency cache.                 |
| Build retention            | History, log và metadata tăng vô hạn           | Dùng build discarder/retention theo loại job, nhu cầu audit và năng lực backup/restore.                 |

External artifact storage giảm áp lực disk controller nhưng không miễn phí: đo upload/download latency, error rate, egress, lifecycle policy và quyền đọc/ghi. Không cấu hình scan toàn bộ bucket/repository hoặc retention ngắn hơn nghĩa vụ audit chỉ để dashboard xanh. Sau mọi thay đổi retention, xác minh artifact/build cần thiết còn truy cập được và backup/restore vẫn khả thi.

## Capacity planning

Capacity planning dùng baseline để dự đoán peak, không phải phản ứng sau khi SLO đã vỡ. Với từng pool, ghi arrivals theo giờ, queue wait p95, runtime p95, concurrency, CPU/RAM/I/O/network headroom, provisioning delay và giới hạn bên ngoài như registry, license hoặc quota cloud.

Một phép ước lượng thô: nếu một pool nhận 12 build/giờ và runtime p95 là 10 phút, workload có thể yêu cầu khoảng `12 × 10 / 60 = 2` executor-phút/phút ở peak trung bình. Đây **không** phải sizing cuối cùng: burst, retry, fan-out, cache cold và headroom làm nhu cầu cao hơn. Xác minh bằng load test đại diện, rồi đặt trigger cảnh báo trước khi queue p95 vi phạm SLO.

Plan gồm capacity thường trực cho workload quan trọng, buffer cho peak, quota/provisioning có kiểm thử cho agent động, và ngày review khi số job, kích thước artifact hay fan-out thay đổi. Scale controller và storage theo số liệu riêng; thêm agent không làm `JENKINS_HOME` nhanh hơn.

## Lab sandbox với mock workload

Lab này kiểm tra mối quan hệ giữa executor saturation và queue. Cần controller sandbox, một agent Linux tách biệt có labels `linux` và `perf-lab`, đúng **một** executor, và không có credential/repository thật. Không chạy trên built-in node production.

### Chuẩn bị và chạy

1. Ghi baseline trước lab: trạng thái agent, số executor, queue trống, CPU/RAM/disk/inodes. Tạo Pipeline tạm `sandbox/performance-queue` với Jenkinsfile sau.

```groovy
pipeline {
  agent none

  stages {
    stage('Mock CPU-light workload') {
      agent { label 'linux && perf-lab' }
      steps {
        sh 'printf "build=%s node=%s\\n" "$BUILD_NUMBER" "$NODE_NAME"'
        sh 'sleep 60'
      }
    }
  }
}
```

2. Trigger build `#1`. Khi Console Output hiển thị `sleep 60`, trigger build `#2` của cùng job.
3. Trong 60 giây đó, mở Build Queue, Nodes và dashboard agent. Ghi queue wait của `#2`, executor busy/online, CPU và disk; không đổi executor hay label trong khi quan sát.
4. Khi cả hai build hoàn thành, chỉ trên sandbox, có thể thêm **một** executor hoặc một agent cùng label và lặp lại một lần. So sánh đúng các số đã ghi, rồi trả cấu hình về trạng thái ban đầu.

### Kết quả mong đợi và cleanup

Với một executor duy nhất, `#1` chạy còn `#2` chờ trong queue khoảng thời gian `#1` giữ slot; CPU và disk hầu như không tăng vì workload chỉ `sleep`. Điều đó chứng minh queue có thể do concurrency, không chứng minh host cần thêm CPU. Khi có hai slots hợp lệ, hai build có thể chạy song song; vẫn phải kiểm tra resource của workload thật trước khi giữ thay đổi.

Cleanup: đợi các build kết thúc hoặc abort **chỉ các build lab** nếu cần; xóa job `sandbox/performance-queue`, trả số executor/agent label về giá trị đã ghi và xác nhận queue không còn item lab. Không lưu Console Output hoặc dashboard export có metadata nội bộ ở nơi công khai.

<Callout type="idea" title="Mở rộng lab đúng cách">
  Sau lab `sleep`, thay bằng workload đại diện nhưng vô hại trên sandbox: checkout repository mẫu nội bộ đã được phép, test nhỏ và artifact giả. Tăng một biến mỗi lần (concurrency, cache cold hoặc kích thước artifact), đồng thời đặt timeout và cleanup để thử nghiệm không chiếm pool vô hạn.
</Callout>

## Troubleshooting

| Triệu chứng                       | Phân biệt nguyên nhân                                                     | Hành động an toàn                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Queue p95 tăng, runtime ổn định   | Label/pool thiếu capacity, agent offline, lock/throttle hoặc provisioning | Đọc queue reason, trạng thái agent và executor theo pool; khôi phục capability trước khi scale.    |
| Queue ổn định, runtime p95 tăng   | Agent CPU/RAM/I/O, workspace/cache, SCM/registry/test service             | So stage timing với host/network và Console Output; thử một thay đổi ở sandbox.                    |
| UI chậm, GC pause hoặc heap cao   | Controller JVM, thread/I/O contention, plugin hoặc `JENKINS_HOME`         | So baseline JVM/HTTP/storage, review version/change gần đây; dump theo quy trình riêng tư nếu cần. |
| Disk đầy nhanh                    | Large logs, build/artifact retention, workspace/cache, fingerprints       | Xác định filesystem owner; áp dụng retention có review, không xóa dữ liệu đang chạy.               |
| Tăng executors làm build chậm/lỗi | Oversubscription CPU/RAM/I/O hoặc dependency chung bị nghẽn               | Roll back concurrency, tách pool hoặc thêm agent sau khi đo headroom.                              |
| Sau upgrade metric/behavior đổi   | Jenkins LTS, Java hoặc plugin compatibility thay đổi                      | Đối chiếu release notes, plugin requirements và sandbox baseline; có kế hoạch rollback đã thử.     |

## Checklist vận hành

- [ ] Baseline có window, controller, pool label, job class, Jenkins/Java/plugin versions và SLI p50/p95 rõ ràng.
- [ ] Dashboard tách controller, queue/executor, agent, Pipeline và storage; metric/query đã xác minh từ instance thật.
- [ ] Queue được điều tra bằng lý do chờ, label, lock/throttle và provisioning trước khi tăng executor.
- [ ] Controller có theo dõi HTTP, CPU, JVM heap/GC/thread và `JENKINS_HOME` bytes/inodes/I/O; agent có CPU/RAM/disk/I/O/network riêng.
- [ ] CPS, durability, large log và plugin impact được xem xét khi controller hoặc Pipeline chậm.
- [ ] Workspace, artifact, fingerprint và build retention có owner, quota/lifecycle và kiểm thử restore phù hợp.
- [ ] Mọi tuning theo đo → giả thuyết → thay đổi nhỏ → sandbox/load test → verify hoặc rollback.
- [ ] Heap, executor, Java/Jenkins LTS và plugin change không được tăng/nâng mù; compatibility và rollback đã được review.
- [ ] Thread/heap dump, metrics export và logs được xem là dữ liệu nhạy cảm, có access control và retention ngắn.
- [ ] Capacity plan có peak, headroom, fan-out, dependency ngoài và provisioning/quota; lab đã được cleanup.

## Nguồn Jenkins chính thức

- [Jenkins Hardware Recommendations](https://www.jenkins.io/doc/book/installing/hardware-recommendations/) — nguyên tắc sizing và khuyến nghị không chạy build trên controller.
- [Scaling Jenkins](https://www.jenkins.io/doc/book/scaling/) — controller, agent và các giới hạn khi mở rộng.
- [Managing Nodes](https://www.jenkins.io/doc/book/managing/nodes/) — agent, labels và executor.
- [Pipeline Scalability Best Practice](https://www.jenkins.io/doc/book/pipeline/pipeline-best-practices/) — CPS, Pipeline code và large logs.
- [Pipeline Durability Settings](https://www.jenkins.io/doc/book/pipeline/scaling-pipeline/) — durability và trade-off checkpoint.
- [Pipeline Syntax: `buildDiscarder`](https://www.jenkins.io/doc/book/pipeline/syntax/#options) — đặt retention theo Pipeline và xác minh hành vi trên instance.
- [Jenkins Backup](https://www.jenkins.io/doc/book/system-administration/backing-up/) — bảo vệ và khôi phục `JENKINS_HOME`.
- [Jenkins LTS](https://www.jenkins.io/download/lts/) và [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/) — chọn core/Java được hỗ trợ.

## Đọc tiếp

<Cards>
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Ôn controller, queue, executor và workspace trước khi đo bottleneck." />
  <Card title="Tổng quan Pipeline" href="/docs/pipelines/overview" description="Hiểu Pipeline và các điểm tạo tải trên controller/agent." />
  <Card title="Parallel và Matrix" href="/docs/pipelines/parallel" description="Kiểm soát fan-out để không vượt capacity của pool." />
  <Card title="Monitoring & Metrics" href="/docs/administration/monitoring" description="Thiết kế metrics, dashboard, SLI/SLO và alert có hành động." />
  <Card title="Logs & Diagnostics" href="/docs/administration/logs" description="Thu thập log và diagnostic theo phạm vi, quyền và retention an toàn." />
  <Card title="Backup & Restore" href="/docs/administration/backup-restore" description="Xác minh phục hồi trước thay đổi ảnh hưởng dữ liệu Jenkins." />
</Cards>
