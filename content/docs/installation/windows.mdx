---
title: "Cài Jenkins trên Windows"
description: "Cài Jenkins LTS bằng MSI, chạy bằng Windows Service và hoàn tất cấu hình ban đầu an toàn."
---

<Callout type="info" title="Phạm vi hướng dẫn">Bài này dành cho Jenkins controller cài trực tiếp trên Windows bằng MSI chính thức. Các lệnh PowerShell cần quyền Administrator khi thao tác với service, firewall hoặc ACL.</Callout>

## Mục lục

- [Mục tiêu](#mục-tiêu)
- [1. Khi nào nên dùng Windows controller](#1-khi-nào-nên-dùng-windows-controller)
- [2. Yêu cầu trước khi cài](#2-yêu-cầu-trước-khi-cài)
  - [2.1 Windows, Java và trình duyệt](#21-windows-java-và-trình-duyệt)
  - [2.2 CPU, RAM và dung lượng](#22-cpu-ram-và-dung-lượng)
  - [2.3 Quyền và kết nối mạng](#23-quyền-và-kết-nối-mạng)
- [3. Chọn tài khoản chạy service](#3-chọn-tài-khoản-chạy-service)
  - [3.1 LocalSystem và tài khoản dịch vụ](#31-localsystem-và-tài-khoản-dịch-vụ)
  - [3.2 Chuẩn bị tài khoản dịch vụ](#32-chuẩn-bị-tài-khoản-dịch-vụ)
- [4. Tải và xác minh Jenkins LTS MSI](#4-tải-và-xác-minh-jenkins-lts-msi)
  - [4.1 Tải từ nguồn chính thức](#41-tải-từ-nguồn-chính-thức)
  - [4.2 Kiểm tra chữ ký số](#42-kiểm-tra-chữ-ký-số)
  - [4.3 Đối chiếu SHA-256](#43-đối-chiếu-sha-256)
- [5. Cài Jenkins bằng MSI](#5-cài-jenkins-bằng-msi)
  - [5.1 Chạy wizard MSI](#51-chạy-wizard-msi)
  - [5.2 Cài không tương tác](#52-cài-không-tương-tác)
- [6. Kiểm tra Windows Service và JENKINS_HOME](#6-kiểm-tra-windows-service-và-jenkins_home)
  - [6.1 Kiểm tra service](#61-kiểm-tra-service)
  - [6.2 Phân biệt thư mục cài đặt và JENKINS_HOME](#62-phân-biệt-thư-mục-cài-đặt-và-jenkins_home)
  - [6.3 Quản lý service](#63-quản-lý-service)
- [7. Cấu hình Windows Firewall](#7-cấu-hình-windows-firewall)
  - [7.1 Chỉ truy cập trên máy cục bộ](#71-chỉ-truy-cập-trên-máy-cục-bộ)
  - [7.2 Cho phép truy cập từ mạng nội bộ](#72-cho-phép-truy-cập-từ-mạng-nội-bộ)
- [8. Mở khóa và hoàn tất setup wizard](#8-mở-khóa-và-hoàn-tất-setup-wizard)
  - [8.1 Lấy initialAdminPassword](#81-lấy-initialadminpassword)
  - [8.2 Hoàn tất cấu hình ban đầu](#82-hoàn-tất-cấu-hình-ban-đầu)
- [9. Kiểm tra sau cài đặt và đọc log](#9-kiểm-tra-sau-cài-đặt-và-đọc-log)
  - [9.1 Kiểm tra nhanh bằng PowerShell](#91-kiểm-tra-nhanh-bằng-powershell)
  - [9.2 Xem log Jenkins](#92-xem-log-jenkins)
- [10. Backup, nâng cấp và gỡ cài đặt](#10-backup-nâng-cấp-và-gỡ-cài-đặt)
  - [10.1 Backup nhất quán](#101-backup-nhất-quán)
  - [10.2 Nâng cấp Jenkins LTS](#102-nâng-cấp-jenkins-lts)
  - [10.3 Gỡ cài đặt](#103-gỡ-cài-đặt)
- [11. Troubleshooting](#11-troubleshooting)
  - [11.1 Service không khởi động](#111-service-không-khởi-động)
  - [11.2 Invalid service logon credentials](#112-invalid-service-logon-credentials)
  - [11.3 Port đã bị chiếm](#113-port-đã-bị-chiếm)
  - [11.4 Java không hợp lệ](#114-java-không-hợp-lệ)
  - [11.5 Access denied với JENKINS_HOME hoặc network share](#115-access-denied-với-jenkins_home-hoặc-network-share)
  - [11.6 Không mở được giao diện hoặc không tải được plugin](#116-không-mở-được-giao-diện-hoặc-không-tải-được-plugin)
  - [11.7 MSI không vượt qua bước xác minh](#117-msi-không-vượt-qua-bước-xác-minh)
- [12. Hardening và bước tiếp theo](#12-hardening-và-bước-tiếp-theo)
  - [12.1 Baseline hardening](#121-baseline-hardening)
  - [12.2 Checklist hoàn thành](#122-checklist-hoàn-thành)
  - [12.3 Học tiếp](#123-học-tiếp)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Mục tiêu

Sau bài này, bạn có thể:

- quyết định Windows có phù hợp để chạy Jenkins controller hay không;
- chuẩn bị Java, tài khoản dịch vụ, port và storage;
- tải Jenkins LTS MSI từ nguồn chính thức và xác minh file;
- cài Jenkins thành Windows Service bằng tài khoản có quyền tối thiểu;
- xác định đúng `JENKINS_HOME`, mở firewall có giới hạn và unlock Jenkins;
- kiểm tra service, listener, HTTP response và log;
- backup, nâng cấp hoặc gỡ cài đặt mà không vô tình xóa dữ liệu;
- xử lý các lỗi Windows phổ biến và áp dụng baseline hardening.

---

## 1. Khi nào nên dùng Windows controller

Cài controller trên Windows hợp lý khi đội vận hành đã chuẩn hóa Windows Server và cần tích hợp chặt với dịch vụ nội bộ dùng danh tính domain. Đây cũng là lựa chọn dễ tiếp cận cho lab Windows cục bộ.

Windows controller **không bắt buộc** chỉ vì ứng dụng được build cho Windows. Kiến trúc phổ biến hơn là chạy controller trên một nền tảng ổn định, sau đó gắn Windows agent có Visual Studio, MSBuild, .NET SDK hoặc toolchain riêng.

| Tình huống | Khuyến nghị |
|---|---|
| Lab cá nhân trên Windows 10/11 | Có thể dùng MSI và `localhost`; không xem đây là kiến trúc production |
| Production đã chuẩn hóa Windows Server | Dùng máy/VM chuyên dụng, tài khoản dịch vụ riêng, backup và TLS |
| Chỉ build ứng dụng Windows | Dùng Windows agent; controller không cần chạy Windows |
| Cần container hóa, tái tạo nhanh hoặc scale động | Cân nhắc Docker/Kubernetes thay vì cài trực tiếp bằng MSI |
| Định chạy build ngay trên controller | Chỉ chấp nhận cho lab; production phải tách agent |

<Callout type="warn" title="Không dùng workstation làm controller production">Desktop của quản trị viên có thể sleep, reboot, đổi IP hoặc bị cài phần mềm ngoài kiểm soát. Controller production nên chạy trên máy chủ chuyên dụng, được patch, giám sát và backup.</Callout>

---

## 2. Yêu cầu trước khi cài

### 2.1 Windows, Java và trình duyệt

Chuẩn bị các thành phần sau:

- Windows 64-bit còn được Microsoft hỗ trợ;
- Windows Server 64-bit với bản cập nhật GA mới nhất cho production;
- .NET Framework 4.0 trở lên cho Windows Service Wrapper;
- Java 64-bit tương thích với Jenkins LTS sẽ cài;
- trình duyệt hiện đại được Jenkins hỗ trợ.

Tài liệu cài Windows hiện hành yêu cầu **Java 21 hoặc mới hơn**. Chính sách Java thay đổi theo từng dòng Jenkins. Với cài mới, Java 21 LTS là baseline dễ vận hành; chỉ dùng Java 25 khi Jenkins LTS và plugin quan trọng của bạn đều hỗ trợ.

Kiểm tra Java trong PowerShell:

```powershell
java -version
(Get-Command java).Source
```

Ví dụ cần xác nhận là Java 64-bit, major version được hỗ trợ và đúng vendor đã được tổ chức phê duyệt:

```text
openjdk version "21.x.x" ...
OpenJDK Runtime Environment ...
OpenJDK 64-Bit Server VM ...
```

<Callout type="warn" title="Java chạy Jenkins khác JDK dùng để build">Java mà MSI chọn dùng để chạy controller. Pipeline vẫn có thể dùng JDK khác trên agent để compile ứng dụng. Đừng hạ Java của controller chỉ vì một dự án cần target Java cũ.</Callout>

### 2.2 CPU, RAM và dung lượng

Jenkins công bố mức tối thiểu 256 MB RAM và 1 GB disk, nhưng mức đó chỉ đủ để process khởi động trong điều kiện rất hạn chế. Không dùng mức tối thiểu làm sizing production.

| Môi trường | CPU | RAM | Disk ban đầu | Ghi chú |
|---|---:|---:|---:|---|
| Lab cá nhân | 2 vCPU | 2–4 GB | 10–20 GB | Có thể chạy job nhỏ trên built-in node |
| Nhóm nhỏ | 2–4 vCPU | 4 GB+ | 50 GB+ | Chạy build trên agent riêng |
| Production nhiều team | Đo theo tải thực | 8 GB+ rồi điều chỉnh | Volume riêng, có alert | Theo dõi heap, I/O, queue và tốc độ tăng dữ liệu |

`JENKINS_HOME` chứa cấu hình, plugin, credential đã mã hóa, build history, log và artifact lưu trong Jenkins. Chọn volume NTFS có:

- đủ dung lượng và headroom;
- latency ổn định;
- backup nhất quán và restore drill;
- cảnh báo dung lượng;
- ACL chỉ cấp cho tài khoản Jenkins và quản trị viên được ủy quyền.

### 2.3 Quyền và kết nối mạng

Bạn cần:

- quyền Administrator để chạy MSI và tạo Windows Service;
- quyền **Log on as a service** cho tài khoản chạy Jenkins;
- quyền Modify trên `JENKINS_HOME` cho tài khoản đó;
- một TCP port chưa bị sử dụng, mặc định là `8080`;
- outbound HTTPS `443` tới Update Center, plugin site, SCM và artifact registry thực sự dùng;
- inbound tới port Jenkins chỉ từ user hoặc reverse proxy được phép.

Kiểm tra nhanh port mặc định và Update Center:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction SilentlyContinue
Test-NetConnection updates.jenkins.io -Port 443
```

Nếu lệnh đầu trả về listener, hãy chọn port khác hoặc xác định process đang dùng port trước khi cài.

---

## 3. Chọn tài khoản chạy service

### 3.1 LocalSystem và tài khoản dịch vụ

<Tabs items={['Tài khoản dịch vụ', 'LocalSystem']}>
  <Tab value="Tài khoản dịch vụ">
    **Khuyến nghị cho production.** Tạo local user hoặc domain user riêng, ví dụ `DOMAIN\svc_jenkins`. Chỉ cấp **Log on as a service**, quyền Modify trên `JENKINS_HOME` và quyền mạng thật sự cần.

    Domain service account có danh tính rõ ràng khi truy cập share hoặc dịch vụ nội bộ. Local service account phù hợp khi controller không cần xác thực sang tài nguyên domain.
  </Tab>
  <Tab value="LocalSystem">
    Chỉ phù hợp cho lab ngắn hạn. LocalSystem có đặc quyền rất cao trên host, gần tương đương `root` trong phạm vi máy Windows.

    Nếu Jenkins hoặc plugin bị xâm nhập, attacker có blast radius lớn hơn. LocalSystem cũng không cung cấp danh tính domain riêng để truy cập share yêu cầu một user cụ thể.
  </Tab>
</Tabs>

Nói ngắn gọn: production nên dùng một tài khoản dịch vụ chuyên biệt. Không cấp local Administrator chỉ để Jenkins đọc repository hoặc ghi workspace.

### 3.2 Chuẩn bị tài khoản dịch vụ

1. Tạo tài khoản theo quy trình IAM của tổ chức.
2. Thiết lập password rotation hoặc cơ chế quản lý account phù hợp.
3. Cấp **Log on as a service** bằng Local Security Policy hoặc Group Policy.
4. Cấp quyền trên data volume và network share cần thiết.
5. Gỡ quyền interactive logon nếu policy của tổ chức yêu cầu.
6. Ghi lại owner của tài khoản và quy trình cập nhật password cho service.

Mở `secpol.msc`, sau đó vào **Local Policies → User Rights Assignment → Log on as a service** để kiểm tra quyền cục bộ. Trong domain, Group Policy có thể ghi đè cấu hình này.

<Callout type="error" title="Không đưa secret vào tài liệu hoặc command history">Các tên như `DOMAIN\svc_jenkins` chỉ là ví dụ. Không ghi password thật vào file Markdown, ticket, Pipeline, lệnh PowerShell được lưu history hoặc tham số MSI trong log triển khai.</Callout>

---

## 4. Tải và xác minh Jenkins LTS MSI

### 4.1 Tải từ nguồn chính thức

<Steps>
  <Step>
    Mở [Jenkins Download](https://www.jenkins.io/download/).
  </Step>
  <Step>
    Trong phần **Stable (LTS)**, chọn **Windows**. Không dùng weekly cho controller production nếu không có lý do và quy trình kiểm thử rõ ràng.
  </Step>
  <Step>
    Lưu file thành `jenkins.msi` trong thư mục tải xuống riêng. Ghi lại version LTS hiển thị trên trang để dùng khi lấy checksum.
  </Step>
</Steps>

Link có thể chuyển hướng tới một Jenkins mirror. Đây là hành vi bình thường. Nguồn bắt đầu vẫn phải là `jenkins.io` hoặc `get.jenkins.io`, và file phải vượt qua bước xác minh bên dưới.

### 4.2 Kiểm tra chữ ký số

Mở PowerShell tại thư mục chứa MSI:

```powershell
$Msi = Resolve-Path .\jenkins.msi
$Signature = Get-AuthenticodeSignature $Msi
$Signature | Format-List Status, StatusMessage, SignerCertificate

if ($Signature.Status -ne 'Valid') {
  throw "Chữ ký MSI không hợp lệ: $($Signature.Status)"
}
```

Yêu cầu:

- `Status` phải là `Valid`;
- publisher/signing subject phải phù hợp với thông tin nhà phát hành Jenkins công bố trên trang download/verification;
- file không được tiếp tục cài nếu chữ ký thiếu, hết tin cậy hoặc không hợp lệ.

Microsoft Defender SmartScreen có thể cảnh báo khi Jenkins chuyển chứng thư hoặc dịch vụ ký code. Không chọn **Run anyway** chỉ vì hướng dẫn tải xuống nói có thể xuất hiện cảnh báo. Trước tiên phải kiểm tra chữ ký hợp lệ và đối chiếu thông báo hiện hành trên trang Jenkins chính thức.

### 4.3 Đối chiếu SHA-256

Kho package Jenkins công bố file `jenkins.msi.sha256` trong thư mục của từng version. Thay `<LTS_VERSION>` bằng version vừa tải, ví dụ dạng `2.x.y`:

```powershell
$Version = '<LTS_VERSION>'
$Msi = Resolve-Path .\jenkins.msi
$ChecksumUrl = "https://get.jenkins.io/windows-stable/$Version/jenkins.msi.sha256"

$Expected = ((Invoke-WebRequest -UseBasicParsing $ChecksumUrl).Content -split '\s+')[0].ToLowerInvariant()
$Actual = (Get-FileHash -Algorithm SHA256 $Msi).Hash.ToLowerInvariant()

[pscustomobject]@{
  ExpectedSHA256 = $Expected
  ActualSHA256   = $Actual
  Match          = ($Expected -eq $Actual)
}

if ($Expected -ne $Actual) {
  throw 'SHA-256 không khớp. Xóa file và điều tra nguồn tải.'
}
```

SHA-256 phát hiện file hỏng hoặc khác artifact công bố. Chữ ký Authenticode mới là kiểm tra quan trọng để xác thực publisher; nên thực hiện cả hai.

---

## 5. Cài Jenkins bằng MSI

### 5.1 Chạy wizard MSI

Nhấp phải `jenkins.msi`, chọn chạy với quyền Administrator, rồi làm theo thứ tự sau.

<Steps>
  <Step>
    **Setup Wizard:** chọn **Next** để bắt đầu.
  </Step>
  <Step>
    **Destination Folder:** giữ `C:\Program Files\Jenkins` hoặc chọn thư mục phần mềm theo chuẩn của tổ chức. Đây là nơi chứa service wrapper, `jenkins.war` và `jenkins.xml`; chưa nên mặc định rằng nó luôn là data directory.
  </Step>
  <Step>
    **Service Logon Credentials:** chọn local/domain user đã chuẩn bị. Nhập theo dạng `DOMAIN\svc_jenkins` hoặc `.\svc_jenkins`, chọn **Test Credentials**, rồi chỉ tiếp tục khi kiểm tra thành công.

    Với lab, có thể chọn LocalSystem sau khi đã hiểu rủi ro ở phần trên.
  </Step>
  <Step>
    **Port Selection:** nhập port dự kiến, thường là `8080`, rồi chọn **Test Port**. Wizard phải hiển thị port khả dụng trước khi tiếp tục.
  </Step>
  <Step>
    **Java Home Directory:** chọn thư mục gốc của Java 64-bit, không chọn trực tiếp file `java.exe` và không chọn thư mục `bin`. Ví dụ hợp lệ có dạng `C:\Program Files\Eclipse Adoptium\jdk-21.x.x-hotspot`.
  </Step>
  <Step>
    **Custom Setup:** giữ feature mặc định nếu không có yêu cầu đóng gói riêng. Kiểm tra lại installation directory trước khi chọn **Next**.
  </Step>
  <Step>
    **Install:** chọn **Install**, chấp nhận UAC và chờ MSI đăng ký Windows Service.
  </Step>
  <Step>
    **Finish:** hoàn tất wizard. Jenkins service được cấu hình tự khởi động cùng Windows và setup wizard sẽ sẵn sàng trên port đã chọn.
  </Step>
</Steps>

<Callout type="warn" title="Không dùng port 80/443 chỉ để khỏi cấu hình proxy">Port đặc quyền không thay thế TLS và reverse proxy. Production nên để Jenkins lắng nghe trên port nội bộ, đặt sau reverse proxy HTTPS và giới hạn firewall.</Callout>

### 5.2 Cài không tương tác

MSI hỗ trợ `/qn` hoặc `/qb` cùng các property `INSTALLDIR`, `PORT`, `JAVA_HOME`, `SERVICE_USERNAME` và `SERVICE_PASSWORD`:

```powershell
msiexec.exe /i "C:\Install\jenkins.msi" /qn /norestart `
  INSTALLDIR="D:\Apps\Jenkins" `
  JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21" `
  PORT=8080 `
  /L*v "C:\Install\jenkins-msi.log"

if ($LASTEXITCODE -ne 0) {
  throw "MSI thất bại với exit code $LASTEXITCODE"
}
```

Lệnh mẫu cố ý không chứa credential. Silent install mặc định dùng LocalSystem nếu không truyền service account, vì vậy **không dùng nguyên mẫu này cho production**.

Nếu hệ thống triển khai bắt buộc truyền `SERVICE_PASSWORD`, lấy secret tại runtime từ secret manager và tránh verbose process logging. Ưu tiên deployment tool có secure variable thay vì hard-code password trong script hoặc repository.

---

## 6. Kiểm tra Windows Service và JENKINS_HOME

### 6.1 Kiểm tra service

```powershell
Get-Service -Name Jenkins

Get-CimInstance Win32_Service -Filter "Name='Jenkins'" |
  Select-Object Name, State, StartMode, StartName, PathName

sc.exe qc Jenkins
```

Kết quả cần xác nhận:

- `State` là `Running`;
- `StartMode` là `Auto`;
- `StartName` đúng tài khoản đã chọn;
- `PathName` trỏ tới service wrapper trong installation directory.

### 6.2 Phân biệt thư mục cài đặt và JENKINS_HOME

Hai đường dẫn có mục đích khác nhau:

| Đường dẫn | Chứa gì | Cách quản lý |
|---|---|---|
| Installation directory | `jenkins.exe`, `jenkins.war`, `jenkins.xml` và file chương trình | Thay đổi khi cài/nâng cấp MSI |
| `JENKINS_HOME` | Job, plugin, user, credential đã mã hóa, build history và cấu hình | Phải backup, giám sát và giới hạn ACL |

Với fresh install mặc định, tài liệu Windows của Jenkins hướng dẫn tìm `initialAdminPassword` dưới installation path. Tuy nhiên, vị trí home có thể khác với bản nâng cấp, bản cài cũ, service account hoặc cấu hình tùy chỉnh. Vì vậy không nên đoán đường dẫn từ một bài viết cũ.

Trước khi unlock, kiểm tra cấu hình boot và các thư mục thực tế:

```powershell
$InstallDir = 'C:\Program Files\Jenkins'
Get-Content "$InstallDir\jenkins.xml"

Get-ChildItem -Path $InstallDir -Force
Get-ChildItem -Path $InstallDir -Filter initialAdminPassword -Recurse -Force -ErrorAction SilentlyContinue
```

Sau khi đăng nhập, nguồn xác nhận đáng tin cậy là **Manage Jenkins → System Information → `JENKINS_HOME`**. Ghi đường dẫn đó vào runbook và dùng đúng giá trị trong các lệnh backup/log bên dưới:

```powershell
$JenkinsHome = 'C:\path\confirmed-from-system-information'
Test-Path $JenkinsHome
```

<Callout type="error" title="Không di chuyển JENKINS_HOME bằng thao tác copy khi service đang chạy">Một bản copy live có thể chứa các file ở nhiều thời điểm khác nhau. Muốn đổi data directory, hãy backup, dừng service, copy nhất quán, cập nhật cấu hình boot/ACL, rồi kiểm thử restore trước khi xóa dữ liệu cũ.</Callout>

### 6.3 Quản lý service

```powershell
Stop-Service -Name Jenkins
Start-Service -Name Jenkins
Restart-Service -Name Jenkins
Get-Service -Name Jenkins
```

Hoặc dùng command line tương thích rộng:

```batch
sc.exe stop Jenkins
sc.exe start Jenkins
sc.exe query Jenkins
```

Sau khi đổi password của service account, cập nhật tab **Log On** trong `services.msc` bằng quy trình bảo mật của tổ chức, rồi restart và kiểm tra quyền truy cập `JENKINS_HOME`/network share.

---

## 7. Cấu hình Windows Firewall

### 7.1 Chỉ truy cập trên máy cục bộ

Nếu chỉ học trên chính máy Windows, mở:

```text
http://localhost:8080/
```

Thay `8080` bằng port đã chọn. Không cần tạo inbound firewall rule cho máy khác nếu chỉ dùng loopback.

Jenkins mặc định có thể lắng nghe trên mọi interface. Nếu reverse proxy chạy cùng máy, cân nhắc thêm `--httpListenAddress=127.0.0.1` trong phần `<arguments>` của `jenkins.xml`, sau khi backup file và dừng service. Restart Jenkins rồi xác nhận listener chỉ còn ở loopback.

### 7.2 Cho phép truy cập từ mạng nội bộ

Ví dụ chỉ cho subnet quản trị `10.20.0.0/16` truy cập port `8080` trên Domain profile:

```powershell
$Port = 8080
$AdminSubnet = '10.20.0.0/16'

New-NetFirewallRule `
  -DisplayName "Jenkins HTTP $Port - Admin subnet" `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort $Port `
  -RemoteAddress $AdminSubnet `
  -Profile Domain
```

Kiểm tra rule:

```powershell
Get-NetFirewallRule -DisplayName 'Jenkins HTTP 8080 - Admin subnet' |
  Get-NetFirewallPortFilter
```

<Callout type="warn" title="Không mở Any/Any trên Public profile">Thay subnet ví dụ bằng CIDR thật của reverse proxy hoặc mạng quản trị. Nếu Jenkins được đặt sau reverse proxy, firewall chỉ nên cho proxy truy cập backend port.</Callout>

---

## 8. Mở khóa và hoàn tất setup wizard

### 8.1 Lấy initialAdminPassword

Mở URL cục bộ và chờ trang **Unlock Jenkins**:

```text
http://localhost:8080/
```

Với installation directory mặc định, Jenkins hướng dẫn tìm file tại:

```text
C:\Program Files\Jenkins\secrets\initialAdminPassword
```

Nếu đã xác nhận `JENKINS_HOME` khác, file nằm tại:

```text
<JENKINS_HOME>\secrets\initialAdminPassword
```

Sao chép password thẳng vào clipboard để tránh in secret ra console:

```powershell
$InitialPasswordPath = 'C:\Program Files\Jenkins\secrets\initialAdminPassword'

if (-not (Test-Path $InitialPasswordPath)) {
  throw 'Không tìm thấy initialAdminPassword; kiểm tra JENKINS_HOME và jenkins.err/jenkins.out.'
}

(Get-Content $InitialPasswordPath -Raw).Trim() | Set-Clipboard
```

Dán giá trị vào trường **Administrator password**, chọn **Continue**, rồi xóa clipboard sau khi dùng:

```powershell
Set-Clipboard -Value ''
```

<Callout type="error" title="initialAdminPassword là secret tạm thời">Không chụp màn hình, commit, gửi qua chat hoặc dán password này vào ticket. Các chuỗi trong bài chỉ là đường dẫn và placeholder, không phải secret thật.</Callout>

### 8.2 Hoàn tất cấu hình ban đầu

<Steps>
  <Step>
    Chọn **Install suggested plugins** cho lab. Với production, rà soát plugin theo use case và chỉ cài tập tối thiểu đã được phê duyệt.
  </Step>
  <Step>
    Tạo admin user có tên riêng, password mạnh và email quản trị. Không tiếp tục dùng user bootstrap `admin` làm tài khoản dùng chung.
  </Step>
  <Step>
    Kiểm tra **Jenkins URL**. Lab có thể dùng URL cục bộ; production phải dùng URL HTTPS/DNS ổn định mà user và webhook thực sự truy cập.
  </Step>
  <Step>
    Chọn **Save and Finish**, sau đó đăng nhập lại bằng admin user vừa tạo.
  </Step>
</Steps>

Nếu plugin download thất bại, không vô hiệu hóa TLS verification. Hãy kiểm tra DNS, outbound `443`, proxy doanh nghiệp, certificate trust và đồng hồ hệ thống.

---

## 9. Kiểm tra sau cài đặt và đọc log

### 9.1 Kiểm tra nhanh bằng PowerShell

```powershell
$Port = 8080

Get-Service Jenkins
Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop
Test-NetConnection localhost -Port $Port

$response = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/login"
$response.StatusCode
```

Kỳ vọng:

- service ở trạng thái `Running`;
- có process lắng nghe đúng port/address;
- `TcpTestSucceeded` là `True`;
- HTTP trả `200` hoặc redirect hợp lệ tới trang đăng nhập.

Xác nhận version và Java runtime thật trong **Manage Jenkins → System Information**. Kết quả `java -version` trong terminal quản trị không chứng minh service đang dùng cùng Java.

### 9.2 Xem log Jenkins

Theo tài liệu Jenkins, MSI mặc định ghi log dưới `JENKINS_HOME` với tên `jenkins.out` và `jenkins.err`, trừ khi `jenkins.xml` đã tùy chỉnh. Một số bản cài có hậu tố `.log`, vì vậy hãy liệt kê file thực tế:

```powershell
$JenkinsHome = 'C:\path\confirmed-from-system-information'

$Logs = Get-ChildItem -Path $JenkinsHome -File -Force |
  Where-Object Name -Match '^jenkins\.(out|err)(\.log)?$'

$Logs | Select-Object FullName, Length, LastWriteTime
$Logs | ForEach-Object {
  "=== $($_.FullName) ==="
  Get-Content $_.FullName -Tail 100
}
```

Nếu chưa biết `JENKINS_HOME`, kiểm tra `jenkins.xml`, installation directory và thông báo lỗi của Windows Service Control Manager trong Event Viewer. Trong giao diện Jenkins, vào **Manage Jenkins → System Log** để tạo log recorder theo package khi cần chẩn đoán sâu.

Không bật debug log toàn cục lâu dài trên production. Log chi tiết làm tăng disk usage và có thể ghi dữ liệu nhạy cảm ngoài dự kiến.

---

## 10. Backup, nâng cấp và gỡ cài đặt

### 10.1 Backup nhất quán

Cách đơn giản và nhất quán cho controller nhỏ là dừng service rồi copy toàn bộ `JENKINS_HOME` sang storage được bảo vệ:

```powershell
$JenkinsHome = 'D:\JenkinsHome'
$BackupRoot = '\\backup-server\jenkins$'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Destination = Join-Path $BackupRoot "jenkins-home-$Stamp"

Stop-Service Jenkins
try {
  robocopy.exe $JenkinsHome $Destination /MIR /COPY:DAT /DCOPY:DAT /R:2 /W:2 /XJ
  if ($LASTEXITCODE -ge 8) {
    throw "Robocopy thất bại với exit code $LASTEXITCODE"
  }
} finally {
  Start-Service Jenkins
}

Get-Service Jenkins
```

Thay các đường dẫn bằng giá trị thật đã được phê duyệt. Tài khoản chạy lệnh backup phải có quyền tới đích; không cấp Jenkins service account quyền xóa toàn bộ kho backup nếu không cần.

Backup cần bao gồm cấu hình và secret key cần để giải mã credential khi restore. Mã hóa backup, giới hạn quyền đọc và lưu bản sao controller key theo quy trình tách biệt, an toàn. Quan trọng nhất là restore thử trên máy cô lập và port khác.

<Callout type="warn" title="Robocopy exit code 0–7 không nhất thiết là lỗi">Robocopy dùng nhiều exit code để báo file đã copy hoặc có khác biệt. Thông thường chỉ code từ `8` trở lên mới là failure. Script trên xử lý quy ước này.</Callout>

### 10.2 Nâng cấp Jenkins LTS

<Steps>
  <Step>
    Ghi lại Jenkins core, Java, plugin version, service account, `JENKINS_HOME`, port và nội dung `jenkins.xml` hiện tại.
  </Step>
  <Step>
    Đọc LTS Upgrade Guide cho **tất cả** các dòng bị bỏ qua. Kiểm tra Java Support Policy và plugin compatibility.
  </Step>
  <Step>
    Tạo backup nhất quán và chạy restore drill. Không xem file copy chưa từng restore là rollback plan.
  </Step>
  <Step>
    Tải MSI LTS mới từ Jenkins, rồi kiểm tra Authenticode và SHA-256 như phần 4.
  </Step>
  <Step>
    Thử nâng cấp trên staging clone. Kiểm tra login, plugin, agent, credential binding và các job quan trọng.
  </Step>
  <Step>
    Trong maintenance window, dừng build mới, chạy MSI nâng cấp bằng Administrator và giữ nguyên service account, port, Java/home đã xác nhận.
  </Step>
  <Step>
    Sau nâng cấp, kiểm tra service, log, version, agent và smoke-test job. Theo dõi disk/heap trước khi đóng maintenance window.
  </Step>
</Steps>

Không coi việc cài lại MSI cũ là rollback bảo đảm. Jenkins/plugin có thể đã migrate dữ liệu. Rollback đáng tin cậy là khôi phục **cả** core/plugin version tương thích và bản backup `JENKINS_HOME` đã kiểm thử.

### 10.3 Gỡ cài đặt

1. Dừng job và ghi lại `JENKINS_HOME` thực tế.
2. Backup nếu dữ liệu còn giá trị audit hoặc có khả năng cần restore.
3. Dừng Jenkins service.
4. Mở **Settings → Apps → Installed apps** hoặc `appwiz.cpl`, chọn Jenkins và **Uninstall**.
5. Kiểm tra service đã biến mất bằng `Get-Service Jenkins -ErrorAction SilentlyContinue`.
6. Chỉ xóa `JENKINS_HOME`, backup hoặc service account sau khi owner dữ liệu phê duyệt.
7. Xóa firewall rule đã tạo nếu không còn sử dụng.

Không giả định uninstaller sẽ xóa hoặc giữ data directory trong mọi phiên bản. Hãy kiểm tra filesystem sau khi gỡ và xử lý theo retention policy.

---

## 11. Troubleshooting

### 11.1 Service không khởi động

Thu thập trạng thái trước khi thay đổi cấu hình:

```powershell
Get-Service Jenkins
Get-CimInstance Win32_Service -Filter "Name='Jenkins'" |
  Select-Object State, StartMode, StartName, ExitCode, PathName
sc.exe queryex Jenkins
```

Sau đó kiểm tra theo thứ tự:

1. `jenkins.err`/`jenkins.out` hoặc biến thể `.log`;
2. Java path trong `jenkins.xml`;
3. password và quyền **Log on as a service**;
4. ACL của `JENKINS_HOME`;
5. port conflict;
6. cú pháp argument trong `jenkins.xml`.

Nếu vừa sửa `jenkins.xml`, khôi phục bản backup để xác nhận lỗi có đến từ thay đổi đó hay không.

### 11.2 Invalid service logon credentials

Lỗi này thường xuất hiện khi account/password sai hoặc thiếu **Log on as a service**.

- đăng nhập bằng account có quyền Administrator;
- chạy `secpol.msc`;
- mở **Local Policies → User Rights Assignment**;
- thêm account vào **Log on as a service**;
- kiểm tra account không nằm trong **Deny log on as a service**;
- áp dụng lại domain policy nếu quyền do GPO quản lý;
- chạy **Test Credentials** trong MSI lần nữa.

Nếu policy quay về trạng thái cũ sau `gpupdate`, hãy sửa GPO nguồn thay vì liên tục chỉnh local policy.

### 11.3 Port đã bị chiếm

```powershell
$Port = 8080
$Listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
$Listener

if ($Listener) {
  Get-Process -Id $Listener.OwningProcess
}
```

Dừng/chuyển port của ứng dụng xung đột hoặc chọn port Jenkins khác. Không terminate process lạ trước khi xác định owner và impact.

### 11.4 Java không hợp lệ

Dấu hiệu thường gặp là service dừng ngay, log báo unsupported Java hoặc MSI không chấp nhận Java home.

```powershell
Select-String -Path 'C:\Program Files\Jenkins\jenkins.xml' -Pattern 'java|jdk|jre'
& 'C:\Program Files\Eclipse Adoptium\jdk-21\bin\java.exe' -version
```

Đường dẫn ví dụ phải được thay bằng Java thực tế. Java home cần chứa `bin\java.exe`, đúng 64-bit và thuộc major version mà Jenkins release hỗ trợ.

Sau khi đổi Java, restart service và kiểm tra **Manage Jenkins → System Information**. Đừng chỉ dựa vào `PATH` của user đang đăng nhập.

### 11.5 Access denied với JENKINS_HOME hoặc network share

Kiểm tra service identity và ACL:

```powershell
Get-CimInstance Win32_Service -Filter "Name='Jenkins'" |
  Select-Object StartName

icacls.exe 'D:\JenkinsHome'
```

Ví dụ cấp quyền Modify kế thừa cho account riêng:

```powershell
icacls.exe 'D:\JenkinsHome' /grant 'DOMAIN\svc_jenkins:(OI)(CI)M'
```

Thay domain, user và path trước khi chạy. Không cấp `Everyone:F` để xử lý nhanh.

Nếu lỗi chỉ xảy ra với UNC share, kiểm tra cả share permission, NTFS ACL, DNS và danh tính domain. LocalSystem không thay thế một domain service account có quyền cụ thể trên share.

### 11.6 Không mở được giao diện hoặc không tải được plugin

Tách hai hướng kết nối:

<Tabs items={['Browser → Jenkins', 'Jenkins → Internet']}>
  <Tab value="Browser → Jenkins">
    Kiểm tra service, listener và firewall:

    ```powershell
    Test-NetConnection localhost -Port 8080
    Get-NetTCPConnection -State Listen -LocalPort 8080
    Get-NetFirewallRule -Enabled True | Where-Object DisplayName -Like '*Jenkins*'
    ```

    Nếu localhost chạy nhưng máy khác không vào được, kiểm tra firewall, network ACL và listen address.
  </Tab>
  <Tab value="Jenkins → Internet">
    Kiểm tra DNS, HTTPS và proxy từ controller:

    ```powershell
    Resolve-DnsName updates.jenkins.io
    Test-NetConnection updates.jenkins.io -Port 443
    Invoke-WebRequest -UseBasicParsing https://updates.jenkins.io/update-center.json
    ```

    Nếu tổ chức dùng TLS inspection, Java truststore của service phải tin CA doanh nghiệp theo policy. Không dùng tùy chọn bỏ kiểm tra certificate.
  </Tab>
</Tabs>

### 11.7 MSI không vượt qua bước xác minh

- tải lại bằng link bắt đầu từ trang Jenkins chính thức;
- kiểm tra thời gian hệ thống và Windows root certificate update;
- so sánh SHA-256 với đúng **cùng version** MSI;
- kiểm tra Authenticode status và publisher;
- đối chiếu thông báo thay đổi code signing trên trang download;
- báo security team nếu file tiếp tục sai.

Không cài file chỉ vì tên là `jenkins.msi` hoặc antivirus không phát hiện malware.

---

## 12. Hardening và bước tiếp theo

### 12.1 Baseline hardening

Sau khi cài thành công:

- dùng dedicated service account, không dùng LocalSystem cho production;
- giữ controller trên host chuyên dụng và đặt số executor của built-in node về `0`;
- đặt Jenkins sau reverse proxy HTTPS với DNS ổn định;
- giới hạn backend port bằng listen address, Windows Firewall và network ACL;
- không công khai UI trực tiếp ra Internet;
- tích hợp authentication phù hợp và cấp quyền least privilege;
- chỉ cài plugin có use case/owner rõ ràng, gỡ plugin không dùng;
- theo dõi Jenkins security advisories và cập nhật LTS/plugin có kiểm thử;
- bảo vệ `JENKINS_HOME`, backup và các key giải mã như dữ liệu nhạy cảm;
- cấu hình retention cho build log/artifact và cảnh báo free space;
- chạy build trên agent tách biệt theo trust boundary;
- ưu tiên inbound agent qua WebSocket/HTTPS nếu không cần mở TCP agent port riêng;
- không tạo antivirus exclusion rộng cho toàn bộ ổ đĩa; mọi exception phải tối thiểu và được security phê duyệt.

### 12.2 Checklist hoàn thành

- [ ] Đã xác nhận Windows và Java theo support policy hiện hành.
- [ ] Đã chọn Jenkins LTS, xác minh Authenticode và SHA-256.
- [ ] Service chạy bằng account dự kiến, không có quyền thừa.
- [ ] Port được test và firewall chỉ cho nguồn cần thiết.
- [ ] Đã xác định, ghi lại và bảo vệ `JENKINS_HOME` thật.
- [ ] Đã unlock, tạo admin user riêng và xóa clipboard chứa password tạm.
- [ ] Service, listener, HTTP response và log đều được kiểm tra.
- [ ] Có backup nhất quán, mã hóa và restore drill.
- [ ] Production dùng TLS, agent riêng và built-in node có `0` executor.
- [ ] Có owner cho patching, plugin, service account và capacity.

### 12.3 Học tiếp

<Cards>
  <Card href="/docs/installation/initial-setup/" title="Thiết lập ban đầu">
    Hoàn thiện admin user, plugin và Jenkins URL.
  </Card>
  <Card href="/docs/installation/reverse-proxy-tls/" title="Reverse Proxy & TLS">
    Đưa Jenkins sau HTTPS proxy cho production.
  </Card>
  <Card href="/docs/installation/upgrade/" title="Nâng cấp Jenkins">
    Lập kế hoạch upgrade và rollback có kiểm thử.
  </Card>
  <Card href="/docs/getting-started/requirements/" title="Yêu cầu hệ thống">
    Sizing controller, agent, storage và network.
  </Card>
</Cards>

---

## Tài liệu tham khảo

- [Installing Jenkins on Windows](https://www.jenkins.io/doc/book/installing/windows/)
- [Jenkins Download — Stable LTS](https://www.jenkins.io/download/)
- [Verifying Jenkins Downloads](https://www.jenkins.io/download/verify/)
- [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/)
- [Windows Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-windows/)
- [Initial Settings](https://www.jenkins.io/doc/book/installing/initial-settings/)
- [Viewing Jenkins Logs](https://www.jenkins.io/doc/book/system-administration/viewing-logs/)
- [Backing-up and Restoring Jenkins](https://www.jenkins.io/doc/book/system-administration/backing-up/)
- [Jenkins LTS Upgrade Guide](https://www.jenkins.io/doc/upgrade-guide/)
- [Securing Jenkins](https://www.jenkins.io/doc/book/security/)
