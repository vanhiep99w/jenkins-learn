---
title: "SSH Agents"
description: "Khởi chạy và vận hành Linux Jenkins agent qua SSH với credential tối thiểu, xác minh host key và quy trình xử lý sự cố an toàn."
---

SSH launcher cho phép Jenkins controller mở một phiên SSH đến Linux host đã được quản trị, khởi động tiến trình agent và dùng host đó để chạy build. Cách này phù hợp với agent permanent hoặc pool nhỏ có vòng đời ổn định; nó không biến SSH thành ranh giới bảo mật cho code build.

## Mục lục

- [SSH launcher hoạt động như thế nào](#ssh-launcher-hoạt-động-như-thế-nào)
  - [Kết nối SSH và Remoting](#kết-nối-ssh-và-remoting)
  - [Java của controller không phải toolchain build](#java-của-controller-không-phải-toolchain-build)
  - [Network firewall và giả định plugin](#network-firewall-và-giả-định-plugin)
- [Chuẩn bị host và identity](#chuẩn-bị-host-và-identity)
  - [Service account và remote root](#service-account-và-remote-root)
  - [Credential theo credentialsId](#credential-theo-credentialsid)
  - [Xác minh host key](#xác-minh-host-key)
  - [Kiểm tra Java trên agent](#kiểm-tra-java-trên-agent)
- [Cấu hình SSH launcher](#cấu-hình-ssh-launcher)
  - [Cấu hình node](#cấu-hình-node)
  - [Cấu hình launcher](#cấu-hình-launcher)
  - [Labels executors và toolchain](#labels-executors-và-toolchain)
- [Lab local sandbox](#lab-local-sandbox)
  - [Chuẩn bị sandbox](#chuẩn-bị-sandbox)
  - [Khởi tạo và cấu hình](#khởi-tạo-và-cấu-hình)
  - [Kết quả mong đợi](#kết-quả-mong-đợi)
- [Cô lập workload và vận hành bảo mật](#cô-lập-workload-và-vận-hành-bảo-mật)
- [Troubleshooting theo thứ tự](#troubleshooting-theo-thứ-tự)
  - [DNS port và authentication](#dns-port-và-authentication)
  - [Host key permissions Java và remote root](#host-key-permissions-java-và-remote-root)
  - [Reconnect và log](#reconnect-và-log)
- [Checklist trước khi đưa vào vận hành](#checklist-trước-khi-đưa-vào-vận-hành)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## SSH launcher hoạt động như thế nào

### Kết nối SSH và Remoting

Luồng SSH launch đi từ controller đến agent. Plugin **SSH Build Agents** xác thực phiên SSH bằng credential đã chọn, kiểm tra host key theo strategy đã cấu hình, rồi dùng shell từ xa để tìm Java và chạy `agent.jar`. `agent.jar` là chương trình Jenkins Remoting: nó tạo kênh điều khiển để controller cấp work cho agent và nhận log, trạng thái. Plugin có thể sao chép hoặc cập nhật JAR cần thiết trong phiên SSH; người vận hành không nên tải một JAR ngẫu nhiên từ Internet rồi chạy trên agent.

```text
┌──────────────┐  TCP 22 hoặc port SSH đã duyệt  ┌──────────────────┐
│ Controller   │ ─────────────────────────────► │ Linux agent      │
│ SSH launcher │  credential + host key check   │ service account  │
└──────┬───────┘                                 └────────┬─────────┘
       │                                                   │
       │ SSH channel                                       │ java -jar agent.jar
       └──────────── Jenkins Remoting ────────────────────┘
                         queue, work, log, trạng thái
```

`agent.jar` và Remoting là runtime để Jenkins điều phối agent, không phải một bước build của repository. Khi phiên SSH hoặc tiến trình Java từ xa mất, node thành `Offline`; executor đang chạy không được giả định sẽ tiếp tục an toàn sau reconnect. Kiểm tra trạng thái Pipeline, workspace và output trước khi retry.

### Java của controller không phải toolchain build

Controller và agent đều cần Java phù hợp với Jenkins LTS và plugin đang chạy. Kiểm tra [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/) trước khi nâng Jenkins hoặc JDK. Java trên agent phải có executable mà service account SSH có thể chạy; launcher có thể tự discovery hoặc dùng đường dẫn Java được cấu hình rõ.

Đó là **Java runtime của agent**, dùng để chạy `agent.jar`. Nó khác với toolchain của build. Ví dụ, agent có thể dùng Java 17 để chạy Remoting nhưng một job cần JDK 21, Maven hoặc Node.js. Cài, pin và kiểm chứng toolchain build theo policy riêng, rồi mô tả capability bằng label như `linux java21`. Không đổi Java của controller chỉ để sửa lỗi Maven trên agent.

### Network firewall và giả định plugin

SSH launch giả định controller có DNS/routing đến host agent và firewall trên host cho phép **nguồn là controller** đi vào port SSH đã phê duyệt, thường là TCP `22`. Không mở port SSH cho toàn Internet. Với SSH launcher thuần túy, không mở thêm inbound agent port chỉ để Remoting chạy: kênh launcher dùng phiên SSH đã xác thực. Nếu tổ chức dùng reverse proxy hoặc URL HTTPS của controller cho các chức năng khác, cấu hình TLS/DNS vẫn phải đúng; xem [Reverse proxy và TLS](/docs/installation/reverse-proxy-tls).

Plugin **SSH Build Agents**, Jenkins LTS, SSH server, Java runtime và policy authorization là các dependency riêng. Jenkins core không tự cài OpenSSH, tạo Linux user, quản lý firewall, hay cung cấp Maven/Docker cho host. Xác nhận plugin đã được phê duyệt, tương thích với Jenkins LTS và không bị vô hiệu hóa trước khi chọn launch method này.

<Callout type="warn" title="Không mở network để thử may mắn">
  Chỉ cho controller kết nối đến port SSH của pool agent. Nếu launch thất bại, đọc node log và kiểm tra DNS, route, firewall, credential, host key rồi Java; không mở rộng CIDR hay tắt kiểm tra host key để làm node Online.
</Callout>

## Chuẩn bị host và identity

### Service account và remote root

Tạo một Linux service account dành riêng, ví dụ `jenkins-agent`. Account này không cần quyền `root`, không nên có password đăng nhập tương tác và chỉ cần quyền chạy Java, đọc authorized key, ghi remote root và dùng đúng toolchain của pool. Hạn chế `sudo`; nếu build thật cần thao tác đặc quyền, tách nó sang cơ chế được review thay vì cấp `NOPASSWD: ALL` cho agent.

**Remote root directory** là thư mục gốc Jenkins dùng trên agent, ví dụ `/home/jenkins-agent/jenkins`. Đây thường là nơi đặt dữ liệu Remoting và workspace con. Directory phải tồn tại hoặc cho phép service account tạo ra, thuộc đúng user/group, có dung lượng, inode và chính sách cleanup/quota. Không đặt remote root dưới `/tmp`, home của người vận hành hoặc thư mục chia sẻ với release/untrusted build.

```bash
# Chạy trên host sandbox bằng tài khoản quản trị cục bộ, không phải trên controller.
sudo useradd --create-home --shell /bin/bash jenkins-agent
sudo install -d -o jenkins-agent -g jenkins-agent -m 0750 \
  /home/jenkins-agent/jenkins
sudo -u jenkins-agent test -w /home/jenkins-agent/jenkins
```

Lệnh trên chỉ minh họa cho sandbox Linux mới. Production nên tạo account, group, quota, package và authorized keys qua hệ thống quản trị cấu hình của tổ chức để có audit và trạng thái lặp lại được.

### Credential theo credentialsId

Trong **Manage Jenkins → Credentials**, tạo credential kiểu **SSH Username with private key** cho service account. Chỉ dùng private key của identity dành cho agent/pool này. Gán một ID có mục đích rõ ràng, ví dụ `linux-agent-ssh-lab`; Jenkins launcher tham chiếu ID qua trường `credentialsId`, không chép private key hoặc passphrase vào cấu hình node, Jenkinsfile hay shell history.

| Trường | Giá trị mẫu an toàn | Quy tắc vận hành |
| --- | --- | --- |
| `credentialsId` | `linux-agent-ssh-lab` | ID mô tả pool/mục đích, không phải giá trị bí mật. |
| Username | `jenkins-agent` | Khớp service account có quyền tối thiểu trên host. |
| Private key | Lưu trong Jenkins Credentials hoặc secret manager đã tích hợp | Không dán vào repository, ticket, console log hoặc command line. |
| Scope | Folder/controller scope hẹp nhất cần cho launcher | Không dùng một key Global cho mọi agent nếu pool có trust khác nhau. |
| Rotation | Owner, ngày kiểm tra và quy trình thay key | Thử key mới trên canary, thu hồi key cũ sau chuyển đổi. |

Public key tương ứng chỉ được thêm vào `~jenkins-agent/.ssh/authorized_keys` trên những host thuộc pool. Có thể giới hạn key theo nguồn controller, command hoặc policy SSH nếu cách làm đó đã được đội hạ tầng kiểm thử; đừng thêm giới hạn làm launcher không thể khởi động Java rồi bỏ kiểm soát đó khi lỗi. Credential launcher không phải credential mà Pipeline được cấp. Không cho job PR/fork dùng hoặc đọc credential SSH của launcher chỉ vì nó đưa agent online.

### Xác minh host key

Host key chứng minh SSH server đang nói chuyện là host đã được phê duyệt. Nếu controller chấp nhận bất kỳ host key nào, một DNS sai, IP bị tái sử dụng hoặc kẻ trung gian có thể nhận credential và giả agent. Vì vậy, chỉ chọn strategy xác minh có dữ liệu tin cậy:

- **Known hosts file verification**: quản trị một file known hosts trên controller có entry hostname/IP và host key đã xác nhận. Bảo vệ quyền đọc/sửa file như cấu hình security, và cập nhật nó có review khi host được thay thế.
- **Manually provided keys verification**: nhập public host key hoặc fingerprint đã được phê duyệt trong launcher. Lấy giá trị từ console/provisioning record đáng tin cậy, không chỉ từ phiên SSH đầu tiên trên đường mạng chưa tin cậy.

Ví dụ kiểm tra fingerprint trên **console của sandbox host** trước khi cấu hình Jenkins:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
# So khớp SHA256 fingerprint với inventory hoặc record provisioning đã phê duyệt.
```

Nếu cần tạo candidate known-host entry cho lab, chỉ quét endpoint local đã kiểm soát rồi so sánh fingerprint với nguồn độc lập trước khi phê duyệt:

```bash
ssh-keyscan -t ed25519 agent-lab.local > known_hosts.candidate
ssh-keygen -lf known_hosts.candidate
# Chỉ chép entry vào known hosts sau khi fingerprint khớp record đã phê duyệt.
```

<Callout type="error" title="Không dùng Accept any host key">
  Không chọn strategy không xác minh host key, không dùng `StrictHostKeyChecking=no`, và không xóa known-host entry để vượt lỗi fingerprint. Khi key thay đổi ngoài kế hoạch, dừng launch, xác minh sự kiện thay host hoặc dấu hiệu tấn công, rồi cập nhật key qua quy trình phê duyệt.
</Callout>

### Kiểm tra Java trên agent

Kiểm tra bằng đúng service account mà SSH launcher dùng. Thành công của `java -version` khi chạy bằng account quản trị không chứng minh account agent có `PATH`, quyền execute hoặc version tương thích.

```bash
sudo -u jenkins-agent sh -lc 'command -v java && java -version'
sudo -u jenkins-agent sh -lc 'test -w /home/jenkins-agent/jenkins'
```

Nếu Java nằm ngoài `PATH` của non-interactive SSH session, cấu hình **JavaPath** bằng đường dẫn tuyệt đối đã xác minh, chẳng hạn `/usr/bin/java`. Không suy đoán đường dẫn từ shell profile; launcher thường chạy non-interactive và không đọc toàn bộ profile của người dùng. Cài JDK/JRE tương thích với policy Jenkins trước, rồi kiểm tra lại bằng account service.

## Cấu hình SSH launcher

### Cấu hình node

Vào **Manage Jenkins → Nodes → New Node**, chọn permanent node và điền các giá trị tương ứng với pool đã chuẩn bị.

| Trường node | Ví dụ lab | Ý nghĩa |
| --- | --- | --- |
| Node name | `ssh-linux-lab-01` | Tên inventory dễ audit, không dùng làm label chung. |
| Remote root directory | `/home/jenkins-agent/jenkins` | Directory agent có ownership, quota và cleanup đã kiểm tra. |
| Labels | `linux ssh-lab java17` | Contract năng lực; tách label trust như `untrusted-pr` khỏi `trusted-release`. |
| Number of executors | `1` | Điểm khởi đầu an toàn cho lab; không tương đương một CPU core. |
| Usage | Theo policy pool | Hạn chế node đặc biệt chỉ nhận job có label khi cần. |

Số executor là số allocation Jenkins đồng thời, không phải cấu hình CPU. Bắt đầu thấp, đo CPU/RAM/disk/I/O và queue của chính pool rồi mới tăng. Quy tắc đặt label và sizing nằm tại [Labels & Executors](/docs/agents/labels-executors).

### Cấu hình launcher

1. Chọn **Launch agents via SSH**. Nếu mục này không xuất hiện, xác nhận plugin **SSH Build Agents** đã cài và tương thích thay vì thay đổi launch method tùy tiện.
2. Điền hostname có trong DNS/inventory, port SSH đã phê duyệt và `credentialsId`/credential `linux-agent-ssh-lab`. Username phải là service account, không phải tài khoản quản trị cá nhân.
3. Chọn **Known hosts file verification** hoặc **Manually provided keys verification**. Dùng entry/fingerprint đã kiểm tra ở phần trước. Không chọn tùy chọn không xác minh.
4. Giữ JavaPath trống để plugin discovery chỉ khi `java` của service account đã đúng. Nếu không, điền path tuyệt đối đã kiểm tra như `/usr/bin/java`.
5. Lưu, chọn **Launch agent**, rồi mở node log. Chỉ gán workload sau khi log cho thấy host key được xác minh, Java khởi động và node đạt `Online`.

Một controller quản lý bằng Configuration as Code vẫn phải mang cùng ý định: hostname, port, `credentialsId`, remote root và strategy xác minh host key. Schema chính xác phụ thuộc phiên bản plugin; dùng export/schema hoặc validation trên controller của tổ chức thay vì sao chép một YAML không khớp phiên bản.

### Labels executors và toolchain

Label định tuyến một job đến capability phù hợp, còn executor là giới hạn concurrency của node. Ví dụ `linux && java21 && ssh-lab` không cài JDK 21; nó chỉ yêu cầu Jenkins tìm agent đã được kiểm chứng có contract đó. Toolchain build cần được pin/kiểm tra riêng bằng image, package policy hoặc tool configuration.

```groovy
pipeline {
  agent none

  stages {
    stage('Kiểm tra agent sandbox') {
      agent { label 'linux && ssh-lab && java17' }
      steps {
        sh '''
          set -eu
          printf 'node=%s\\n' "$NODE_NAME"
          java -version
          test -w "$WORKSPACE"
        '''
      }
    }
  }
}
```

Ví dụ không checkout repository, không dùng credential Pipeline và chỉ in metadata/version Java. Với job thật, chọn label theo toolchain và trust tier, không dùng `agent any` để che thiếu JDK hay capacity. Xem [Chọn agent cho Pipeline](/docs/pipelines/agents) và [Credentials trong Pipeline](/docs/pipelines/credentials).

## Lab local sandbox

Lab này dùng một controller học tập và Linux VM/container local có SSH server do bạn kiểm soát. Không dùng production controller, public IP, private key production, Docker socket, repository không tin cậy hoặc secret deploy. Nếu cần dựng controller lab, xem [Cài Jenkins với Docker](/docs/installation/docker) hoặc [cài Jenkins trên Linux](/docs/installation/linux).

### Chuẩn bị sandbox

<Steps>
<Step>

**Chuẩn bị host.** Tạo Linux sandbox `agent-lab.local`, một service account `jenkins-agent`, remote root `/home/jenkins-agent/jenkins`, Java tương thích và SSH server. Cho firewall chỉ nhận port SSH từ IP của controller lab.

</Step>
<Step>

**Tạo identity lab.** Administrator tạo một SSH key pair dành riêng cho lab, nhập **private key** vào Jenkins Credentials với ID `linux-agent-ssh-lab`, rồi cài **public key** vào `authorized_keys` của `jenkins-agent`. Không gửi private key/passphrase qua chat, commit hoặc log.

```bash
# Trên sandbox host; thay nội dung trong ngoặc bằng public key của credential lab.
sudo install -d -o jenkins-agent -g jenkins-agent -m 0700 /home/jenkins-agent/.ssh
sudo sh -c 'printf "%s\\n" "<public-key-của-credential-lab>" >> /home/jenkins-agent/.ssh/authorized_keys'
sudo chown jenkins-agent:jenkins-agent /home/jenkins-agent/.ssh/authorized_keys
sudo chmod 0600 /home/jenkins-agent/.ssh/authorized_keys
```

</Step>
<Step>

**Chốt host key.** Trên console/provisioning record của host, lấy fingerprint ED25519 và đối chiếu độc lập. Thêm entry đã phê duyệt vào known hosts của controller lab hoặc nhập public host key vào strategy manual.

</Step>
<Step>

**Tạo node và launch.** Tạo node theo phần [Cấu hình node](#cấu-hình-node), chọn `Launch agents via SSH`, dùng credential ID lab, strategy host key đã xác minh và `1` executor. Lưu rồi xem node log đến khi node `Online`.

</Step>
</Steps>

### Khởi tạo và cấu hình

Tạo Pipeline job không liên kết SCM, dán Jenkinsfile ở phần [Labels executors và toolchain](#labels-executors-và-toolchain), rồi chọn **Build Now**. Khi muốn quan sát queue, chạy hai build gần nhau và giữ thêm `sleep 45` trong stage sandbox. Không thêm credential vào job.

Nếu agent không online, dừng lab tại đó. Đọc log và xử lý theo thứ tự ở phần [Troubleshooting theo thứ tự](#troubleshooting-theo-thứ-tự); không đổi sang user `root`, accept-any-host hoặc tắt firewall để tiếp tục.

### Kết quả mong đợi

| Quan sát | Kết quả đúng |
| --- | --- |
| Node log | SSH host key được xác minh, Java được phát hiện/khởi động và Remoting kết nối. |
| Trang Nodes | `ssh-linux-lab-01` là `Online`, có labels `linux ssh-lab java17` và 1 executor. |
| Console Pipeline | Có tên node, Java version và không có secret, private key hay password. |
| Hai build khi có `sleep 45` | Build đầu giữ executor; build thứ hai chờ trong Build Queue rồi chạy khi executor được trả. |
| Sau lab | Đặt node tạm offline, chờ build kết thúc, xóa node sandbox và rotate/thu hồi credential lab theo policy nếu lab kết thúc. |

## Cô lập workload và vận hành bảo mật

SSH chỉ xác thực đường điều khiển từ controller đến host. Khi agent nhận Pipeline, repository, dependency và script có thể chạy với quyền của service account. Vì vậy một SSH agent dùng chung không phù hợp để trộn workload untrusted, pull request từ fork và release có credential/egress đặc quyền.

- Đặt built-in node/controller ở `0` executor trong production. Không chạy code build trên controller.
- Tách pool, Linux user hoặc tốt hơn là VM/agent ephemeral theo trust tier. Workspace, cache và home directory dùng chung không phải security boundary.
- PR/fork chỉ vào pool sandbox không có credential deploy, SSH key launcher có thể tái sử dụng, Docker socket đặc quyền hoặc route production. Chỉ cấp secret ở stage/branch đáng tin cậy với scope hẹp.
- Credential launcher cần owner, inventory host, quyền tối thiểu và lịch rotation. Khi nghi ngờ lộ key, gỡ public key/thu hồi credential, tạo identity mới và điều tra log trước khi launch lại.
- Khi thay host, drain node trước, bảo toàn bằng chứng cần thiết, xác minh host key mới qua kênh độc lập rồi mới cập nhật known hosts/fingerprint và đưa node Online.

<Callout type="warn" title="Label không phải ACL">
  Label `trusted-release` chỉ là điều kiện scheduler. Isolation thực tế cần account, filesystem, network, IAM, credential scope và policy SCM riêng. Không cho PR/fork vào release agent chỉ vì Jenkinsfile có label “đúng”.
</Callout>

## Troubleshooting theo thứ tự

Đọc **Manage Jenkins → Nodes → _tên node_ → Log** trước mỗi thay đổi. Ghi thời điểm, hostname, port và lỗi nguyên văn, nhưng không đính kèm private key, passphrase, password hay dump environment vào ticket. Chỉ sửa một nguyên nhân đã được kiểm chứng rồi launch lại.

### DNS port và authentication

| Thứ tự | Kiểm tra | Cách xử lý an toàn |
| --- | --- | --- |
| 1. DNS | Hostname trong node có phân giải từ controller đến IP inventory dự kiến không? | Sửa DNS/inventory hoặc hostname node. Không đổi tùy tiện sang IP public chưa được phê duyệt. |
| 2. Port và route | Controller có route đến port SSH được phép và firewall chỉ cho controller không? | Mở đúng rule hẹp cho controller → agent hoặc sửa port cấu hình; không mở `0.0.0.0/0`. |
| 3. Authentication | `credentialsId` có tồn tại, username có khớp service account và public key có trong `authorized_keys` không? | Sửa scope/permission credential hoặc ownership authorized_keys. Không dùng password người dùng hay tài khoản `root` để thử. |

Lỗi DNS thường xuất hiện trước kết nối SSH. Timeout/refused sau DNS thường là route, security group, firewall, sshd hoặc port sai. `Permission denied (publickey)` thường yêu cầu đối chiếu username, public key, file mode, credential scope và authorization; nó không chứng minh cần đổi sang password.

### Host key permissions Java và remote root

| Thứ tự | Kiểm tra | Cách xử lý an toàn |
| --- | --- | --- |
| 4. Host key | Fingerprint trong launcher/known hosts có khớp record đã phê duyệt không? | Nếu khác, dừng. Xác minh host replacement hoặc incident qua kênh độc lập rồi cập nhật entry có review. |
| 5. Permissions | Service account có thể đọc `.ssh/authorized_keys`, chạy Java và ghi remote root không? | Sửa owner/mode tối thiểu của home, `.ssh`, authorized_keys và remote root; không cấp writable toàn hệ thống. |
| 6. Java | Node log tìm thấy Java nào, version có được Jenkins LTS hỗ trợ và launcher shell có chạy được không? | Cài Java tương thích hoặc đặt JavaPath tuyệt đối đã kiểm tra với service account. |
| 7. Remote root | Path có tồn tại, disk/inode/quota còn và không bị mount read-only/full không? | Tạo/chown directory dành riêng, giải phóng theo policy hoặc tăng quota có review; không đổi sang `/tmp` để né lỗi. |

Lỗi `java: not found`, version không tương thích hoặc `Cannot run program` nằm ở runtime agent, không phải bằng chứng toolchain build bị thiếu. Lỗi tạo workspace, permission denied hoặc disk full cần được xử lý trên remote root trước khi retry build.

### Reconnect và log

Sau khi sửa một lỗi, dùng **Launch agent** hoặc reconnect theo launcher policy, rồi xác nhận node log có host-key verification, Java launch và Remoting channel thành công. Tiếp theo chạy một Pipeline canary không có secret. Reconnect chỉ khôi phục kênh điều khiển; không tự khôi phục process build, lock, workspace hay artifact của build bị gián đoạn.

Nếu node lặp lại `Offline`/`Online`, đối chiếu node log với controller service log, sshd audit log của agent, DNS/network event, CPU/RAM/OOM, disk và thay đổi Java/plugin gần cùng thời điểm. Với controller chạy như service, log hệ điều hành như `journalctl -u jenkins` có thể hữu ích nếu policy cho phép. Không bật debug SSH hay verbose log trong stage có secret; thu thập metadata và thời điểm trước.

## Checklist trước khi đưa vào vận hành

- [ ] Controller, Jenkins LTS, SSH Build Agents plugin và Java runtime agent đã được kiểm tra tương thích.
- [ ] Controller chỉ có route đến port SSH đã duyệt trên agent; firewall không mở rộng hơn cần thiết.
- [ ] Mỗi agent/pool dùng service account không phải root, remote root riêng có owner, quota, disk và cleanup rõ ràng.
- [ ] SSH credential được tham chiếu qua `credentialsId`, có scope tối thiểu, owner, mục đích, inventory host và lịch rotation.
- [ ] Public key chỉ có trên authorized_keys của host/pool cần thiết; private key/passphrase không có trong repository, log, Jenkinsfile hay command line.
- [ ] Known hosts hoặc manually provided approved host key đã được xác minh độc lập; không có strategy accept-any-host.
- [ ] Java được kiểm tra bằng chính service account; JavaPath chỉ dùng đường dẫn tuyệt đối đã xác minh; toolchain build được quản lý riêng.
- [ ] Labels mô tả capability/trust tier đã kiểm chứng; executor được sizing theo dữ liệu, không theo số CPU đơn lẻ.
- [ ] PR/fork untrusted không dùng chung agent/user/workspace/cache/credential/network với release hoặc production.
- [ ] Node log, controller log và telemetry host có owner; quy trình reconnect, canary, drain, key rotation và host replacement đã được thử trong sandbox.

## Nguồn Jenkins chính thức

- [Using Jenkins agents](https://www.jenkins.io/doc/book/using/using-agents/) — mô hình agent, executor và kết nối phân tán.
- [Managing nodes](https://www.jenkins.io/doc/book/managing/nodes/) — tạo, cấu hình và quan sát node.
- [SSH Build Agents plugin](https://plugins.jenkins.io/ssh-slaves/) — launcher SSH, cấu hình host key và dependency plugin.
- [Jenkins Remoting](https://www.jenkins.io/doc/book/security/remoting/) — kênh Remoting và các cân nhắc bảo mật.
- [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/) — Java được Jenkins hỗ trợ.
- [Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — credential store, scope và permission.
- [Securing Jenkins](https://www.jenkins.io/doc/book/security/) — authorization, hardening và vận hành an toàn.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn lại controller, job, Pipeline và agent trong Jenkins." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu queue, workspace và ranh giới controller–agent." />
  <Card title="Yêu cầu hệ thống" href="/docs/getting-started/requirements" description="Đối chiếu Java, storage và network trước khi mở rộng agent." />
  <Card title="Labels & Executors" href="/docs/agents/labels-executors" description="Định tuyến workload và sizing capacity theo pool." />
</Cards>
