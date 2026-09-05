---
title: "Cấu hình hệ thống Jenkins"
description: "Quản trị global settings, Global Tools, properties và ownership cấu hình Jenkins một cách có kiểm soát."
---

Cấu hình ở **Manage Jenkins** quyết định cách controller tự nhận diện, xếp lịch và tích hợp với hệ thống bên ngoài. Vì nó ảnh hưởng nhiều job cùng lúc, mỗi thay đổi global cần có owner, review, dấu vết và đường quay lui; đây không phải nơi sửa nhanh để một Pipeline tạm thời chạy được.

## Mục lục

- [Ranh giới và bản đồ cấu hình](#ranh-giới-và-bản-đồ-cấu-hình)
  - [Controller setting không phải Pipeline hoặc agent setting](#controller-setting-không-phải-pipeline-hoặc-agent-setting)
  - [Bảng scope và thời điểm áp dụng](#bảng-scope-và-thời-điểm-áp-dụng)
- [Global settings trong Manage Jenkins](#global-settings-trong-manage-jenkins)
  - [Jenkins URL location và timezone](#jenkins-url-location-và-timezone)
  - [Quiet period executors và markup formatter](#quiet-period-executors-và-markup-formatter)
  - [Email và proxy](#email-và-proxy)
- [Global Tools chạy ở đâu](#global-tools-chạy-ở-đâu)
  - [Đăng ký tool và installer](#đăng-ký-tool-và-installer)
  - [Pin version checksum và provenance](#pin-version-checksum-và-provenance)
- [Environment properties và system properties](#environment-properties-và-system-properties)
  - [Phân biệt ba loại giá trị](#phân-biệt-ba-loại-giá-trị)
  - [Precedence và thời điểm thay đổi có hiệu lực](#precedence-và-thời-điểm-thay-đổi-có-hiệu-lực)
  - [Secret không thuộc global environment](#secret-không-thuộc-global-environment)
- [Configuration ownership và thay đổi có kiểm soát](#configuration-ownership-và-thay-đổi-có-kiểm-soát)
  - [Owner review audit và backup](#owner-review-audit-và-backup)
  - [UI as code plugin và drift](#ui-as-code-plugin-và-drift)
  - [Change window và rollback an toàn](#change-window-và-rollback-an-toàn)
- [Ví dụ cấu hình và Jenkinsfile an toàn](#ví-dụ-cấu-hình-và-jenkinsfile-an-toàn)
- [Lab sandbox: quan sát một thay đổi global](#lab-sandbox-quan-sát-một-thay-đổi-global)
  - [Điều kiện lab](#điều-kiện-lab)
  - [Các bước thực hiện](#các-bước-thực-hiện)
    - [Ghi baseline và chọn một thay đổi vô hại](#ghi-baseline-và-chọn-một-thay-đổi-vô-hại)
    - [Lưu Global property và xác minh scope](#lưu-global-property-và-xác-minh-scope)
    - [Quan sát controller queue và agent](#quan-sát-controller-queue-và-agent)
    - [Dọn sạch và ghi nhận](#dọn-sạch-và-ghi-nhận)
  - [Kết quả mong đợi](#kết-quả-mong-đợi)
- [Troubleshooting](#troubleshooting)
- [Checklist vận hành](#checklist-vận-hành)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Ranh giới và bản đồ cấu hình

Trong giao diện Jenkins, **Manage Jenkins → System** chứa các thiết lập instance và một số **Global properties**. **Manage Jenkins → Tools** (tên có thể là **Global Tool Configuration** ở UI cũ) đăng ký toolchain dùng chung. Các trang này thay đổi cấu hình controller trong `JENKINS_HOME`, không sửa source của một repository.

Đường đi của một giá trị cần được hiểu trước khi đổi nó:

```text
Quản trị viên / configuration repository
                  │ review và phê duyệt
                  ▼
Manage Jenkins → System / Tools hoặc JCasC
                  │ lưu cấu hình instance
                  ▼
Controller ── xếp queue, tạo URL, tích hợp proxy/email
                  │ cấp build cho node phù hợp
                  ▼
Agent ── nhận tool đã khai báo và environment của build
                  │
                  ▼
Jenkinsfile ── thêm scope stage/block cho riêng Pipeline
```

Mô hình controller, queue và agent được giải thích kỹ hơn tại [Kiến trúc Jenkins](/docs/getting-started/architecture). Thay đổi global có blast radius lớn hơn một `Jenkinsfile`: một URL sai có thể làm hỏng link email và webhook; một proxy sai có thể chặn cập nhật plugin hoặc SCM; một executor sai có thể làm controller quá tải.

<Callout type="warn" title="Không dùng controller làm build worker">
  Số executor của built-in node/controller nên là `0` trên production. Đây là capacity để chạy workload, không phải số request web Jenkins có thể phục vụ. Chạy source code, dependency hoặc build không tin cậy trên controller làm tăng rủi ro với `JENKINS_HOME`, plugin và credential. Route build đến agent có labels, toolchain và trust boundary phù hợp.
</Callout>

### Controller setting không phải Pipeline hoặc agent setting

Một vấn đề hay gặp là đặt giá trị ở global scope vì nó khiến một job hết lỗi, rồi vô tình đổi hành vi của mọi job khác. Hãy đặt giá trị tại scope hẹp nhất giải quyết đúng vấn đề.

| Câu hỏi | Nơi sở hữu phù hợp | Ví dụ | Không dùng để làm gì |
| --- | --- | --- | --- |
| Controller phải sinh link nào hoặc đi Internet qua đâu? | **Manage Jenkins → System**, service/container của controller | Jenkins URL, proxy, cấu hình email | Chọn JDK hoặc endpoint chỉ cho một Pipeline. |
| Build cần JDK/Maven/Node nào? | Tool definition toàn cục **và** agent/image có khả năng chạy tool | JDK `temurin-21.0.6`, Maven `3.9.9` | Cài tool tùy tiện lên controller. |
| Chỉ Pipeline này cần log level hay feature flag nào? | `environment {}` hoặc `withEnv` trong `Jenkinsfile` | `LOG_LEVEL=debug` trong một stage | Ghi đè global environment của mọi build. |
| Một agent cần `PATH`, CA nội bộ hay package hệ điều hành nào? | Image/host configuration có version, hoặc node property đã review | CI image có Node 22 và CA đã duyệt | Suy ra controller cũng có cùng tool hoặc trust. |
| JVM Jenkins cần một system property? | Service unit, container manifest hoặc JVM options được quản lý | `-Duser.timezone=UTC` sau khi đã kiểm thử | Một biến cho shell của Pipeline. |

Tài liệu [Tổng quan Jenkins Pipeline](/docs/pipelines/overview), [Environment & Parameters](/docs/pipelines/environment-parameters) và [Chọn agent cho Pipeline](/docs/pipelines/agents) mô tả các scope nằm ở phía Pipeline/agent. Một global setting không thay thế permission, network policy hay credential scope.

### Bảng scope và thời điểm áp dụng

| Loại cấu hình | Tác động chính | Thời điểm thường có hiệu lực | Dấu vết cần giữ |
| --- | --- | --- | --- |
| Jenkins URL, location, quiet period, markup, email, proxy | Controller và nhiều job/integration | Sau khi lưu; integration đang chạy cần kiểm thử lại | Ticket/change record, người sửa, ảnh chụp hoặc export trước/sau. |
| Số executor built-in node | Scheduler của controller | Allocation mới; không thu hồi build đang chạy | Queue reason, utilization và quyết định capacity. |
| Global Tool definition | Build được cấp agent có tool/plugin phù hợp | Lần tool được resolve trong build mới | Name, version, installer URL/digest, plugin và agent pool. |
| Global environment property | Environment của build/node theo cấu hình Jenkins | Build mới; build đang chạy giữ environment đã tạo | Tên, owner, mục đích, ngày hết hạn/review. |
| Service environment hoặc JVM `-D` property | Process Jenkins controller | Chỉ sau restart/recreate controller | Manifest/unit diff, version runtime, thời gian restart. |
| `environment`/`withEnv` trong Jenkinsfile | Một Pipeline, stage hoặc block | Khi build đi vào scope đó | SCM commit và review pull request. |

Các plugin có thể thêm field, thay đổi nhãn UI hoặc có lifecycle riêng. Vì vậy, bảng này là bản đồ vận hành, không phải lời hứa rằng một plugin cụ thể sẽ reload nóng.

## Global settings trong Manage Jenkins

### Jenkins URL location và timezone

**Jenkins URL** là URL chuẩn mà Jenkins dùng khi tạo absolute link trong email, thông báo, callback và một số integration. Đặt nó thành URL người dùng và hệ thống bên ngoài thực sự đi tới, gồm HTTPS hostname và context path nếu có, ví dụ `https://ci.example.test/jenkins/`. Không dùng `http://localhost:8080/` cho instance sau reverse proxy chỉ vì quản trị viên đang mở UI từ host đó.

Trước khi lưu URL mới, xác minh theo thứ tự:

1. DNS, certificate và reverse proxy đã phục vụ URL đích.
2. `Host`, scheme và context path được proxy chuyển tiếp đúng.
3. Một user đăng nhập qua URL đích mà không redirect loop.
4. Một build sandbox sinh link và một webhook/integration không tác động được kiểm tra lại.

Thông tin instance như **System Admin e-mail address** thuộc cùng vùng location. Dùng mailbox nhóm có owner và quy trình tiếp nhận, không dùng địa chỉ cá nhân đã nghỉ việc. Hướng dẫn thiết lập URL lần đầu nằm tại [Thiết lập ban đầu](/docs/installation/initial-setup).

Timezone cần được quyết định nhất quán, không sửa ngẫu nhiên để “chữa” một cron. Thực hành dễ kiểm toán là dùng UTC cho host, controller và log; sau đó chọn timezone hiển thị hoặc lịch theo chính sách nhóm nếu cần. Đồng bộ clock bằng NTP trên controller, reverse proxy và agent. Nếu một plugin hoặc JVM cần `-Duser.timezone=...`, coi đó là thay đổi process: kiểm thử timestamp, lịch trigger và log trên staging rồi restart trong change window.

<Callout type="info" title="URL và timezone là hai vấn đề khác nhau">
  Jenkins URL sửa địa chỉ link/callback, không sửa clock. Timezone sửa cách thời gian được diễn giải/hiển thị, không sửa DNS hay HTTPS. Khi lịch chạy lệch, kiểm tra clock, timezone và cron của job/Pipeline trước khi đổi URL hoặc proxy.
</Callout>

### Quiet period executors và markup formatter

**Quiet period** là khoảng Jenkins chờ trước khi đưa một trigger vào queue. Nó có thể giúp gộp các thay đổi liên tiếp hoặc giảm build dư thừa, nhưng kéo dài thời gian phản hồi CI. Đặt một giá trị có lý do đo được; nếu repository cần hành vi khác, ưu tiên cấu hình job/Pipeline hẹp hơn thay vì ép mọi workload nhận cùng độ trễ. Khi build “chậm bắt đầu”, phân biệt quiet period với queue: quiet period chưa đến giai đoạn xin executor, còn queue sẽ hiển thị lý do không có agent phù hợp.

**Number of executors** của controller/built-in node là giới hạn build chạy tại controller. Trên production, đặt `0`; thêm/tuning executor phải xảy ra trên agent pool sau khi đo CPU, RAM, I/O, disk và queue theo label. Executor không phải CPU core. Xem [Tổng quan Jenkins Agent](/docs/agents/overview) để chọn capacity và cô lập workload.

**Markup Formatter** quyết định cách Jenkins hiển thị text do người dùng nhập, ví dụ description. Giữ formatter an toàn/mặc định trừ khi có use case được review. Cho phép HTML hoặc markup mạnh hơn có thể biến nội dung job/build do người dùng kiểm soát thành bề mặt XSS. Thử rendering bằng nội dung vô hại trong sandbox, đọc tài liệu plugin/formatter tương ứng và đánh giá quyền người có thể sửa description trước khi nới policy.

### Email và proxy

Cấu hình email thường nằm trong **Manage Jenkins → System**; plugin cung cấp notification nâng cao có thể thêm một block khác. Đặt SMTP host, port, TLS/CA, sender và recipient policy theo hạ tầng mail đã phê duyệt. Dùng một mailbox gửi có ownership, giới hạn relay và credential scope tối thiểu. Không đặt SMTP password vào một ô global environment, Jenkinsfile hoặc command line; dùng Jenkins Credentials hay secret manager theo plugin/khả năng đã được duyệt.

Trước khi bật email cho mọi job, gửi một test vô hại đến mailbox lab. Xác minh sender, URL trong mail, TLS, relay policy và việc log không in credential. Nếu cấu hình thuộc plugin, ghi rõ plugin/version là một phần của change; Jenkins core không bảo đảm cùng behavior cho mọi plugin email.

Proxy controller quyết định các outbound request của chính controller, chẳng hạn Update Center hoặc endpoint mà plugin dùng. Nó **không tự cấu hình proxy cho agent**: agent/container chạy `git`, `npm`, Maven hoặc tool installer có thể cần egress/proxy/CA riêng theo pool của chúng. Cấu hình `NO_PROXY` cho hostname nội bộ cần đi thẳng; không giải quyết lỗi certificate bằng cách tắt TLS verification hoặc dùng `curl -k`.

| Triệu chứng | Phân lớp trước | Hướng xử lý an toàn |
| --- | --- | --- |
| Plugin metadata không tải | DNS, proxy, CA và firewall từ controller | Sửa allowlist/proxy/CA cho controller rồi thử lại trên sandbox. |
| `git clone` thất bại trong build | Agent, container image, egress và CA của agent | Sửa image/agent policy; đừng kỳ vọng proxy controller lan xuống process build. |
| Email gửi được nhưng link sai | Jenkins URL, proxy headers, context path | Đồng bộ URL public và reverse proxy, gửi test mới. |
| Build bị chờ trước khi chạy | Quiet period hay queue reason | Chờ hết quiet period hoặc đọc queue/label/executor; không tăng executor mù quáng. |

## Global Tools chạy ở đâu

### Đăng ký tool và installer

Tại **Manage Jenkins → Tools**, Jenkins có thể đăng ký tên và version cho JDK, Maven, Gradle, NodeJS hoặc tool do plugin cung cấp. Tool definition là một **contract đặt tên** để job/Pipeline yêu cầu tool; nó không chứng minh mọi agent có tool đó, cũng không biến tool thành capability của controller.

Một tool có thể được cung cấp bằng ba cách:

| Cách cung cấp | Khi phù hợp | Kiểm soát cần có |
| --- | --- | --- |
| Tool đã có trong image/host agent | Toolchain ổn định, agent immutable hoặc image CI nội bộ | Pin image/digest, SBOM/provenance, patch và kiểm thử image. |
| Jenkins tool installer | Agent phù hợp có thể tải/cài tool khi build cần | URL/source được duyệt, version pin, checksum khi nhà phát hành cung cấp, cache/egress và plugin tương thích. |
| Tool thủ công trên static agent | Hardware/toolchain đặc thù chưa container hóa được | Configuration management, inventory/version, owner, drift scan và update window. |

Khi Pipeline dùng directive `tools`, Jenkins resolve tool cho **node/agent được cấp build**. Installer, nếu được chọn, cần download/cài vào agent đó và phụ thuộc OS, network, filesystem, plugin và permission của agent. Đừng “cài trước” JDK/Maven/Gradle/Node lên controller để tránh lỗi agent. Controller chỉ cần Java runtime tương thích để chạy Jenkins; JDK compile ứng dụng là nhu cầu của agent. Các yêu cầu Java và ranh giới controller–agent nằm tại [Yêu cầu hệ thống](/docs/getting-started/requirements).

<Callout type="warn" title="Auto-install không phải auto-trust">
  Tool installer có thể tải code thực thi vào agent. Không bật installer mơ hồ trên production, không tải từ mirror chưa phê duyệt và không để agent PR không tin cậy dùng cache ghi chung với release. Nếu tool cần Docker, Kubernetes hoặc NodeJS plugin, plugin và runtime đó là giả định bắt buộc phải review.
</Callout>

### Pin version checksum và provenance

Tên như `jdk-latest` hoặc `node-current` không tái lập được: cùng Jenkinsfile có thể chạy binary khác sau lần installer tải mới. Dùng tên có version rõ ràng, chẳng hạn `temurin-21.0.6`, `maven-3.9.9`, `gradle-8.12.1` hoặc `node-22.14.0`; cập nhật tên/version qua review thay vì thay nội dung sau một alias chung.

Mỗi tool change nên trả lời được các câu hỏi sau:

- **Version nào?** Pin exact release; với container pin thêm immutable digest đã kiểm thử.
- **Nó đến từ đâu?** Lưu URL vendor/registry nội bộ, artifact repository và provenance/SBOM hoặc signature policy nếu tổ chức có.
- **Có nguyên vẹn không?** Đối chiếu SHA-256, chữ ký hoặc checksum chính thức khi cơ chế installer/artifact repository hỗ trợ; không tự bịa checksum trong cấu hình.
- **Ai đã duyệt và thử?** Ghi Jenkins core, plugin, OS/architecture agent, test build và ngày review.
- **Rollback thế nào?** Giữ tool/image trước đó còn khả dụng, tool definition cũ và artifact cache/proxy có thể phục hồi.

Checksum xác nhận bytes khớp giá trị tin cậy; provenance trả lời artifact được tạo/phát hành từ nguồn nào và qua chuỗi kiểm soát nào. Cả hai không thay thế việc quét lỗ hổng, license review và giới hạn quyền agent.

## Environment properties và system properties

### Phân biệt ba loại giá trị

Cụm từ “property” dễ gây nhầm lẫn. Ba loại dưới đây có consumer, scope và cách rollout khác nhau:

| Loại | Consumer | Ví dụ | Nơi quản lý đúng |
| --- | --- | --- | --- |
| Global environment property | Process build/node mà Jenkins áp dụng environment | `ORG_BUILD_TZ=UTC`, một endpoint **không nhạy cảm** của lab | **Manage Jenkins → System → Global properties** hoặc JCasC đã review. |
| Service environment | Process Jenkins controller và wrapper/container của nó | `HTTP_PROXY`, `JAVA_HOME` khi deployment dùng nó | systemd drop-in, Compose/Kubernetes manifest hoặc configuration management. |
| Java system property | JVM Jenkins đọc qua `-Dname=value` | `-Duser.timezone=UTC` nếu đã xác minh consumer | JVM options trong service/container manifest. |

Global environment property không phải `System.getProperty()` của JVM Jenkins. Ngược lại, `-D` property không tự xuất hiện trong shell của Pipeline. Một plugin có thể đọc environment hoặc Java property riêng; luôn đọc tài liệu chính thức của plugin/core đang dùng thay vì đổi tên một biến với hy vọng nó có hiệu lực.

### Precedence và thời điểm thay đổi có hiệu lực

Không tồn tại một precedence phổ quát cho mọi property Jenkins. Process environment, Java `-D`, Global properties, node properties, Declarative `environment`, `withEnv`, container image và plugin đều có consumer riêng. Khi một giá trị logic cần có ở nhiều lớp, coi đó là **xung đột thiết kế** cần loại bỏ, không phải mẹo precedence.

Với environment mà một `sh` thực sự nhận, scope gần build thường che scope ngoài: `withEnv` trong block che stage-level `environment`, stage-level che pipeline-level, và các giá trị đó chỉ áp dụng khi Pipeline chạy. Tuy nhiên, `params.NAME` là namespace khác `env.NAME`; một parameter cùng tên không tự ghi đè environment. Xem bảng precedence và ví dụ cụ thể tại [Environment & Parameters](/docs/pipelines/environment-parameters).

| Thay đổi | Cần restart? | Kiểm tra sau thay đổi |
| --- | --- | --- |
| Global property lưu trong UI/JCasC | Thường không; build mới mới nhận giá trị | Chạy Pipeline sandbox mới, không suy ra build đang chạy đã đổi. |
| Jenkins URL, quiet period, formatter, email/proxy UI | Thường không, nhưng plugin có thể yêu cầu restart | Save, đọc banner/log, gửi test hoặc trigger sandbox. |
| Tool definition | Không cho controller, nhưng tool có thể được resolve/cài ở build tiếp theo | Chạy `--version` trên đúng agent/label. |
| Service environment hoặc JVM `-D` | **Có**, restart/recreate controller cần thiết | Kiểm tra service/container, controller health, agent và smoke test. |
| Thay đổi plugin | Tùy plugin; có thể yêu cầu restart | Đọc compatibility/release note và thực hiện trong change window. |

Đừng restart production chỉ để thử giá trị. Đầu tiên xác minh consumer, chuẩn bị rollback và test trên controller/agent sandbox tương đương. Với service Linux, dùng `systemctl edit jenkins` để tạo drop-in thay vì sửa vendor unit; với container, thay manifest/image được version hóa. Quy trình cài đặt deployment tương ứng nằm tại [Cài Jenkins trên Linux](/docs/installation/linux) và [Chạy Jenkins với Docker](/docs/installation/docker).

### Secret không thuộc global environment

Global environment dễ bị nhiều job, process con, diagnostic command, plugin và log kế thừa. Vì thế nó không phải kho credential. Không đặt password SMTP, API token, private key, kubeconfig, connection string nhạy cảm hay bootstrap secret vào Global properties, systemd `Environment=`, Compose `environment:` hoặc JCasC trong Git thường.

Dùng Jenkins Credentials hoặc secret manager đã được tổ chức phê duyệt, cấp scope folder/job nhỏ nhất và bind trong stage/block ngắn nhất. Không in secret, dump `env`, bật `set -x`, archive file binding hoặc giả định masking là boundary bảo mật. Nếu secret từng xuất hiện trong log/artifact/config repository, thu hồi hoặc rotate theo incident process; xóa một dòng log không thu hồi bản sao đã bị đọc.

<Callout type="error" title="Một biến global không tạo authorization">
  `DEPLOY_ENV=production` không cấp quyền deploy, và một token trong global environment làm mọi job kế thừa nó có nguy cơ đọc được. Authorization ở Jenkins, quyền tại hệ thống đích, approval và credential scope phải độc lập với giá trị cấu hình.
</Callout>

## Configuration ownership và thay đổi có kiểm soát

### Owner review audit và backup

Mỗi nhóm cấu hình global cần một owner rõ ràng, backup và audit trail. “Mọi admin đều có thể sửa” không phải ownership: khi proxy sai hoặc một tool bị compromise, đội cần biết ai đánh giá, ai triển khai và ai có quyền rollback.

| Tài sản cấu hình | Owner chính | Reviewer tối thiểu | Bằng chứng audit/backup |
| --- | --- | --- | --- |
| Jenkins URL, security, proxy, email, executor controller | Platform/Jenkins administrator | Security hoặc network owner khi liên quan | Change record, export/diff, version Jenkins/plugin, backup trước change. |
| Global Tools, agent image và installer source | Platform owner cùng build/toolchain owner | Security/supply-chain owner | Version/digest/checksum, compatibility matrix, agent test và rollback version. |
| Global environment property | Owner của platform và consumer rõ ràng | Owner của mọi workload bị ảnh hưởng | Tên/mục đích/scope/expiry, diff trước-sau và build sandbox. |
| Pipeline environment, stage logic | Repository/team owner | Code reviewer theo policy SCM | Pull request, commit, test build và revision. |
| JVM/service property, systemd/manifest | Infrastructure/deployment owner | Jenkins administrator | IaC diff, release identifier, restart log, health/smoke test. |

Trước change production, tạo backup nhất quán của `JENKINS_HOME` và xác minh cách khôi phục. Backup chứa configuration, credential đã mã hóa và key liên quan nên phải được mã hóa, giới hạn quyền đọc và lưu tách failure domain. Không coi export UI, screenshot hay Git repo JCasC là thay thế duy nhất cho backup. Giữ change record liên kết với ticket, commit, approver, thời gian thực hiện, config/plugin version và kết quả xác minh.

### UI as code plugin và drift

UI phù hợp cho discovery, lab nhỏ hoặc thay đổi khẩn cấp được phê duyệt. Configuration as Code (JCasC) hoặc infrastructure configuration phù hợp khi tổ chức cần reviewable diff, tái lập controller và đồng bộ nhiều instance. Hai cách chỉ an toàn khi có **một source of truth** và quy trình hòa giải rõ ràng.

Ví dụ JCasC tối giản dưới đây chỉ minh họa intent không nhạy cảm. Nó giả định plugin Configuration as Code đã được cài, version tương thích và schema export của instance đã được xác minh; không dán nó vào production như một manifest hoàn chỉnh.

```yaml
jenkins:
  systemMessage: "Managed configuration; changes require review."
  globalNodeProperties:
    - envVars:
        env:
          - key: "ORG_BUILD_TZ"
            value: "UTC"

unclassified:
  location:
    url: "https://ci.example.test/"
```

Không ghi secret vào ví dụ JCasC. Tên field của plugin, tool installer, email publisher và cloud configuration có thể khác theo plugin/version; dùng export/schema/linter của **chính instance sandbox** và quản lý plugin lock/bundle theo policy. JCasC không tự version pin plugin, không cài tool trên agent và không thay backup/rollback.

**Configuration drift** xảy ra khi trạng thái chạy khác source of truth, ví dụ một admin sửa proxy hoặc tool qua UI sau lần apply JCasC. Phát hiện drift bằng export/compare định kỳ, kiểm tra change audit và đối chiếu tool/image/version trên agent. Không tự động overwrite production chỉ vì diff xuất hiện: trước tiên phân loại diff là thay đổi khẩn cấp hợp lệ, lỗi apply, thay đổi plugin schema hay sửa ngoài quy trình; sau đó đưa trạng thái được chấp thuận trở lại source of truth.

### Change window và rollback an toàn

Một change window tốt giảm rủi ro chứ không chỉ là một lịch calendar. Với thay đổi URL, proxy, tool, JVM property hoặc plugin, chuẩn bị theo thứ tự:

1. **Đánh giá phạm vi.** Liệt kê job, agent label, webhook, email, plugin và integration có thể bị ảnh hưởng. Đọc queue và build đang chạy; đừng restart giữa release chưa đánh giá.
2. **Review và chuẩn bị.** Có diff/export trước change, version Jenkins/Java/plugin, backup đã xác minh, owner/on-call và tiêu chí thành công/thất bại.
3. **Thử ở sandbox/staging.** Dùng URL/mailbox/repository không tác động và agent tách biệt. Xác nhận plugin/installer assumptions thay vì suy ra từ tài liệu chung.
4. **Triển khai nhỏ nhất.** Một thay đổi logic mỗi lần khi có thể. Không đồng thời nâng Jenkins, toàn bộ plugin, proxy và JDK rồi kỳ vọng điều tra được lỗi.
5. **Xác minh.** Kiểm tra login/URL, controller health, queue, agent online, tool `--version`, một Pipeline sandbox và integration liên quan.
6. **Rollback hoặc kết thúc.** Nếu tiêu chí thất bại, dừng rollout, trả cấu hình/version đã biết tốt hoặc restore vào bản sao cô lập theo runbook. Ghi kết quả và drift còn lại.

Rollback an toàn không phải luôn là “đổi một field về giá trị cũ”. Core/plugin mới có thể đã migrate state, tool cache mới có thể đã bị sử dụng, và restore `JENKINS_HOME` cần key/credential material tương ứng. Không chạy đồng thời hai controller ghi vào cùng một `JENKINS_HOME`. Khi cần khôi phục, ưu tiên restore sang home/volume mới cô lập, smoke test trước rồi mới chuyển integration theo runbook của tổ chức.

## Ví dụ cấu hình và Jenkinsfile an toàn

Ví dụ này dùng một tool name có version rõ và chỉ in version tool trên agent. Nó giả định Declarative Pipeline, các tool `temurin-21.0.6` và `maven-3.9.9` đã được định nghĩa trong **Manage Jenkins → Tools**, agent Linux có label `linux-ci`, và plugin/tool installer cần thiết đã được kiểm thử. Nó không checkout, không dùng credential, không tải tool từ URL tùy ý và không chạy trên controller.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timeout(time: 3, unit: 'MINUTES')
  }

  stages {
    stage('Xác minh toolchain trên agent') {
      agent { label 'linux-ci' }

      tools {
        jdk 'temurin-21.0.6'
        maven 'maven-3.9.9'
      }

      environment {
        ORG_BUILD_TZ = 'UTC'
      }

      steps {
        sh '''
          set -eu
          printf 'node=%s\\n' "$NODE_NAME"
          printf 'timezone-policy=%s\\n' "$ORG_BUILD_TZ"
          java -version
          mvn --version
        '''
      }
    }
  }
}
```

`tools` làm tool name thành contract được review; nó không có nghĩa mọi agent đều có cùng filesystem/cache. Stage environment giữ policy không nhạy cảm cục bộ; nó không thay global property và không biến `UTC` thành timezone JVM. Nếu tool cần installer, kiểm tra log của build để biết installer chạy trên agent nào và chỉ chấp nhận download từ nguồn/version đã được phê duyệt.

## Lab sandbox: quan sát một thay đổi global

### Điều kiện lab

Lab dùng controller học tập hoặc sandbox, không phải Jenkins production. Cần quyền cấu hình System trên sandbox, một agent Linux riêng có label `linux-ci`, một mailbox test nếu bạn thử email, và quyền tạo Pipeline job. Built-in node/controller vẫn để `0` executor. Chuẩn bị controller theo [Chạy Jenkins với Docker](/docs/installation/docker) hoặc [Cài Jenkins trên Linux](/docs/installation/linux) nếu cần.

Không dùng credential thật, endpoint production, agent release hay tool installer từ nguồn chưa duyệt. Nếu không có Global Tool definition tương ứng, chỉ làm phần Global property và Pipeline metadata; không cài tool lên controller để tiếp tục lab.

### Các bước thực hiện

<Steps>
<Step>

### Ghi baseline và chọn một thay đổi vô hại

Trong **Manage Jenkins → System**, ghi lại Jenkins URL đang có và các Global properties hiện tại. Chọn một tên mới, không nhạy cảm và ít khả năng va chạm, ví dụ `LAB_CONFIG_MARKER=system-config-lab`. Ghi owner, mục đích, thời gian dự kiến xóa và job sandbox sẽ xác minh. Không sửa URL, proxy, SMTP, formatter, executor hay property hiện hữu chỉ để làm lab.

</Step>
<Step>

### Lưu Global property và xác minh scope

Bật **Global properties → Environment variables**, thêm `LAB_CONFIG_MARKER` với giá trị `system-config-lab`, rồi lưu. Tạo Pipeline job tên `system-config-scope-lab`, dán Jenkinsfile dưới đây và chạy trên agent label `linux-ci`:

```groovy
pipeline {
  agent { label 'linux-ci' }

  options {
    skipDefaultCheckout(true)
  }

  stages {
    stage('Đọc property không nhạy cảm') {
      steps {
        sh '''
          set -eu
          test "$LAB_CONFIG_MARKER" = "system-config-lab"
          printf 'marker=%s node=%s\\n' "$LAB_CONFIG_MARKER" "$NODE_NAME"
        '''
      }
    }
  }
}
```

</Step>
<Step>

### Quan sát controller, queue và agent

Mở **Console Output** và xác nhận marker cùng `NODE_NAME`. Mở **Build Queue** nếu job chờ để xác nhận nguyên nhân là agent/label/executor, không phải Global property. Mở node `linux-ci` để đối chiếu build thực sự chạy trên agent; không sửa executor controller nếu label chưa khớp.

</Step>
<Step>

### Dọn sạch và ghi nhận

Sau khi build xanh, quay lại **Manage Jenkins → System**, xóa đúng `LAB_CONFIG_MARKER`, lưu và chạy lại job. Lần chạy sau phải thất bại tại `set -u` hoặc test vì marker không còn. Ghi cả hai build number, diff trước/sau, thời gian và người thực hiện. Xóa job lab nếu không còn cần, nhưng không xóa history/backup production trong cleanup.

</Step>
</Steps>

### Kết quả mong đợi

| Quan sát | Kết quả đúng | Nếu không đúng |
| --- | --- | --- |
| Build đầu | `SUCCESS`; console có `marker=system-config-lab` và tên agent `linux-ci`. | Kiểm tra job mới được tạo sau save, Global properties, agent label và log; không thêm secret để thử. |
| Build chờ | Queue nêu lý do label/executor nếu agent không sẵn sàng. | Sửa agent pool/label hoặc đợi executor, không bật executor controller. |
| Sau cleanup | Build mới không thấy marker và thất bại an toàn trước khi làm side effect. | Kiểm tra đã xóa đúng property và job không có stage-level override cùng tên. |
| Controller | Không restart và không có thay đổi URL/proxy/tool/plugin. | Nếu UI báo restart pending, dừng lab và xem plugin/change state trước thay đổi khác. |

Lab chứng minh scope và lifecycle của một global environment property, không chứng minh email, proxy, JCasC hay installer production hoạt động. Mỗi khả năng đó cần test riêng với owner và change window của nó.

## Troubleshooting

| Triệu chứng | Chẩn đoán có bằng chứng | Cách khắc phục an toàn |
| --- | --- | --- |
| Link email/webhook trỏ `localhost`, HTTP hoặc thiếu prefix | So sánh Jenkins URL, URL public, `Host`/forwarded scheme và context path proxy. | Khôi phục/đồng bộ URL và proxy đã review, rồi test login/link/callback sandbox. |
| Build không dùng tool mong đợi | Xem `java -version`/`mvn --version`, `NODE_NAME`, tool name trong Jenkinsfile và log installer. | Sửa mapping tool-definition/agent hoặc image; pin version, không cài tool trên controller. |
| Installer download thất bại | Xác định agent thực thi, DNS, proxy, CA, egress, checksum/source và plugin version. | Cấp allowlist/CA hoặc dùng artifact đã duyệt; không tắt TLS verification. |
| `-D` property dường như không có hiệu lực | Xác định consumer là JVM Jenkins hay shell build; xem unit/manifest và restart record. | Đặt property đúng JVM options, restart trong window và smoke test; không thêm nó vào Global properties. |
| Global property không hiện trong build | So sánh tên/case, thời điểm save, job mới hay đang chạy, node/plugin policy và stage overrides. | Trigger build sandbox mới, thu hẹp scope nếu chỉ một job cần; không dùng secret để kiểm tra. |
| SMTP/proxy vừa đổi làm nhiều integration lỗi | Xem controller log, DNS/TLS/CA, config export và mốc change. | Dừng rollout, rollback block đã đổi hoặc restore cấu hình đã biết tốt; test một integration mỗi lần. |
| JCasC apply tạo diff bất ngờ | So sánh export/schema, plugin versions, UI changes và source of truth. | Phân loại drift, sửa source hoặc revert có review; không force-apply mù vào production. |
| Controller chậm hoặc build chạy tại built-in node | Đọc queue, executor, CPU/RAM/I/O và node của Console Output. | Đặt controller executors `0`, route đến agent và sizing theo label; không chỉ tăng executor. |

Khi một thay đổi có thể tác động login, agent, credential hay nhiều repository, dừng ở bằng chứng đầu tiên thay vì tiếp tục đổi thêm fields. Một diff nhỏ có thể cần rollback nhanh hơn một chuỗi thử-sai dài.

## Checklist vận hành

- [ ] Jenkins URL khớp HTTPS hostname và context path thực tế; login, link/email và callback sandbox đã được thử sau thay đổi.
- [ ] Clock/NTP và timezone được quyết định tách biệt với URL; thay đổi JVM timezone có restart plan và test lịch/log.
- [ ] Quiet period có mục đích đo được; vấn đề queue được điều tra theo label/executor thay vì tăng controller executor.
- [ ] Built-in node/controller có `0` executors trên production; workload ở agent có toolchain và trust boundary phù hợp.
- [ ] Markup formatter, email và proxy được review về XSS, credential, TLS/CA, plugin và phạm vi controller/agent.
- [ ] JDK/Maven/Gradle/Node và tool installer có tên pin version; nguồn, digest/checksum/provenance, plugin và agent OS đã được ghi nhận.
- [ ] Không cài mù tool trên controller; tool được xác minh bằng `--version` trên đúng agent/pool.
- [ ] Global environment chỉ chứa cấu hình không nhạy cảm, có owner/mục đích/expiry; secret ở Credentials hoặc secret manager với scope hẹp.
- [ ] Service environment và JVM `-D` property được quản lý bằng manifest/unit, có restart/recreate trong change window và smoke test.
- [ ] UI và configuration as code có source of truth, review, export/compare phát hiện drift; plugin/schema assumptions đã được xác minh.
- [ ] Backup `JENKINS_HOME`, version/config export và rollback path đã sẵn sàng trước thay đổi high-impact; không chạy hai controller ghi cùng home.
- [ ] Lab sandbox đã chứng minh Global property trên agent và được cleanup mà không chạm production settings.

## Nguồn Jenkins chính thức

- [System Configuration](https://www.jenkins.io/doc/book/system-administration/system-configuration/) — Jenkins URL, global properties, proxy và cấu hình hệ thống.
- [Managing systemd Services](https://www.jenkins.io/doc/book/system-administration/systemd-services/) — quản lý service và JVM options trên Linux.
- [Managing Nodes](https://www.jenkins.io/doc/book/managing/nodes/) — node, executor, agent properties và capacity.
- [Using Jenkins Agents](https://www.jenkins.io/doc/book/using/using-agents/) — phân tách controller và agent.
- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/) — `tools`, `environment` và scope Pipeline.
- [Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — Declarative `tools`, `environment` và agent.
- [Using Credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — credential store, scope và thực hành an toàn.
- [Configuration as Code plugin](https://plugins.jenkins.io/configuration-as-code/) — metadata plugin và link tài liệu JCasC hiện hành.
- [Jenkins Plugins](https://plugins.jenkins.io/) — kiểm tra yêu cầu, version và security advisory của plugin.
- [Jenkins Security](https://www.jenkins.io/doc/book/security/) — bảo vệ controller, quyền và bề mặt tấn công.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn lại controller, agent, job và plugin trước khi thay đổi global configuration." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu queue, executor và lý do không chạy workload trên controller." />
  <Card title="Thiết lập ban đầu" href="/docs/installation/initial-setup" description="Cấu hình URL instance, plugin và admin đầu tiên an toàn." />
  <Card title="Environment & Parameters" href="/docs/pipelines/environment-parameters" description="Đặt environment ở scope Pipeline/stage/block thay vì global khi phù hợp." />
  <Card title="Chọn agent cho Pipeline" href="/docs/pipelines/agents" description="Route toolchain và workload vào agent có labels, runtime và trust boundary đúng." />
</Cards>
