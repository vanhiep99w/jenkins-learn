---
title: "Jenkins Configuration as Code (JCasC)"
description: "Quản lý cấu hình controller Jenkins bằng YAML có review để tái lập, kiểm soát drift và rollback an toàn."
---

Jenkins Configuration as Code (JCasC) biến phần cấu hình **mà plugin Configuration as Code hiểu được** thành YAML có thể review và áp dụng lặp lại. Mục tiêu là tái lập một controller cùng Jenkins core, plugin và secret dependencies đã biết; JCasC không phải Jenkins core mặc định, không thay thế backup và không tự quản lý mọi trạng thái của Jenkins.

## Mục lục

- [JCasC giải quyết gì và không giải quyết gì?](#jcasc-giải-quyết-gì-và-không-giải-quyết-gì)
  - [Plugin schema và YAML bundle](#plugin-schema-và-yaml-bundle)
  - [Phân biệt với Pipeline Job DSL và extension của plugin](#phân-biệt-với-pipeline-job-dsl-và-extension-của-plugin)
- [Luồng cấu hình và vòng đời áp dụng](#luồng-cấu-hình-và-vòng-đời-áp-dụng)
  - [`CASC_JENKINS_CONFIG` và nhiều file](#casc_jenkins_config-và-nhiều-file)
  - [Startup reload restart và rollback](#startup-reload-restart-và-rollback)
- [Cấu trúc YAML an toàn](#cấu-trúc-yaml-an-toàn)
  - [Bundle mẫu](#bundle-mẫu)
  - [Security realm authorization tools jobs và plugin config](#security-realm-authorization-tools-jobs-và-plugin-config)
- [Secret interpolation và quyền file](#secret-interpolation-và-quyền-file)
  - [Nguồn secret và precedence](#nguồn-secret-và-precedence)
  - [Không commit secret](#không-commit-secret)
- [Schema export validation và drift](#schema-export-validation-và-drift)
  - [Tương thích Jenkins core và plugin](#tương-thích-jenkins-core-và-plugin)
  - [Phát hiện drift](#phát-hiện-drift)
- [Workflow GitOps để promote controller](#workflow-gitops-để-promote-controller)
- [Lab local: controller JCasC cô lập](#lab-local-controller-jcasc-cô-lập)
  - [Điều kiện và file lab](#điều-kiện-và-file-lab)
  - [Chạy verify và cleanup](#chạy-verify-và-cleanup)
  - [Kết quả mong đợi](#kết-quả-mong-đợi)
- [Troubleshooting](#troubleshooting)
- [Checklist trước khi promote](#checklist-trước-khi-promote)
- [Nguồn chính thức](#nguồn-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## JCasC giải quyết gì và không giải quyết gì?

Plugin [Configuration as Code](https://plugins.jenkins.io/configuration-as-code/) đọc YAML và gọi các Jenkins descriptor mà core hoặc plugin đã cung cấp. Nhờ vậy, cấu hình controller như message, URL, security realm, authorization strategy, tool definition và một số cấu hình plugin có thể đi qua pull request thay vì chỉ tồn tại trong UI.

```text
Git repository ── review ──► YAML bundle đã duyệt
                                  │ mount/copy chỉ-đọc
                                  ▼
                         CASC_JENKINS_CONFIG
                                  │
                                  ▼
                    Plugin Configuration as Code
                     │ schema + descriptors hiện có
                     ▼
       Jenkins core + plugin tương thích trên controller
                     │
                     ▼
         UI/runtime state ── export/compare ──► drift report
```

JCasC hữu ích nhất khi controller được dựng từ image/manifest có version pin, plugin list đã kiểm thử và `JENKINS_HOME` có backup. Nó tạo **desired configuration**, không biến mọi dữ liệu trong home thành bất biến.

<Callout type="warn" title="Không phải tính năng mặc định của Jenkins">
  Cài plugin **Configuration as Code** là điều kiện bắt buộc. Nếu plugin chưa được cài, bị vô hiệu hóa hoặc version của nó không tương thích với Jenkins core/plugin khác, `CASC_JENKINS_CONFIG` không làm Jenkins tự hiểu YAML. Kiểm tra compatibility và release note trên chính tổ hợp version sẽ triển khai.
</Callout>

Những thứ JCasC thường **không** thay thế gồm plugin binary và dependency của plugin, Docker/Kubernetes manifest, agent image, build history, workspace, queue đang chạy, update Jenkins core, backup/restore hoặc quyền ở IdP, cloud và SCM. Một plugin không có JCasC configurator cũng không tự xuất hiện trong YAML chỉ vì nó có trang UI.

### Plugin schema và YAML bundle

**Schema/reference** là danh sách field mà plugin Configuration as Code tạo từ các descriptor hiện có trên một controller cụ thể. Nó phản ánh Jenkins core, các plugin đang cài và version của chúng. Vì thế, schema của staging mới nâng plugin có thể khác production. Xem **Manage Jenkins → Configuration as Code → View Configuration Schema/Reference** trên controller mục tiêu trước khi viết field mới.

Trong trang này, *YAML bundle* nghĩa là tập file YAML version hóa cho một controller, ví dụ `jenkins.yaml`, `tools.yaml`, `jobs.yaml` và các file cấu hình plugin. Đây là cách tổ chức repository; không hàm ý rằng Jenkins core có một định dạng bundle duy nhất hay mọi bundle của sản phẩm khác đều tương thích với JCasC OSS.

Tách file theo ownership giúp review dễ hơn, nhưng không tách được security boundary. Các file được đọc cùng nhau phải tạo một cấu hình hợp lệ, không được khai báo trùng một cùng configuration root rồi hy vọng file sau ghi đè file trước.

### Phân biệt với Pipeline Job DSL và extension của plugin

| Cơ chế | Sở hữu chính | Tạo/đổi gì? | Điều không nên suy ra |
| --- | --- | --- | --- |
| JCasC | Administrator/platform team | Cấu hình controller và cấu hình mà descriptor/plugin hỗ trợ | Mọi UI, plugin, job hay credential đều được core hỗ trợ. |
| `Jenkinsfile` / Pipeline | Repository team | Logic build, stage, agent, trigger trong phạm vi job | Không phải nguồn cấu hình global controller. |
| Job DSL | Job DSL plugin và seed job/quy trình riêng | Định nghĩa job bằng Groovy DSL | Không phải JCasC core; `jobs:` chỉ hoạt động nếu extension/plugin tương ứng có mặt. |
| Plugin-specific extension | Plugin cung cấp field/configurator | Block riêng dưới root do schema chỉ ra, thường là `unclassified` hoặc root riêng | Tên field ổn định giữa mọi plugin/version. |

Ví dụ, một block `jobs:` có thể giao script cho Job DSL plugin; JCasC không tự diễn dịch toàn bộ Groovy DSL. Tương tự, một block cấu hình GitHub, Kubernetes, mail hoặc secret store chỉ hợp lệ khi plugin liên quan đã cài và schema của nó xác nhận. Luôn coi plugin name, version và schema export là một phần của manifest release.

## Luồng cấu hình và vòng đời áp dụng

### `CASC_JENKINS_CONFIG` và nhiều file

Đặt `CASC_JENKINS_CONFIG` trong **environment của process controller trước khi Jenkins khởi động**. Giá trị là path tới một YAML file, một directory, hoặc danh sách path phân cách bằng dấu phẩy. Directory cho phép tổ chức nhiều file YAML; giữ file ẩn, file backup và file secret ngoài directory được scan để chúng không vô tình được nạp.

Ví dụ Docker Compose chỉ minh họa một mount read-only và directory cấu hình. Image, volume và hostname đều là placeholder cho sandbox:

```yaml
services:
  jenkins-jcasc-lab:
    image: jenkins/jenkins:<LTS_VERSION>-jdk21
    ports:
      - "127.0.0.1:8080:8080"
    environment:
      CASC_JENKINS_CONFIG: /var/jenkins_home/casc
    volumes:
      - jenkins_home_lab:/var/jenkins_home
      - ./casc:/var/jenkins_home/casc:ro

volumes:
  jenkins_home_lab:
```

Giá trị `CASC_JENKINS_CONFIG` chỉ cho biết **nơi tìm cấu hình**, không phải một lớp override cho mọi Jenkins environment variable. Ví dụ path nhiều phần:

```bash
export CASC_JENKINS_CONFIG='/var/jenkins_home/casc/base,/var/jenkins_home/casc/plugins'
```

Dùng danh sách này khi directory phải tách ownership hoặc cách mount. Không dùng hai file để cùng khai báo `jenkins.securityRealm`, `tool.git` hay cùng một cấu hình plugin: JCasC báo conflict thay vì áp dụng precedence “file cuối thắng”. Một config release nên có một nơi khai báo cho mỗi phần configuration root.

### Startup reload restart và rollback

Ở startup, plugin nạp config location, resolve secret source rồi cấu hình các descriptor hiện diện. Thay file trong Git, bind mount hoặc volume **không tự apply** vào controller đang chạy. Hãy chọn một trong hai hành động có chủ đích:

- **Reload** từ trang Configuration as Code khi schema/plugin hỗ trợ áp dụng lại phần cấu hình đó. Reload đọc desired YAML hiện tại; nó không tự đổi `CASC_JENKINS_CONFIG` đã cấp cho process, không nâng plugin và không bảo đảm mọi plugin có hot-reload lifecycle giống nhau.
- **Restart/recreate controller** khi đổi `CASC_JENKINS_CONFIG`, process environment, plugin, Jenkins core, image, Java hoặc khi plugin yêu cầu restart. Drain/đánh giá build đang chạy trước khi restart.

Không giả định reload là transaction rollback toàn bộ controller. Nếu validation/apply lỗi hoặc descriptor/plugin có side effect, dừng rollout, giữ log/export và quay về release đã biết tốt. Rollback vận hành gồm: dừng controller lỗi, đặt lại YAML **và** plugin/core/image version tương thích, restart/recreate, rồi smoke test trên controller cô lập. Khi state đã migration hoặc production có rủi ro, restore [backup đã kiểm thử](/docs/administration/backup-restore) sang volume/home mới trước; không ghi đè hay chạy hai controller cùng một `JENKINS_HOME`.

<Callout type="error" title="Reload không thay thế change window">
  Một reload có thể thay security, cloud, tool hoặc plugin configuration cho nhiều job. Không reload production chỉ để xem thử YAML. Có backup, owner, tiêu chí rollback, controller cô lập và xác minh post-apply trước khi promote.
</Callout>

## Cấu trúc YAML an toàn

### Bundle mẫu

Cây thư mục dưới đây là một ví dụ tổ chức repository. Chỉ commit cấu hình không nhạy cảm và các tham chiếu `${...}`; secret thực tế được cấp cho runtime từ secret source đã duyệt.

```text
casc/
├── 00-jenkins.yaml
├── 10-tools.yaml
├── 20-jobs.yaml
└── 30-plugin-config.yaml
```

`00-jenkins.yaml` giữ controller message và security baseline. Các username/password chỉ là tên biến placeholder, không phải secret để copy vào `.env` hoặc Git.

```yaml
jenkins:
  systemMessage: >-
    Controller được quản lý bằng JCasC. Thay đổi cần review.
  securityRealm:
    local:
      allowsSignup: false
      users:
        - id: "${JENKINS_ADMIN_ID}"
          password: "${JENKINS_ADMIN_PASSWORD}"
  authorizationStrategy:
    globalMatrix:
      permissions:
        - "Overall/Read:authenticated"
        - "Overall/Administer:${JENKINS_ADMIN_ID}"
```

Ví dụ dùng local realm để lab dễ tái lập. Production thường tích hợp IdP/LDAP/OIDC/SAML qua plugin; root name, fields, group mapping và permission matrix phải lấy từ schema/export của controller tương ứng. Không đổi security realm/authorization trên production nếu chưa kiểm tra đăng nhập, group và một break-glass account theo policy. Nếu `JENKINS_ADMIN_ID` hoặc password placeholder không resolve, coi startup/apply fail là đúng; không thay bằng giá trị bí mật trong Git.

### Security realm authorization tools jobs và plugin config

`10-tools.yaml` định nghĩa contract tên tool đã có trên agent/image. Không làm controller tải tool hoặc biến agent không tương thích thành có tool.

```yaml
tool:
  git:
    installations:
      - name: "git-2.47"
        home: "/usr/bin/git"
  jdk:
    installations:
      - name: "temurin-21"
        home: "/opt/jdks/temurin-21"
```

Pin image/toolchain riêng cho agent và xác minh `git --version`, `java -version` trên đúng agent sau apply. Đừng thêm installer URL, token registry hoặc checksum bịa trong YAML; installer và plugin liên quan cần review compatibility/provenance riêng.

`20-jobs.yaml` chỉ dùng khi **Job DSL plugin** và JCasC extension của nó đã cài, được pin version và có trong schema. Ví dụ lab không checkout repository, không tạo credential và chỉ chạy một lệnh vô hại:

```yaml
jobs:
  - script: >-
      pipelineJob('jcasc-sandbox-status') {
        definition {
          cps {
            sandbox(true)
            script('''pipeline { agent any; stages { stage("status") { steps { echo "JCasC sandbox job" } } } }''')
          }
        }
      }
```

Nếu controller không có Job DSL support, bỏ hẳn file `20-jobs.yaml`; đừng chép `jobs:` rồi bỏ qua lỗi. Job thực tế vẫn cần source control, branch trust, agent isolation và quy trình Pipeline riêng.

`30-plugin-config.yaml` dưới đây minh họa một extension thường xuất hiện trong reference của instance. `location` là cấu hình instance không chứa secret; block `unclassified` không phải chỗ đặt mọi key tùy ý.

```yaml
unclassified:
  location:
    url: "https://ci-lab.example.test/"
    adminAddress: "ci-admin@example.test"
```

Mỗi plugin có thể tạo block top-level khác hoặc thêm field vào `unclassified`. Sao chép **một block đã export từ sandbox cùng version**, thu nhỏ diff và validate lại; không đoán plugin config từ blog. Để hiểu scope của URL, tools và global configuration ngoài JCasC, xem [Cấu hình hệ thống Jenkins](/docs/administration/system-configuration).

## Secret interpolation và quyền file

JCasC thay `${NAME}` bằng giá trị từ secret source có sẵn khi config được đọc. Đây là interpolation lúc controller load config, không phải credential binding cho Pipeline. Biến secret vì vậy vẫn có thể tác động security realm, cloud hoặc plugin settings; cấp quyền đọc nó cho đúng process controller và không để build agent kế thừa nó.

### Nguồn secret và precedence

| Nguồn | Cách dùng phù hợp | Lưu ý vận hành |
| --- | --- | --- |
| Process environment | Lab hoặc secret được inject bởi runtime/secret manager: `${JENKINS_ADMIN_PASSWORD}` | Không commit `.env`; process cùng boundary có thể đọc environment tùy OS/container policy. |
| File secret | Mount file chỉ-đọc có permission hẹp và dùng file-secret source được plugin/version hỗ trợ | Không đặt file trong directory YAML scan hoặc workspace; mount/rotate qua runtime, không qua Git. |
| Secret store ngoài | Vault, Kubernetes Secret hoặc hệ thống tổ chức qua secret-source plugin/integration đã duyệt | Pin plugin, cấp service identity ít quyền, audit access và thử outage/rotation. |

Environment source là cách đơn giản nhất để lab, nhưng không có một precedence phổ quát giữa mọi extension. Thứ tự resolve giữa environment, file source và external store phụ thuộc secret-source implementation/version. `CASC_JENKINS_CONFIG` không “thắng” hay “thua” một secret source; nó chỉ chỉ vị trí YAML. Chọn một nguồn canonical cho mỗi tên secret, ghi nhận owner và tránh tạo cùng `JENKINS_ADMIN_PASSWORD` ở nhiều lớp Compose, systemd, Kubernetes manifest và vault.

Khi biến environment có nhiều lớp, runtime quyết định precedence trước khi Jenkins chạy. Ví dụ Compose `environment:` có thể override giá trị image `ENV`; Kubernetes có quy tắc merge `env`, `envFrom` và manifest; systemd có unit/drop-in riêng. Render/inspect deployment **không in giá trị secret**, rồi kiểm tra bằng một controller cô lập. Không dùng `printenv`, `docker inspect`, `kubectl describe` hoặc log debug làm cách “xác nhận” secret trên production.

### Không commit secret

Giữ repository chỉ có placeholder như `${JENKINS_ADMIN_PASSWORD}`. Không commit giá trị vào YAML, `variables.yaml`, `.env`, Helm values, Compose override, command history hay export chưa được review. Nếu secret lỡ vào Git/log/artifact, revoke/rotate tại secret system, đánh giá bản sao và lịch sử theo incident process; xóa dòng hiện tại không thu hồi bản đã bị clone.

Trên Linux, directory config không nhạy cảm vẫn nên hạn chế ghi để ngăn sửa manifest ngoài review. File secret cần quyền hẹp hơn và owner là identity chạy controller, ví dụ **minh họa trên host lab**:

```bash
install -d -m 0750 -o 1000 -g 1000 /srv/jenkins/casc
install -d -m 0700 -o 1000 -g 1000 /srv/jenkins/secrets
install -m 0600 -o 1000 -g 1000 /dev/null /srv/jenkins/secrets/admin-password
```

Lệnh cuối chỉ tạo file rỗng placeholder, không ghi password. Đừng dùng `chmod 777`, mount secret writable vào controller hoặc cho agent/workspace đọc `/srv/jenkins/secrets`. Trên Kubernetes, dùng ServiceAccount và `Secret`/external-secret policy tối thiểu, mount read-only vào controller pod; không đặt secret vào ConfigMap hay job pod dùng để build.

<Callout type="warn" title="JCasC không thay Jenkins Credentials">
  Secret để bootstrap controller/plugin config có thể cần interpolation. Secret mà Pipeline dùng để gọi service ngoài vẫn nên nằm trong Jenkins Credentials hoặc secret manager với scope nhỏ, theo hướng dẫn [Credentials trong Pipeline](/docs/pipelines/credentials). Không đưa token deploy vào JCasC chỉ vì YAML có interpolation.
</Callout>

## Schema export validation và drift

### Tương thích Jenkins core và plugin

Một YAML đúng cú pháp vẫn có thể không apply được. Field có thể thiếu configurator, descriptor đổi sau khi nâng plugin, alias bị bỏ, plugin dependency chưa cài hoặc Jenkins core/Java không tương thích. Lock/pin các thành phần sau trong release record:

- Jenkins LTS/core và Java runtime;
- Configuration as Code plugin;
- mọi plugin cung cấp security realm, authorization, Job DSL, tool installer, cloud hoặc secret source;
- container image/digest và agent image/runtime khi config phụ thuộc chúng.

Quy trình validate nên có hai tầng. Đầu tiên, dùng YAML parser/schema/reference của controller sandbox để bắt indent, kiểu và key không thuộc schema. Sau đó, khởi động hoặc apply trên controller cô lập cùng plugin catalog/version để bắt descriptor resolution, secret availability và side effect runtime. Schema không xác minh IdP connectivity, quyền Vault, DNS hay agent tool path.

**Export** từ trang Configuration as Code là ảnh trạng thái mà plugin có thể mô tả. Dùng nó để học field, tạo baseline và so sánh; không coi export là source of truth để commit ngay. Export có thể thiếu phần plugin không hỗ trợ, phản ánh drift từ UI và có metadata/giá trị nhạy cảm tùy extension. Lưu export như artifact hạn chế quyền, redact theo policy và review diff trước khi đưa một phần đã chọn vào YAML quản lý.

### Phát hiện drift

Drift là khác biệt giữa YAML đã promote và trạng thái controller. Nó có thể do admin sửa UI khẩn cấp, reload thất bại, plugin upgrade đổi schema, secret source đổi giá trị hoặc apply bị thiếu file. Phát hiện theo lịch bằng export/reference từ controller và so sánh với release đã áp dụng, đồng thời đối chiếu audit/change record, plugin inventory và image digest.

Không auto-force YAML lên production chỉ vì diff. Phân loại trước:

1. thay đổi khẩn cấp hợp lệ cần back-port vào Git;
2. thay đổi UI ngoài quy trình cần revert có owner phê duyệt;
3. schema/plugin migration cần update bundle và test mới;
4. secret rotation không nên hiện rõ trong export nhưng cần xác minh consumer vẫn hoạt động.

Sau khi phân loại, mở pull request để desired state và trạng thái chấp thuận gặp lại nhau. Với config high-impact, export trước và sau apply, hash artifact, Jenkins/plugin version, người phê duyệt và kết quả smoke test phải cùng nằm trong change record. Backup định kỳ và restore drill vẫn bắt buộc; xem [Backup và khôi phục Jenkins](/docs/administration/backup-restore).

## Workflow GitOps để promote controller

Một workflow tối thiểu, có thể audit, đi theo thứ tự sau:

1. **Tạo branch và review.** Sửa một phần YAML nhỏ, dùng placeholder cho secret, nêu Jenkins core/plugin target, schema impact, owner và rollback release trong pull request.
2. **Validate tĩnh.** Parse YAML, kiểm tra duplicate configuration root, lint theo schema/reference được export từ controller target và quét repository để chặn secret. Không xem lint xanh là bằng chứng controller apply thành công.
3. **Apply vào controller cô lập.** Dựng home/volume mới, image và plugin set đã pin; inject placeholder secret qua runtime hoặc secret store sandbox. Set `CASC_JENKINS_CONFIG` trước startup, không reuse volume production.
4. **Verify.** Xem startup log không chứa secret, mở Configuration as Code reference/export, kiểm tra login/authorization bằng account lab, URL, agent/tool smoke test và một job vô hại nếu extension Job DSL có mặt.
5. **Promote.** Tag artifact/bundle đã được verify, tạo backup pre-change, thực hiện trong change window, apply bằng reload hoặc restart đã được quyết định, rồi xác minh lại trên production với checklist hẹp.
6. **Theo dõi và rollback.** So sánh export/drift, theo dõi logs/queue/integration. Nếu tiêu chí fail, dừng rollout và dùng release + plugin/core/image tương thích hoặc restore cô lập; không sửa nóng nhiều field trên UI để “chữa” cùng lúc.

Nên review tách biệt thay đổi YAML, plugin catalog và secret-source policy khi có thể. Một pull request đồng thời nâng Jenkins core, mười plugin, security realm và authorization rất khó rollback/điều tra. Chỉ promote sau khi controller cô lập chứng minh được bundle tương thích.

## Lab local: controller JCasC cô lập

Lab này chỉ tạo controller trên `127.0.0.1`, dùng `JENKINS_HOME` mới và message không nhạy cảm. Nó không cài plugin, không tạo admin password, không áp dụng security realm hay authorization production. Cài sẵn plugin Configuration as Code vào image lab theo tài liệu plugin hoặc qua setup wizard; chỉ sau đó mới kỳ vọng `CASC_JENKINS_CONFIG` có hiệu lực.

### Điều kiện và file lab

Tạo thư mục rỗng ngoài repository cấu hình production, rồi tạo `casc/00-jenkins.yaml`:

```yaml
jenkins:
  systemMessage: "JCasC local sandbox; không dùng cho production."
  numExecutors: 0
```

Tạo `compose.yaml` cùng cấp. Thay `<LTS_VERSION>` bằng một LTS đã tải và kiểm thử; đây là placeholder có chủ đích, không phải tag để deploy.

```yaml
services:
  jenkins-jcasc-lab:
    image: jenkins/jenkins:<LTS_VERSION>-jdk21
    container_name: jenkins-jcasc-lab
    ports:
      - "127.0.0.1:8080:8080"
    environment:
      CASC_JENKINS_CONFIG: /var/jenkins_home/casc
    volumes:
      - jenkins_jcasc_lab:/var/jenkins_home
      - ./casc:/var/jenkins_home/casc:ro

volumes:
  jenkins_jcasc_lab:
```

Đọc hướng dẫn [Chạy Jenkins với Docker](/docs/installation/docker) để pin image, kiểm tra volume và hoàn thành unlock ban đầu an toàn. Không mount Docker socket, không publish port ra mọi interface và không copy `JENKINS_HOME`/credential từ production vào lab.

### Chạy verify và cleanup

Sau khi image có plugin Configuration as Code, chạy các lệnh từ directory lab:

```bash
docker compose config
docker compose up -d
docker compose logs --follow --tail 100 jenkins-jcasc-lab
```

Mở `http://127.0.0.1:8080`, hoàn tất setup wizard bằng account lab rồi vào **Manage Jenkins → System**. Xác nhận system message hiện đúng và built-in node có `0` executor. Trong **Manage Jenkins → Configuration as Code**, xem reference/schema và export; chỉ kiểm tra presence của message, không copy export có thể nhạy cảm vào Git.

Đổi system message trong `casc/00-jenkins.yaml`, commit/review ở repository lab nếu có, rồi chọn **Reload existing configuration** trên controller lab. Xác nhận UI đổi message. Nếu plugin/version báo không reload được, dừng container và dùng recreate có kiểm soát thay vì sửa UI.

Cleanup chỉ xóa tài nguyên lab sau khi đã xác nhận không cần dữ liệu:

```bash
docker compose down
docker volume inspect jenkins_jcasc_lab
# Chỉ sau khi xác nhận đây là volume lab:
docker volume rm jenkins_jcasc_lab
```

### Kết quả mong đợi

- Container chỉ nghe ở `127.0.0.1:8080`; không có controller production hay agent production bị chạm tới.
- Startup log cho thấy plugin Configuration as Code tìm/đọc YAML hoặc nêu lỗi cấu hình rõ ràng; log không có password, token hay file secret.
- System message khớp YAML và `numExecutors: 0` có hiệu lực sau startup/reload hợp lệ.
- Export/reference phản ánh schema của **chính lab**, chứng minh field/plugin support phải được kiểm tra theo version.
- Sau cleanup, container bị xóa; volume chỉ bị xóa nếu người thực hiện đã xác minh đúng tên volume lab.

## Troubleshooting

| Triệu chứng | Bằng chứng cần lấy | Khắc phục an toàn |
| --- | --- | --- |
| Jenkins bỏ qua YAML | Kiểm tra Configuration as Code plugin có cài/enabled, process environment đã có `CASC_JENKINS_CONFIG` trước startup và path tồn tại/readable trong container. | Sửa manifest/path, recreate controller cô lập; không dán YAML vào UI production. |
| Báo unknown attribute hoặc root element | So sánh YAML với schema/reference/export của cùng Jenkins core và plugin set. | Bỏ field không hỗ trợ hoặc cài/pin plugin phù hợp ở sandbox rồi validate lại. |
| Nhiều file báo conflict | Xác định hai file cùng khai báo một configuration root/descriptor. | Gộp ownership thành một file cho block đó; không đổi thứ tự file để mong override. |
| `${NAME}` không resolve | Kiểm tra secret source/runtime injection, permission mount và tên biến mà không in giá trị. | Cấp secret sandbox qua nguồn canonical, restart khi process environment thay đổi; không hard-code secret. |
| Reload xong UI không đổi hoặc lỗi | Kiểm tra log, plugin lifecycle, file mount/read-only và export trước/sau. | Rollback bundle đã biết tốt; restart/recreate nếu extension không hỗ trợ hot reload. |
| Login bị khóa sau security change | Dùng account lab/break-glass đã kiểm thử, export và change record. | Dừng rollout, restore security YAML/version đã biết tốt trên controller cô lập; không tắt authorization bừa bãi. |
| Job/tool block fail | Kiểm tra Job DSL/tool/plugin có trong schema, plugin version và agent path/label. | Bỏ extension không hỗ trợ hoặc pin/cài plugin qua workflow riêng; test tool trên agent sandbox. |
| Drift liên tục quay lại | So sánh export với Git release, audit UI, plugin inventory và secret rotation event. | Chọn source of truth, back-port thay đổi hợp lệ hoặc revert có review; không force-apply mù. |

## Checklist trước khi promote

- [ ] Plugin Configuration as Code đã cài, enabled, pin version và tương thích Jenkins core/Java/plugin liên quan.
- [ ] `CASC_JENKINS_CONFIG` được inject trước startup, path chỉ đọc được bởi controller và bundle không có configuration root trùng nhau.
- [ ] YAML chỉ chứa desired configuration, placeholder/reference secret; không có password, token, private key, `.env` hay export nhạy cảm trong Git.
- [ ] Nguồn secret, identity runtime, permission file/mount, rotation và precedence deployment đã được owner xác minh mà không in secret.
- [ ] Schema/reference và YAML parser đã validate trên version plugin target; export được xử lý như artifact hạn chế quyền.
- [ ] Security realm, authorization và break-glass access đã được kiểm thử trên controller cô lập; không promote thay đổi security chưa có rollback.
- [ ] Tool/job/plugin-specific blocks chỉ có khi plugin support xuất hiện trong schema; agent smoke test xác nhận runtime thật.
- [ ] Controller cô lập dùng volume/home riêng, plugin set pin và đã verify startup, reload/restart semantics, logs, UI/export và drift baseline.
- [ ] Backup trước thay đổi, release YAML/plugin/core/image cũ, owner, change window và điều kiện rollback đã sẵn sàng.
- [ ] Production verify gồm login, authorization, queue/agent, tool/integration có liên quan và drift compare; không áp dụng mù vào production.

## Nguồn chính thức

- [Jenkins Configuration as Code project](https://www.jenkins.io/projects/jcasc/) — tổng quan dự án JCasC.
- [Configuration as Code plugin](https://plugins.jenkins.io/configuration-as-code/) — metadata plugin, tài liệu và compatibility hiện hành.
- [Configuration as Code plugin repository](https://github.com/jenkinsci/configuration-as-code-plugin) — hướng dẫn configuration path, interpolation, schema/reference và export của plugin.
- [Jenkins System Administration](https://www.jenkins.io/doc/book/system-administration/) — vận hành controller, configuration và backup.
- [Jenkins Plugin Manager](https://www.jenkins.io/doc/book/managing/plugins/) — quản lý plugin, dependency và update policy.
- [Jenkins Security](https://www.jenkins.io/doc/book/security/) — hardening, authorization và controller isolation.
- [Jenkins — Backing up and restoring](https://www.jenkins.io/doc/book/system-administration/backing-up/) — bảo vệ và diễn tập khôi phục `JENKINS_HOME`.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn lại controller, agent, job và plugin trước khi áp dụng configuration as code." />
  <Card title="Thiết lập ban đầu" href="/docs/installation/initial-setup" description="Chuẩn bị admin, URL và plugin trước khi quản lý controller bằng JCasC." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Dựng controller local cô lập với volume và image có kiểm soát." />
  <Card title="Jenkins trên Kubernetes" href="/docs/installation/kubernetes" description="Đặt configuration mount và secret runtime đúng ranh giới pod/controller." />
  <Card title="Cấu hình hệ thống" href="/docs/administration/system-configuration" description="Hiểu scope URL, tools và global properties mà JCasC có thể quản lý." />
  <Card title="Backup và khôi phục" href="/docs/administration/backup-restore" description="Chuẩn bị recovery trước khi reload, restart hoặc nâng plugin." />
  <Card title="Logs Jenkins" href="/docs/administration/logs" description="Đọc startup log và dấu vết cấu hình mà không làm lộ secret." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Giữ secret runtime của build ngoài YAML JCasC." />
  <Card title="Tổng quan Agents" href="/docs/agents/overview" description="Xác minh tool và workload trên agent thay vì controller." />
</Cards>
