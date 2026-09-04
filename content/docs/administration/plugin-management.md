---
title: "Quản lý Jenkins plugins"
description: "Chọn, cài đặt, cập nhật, khóa và khôi phục Jenkins plugins với khả năng tái lập, truy vết và rollback an toàn."
---

Plugin là mã chạy trong Jenkins controller, không chỉ là một nút mở rộng tính năng. Mỗi thay đổi plugin có thể tác động khả năng khởi động, Pipeline, agent, dữ liệu cấu hình và bề mặt bảo mật; vì vậy hãy quản lý nó như một thay đổi phát hành có owner và bằng chứng.

## Mục lục

- [Phạm vi, quyền và nguyên tắc](#phạm-vi-quyền-và-nguyên-tắc)
- [Chọn plugin dựa trên bằng chứng](#chọn-plugin-dựa-trên-bằng-chứng)
  - [Bảng quyết định](#bảng-quyết-định)
  - [Update Center, catalog và provenance](#update-center-catalog-và-provenance)
  - [Health, adoption và security advisory](#health-adoption-và-security-advisory)
- [Tương thích và dependency graph](#tương-thích-và-dependency-graph)
  - [Ma trận tương thích](#ma-trận-tương-thích)
- [Lifecycle có kiểm soát](#lifecycle-có-kiểm-soát)
  - [Inventory và SBOM](#inventory-và-sbom)
  - [Pin, khóa và version policy](#pin-khóa-và-version-policy)
  - [Luồng thay đổi một wave](#luồng-thay-đổi-một-wave)
- [Cài đặt tái lập](#cài-đặt-tái-lập)
  - [Plugin list và Plugin Installation Manager](#plugin-list-và-plugin-installation-manager)
  - [Proxy, offline mirror và kiểm tra artifact](#proxy-offline-mirror-và-kiểm-tra-artifact)
- [Cập nhật, restart và xác minh hành vi](#cập-nhật-restart-và-xác-minh-hành-vi)
- [Disable, remove và dữ liệu đã migrate](#disable-remove-và-dữ-liệu-đã-migrate)
- [Rollback và phục hồi khi startup thất bại](#rollback-và-phục-hồi-khi-startup-thất-bại)
- [Lab local sandbox: update rồi disable an toàn](#lab-local-sandbox-update-rồi-disable-an-toàn)
  - [Chuẩn bị baseline cô lập](#chuẩn-bị-baseline-cô-lập)
  - [Cập nhật một plugin và kiểm tra](#cập-nhật-một-plugin-và-kiểm-tra)
  - [Disable, đối chiếu và cleanup](#disable-đối-chiếu-và-cleanup)
- [Troubleshooting](#troubleshooting)
- [Checklist phát hành plugin](#checklist-phát-hành-plugin)
- [Đọc tiếp](#đọc-tiếp)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)

<Callout type="warn" title="Không biến Update Center thành đường cài đặt không kiểm soát">
  Chỉ người có quyền **Overall/Administer** mới nên quản lý plugin. Không upload, copy hay cài trực tiếp `.hpi`/`.jpi` không rõ nguồn, kể cả file được gửi từ một controller khác. Không dán credential vào Plugin Manager, script, `plugins.txt`, ticket hoặc Console Output.
</Callout>

## Phạm vi, quyền và nguyên tắc

**Manage Jenkins → Plugins** (tên UI có thể là Plugin Manager) dùng **Update Center** để hiển thị catalog, bản cài đặt, update và dependency. Đây là nơi phù hợp để khám phá và lập kế hoạch; nó không thay thế review change hay kiểm thử. Chỉ cấp quyền quản trị plugin cho nhóm vận hành đã được ủy quyền. Người đề xuất, người review và người thực hiện nên có audit trail riêng khi chính sách tổ chức yêu cầu.

Trước một thay đổi, ghi ticket/change record gồm: lý do nghiệp vụ, controller scope, plugin `shortName`, phiên bản hiện tại/đích, Jenkins core và Java, dependency thay đổi, nguồn artifact, kết quả staging, backup ID, approver, thời gian restart và tiêu chí rollback. Giới hạn quyền có thể làm admin khó thao tác hơn, nhưng giảm khả năng một job hoặc người dùng thường biến controller thành điểm tải code tùy ý.

Jenkins core, plugin, `JENKINS_HOME`, agent và Pipeline là một tổ hợp. Đọc [tổng quan Jenkins](/docs/getting-started/overview) để đặt plugin vào đúng vai trò controller; đối chiếu quyền/proxy/configuration tại [cấu hình hệ thống](/docs/administration/system-configuration) trước khi thay endpoint hoặc policy chung.

## Chọn plugin dựa trên bằng chứng

Bắt đầu từ capability cần có, không từ tên plugin quen thuộc. Có thể Jenkins core, một plugin đã được phê duyệt hoặc Pipeline hiện tại đã đáp ứng nhu cầu. Một plugin mới kéo theo code trên controller, dependency chuyển tiếp và trách nhiệm vá lỗi lâu dài.

### Bảng quyết định

| Tình huống | Quyết định mặc định | Bằng chứng trước khi làm | Không nên làm |
| --- | --- | --- | --- |
| Core hoặc plugin đã cài đáp ứng use case | Không cài plugin mới | Demo trên sandbox, owner xác nhận phạm vi | Cài plugin trùng chức năng chỉ vì UI tiện hơn. |
| Cần tích hợp mới, plugin được duy trì | Thử một plugin có version pin trên staging | Trang plugin, yêu cầu core/Java, dependency, advisory, Pipeline smoke test | Chọn theo số lượt cài đặt duy nhất. |
| Plugin ít duy trì, health thấp hoặc có advisory chưa xử lý | Hoãn, tìm phương án thay thế hoặc nhận ngoại lệ có expiry | Owner rủi ro, kế hoạch vá/loại bỏ, acceptance rõ | Bỏ qua advisory vì “job vẫn xanh”. |
| Cần hotfix security | Thực hiện wave nhỏ có review khẩn và backup | Advisory, version khắc phục, impact analysis, restore path | Cập nhật toàn bộ plugin cùng lúc để tiết kiệm một restart. |
| Controller không có Internet | Dùng mirror nội bộ đã kiểm soát | Provenance, checksum/signature, snapshot metadata, allowlist | Sideload `.hpi` từ USB, chat hoặc mirror không được duyệt. |
| Plugin không còn dùng | Disable trước; remove sau cửa sổ quan sát | Inventory consumer, backup, test restart và data caveat | Xóa ngay plugin/dependency để “dọn disk”. |

### Update Center, catalog và provenance

Update Center cung cấp metadata để Jenkins biết plugin nào có sẵn, phiên bản nào phù hợp và dependency nào phải đi kèm. Trong **Available plugins**, xem mô tả, publisher/link, phiên bản và dependency trước khi chọn. Trong **Installed plugins**, đối chiếu version đang chạy, update đề xuất, trạng thái pin/disable và thông báo restart. Một update xuất hiện trong UI không tự chứng minh nó phù hợp với controller của bạn.

Thiết lập nguồn tải theo một trong hai mô hình đã phê duyệt:

- **Trực tiếp qua endpoint Jenkins chính thức:** controller đi qua DNS, TLS, proxy và firewall đã kiểm tra. Chỉ cho phép destination cần thiết; không tắt kiểm tra TLS để chữa lỗi CA.
- **Proxy hoặc offline mirror nội bộ:** đội platform lấy metadata/artifact từ nguồn chính thức, kiểm tra provenance và integrity trước khi publish vào mirror bất biến. Controller chỉ dùng URL mirror được cấu hình/review. Ghi timestamp snapshot, upstream URL, checksum/chữ ký khi nhà phát hành cung cấp và người phê duyệt.

Checksum trả lời bytes tải về có khớp giá trị tin cậy hay không. Signature/provenance trả lời artifact hoặc metadata đến từ chuỗi phát hành nào. Cả ba vẫn không thay thế review compatibility và behavior. Không tự tạo một checksum sau khi tải từ nguồn chưa biết rồi coi nó là tin cậy; đó chỉ là dấu vết của bytes không rõ nguồn.

### Health, adoption và security advisory

Trên [Jenkins Plugins](https://plugins.jenkins.io/), đánh giá plugin theo nhiều tín hiệu: maintainer/release gần đây, health score hoặc trạng thái bảo trì, tài liệu, số cài đặt/adoption, yêu cầu Jenkins core, dependency và lịch sử phát hành. Adoption cho biết cộng đồng có sử dụng, không phải cam kết an toàn hay tương thích với Pipeline của tổ chức. Một plugin phổ biến vẫn có thể có advisory hoặc thay đổi hành vi trong release mới.

Đọc [Jenkins Security Advisories](https://www.jenkins.io/security/advisories/) trước khi cài hoặc update. Ghép từng advisory với `shortName`, version dễ bị ảnh hưởng, version khắc phục, quyền/điều kiện khai thác và controller đang dùng. Nếu không thể vá ngay, ghi compensating control, owner và ngày review; ví dụ disable capability không cần thiết, thu hẹp quyền hoặc cô lập endpoint. Không công bố chi tiết credential, URL nội bộ hay log nhạy cảm trong evidence advisory.

## Tương thích và dependency graph

Một plugin có thể yêu cầu Jenkins core tối thiểu, Java/runtime, một plugin API hoặc plugin triển khai cụ thể. Các dependency này tạo **dependency graph**: chọn một plugin gốc có thể kéo nhiều dependency chuyển tiếp. Nâng một dependency chung có thể ảnh hưởng nhiều plugin không nằm trong ticket ban đầu.

```text
plugin cần thay đổi ──► dependency A ──► Jenkins core tối thiểu
        │                       │
        ├──────────────────────► dependency B ──► Java/runtime
        │
        └──────────────────────► Pipeline, SCM, credential, agent behavior

Update Center / plugin manager giải dependency
        │
        ▼
planned version set ──► staging ──► một wave ──► restart + smoke test
                                      │
                                      └── fail ──► rollback từ baseline
```

Đừng downgrade riêng một dependency để ép một plugin cũ chạy. Cũng không copy file `.jpi` từ host khác: graph thực tế, core requirement và metadata của source có thể khác. Dùng danh sách version đã resolve ở staging làm input review cho production.

### Ma trận tương thích

Điền ma trận cho **mỗi** controller; ô chưa được kiểm tra là trạng thái no-go, không phải giả định pass.

| Bề mặt | Câu hỏi | Evidence tối thiểu |
| --- | --- | --- |
| Jenkins core/LTS | Core hiện tại và LTS đích có thỏa `requiredCore` của plugin/dependency không? | Plugin metadata, release notes, [hướng dẫn nâng cấp](/docs/installation/upgrade). |
| Java và deployment | Java của controller, image/package và OS có được core đích hỗ trợ không? | `java -version`, image digest/package pin, support policy. |
| Graph plugin | Dependency trực tiếp/chuyển tiếp nào sẽ thêm, update, pin hoặc bị disable? | Plugin Manager plan hoặc output Plugin Installation Manager đã lưu. |
| Pipeline và integration | Checkout, shared library, credentials binding, report, webhook và post action có còn đúng? | Smoke test đại diện trên agent sandbox, không in secret. |
| Agent | Launcher, Remoting, label, toolchain và TLS còn hoạt động không? | Agent online và một build vô hại mỗi pool. |
| Storage/dữ liệu | Plugin có migration config/data; backup restore được chưa? | Backup ID, restore drill và startup log staging. |

Ưu tiên Jenkins LTS còn được hỗ trợ cho production, rồi chọn plugin version tương thích với LTS đó. Khi core và plugin phải đổi cùng nhau vì release note yêu cầu, kiểm thử đúng tổ hợp trong staging; không suy luận rằng “bản mới nhất” luôn là tổ hợp tốt nhất.

## Lifecycle có kiểm soát

Lifecycle an toàn đi theo chuỗi: **inventory/SBOM → policy pin → staging → backup → update một wave → restart/xác minh → rollback hoặc disable**. Giữ mỗi phase đủ nhỏ để biết thay đổi nào gây lỗi và đủ evidence để người khác lặp lại/quay lui.

### Inventory và SBOM

Xuất inventory trước mọi thay đổi từ **Installed plugins** hoặc từ deployment artifact. Tối thiểu mỗi record có `shortName:version`, enable/disable/pin state, Jenkins core, Java, image/package digest, dependency graph, source/mirror snapshot, owner, consumer Pipeline/job và advisory liên quan. Không đưa `JENKINS_HOME/secrets/`, `credentials.xml`, token, endpoint nội bộ hoặc Console Output có secret vào inventory.

Plugin list là một phần của SBOM, không tự là SBOM hoàn chỉnh. Nếu tổ chức dùng CycloneDX, SPDX hoặc hệ thống inventory khác, chuyển danh sách plugin đã resolve thành component record và bổ sung supplier/provenance, checksum, dependency relationship và timestamp. Lưu artifact SBOM cùng change record để security team so sánh giữa baseline và candidate.

Trước production, tạo và xác minh backup nhất quán của `JENKINS_HOME`, gồm plugin/configuration và key liên quan theo policy. Quy trình chi tiết ở [backup và restore](/docs/administration/backup-restore). Backup tồn tại không đủ: phải biết version core/plugin nào có thể boot bản restore và ai có quyền thực hiện recovery.

### Pin, khóa và version policy

Một policy thực tế không dùng alias như `latest`. Nó định nghĩa version chính xác, owner, chu kỳ review và cách thay đổi. Ví dụ: pin Jenkins core LTS, pin mỗi plugin trong file version-controlled, chỉ nâng theo advisory hoặc release train, và giữ baseline artifact trong suốt cửa sổ rollback.

**Pin** ở Plugin Manager ngăn một plugin đã chọn bị update tùy tiện theo cơ chế UI của Jenkins. Nó không thay thế version pin trong image/configuration pipeline, không sửa dependency graph và không miễn trừ security patch. Dùng pin ngắn hạn để giữ một baseline đã test; review/xóa pin khi wave có kế hoạch đã hoàn tất để tránh bỏ lỡ advisory mãi mãi.

| Policy | Khi phù hợp | Kiểm soát bắt buộc |
| --- | --- | --- |
| Exact `shortName:version` | Production và controller tái tạo | Review pull request, dependency resolution staging, artifact/mirror retention. |
| Pin UI tạm thời | Freeze trong release/change window | Ticket nêu lý do, owner và ngày gỡ pin. |
| Update theo wave | Nhiều plugin cần patch | Nhóm theo dependency/rủi ro, một backup và smoke test mỗi wave. |
| Không pin mơ hồ | Lab dùng setup wizard ngắn hạn | Không dùng cho production; export lại danh sách trước khi promote. |

### Luồng thay đổi một wave

```text
Inventory + SBOM ──► review policy/provenance ──► staging matrix
       │                         │                         │
       │                         └── no-go ──► giữ baseline │
       ▼                                                   ▼
backup đã kiểm chứng ◄── change approval ◄── version set đã resolve
       │
       ▼
update một wave ──► restart có kiểm soát ──► health + Pipeline/agent test
       │                                                  │
       └── fail / timeout ──► giữ evidence ──► restore baseline hoặc disable
```

1. **Review và freeze.** Liệt kê graph, advisory, owner, restart impact và thay đổi configuration liên quan. Đóng băng thay đổi plugin/configuration khác để staging không lệch production.
2. **Staging.** Dùng controller cô lập có core, Java, deployment mode và plugin baseline tương đương. Chặn webhook/deploy/credential production; chạy test behavior đại diện chứ không chỉ kiểm tra UI mở được.
3. **Backup.** Sau quiet down và theo runbook platform, xác nhận backup ID/checksum/restore path trước download hay restart. Không để hai controller ghi cùng một `JENKINS_HOME`.
4. **Một wave.** Cài/update nhóm đã phê duyệt, bao gồm dependency mà plan yêu cầu. Không thêm plugin “tiện tay” trong cùng restart.
5. **Restart và verify.** Theo dõi boot đến khi plugin load; kiểm tra core/plugin version, queue, [monitoring](/docs/administration/monitoring), [logs](/docs/administration/logs), agent và Pipeline smoke test.
6. **Quyết định.** Nếu acceptance fail, dừng rollout. Disable có thể là biện pháp cô lập nhanh; rollback dữ liệu dùng baseline restore khi migration có thể một chiều.

## Cài đặt tái lập

Cài qua UI phù hợp cho thử nghiệm nhỏ, nhưng không đủ tái lập cho nhiều controller. Với image hoặc configuration pipeline, giữ plugin list version-controlled, build image/bundle trong CI từ nguồn mirror đã duyệt, tạo SBOM và promote chính artifact đã test. [Cài Jenkins với Docker](/docs/installation/docker) mô tả cách pin image controller và giữ `JENKINS_HOME` bền vững.

### Plugin list và Plugin Installation Manager

Plugin Installation Manager (`jenkins-plugin-cli`) nhận file list dạng `shortName:version`, resolve dependency và phù hợp để build immutable controller image hoặc reference directory. Danh sách dưới đây là **mẫu**, không phải recommendation cài các plugin đó; thay bằng version đã được review cho môi trường của bạn.

```text
# plugins.txt: pin chính xác, không chứa URL credential hoặc token
git:<approved-version>
workflow-aggregator:<approved-version>
```

Ví dụ Dockerfile dùng image Jenkins chính thức và Plugin Installation Manager có sẵn trong image. Build chỉ nên chạy trong CI/network đã allowlist/mirror; lưu output dependency resolution, digest image và SBOM như artifact của build.

```dockerfile
FROM jenkins/jenkins:<approved-LTS>-jdk21
COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
```

File input pin plugin gốc; dependency resolver có thể chọn thêm dependency chuyển tiếp. Vì vậy, so sánh output resolved giữa baseline và candidate, rồi lưu lock/manifest đã resolve theo công cụ/policy nội bộ. Đừng thay file plugin trong container đang chạy; rebuild image, scan, test và promote digest giúp lần cài sau dùng đúng artifact đã chấp nhận.

### Proxy, offline mirror và kiểm tra artifact

Với proxy, cấu hình proxy/CA đúng tại controller và xác minh từ **đúng runtime**; proxy controller không tự cấp egress/CA cho agent. Với offline mirror, chạy pipeline ingest tách biệt để: lấy từ upstream chính thức, kiểm tra checksum/chữ ký có sẵn, quét theo policy, lưu nguồn/timestamp/digest, publish snapshot bất biến rồi test mirror trong staging. Controller production chỉ đọc mirror; không có quyền publish lại.

Không đặt username/password proxy trong `plugins.txt`, Dockerfile, build argument, log verbose hay command line. Dùng secret manager/credential của hệ thống build và redaction phù hợp. Nếu checksum hoặc signature không khớp, dừng ingest và điều tra source; không dùng cờ bỏ qua verification hoặc tắt TLS.

## Cập nhật, restart và xác minh hành vi

Trong Plugin Manager, chọn update theo plan đã review, đọc dependency đề xuất và release notes, rồi dùng **Download now and install after restart** khi UI cung cấp lựa chọn này. Xem plugin là restart-impacting mặc định: một số plugin có thể được load động, nhưng core/plugin dependency hoặc migration vẫn có thể yêu cầu restart. Chỉ restart trong change window sau backup và khi queue/build đang chạy đã được xử lý theo policy.

Sau restart, không kết luận thành công chỉ vì login được. Xác minh theo thứ tự:

1. startup log không có lỗi load/dependency lặp lại; version core, Java và plugin khớp candidate;
2. status queue, disk, executor/controller health và plugin state bình thường;
3. agent quan trọng reconnect với label/toolchain/TLS đúng;
4. Pipeline smoke test chạy trên agent sandbox: checkout, shared library nếu dùng, một credential binding staging không in giá trị, test report/artifact và `post` action;
5. integration/webhook/notification chỉ thử bằng endpoint sandbox; theo dõi metrics và error rate trong khoảng quan sát;
6. ghi build URL/number, log tham chiếu đã redaction, người xác nhận và quyết định mở lại scheduling vào ticket.

Không chạy build không tin cậy trên controller để “test nhanh”. Xem [tổng quan Pipeline](/docs/pipelines/overview) và [tổng quan agents](/docs/agents/overview) để đặt smoke test vào agent có trust boundary đúng.

## Disable, remove và dữ liệu đã migrate

**Disable** làm Jenkins không tải plugin khi restart nhưng giữ file plugin và cấu hình liên quan. Đây là lựa chọn đầu tiên khi cần cô lập một plugin có lỗi, kiểm tra dependency hoặc quan sát impact. **Remove/uninstall** xóa artifact plugin khỏi controller; nó không bảo đảm xóa configuration XML, build history, credential metadata hay dữ liệu plugin đã ghi/migrate trước đó.

| Thao tác | Dùng khi | Điều còn lại | Cảnh báo |
| --- | --- | --- | --- |
| Disable | Cô lập incident, thử bỏ capability, chuẩn bị decommission | Artifact và dữ liệu plugin vẫn hiện diện | Plugin khác/Pipeline có thể fail sau restart. |
| Remove | Đã qua cửa sổ quan sát, không còn consumer và có backup | Config/data có thể còn trong `JENKINS_HOME` | Không phải cách đảo migration hoặc xóa data an toàn. |
| Restore baseline | Plugin/core mới đã migrate data hoặc boot fail | Candidate hỏng được giữ để điều tra | Cần backup nhất quán và core/plugin pin cũ. |

Trước disable/remove, tìm consumer trong job/Pipeline/shared library, quyền configuration, agent, webhook và dependency graph. Test restart trong staging. Nếu plugin đã migrate schema hoặc ghi dữ liệu một chiều, downgrade/remove trên cùng `JENKINS_HOME` có thể làm controller cũ không đọc được; đừng xóa file hay “dọn” XML để ép khởi động. Giữ backup, candidate logs và owner decision.

## Rollback và phục hồi khi startup thất bại

Rollback đáng tin cậy không chỉ là đổi một `.jpi` về version cũ. Nếu candidate đã ghi migration, đường an toàn là dừng scheduling, giữ nguyên home candidate để điều tra, restore **backup trước change** sang storage/home mới và boot bằng core, Java, plugin set đã pin ở baseline. Không chạy baseline và candidate đồng thời trên cùng home/volume.

Khi Jenkins không startup sau plugin wave:

1. Giữ log startup, thời điểm thay đổi, list candidate và backup ID. Không xóa toàn bộ `plugins/` hoặc `JENKINS_HOME`.
2. Dừng controller theo deployment runbook để tránh write tiếp. Phân loại lỗi: thiếu dependency, `requiredCore` không đạt, Java, permission/disk hay migration.
3. Trong **bản sao cô lập** hoặc theo runbook recovery đã phê duyệt, disable plugin nghi ngờ bằng UI nếu Jenkins còn lên được. Nếu không thể vào UI, dùng cơ chế disable plugin được Jenkins hỗ trợ chỉ sau khi xác minh chính xác `shortName`, dependency impact và backup; không dùng `.hpi/.jpi` lạ để thay thế file.
4. Nếu disable không đưa controller về acceptance hoặc migration không rõ tính tương thích ngược, restore baseline vào home/volume mới. Đối chiếu ownership, key/credential material từ cùng generation và network/URL sandbox trước boot.
5. Giữ quiet down, chạy health/Pipeline/agent smoke test, rồi chỉ mở integration/scheduling sau evidence pass. Nếu restore cũng fail, escalate theo incident/recovery process thay vì thử tổ hợp version ngẫu nhiên.

<Callout type="error" title="Không khôi phục credential bằng cách chép file lẻ">
  `credentials.xml` và key trong `JENKINS_HOME/secrets/` phải đi cùng đúng backup generation theo policy. Không xem, in hoặc gửi credential để chẩn đoán plugin; không trộn key từ controller khác. Xem runbook [backup và restore](/docs/administration/backup-restore) trước khi phục hồi.
</Callout>

## Lab local sandbox: update rồi disable an toàn

Lab này dùng controller Docker riêng, một image Jenkins chính thức đã pin và chỉ bind loopback. Nó kiểm tra thao tác update/disable, không chứng minh plugin phù hợp production. Không dùng credential thật, repository/webhook production, agent production hoặc plugin `.hpi` tải tay. Nếu không có Docker sandbox hoặc artifact/mirror được phê duyệt, dừng ở bước chuẩn bị.

### Chuẩn bị baseline cô lập

```bash
export LAB_PREFIX='jenkins-plugin-lab'
export LAB_CONTAINER="${LAB_PREFIX}-controller"
export LAB_VOLUME="${LAB_PREFIX}-home"
export LAB_IMAGE='jenkins/jenkins:<approved-LTS>-jdk21'

docker context show
docker pull "$LAB_IMAGE"
docker image inspect "$LAB_IMAGE" --format '{{range .RepoDigests}}{{println .}}{{end}}'
docker volume create "$LAB_VOLUME"
docker run -d --name "$LAB_CONTAINER" \
  -p 127.0.0.1:18090:8080 \
  -v "$LAB_VOLUME":/var/jenkins_home \
  "$LAB_IMAGE"
docker logs -f "$LAB_CONTAINER"
```

Kết quả mong đợi: Jenkins khởi động tại `http://127.0.0.1:18090`; digest image được ghi vào ghi chú lab; không có cổng web public. Hoàn tất setup wizard bằng tài khoản lab, cài **một** plugin không thiết yếu qua Update Center/mirror đã phê duyệt, rồi ghi baseline: plugin `shortName:version`, dependency, core/Java và ảnh chụp trạng thái. Không đưa initial admin password vào ticket hay chat.

Tạo backup/clone baseline của volume bằng quy trình đã thử ở [Docker](/docs/installation/docker) hoặc [backup và restore](/docs/administration/backup-restore). Xác nhận bản clone boot được trước khi thay plugin. Đây là điểm rollback của lab; không dùng volume của controller khác.

### Cập nhật một plugin và kiểm tra

1. Vào **Manage Jenkins → Plugins → Installed plugins**, chọn đúng plugin lab đã ghi baseline. Đọc release note, yêu cầu core, advisory và dependency plan; không chọn **Update all**.
2. Chọn update đúng plugin qua Update Center/mirror đã duyệt và chọn cài sau restart. Ghi candidate version/dependency vào record lab.
3. Restart chỉ controller lab, theo dõi `docker logs --tail 200 "$LAB_CONTAINER"`, rồi xác nhận UI đã lên và plugin không báo failed/disabled ngoài dự kiến.
4. Chạy job Pipeline lab chỉ `echo` trên executor lab hoặc agent cô lập. Kết quả mong đợi: startup không có lỗi dependency lặp lại, version candidate xuất hiện trong Installed plugins và job trả `SUCCESS`. Nếu fail, dừng lab, lưu log đã redaction và restore clone baseline thay vì thử thêm plugin.

### Disable, đối chiếu và cleanup

Trong **Installed plugins**, disable chính plugin lab vừa update, restart controller và xác nhận nó vẫn xuất hiện nhưng có trạng thái disabled. Job/feature phụ thuộc plugin có thể fail là kết quả cần quan sát; không sửa job production để làm nó xanh. Re-enable plugin hoặc boot volume baseline clone để kết thúc lab, rồi ghi nhận plugin behavior, restart time và kết quả.

Trước cleanup, liệt kê tài nguyên. Chỉ khi tên khớp chính xác prefix lab và bạn đã giữ evidence cần thiết, chạy cleanup dưới đây; không dùng `docker volume prune` hoặc `docker system prune --volumes`.

```bash
case "$LAB_PREFIX" in
  jenkins-plugin-lab) ;;
  *) printf 'Refuse cleanup: unexpected prefix %s\n' "$LAB_PREFIX" >&2; exit 1 ;;
esac

docker ps -a --filter "name=${LAB_PREFIX}" --format 'table {{.Names}}\t{{.Status}}'
docker volume ls --format '{{.Name}}' | grep "^${LAB_PREFIX}-" || true
# Xem lại output. Chỉ bỏ comment khi cả container/volume đều do lab này tạo.
# docker rm -f "$LAB_CONTAINER"
# docker volume rm "$LAB_VOLUME"
```

Kết quả mong đợi: lệnh liệt kê chỉ thấy tài nguyên `jenkins-plugin-lab-*`; các dòng xóa đang comment nên không thay đổi gì. Không xóa baseline/clone nếu còn cần điều tra rollback.

## Troubleshooting

| Triệu chứng | Kiểm tra có bằng chứng | Hành động an toàn |
| --- | --- | --- |
| Update Center không tải metadata | DNS, proxy, CA, firewall và URL mirror từ controller | Sửa allowlist/proxy/CA đã review; không tắt TLS hoặc dùng mirror lạ. |
| Plugin không thể cài/update | `requiredCore`, Java, dependency graph, disk và advisory | Quay về compatibility matrix; không upload `.jpi` không rõ nguồn để né resolver. |
| Jenkins fail startup sau wave | Startup log, plugin load, Java, permission, migration và backup ID | Dừng rollout, giữ home candidate, disable có kiểm soát trên clone hoặc restore baseline. |
| Plugin bị disabled/thiếu class | Dependency/core requirement hoặc plugin khác bị disable | Đối chiếu resolved set và release notes; restore set đã staging thay vì thêm version ngẫu nhiên. |
| Pipeline thay đổi hành vi dù UI bình thường | Plugin version, shared library, agent, Console Output đã redaction và test report | Reproduce bằng smoke test trên agent sandbox; giữ evidence rồi rollback theo tiêu chí. |
| Plugin có advisory nhưng chưa có patch phù hợp | Version bị ảnh hưởng, exposure, quyền và workaround chính thức | Escalate security owner, áp dụng compensating control có expiry hoặc disable; không che advisory bằng pin vô thời hạn. |
| Rollback không boot | Backup generation, key/config pair, core/Java pin, storage ownership | Restore vào home/volume mới cô lập, kiểm tra log và ownership; không trộn file `secrets/` giữa generation. |

## Checklist phát hành plugin

- [ ] Capability cần thiết đã được xác định; core/plugin hiện có không đáp ứng hoặc đã được so sánh.
- [ ] Plugin được đánh giá theo maintainer/health/adoption, yêu cầu core, dependency, release note và security advisory.
- [ ] Provenance được ghi: Update Center chính thức hoặc mirror đã duyệt, upstream, snapshot, checksum/chữ ký khi có và owner ingest.
- [ ] Không có `.hpi`/`.jpi` không rõ nguồn; TLS/CA/proxy không bị bypass.
- [ ] Inventory/SBOM có core, Java, image/package pin, plugin/dependency state, owner và consumer; không chứa credential.
- [ ] Ma trận core/LTS, Java, graph, Pipeline, agent, storage/migration đã pass trên staging.
- [ ] `shortName:version` và policy pin/lock có review, owner, expiry; dependency resolved set được lưu.
- [ ] Backup nhất quán, checksum, retention và restore path đã xác minh trước update; chỉ một controller ghi mỗi home.
- [ ] Wave chỉ chứa thay đổi đã phê duyệt; quiet down, change review, audit record và restart owner đã sẵn sàng.
- [ ] Sau restart đã kiểm tra log, plugin state, monitoring, agent, Pipeline/integration smoke test mà không tiết lộ credential.
- [ ] Disable/remove đã được phân biệt; migration caveat và consumer impact được đánh giá trước decommission.
- [ ] Rollback baseline, tiêu chí fail, recovery owner và lab/staging evidence còn truy cập được.

## Đọc tiếp

<Cards>
  <Card title="Thiết lập ban đầu" href="/docs/installation/initial-setup" description="Hiểu setup wizard, tài khoản admin và Update Center ở controller mới." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Pin image, quản lý volume và tạo sandbox controller cô lập." />
  <Card title="Nâng cấp Jenkins" href="/docs/installation/upgrade" description="Lập ma trận core, Java, plugin và rollback cho change lớn." />
  <Card title="Backup & Restore Jenkins" href="/docs/administration/backup-restore" description="Tạo backup nhất quán và diễn tập restore trước plugin change." />
  <Card title="Logs Jenkins" href="/docs/administration/logs" description="Đọc evidence startup và lỗi plugin mà không lộ dữ liệu nhạy cảm." />
  <Card title="Monitoring Jenkins" href="/docs/administration/monitoring" description="Theo dõi controller, queue, disk và dấu hiệu lỗi sau restart." />
  <Card title="Pipeline" href="/docs/pipelines/overview" description="Chọn smoke test đại diện cho hành vi plugin trong Pipeline." />
  <Card title="Jenkins Agents" href="/docs/agents/overview" description="Kiểm tra plugin behavior trên agent có trust boundary đúng." />
</Cards>

## Nguồn Jenkins chính thức

- [Managing Plugins](https://www.jenkins.io/doc/book/managing/plugins/) — Plugin Manager, Update Center và quy trình quản lý plugin.
- [Jenkins Plugins](https://plugins.jenkins.io/) — metadata plugin, version, maintainer, health và links tài liệu.
- [Jenkins Security Advisories](https://www.jenkins.io/security/advisories/) — advisory cho Jenkins core và plugin.
- [Jenkins Plugin Installation Manager Tool](https://github.com/jenkinsci/plugin-installation-manager-tool) — `jenkins-plugin-cli`, plugin file và dependency resolution.
- [Jenkins Docker image](https://github.com/jenkinsci/docker) — image chính thức và cài plugin khi build image.
- [Jenkins LTS Upgrade Guide](https://www.jenkins.io/doc/upgrade-guide/) — compatibility, migration và lập kế hoạch upgrade.
- [Jenkins Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy/) — vòng đời hỗ trợ Jenkins core.
- [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/) — Java được hỗ trợ bởi Jenkins core.
- [Jenkins: Backing up](https://www.jenkins.io/doc/book/system-administration/backing-up/) — bảo vệ `JENKINS_HOME` trước thay đổi có trạng thái.
