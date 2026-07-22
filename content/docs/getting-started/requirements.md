---
title: "Yêu cầu hệ thống"
description: "Chuẩn bị Java, CPU, RAM, storage, DNS, network và capacity ban đầu cho Jenkins controller và agent."
---

# Yêu cầu hệ thống

## Mục lục

- [Mục tiêu](#mục-tiêu)
- [1. Chọn Jenkins LTS và Java](#1-chọn-jenkins-lts-và-java)
- [2. Yêu cầu CPU và RAM](#2-yêu-cầu-cpu-và-ram)
- [3. Storage và JENKINS_HOME](#3-storage-và-jenkins_home)
- [4. Network, DNS và TLS](#4-network-dns-và-tls)
- [5. Yêu cầu cho agent](#5-yêu-cầu-cho-agent)
- [6. Capacity planning ban đầu](#6-capacity-planning-ban-đầu)
- [7. Kiểm tra môi trường trước khi cài](#7-kiểm-tra-môi-trường-trước-khi-cài)
- [8. Baseline theo môi trường](#8-baseline-theo-môi-trường)
- [Checklist sẵn sàng](#checklist-sẵn-sàng)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Mục tiêu

Sau bài này, bạn có thể:

- chọn Java runtime tương thích với Jenkins release;
- ước lượng CPU, RAM và disk cho controller/agent;
- xác định các network flow cần mở;
- chuẩn bị `JENKINS_HOME`, DNS, TLS và backup;
- chạy preflight check trước khi cài Jenkins;
- ghi lại giả định capacity để điều chỉnh bằng metric thực tế.

---

## 1. Chọn Jenkins LTS và Java

Jenkins cần Java để chạy controller, agent và một số client. Phiên bản Java được hỗ trợ thay đổi theo Jenkins release, vì vậy phải kiểm tra **cặp Jenkins–Java** trước khi cài hoặc nâng cấp.

### 1.1 Baseline khuyến nghị

Đối với cài đặt mới trong năm 2026:

- ưu tiên **Jenkins LTS** thay vì weekly nếu không cần feature mới nhất;
- dùng **Java 21 LTS** làm baseline tương thích rộng;
- chỉ chọn Java 25 khi Jenkins LTS và toàn bộ plugin quan trọng đã được kiểm thử với Java 25;
- kiểm tra lại [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/) tại thời điểm triển khai.

Theo chính sách Java chính thức:

| Dòng Jenkins | Java runtime được hỗ trợ |
|---|---|
| LTS từ `2.555.1` | Java 21 hoặc Java 25 |
| LTS từ `2.541.1` đến trước `2.555.1` | Java 17, Java 21 hoặc Java 25 |
| LTS từ `2.479.1` đến trước `2.541.1` | Java 17 hoặc Java 21 |

Bảng trên giúp lập kế hoạch nâng cấp, không thay thế việc đọc release notes. Một plugin có thể có yêu cầu chặt hơn Jenkins core.

<Callout type="warn" title="Java runtime và JDK build là hai việc khác nhau">Java chạy Jenkins controller/agent không bắt buộc phải là JDK dùng để build ứng dụng. Ví dụ controller chạy Java 21 nhưng Pipeline vẫn có thể build dự án bằng JDK khác trên agent, miễn tool/plugin liên quan hỗ trợ.</Callout>

### 1.2 Kiểm tra Java

```bash
java -version
```

Ví dụ output cần xác nhận:

```text
openjdk version "21.x.x" ...
OpenJDK Runtime Environment ...
OpenJDK 64-Bit Server VM ...
```

Ngoài major version, kiểm tra:

- kiến trúc CPU (`x86_64`, `aarch64`);
- Java đến từ distribution/vendor được tổ chức hỗ trợ;
- `JAVA_HOME` trỏ đúng runtime nếu service yêu cầu;
- controller và agent process dùng version đã dự kiến, không chỉ terminal của user quản trị.

### 1.3 Không nâng Jenkins và Java mù quáng cùng lúc

Với production:

1. đọc Jenkins upgrade guide và Java support policy;
2. backup `JENKINS_HOME` và kiểm thử restore;
3. clone/stage môi trường đại diện;
4. nâng Java hoặc Jenkins theo kế hoạch có điểm rollback;
5. kiểm thử plugin, agent connection và job quan trọng;
6. chỉ sau đó mới triển khai production.

---

## 2. Yêu cầu CPU và RAM

Tài liệu cài Jenkins trên Linux nêu mức tối thiểu rất thấp là **256 MB RAM và 1 GB disk**, đồng thời gợi ý **4 GB+ RAM và 50 GB+ disk** cho nhóm nhỏ. Mức tối thiểu chỉ cho thấy process có thể khởi động trong điều kiện hạn chế; không phải baseline production.

### 2.1 Controller

Controller xử lý UI/API, queue, Pipeline orchestration, plugin, build metadata và kết nối agent. Nhu cầu tài nguyên phụ thuộc:

- số job và số build đồng thời;
- số user/API request;
- số agent connection;
- độ phức tạp Pipeline;
- plugin được cài;
- build history và report;
- tần suất webhook và scan Multibranch.

Baseline thực dụng để bắt đầu:

| Môi trường | CPU | RAM hệ thống | Disk ban đầu | Ghi chú |
|---|---:|---:|---:|---|
| Lab cá nhân | 2 vCPU | 2–4 GB | 10–20 GB | Có thể chạy build local, không đại diện production |
| Nhóm nhỏ | 2–4 vCPU | 4–8 GB | 50 GB+ | Controller 0 executor, build trên agent |
| Nhiều team | Đo bằng tải thực | 8 GB+ và điều chỉnh | Tách volume, theo dõi tăng trưởng | Cần load pattern, retention và SLO cụ thể |

Đây là **điểm bắt đầu**, không phải công thức bảo đảm. Theo dõi heap, garbage collection, CPU, thread, response time, queue time và disk latency để điều chỉnh.

### 2.2 Java heap

Không cấp toàn bộ RAM hệ thống cho JVM heap. Hệ điều hành, process phụ, page cache và monitoring agent cũng cần bộ nhớ. Khi đặt `-Xmx`, cần để headroom và quan sát GC thay vì tăng heap mỗi khi controller chậm.

Các dấu hiệu cần điều tra:

- heap thường xuyên gần giới hạn và full GC kéo dài;
- controller bị OOM kill;
- UI/API chậm cùng với CPU/GC cao;
- Pipeline giữ object lớn hoặc plugin tạo memory leak;
- quá nhiều executor vẫn chạy trên controller.

### 2.3 Agent

Sizing agent theo workload, không theo số job danh nghĩa:

```text
RAM agent cần thiết
≈ RAM hệ điều hành
+ (RAM peak mỗi build × số executor đồng thời)
+ headroom cho container/cache/monitoring
```

Ví dụ: nếu một build dùng peak 3 GB và agent chạy tối đa hai build đồng thời, máy 8 GB có thể quá sát khi tính thêm OS và Docker daemon. Hãy đo peak thực tế và giảm executor hoặc tăng RAM.

---

## 3. Storage và JENKINS_HOME

### 3.1 Dữ liệu trong JENKINS_HOME

`JENKINS_HOME` chứa trạng thái quan trọng như:

- cấu hình hệ thống, folder, node và job;
- plugin;
- credential metadata và encryption key;
- user data;
- build history, log và artifact được archive;
- queue và dữ liệu vận hành khác.

Mất hoặc hỏng `JENKINS_HOME` có thể làm mất khả năng vận hành controller. Storage cần:

- bền vững qua restart/redeploy;
- latency ổn định và đủ IOPS;
- còn đủ inode nếu có nhiều file nhỏ;
- backup nhất quán;
- giám sát dung lượng, inode và lỗi I/O;
- quy trình restore đã được chạy thử.

### 3.2 Ước lượng tăng trưởng disk

Ghi lại các biến sau:

```text
Disk tăng mỗi ngày
≈ số build/ngày × dữ liệu giữ lại trung bình/build
+ log controller
+ plugin/cache tăng trưởng
+ overhead filesystem
```

Ví dụ, 500 build/ngày × 20 MB log/report/artifact giữ trong Jenkins tạo khoảng 10 GB/ngày trước retention và overhead. Đẩy artifact lớn sang repository và thiết lập retention có thể giảm đáng kể.

### 3.3 Retention

Thiết lập chính sách theo loại dữ liệu:

| Dữ liệu | Chính sách gợi ý |
|---|---|
| Build log | Giữ đủ cho debug/audit, xóa theo số ngày hoặc số build |
| Test report | Giữ xu hướng cần thiết, cân nhắc hệ thống report ngoài |
| Artifact phát hành | Lưu ở artifact repository theo version và policy |
| Workspace | Cleanup định kỳ, không xem là backup |
| Backup | Theo RPO/RTO, mã hóa và lưu tách failure domain |

<Callout type="error" title="Snapshot không đồng nghĩa backup hoàn chỉnh">Backup phải có lịch, retention, mã hóa, quyền truy cập và restore drill. Một bản snapshot chưa từng khôi phục không chứng minh được khả năng phục hồi.</Callout>

### 3.4 Container và Kubernetes

Nếu controller chạy trong container/pod, `JENKINS_HOME` phải mount vào persistent volume. Xóa container không được làm mất dữ liệu. Đồng thời kiểm tra storage class, access mode, backup integration và hành vi khi node Kubernetes bị thay thế.

---

## 4. Network, DNS và TLS

### 4.1 Network flow phổ biến

| Nguồn | Đích | Port thường gặp | Mục đích |
|---|---|---:|---|
| User / reverse proxy | Jenkins controller | `443` hoặc `8080` trong lab | UI, REST API, webhook |
| SCM provider | Jenkins controller | `443` | Gửi webhook |
| Controller/agent | SCM server | `22` hoặc `443` | Checkout source |
| Controller | Update Center/plugin site | `443` | Metadata và plugin update |
| Agent | Artifact/container registry | `443` | Pull dependency, push artifact/image |
| Controller | SSH agent | `22` | Launch agent qua SSH nếu dùng cách này |
| Inbound agent | Controller | `50000` hoặc WebSocket qua `443` | Kết nối agent tùy cấu hình |
| Jenkins | SMTP/chat/observability | Tùy dịch vụ | Notification, log, metric |

Port `50000` không bắt buộc trong mọi kiến trúc. Inbound agent có thể kết nối qua WebSocket trên HTTP(S), giúp tránh mở agent TCP port riêng. Chỉ mở flow thực sự sử dụng.

### 4.2 DNS và Jenkins URL

Dùng DNS ổn định, ví dụ:

```text
https://jenkins.example.com/
```

Cấu hình **Jenkins URL** đúng với URL user và integration sử dụng. Sai URL gây callback, webhook, absolute link và agent connection không nhất quán.

Checklist DNS:

- record trỏ tới load balancer/reverse proxy đúng;
- cả controller và agent resolve được hostname cần thiết;
- không hard-code IP trong job nếu có DNS;
- thời gian hệ thống đồng bộ qua NTP;
- certificate chứa đúng hostname.

### 4.3 Reverse proxy và TLS

Production nên đặt Jenkins sau reverse proxy/load balancer có TLS. Proxy cần truyền đúng host/protocol header và hỗ trợ request/response lâu nếu workload cần. Không để Jenkins UI công khai trên Internet nếu không có kiểm soát truy cập phù hợp.

TLS không thay thế authentication/authorization. Cần đồng thời:

- identity provider hoặc authentication phù hợp;
- role/permission theo least privilege;
- CSRF protection và API token đúng cách;
- network segmentation;
- audit và security update.

### 4.4 Proxy outbound

Nếu môi trường bắt buộc dùng HTTP proxy, liệt kê endpoint Jenkins/controller/agent cần truy cập và cấu hình `NO_PROXY` cho địa chỉ nội bộ. Kiểm thử riêng:

- tải plugin metadata;
- clone repository;
- pull/push image;
- truy cập artifact repository;
- download dependency của build tool.

---

## 5. Yêu cầu cho agent

Agent cần:

- network tới controller theo launch method;
- Java runtime tương thích cho agent process;
- đủ CPU, RAM, disk và inode;
- toolchain build cần thiết hoặc container runtime;
- quyền hệ điều hành tối thiểu;
- workspace có thể cleanup;
- đồng bộ thời gian và DNS ổn định.

### 5.1 Java trên agent và toolchain ứng dụng

Phân biệt hai lớp:

```text
Java chạy Jenkins agent process: theo Java Support Policy của Jenkins
JDK/JRE dùng để build ứng dụng: theo yêu cầu dự án và plugin/tool
```

Một agent có thể có nhiều JDK build hoặc dùng container image theo stage. Không thay đổi Java chạy agent chỉ vì một dự án cần compile target cũ.

### 5.2 Toolchain có thể tái tạo

Ưu tiên một trong các cách:

- image VM/container được version hóa;
- package provisioning bằng configuration management;
- tool installer có version cố định;
- wrapper trong repository như Maven Wrapper hoặc Gradle Wrapper.

Không cài tool thủ công không ghi chép trên từng agent. Cấu hình drift làm build “chỉ chạy trên máy agent A”.

### 5.3 Quyền Docker

Quyền truy cập Docker daemon thường tương đương quyền root trên host. Không thêm user Jenkins vào Docker group mà chưa đánh giá threat model. Cân nhắc agent cô lập, rootless builder hoặc build service chuyên dụng.

---

## 6. Capacity planning ban đầu

### 6.1 Thu thập workload inventory

Với mỗi loại job, ghi lại:

| Thuộc tính | Ví dụ |
|---|---|
| Tần suất | 20 build/giờ giờ cao điểm |
| Thời lượng p50/p95 | 6 phút / 14 phút |
| CPU peak | 2 vCPU |
| RAM peak | 3.5 GB |
| Disk tạm | 8 GB |
| Network | Pull image 1.2 GB |
| OS/capability | `linux && docker` |
| Concurrency an toàn | 1 build/workspace |

### 6.2 Ước lượng executor

Một ước lượng sơ bộ theo throughput:

```text
executor trung bình cần
≈ số build đến trong một giờ × thời lượng build trung bình (phút) / 60
```

Nếu 30 build/giờ và trung bình 10 phút, nhu cầu trung bình khoảng 5 executor. Sau đó phải thêm headroom cho peak, retry, agent startup và phân bố label. Công thức không kiểm tra CPU/RAM; vẫn phải đối chiếu giới hạn tài nguyên trên từng agent.

### 6.3 Theo dõi rồi điều chỉnh

Các metric quan trọng:

- queue length và queue wait time theo label;
- executor utilization;
- agent provision time và failure rate;
- build duration p50/p95;
- controller CPU, heap, GC và thread;
- disk latency, free space và inode;
- network throughput tới SCM/registry;
- tỷ lệ build lỗi do hạ tầng.

Không tăng executor nếu bottleneck là registry, test dùng database chung hoặc agent hết RAM.

---

## 7. Kiểm tra môi trường trước khi cài

### 7.1 Linux

```bash
set -eu

printf '%s\n' '=== OS ==='
uname -a
cat /etc/os-release

printf '%s\n' '=== CPU / RAM ==='
nproc
free -h

printf '%s\n' '=== Disk / inode ==='
df -h
df -i

printf '%s\n' '=== Java ==='
java -version

printf '%s\n' '=== DNS / HTTPS ==='
getent hosts jenkins.example.com || true
curl -I https://updates.jenkins.io/

printf '%s\n' '=== Port 8080 đang lắng nghe? ==='
ss -lntp | grep ':8080' || true
```

Thay `jenkins.example.com` bằng hostname dự kiến. Không bỏ qua lỗi certificate bằng `curl -k` trong kiểm tra production.

### 7.2 Windows PowerShell

```powershell
Write-Host '=== OS ==='
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsArchitecture

Write-Host '=== CPU / RAM ==='
Get-CimInstance Win32_ComputerSystem |
  Select-Object NumberOfLogicalProcessors, TotalPhysicalMemory

Write-Host '=== Disk ==='
Get-Volume | Select-Object DriveLetter, FileSystem, Size, SizeRemaining

Write-Host '=== Java ==='
java -version

Write-Host '=== DNS / HTTPS ==='
Resolve-DnsName jenkins.example.com
Test-NetConnection updates.jenkins.io -Port 443
```

### 7.3 Ghi kết quả preflight

Lưu lại:

- Jenkins LTS version dự kiến;
- Java vendor/major version;
- CPU/RAM/disk và mount path;
- `JENKINS_HOME` path;
- Jenkins URL và certificate owner;
- inbound/outbound network flow;
- backup owner, RPO và RTO;
- agent label/capacity;
- ngày review capacity tiếp theo.

---

## 8. Baseline theo môi trường

### 8.1 Lab học tập

- Jenkins LTS, Java 21;
- 2 vCPU, 2–4 GB RAM;
- 10–20 GB disk;
- truy cập qua `localhost:8080` hoặc private network;
- backup không bắt buộc nếu có thể dựng lại, nhưng nên thực hành export/restore;
- có thể dùng built-in node để học, không áp dụng cho production.

### 8.2 Nhóm nhỏ production

- controller riêng, `0` executor;
- 2–4 vCPU, 4–8 GB RAM làm điểm bắt đầu;
- 50 GB+ persistent storage và alert;
- một hoặc nhiều agent tách biệt;
- DNS ổn định, reverse proxy TLS;
- SSO/RBAC hoặc authentication/authorization phù hợp;
- backup tự động và restore drill;
- artifact lưu ngoài Jenkins;
- staging để kiểm thử upgrade/plugin.

### 8.3 Môi trường nhiều team

Không dùng một cấu hình mẫu duy nhất. Cần thêm:

- workload inventory và SLO;
- folder/RBAC/credential isolation;
- agent pool theo trust boundary;
- autoscaling và quota;
- monitoring tập trung;
- Configuration as Code;
- upgrade ring/canary controller nếu kiến trúc tổ chức cho phép;
- kế hoạch tách controller khi blast radius quá lớn.

---

## Checklist sẵn sàng

- [ ] Đã chọn Jenkins LTS và kiểm tra Java Support Policy.
- [ ] Java runtime thực tế của service/controller đúng major version.
- [ ] CPU/RAM có headroom và không dựa vào mức tối thiểu production.
- [ ] `JENKINS_HOME` nằm trên persistent storage có monitoring.
- [ ] Đã định nghĩa backup, retention, RPO/RTO và restore drill.
- [ ] DNS, Jenkins URL và TLS certificate nhất quán.
- [ ] Chỉ mở các network flow thực sự cần.
- [ ] Agent có toolchain tái tạo được và đủ tài nguyên.
- [ ] Controller production được đặt `0` executor.
- [ ] Có baseline metric để review capacity sau khi chạy thật.

---

## Tài liệu tham khảo

- [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/)
- [Installing Jenkins on Linux — Prerequisites](https://www.jenkins.io/doc/book/installing/linux/#prerequisites)
- [Hardware Recommendations](https://www.jenkins.io/doc/book/scaling/hardware-recommendations/)
- [Using Jenkins Agents](https://www.jenkins.io/doc/book/using/using-agents/)
- [Jenkins Security](https://www.jenkins.io/doc/book/security/)
- [Reverse Proxy Configuration](https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/)
