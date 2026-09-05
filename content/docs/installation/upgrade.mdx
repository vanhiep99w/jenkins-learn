---
title: "Nâng cấp Jenkins"
description: "Lập kế hoạch, kiểm thử và thực hiện nâng cấp Jenkins core cùng plugin, với rollback dựa trên dữ liệu và bằng chứng."
---

Nâng cấp Jenkins không chỉ là thay một binary hoặc image tag. Jenkins core, Java, plugin, `JENKINS_HOME`, agent và Pipeline tạo thành một thay đổi vận hành có trạng thái. Trang này mô tả cách đưa thay đổi đó qua staging trước, bảo vệ dữ liệu và chỉ mở lại lịch chạy khi có bằng chứng hoạt động.

<Callout type="warn" title="Không có rollback được bảo đảm">
  Một core hoặc plugin mới có thể ghi dữ liệu theo schema mới. Nếu migration là một chiều,
  việc pin lại binary cũ trên cùng `JENKINS_HOME` có thể không khởi động được hoặc làm dữ
  liệu không nhất quán. Rollback đáng tin cậy là khôi phục một backup nhất quán vào bản
  cũ đã pin, rồi kiểm thử nó trong môi trường cô lập.
</Callout>

## Mục lục

- [Chọn phiên bản có hỗ trợ](#chọn-phiên-bản-có-hỗ-trợ)
  - [LTS và weekly release](#lts-và-weekly-release)
  - [Đọc thông tin thay đổi và ghi version pin](#đọc-thông-tin-thay-đổi-và-ghi-version-pin)
- [Kiểm tra compatibility trước khi đổi](#kiểm-tra-compatibility-trước-khi-đổi)
  - [Ma trận tương thích](#ma-trận-tương-thích)
  - [Core, plugin và Pipeline](#core-plugin-và-pipeline)
  - [Storage, controller và agent](#storage-controller-và-agent)
- [Kế hoạch nâng cấp có kiểm soát](#kế-hoạch-nâng-cấp-có-kiểm-soát)
  - [Timeline và điểm quyết định](#timeline-và-điểm-quyết-định)
  - [Inventory, backup và diễn tập restore](#inventory-backup-và-diễn-tập-restore)
  - [Staging và tiêu chí go-no-go](#staging-và-tiêu-chí-go-no-go)
- [Runbook triển khai](#runbook-triển-khai)
  - [Chuẩn bị cửa sổ thay đổi](#chuẩn-bị-cửa-sổ-thay-đổi)
    - [Đóng băng thay đổi và thông báo](#đóng-băng-thay-đổi-và-thông-báo)
    - [Dừng nhận workload có kiểm soát](#dừng-nhận-workload-có-kiểm-soát)
    - [Xác nhận điểm khôi phục](#xác-nhận-điểm-khôi-phục)
    - [Áp dụng artifact đã pin](#áp-dụng-artifact-đã-pin)
    - [Khởi động, xác minh rồi mới mở lịch](#khởi-động-xác-minh-rồi-mới-mở-lịch)
  - [Triển khai theo đường cài đặt](#triển-khai-theo-đường-cài-đặt)
  - [Health check và evidence sau nâng cấp](#health-check-và-evidence-sau-nâng-cấp)
- [Rollback thực tế](#rollback-thực-tế)
  - [Khi nào rollback](#khi-nào-rollback)
  - [Thực hiện rollback](#thực-hiện-rollback)
  - [Kiểm thử sau rollback](#kiểm-thử-sau-rollback)
- [Lab sandbox local](#lab-sandbox-local)
  - [Tạo baseline cô lập](#tạo-baseline-cô-lập)
  - [Backup, nâng cấp và kiểm tra](#backup-nâng-cấp-và-kiểm-tra)
  - [Khôi phục và cleanup an toàn](#khôi-phục-và-cleanup-an-toàn)
- [Troubleshooting](#troubleshooting)
- [Checklist phát hành](#checklist-phát-hành)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)

## Chọn phiên bản có hỗ trợ

### LTS và weekly release

Jenkins phát hành hai dòng core. **Weekly** nhận tính năng và thay đổi mới sớm hơn; nó phù hợp khi đội có staging thường xuyên, cần một sửa đổi cụ thể và chấp nhận cadence thay đổi nhanh. **LTS** là dòng ổn định cho đa số controller production: các bản LTS nhận backport bug fix và security fix đã được chọn lọc trong vòng đời hỗ trợ của dòng đó.

Không chọn chỉ theo số version lớn nhất. Với mỗi controller, xác định phiên bản đích từ [Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy/), trạng thái LTS trên [changelog](https://www.jenkins.io/changelog/) và policy nội bộ. Không bắt đầu một thay đổi production với một weekly hoặc LTS đã hết support. Nếu cần đi qua nhiều LTS, đọc từng mốc trong [LTS Upgrade Guide](https://www.jenkins.io/doc/upgrade-guide/) thay vì nhảy qua các cảnh báo trung gian.

| Nhu cầu                                | Lựa chọn mặc định               | Điều kiện bổ sung                                           |
| -------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Controller production thông thường     | LTS đang được hỗ trợ            | Đã qua staging với plugin và Pipeline quan trọng            |
| Cần tính năng/sửa lỗi chỉ có ở bản mới | Weekly đã pin                   | Có owner, cửa sổ test ngắn và kế hoạch theo weekly kế tiếp  |
| Controller legacy                      | LTS theo từng mốc upgrade guide | Không bỏ qua yêu cầu Java hoặc migration được nêu ở mỗi mốc |

<Callout type="info" title="Java không theo cảm tính">
  Java chạy controller và Java chạy agent Java phải được bản Jenkins đích hỗ trợ. Đây là
  quyết định khác với JDK mà dự án dùng để compile trên agent. Đối chiếu từng version với
  [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/)
  trước khi thay core.
</Callout>

### Đọc thông tin thay đổi và ghi version pin

Trước khi phê duyệt, đọc bốn nguồn cho **mọi** version được đi qua: LTS Upgrade Guide, changelog/release notes, [Jenkins Security Advisories](https://www.jenkins.io/security/advisories/) và trang release/compatibility của từng plugin quan trọng. Security advisory có thể buộc phải nâng core hoặc plugin; nó không thay thế kiểm thử behavior.

Ghi một bản kế hoạch bất biến trong ticket thay đổi hoặc repository vận hành. Bản ghi tối thiểu gồm:

| Hạng mục        | Ví dụ cần ghi                                                                          |
| --------------- | -------------------------------------------------------------------------------------- |
| Core cũ và đích | `2.x.y` → `2.a.b`, dòng `LTS` hoặc `weekly`, URL release notes                         |
| Runtime         | Java vendor, major version, đường dẫn executable của service                           |
| Cách đóng gói   | package version/repository, image tag **và digest**, hoặc chart version/image tag      |
| Plugin          | danh sách `shortName:version`, dependency thay đổi, plugin bị bỏ hoặc thay thế         |
| Cấu hình        | revision JCasC/Helm values/service unit, checksum và owner phê duyệt                   |
| Phục hồi        | ID backup, thời điểm nhất quán, nơi restore drill đã chạy, core/plugin pin để quay lại |

Một tag trôi như `lts-jdk21` hoặc `latest` không phải version pin. Với Docker, lưu cả digest đã inspect. Với Helm, pin chart version **và** image controller trong `values.yaml`; chart mới có thể đổi default image. Với package, lưu chính xác version package và repository/channel đã dùng. Tất cả artifact cũ cần còn truy xuất được đến hết cửa sổ rollback.

## Kiểm tra compatibility trước khi đổi

### Ma trận tương thích

Dùng một ma trận cho từng controller, không suy luận từ một controller khác. So sánh trạng thái hiện tại, đích và kết quả staging; ô chưa được xác minh là lý do trì hoãn production.

| Bề mặt                 | Câu hỏi cần trả lời                                                                                               | Bằng chứng tối thiểu                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Java                   | Core đích hỗ trợ Java của controller và agent Java không? Service thực sự gọi executable nào?                     | `java -version`, cấu hình service/container và Java Support Policy      |
| OS/package/image/chart | OS còn được vendor hỗ trợ? Repository package, image digest, chart và Kubernetes version có tương thích không?    | version pin, manifest/rendered chart, release notes                     |
| Plugin                 | Plugin có yêu cầu core cao hơn, dependency mới, bị deprecate hoặc có advisory chưa?                               | export plugin inventory, plugin manager plan, release notes             |
| Pipeline               | Declarative/Scripted syntax, shared library, SCM, credentials binding và durability còn hành xử như đã chấp nhận? | build staging của các Jenkinsfile đại diện, Console Output, test report |
| Storage                | Filesystem/PVC có đủ dung lượng, inode, IOPS, snapshot semantics và quyền UID/GID không?                          | metric trước thay đổi, backup ID, restore drill                         |
| Controller/agent       | Remoting, launcher, label, toolchain, network/TLS và số executor có còn kết nối/chạy được?                        | agent online, một build trên từng pool, queue và log                    |

Nền tảng controller, queue và agent được giải thích trong [Kiến trúc Jenkins](/docs/getting-started/architecture); yêu cầu Java, storage và network nằm ở [Yêu cầu hệ thống](/docs/getting-started/requirements).

### Core, plugin và Pipeline

Plugin là mã chạy trong controller. Nâng core mà giữ nguyên toàn bộ plugin không mặc nhiên an toàn; nâng hàng loạt plugin cùng lúc cũng làm rộng phạm vi sự cố. Phân nhóm plugin thành: bắt buộc cho controller khởi động, bắt buộc cho Pipeline/SCM/credential, và plugin ít dùng. Trong **Manage Jenkins → Plugins**, ghi plugin đang cài cùng dependency; sau đó xem Update Center và release notes để lập một plugin plan có version cụ thể.

Ưu tiên một thay đổi dễ điều tra: core trước hoặc một plugin bundle đã kiểm thử, trừ khi release note yêu cầu nâng cùng nhau. Không chép file `.jpi` từ controller khác, không xóa plugin để “sửa” boot failure, và không downgrade plugin trên `JENKINS_HOME` production khi chưa có hướng dẫn của plugin. Một dependency downgrade có thể tạo một tổ hợp core-plugin chưa từng được hỗ trợ.

Kiểm thử Pipeline bằng workload đại diện, không chỉ job `echo`. Bộ mẫu nên bao gồm checkout từ SCM, shared library, Declarative và Scripted Pipeline nếu đều đang dùng, credentials binding không lộ secret, artifact/test report, `post` action, agent label và một đường deploy bị chặn ở môi trường staging. Xem nền tảng tại [Tổng quan Jenkins Pipeline](/docs/pipelines/overview), cách chọn executor tại [Chọn agent cho Pipeline](/docs/pipelines/agents) và giới hạn credential tại [Credentials trong Pipeline](/docs/pipelines/credentials).

### Storage, controller và agent

Snapshot storage chỉ hữu ích khi nhà cung cấp xác nhận tính nhất quán và có thể restore. Để tạo backup ở trạng thái biết trước, quiet down, chờ build kết thúc hoặc abort theo policy, rồi dừng controller trước khi chụp/archive `JENKINS_HOME`. Backup cần bao gồm cấu hình, plugin, job/build metadata và key/secret liên quan theo policy bảo mật; mã hóa, phân quyền và tách failure domain. Thực hiện restore drill vào home/PVC/volume **mới**, không ghi đè home đang phục vụ.

Controller điều phối, giữ queue và dữ liệu. Nó không phải build farm: đặt built-in node/controller bằng `0` executor ở production và chạy workload trên agent riêng. Trước và sau nâng cấp, kiểm tra agent inbound/SSH/Kubernetes, certificates, URL công khai, label, toolchain, workspace và quyền network. Một agent online nhưng không có đúng label hoặc Java/toolchain vẫn làm Pipeline chờ hoặc fail.

<Callout type="error" title="Không chia sẻ một JENKINS_HOME để thử nghiệm">
  Không cho controller production và controller staging/rollback cùng ghi một home hoặc PVC.
  Clone từ backup vào storage riêng, dùng URL và webhook cách ly. Một controller duy nhất được
  quyền ghi vào mỗi bản dữ liệu tại một thời điểm.
</Callout>

## Kế hoạch nâng cấp có kiểm soát

### Timeline và điểm quyết định

```text
T-7 đến T-2 ngày        T-1 ngày             Cửa sổ thay đổi                 Sau thay đổi
Inventory ──► restore   Go/no-go ──► quiet down ─► backup ─► deploy ─► validate ─► evidence
     │             │            │                 │              │          │
     │             │            │                 │              │          └─ mở lịch hoặc rollback
     │             │            │                 │              └─ lỗi boot/plugin/Pipeline?
     │             │            │                 └─ ID backup + snapshot đã xác nhận
     │             │            └─ thông báo owner, freeze config và kế hoạch rollback
     │             └─ backup restore được vào môi trường cô lập
     └─ matrix Java/OS/plugin/agent/Pipeline hoàn tất
```

Người phê duyệt cần định nghĩa rõ ai có quyền dừng lịch, ai xác nhận backup, ai theo dõi ứng dụng và thời gian tối đa để quyết định rollback. Ghi các mốc UTC, người thao tác, lệnh/manifest được dùng và link evidence. Không để một thao tác viên vừa thay đổi vừa là nguồn xác nhận duy nhất.

### Inventory, backup và diễn tập restore

Trước cửa sổ thay đổi, chụp inventory read-only: version Jenkins từ **Manage Jenkins → System Information**, Java, `JENKINS_HOME`/PVC/volume, package/image/chart pin, plugin inventory, agent list/labels, số executor, queue/build đang chạy, cấu hình as-code và integration quan trọng. Lưu output vào nơi được kiểm soát; inventory có thể chứa hostname, URL hoặc metadata nhạy cảm.

Tạo backup nhất quán và đặt tên có timestamp/ID. Xác nhận backup hoàn tất, checksum/retention, mã hóa, quyền đọc và vị trí ngoài failure domain trước khi bắt đầu deploy. Sau đó restore backup đó vào một môi trường cô lập, khởi động bằng core/plugin pin dự kiến cho rollback và kiểm tra login, job metadata, plugin load, một agent thử cùng một Pipeline smoke test. Một archive tồn tại không chứng minh khả năng restore.

### Staging và tiêu chí go-no-go

Staging cần dùng bản sao dữ liệu đã được làm sạch theo policy hoặc cấu hình tương đương, cùng Java, hình thức cài đặt và plugin plan như production. Không cho staging gửi webhook, email, deploy hoặc dùng credential production. Ghi version đích sau khi staging boot thành công và kết quả của test matrix.

Chỉ **go** khi các điều kiện sau đều đúng: backup ID có restore drill pass; storage/snapshot đã xác nhận; Java và artifact pin khớp; không còn build không thể ngắt hoặc migration chưa hiểu; plugin plan được owner chấp nhận; agent/Pipeline smoke test pass trên staging; kênh thông báo và rollback owner sẵn sàng. Một trong các điều kiện sai là **no-go**, không phải việc “sửa nhanh” trong production.

## Runbook triển khai

### Chuẩn bị cửa sổ thay đổi

<Steps>
<Step>

### Đóng băng thay đổi và thông báo

Thông báo phạm vi, khoảng downtime dự kiến, ảnh hưởng webhook/build, link status page và người quyết định rollback. Đóng băng thay đổi plugin, Jenkins configuration, JCasC/Helm values và job configuration để backup, staging và production không lệch nhau.

</Step>
<Step>

### Dừng nhận workload có kiểm soát

Bật **Prepare for Shutdown** hoặc **Quiet Down** trong UI/API theo runbook đã xác thực. Quan sát queue và các build đang chạy. Chờ build hoàn tất hoặc abort từng build với owner; không tắt process đột ngột chỉ để rút ngắn cửa sổ. Xác nhận không còn lịch mới được nhận trước khi tạo backup nhất quán.

</Step>
<Step>

### Xác nhận điểm khôi phục

Tạo backup/snapshot theo cơ chế storage đã diễn tập, ghi backup ID và thời điểm. Dừng controller theo cơ chế của platform để bảo đảm dữ liệu yên tĩnh. Không chạy thao tác xóa volume, PVC, `JENKINS_HOME` hoặc plugin directory trong runbook nâng cấp.

</Step>
<Step>

### Áp dụng artifact đã pin

Dùng đúng package, image digest hoặc chart/values đã được staging. Chỉ một đường triển khai được chọn cho controller đó; không trộn package với Docker, hoặc thay chart lẫn image ngoài kế hoạch.

</Step>
<Step>

### Khởi động, xác minh rồi mới mở lịch

Theo dõi log boot và health check. Đối chiếu core/Java/plugin versions, agent và Pipeline smoke test với evidence staging. Chỉ tắt quiet down và mở lại scheduling sau khi đạt tiêu chí trong phần health check.

</Step>
</Steps>

### Triển khai theo đường cài đặt

Các ví dụ dưới đây minh họa điểm kiểm soát, không phải lệnh chung để áp vào một controller chưa inventory. Thay các biến bằng pin đã được review. Không thay đổi đường dẫn `JENKINS_HOME`, UID/GID, PVC hoặc dữ liệu trong khi đổi artifact.

<Tabs items={['Docker image', 'Package và systemd', 'Helm', 'Windows MSI']}>
<Tab value="Docker image">

Với controller Docker, pull image đích trước downtime và inspect digest. Giữ named volume hoặc bind mount hiện có; recreate container chỉ thay process/image, không tạo home mới.

```bash
TARGET_IMAGE='jenkins/jenkins:<approved-version>-jdk21'
docker pull "$TARGET_IMAGE"
docker image inspect "$TARGET_IMAGE" \
  --format 'tag={{index .RepoTags 0}} digest={{index .RepoDigests 0}}'

# Sau quiet down, backup và khi controller đã dừng theo Compose runbook:
docker compose config > compose-rendered-before-upgrade.yaml
docker compose pull jenkins
docker compose up -d --no-deps --force-recreate jenkins
docker compose ps
docker compose logs --tail=200 jenkins
```

`docker compose` phải tham chiếu chính xác image pin trong file cấu hình đã review. Không dùng `docker compose down --volumes`, `docker volume prune` hay `docker system prune --volumes` trong thay đổi này. Xem mô hình volume tại [Chạy Jenkins với Docker](/docs/installation/docker).

</Tab>
<Tab value="Package và systemd">

Repository/package manager phải được cấu hình từ nguồn chính thức và version package đích phải có trong inventory. Xem candidate trước khi cài, áp dụng version đã pin theo hướng dẫn distro đã kiểm thử, rồi kiểm tra service; không dùng lệnh package mơ hồ tự chọn “bản mới nhất”.

```bash
# Ví dụ kiểm tra read-only trên host Debian/Ubuntu; chưa thay đổi package.
apt-cache policy jenkins
systemctl status jenkins --no-pager
journalctl -u jenkins -n 200 --no-pager
```

Sau khi package đã được áp dụng trong cửa sổ, chỉ dùng `systemctl start jenkins` hoặc `systemctl restart jenkins` theo service unit hiện hữu và theo dõi journal. Không `rm -rf /var/lib/jenkins`, không đổi `JENKINS_HOME` trong service unit và không trộn nâng Java với core nếu staging chưa kiểm thử cả tổ hợp. Hướng dẫn cài đặt nền tảng ở [Cài Jenkins trên Linux](/docs/installation/linux).

</Tab>
<Tab value="Helm">

Render trước để biết chart thay đổi StatefulSet, image, security context, PVC và plugin/JCasC như thế nào. Pin chart bằng `--version`, pin image trong `values.yaml`, lưu values hiện tại và để `--atomic` chỉ là lớp hỗ trợ rollout—not a substitute for data rollback.

```bash
helm get values jenkins -n jenkins -o yaml > jenkins-values-before-upgrade.yaml
helm upgrade jenkins jenkinsci/jenkins \
  --namespace jenkins \
  --version '<approved-chart-version>' \
  --values values-approved.yaml \
  --dry-run --debug

# Chạy bỏ --dry-run chỉ sau quiet down, backup và phê duyệt go.
helm upgrade jenkins jenkinsci/jenkins \
  --namespace jenkins \
  --version '<approved-chart-version>' \
  --values values-approved.yaml \
  --atomic --timeout 15m
kubectl rollout status statefulset/jenkins -n jenkins --timeout=15m
```

Không xóa PVC/VolumeSnapshot để thử lại rollout. `helm rollback` có thể đưa manifest về revision cũ, nhưng không tự đảo migration trong PVC. Xem đường triển khai tại [Triển khai Jenkins trên Kubernetes](/docs/installation/kubernetes).

</Tab>
<Tab value="Windows MSI">

Tải trước MSI LTS đã pin từ nguồn chính thức, kiểm tra chữ ký/hash theo quy trình tổ chức và giữ MSI cũ cho rollback. Dừng scheduling, tạo backup nhất quán, rồi dùng installer trong cửa sổ đã phê duyệt với **cùng** service account và data directory đã inventory. Không cài chồng một MSI chưa xác minh hoặc di chuyển `JENKINS_HOME` trong cùng thay đổi.

```powershell
Get-Service -Name Jenkins | Select-Object Status, Name, DisplayName
Get-CimInstance Win32_Service -Filter "Name='Jenkins'" |
  Select-Object Name, StartName, PathName, State
Get-FileHash -Algorithm SHA256 -Path 'C:\Staging\jenkins-approved.msi'
Get-WinEvent -LogName Application -MaxEvents 100 |
  Where-Object ProviderName -Match 'Jenkins' |
  Select-Object TimeCreated, LevelDisplayName, Message
```

Các lệnh trên chỉ thu evidence; quy trình MSI của tổ chức mới là nơi xác định tham số silent hay giao diện. Sau restart service, xác nhận service account vẫn đọc/ghi được home thay vì cấp quyền rộng. Xem [Cài Jenkins trên Windows](/docs/installation/windows).

</Tab>
</Tabs>

### Health check và evidence sau nâng cấp

Trước khi mở scheduling, theo dõi log đến khi Jenkins hoàn tất khởi động và không còn lỗi plugin/dependency lặp lại. Xác nhận giao diện qua URL TLS chuẩn, core version, Java runtime, plugin set, cấu hình global, credentials chỉ ở mức hiện diện (không đọc secret), queue và disk/storage health.

Chạy smoke test có kiểm soát trên **agent** cho từng pool quan trọng: checkout repository thử, resolve shared library nếu dùng, build/test không đặc quyền, publish test report/artifact và một credential binding staging. Không chạy workload trên controller để “kiểm tra nhanh”. Ghi build URL/number, Console Output, agent label, thời lượng, result và metric CPU/RAM/disk/queue trước–sau vào ticket.

Mở lại scheduling theo từng nhóm job nếu policy cho phép. Theo dõi webhook, queue, agent reconnect, error rate và thời lượng Pipeline trong khoảng quan sát đã định. Giữ backup, artifact cũ và khả năng rollback cho đến khi owner chấp nhận evidence.

## Rollback thực tế

### Khi nào rollback

Quyết định rollback theo tiêu chí được chốt trước cửa sổ, ví dụ: controller không boot trong timeout, plugin nền tảng không load, agent quan trọng không kết nối, smoke test Pipeline fail có thể tái hiện, hoặc chỉ số lỗi vượt ngưỡng. Không rollback chỉ vì một cảnh báo đã biết nhưng không ảnh hưởng tiêu chí; ngược lại, không kéo dài troubleshooting khi đã vượt thời gian quyết định.

Trước khi hành động, dừng scheduling, giữ log và trạng thái lỗi, thông báo owner và kiểm tra xem core/plugin đã chạy migration một chiều chưa. Nếu chưa có bằng chứng tương thích ngược, chọn restore backup thay vì khởi động binary cũ trên home đã bị phiên bản mới ghi.

### Thực hiện rollback

1. Giữ nguyên home/PVC/volume hiện tại để điều tra; không ghi đè backup duy nhất.
2. Pin lại core, Java, package/image digest hoặc chart revision đã được staging cho đường rollback.
3. Restore backup nhất quán **trước nâng cấp** vào storage mới hoặc volume/PVC đã được kiểm soát; khôi phục key/secret liên quan theo chính sách bảo mật.
4. Chỉ để một controller cũ dùng bản dữ liệu restore đó. Kiểm tra quyền storage, URL và network trước boot.
5. Khởi động, giữ quiet down, rồi chạy health check và smoke test giống acceptance của bản mới.
6. Chỉ mở lịch lại sau khi evidence pass; lưu thời điểm rollback, backup ID, version đã pin và nguyên nhân.

Với Docker, rollback thường là recreate bằng image digest cũ **và** volume đã restore, không phải chỉ đổi tag trong container hiện tại. Với package, cài đúng version cũ còn có trong repository/cache theo runbook distro, rồi dùng home restore. Với Helm, có thể dùng `helm rollback` cho manifest, nhưng PVC vẫn cần được khôi phục từ snapshot/backup tương thích; revision Helm cũ không làm dữ liệu tự quay lại. Với Windows, dùng MSI LTS cũ đã pin cùng bản backup restore, không dùng một copy live của home.

### Kiểm thử sau rollback

Đối chiếu core/Java/plugin inventory với baseline. Xác minh login, job/config metadata, agent chính, credential binding staging, Pipeline smoke test và queue. Quan sát một khoảng tương tự sau nâng cấp trước khi kết luận ổn định. Nếu restore fail hoặc behavior còn sai, giữ scheduling đóng, bảo toàn evidence và chuyển sang quy trình incident/recovery của tổ chức; không thử nhiều tổ hợp version trực tiếp trên cùng dữ liệu.

## Lab sandbox local

Lab này mô phỏng quy trình bằng Docker named volume riêng, không dùng controller thật, credential thật, webhook hay repository production. Chọn hai image Jenkins đã đối chiếu support policy: một baseline và một target. Mỗi image phải là tag/digest đã pin, không dùng `latest`.

<Callout type="error" title="Chỉ dùng volume có tiền tố lab">
  Các lệnh cleanup chỉ áp dụng cho `jenkins-upgrade-lab-*` do chính lab tạo. Dừng ngay nếu
  biến tên khác, Docker context không phải sandbox hoặc volume chứa dữ liệu bạn cần giữ.
</Callout>

### Tạo baseline cô lập

```bash
export LAB_PREFIX='jenkins-upgrade-lab'
export BASELINE_IMAGE='jenkins/jenkins:<approved-baseline>-jdk21'
export TARGET_IMAGE='jenkins/jenkins:<approved-target>-jdk21'
export BASELINE_VOL="${LAB_PREFIX}-baseline"
export CANDIDATE_VOL="${LAB_PREFIX}-candidate"
export ROLLBACK_VOL="${LAB_PREFIX}-rollback"
export BASELINE_CTR="${LAB_PREFIX}-baseline"
export CANDIDATE_CTR="${LAB_PREFIX}-candidate"

# Kiểm tra context, pull và ghi digest trước khi tạo dữ liệu lab.
docker context show
docker pull "$BASELINE_IMAGE"
docker pull "$TARGET_IMAGE"
docker image inspect "$BASELINE_IMAGE" --format '{{index .RepoDigests 0}}'
docker image inspect "$TARGET_IMAGE" --format '{{index .RepoDigests 0}}'

docker volume create "$BASELINE_VOL"
docker run -d --name "$BASELINE_CTR" \
  -p 127.0.0.1:18080:8080 \
  -v "$BASELINE_VOL":/var/jenkins_home \
  "$BASELINE_IMAGE"
docker logs -f "$BASELINE_CTR"
```

Kết quả mong đợi: log báo Jenkins sẵn sàng, UI chỉ mở ở `http://127.0.0.1:18080`, và `docker volume inspect "$BASELINE_VOL"` cho thấy volume lab. Hoàn tất setup tối thiểu trong UI nếu cần; không thêm secret. Dừng theo `Ctrl-C` chỉ dừng theo dõi log, không dừng container.

### Backup, nâng cấp và kiểm tra

Dừng baseline để tạo bản archive ở trạng thái yên tĩnh. Copy archive vào thư mục lab được bảo vệ; lệnh không đụng volume của controller khác.

```bash
docker stop "$BASELINE_CTR"
mkdir -p .jenkins-upgrade-lab-backups
BACKUP_FILE=".jenkins-upgrade-lab-backups/${LAB_PREFIX}-baseline.tgz"
docker run --rm \
  -v "$BASELINE_VOL":/data:ro \
  -v "$PWD/.jenkins-upgrade-lab-backups":/backup \
  alpine:3.20 sh -c 'cd /data && tar czf /backup/jenkins-upgrade-lab-baseline.tgz .'
tar tzf "$BACKUP_FILE" | head

docker volume create "$CANDIDATE_VOL"
docker run --rm \
  -v "$CANDIDATE_VOL":/data \
  -v "$PWD/.jenkins-upgrade-lab-backups":/backup:ro \
  alpine:3.20 sh -c 'tar xzf /backup/jenkins-upgrade-lab-baseline.tgz -C /data'
docker run -d --name "$CANDIDATE_CTR" \
  -p 127.0.0.1:18081:8080 \
  -v "$CANDIDATE_VOL":/var/jenkins_home \
  "$TARGET_IMAGE"
docker logs -f "$CANDIDATE_CTR"
```

Kết quả mong đợi: baseline archive liệt kê được, candidate boot từ **bản sao** home ở `http://127.0.0.1:18081`, và System Information hiển thị target core/Java. Ghi hai digest, thời gian boot và lỗi plugin nếu có. Tạo một job Pipeline chỉ in `echo 'upgrade smoke test'`; kết quả phải là `SUCCESS`. Nếu boot hoặc smoke test fail, không dùng candidate volume cho baseline—chuyển sang phần khôi phục.

### Khôi phục và cleanup an toàn

Để diễn tập rollback, restore cùng archive vào volume thứ ba rồi boot nó bằng baseline image. Điều này kiểm tra backup và pin cũ mà không hạ version trên candidate đã được nâng cấp.

```bash
docker volume create "$ROLLBACK_VOL"
docker run --rm \
  -v "$ROLLBACK_VOL":/data \
  -v "$PWD/.jenkins-upgrade-lab-backups":/backup:ro \
  alpine:3.20 sh -c 'tar xzf /backup/jenkins-upgrade-lab-baseline.tgz -C /data'
docker run -d --name "${LAB_PREFIX}-rollback" \
  -p 127.0.0.1:18082:8080 \
  -v "$ROLLBACK_VOL":/var/jenkins_home \
  "$BASELINE_IMAGE"
docker logs -f "${LAB_PREFIX}-rollback"
```

Kết quả mong đợi: rollback controller boot bằng baseline pin từ volume restore mới; xác nhận version và job smoke test trong UI. Trước cleanup, liệt kê chính xác tài nguyên sẽ xóa. Chỉ khi danh sách chỉ có lab này và bạn không cần giữ evidence, chạy đoạn guard sau:

```bash
case "$LAB_PREFIX" in
  jenkins-upgrade-lab) ;;
  *) echo 'Từ chối cleanup: prefix không hợp lệ' >&2; exit 1 ;;
esac

docker ps -a --filter "name=${LAB_PREFIX}" --format 'table {{.Names}}\t{{.Status}}'
docker volume ls --format '{{.Name}}' | grep "^${LAB_PREFIX}-" || true
# Xem lại output ở trên trước khi bỏ comment ba dòng xóa bên dưới.
# docker rm -f "$BASELINE_CTR" "$CANDIDATE_CTR" "${LAB_PREFIX}-rollback"
# docker volume rm "$BASELINE_VOL" "$CANDIDATE_VOL" "$ROLLBACK_VOL"
# rm -rf .jenkins-upgrade-lab-backups
```

Các dòng phá hủy được comment có chủ đích. Không chạy `docker volume prune`, `docker system prune --volumes` hoặc cleanup toàn cục để dọn lab.

## Troubleshooting

| Triệu chứng                            | Kiểm tra có thứ tự                                                                  | Hành động an toàn                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Jenkins không boot sau đổi core        | Log boot, Java executable/version, plugin dependency và disk/quyền home             | Giữ quiet down; không xóa plugin. Nếu vượt tiêu chí, restore backup vào storage mới và rollback pin. |
| Plugin disabled hoặc thiếu class       | Core requirement, dependency tree, release note/plugin advisory                     | Quay về plugin plan đã staging hoặc restore toàn bộ baseline; không copy `.jpi` ngẫu nhiên.          |
| Agent offline sau nâng cấp             | Certificate/URL, Remoting log, Java agent, label, firewall và launcher              | Test một agent staging; không chuyển build về controller.                                            |
| Pipeline khác behavior                 | Jenkinsfile, shared library revision, plugin version, Console Output và test report | Reproduce bằng smoke job/agent staging; giữ artifact và log trước khi rollback.                      |
| Helm rollout hoặc package service fail | Rendered manifest/service unit, event/journal, PVC mount và image/package pin       | Không xóa PVC hay home để retry; dùng kế hoạch restore khi timeout/threshold đạt.                    |
| Storage đầy hoặc permission denied     | Dung lượng/inode, ownership, security context, mount/PVC event                      | Giải phóng đúng dữ liệu đã được policy cho phép hoặc mở rộng storage; không `chmod -R 777`.          |

## Checklist phát hành

- [ ] Đã chọn LTS hoặc weekly còn được support và đọc mọi mốc upgrade guide đi qua.
- [ ] Đã ghi core, Java, package/image digest/chart, plugin và config version pin.
- [ ] Đã đọc changelog, security advisories và release notes của plugin quan trọng.
- [ ] Ma trận Java, OS/package/image/chart, plugin, Pipeline, storage và agent đã pass ở staging.
- [ ] Controller production có `0` executor; smoke test chạy trên agent phù hợp.
- [ ] Inventory, backup nhất quán, checksum/quyền lưu trữ và restore drill có evidence.
- [ ] Owner đã nhận thông báo; config/plugin freeze, quiet down và xử lý build đang chạy có kế hoạch.
- [ ] Snapshot/backup ID, rollback pin và tiêu chí quyết định đã được phê duyệt trước deploy.
- [ ] Đã kiểm tra boot, core/Java/plugin, agent, Pipeline, queue, storage và metric sau nâng cấp.
- [ ] Chỉ mở lại scheduling sau evidence; backup và artifact rollback vẫn được giữ theo retention.

## Nguồn Jenkins chính thức

- [Jenkins LTS Upgrade Guide](https://www.jenkins.io/doc/upgrade-guide/)
- [Jenkins changelog](https://www.jenkins.io/changelog/)
- [Jenkins Security Advisories](https://www.jenkins.io/security/advisories/)
- [Jenkins Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy/)
- [Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/)
- [Managing Plugins](https://www.jenkins.io/doc/book/managing/plugins/)
- [Installing Jenkins](https://www.jenkins.io/doc/book/installing/)
- [Jenkins Docker image](https://github.com/jenkinsci/docker)
- [Jenkins Helm chart upgrade notes](https://github.com/jenkinsci/helm-charts/blob/main/charts/jenkins/UPGRADING.md)
