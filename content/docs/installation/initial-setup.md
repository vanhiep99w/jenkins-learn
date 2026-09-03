---
title: "Thiết lập ban đầu"
description: "Unlock Jenkins an toàn, chọn plugin có kiểm soát, tạo danh tính quản trị và hoàn tất cấu hình instance đầu tiên."
---

<Callout type="info" title="Phạm vi">
  Trang này bắt đầu sau khi Jenkins controller đã khởi động và trình duyệt hiển thị **Unlock Jenkins**. Nội dung áp dụng cho local lab lẫn baseline production: mở khóa bằng bootstrap credential, chọn plugin, tạo admin và đặt URL public. Nó không thay thế cấu hình TLS, identity provider, backup hoặc phân quyền chi tiết của tổ chức.
</Callout>

Lần khởi động đầu tiên là một ranh giới bảo mật quan trọng. `initialAdminPassword` chỉ giúp chứng minh người thực hiện có quyền đọc `JENKINS_HOME`; nó không phải credential vận hành lâu dài. Hoàn thành wizard từ một máy quản trị tin cậy, không chia sẻ màn hình hoặc log có secret, và không mở trực tiếp controller production ra Internet.

## Mục lục

- [Phạm vi và ranh giới bảo mật](#phạm-vi-và-ranh-giới-bảo-mật)
- [Luồng setup wizard](#luồng-setup-wizard)
- [Unlock Jenkins bằng initial admin password](#unlock-jenkins-bằng-initial-admin-password)
  - [Vị trí và quyền của file](#vị-trí-và-quyền-của-file)
  - [Đọc và nhập secret an toàn](#đọc-và-nhập-secret-an-toàn)
- [Chọn plugin và Update Center](#chọn-plugin-và-update-center)
  - [Suggested plugins không phải cam kết tương thích](#suggested-plugins-không-phải-cam-kết-tương-thích)
  - [Plugin tối thiểu và kế hoạch thay đổi](#plugin-tối-thiểu-và-kế-hoạch-thay-đổi)
  - [Mạng bị chặn, proxy và cài offline](#mạng-bị-chặn-proxy-và-cài-offline)
- [Tạo admin account và phân quyền](#tạo-admin-account-và-phân-quyền)
  - [Bootstrap credential khác authorization production](#bootstrap-credential-khác-authorization-production)
  - [Danh tính, least privilege và khôi phục](#danh-tính-least-privilege-và-khôi-phục)
- [Cấu hình Jenkins URL và instance](#cấu-hình-jenkins-url-và-instance)
  - [JENKINS_HOME và dữ liệu bền vững](#jenkins_home-và-dữ-liệu-bền-vững)
  - [URL, context path và reverse proxy](#url-context-path-và-reverse-proxy)
  - [Thời gian và các lỗi cấu hình thường gặp](#thời-gian-và-các-lỗi-cấu-hình-thường-gặp)
- [Lab local Docker: unlock đến admin](#lab-local-docker-unlock-đến-admin)
  - [Chuẩn bị và khởi chạy](#chuẩn-bị-và-khởi-chạy)
  - [Hoàn tất wizard và xác minh](#hoàn-tất-wizard-và-xác-minh)
  - [Cleanup giữ nguyên dữ liệu](#cleanup-giữ-nguyên-dữ-liệu)
- [Checklist trước khi cho người dùng truy cập](#checklist-trước-khi-cho-người-dùng-truy-cập)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Phạm vi và ranh giới bảo mật

Setup wizard tạo trạng thái ban đầu trong controller. Người có thể đọc `JENKINS_HOME` thường có thể đọc job, cấu hình và các vật liệu mã hóa credential; vì vậy đây là quyền quản trị hạ tầng, không phải quyền hỗ trợ thông thường. Dùng một kênh quản trị đã được bảo vệ để thực hiện wizard và ghi nhận người thực hiện theo quy trình thay đổi của đội.

<Callout type="warn" title="Không dùng wizard như một shortcut production">
  Không gửi `initialAdminPassword` qua chat, email, ticket, clipboard đồng bộ, ảnh chụp màn hình hoặc Console Output. Không đặt password/token vào URL, biến môi trường, shell history hay file cấu hình của job. Nếu nghi ngờ secret đã lộ, coi đó là sự cố bảo mật: giới hạn truy cập, tạo lại credential phù hợp và điều tra đường lộ.
</Callout>

Trước khi tiếp tục, bảo đảm controller chỉ có đường truy cập dự kiến: `localhost` cho lab, hoặc mạng quản trị/reverse proxy TLS cho production. Đọc [Yêu cầu hệ thống](/docs/getting-started/requirements) nếu chưa xác minh Java, dung lượng và network; phần khái niệm controller–agent nằm tại [Kiến trúc Jenkins](/docs/getting-started/architecture).

## Luồng setup wizard

Wizard có thể khác nhẹ theo Jenkins core, plugin và phương thức cài đặt, nhưng luồng an toàn không thay đổi:

```text
JENKINS_HOME trên host/volume
          │
          ▼
initialAdminPassword ──► Unlock Jenkins ──► plugin có kiểm soát
                                                    │
                                                    ▼
                                     admin account riêng + recovery
                                                    │
                                                    ▼
                             Jenkins URL khớp URL người dùng thực sự dùng
```

Sau wizard, xác minh đăng nhập bằng admin riêng. Sau đó đưa cấu hình authentication và authorization production vào hiệu lực trước khi mở rộng quyền cho người dùng hoặc kết nối webhook, SCM và agent.

## Unlock Jenkins bằng initial admin password

### Vị trí và quyền của file

Jenkins tạo `initialAdminPassword` trong thư mục `secrets` của `JENKINS_HOME` khi setup wizard còn cần unlock. File chứa giá trị ngẫu nhiên dùng một lần để mở trang đầu tiên; tên file không phải là password và không được thay thế bằng password do người dùng tự đặt.

| Cách cài              | `JENKINS_HOME` thường dùng          | File cần đọc                                     | Ai nên đọc                                   |
| --------------------- | ----------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| Linux package         | `/var/lib/jenkins`                  | `/var/lib/jenkins/secrets/initialAdminPassword`  | Quản trị viên có quyền `sudo` được phê duyệt |
| Official Docker image | `/var/jenkins_home` trong container | `/var/jenkins_home/secrets/initialAdminPassword` | Người quản trị Docker/volume được phê duyệt  |

Với package Linux, service thường chạy user hệ thống `jenkins`. Với official Docker image Linux, process Jenkins thường chạy UID/GID `1000:1000`. Các giá trị thực tế có thể thay đổi theo image, service override hoặc storage driver; kiểm tra trên chính instance thay vì đoán. File secret và mọi thư mục cha chỉ nên cho phép service account cùng nhóm quản trị được ủy quyền truy cập. Không sửa ownership hoặc dùng `chmod 777` để chữa lỗi đọc file.

`JENKINS_HOME` không chỉ có password bootstrap. Nó còn chứa cấu hình global, plugin, job, build history, credential đã mã hóa và key liên quan. Vì vậy bind mount, named volume và backup của nó cần quyền chặt chẽ, encryption phù hợp và quy trình restore đã kiểm thử. Xem hướng dẫn cài đặt tương ứng tại [Docker](/docs/installation/docker) hoặc [Linux](/docs/installation/linux).

### Đọc và nhập secret an toàn

Từ terminal quản trị riêng tư, đọc giá trị trực tiếp để dán ngay vào trình duyệt. Các lệnh dưới đây **không chứa secret thật**; output chỉ được xem trên terminal tin cậy, không redirect ra file hay công cụ ghi log.

**Linux package**

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

**Docker container**

Thay `jenkins-lab` bằng tên container đã xác minh của bạn:

```bash
docker exec jenkins-lab \
  cat /var/jenkins_home/secrets/initialAdminPassword
```

<Steps>
  <Step>

### Mở trang unlock qua đường truy cập đúng

Dùng URL controller đã giới hạn, chẳng hạn `http://localhost:8080` cho lab. Production nên đi qua hostname HTTPS dự kiến sau reverse proxy, không qua một IP nội bộ tạm thời nếu URL đó sẽ được dùng lâu dài.

  </Step>
  <Step>

### Nhập secret một lần

Dán giá trị vào **Administrator password** rồi chọn **Continue**. Không đặt giá trị vào command substitution, shell variable, ticket hoặc tài liệu. Xóa clipboard theo policy của hệ điều hành sau khi nhập.

  </Step>
  <Step>

### Xử lý lỗi bằng quan sát, không bằng cấp quyền rộng

Nếu file không tồn tại, Jenkins có thể chưa khởi tạo xong, `JENKINS_HOME` mount sai hoặc startup đã lỗi. Đọc service/container log và xác minh mount trước. Nếu gặp `Permission denied`, kiểm tra owner, mode, ACL và SELinux/AppArmor của đúng home; không chạy controller bằng `root` lâu dài và không mở quyền đệ quy.

  </Step>
</Steps>

Sau khi tạo admin riêng, không cần lưu bootstrap secret “để dự phòng”. Khả năng khôi phục cần dựa trên identity/recovery account được kiểm soát và backup `JENKINS_HOME` được bảo vệ, không dựa vào việc phát tán mật khẩu unlock.

## Chọn plugin và Update Center

### Suggested plugins không phải cam kết tương thích

**Install suggested plugins** là tập plugin tiện dụng mà setup wizard đề xuất để bắt đầu. Lựa chọn này giảm số thao tác cho lab, nhưng không chứng minh mọi plugin sẽ tải, cài, khởi động hoặc tương thích với Jenkins core của instance. Kết quả còn phụ thuộc phiên bản Jenkins, Java, dependency plugin, Update Center, DNS/proxy, TLS/CA và chính sách mạng tại thời điểm cài.

Với lab có Internet kiểm soát được, có thể chọn **Install suggested plugins** rồi đọc danh sách và lỗi hiển thị trong wizard. Với production hoặc môi trường bị kiểm soát thay đổi, chọn **Select plugins to install** hoặc tiếp tục không cài plugin, sau đó đưa plugin qua quy trình review và kiểm thử. Cả hai đường đều hợp lệ; không chọn suggested chỉ vì coi nó là baseline bảo mật.

<Callout type="warn" title="Không hứa trước khi kiểm tra">
  Đừng cam kết một plugin sẽ cài được chỉ dựa trên tên hoặc danh sách suggested. Trước change production, xác minh Jenkins LTS/Java đích, version và dependency của plugin, security advisory, khả năng truy cập Update Center và rollback. Jenkins core có thể từ chối plugin không đáp ứng yêu cầu version.
</Callout>

### Plugin tối thiểu và kế hoạch thay đổi

Nguyên tắc an toàn là cài ít plugin nhất đáp ứng use case hiện tại. Mỗi plugin là code chạy trong controller và có dependency, quyền, bề mặt cập nhật riêng. Chẳng hạn, một job Freestyle checkout Git thường cần Git plugin và Git CLI trên agent; Pipeline cần các plugin Pipeline phù hợp. Đừng cài plugin cho Docker, Kubernetes, cloud hoặc report khi chưa có workload và ranh giới quyền rõ ràng.

Trước mỗi plugin mới, ghi nhận tối thiểu:

- mục đích nghiệp vụ và job/folder cần dùng;
- Jenkins core và Java đang chạy, version plugin/dependency đã kiểm tra;
- nguồn lấy plugin chính thức, checksum/chữ ký nếu quy trình nội bộ yêu cầu;
- quyền hoặc network access plugin tạo thêm;
- kiểm thử trên lab/staging, cửa sổ thay đổi và cách rollback bằng backup đã xác minh.

Sau wizard, dùng **Manage Jenkins → Plugins** để xem installed, available và update. UI hoặc nhãn có thể khác theo bản Jenkins. Không cập nhật đồng loạt core và toàn bộ plugin trên production chỉ để hết cảnh báo; tách change, đọc release/security advisory và có đường rollback. Phần [Job đầu tiên](/docs/getting-started/first-job) chỉ rõ plugin/tool cần cho lab Git, còn [Pipeline](/docs/pipelines/overview) giúp xác định plugin cần thiết trước khi triển khai Pipeline.

### Mạng bị chặn, proxy và cài offline

Update Center cần outbound HTTPS và DNS đúng tới các endpoint Jenkins/plugin cần dùng. Khi wizard không tải được metadata hoặc plugin, kiểm tra network policy và proxy trước; không tắt TLS verification, không dùng `curl -k`, và không thay URL Update Center bằng mirror chưa được tổ chức phê duyệt.

- **Proxy:** cấu hình proxy theo policy của tổ chức trong phần quản lý plugin/advanced settings hoặc System Configuration, bao gồm `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` khi môi trường container/service của bạn yêu cầu. `NO_PROXY` phải bao gồm các địa chỉ nội bộ cần đi thẳng, như controller hoặc metadata service; giá trị chính xác phụ thuộc topology. Dùng CA nội bộ đáng tin thay vì bỏ qua kiểm tra certificate.
- **Offline hoặc air-gapped:** tải metadata và file plugin từ nguồn Jenkins chính thức bằng một máy được phê duyệt, quét/lưu vết artifact rồi chuyển qua kênh nội bộ được kiểm soát. Cài plugin qua UI/manual upload hoặc image/bundle đã được tổ chức phê duyệt. Phải đưa cả dependency tương thích; một file `.hpi` đơn lẻ không bảo đảm plugin sẽ hoạt động.
- **Sau khi cài:** đọc trạng thái cài đặt, dependency và yêu cầu restart. Chỉ restart trong cửa sổ thay đổi và xác minh login, agent cùng một smoke test sau đó. Không “thử lại liên tục” vào production khi Update Center hay proxy đang lỗi.

## Tạo admin account và phân quyền

### Bootstrap credential khác authorization production

Wizard yêu cầu tạo tài khoản quản trị đầu tiên. Tạo một danh tính cá nhân có tên truy vết được, mật khẩu mạnh do password manager quản lý, MFA qua identity provider nếu mô hình authentication hỗ trợ, và email/nhóm ownership rõ ràng. Không dùng `admin`, không dùng account chia sẻ, và không gắn password thật vào ví dụ, script hoặc Jenkinsfile.

`initialAdminPassword` là **bootstrap credential**: nó chỉ mở khóa setup wizard trong lần khởi tạo. Tài khoản admin mới là một **identity** dùng để đăng nhập. Còn authorization production là chính sách quyết định identity hoặc group nào được xem, build, configure, quản lý credential hay administer Jenkins. Tạo admin trong wizard không tự tạo least privilege cho các user sau đó.

Sau khi wizard hoàn tất, cấu hình rõ authentication và authorization trong **Manage Jenkins → Security** theo thiết kế của tổ chức. Dùng role/group từ identity provider hoặc authorization strategy phù hợp, tách quyền quản trị controller khỏi quyền sửa job, và chỉ cấp `Configure`/`Credentials` cho người cần thiết. Người có quyền cấu hình job có thể biến cấu hình thành đường thực thi code; coi quyền này là đặc quyền.

### Danh tính, least privilege và khôi phục

Một mô hình khởi điểm có thể gồm các vai trò sau; tên và permission cụ thể phải được review theo use case:

| Vai trò               | Cấp tối thiểu nên xem xét                                 | Không nên có mặc định                                 |
| --------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| Jenkins administrator | Quản trị hệ thống, plugin và security theo change control | Account dùng chung hoặc quyền từ source không tin cậy |
| Team maintainer       | Quản lý job/folder của chính team                         | Quản trị global, plugin và credential ngoài phạm vi   |
| Developer/viewer      | Xem và chạy các job được cấp                              | Sửa global config hoặc đọc credential                 |
| Automation identity   | Chỉ API/job/folder cần thiết, credential riêng có expiry  | Quyền admin hoặc token cá nhân của nhân viên          |

Chuẩn bị ít nhất hai đường khôi phục được kiểm soát: ví dụ hai administrator cá nhân độc lập, hoặc một break-glass account theo policy có password lưu trong vault và audit bắt buộc. Nếu dùng SSO, kiểm tra trước rằng sự cố identity provider không làm mất toàn bộ quyền quản trị. Review định kỳ danh sách admin, owner của account recovery, token/API key và quyền group; thu hồi quyền khi nhân sự hoặc nhiệm vụ thay đổi.

<Callout type="error" title="Không thay least privilege bằng một shared admin">
  Một tài khoản chung làm mất audit trail, khó rotate và mở rộng blast radius. Nếu cần automation, tạo service identity riêng với scope hẹp thay vì chia sẻ credential administrator.
</Callout>

Credential của Pipeline/job phải được tạo với scope hẹp, quyền nguồn thấp nhất và rotation. Học tiếp tại [Credentials trong Pipeline](/docs/pipelines/credentials) và [Pipeline agents](/docs/pipelines/agents); không cho source không tin cậy chạy trên controller chỉ vì wizard đã tạo admin.

## Cấu hình Jenkins URL và instance

### JENKINS_HOME và dữ liệu bền vững

Trong màn **Instance Configuration**, Jenkins đề nghị **Jenkins URL**. Trước khi lưu URL, xác định `JENKINS_HOME` thực tế, vì đây là nơi wizard lưu state và là đối tượng phải backup/bảo vệ. Với package Linux, mặc định thường là `/var/lib/jenkins`; với official container là `/var/jenkins_home`, phải được mount vào persistent volume. Các deployment Kubernetes và Windows có đường dẫn/cơ chế persistence riêng; dùng manifest/service thực tế, không sao chép đường dẫn Linux.

Restart controller với cùng `JENKINS_HOME` sau wizard phải giữ user, plugin và cấu hình đã tạo. Nếu wizard xuất hiện lại, dừng cấu hình mới và kiểm tra rằng service/container đang dùng đúng home/volume cũ. Đừng “làm lại nhanh” trên một home trống vì có thể đang nhìn nhầm instance hoặc mất persistence.

### URL, context path và reverse proxy

Đặt **Jenkins URL** là URL chuẩn mà người dùng, webhook, email và agent thực sự dùng, gồm scheme, hostname và context path nếu có. Ví dụ hợp lệ về hình thức là `https://ci.example.test/` hoặc `https://ci.example.test/jenkins/`; đây là hostname tài liệu, không phải endpoint production để mở. Không đặt URL là `http://localhost:8080` nếu người dùng và integration ở bên ngoài host.

Khi Jenkins ở sau reverse proxy/load balancer, giả định cần được xác minh trước khi lưu:

1. Proxy terminate TLS hoặc chuyển tiếp HTTPS đúng cách, rồi forward tới controller qua mạng riêng/loopback.
2. Proxy giữ đúng `Host` và forwarded scheme/port theo hướng dẫn Jenkins; controller phải biết request gốc là HTTPS để sinh link/cookie/callback đúng.
3. Nếu public URL có context path `/jenkins`, controller và proxy phải cùng dùng prefix đó. Không để proxy strip prefix trong khi Jenkins tạo URL có prefix khác.
4. URL chỉ đổi sau khi DNS, certificate, proxy route, firewall và callback/webhook liên quan đã sẵn sàng. Thử đăng nhập, link tuyệt đối và một callback không gây tác động trước khi công bố.

Dấu hiệu URL/proxy sai thường là redirect loop, trang login quay về HTTP, link gửi email trỏ `localhost`, `404` dưới prefix hoặc webhook callback thất bại. Đừng sửa bằng cách public `8080`; so sánh URL bên ngoài, prefix, headers proxy và **Jenkins URL** từng giá trị một. Đọc [hướng dẫn reverse proxy chính thức](https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/) trước khi áp dụng cấu hình proxy.

### Thời gian và các lỗi cấu hình thường gặp

Đồng bộ thời gian bằng NTP trên controller, proxy và agent. Chọn một chuẩn, thường là UTC cho server/log/automation, rồi để UI hiển thị theo timezone đã thống nhất của đội khi cần. Jenkins URL không đặt timezone. Nếu cần cố định timezone JVM, áp dụng qua cơ chế service/container được quản lý và kiểm thử ảnh hưởng đến timestamp, cron và agent; không sửa trực tiếp file package/vendor.

| Triệu chứng                             | Kiểm tra trước                                | Hướng xử lý an toàn                                                                             |
| --------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Wizard quay lại sau restart             | Mount/volume, `JENKINS_HOME`, log startup     | Dừng instance mới, xác minh đúng persistent home rồi khởi động lại; không tạo admin thứ hai vội |
| Không thấy hoặc không đọc được password | Home, owner/mode, log service/container       | Chờ khởi tạo hoặc sửa đúng quyền/mount sau backup; không `chmod -R 777`                         |
| Plugin pending/failed                   | Update Center, DNS, proxy, CA, compatibility  | Ghi lỗi, sửa đường mạng/chính sách hoặc chuẩn bị offline artifact; không bỏ qua TLS             |
| Link là `localhost` hay HTTP            | Jenkins URL, host/scheme headers, proxy route | Đồng bộ URL external và proxy; test lại login/callback                                          |
| `404` dưới `/jenkins`                   | Context path của Jenkins và proxy             | Làm khớp prefix ở cả hai lớp, rồi kiểm thử URL có và không có slash                             |
| Timestamp/cron lệch                     | Timezone host/JVM, NTP, timezone agent        | Chuẩn hóa timezone và clock, sau đó kiểm thử một job lịch không tác động                        |

## Lab local Docker: unlock đến admin

Lab này ưu tiên local Docker để không phơi controller ra network. Nó dùng named volume để dữ liệu tồn tại khi xóa container. Đọc [Chạy Jenkins với Docker](/docs/installation/docker) trước nếu chưa cài Docker hoặc cần giải thích về image, volume và port.

### Chuẩn bị và khởi chạy

<Steps>
  <Step>

### Tạo volume và chạy controller chỉ trên loopback

```bash
docker volume create jenkins_setup_lab

docker run --detach \
  --name jenkins-setup-lab \
  --publish 127.0.0.1:8080:8080 \
  --mount type=volume,source=jenkins_setup_lab,target=/var/jenkins_home \
  jenkins/jenkins:lts-jdk21
```

Lệnh chỉ bind web UI vào `127.0.0.1`; máy khác không thể truy cập cổng này. `lts-jdk21` thuận tiện cho lab, nhưng trước một lần chạy có Internet hãy pull/kiểm tra image theo policy; không dùng tag di động này làm pin production.

  </Step>
  <Step>

### Chờ log khởi tạo và đọc password trên terminal riêng

```bash
docker logs --follow --tail 100 jenkins-setup-lab
```

Khi log cho biết Jenkins đã sẵn sàng để unlock, nhấn `Ctrl+C` để ngừng theo dõi log, không dừng container. Sau đó đọc secret trực tiếp và nhập vào `http://localhost:8080`:

```bash
docker exec jenkins-setup-lab \
  cat /var/jenkins_home/secrets/initialAdminPassword
```

  </Step>
</Steps>

### Hoàn tất wizard và xác minh

Trong UI local:

1. Chọn **Install suggested plugins** chỉ khi lab có đường Internet/Update Center hoạt động. Nếu không, chọn plugin tối thiểu hoặc hoãn cài; ghi lại trạng thái thay vì giả định plugin đã cài.
2. Tạo admin cá nhân của lab, không dùng password production và không chia sẻ account.
3. Đặt **Jenkins URL** là `http://localhost:8080/` cho chính lab này. Không copy giá trị đó sang instance sau proxy.
4. Đăng xuất rồi đăng nhập lại bằng admin mới. Vào **Manage Jenkins** để kiểm tra plugin có lỗi hay restart pending không.
5. Tạo hoặc quan sát một job vô hại sau khi có agent tin cậy. Kết quả mong đợi là dashboard giữ user/plugin sau restart container với cùng volume. Hướng dẫn tiếp theo là [Job đầu tiên](/docs/getting-started/first-job).

Xác minh persistence mà không đọc bất kỳ secret nào:

```bash
docker inspect jenkins-setup-lab \
  --format '{{range .Mounts}}{{println .Type .Name .Destination}}{{end}}'

docker volume inspect jenkins_setup_lab
```

Kết quả mong đợi cho thấy một mount volume tới `/var/jenkins_home`. Đây là bằng chứng đường dữ liệu, không phải backup. Để biết luồng Pipeline sau lab, đọc [Jenkinsfile](/docs/pipelines/jenkinsfile), [Declarative Pipeline](/docs/pipelines/declarative) và [Test automation](/docs/delivery/test-automation).

### Cleanup giữ nguyên dữ liệu

Dừng và xóa **container lab**, nhưng giữ named volume để bạn có thể khởi động lại đúng instance sau này:

```bash
docker stop jenkins-setup-lab
docker rm jenkins-setup-lab
docker volume inspect jenkins_setup_lab
```

Không chạy `docker volume rm`, `docker volume prune` hoặc `docker compose down --volumes` trong cleanup này. Volume có thể chứa dữ liệu Jenkins và credential đã mã hóa. Nếu thực sự cần hủy lab, tạo/kiểm tra backup theo policy và xác nhận đúng volume ngoài phạm vi bài này trước.

## Checklist trước khi cho người dùng truy cập

- [ ] Controller chỉ truy cập được từ loopback, mạng quản trị hoặc reverse proxy TLS theo thiết kế.
- [ ] `initialAdminPassword` được đọc trên terminal tin cậy, không xuất hiện trong chat, ticket, log hay repository.
- [ ] `JENKINS_HOME` và persistent storage đã được xác định; owner/mode không bị nới rộng để chữa lỗi.
- [ ] Plugin được chọn theo use case, đã kiểm tra compatibility/network và có change record.
- [ ] Proxy/air-gapped workflow dùng CA, mirror và artifact đã phê duyệt; TLS verification vẫn được giữ.
- [ ] Có admin cá nhân, chính sách authentication/authorization và đường recovery được kiểm soát.
- [ ] Quyền Configure, Credentials và administrator được cấp theo least privilege, không qua shared account.
- [ ] Jenkins URL khớp hostname, HTTPS và context path thực tế; login và link/callback đã được kiểm thử.
- [ ] Controller, proxy và agent đồng bộ thời gian; timezone được quyết định có chủ đích.
- [ ] Backup/restore cho `JENKINS_HOME` có owner, encryption và restore drill trước khi mở rộng workload.

## Tự kiểm tra

1. Vì sao không được xem `initialAdminPassword` là credential recovery dài hạn? Bạn có thể trả lời rõ khác biệt giữa bootstrap credential, identity và authorization không?
2. Nếu **Suggested plugins** báo failed, ba điều đầu tiên cần kiểm tra là gì? Câu trả lời nên gồm network/proxy/CA, compatibility/dependency và log/trạng thái cài đặt, không phải tắt TLS.
3. Public URL là `https://ci.example.test/jenkins/` nhưng Jenkins URL đang là `http://localhost:8080/`. Hãy nêu ít nhất hai triệu chứng có thể xảy ra và các lớp cấu hình cần so sánh.
4. Khi Jenkins không thấy `initialAdminPassword` sau khi restart container, bạn kiểm tra `JENKINS_HOME`/volume và log theo thứ tự nào trước khi tạo instance mới?
5. Một developer cần chạy job trong folder nhưng không được sửa plugin, global security hay đọc credential ngoài folder. Vai trò và scope nào phù hợp với least privilege?

## Nguồn Jenkins chính thức

- [Unlocking Jenkins](https://www.jenkins.io/doc/book/installing/initial-settings/) — setup wizard và initial administrator password.
- [Managing Plugins](https://www.jenkins.io/doc/book/managing/plugins/) — Update Center, cài đặt và quản lý plugin.
- [Managing Security](https://www.jenkins.io/doc/book/security/managing-security/) — authentication, authorization và bảo vệ controller.
- [System Configuration](https://www.jenkins.io/doc/book/system-administration/system-configuration/) — Jenkins URL và cấu hình hệ thống.
- [Reverse proxy configuration](https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/) — headers, context path và kiểm thử proxy.
- [Backing up and restoring](https://www.jenkins.io/doc/book/system-administration/backing-up/) — bảo vệ và khôi phục `JENKINS_HOME`.
- [Plugin site](https://plugins.jenkins.io/) — metadata và yêu cầu plugin từ hệ sinh thái Jenkins.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Đặt setup wizard vào bối cảnh controller, job và CI/CD." />
  <Card title="Thuật ngữ Jenkins" href="/docs/getting-started/terminology" description="Ôn lại controller, agent, executor, workspace và credential." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Hiểu image, volume, network và vận hành Docker an toàn." />
  <Card title="Cài Jenkins trên Linux" href="/docs/installation/linux" description="Cài package, quản lý systemd và đọc log service." />
  <Card title="Pipeline và Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Bước tiếp theo khi đưa quy trình CI vào source control." />
  <Card title="Điều kiện và phê duyệt" href="/docs/pipelines/when-input" description="Dùng điều kiện và input có kiểm soát trong Pipeline." />
</Cards>
