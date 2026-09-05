---
title: "Yêu cầu hệ thống"
description: "Chuẩn bị Java, tài nguyên, network, storage và kế hoạch capacity ban đầu cho Jenkins controller và agent."
---

<Callout type="info" title="Phạm vi">Trang này giúp chuẩn bị hạ tầng trước khi cài Jenkins LTS. Các con số là baseline để bắt đầu, không phải cam kết hiệu năng hay cấu hình production cố định.</Callout>

## Mục lục

- [Phạm vi và nguyên tắc](#phạm-vi-và-nguyên-tắc)
  - [Controller và agent có vai trò khác nhau](#controller-và-agent-có-vai-trò-khác-nhau)
- [Java cho Jenkins LTS](#java-cho-jenkins-lts)
  - [Kiểm tra policy trước khi chọn JDK](#kiểm-tra-policy-trước-khi-chọn-jdk)
  - [Kiểm tra Java trên máy đích](#kiểm-tra-java-trên-máy-đích)
- [CPU, RAM, disk và storage](#cpu-ram-disk-và-storage)
  - [Baseline cho lab](#baseline-cho-lab)
  - [Storage bền vững và quyền truy cập](#storage-bền-vững-và-quyền-truy-cập)
- [Network, DNS và cổng](#network-dns-và-cổng)
  - [Các luồng kết nối cần lập kế hoạch](#các-luồng-kết-nối-cần-lập-kế-hoạch)
  - [Kiểm tra DNS, HTTPS và cổng](#kiểm-tra-dns-https-và-cổng)
- [Capacity planning ban đầu](#capacity-planning-ban-đầu)
  - [Bảng sizing khởi điểm](#bảng-sizing-khởi-điểm)
  - [Đo workload để điều chỉnh](#đo-workload-để-điều-chỉnh)
- [Lab kiểm tra sẵn sàng](#lab-kiểm-tra-sẵn-sàng)
  - [Thu thập thông tin host](#thu-thập-thông-tin-host)
  - [Xác thực luồng mạng và storage](#xác-thực-luồng-mạng-và-storage)
  - [Ghi lại kết quả](#ghi-lại-kết-quả)
- [Checklist trước khi cài](#checklist-trước-khi-cài)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)

## Phạm vi và nguyên tắc

Jenkins gồm **controller** — nơi giữ cấu hình, credential, queue và điều phối Pipeline — cùng **agent** — nơi thực thi build, test và workspace. Tách hai vai trò ngay từ đầu giúp một build nặng không làm giao diện hay queue của controller chậm đi.

<Callout type="warn" title="Không dùng workstation làm production controller">Máy tính cá nhân có thể sleep, reboot, đổi mạng hoặc bị cài phần mềm ngoài quy trình vận hành. Dùng workstation chỉ phù hợp để học. Controller production cần host chuyên dụng, được vá lỗi, giám sát, backup và có owner vận hành rõ ràng.</Callout>

### Controller và agent có vai trò khác nhau

| Thành phần | Cần ưu tiên                                                                                                          | Không nên giả định                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Controller | Java được Jenkins LTS hỗ trợ, RAM ổn định, storage bền vững cho `JENKINS_HOME`, backup và mạng tới dịch vụ cần thiết | Controller là nơi chạy build. Với production, đặt số executor của controller là `0` và dùng agent riêng. |
| Agent      | CPU/RAM/disk theo toolchain và số executor đồng thời; workspace có thể dọn sau build                                 | Một agent có thể chạy vô hạn build. Mỗi executor đồng thời cạnh tranh CPU, RAM, I/O và network.          |

## Java cho Jenkins LTS

Controller và agent Java cần một Java runtime phù hợp với bản Jenkins đang chạy. JDK để chạy Jenkins là một quyết định độc lập với JDK mà Pipeline dùng để compile ứng dụng: agent có thể cần nhiều JDK theo dự án.

### Kiểm tra policy trước khi chọn JDK

Không ghi cứng một số phiên bản Java vào runbook vì Java support thay đổi giữa các dòng Jenkins LTS. Trước mỗi lần cài mới hoặc nâng cấp, thực hiện theo thứ tự sau:

1. Chọn chính xác bản Jenkins LTS sẽ triển khai.
2. Đối chiếu bản đó với [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/) và release notes của Jenkins LTS.
3. Cài một JDK/JRE nằm trong danh sách được hỗ trợ; dùng cùng họ Java cho controller và agent Java nếu không có lý do tương thích đã kiểm thử để khác nhau.
4. Chạy một controller thử nghiệm, kết nối một agent thử và kiểm tra plugin/toolchain quan trọng trước khi đổi production.

Nếu một agent được chạy bằng Java, Java của agent cũng phải nằm trong policy cho phiên bản Jenkins controller tương ứng. Agent khởi chạy bằng SSH hoặc inbound agent vẫn cần runtime Java trên chính máy agent.

### Kiểm tra Java trên máy đích

<Tabs items={['Linux', 'Windows PowerShell']}>
<Tab value="Linux">

```bash
java -version
command -v java
readlink -f "$(command -v java)"
```

Kết quả cần cho biết executable Java thực tế và version đã đối chiếu với policy của Jenkins LTS.

  </Tab>
  <Tab value="Windows PowerShell">

```powershell
java -version
Get-Command java -ErrorAction Stop | Select-Object Source
```

Xác nhận version của executable được service Jenkins sử dụng, không chỉ Java trong cửa sổ PowerShell của quản trị viên.

  </Tab>
</Tabs>

## CPU, RAM, disk và storage

Yêu cầu tài nguyên phụ thuộc mạnh vào plugin, số job chạy đồng thời, kích thước repository, cache, số build được giữ và artifact. [Hardware Recommendations](https://www.jenkins.io/doc/book/installing/hardware-recommendations/) là điểm tham chiếu chính thức; hãy dùng số liệu quan sát từ workload thật thay vì suy diễn từ số executor trên UI.

### Baseline cho lab

Cho một lab học Jenkins LTS với một controller, ít job mẫu và không build trên controller, có thể bắt đầu với **2 vCPU, 4 GiB RAM và 20 GiB persistent storage** cho controller. Một agent lab chạy một executor có thể bắt đầu cùng mức **2 vCPU, 4 GiB RAM và 20 GiB workspace** nếu toolchain không nặng.

Đây là **giả định baseline cho lab**, không phải mức tối thiểu hay cam kết cho production. Ví dụ, build Android, Docker image, phân tích mã hoặc test song song thường cần RAM, CPU và disk lớn hơn đáng kể. Đo rồi tăng kích thước cho từng loại agent.

### Storage bền vững và quyền truy cập

`JENKINS_HOME` của controller chứa cấu hình, job, plugin, build record và dữ liệu nhạy cảm. Đặt nó trên storage persistent có snapshot/backup theo chính sách của tổ chức. Không xem disk cục bộ tạm thời, workspace agent hay snapshot cùng failure domain là bản backup duy nhất.

Tách dung lượng cần theo dõi:

- `JENKINS_HOME`: tăng theo lịch sử build, plugin, logs và dữ liệu giữ lại.
- Workspace/cache trên agent: tăng theo repository, dependency cache và build output; đặt chính sách cleanup phù hợp.
- Artifact: ưu tiên kho artifact chuyên dụng khi retention lớn, thay vì giữ mọi artifact trong controller.
- Backup: dự trù storage và băng thông ở failure domain khác; kiểm thử restore định kỳ.

`/var/lib/jenkins` và `C:\Jenkins\Home` dưới đây chỉ là **ví dụ** cho `JENKINS_HOME`; thay bằng đường dẫn đã chọn. Trước khi cài package, tài khoản dịch vụ `jenkins` và thư mục đích có thể chưa tồn tại. Khi đó chỉ kiểm tra filesystem/đường dẫn cha và dung lượng. Chỉ chạy kiểm tra bằng tài khoản dịch vụ sau khi package hoặc quy trình cài đặt đã tạo tài khoản và `JENKINS_HOME`.

<Tabs items={['Linux', 'Windows PowerShell']}>
<Tab value="Linux">

**Trước khi cài đặt** — tìm phần tử cha đang tồn tại để lệnh vẫn kiểm tra được disk và quyền traverse khi `JENKINS_HOME` chưa được tạo:

```bash
JENKINS_HOME=/var/lib/jenkins # Ví dụ, thay bằng đường dẫn đã chọn.
existing_path="$JENKINS_HOME"
while [ ! -e "$existing_path" ]; do existing_path="$(dirname "$existing_path")"; done

printf 'Kiểm tra filesystem và parent path đang tồn tại: %s\n' "$existing_path"
df -hT "$existing_path"
df -i "$existing_path"
namei -l "$existing_path"
```

**Sau khi cài đặt** — chạy bằng quyền quản trị có thể dùng `sudo`. Guard này chỉ chạy phép thử khi cả service account `jenkins` và thư mục đã tồn tại:

```bash
JENKINS_HOME=/var/lib/jenkins # Ví dụ, thay bằng đường dẫn đã chọn.
if id jenkins >/dev/null 2>&1 && [ -d "$JENKINS_HOME" ]; then
  namei -l "$JENKINS_HOME"
  sudo -u jenkins test -r "$JENKINS_HOME" && echo 'read: OK'
  sudo -u jenkins test -w "$JENKINS_HOME" && echo 'write: OK'
  sudo -u jenkins test -x "$JENKINS_HOME" && echo 'traverse: OK'
else
  echo 'Bỏ qua: tài khoản jenkins hoặc JENKINS_HOME chưa tồn tại; đây là kiểm tra post-install.'
fi
```

  </Tab>
  <Tab value="Windows PowerShell">

**Trước khi cài đặt**, kiểm tra volume chứa đường dẫn dự kiến. Lệnh ACL bên dưới chỉ chạy khi thư mục đã tồn tại:

```powershell
$JenkinsHome = 'C:\Jenkins\Home' # Ví dụ, thay bằng JENKINS_HOME đã chọn.
$drive = (Split-Path -Qualifier $JenkinsHome).TrimEnd(':')
Get-Volume -DriveLetter $drive | Select-Object DriveLetter, SizeRemaining, Size

if (Test-Path -Path $JenkinsHome -PathType Container) {
  icacls $JenkinsHome
} else {
  Write-Host 'Bỏ qua ACL: JENKINS_HOME chưa tồn tại; kiểm tra lại sau khi cài đặt.'
}
```

Sau khi installer đã tạo service account và thư mục, đọc ACL để xác nhận tài khoản dịch vụ Jenkins có quyền cần thiết trên thư mục và các thư mục cha. Không cấp `FullControl` rộng rãi chỉ để bỏ qua lỗi quyền.

  </Tab>
</Tabs>

## Network, DNS và cổng

Lập allowlist theo luồng thực tế. Controller thường cần outbound HTTPS tới update center, SCM, kho plugin/artifact và dịch vụ xác thực mà tổ chức sử dụng. Agent thường cần outbound HTTPS tới SCM, kho dependency/artifact và các endpoint của Pipeline. Không mở internet hai chiều hoặc `Any/Any` chỉ để xử lý lỗi kết nối.

### Các luồng kết nối cần lập kế hoạch

```text
Browser ── HTTPS ──► Reverse proxy ── HTTPS/HTTP nội bộ ──► Controller
                                                        │
Controller ── HTTPS ──► Update center / SCM / artifact / IdP
     │                                                  ▲
     ├── SSH ──► Agent (khi launch bằng SSH)            │
     └── TCP đã cấu hình ◄── Inbound agent              │

Agent ── HTTPS ──► SCM / dependency / artifact registry ┘
```

- Người dùng nên truy cập controller qua HTTPS và reverse proxy; không public trực tiếp port nội bộ của Jenkins nếu không cần thiết.
- Với SSH agent, controller phải tới được SSH port của agent. Với inbound agent, agent phải tới được TCP agent port **đã cấu hình trên controller**; không giả định một port cố định.
- Với WebSocket agent, agent kết nối qua HTTPS tới controller/reverse proxy; kiểm tra proxy hỗ trợ WebSocket.
- DNS phải phân giải được hostname controller từ agent, và các hostname external từ host cần truy cập chúng. Dùng hostname ổn định thay vì IP thay đổi.

### Kiểm tra DNS, HTTPS và cổng

Thay `jenkins.example.internal` bằng hostname controller/reverse proxy thật. URL `https://updates.jenkins.io/` chỉ kiểm tra đường ra tới Jenkins Update Center; bổ sung các domain SCM, registry và IdP của tổ chức vào allowlist kiểm tra.

<Tabs items={['Linux', 'Windows PowerShell']}>
<Tab value="Linux">

```bash
# DNS và outbound HTTPS từ controller hoặc agent.
getent hosts updates.jenkins.io
curl --fail --silent --show-error --connect-timeout 10 --head https://updates.jenkins.io/
getent hosts jenkins.example.internal

# Port đang lắng nghe trên controller; xem port Jenkins/reverse proxy đã cấu hình.
ss -ltnp

# Khi dùng SSH agent, chạy từ controller tới từng agent.
nc -vz agent-01.example.internal 22
```

  </Tab>
  <Tab value="Windows PowerShell">

```powershell
# DNS và outbound HTTPS từ controller hoặc agent.
Resolve-DnsName updates.jenkins.io
Test-NetConnection updates.jenkins.io -Port 443
Resolve-DnsName jenkins.example.internal

# Port đang lắng nghe trên controller.
Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess

# Khi dùng SSH agent, chạy từ controller tới từng agent.
Test-NetConnection agent-01.example.internal -Port 22
```

  </Tab>
</Tabs>

## Capacity planning ban đầu

Bắt đầu từ concurrency, không phải chỉ từ số job. Ghi số executor đồng thời, thời lượng build ở p50/p95, peak queue time, RAM/CPU peak, I/O wait, disk growth và dung lượng artifact. Một agent có một executor là cách đơn giản để cô lập baseline; chỉ tăng executor khi đo cho thấy toolchain còn headroom.

### Bảng sizing khởi điểm

| Workload quan sát                                        | Controller: điểm bắt đầu                                                   | Agent: điểm bắt đầu                                                  | Điều kiện để điều chỉnh                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Lab, 0–2 executor đồng thời, ít plugin                   | 2 vCPU, 4 GiB RAM, 20 GiB persistent storage                               | 2 vCPU, 4 GiB RAM, 20 GiB mỗi agent/1 executor                       | Tăng nếu queue kéo dài, JVM bị áp lực RAM hoặc disk gần đầy.                                 |
| Nhóm nhỏ, 3–10 executor đồng thời                        | 4 vCPU, 8 GiB RAM, 50 GiB persistent storage                               | Bắt đầu 1 executor/agent; sizing theo toolchain và workspace đo được | Tách agent theo nhãn/toolchain, theo dõi peak và thêm agent trước khi tăng executor dày đặc. |
| Hơn 10 executor, retention/artifact lớn hoặc plugin nặng | Đo workload và thử tải trước khi chốt; cân nhắc storage/backup chuyên dụng | Pool agent theo loại workload, autoscaling nếu nền tảng hỗ trợ       | Thiết kế theo SLO queue time, thời gian build, khôi phục và tăng trưởng dữ liệu.             |

Các mức trên là **điểm bắt đầu cần đo thực tế**, dựa trên khuyến nghị phần cứng Jenkins và giả định workload nêu trong bảng, không phải sizing chính thức cho mọi cài đặt. Không cộng workspace agent vào dung lượng `JENKINS_HOME`; hai loại storage có tốc độ tăng khác nhau.

### Đo workload để điều chỉnh

Dùng một khoảng quan sát có peak thực tế, ví dụ một tuần release, rồi trả lời các câu hỏi sau:

1. Queue có tăng trong giờ cao điểm dù agent còn online không? Nếu có, thêm năng lực agent hoặc tối ưu job trước.
2. Controller có GC pause, CPU cao hoặc UI chậm khi lịch sử build tăng không? Nếu có, kiểm tra plugin, retention và tăng tài nguyên controller sau khi có số đo.
3. Disk có đủ headroom cho tăng trưởng trước chu kỳ cleanup/backup tiếp theo không? Đặt alert theo phần trăm trống và tốc độ tăng, không chờ tới lúc đầy disk.
4. Build nào tiêu thụ khác biệt? Gắn label để route build nặng vào agent phù hợp thay vì tăng mọi máy như nhau.

Một cách ước lượng đơn giản cho storage controller là lấy mức sử dụng `JENKINS_HOME` hiện tại, cộng tăng trưởng đã đo giữa hai chu kỳ cleanup, rồi chừa ít nhất phần headroom theo chính sách vận hành. Kiểm thử restore cho biết backup có đáp ứng được thời gian khôi phục mục tiêu hay không.

## Lab kiểm tra sẵn sàng

<Steps>
<Step>

### Thu thập thông tin host

Chạy các lệnh sau trên controller và trên ít nhất một agent đại diện. Lưu kết quả cùng ngày kiểm tra, hostname và vai trò máy.

<Tabs items={['Linux', 'Windows PowerShell']}>
<Tab value="Linux">

```bash
hostnamectl
nproc
lscpu
free -h
df -hT
df -i
java -version
```

  </Tab>
  <Tab value="Windows PowerShell">

```powershell
Get-ComputerInfo | Select-Object CsName, OsName, OsVersion
Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors
Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory
Get-Volume | Select-Object DriveLetter, SizeRemaining, Size
java -version
```

  </Tab>
</Tabs>

</Step>
<Step>

### Xác thực luồng mạng và storage

Chạy kiểm tra DNS, outbound HTTPS, port và quyền storage ở các phần trên bằng đúng tài khoản/host sẽ chạy Jenkins. Với agent, kiểm tra đúng kiểu launch đã chọn: SSH, inbound TCP hoặc WebSocket. Ghi rõ hostname/domain nào thất bại để mở firewall hoặc proxy theo allowlist, không mở rộng rule tạm thời.

</Step>
<Step>

### Ghi lại kết quả

Ghi baseline gồm version Jenkins LTS dự kiến, URL Java Support Policy đã kiểm tra, version Java thực tế, CPU/RAM/disk trống, latency/kết quả HTTPS, loại storage, retention và số executor dự kiến. Đây là mốc so sánh sau khi Jenkins đi vào hoạt động.

</Step>
</Steps>

## Checklist trước khi cài

- [ ] Đã chọn bản Jenkins LTS và đối chiếu Java runtime với [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/).
- [ ] Controller và agent đã được phân vai; controller production dự kiến có `0` executor.
- [ ] Baseline CPU/RAM/disk được ghi rõ là giả định khởi điểm và có kế hoạch đo workload thật.
- [ ] `JENKINS_HOME` nằm trên storage persistent; có retention, backup và kiểm thử restore.
- [ ] Tài khoản dịch vụ Jenkins có quyền truy cập tối thiểu cần thiết vào storage.
- [ ] DNS phân giải được các hostname cần dùng từ đúng host; outbound HTTPS tới các endpoint được allowlist hoạt động.
- [ ] Cổng cho browser, reverse proxy và kiểu kết nối agent đã được kiểm tra theo sơ đồ.
- [ ] Không có workstation cá nhân hoặc port public không kiểm soát trong thiết kế production.

## Nguồn Jenkins chính thức

- [Hardware Recommendations](https://www.jenkins.io/doc/book/installing/hardware-recommendations/)
- [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/)
- [Using Agents](https://www.jenkins.io/doc/book/using/using-agents/)
- [Controller Isolation](https://www.jenkins.io/doc/book/security/controller-isolation/)
- [Jenkins Update Center](https://updates.jenkins.io/)
