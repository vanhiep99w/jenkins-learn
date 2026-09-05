---
title: "Cài Jenkins trên Linux"
description: "Cài Jenkins LTS và Java 21 từ repository chính thức trên Debian, Ubuntu, RHEL hoặc Fedora, sau đó vận hành service an toàn."
---

<Callout type="info" title="Phạm vi hướng dẫn">
  Bài này cài **Jenkins controller** bằng package chính thức và quản lý bằng `systemd`. Các lệnh dùng release line **LTS** phù hợp cho người mới và đa số môi trường production.
</Callout>

## Mục lục

- [1. Chọn Jenkins LTS và Java](#1-chọn-jenkins-lts-và-java)
  - [1.1 Chọn Jenkins LTS](#11-chọn-jenkins-lts)
  - [1.2 Chọn Java 21](#12-chọn-java-21)
- [2. Yêu cầu hệ thống và chuẩn bị](#2-yêu-cầu-hệ-thống-và-chuẩn-bị)
  - [2.1 Tài nguyên phần cứng](#21-tài-nguyên-phần-cứng)
  - [2.2 Điều kiện trước khi cài](#22-điều-kiện-trước-khi-cài)
- [3. Cài Jenkins từ repository chính thức](#3-cài-jenkins-từ-repository-chính-thức)
- [4. Khởi động và mở cổng 8080](#4-khởi-động-và-mở-cổng-8080)
  - [4.1 Khởi động service](#41-khởi-động-service)
  - [4.2 Cấu hình firewall](#42-cấu-hình-firewall)
  - [4.3 Xác minh Jenkins đang lắng nghe](#43-xác-minh-jenkins-đang-lắng-nghe)
- [5. Unlock Jenkins và hoàn tất thiết lập](#5-unlock-jenkins-và-hoàn-tất-thiết-lập)
- [6. Vận hành service và đường dẫn quan trọng](#6-vận-hành-service-và-đường-dẫn-quan-trọng)
  - [6.1 Các lệnh systemd thường dùng](#61-các-lệnh-systemd-thường-dùng)
  - [6.2 Các đường dẫn cần biết](#62-các-đường-dẫn-cần-biết)
  - [6.3 Thay đổi cổng bằng systemd override](#63-thay-đổi-cổng-bằng-systemd-override)
- [7. Cập nhật Jenkins an toàn](#7-cập-nhật-jenkins-an-toàn)
- [8. Gỡ cài đặt](#8-gỡ-cài-đặt)
- [9. Hardening cơ bản cho production](#9-hardening-cơ-bản-cho-production)
- [10. Troubleshooting](#10-troubleshooting)
  - [10.1 Jenkins không khởi động](#101-jenkins-không-khởi-động)
  - [10.2 Lỗi repository hoặc signing key](#102-lỗi-repository-hoặc-signing-key)
  - [10.3 Truy cập từ xa thất bại](#103-truy-cập-từ-xa-thất-bại)
  - [10.4 Hết dung lượng hoặc lỗi quyền](#104-hết-dung-lượng-hoặc-lỗi-quyền)
- [11. Bước tiếp theo](#11-bước-tiếp-theo)
- [Checklist hoàn thành](#checklist-hoàn-thành)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## 1. Chọn Jenkins LTS và Java

### 1.1 Chọn Jenkins LTS

Jenkins phát hành theo hai release line:

| Release line | Đặc điểm | Nên dùng khi |
|---|---|---|
| **LTS** | Nhận một bản ổn định mới theo chu kỳ và có hướng dẫn nâng cấp riêng | Lab, học tập và đa số hệ thống production |
| **Weekly** | Nhận tính năng và thay đổi sớm hơn | Thử nghiệm tính năng mới hoặc phát triển plugin |

Hướng dẫn này dùng repository `debian-stable` và `rpm-stable`. Package manager sẽ cài bản LTS hiện hành từ Jenkins, nên không cần hard-code số phiên bản vào lệnh.

<Callout type="idea" title="Khuyến nghị">
  Dùng LTS cho controller. Trước mỗi lần nâng cấp, đọc changelog, LTS Upgrade Guide và yêu cầu Java của phiên bản đích.
</Callout>

### 1.2 Chọn Java 21

Jenkins chạy trên Java, nhưng Java dùng để chạy controller không bắt buộc phải giống JDK dùng để build ứng dụng. Theo hướng dẫn cài Linux hiện hành của Jenkins, hãy dùng **OpenJDK 21** làm runtime mặc định.

Kiểm tra Java sau khi cài:

```bash
java -version
```

Kết quả phải cho thấy major version `21`. Không tiếp tục nếu lệnh không tồn tại hoặc đang trỏ tới một Java không được phiên bản Jenkins đích hỗ trợ.

<Callout type="warn" title="Cài Java trước Jenkins trên Debian và Ubuntu">
  Jenkins khuyến nghị cài Java trước. Nếu cài Jenkins trước rồi mới thêm Java, service có thể báo `failed to find a valid Java installation`.
</Callout>

---

## 2. Yêu cầu hệ thống và chuẩn bị

### 2.1 Tài nguyên phần cứng

Mức tối thiểu chính thức chỉ phù hợp để Jenkins khởi động:

- RAM: `256 MB`;
- dung lượng đĩa: `1 GB`.

Với một nhóm nhỏ, Jenkins khuyến nghị điểm khởi đầu:

- RAM: `4 GB` trở lên;
- dung lượng đĩa: `50 GB` trở lên.

Dung lượng thực tế phụ thuộc số plugin, job, build history và artifact. Controller production nên dành tài nguyên cho điều phối, giao diện và lưu cấu hình. Không chạy workload build nặng trực tiếp trên controller; hãy dùng agent riêng.

### 2.2 Điều kiện trước khi cài

Máy chủ cần có:

- bản Linux 64-bit còn được nhà cung cấp hỗ trợ;
- `systemd`;
- tài khoản có quyền `sudo`;
- DNS và kết nối HTTPS ra `pkg.jenkins.io`;
- port TCP `8080` chưa bị process khác chiếm;
- đồng hồ hệ thống đồng bộ;
- đủ dung lượng cho `/var/lib/jenkins`;
- một trình duyệt trên máy quản trị để hoàn tất setup wizard.

Kiểm tra nhanh hệ điều hành, kiến trúc, bộ nhớ, đĩa và port:

```bash
cat /etc/os-release
uname -m
free -h
df -h /var/lib 2>/dev/null || df -h /
sudo ss -ltnp | grep ':8080' || true
```

Nếu dòng cuối không in kết quả, thường chưa có process lắng nghe trên port `8080`.

<Callout type="warn" title="Không cài trên hệ điều hành đã hết vòng đời">
  Jenkins chỉ hỗ trợ đầy đủ các bản Linux còn được nhà cung cấp hệ điều hành duy trì. Production cần kế hoạch vá OS, Java, Jenkins core và plugin độc lập nhưng phối hợp với nhau.
</Callout>

---

## 3. Cài Jenkins từ repository chính thức

Chọn đúng tab cho hệ điều hành. Các lệnh chỉ cấu hình **LTS repository** chính thức.

<Tabs items={['Debian / Ubuntu', 'RHEL / Fedora']}>
  <Tab value="Debian / Ubuntu">
    <Steps>
      <Step>
        **1. Cài Java 21 và công cụ tải key**

        ```bash
        sudo apt update
        sudo apt install fontconfig openjdk-21-jre wget
        java -version
        ```

        Nếu distribution repository không có `openjdk-21-jre`, hãy cài JRE/JDK 21 từ nhà cung cấp được Jenkins hỗ trợ, chẳng hạn Eclipse Temurin, rồi chạy lại `java -version`. Không thay bằng Java cũ chỉ để lệnh cài thành công.
      </Step>

      <Step>
        **2. Thêm signing key và LTS repository**

        ```bash
        sudo install -m 0755 -d /etc/apt/keyrings
        sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc \
          https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
        sudo chmod 0644 /etc/apt/keyrings/jenkins-keyring.asc

        echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" \
          | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
        ```

        Key hiện hành có fingerprint:

        ```text
        5E38 6EAD B55F 0150 4CAE  8BCF 7198 F4B7 14AB FC68
        ```

        Cú pháp `signed-by` giới hạn key này cho Jenkins repository. Không dùng `apt-key`, vì cơ chế đó đã cũ và cấp phạm vi tin cậy rộng hơn cần thiết.
      </Step>

      <Step>
        **3. Làm mới package index và cài Jenkins**

        ```bash
        sudo apt update
        apt-cache policy jenkins
        sudo apt install jenkins
        ```

        Trong kết quả `apt-cache policy`, candidate phải đến từ `https://pkg.jenkins.io/debian-stable`.
      </Step>
    </Steps>
  </Tab>

  <Tab value="RHEL / Fedora">
    <Steps>
      <Step>
        **1. Cài Java 21 và công cụ tải repository**

        Các lệnh áp dụng cho Fedora và các bản RHEL tương thích như RHEL, Rocky Linux, AlmaLinux hoặc Oracle Linux:

        ```bash
        sudo dnf install fontconfig java-21-openjdk wget
        java -version
        ```
      </Step>

      <Step>
        **2. Thêm LTS repository chính thức**

        ```bash
        sudo wget -O /etc/yum.repos.d/jenkins.repo \
          https://pkg.jenkins.io/rpm-stable/jenkins.repo
        sudo chmod 0644 /etc/yum.repos.d/jenkins.repo

        grep -E '^(baseurl|gpgkey|gpgcheck|repo_gpgcheck)=' \
          /etc/yum.repos.d/jenkins.repo
        ```

        Repository hiện hành bật cả `gpgcheck=1` và `repo_gpgcheck=1`. Dòng `gpgkey` phải trỏ tới key dưới `https://pkg.jenkins.io/rpm-stable/`. Khi DNF yêu cầu xác nhận import key, đối chiếu fingerprint:

        ```text
        5E38 6EAD B55F 0150 4CAE  8BCF 7198 F4B7 14AB FC68
        ```
      </Step>

      <Step>
        **3. Cài Jenkins**

        ```bash
        sudo dnf clean expire-cache
        sudo dnf repolist --enabled
        sudo dnf install jenkins
        sudo systemctl daemon-reload
        ```

        Đọc origin và fingerprint mà DNF hiển thị trước khi chấp nhận. Không xử lý lỗi chữ ký bằng cách đặt `gpgcheck=0` hoặc `repo_gpgcheck=0`.
      </Step>
    </Steps>
  </Tab>
</Tabs>

Sau khi cài, package tạo user hệ thống `jenkins`, khai báo service `jenkins.service`, đặt `JENKINS_HOME` mặc định tại `/var/lib/jenkins` và cấu hình HTTP port mặc định là `8080`.

---

## 4. Khởi động và mở cổng 8080

### 4.1 Khởi động service

Bật Jenkins ngay bây giờ và tự động khởi động cùng hệ điều hành:

```bash
sudo systemctl enable --now jenkins
sudo systemctl is-enabled jenkins
sudo systemctl is-active jenkins
```

Kết quả mong đợi của hai lệnh cuối là `enabled` và `active`. Xem trạng thái chi tiết nếu service chưa chạy:

```bash
sudo systemctl status jenkins --no-pager --full
sudo journalctl -u jenkins.service -n 100 --no-pager
```

### 4.2 Cấu hình firewall

Chỉ chạy tab tương ứng nếu firewall đó đang được sử dụng.

<Tabs items={['UFW', 'firewalld']}>
  <Tab value="UFW">
    Kiểm tra trạng thái rồi mở port cho bài lab:

    ```bash
    sudo ufw status verbose
    sudo ufw allow 8080/tcp
    sudo ufw status numbered
    ```
  </Tab>

  <Tab value="firewalld">
    Kiểm tra zone đang hoạt động rồi mở port trong zone mặc định:

    ```bash
    sudo firewall-cmd --get-active-zones
    sudo firewall-cmd --permanent --add-port=8080/tcp
    sudo firewall-cmd --reload
    sudo firewall-cmd --list-ports
    ```
  </Tab>
</Tabs>

Nếu máy chạy trên cloud, còn phải cấu hình security group, network security rule hoặc firewall bên ngoài máy chủ.

<Callout type="warn" title="Production không nên public port 8080">
  Các lệnh trên mở `8080/tcp` theo phạm vi mặc định của firewall. Với production, chỉ cho phép mạng quản trị hoặc reverse proxy truy cập port này. Đặt Jenkins sau HTTPS và không mở `8080` trực tiếp ra Internet.
</Callout>

Jenkins còn có TCP port cho inbound agent, nhưng không cần mở port đó để hoàn thành bài này. Chỉ mở khi bạn đã cấu hình một port cố định và thực sự dùng inbound TCP agent.

### 4.3 Xác minh Jenkins đang lắng nghe

Trên server:

```bash
sudo ss -ltnp | grep ':8080'
```

Nếu có `curl`, kiểm tra HTTP cục bộ:

```bash
curl --head http://127.0.0.1:8080/login
```

Sau đó mở một trong các URL sau trên trình duyệt:

```text
http://localhost:8080
http://SERVER_IP:8080
```

Dùng `localhost` khi trình duyệt chạy cùng server. Với máy khác, thay `SERVER_IP` bằng IP hoặc DNS của Jenkins server.

---

## 5. Unlock Jenkins và hoàn tất thiết lập

Ở lần khởi động đầu tiên, Jenkins tạo một mật khẩu dùng một lần trong `JENKINS_HOME`. Đọc mật khẩu trên terminal tin cậy:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

<Steps>
  <Step>
    **1. Mở trang Unlock Jenkins**

    Truy cập `http://SERVER_IP:8080` và chờ trang **Unlock Jenkins** xuất hiện.
  </Step>

  <Step>
    **2. Nhập initial admin password**

    Dán giá trị vừa đọc vào trường **Administrator password**, rồi chọn **Continue**. Không gửi mật khẩu này qua chat, ticket hoặc log dùng chung.
  </Step>

  <Step>
    **3. Cài plugin có chọn lọc**

    Người mới có thể chọn **Install suggested plugins**. Production nên chỉ giữ plugin thực sự cần và đưa plugin vào quy trình cập nhật, kiểm thử, sao lưu.
  </Step>

  <Step>
    **4. Tạo admin user riêng**

    Tạo tài khoản quản trị đầu tiên với mật khẩu mạnh. Không tiếp tục dùng tài khoản mặc định hoặc chia sẻ một tài khoản admin cho cả nhóm.
  </Step>

  <Step>
    **5. Kiểm tra Jenkins URL**

    Đặt URL đúng với địa chỉ người dùng sẽ truy cập. Nếu sẽ dùng reverse proxy và HTTPS, hoàn thiện cấu hình đó trước khi đưa URL production vào webhook hoặc integration.
  </Step>
</Steps>

Hướng dẫn chi tiết tiếp tục ở trang [Thiết lập ban đầu](/docs/installation/initial-setup/).

---

## 6. Vận hành service và đường dẫn quan trọng

### 6.1 Các lệnh systemd thường dùng

| Mục đích | Lệnh |
|---|---|
| Xem trạng thái | `sudo systemctl status jenkins --no-pager --full` |
| Khởi động | `sudo systemctl start jenkins` |
| Dừng | `sudo systemctl stop jenkins` |
| Khởi động lại | `sudo systemctl restart jenkins` |
| Bật khi boot | `sudo systemctl enable jenkins` |
| Xem log gần nhất | `sudo journalctl -u jenkins.service -n 100 --no-pager` |
| Theo dõi log trực tiếp | `sudo journalctl -u jenkins.service -f` |
| Xem unit và override | `sudo systemctl cat jenkins` |
| Xem cấu hình đã áp dụng | `sudo systemctl show jenkins --property=Environment` |

Package Linux hiện đại ghi console log vào `systemd-journald`. Vì vậy, hãy dùng `journalctl` thay vì mặc định đi tìm `/var/log/jenkins/jenkins.log`.

### 6.2 Các đường dẫn cần biết

| Đường dẫn | Vai trò | Lưu ý |
|---|---|---|
| `/var/lib/jenkins` | `JENKINS_HOME`: cấu hình, plugin, job, build history và secret | Phải backup nhất quán; chứa dữ liệu nhạy cảm |
| `/var/lib/jenkins/secrets/initialAdminPassword` | Mật khẩu unlock lần đầu | Chỉ đọc trên terminal tin cậy |
| `/etc/apt/sources.list.d/jenkins.list` | APT repository trên Debian/Ubuntu | Dùng `debian-stable` trong bài này |
| `/etc/apt/keyrings/jenkins-keyring.asc` | APT signing key dành riêng cho Jenkins | Không thay bằng `apt-key` |
| `/etc/yum.repos.d/jenkins.repo` | DNF repository trên RHEL/Fedora | Giữ `gpgcheck` và `repo_gpgcheck` được bật |
| `/etc/systemd/system/jenkins.service.d/override.conf` | Cấu hình override do quản trị viên tạo | Không bị package upgrade ghi đè |
| `/lib/systemd/system/jenkins.service` | Vendor unit thường gặp trên Debian/Ubuntu | Chỉ đọc; dùng `systemctl edit jenkins` để override |
| `/usr/lib/systemd/system/jenkins.service` | Vendor unit thường gặp trên RHEL/Fedora | Chỉ đọc; dùng `systemctl edit jenkins` để override |

`systemctl cat jenkins` là nguồn chính xác nhất để biết unit file và giá trị đang áp dụng trên chính máy của bạn.

<Callout type="error" title="Không sửa trực tiếp vendor unit">
  File dưới `/lib/systemd/system` hoặc `/usr/lib/systemd/system` có thể bị package upgrade thay thế. Luôn tạo drop-in bằng `sudo systemctl edit jenkins`.
</Callout>

### 6.3 Thay đổi cổng bằng systemd override

Ví dụ đổi HTTP port từ `8080` sang `8081`:

```bash
sudo systemctl edit jenkins
```

Nhập nội dung:

```ini
[Service]
Environment="JENKINS_PORT=8081"
```

Lưu file, sau đó áp dụng và kiểm tra:

```bash
sudo systemctl restart jenkins
sudo systemctl status jenkins --no-pager --full
sudo ss -ltnp | grep ':8081'
```

Đồng thời cập nhật firewall, reverse proxy, health check và Jenkins URL. `systemctl edit` tự reload unit; nếu tự tạo drop-in bằng công cụ khác, chạy `sudo systemctl daemon-reload` trước khi restart.

---

## 7. Cập nhật Jenkins an toàn

Không cập nhật controller production như một package độc lập mà bỏ qua Java, plugin và khả năng rollback. Quy trình tối thiểu:

1. đọc [LTS changelog](https://www.jenkins.io/changelog-stable/), [LTS Upgrade Guide](https://www.jenkins.io/doc/upgrade-guide/) và Java Support Policy;
2. kiểm tra plugin quan trọng tương thích với bản đích;
3. thông báo maintenance window và dừng nhận build mới;
4. backup toàn bộ `/var/lib/jenkins`, bao gồm secret, rồi kiểm tra khả năng restore;
5. ghi lại package version, Java version và danh sách plugin hiện tại;
6. cập nhật trên staging trước nếu Jenkins phục vụ workload quan trọng;
7. cập nhật package, theo dõi log và chạy smoke test;
8. chỉ nâng plugin theo kế hoạch đã kiểm thử.

Kiểm tra version trước khi cập nhật:

```bash
java -version
jenkins --version
sudo systemctl status jenkins --no-pager
```

<Tabs items={['Debian / Ubuntu', 'RHEL / Fedora']}>
  <Tab value="Debian / Ubuntu">
    ```bash
    sudo apt update
    apt-cache policy jenkins
    sudo apt install --only-upgrade jenkins
    sudo systemctl status jenkins --no-pager --full
    ```
  </Tab>

  <Tab value="RHEL / Fedora">
    ```bash
    sudo dnf --refresh list --upgrades jenkins
    sudo dnf upgrade jenkins
    sudo systemctl status jenkins --no-pager --full
    ```
  </Tab>
</Tabs>

Sau nâng cấp, kiểm tra:

```bash
jenkins --version
sudo journalctl -u jenkins.service -n 200 --no-pager
```

Sau đó xác nhận đăng nhập, queue, agent connection, credential integration và một Pipeline đại diện đều hoạt động.

<Callout type="warn" title="Backup chứa secret">
  Bản sao `JENKINS_HOME` có credential và encryption key. Mã hóa backup, giới hạn quyền đọc, tách khỏi server Jenkins và kiểm thử restore định kỳ.
</Callout>

Xem quy trình đầy đủ tại [Nâng cấp Jenkins](/docs/installation/upgrade/).

---

## 8. Gỡ cài đặt

Trước khi gỡ, backup `/var/lib/jenkins` nếu có khả năng cần khôi phục job, credential hoặc lịch sử build.

<Tabs items={['Debian / Ubuntu', 'RHEL / Fedora']}>
  <Tab value="Debian / Ubuntu">
    ```bash
    sudo systemctl disable --now jenkins
    sudo apt remove jenkins
    ```
  </Tab>

  <Tab value="RHEL / Fedora">
    ```bash
    sudo systemctl disable --now jenkins
    sudo dnf remove jenkins
    ```
  </Tab>
</Tabs>

Lệnh gỡ package không phải là quy trình xóa dữ liệu an toàn. Sau khi gỡ, kiểm tra riêng các vị trí sau trước khi quyết định lưu trữ hoặc xóa:

```bash
sudo test -d /var/lib/jenkins && sudo du -sh /var/lib/jenkins
sudo test -d /etc/systemd/system/jenkins.service.d \
  && sudo ls -la /etc/systemd/system/jenkins.service.d
```

Repository cũng là cấu hình riêng. Chỉ xóa file repository/key nếu máy không còn dùng Jenkins và chính sách vận hành yêu cầu. Không chạy lệnh xóa đệ quy với `/var/lib/jenkins` cho đến khi đã xác nhận backup, đúng đường dẫn và đúng server.

---

## 9. Hardening cơ bản cho production

Checklist tối thiểu trước khi đưa controller vào sử dụng thật:

- [ ] **Không public port 8080.** Chỉ cho reverse proxy hoặc mạng quản trị truy cập.
- [ ] **Bật HTTPS.** Terminate TLS tại reverse proxy/load balancer và cấu hình forwarded headers đúng.
- [ ] **Giữ authentication và authorization.** Tắt anonymous access nếu không có yêu cầu rõ ràng; cấp quyền theo nguyên tắc tối thiểu.
- [ ] **Không dùng chung admin account.** Tích hợp identity provider phù hợp và giữ tài khoản khôi phục được kiểm soát.
- [ ] **Không chạy build trên controller.** Đặt executor của built-in node về `0`, dùng agent tách biệt.
- [ ] **Cài ít plugin nhất có thể.** Gỡ plugin không dùng và theo dõi security advisory.
- [ ] **Cập nhật có kiểm thử.** Vá OS, Java, Jenkins core và plugin theo maintenance window.
- [ ] **Backup và restore.** Mã hóa bản sao `JENKINS_HOME`, lưu ngoài server và diễn tập khôi phục.
- [ ] **Bảo vệ secret.** Không đặt password/token trong command line, job log, repository hoặc systemd unit có quyền đọc quá rộng.
- [ ] **Giám sát.** Theo dõi service, disk/inode, heap, queue, executor, agent và lỗi đăng nhập.
- [ ] **Giới hạn outbound network.** Chỉ cho controller/agent truy cập package, plugin, SCM và dịch vụ thực sự cần.
- [ ] **Không tắt SELinux để chữa lỗi.** Đọc AVC denial và bổ sung policy tối thiểu nếu cần.

Khi đặt reverse proxy cùng máy, có thể bind Jenkins vào loopback bằng systemd override:

```bash
sudo systemctl edit jenkins
```

```ini
[Service]
Environment="JENKINS_OPTS=--httpListenAddress=127.0.0.1"
```

Nếu đã có `JENKINS_OPTS`, hãy giữ các option hiện tại trên cùng dòng thay vì ghi đè mất chúng. Sau thay đổi:

```bash
sudo systemctl restart jenkins
sudo ss -ltnp | grep ':8080'
```

Kết quả phải cho thấy Jenkins chỉ lắng nghe trên `127.0.0.1:8080`. Cấu hình reverse proxy trước để tránh mất đường truy cập.

---

## 10. Troubleshooting

Bắt đầu bằng bốn lệnh sau thay vì đoán:

```bash
sudo systemctl status jenkins --no-pager --full
sudo journalctl -u jenkins.service -b -n 200 --no-pager
java -version
sudo systemctl cat jenkins
```

### 10.1 Jenkins không khởi động

| Dấu hiệu | Kiểm tra | Hướng xử lý |
|---|---|---|
| `failed to find a valid Java installation` | `java -version` và `sudo -u jenkins java -version` | Cài Java 21 được hỗ trợ, kiểm tra `PATH`/Java override, rồi restart |
| `UnsupportedClassVersionError` hoặc báo Java không hỗ trợ | So sánh Jenkins version với Java Support Policy | Nâng Java lên bản được Jenkins đích hỗ trợ; không hạ Jenkins tùy tiện |
| `Address already in use` | `sudo ss -ltnp \| grep ':8080'` | Dừng process xung đột hoặc đổi `JENKINS_PORT`, rồi cập nhật firewall/proxy |
| Service timeout khi khởi động | `sudo journalctl -u jenkins.service -f` | Kiểm tra plugin lỗi, I/O chậm và tài nguyên; không tăng timeout trước khi biết nguyên nhân |
| Process bị kill | `sudo journalctl -k -b \| grep -i -E 'oom|killed process'` | Kiểm tra OOM, tăng tài nguyên hợp lý và chuyển build sang agent |

Sau mỗi thay đổi:

```bash
sudo systemctl restart jenkins
sudo systemctl is-active jenkins
sudo journalctl -u jenkins.service -n 100 --no-pager
```

### 10.2 Lỗi repository hoặc signing key

Với Debian/Ubuntu, xác nhận URL và key file:

```bash
cat /etc/apt/sources.list.d/jenkins.list
sudo ls -l /etc/apt/keyrings/jenkins-keyring.asc
sudo apt update
```

Source phải dùng `debian-stable`, `signed-by` và HTTPS. Nếu key cũ/hỏng, tải lại từ trang package chính thức. Không bỏ `signed-by` để né lỗi.

Với RHEL/Fedora:

```bash
cat /etc/yum.repos.d/jenkins.repo
sudo dnf clean expire-cache
sudo dnf makecache --refresh
```

Giữ `gpgcheck=1` và `repo_gpgcheck=1`. Nếu fingerprint từ repository không khớp nguồn Jenkins chính thức, dừng cài đặt và xác minh lại DNS, proxy, URL cùng thông báo đổi key của Jenkins.

### 10.3 Truy cập từ xa thất bại

Chẩn đoán theo thứ tự:

1. `systemctl is-active jenkins` phải trả `active`;
2. `curl --head http://127.0.0.1:8080/login` phải nhận phản hồi HTTP;
3. `ss` phải cho thấy Jenkins bind đúng địa chỉ;
4. firewall trên server phải cho phép nguồn quản trị;
5. security group, ACL, load balancer và route bên ngoài phải cho phép kết nối;
6. reverse proxy phải chuyển đúng host, port và forwarded headers.

Nếu local truy cập được nhưng remote không được, Jenkins thường đã chạy; lỗi nằm ở bind address hoặc lớp mạng/firewall. Không tắt toàn bộ firewall để kiểm tra trên production.

### 10.4 Hết dung lượng hoặc lỗi quyền

Kiểm tra filesystem và inode:

```bash
df -h /var/lib/jenkins
df -i /var/lib/jenkins
sudo du -xhd1 /var/lib/jenkins | sort -h
sudo ls -ld /var/lib/jenkins
sudo namei -l /var/lib/jenkins
```

Các nguyên nhân thường gặp:

- build history hoặc artifact tăng không giới hạn;
- workspace/cache nằm trên controller;
- backup được ghi vào cùng filesystem rồi làm đầy đĩa;
- restore bằng `root` làm sai owner;
- mount chứa `JENKINS_HOME` chưa sẵn sàng khi service khởi động.

Không chạy `chown -R` theo phản xạ. Trước tiên xác định file nào sai owner và vì sao. Package mặc định chạy service bằng user `jenkins`; quyền thực tế có thể xem bằng:

```bash
sudo systemctl show jenkins --property=User,Group,Environment
```

Nếu SELinux chặn truy cập, đọc denial thay vì tắt SELinux:

```bash
sudo ausearch -m AVC -ts recent
```

---

## 11. Bước tiếp theo

Sau khi service ổn định và bạn đã truy cập được trang unlock, tiếp tục theo thứ tự:

<Cards>
  <Card href="/docs/installation/initial-setup/" title="Thiết lập ban đầu">
    Unlock Jenkins, cài plugin và tạo tài khoản quản trị đầu tiên.
  </Card>
  <Card href="/docs/installation/reverse-proxy-tls/" title="Reverse Proxy và TLS">
    Đưa Jenkins sau HTTPS và không public port 8080.
  </Card>
  <Card href="/docs/security/controller-hardening/" title="Hardening controller">
    Giảm bề mặt tấn công và bảo vệ Jenkins controller.
  </Card>
  <Card href="/docs/agents/overview/" title="Jenkins Agent">
    Tách workload build khỏi controller.
  </Card>
  <Card href="/docs/installation/upgrade/" title="Nâng cấp Jenkins">
    Lập kế hoạch backup, kiểm tra tương thích và rollback.
  </Card>
</Cards>

---

## Checklist hoàn thành

- [ ] Đã chọn Jenkins LTS và cài Java 21 trước Jenkins.
- [ ] Repository trỏ đúng `debian-stable` hoặc `rpm-stable` qua HTTPS.
- [ ] Signing key có fingerprint đúng và kiểm tra chữ ký không bị tắt.
- [ ] `jenkins.service` ở trạng thái `enabled` và `active`.
- [ ] Jenkins lắng nghe trên port dự kiến.
- [ ] Firewall chỉ cho phép phạm vi cần thiết.
- [ ] Đã đọc `initialAdminPassword` trên terminal tin cậy và tạo admin user riêng.
- [ ] Biết dùng `journalctl` và `systemctl cat jenkins` để chẩn đoán.
- [ ] Đã xác định chiến lược backup/restore cho `/var/lib/jenkins`.
- [ ] Production có kế hoạch HTTPS, least privilege, agent riêng và cập nhật định kỳ.

---

## Tài liệu tham khảo

- [Jenkins — Installing Jenkins on Linux](https://www.jenkins.io/doc/book/installing/linux/)
- [Jenkins Debian LTS Packages](https://pkg.jenkins.io/debian-stable/)
- [Jenkins RPM LTS Packages](https://pkg.jenkins.io/rpm-stable/)
- [Jenkins Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/)
- [Jenkins Linux Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-linux/)
- [Jenkins Managing systemd Services](https://www.jenkins.io/doc/book/system-administration/systemd-services/)
- [Jenkins Hardware Recommendations](https://www.jenkins.io/doc/book/scaling/hardware-recommendations/)
- [Jenkins Securing Jenkins](https://www.jenkins.io/doc/book/security/)
- [Jenkins LTS Upgrade Guide](https://www.jenkins.io/doc/upgrade-guide/)
