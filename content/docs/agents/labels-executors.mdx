---
title: "Labels & Executors"
description: "Dùng label expression để định tuyến job, sizing executor theo workload và xử lý queue starvation trong Jenkins."
---

Labels quyết định *loại môi trường* mà một job được phép dùng; executors quyết định *bao nhiêu chỗ chạy đồng thời* đang có trên môi trường đó. Phân biệt hai khái niệm này giúp tránh sửa Jenkinsfile theo cảm tính khi build nằm trong queue.

## Mục lục

- [Mô hình định tuyến](#mô-hình-định-tuyến)
- [Label expression](#label-expression)
  - [Built-in label, custom label và dynamic agent](#built-in-label-custom-label-và-dynamic-agent)
  - [Toán tử và độ ưu tiên](#toán-tử-và-độ-ưu-tiên)
  - [Kiểm tra label thật trên controller](#kiểm-tra-label-thật-trên-controller)
- [Định tuyến job đến agent](#định-tuyến-job-đến-agent)
  - [Freestyle job](#freestyle-job)
  - [Declarative Pipeline](#declarative-pipeline)
  - [Scripted Pipeline](#scripted-pipeline)
  - [Queue, executor và workspace trong lúc routing](#queue-executor-và-workspace-trong-lúc-routing)
- [Executor sizing theo workload](#executor-sizing-theo-workload)
  - [Executor không phải CPU hoặc RAM](#executor-không-phải-cpu-hoặc-ram)
  - [Chọn concurrency và capacity headroom](#chọn-concurrency-và-capacity-headroom)
  - [Giới hạn đồng thời, throttle và lock](#giới-hạn-đồng-thời-throttle-và-lock)
- [Queue starvation và noisy neighbor](#queue-starvation-và-noisy-neighbor)
  - [Dấu hiệu và cách quan sát](#dấu-hiệu-và-cách-quan-sát)
  - [Khoanh vùng và khắc phục](#khoanh-vùng-và-khắc-phục)
- [Lab sandbox: chứng minh routing và queue](#lab-sandbox-chứng-minh-routing-và-queue)
  - [Chuẩn bị](#chuẩn-bị)
  - [Chạy lab](#chạy-lab)
  - [Kết quả mong đợi](#kết-quả-mong-đợi)
- [Bảo mật: label không phải security boundary](#bảo-mật-label-không-phải-security-boundary)
- [Troubleshooting](#troubleshooting)
- [Checklist vận hành](#checklist-vận-hành)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mô hình định tuyến

Controller nhận build, đưa yêu cầu vào queue, rồi tìm một node đang `Online` thỏa label expression và có executor trống. Chỉ khi đó agent mới nhận được allocation và workspace để chạy lệnh. Vì vậy, một executor rảnh trên agent `windows` không giúp được job đang yêu cầu `linux && docker`.

```text
Job / Pipeline
      │ yêu cầu label expression
      ▼
┌─────────────────────────────┐
│ Build Queue                 │
│ controller kiểm tra:        │
│ online + label + policy +   │
│ executor trống              │
└──────────────┬──────────────┘
               │ điều kiện đều đạt
               ▼
┌─────────────────────────────┐
│ Executor trên agent phù hợp │
│        ↓                    │
│ Workspace → checkout → run  │
└─────────────────────────────┘
```

[Kiến trúc Jenkins](/docs/getting-started/architecture) giải thích controller, queue và workspace ở mức nền tảng. Trang này tập trung vào quyết định label, concurrency và cách đọc tình trạng chờ.

<Callout type="warn" title="Không chữa sai loại vấn đề">
  Đổi sang `agent any` hoặc tăng executor có thể làm build rời queue, nhưng cũng có thể chạy sai toolchain hoặc làm host quá tải. Đọc lý do queue trước, rồi sửa đúng label, agent hay capacity.
</Callout>

## Label expression

Label là thuộc tính dùng để mô tả năng lực hoặc đặc tính của node, chẳng hạn `linux`, `amd64`, `docker`, `jdk21`, `gpu` hoặc `trusted-release`. Một job yêu cầu label expression; Jenkins chỉ xét các node mà expression trả về đúng. Tên label nên là một **contract có thể kiểm tra**: agent mang `jdk21` phải thực sự có JDK 21 mà workload cần, không chỉ có một chuỗi tên đẹp.

### Built-in label, custom label và dynamic agent

Node thường có **self-label** là tên node để chọn đúng một node khi thật sự cần chẩn đoán hoặc dùng thiết bị duy nhất. Jenkins và plugin/launcher cũng có thể hiển thị các label do hệ thống cung cấp, ví dụ đặc tính hệ điều hành hoặc kiến trúc tùy cấu hình node. Không coi danh sách này là hợp đồng portable giữa mọi controller hay mọi loại agent.

**Custom label** do đội vận hành đặt, ví dụ `linux`, `docker`, `node20` hoặc `e2e`. Đây là cách tốt để mô tả toolchain và pool thay thế được. Tránh dùng tên cá nhân, tên máy đơn lẻ hoặc label quá rộng như `build` khi workload cần năng lực cụ thể; chúng làm routing khó hiểu và tạo single point of failure.

Với dynamic agent từ cloud, container hoặc Kubernetes, node có thể chỉ xuất hiện khi plugin/provisioner tạo nó. Label cần được khai báo và duy trì trong template/cấu hình provisioner; đừng giả định tên node, workspace, cache hoặc số executor của pod vừa tạo sẽ ổn định giữa các build. Nếu provisioning chậm, quota hết hoặc template không tạo được agent có label cần thiết, job vẫn chờ trong queue dù expression đúng về mặt cú pháp.

### Toán tử và độ ưu tiên

Các ví dụ sau dùng các toán tử Boolean quen thuộc. Dùng khoảng trắng quanh toán tử để expression dễ review.

| Expression | Nghĩa | Ví dụ sử dụng |
| --- | --- | --- |
| `linux && docker` | Node phải có **cả hai** label. | Build image chỉ trên pool Linux đã chuẩn bị Docker. |
| `linux || windows` | Node có ít nhất một trong hai label là đủ. | Test script đã được kiểm chứng trên cả hai hệ điều hành. |
| `!gpu` | Node không được có label `gpu`. | Tránh chiếm pool GPU cho unit test thường. |
| `linux && !gpu` | Có `linux` và không có `gpu`. | Đưa lint vào pool Linux thông thường. |
| `linux && (jdk17 || jdk21)` | Có `linux` và một trong hai JDK. | Kiểm tra tương thích trên pool đã định nghĩa rõ. |

`!` phủ định một điều kiện. `&&` yêu cầu hai vế đều đúng, còn `||` chấp nhận một vế đúng. Parentheses luôn là cách an toàn để diễn đạt ý định nhóm điều kiện. Khi không có parentheses, hãy đọc theo độ ưu tiên: `!` trước, rồi `&&`, rồi `||`. Ví dụ `linux || windows && docker` tương đương `linux || (windows && docker)`, **không phải** `(linux || windows) && docker`.

<Callout type="info" title="Expression đúng chưa đủ">
  `linux && docker` chỉ kiểm tra nhãn trên node, không kiểm tra Docker daemon đang khỏe, disk còn trống hay agent có quyền dùng registry. Hãy xác minh capability thật bằng một job sandbox trước khi gắn workload quan trọng.
</Callout>

### Kiểm tra label thật trên controller

Đừng suy ra label từ hostname, image tag hoặc file Jenkinsfile cũ. Controller là nguồn sự thật cho scheduler tại thời điểm build được xếp hàng.

1. Vào **Manage Jenkins → Nodes** và mở node mục tiêu.
2. Xác nhận node đang `Online`, đọc trường **Labels** và số executors đang cấu hình; kiểm tra self-label/tên node nếu job cố định vào một node.
3. Đối chiếu từng custom label với capability thực tế: chạy sandbox để in OS, version tool và thư mục workspace. Với dynamic agent, kiểm tra template/provisioner đã gán cùng label.
4. Mở **Build Queue** sau khi trigger để đọc lý do Jenkins trả về. Nếu queue nói không có node phù hợp, so sánh expression nguyên văn với labels đang hiện, gồm cả dấu phủ định và parentheses.

Nếu cần thay đổi cấu hình agent, xem điều kiện nền tảng tại [Yêu cầu hệ thống](/docs/getting-started/requirements) và cách cài agent phù hợp trong [cài Jenkins trên Docker](/docs/installation/docker) hoặc [cài Jenkins trên Linux](/docs/installation/linux).

## Định tuyến job đến agent

### Freestyle job

Trong cấu hình Freestyle, bật **Restrict where this project can be run** rồi điền **Label Expression**. Ví dụ `linux && node20` yêu cầu Jenkins chọn một node online có cả hai label và executor trống. Lưu job và chọn **Build Now**; trường này là yêu cầu routing của job, không phải lệnh cài Node.js.

Freestyle phù hợp khi routing được quản lý qua UI. Hãy ghi lại expression trong mô tả job hoặc configuration-as-code của tổ chức để người vận hành biết contract của pool. Nếu bỏ chọn giới hạn này, Jenkins có thể chọn bất kỳ executor khả dụng nào; chỉ làm vậy khi mọi agent có thể chạy workload một cách chủ đích.

### Declarative Pipeline

Với Declarative, đặt expression trong `agent { label '...' }`. Ví dụ dưới đây dùng `agent none` ở cấp Pipeline để chỉ giữ executor trong stage chạy lệnh. Không có secret, credential hoặc thao tác ngoài workspace.

```groovy
pipeline {
  agent none

  stages {
    stage('Kiểm tra routing') {
      agent { label 'linux && sandbox' }
      steps {
        sh 'printf "node=%s workspace=%s\\n" "$NODE_NAME" "$WORKSPACE"'
        sh 'uname -s'
      }
    }
  }
}
```

`agent` ở cấp Pipeline giữ allocation xuyên các stage dùng nó. `agent none` rồi đặt agent ở cấp stage phù hợp hơn khi các stage dùng môi trường khác nhau hoặc có thời gian chờ approval. Mỗi stage agent có thể nhận workspace khác; không truyền file chỉ bằng giả định filesystem sẽ còn đó. Xem cú pháp đầy đủ tại [Chọn agent cho Pipeline](/docs/pipelines/agents) và [Declarative Pipeline](/docs/pipelines/declarative).

### Scripted Pipeline

Với Scripted Pipeline, `node('expression')` xin executor và workspace cho phần thân block. Ví dụ sau chỉ in thông tin quan sát, nên an toàn cho sandbox Linux:

```groovy
node('linux && sandbox') {
  stage('Kiểm tra routing') {
    sh 'printf "node=%s workspace=%s\\n" "$NODE_NAME" "$WORKSPACE"'
    sh 'uname -s'
  }
}
```

Nếu không có node khớp hoặc mọi executor khớp đều bận, Pipeline chờ tại `node(...)`; đây là routing/capacity behavior, không phải lỗi cú pháp Groovy. Giữ block `node` chỉ dài bằng phần thực sự cần cùng agent và workspace. [Scripted Pipeline](/docs/pipelines/scripted) trình bày lifecycle của `node` chi tiết hơn.

### Queue, executor và workspace trong lúc routing

| Trạng thái | Jenkins đã có gì? | Điều cần hiểu |
| --- | --- | --- |
| Build trong queue | Yêu cầu job/Pipeline và label expression. | Chưa có executor, chưa chạy shell và chưa có workspace được cấp cho allocation đó. |
| Executor được cấp | Một node khớp, đang online và có slot trống. | Agent bắt đầu allocation; executor bị giữ cho phần Pipeline/node/stage tương ứng. |
| Step đang chạy | Workspace trên agent đã sẵn sàng hoặc được chọn. | Source, cache và file tạm nằm ở agent; workspace không phải nơi lưu dữ liệu nhạy cảm lâu dài. |
| Allocation kết thúc | Controller nhận trạng thái/log cần thiết. | Executor được trả về queue; workspace có thể còn hoặc bị dọn tùy loại agent và policy. |

Routing failure thường là một trong bốn nhóm: không có label khớp, agent khớp đang offline, executor của pool khớp đã đầy, hoặc policy/concurrency control đang chặn build. Queue có thể hiển thị chính xác nhóm cuối ngay cả khi bạn thấy executor nhàn rỗi ở pool khác.

## Executor sizing theo workload

### Executor không phải CPU hoặc RAM

Executor là một slot lịch của Jenkins: `2` executors cho phép node nhận tối đa hai allocation phù hợp đồng thời. Nó **không** thêm CPU core, RAM, IOPS, băng thông, Docker daemon, port, license hay toolchain. Hai build CPU-bound trên agent 2 vCPU có thể chậm hơn đáng kể khi tăng từ một lên hai executors; hai build memory-heavy còn có thể bị OOM hoặc làm host swap.

| Loại workload | Khởi điểm an toàn để đo | Lý do không tăng executor mù quáng |
| --- | --- | --- |
| Compile/test CPU-bound | 1 executor mỗi agent rồi thử tăng dần. | Process cạnh tranh CPU, cache và nhiệt độ/CPU quota. |
| Test browser, Android, Docker image | Thường 1 executor mỗi agent hoặc pool riêng. | RAM, disk, daemon, port và I/O thường là nút thắt trước CPU. |
| Lint hoặc kiểm tra metadata nhẹ | Có thể có concurrency cao hơn sau khi đo. | Dù nhẹ, checkout/dependency download có thể cùng làm nghẽn network hoặc disk. |
| Deploy, migration, thiết bị dùng chung | Giới hạn theo tài nguyên đích, không theo CPU agent. | Hai executor có thể cùng tác động một môi trường và tạo race condition. |

Đặt built-in node của controller là `0` executors trong production. Workload build, dependency và script từ SCM thuộc về agent tách biệt, không phải controller.

### Chọn concurrency và capacity headroom

Sizing bắt đầu từ dữ liệu theo **pool label**, không phải tổng số job. Trong một cửa sổ peak, đo số build đồng thời, queue time p50/p95, runtime p50/p95, CPU, RSS/heap hoặc RAM hệ thống, I/O wait, disk/inode, network, lỗi OOM và tốc độ tạo workspace. Đo riêng pool `linux && docker` và `windows`: executor nhàn rỗi ở pool này không là capacity của pool kia.

Một quy trình thực tế:

1. Bắt đầu một executor cho workload nặng hoặc chưa biết profile; cho mỗi loại agent một giới hạn concurrency rõ ràng.
2. Chạy workload đại diện trong sandbox/staging, bao gồm peak build và cache cold nếu điều đó có trong thực tế.
3. Chỉ tăng thêm một executor hoặc thêm một agent tương đương khi CPU, RAM, disk và external dependency còn **headroom** ở peak. Headroom là khoảng dự phòng để một build chậm, checkout lớn hoặc retry hữu hạn không làm tất cả build xuống cấp.
4. So sánh queue time, wall-clock time, lỗi và mức dùng tài nguyên trước/sau. Nếu queue giảm nhưng thời gian build và lỗi tăng mạnh, quay lại concurrency thấp hơn hoặc thêm agent thay vì nén thêm executor lên host cũ.

Thêm agent cùng contract label thường giúp cô lập failure và mở rộng an toàn hơn việc tăng nhiều executor trên một máy. Khi dùng [parallel](/docs/pipelines/parallel) hoặc [matrix](/docs/pipelines/matrix), tính tổng các branch/cell có thể cùng xin pool trước khi hứa hẹn thời gian hoàn tất.

### Giới hạn đồng thời, throttle và lock

Không phải build nào chờ cũng do executor. Những kiểm soát sau có thể chủ đích giữ item trong queue hoặc giữ build ở một bước:

- `disableConcurrentBuilds()` trong Declarative giới hạn các lần chạy chồng nhau của cùng Pipeline. Đây là policy hợp lý khi chúng cùng ghi vào trạng thái không thể chia sẻ.
- **Throttle Concurrent Builds Plugin** có thể giới hạn concurrency theo job, category hoặc node. Cú pháp và cách áp dụng phụ thuộc plugin/version/cấu hình controller; xác minh plugin đang cài trước khi giả định một giới hạn tồn tại.
- Step `lock` cần **Lockable Resources Plugin** và chỉ bảo vệ tài nguyên đã được khai báo, như môi trường test, thiết bị hoặc license. Đặt lock có phạm vi hẹp, timeout và cleanup; lock quá rộng có thể biến tài nguyên hiếm thành điểm nghẽn.

Các control này không thay thế isolation. Đừng tăng executors để vượt qua lock hay throttle; trước hết xác định tài nguyên nào phải tuần tự, rồi giảm thời gian giữ lock hoặc tách môi trường nếu có thể.

## Queue starvation và noisy neighbor

**Queue starvation** xảy ra khi một lớp build phải chờ quá lâu hoặc gần như không bao giờ nhận được executor phù hợp. Nó có thể do pool label quá hẹp, agent offline, provisioning không theo kịp, executor bị build dài giữ hết, hoặc policy đã giới hạn concurrency. Đây là vấn đề capacity và fairness theo pool, không đồng nghĩa Jenkins scheduler bị hỏng.

**Noisy neighbor** là workload chiếm phần lớn CPU, RAM, disk I/O, network hoặc các executor của pool chung, làm build khác chậm hoặc chờ. Ví dụ, một Matrix lớn chiếm hết `linux && docker` khiến hotfix nhỏ cùng yêu cầu label này không thể bắt đầu. Hết executor chỉ là một biểu hiện; nếu executors vẫn được cấp nhưng thời lượng mọi build tăng, host đang bị tranh chấp tài nguyên.

### Dấu hiệu và cách quan sát

Quan sát theo thời gian và theo label:

- Mở **Build Queue** để lưu lý do chờ nguyên văn, số item và tuổi item; đối chiếu với thời điểm trigger, không chỉ nhìn dashboard xanh/đỏ.
- Mở **Manage Jenkins → Nodes** để xem node `Online`/offline, labels, executors bận/rảnh và log/provisioning của dynamic agent.
- So sánh queue time p50/p95, runtime và tỷ lệ hủy/failure của từng loại job. Queue tăng riêng ở `docker` thường chỉ ra bottleneck pool đó, không phải thiếu agent toàn cục.
- Quan sát CPU, RAM, swap, disk/inode, I/O wait, network và dung lượng workspace trên agent trong lúc peak. Theo dõi controller riêng vì queue dài hoặc flow fan-out lớn cũng tạo tải điều phối.
- Kiểm tra build dài, retry, `input`, lock/throttle và thay đổi gần đây của label/template. Một executor bị giữ vì approval đặt sai cấp có thể trông giống thiếu capacity.

<Callout type="idea" title="Tạo SLO cho queue">
  Chọn mục tiêu theo loại workload, ví dụ hotfix phải bắt đầu trong vài phút còn nightly có thể chờ lâu hơn. Cảnh báo khi tuổi queue hoặc p95 queue time vượt mục tiêu của chính pool đó; tổng số executor toàn hệ thống không cho biết fairness.
</Callout>

### Khoanh vùng và khắc phục

1. **Xác định constraint.** Copy lý do trong Build Queue, expression yêu cầu, agent khớp và policy concurrency đang hiệu lực. Không đổi Jenkinsfile trước khi biết build chờ label, executor hay lock.
2. **Khôi phục capability.** Đưa agent offline trở lại sau khi điều tra, sửa label/template sai, hoặc giải quyết quota/provisioning của dynamic agent. Không gắn label để “làm xanh” nếu toolchain chưa có.
3. **Giảm thời gian giữ slot.** Đặt timeout cho command ngoài, tách stage chờ approval bằng `agent none`, giới hạn retry, dọn workspace theo policy và tránh giữ `node` bao quanh logic không cần workspace.
4. **Tách noisy neighbor.** Tạo pool/label riêng cho browser test, Docker build, GPU hoặc nightly; đặt giới hạn fan-out, throttle workload nền và dành capacity có chủ đích cho công việc ưu tiên.
5. **Mở rộng sau khi đo.** Thêm agent cùng contract hoặc tăng executor từng bước khi host và dependency còn headroom. Kiểm tra lại queue p95, runtime và saturation sau thay đổi.

## Lab sandbox: chứng minh routing và queue

### Chuẩn bị

Lab chỉ dùng `echo`, `uname` và `sleep`; không checkout, không credential, không gọi API hay môi trường production. Cần một Jenkins sandbox có agent Linux tách biệt, đang `Online`, có shell `sh`, **một** executor, và labels `linux` cùng `sandbox`. Không chạy lab trên built-in node của controller production.

Trong **Manage Jenkins → Nodes**, ghi lại tên node, labels, số executor và trạng thái trước khi bắt đầu. Tạo một Pipeline job tạm tên `routing-sandbox`; chọn **Pipeline script** và dán Jenkinsfile dưới đây.

### Chạy lab

```groovy
pipeline {
  agent none

  stages {
    stage('Giữ một executor sandbox') {
      agent { label 'linux && sandbox' }
      steps {
        sh 'printf "node=%s workspace=%s\\n" "$NODE_NAME" "$WORKSPACE"'
        sh 'uname -s'
        sh 'sleep 45'
      }
    }
  }
}
```

1. Chạy build `#1`. Khi Console Output đã in `node=` và đang ở `sleep 45`, trigger ngay build `#2` của cùng job.
2. Mở **Build Queue** và trang node. Không sửa label hoặc số executor trong lúc quan sát.
3. Đợi `#1` kết thúc, rồi xem `#2` rời queue và đọc Console Output của nó.
4. Tùy chọn, đổi tạm expression trong *bản sao job sandbox* thành `linux && does-not-exist`, trigger một build rồi đọc lý do queue. Xóa hoặc khôi phục bản sao sau lab; không dùng thay đổi này cho job thật.

### Kết quả mong đợi

| Quan sát | Kết quả đúng | Diễn giải |
| --- | --- | --- |
| Build `#1` | Chạy ngay, log in node/workspace và `Linux`. | Agent khớp label đã nhận executor và workspace. |
| Build `#2` khi `#1` sleep | Chờ trong Build Queue. | Pool phù hợp chỉ có một executor; đây là capacity queue, không phải Jenkinsfile lỗi. |
| Sau khi `#1` kết thúc | `#2` tự bắt đầu và kết thúc `SUCCESS`. | Executor được trả về rồi scheduler cấp cho item chờ. |
| Expression `does-not-exist` | Item tiếp tục chờ với lý do không có node phù hợp. | Syntax có thể hợp lệ nhưng không có capability đáp ứng routing. |

Nếu `#2` chạy đồng thời, agent có hơn một executor hoặc có thêm node mang cả hai label. Đây vẫn là kết quả hợp lệ; giảm lab về đúng một executor/pool để quan sát queue có chủ đích.

## Bảo mật: label không phải security boundary

Label chỉ là cơ chế chọn node cho scheduler. Người có quyền sửa job/Pipeline hoặc cấu hình node có thể thay đổi label, expression hoặc lệnh; vì vậy `trusted-release` không tự cấp authorization, và `untrusted` không tự ngăn code truy cập dữ liệu nhạy cảm trên host dùng chung.

Workload không tin cậy, pull request từ fork hoặc build có secret cần agent/pool cô lập thực sự: tách máy, identity, filesystem/workspace, network egress và quyền cloud theo mức tin cậy. Cấp credential tối thiểu bằng Jenkins authorization và credential policy riêng; giới hạn quyền sửa job/Jenkinsfile, quyền tạo agent và quyền cấu hình node. Với production, để built-in node có `0` executors.

<Callout type="error" title="Không đặt niềm tin vào một label">
  Không dùng label như một ACL, không đưa secret vào Jenkinsfile hoặc log, và không chạy workload không tin cậy trên agent có workspace/cache/credential của release. Isolation hạ tầng và authorization là các kiểm soát riêng bắt buộc.
</Callout>

## Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Kiểm tra và khắc phục |
| --- | --- | --- |
| Build chờ, executor ở node khác đang rảnh | Node rảnh không khớp expression. | Đọc Build Queue, so khớp toàn bộ label và parentheses; thêm đúng pool hoặc sửa contract. |
| Build chờ mãi sau khi thêm dynamic agent | Template/provisioner không tạo được agent phù hợp, quota hoặc kết nối lỗi. | Kiểm tra log provisioning, trạng thái node, label trong template và quota hạ tầng. |
| Build chạy nhưng chậm/timeout khi tăng executors | CPU, RAM, I/O, network, cache hoặc service ngoài bị tranh chấp. | Hạ concurrency, đo saturation, tách pool hoặc thêm agent sau khi xác nhận headroom. |
| Executor trống nhưng item vẫn chờ | Job-level concurrency, throttle, lock, quiet period hoặc agent offline chặn. | Đọc lý do queue và cấu hình job/plugin; không coi executor count là điều kiện duy nhất. |
| Stage sau không thấy file của stage trước | Stage agent nhận workspace/agent khác. | Checkout lại hoặc chuyển artifact bằng cơ chế phù hợp; không phụ thuộc workspace ngầm định. |
| `agent any` làm build chạy sai | Agent được chọn thiếu toolchain hoặc sai trust level. | Trả về label/image/pod contract cụ thể và xác minh capability bằng sandbox. |

## Checklist vận hành

- [ ] Mỗi label mô tả một capability có thể kiểm tra, có owner và không dựa vào hostname ngẫu nhiên.
- [ ] Expression dùng `&&`, `||`, `!` và parentheses với ý nghĩa đã review; labels thật được xác nhận trên controller.
- [ ] Freestyle dùng **Restrict where this project can be run** khi cần; Pipeline dùng `agent { label '...' }` hoặc `node('...')` đúng ngữ cảnh.
- [ ] Built-in node production có `0` executors; agent xử lý workload được tách theo toolchain và trust level.
- [ ] Capacity được đo theo pool label: queue time, runtime, CPU, RAM, disk, I/O, network và dynamic provisioning.
- [ ] Concurrency chỉ tăng khi còn headroom; parallel/matrix có giới hạn fan-out phù hợp với pool.
- [ ] Throttle, lock, timeout và retry được kiểm tra như policy có chủ đích, bao gồm plugin/version phụ thuộc.
- [ ] Noisy neighbor được tách pool hoặc giới hạn; workload ưu tiên có SLO queue và capacity dự phòng.
- [ ] Secret không có trong Jenkinsfile, console log hoặc workspace dùng chung; authorization và isolation không dựa vào label.

## Nguồn Jenkins chính thức

- [Using Jenkins agents](https://www.jenkins.io/doc/book/using/using-agents/) — agent, executor, workspace và queue.
- [Managing Nodes](https://www.jenkins.io/doc/book/managing/nodes/) — cấu hình node, executors và labels.
- [Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — `agent`, Declarative Pipeline và directive liên quan.
- [Pipeline: Nodes and Processes](https://www.jenkins.io/doc/pipeline/steps/workflow-durable-task-step/) — ngữ cảnh Pipeline `node` và process trên agent.
- [Jenkins Glossary](https://www.jenkins.io/doc/book/glossary/) — định nghĩa agent, node, executor và build queue.
- [Hardware Recommendations](https://www.jenkins.io/doc/book/installing/hardware-recommendations/) — baseline hạ tầng; luôn đo workload thật trước khi sizing.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn mô hình Jenkins trước khi thiết kế pool agent." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Xem sâu controller, queue, executor và workspace." />
  <Card title="Chọn agent cho Pipeline" href="/docs/pipelines/agents" description="Mở rộng agent, Docker và Kubernetes trong Pipeline." />
  <Card title="Parallel và Matrix" href="/docs/pipelines/parallel" description="Đặt fan-out trong giới hạn capacity đã đo." />
</Cards>
