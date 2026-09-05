---
title: "Mở rộng Jenkins theo tải và topology"
description: "Thiết kế capacity, ranh giới controller và chiến lược phục hồi Jenkins khi số team, build và môi trường tăng lên."
---

Khi Jenkins lớn lên, câu hỏi không chỉ là “thêm bao nhiêu máy”. Cần phân biệt tải điều phối của controller, năng lực chạy build của agent, ranh giới giữa các team và mục tiêu phục hồi. Trang này cung cấp cách chọn topology dựa trên số đo, thay vì hứa hẹn một kiến trúc phù hợp với mọi workload.

## Mục lục

- [Khi nào cần scale](#khi-nào-cần-scale)
- [Topology và ranh giới trạng thái](#topology-và-ranh-giới-trạng-thái)
  - [Sơ đồ topology tham chiếu](#sơ-đồ-topology-tham-chiếu)
  - [Scale-up, scale-out, federation và tách tổ chức](#scale-up-scale-out-federation-và-tách-tổ-chức)
  - [HA và DR không phải scale-out](#ha-và-dr-không-phải-scale-out)
  - [Ma trận quyết định topology](#ma-trận-quyết-định-topology)
- [Lập capacity theo pool workload](#lập-capacity-theo-pool-workload)
  - [Queue, executor và labels](#queue-executor-và-labels)
  - [Controller, storage và mạng](#controller-storage-và-mạng)
  - [Rate limit và dependency bên ngoài](#rate-limit-và-dependency-bên-ngoài)
  - [Quy trình dự báo capacity](#quy-trình-dự-báo-capacity)
- [Ranh giới team và cô lập workload](#ranh-giới-team-và-cô-lập-workload)
  - [Folders và Multibranch Pipeline](#folders-và-multibranch-pipeline)
  - [Isolation không chỉ là label](#isolation-không-chỉ-là-label)
  - [Mẫu label và Pipeline agent an toàn](#mẫu-label-và-pipeline-agent-an-toàn)
- [SLO, RPO, RTO và vận hành](#slo-rpo-rto-và-vận-hành)
  - [Trade-off cần chốt trước](#trade-off-cần-chốt-trước)
  - [Ownership, governance và giả định](#ownership-governance-và-giả-định)
- [Migration và partition controller](#migration-và-partition-controller)
- [Lab mock workload cục bộ](#lab-mock-workload-cục-bộ)
  - [Chuẩn bị và chạy](#chuẩn-bị-và-chạy)
  - [Kết quả mong đợi và cleanup](#kết-quả-mong-đợi-và-cleanup)
- [Troubleshooting](#troubleshooting)
- [Checklist trước khi mở rộng](#checklist-trước-khi-mở-rộng)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

<Callout type="info" title="Nguyên tắc nền tảng">
  Jenkins controller là nơi điều phối và giữ trạng thái. Với một controller, chỉ một tiến trình được phép ghi vào `JENKINS_HOME` tại một thời điểm. Đặt built-in node ở `0` executors trong production; build chạy trên agent tách biệt.
</Callout>

## Khi nào cần scale

Scale khi SLO đã được xác định và số đo cho thấy một giới hạn lặp lại, không chỉ vì một build bất thường. Phân nhóm số liệu theo **pool label**, loại job và giờ cao điểm: queue wait p50/p95, runtime p50/p95, số executor `busy/online`, số agent offline, CPU/RAM/disk/I/O/network của agent, và HTTP/JVM/storage của controller.

Ví dụ, queue p95 của `linux && docker` tăng còn controller và pool `windows` vẫn khỏe thường là thiếu capability ở pool Docker, không phải lý do để tăng heap controller. Ngược lại, UI/API chậm, GC pause dài và I/O `JENKINS_HOME` cao có thể yêu cầu scale-up controller hoặc giảm tải metadata, dù còn executor rảnh.

Trước thay đổi, ghi baseline trong một cửa sổ đại diện gồm peak, build lớn, cache cold nếu có và retry. Đọc [Kiến trúc Jenkins](/docs/getting-started/architecture), [Labels & Executors](/docs/agents/labels-executors) và [Hiệu năng Jenkins](/docs/administration/performance) để xác định đúng điểm nghẽn.

## Topology và ranh giới trạng thái

### Sơ đồ topology tham chiếu

```text
                         Git/SCM, registry, test service
                                      │
                                      │ webhook, clone, pull/push
                                      ▼
┌───────────────┐             ┌──────────────────────────┐
│ Người dùng/API│ ──────────► │ Jenkins controller       │
└───────────────┘             │ queue, config, metadata  │
                              │ một writer JENKINS_HOME  │
                              └───────┬─────────┬────────┘
                                      │         │ backup đã kiểm chứng
                         Remoting/API │         ▼
                                      │   ┌───────────────┐
                                      │   │ Backup/offsite│
                                      │   │ restore drill │
                                      │   └───────────────┘
                    ┌─────────────────┼──────────────────┐
                    ▼                 ▼                  ▼
          ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
          │ linux-small    │ │ docker-isolated│ │ k8s ephemeral  │
          │ 1+ executors   │ │ 1 executor     │ │ quota/pod pool │
          └────────────────┘ └────────────────┘ └────────────────┘
```

Sơ đồ tách ba luồng: controller ghi state, agent chạy workload, và storage backup bảo vệ state. Artifact, console log và workspace có lifecycle riêng; không mặc định chúng đều thuộc cùng một volume hoặc cùng một chính sách retention.

### Scale-up, scale-out, federation và tách tổ chức

- **Scale-up controller** tăng CPU, RAM, IOPS hoặc network cho _một_ controller. Đây là hướng phù hợp khi controller có JVM/GC, request, thread hoặc `JENKINS_HOME` saturation đã được đo. Nó không tăng số môi trường chạy build.
- **Scale-out build agents** thêm agent tương đương hoặc agent động vào đúng pool label. Đây là cách chính để tăng throughput build. Tăng executors trên một host chỉ là tăng concurrency scheduler; nó không tạo CPU, RAM, IOPS hay băng thông mới.
- **Controller federation** là nhiều controller độc lập cùng được quản trị theo chuẩn chung, có thể dùng identity, shared library, observability và policy tương thích. Mỗi controller có queue, plugin inventory, URL và `JENKINS_HOME` riêng; federation không biến chúng thành một scheduler chia sẻ.
- **Tách theo tổ chức hoặc domain** chuyển hẳn folders/job/team sang controller khác. Cách này giảm blast radius của plugin, queue, permissions và lịch release. Đổi lại, cần vận hành nhiều lifecycle upgrade, backup, credential, agent và dashboard.

<Callout type="warn" title="Không dùng shared home để tạo active-active">
  Không mount cùng `JENKINS_HOME` cho hai controller đang hoạt động và không quảng cáo nó là HA active-active. Jenkins không cung cấp mô hình multi-writer cho home này. Một controller thay thế phải được tạo từ bản sao nhất quán và chỉ nhận ghi sau khi controller cũ đã được fencing hoặc dừng theo runbook.
</Callout>

### HA và DR không phải scale-out

**High availability (HA)** giảm thời gian gián đoạn của đường phục vụ. **Disaster recovery (DR)** khôi phục sau mất controller, volume hoặc site. Thêm agent không tự tạo HA hay DR, vì config, queue, build record và credential metadata vẫn thuộc controller.

Một thiết kế khả thi cho Jenkins là controller active đơn, backup/snapshot application-consistent, bản sao offsite, restore drill và thủ tục failover có DNS/load balancer hoặc endpoint được kiểm soát. Khi sự cố xảy ra, dừng/fence writer cũ, restore hoặc khởi động standby từ generation đã chọn, xác minh plugin/runtime và sau đó mới chuyển traffic. Điều này có RTO/RPO phải đo được; nó không phải active-active không gián đoạn.

Dùng [Backup & Restore](/docs/administration/backup-restore) để thiết kế generation, khóa và restore cô lập. [Monitoring](/docs/administration/monitoring) là nơi đặt cảnh báo cho availability, backup age, controller resource, queue và agent health.

### Ma trận quyết định topology

| Tín hiệu hoặc mục tiêu                                      | Topology ưu tiên                      | Lợi ích                                               | Trade-off và điều kiện dừng                                                                        |
| ----------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Controller CPU/heap/IOPS bão hòa, agent còn headroom        | Scale-up controller                   | Ít thay đổi routing/job; giảm latency điều phối.      | Vẫn là một fault domain và không tăng build capacity; đo GC, disk và HTTP sau thay đổi.            |
| Queue p95 chỉ cao ở một label, host/dependency còn headroom | Scale-out agent cho pool đó           | Tăng executor đúng capability, dễ cô lập toolchain.   | Kiểm tra quota, provisioning delay, registry/SCM và noisy neighbor; không chỉ nhồi executors.      |
| Team có release cadence, plugin hoặc quyền khác nhau        | Federation hoặc organization split    | Giảm blast radius, ownership rõ và lifecycle độc lập. | Tăng chi phí platform: SSO, audit, backup, upgrades, agent image và dashboard cho từng controller. |
| RTO/RPO nghiêm ngặt, nhưng chấp nhận failover               | Active đơn + DR/standby đã kiểm chứng | Bảo vệ state và định lượng được recovery.             | Cần fencing, backup nhất quán, restore drill và runbook; không có multi-writer.                    |
| Workload không tin cậy hoặc có compliance khác nhau         | Controller/pool tách riêng            | Tách identity, network, secrets và filesystem.        | Cần migration, policy và capacity riêng; label đơn thuần không đủ.                                 |

## Lập capacity theo pool workload

### Queue, executor và labels

Queue trả lời “build đang chờ điều kiện nào”; executor là slot mà Jenkins cấp khi node online, label khớp và policy cho phép. Vì vậy, đếm tổng executor toàn hệ thống là số liệu gây hiểu lầm. Một executor rảnh ở `linux-small` không giúp job yêu cầu `linux && docker && isolated`.

Phân định label thành contract có owner, ví dụ `linux`, `jdk21`, `docker`, `small`, `e2e` hoặc `release`. Contract phải mô tả capability kiểm chứng được, không phải hostname. Quan sát lý do queue trước khi scale: label không khớp, agent offline, executor bận, quota provisioning, lock/throttle, quiet period và giới hạn job đều có thể là nguyên nhân.

Đặt concurrency theo profile workload. Compile CPU-bound, browser test, Docker build và deploy thường khởi đầu với một executor trên một agent rồi tăng có kiểm soát. Một build có thể giữ CPU, RAM, cache, daemon, port, license hoặc dịch vụ test ngoài Jenkins; tăng executor khi các tài nguyên này đã bão hòa chỉ làm runtime và failure rate xấu đi.

### Controller, storage và mạng

Controller cần capacity riêng cho HTTP/UI/API, webhook burst, queue scheduling, Pipeline state, plugin listeners và ghi `JENKINS_HOME`. Theo dõi CPU, RSS/JVM heap, GC pause, thread count/state, request latency/error, free bytes/inodes và I/O latency. Tăng `-Xmx` chỉ sau khi có bằng chứng memory pressure và RAM headroom; heap quá lớn có thể kéo dài GC hoặc gây swap.

| Vùng dữ liệu          | Rủi ro khi tăng tải                                                             | Kiểm soát trước khi scale                                                              |
| --------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `JENKINS_HOME`        | Metadata, build record, Pipeline state và log làm chậm I/O hoặc đầy inode.      | Dùng persistent storage có latency đã đo, retention và backup/restore kiểm chứng.      |
| Workspace/cache agent | Checkout, dependency cache và file tạm làm cạn disk/inode hoặc tranh IOPS.      | Quota, lifecycle cleanup theo agent/job và không dọn workspace của build đang chạy.    |
| Console log           | Log quá lớn tăng truyền dữ liệu, controller I/O và thời gian đọc UI.            | Giữ marker chẩn đoán, giảm verbosity vô ích và đặt build retention.                    |
| Artifact              | Lưu tại controller làm tăng disk/backup; external store tạo latency/egress mới. | Tách artifact lớn sang backend đã phê duyệt, đặt lifecycle, IAM và đo upload/download. |

Plugin cũng là tải controller. SCM polling, fingerprinting, Pipeline CPS, listener, UI/API và plugin artifact có thể tăng thread, heap, I/O hoặc request. Luôn lập inventory Jenkins LTS, Java, plugin và image agent trước/sau thay đổi. Chỉ cài, gỡ hoặc nâng plugin sau backup, compatibility review và thử nghiệm; xem [Nâng cấp Jenkins](/docs/installation/upgrade) và [System Configuration](/docs/administration/system-configuration).

### Rate limit và dependency bên ngoài

SCM provider, container registry, artifact repository, cloud API, license server, test environment và DNS đều có capacity/rate limit độc lập. Scale agent có thể làm bùng số clone, pull image, upload artifact hoặc API calls cùng lúc; queue Jenkins giảm nhưng external error `429`, timeout hoặc egress cost lại tăng.

Ghi ngân sách cho mỗi dependency: concurrency được phép, request/phút, quota account/project, retry budget, timeout, cache và owner escalation. Giới hạn fan-out ở Pipeline, dùng webhook thay vì polling khi phù hợp, backoff có giới hạn và không retry vô hạn. Với agent động, tính cả thời gian provision, quota cluster/cloud và giới hạn image pull; xem [Kubernetes agents](/docs/agents/kubernetes-agents) trước khi coi Pod mới là capacity tức thời.

### Quy trình dự báo capacity

1. **Chọn SLI theo lớp workload.** Ví dụ, hotfix `linux-small` có queue p95 dưới 5 phút; nightly `e2e` có mục tiêu riêng. Ghi throughput, runtime p95, retry, queue age và saturation theo label.
2. **Ước lượng demand peak.** Nếu pool nhận 18 build/giờ và runtime p95 là 10 phút, tải trung bình peak xấp xỉ `18 × 10 / 60 = 3` slots. Thêm buffer cho burst, parallel/matrix, cache cold, retry và provisioning delay; đây là điểm khởi đầu, không phải sizing cuối.
3. **Kiểm tra supply end-to-end.** Đối chiếu slots với CPU/RAM/IOPS/network của agent, controller headroom và quota/rate limit của dependency. Một slot chỉ hợp lệ khi toàn bộ đường chạy chịu được tải.
4. **Thử một biến trong sandbox.** Thêm một agent _hoặc_ một executor, không cả hai. So queue p95, runtime, error rate, CPU/RAM/I/O và external errors với baseline; rollback nếu SLO xấu.
5. **Đặt trigger review.** Review khi số repo/team, fan-out, artifact size, plugin, Java, cloud quota hoặc RPO/RTO đổi. Capacity plan là tài liệu sống có owner và ngày hết hạn.

## Ranh giới team và cô lập workload

### Folders và Multibranch Pipeline

Folder là ranh giới hữu ích cho quyền, credentials theo scope, naming, retention và ownership. Ví dụ, `teams/payments`, `teams/mobile` và `platform/release` có thể có administrator, SLO queue, agent pool và review process khác nhau. Folder không tự tạo CPU hay cách ly hạ tầng; một Matrix lớn trong folder A vẫn có thể chiếm pool chung của folder B.

Multibranch Pipeline tạo job theo repository/branch và phản ánh `Jenkinsfile` từ source. Nó thuận tiện cho team tự phục vụ, nhưng số branch, scan, webhook, index và build fan-out có thể tăng nhanh. Thiết kế branch discovery, retention, trust của pull request, scan schedule và quota trước khi onboard hàng trăm repository. Đặt team boundary trước giúp quyết định controller nào sở hữu webhook, credentials, agent image và chi phí artifact.

Khi folder không còn đủ vì team cần plugin, maintenance window, compliance, network hoặc release process khác nhau, tách controller là ranh giới rõ hơn. Không dùng một plugin global hoặc quyền admin folder để thay cho isolation cần ở hạ tầng.

### Isolation không chỉ là label

Label là cơ chế scheduler, không phải ACL. Workload từ fork, code chưa tin cậy, build release có secret, Docker privileged, GPU hoặc deploy production cần pool và identity riêng. Cô lập ít nhất theo trust level, OS/toolchain, filesystem/workspace/cache, network egress, cloud account/namespace và credentials.

- Không chạy workload không tin cậy trên controller hoặc agent từng dùng secret release.
- Không chia sẻ Docker daemon, workspace hoặc cache giữa trust levels chỉ để cache nhanh hơn.
- Dành pool/limit cho hotfix để nightly hoặc Matrix không chiếm hết executor.
- Đặt timeout, giới hạn parallelism, retention và quota artifact theo class workload.
- Kiểm tra authorization ai được sửa Jenkinsfile, folder, node, cloud template và credential binding.

<Callout type="error" title="Label không tạo security boundary">
  `trusted-release` hay `sandbox` chỉ là một chuỗi routing. Chúng không ngăn người có quyền sửa job đổi expression, cũng không tách filesystem, network hay credential. Dùng authorization và isolation hạ tầng cho dữ liệu hoặc code có mức tin cậy khác nhau.
</Callout>

### Mẫu label và Pipeline agent an toàn

Mẫu dưới đây giả định một agent sandbox do platform team quản lý, `Online`, có `sh`, không có credential production và có đúng một executor. Labels là contract: `linux` là OS, `small` là pool capacity thấp, `scale-lab` là mục đích lab. Xác minh labels trên controller theo [Agents overview](/docs/agents/overview) và [Labels & Executors](/docs/agents/labels-executors), thay vì tự gán vào host production.

```groovy
pipeline {
  agent none

  options {
    timeout(time: 3, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '5', artifactNumToKeepStr: '1'))
  }

  stages {
    stage('Xác nhận pool') {
      agent { label 'linux && small && scale-lab' }
      steps {
        sh 'printf "node=%s workspace=%s\\n" "$NODE_NAME" "$WORKSPACE"'
        sh 'uname -s'
        sh 'sleep 20'
      }
    }
  }
}
```

`agent none` tránh giữ slot ngoài stage cần shell. Timeout, retention ngắn và `disableConcurrentBuilds()` giữ lab hữu hạn; chúng không phải policy mặc định cho mọi Pipeline. Mẫu không checkout source, không gọi network và không in secret. Với Pod agent, chỉ dùng template/image/namespace đã phê duyệt và quota đã đo; tài liệu [Kubernetes agents](/docs/agents/kubernetes-agents) và [Pipeline agents](/docs/pipelines/agents) mô tả lựa chọn agent theo runtime.

## SLO, RPO, RTO và vận hành

### Trade-off cần chốt trước

| Mục tiêu          | Câu hỏi vận hành                                                      | Hệ quả topology/capacity                                                                           |
| ----------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| SLO queue/runtime | Pool nào phải bắt đầu nhanh, và percentile/cửa sổ nào dùng để đo?     | Dành capacity theo label, giới hạn noisy neighbor và cảnh báo trước vi phạm.                       |
| SLO controller    | UI/API/webhook có latency/error budget nào?                           | Scale-up controller, giảm plugin/log/storage pressure hoặc partition trước khi toàn hệ thống chậm. |
| RPO               | Có thể mất tối đa bao nhiêu config, build record hoặc metadata mới?   | Quyết định tần suất backup/snapshot và phạm vi backend artifact/log.                               |
| RTO               | Bao lâu controller thay thế phải sẵn sàng, gồm restore và validation? | Quyết định standby, băng thông, plugin/runtime inventory, fencing và tần suất drill.               |

RPO thấp hơn thường cần bản sao thường xuyên hơn và chi phí storage/operational cao hơn. RTO thấp hơn thường cần automation, controller/image sẵn sàng và restore drill thường xuyên hơn. Không suy ra RPO/RTO từ việc có nhiều agent; chúng bảo vệ capacity chạy build, không bảo vệ state controller.

### Ownership, governance và giả định

Platform owner chịu trách nhiệm controller, LTS/Java, plugin catalog, backup/restore, observability, agent baseline và incident runbook. Team owner chịu trách nhiệm Jenkinsfile, label contract mà workload yêu cầu, fan-out, retention job/artifact và thông báo nhu cầu peak. Security/compliance owner phê duyệt trust boundary, credentials, network và retention. Mỗi folder/controller cần escalation path và budget rõ ràng cho quota cloud, SCM, registry và artifact storage.

Giả định của trang này: Jenkins LTS và Java nằm trong support policy tương ứng; plugin, cloud provider, artifact manager và agent runtime đã được phê duyệt; plugin/version có thể thay đổi metric, Pipeline behavior hoặc Kubernetes provisioning. Các con số executor, timeout và capacity trong ví dụ là điểm bắt đầu cho sandbox, không phải khuyến nghị vendor hay SLA. Ghi các giả định trong capacity plan để người kế nhiệm biết điều gì cần xác minh khi nâng cấp.

## Migration và partition controller

Chọn partition theo ranh giới có ý nghĩa lâu dài: team/product, compliance/trust, geographic/network domain hoặc release cadence. Tránh chia chỉ theo “job nào đang chậm” nếu các dependency, owner và lifecycle vẫn chung; bạn sẽ đổi queue bottleneck lấy chi phí vận hành cao hơn mà không giảm coupling.

Một migration có thể đảo ngược nên theo trình tự:

1. Inventory folder, Multibranch sources, Jenkinsfile/shared library, credentials binding, webhooks, agent labels, plugin dependencies, artifact/log backend, SLO và owner.
2. Tạo controller đích với Jenkins LTS, Java, plugin catalog, identity, monitoring, backup và network boundary đã được kiểm thử. Không sao chép credential value vào ticket hay repository.
3. Di chuyển một cohort nhỏ, chẳng hạn một folder sandbox. Recreate hoặc import cấu hình theo runbook, rồi xác minh labels, webhook, artifact permissions và Pipeline vô hại trên agent cô lập.
4. Chuyển trigger/source of truth theo cửa sổ đã duyệt. Tránh để hai controller cùng xử lý cùng webhook/job hoặc cùng ghi vào một home; ghi rõ controller nào sở hữu repo/folder sau cutover.
5. So SLO, error, queue, controller resource và external rate limit trong cửa sổ quan sát. Giữ phương án rollback là đổi route về controller cũ khi state/trigger ownership vẫn rõ; không trộn dữ liệu hai home để “đồng bộ nhanh”.

Dùng [Docker installation](/docs/installation/docker) hoặc [Kubernetes installation](/docs/installation/kubernetes) cho controller đích theo runtime được chọn. Trước cutover, thực hiện restore drill theo [Backup & Restore](/docs/administration/backup-restore), và chuẩn bị rollback/compatibility theo [Nâng cấp Jenkins](/docs/installation/upgrade).

## Lab mock workload cục bộ

Lab chứng minh queue do thiếu executor trong đúng pool. Nó chỉ chạy `printf`, `uname` và `sleep` trên Jenkins sandbox; không checkout repository, không dùng credential, không chạy load test thật và không thay đổi topology production.

### Chuẩn bị và chạy

1. Chuẩn bị controller sandbox cùng một agent Linux tách biệt, `Online`, labels `linux`, `small`, `scale-lab` và **một** executor. Ghi lại labels, số executor, queue và trạng thái trước lab.
2. Tạo Pipeline tạm tên `sandbox/scaling-queue` với mẫu ở phần trước. Chỉ dùng agent sandbox; built-in node production vẫn phải là `0` executors.
3. Trigger build `#1`. Khi Console Output đang ở `sleep 20`, trigger build `#2` của cùng job.
4. Mở Build Queue, Nodes và dashboard. Ghi lý do queue của `#2`, queue wait, executor `busy/online`, CPU/RAM/disk agent và controller HTTP/JVM trong khoảng lab. Không sửa labels hay executor trong lúc quan sát.
5. Sau khi hai build kết thúc, tùy chọn thêm **một agent sandbox cùng contract** hoặc thêm một executor trên sandbox, lặp lại một lần và so sánh. Đổi một biến duy nhất, rồi trả về cấu hình ban đầu.

### Kết quả mong đợi và cleanup

Với đúng một slot hợp lệ, `#1` chạy còn `#2` chờ khoảng thời gian `#1` giữ executor. CPU và disk nên gần baseline vì `sleep` không phải tải nặng. Khi có hai slots phù hợp, hai build có thể chạy đồng thời. Điều này chứng minh quan hệ giữa queue và concurrency, **không** chứng minh production cần thêm CPU hoặc executor.

Cleanup: đợi build kết thúc hoặc abort chỉ build `sandbox/scaling-queue`; xóa job lab; khôi phục số executor/agent label đúng giá trị đã ghi; xác nhận Build Queue không còn item lab. Không xóa workspace, volume, cache, artifact hoặc agent ngoài phạm vi lab. Nếu bất kỳ điều kiện sandbox không đúng, dừng lab thay vì chỉnh production để làm ví dụ chạy được.

## Troubleshooting

| Triệu chứng                         | Phân biệt nguyên nhân                                                               | Hành động an toàn                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Queue dài ở một pool                | Label không khớp, agent offline, executor bận, lock/throttle hoặc quota provision.  | Đọc lý do Build Queue và phân tích `busy/online` theo label trước khi thêm capacity.                                    |
| Queue giảm nhưng runtime/error tăng | Host agent hoặc dependency ngoài bị oversubscribe.                                  | Roll back concurrency, kiểm tra CPU/RAM/I/O/network, registry/SCM rate limit rồi thử thêm agent tách biệt.              |
| UI/API chậm dù agent rảnh           | Controller JVM, plugin, thread, HTTP burst hoặc `JENKINS_HOME` I/O.                 | So với baseline, review thay đổi LTS/Java/plugin và storage; xem [Hiệu năng Jenkins](/docs/administration/performance). |
| Agent động không xuất hiện          | Cloud/Kubernetes quota, template/image, DNS/TLS hoặc plugin provisioning lỗi.       | Kiểm tra quota và log provisioner; không đổi label để che capability chưa tồn tại.                                      |
| Failover/restore không dùng được    | Backup thiếu nhất quán, thiếu khóa, runtime/plugin lệch hoặc writer cũ chưa fenced. | Giữ controller restore cô lập, chọn generation hợp lệ và làm lại runbook; không mount shared `JENKINS_HOME`.            |
| Một team làm ảnh hưởng mọi team     | Pool, plugin, controller hoặc rate-limit dependency đang dùng chung.                | Tách pool/folder trước; đánh giá controller split khi ownership, trust hoặc lifecycle đã khác.                          |

## Checklist trước khi mở rộng

- [ ] Có baseline và SLO theo pool label: queue/runtime p50/p95, throughput, error và headroom.
- [ ] Đã phân biệt controller scale-up với agent scale-out; built-in node production là `0` executors.
- [ ] Queue được phân tích theo reason, label, executor, lock/throttle và provisioning trước khi thay đổi.
- [ ] Controller có theo dõi CPU, heap/GC, thread, HTTP, `JENKINS_HOME` bytes/inodes/I/O; agent có CPU/RAM/disk/I/O/network riêng.
- [ ] Artifact, console log, workspace/cache và build record có backend, retention, quota và owner rõ ràng.
- [ ] SCM, registry, cloud API, artifact backend và test services có quota/rate-limit, retry budget và escalation path.
- [ ] Plugin, Jenkins LTS, Java, agent image/runtime và vendor assumptions đã inventory, review compatibility và có rollback.
- [ ] Folder/Multibranch, credentials, trust level và workload isolation có owner; label không được dùng như security boundary.
- [ ] Mỗi controller có `JENKINS_HOME` riêng và một writer; không có thiết kế shared-home active-active.
- [ ] RPO/RTO, backup generation, restore drill, fencing/failover và dashboard/alert đã được kiểm chứng.
- [ ] Migration partition có cohort nhỏ, ownership trigger rõ, cửa sổ quan sát và rollback không trộn state.
- [ ] Lab chỉ chạy trong sandbox, có expected result và cleanup không destructive.

## Nguồn Jenkins chính thức

- [Scaling Jenkins](https://www.jenkins.io/doc/book/scaling/) — các giới hạn controller và hướng mở rộng.
- [Hardware Recommendations](https://www.jenkins.io/doc/book/installing/hardware-recommendations/) — nguyên tắc sizing và không chạy build trên controller.
- [Using Jenkins agents](https://www.jenkins.io/doc/book/using/using-agents/) — agent, executor, workspace và queue.
- [Managing Nodes](https://www.jenkins.io/doc/book/managing/nodes/) — labels, executors và node configuration.
- [Pipeline scalability best practices](https://www.jenkins.io/doc/book/pipeline/pipeline-best-practices/) — Pipeline, controller load và console output.
- [Backing up Jenkins](https://www.jenkins.io/doc/book/system-administration/backing-up/) — bảo vệ `JENKINS_HOME` và dữ liệu liên quan.
- [Jenkins LTS](https://www.jenkins.io/download/lts/) và [Java support policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/) — giả định runtime được hỗ trợ.

## Đọc tiếp

<Cards>
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Ôn controller, queue, executor và workspace." />
  <Card title="Cài Jenkins với Docker" href="/docs/installation/docker" description="Chuẩn bị controller theo runtime container." />
  <Card title="Cài Jenkins trên Kubernetes" href="/docs/installation/kubernetes" description="Đặt persistent storage và controller runtime trên Kubernetes." />
  <Card title="Nâng cấp Jenkins" href="/docs/installation/upgrade" description="Review compatibility và rollback trước thay đổi platform." />
  <Card title="Agents overview" href="/docs/agents/overview" description="Hiểu lifecycle và vận hành agent." />
  <Card title="Labels & Executors" href="/docs/agents/labels-executors" description="Định tuyến workload và sizing concurrency theo pool." />
  <Card title="Kubernetes agents" href="/docs/agents/kubernetes-agents" description="Provision Pod agent theo quota và template đã phê duyệt." />
  <Card title="Pipeline agents" href="/docs/pipelines/agents" description="Chọn agent theo phạm vi Pipeline hoặc stage." />
  <Card title="Backup & Restore" href="/docs/administration/backup-restore" description="Thiết kế RPO/RTO và restore drill cô lập." />
  <Card title="Monitoring" href="/docs/administration/monitoring" description="Đặt dashboard, SLI/SLO và alert có hành động." />
  <Card title="Hiệu năng Jenkins" href="/docs/administration/performance" description="Phân tích bottleneck controller, agent và storage." />
  <Card title="System Configuration" href="/docs/administration/system-configuration" description="Quản lý cấu hình platform có kiểm soát." />
</Cards>
