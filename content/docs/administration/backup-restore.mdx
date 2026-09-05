---
title: "Backup & Restore Jenkins"
description: "Lập kế hoạch, tạo bản sao nhất quán và kiểm chứng phục hồi JENKINS_HOME một cách an toàn."
---

<Callout type="info" title="Phạm vi và nguyên tắc an toàn">
  Trang này mô tả quy trình vận hành cho Jenkins controller. Mọi đường dẫn, tên bucket, host, URL và khóa trong ví dụ đều là giá trị minh họa. Thử restore trước trên controller cô lập; backup không nhất quán không phải là cam kết có thể phục hồi.
</Callout>

## Mục lục

- [Mục tiêu phục hồi](#mục-tiêu-phục-hồi)
- [Phạm vi cần bảo vệ](#phạm-vi-cần-bảo-vệ)
  - [Dữ liệu thuộc JENKINS_HOME](#dữ-liệu-thuộc-jenkins_home)
  - [Dữ liệu không nên sao lưu mù](#dữ-liệu-không-nên-sao-lưu-mù)
- [Chiến lược nhất quán](#chiến-lược-nhất-quán)
  - [Chọn cửa sổ và phương pháp](#chọn-cửa-sổ-và-phương-pháp)
  - [Docker, package/systemd và Kubernetes](#docker-packagesystemd-và-kubernetes)
- [Chính sách bảo vệ bản sao](#chính-sách-bảo-vệ-bản-sao)
- [Quy trình tạo backup tham chiếu](#quy-trình-tạo-backup-tham-chiếu)
  - [Ghi nhận inventory và cửa sổ backup](#ghi-nhận-inventory-và-cửa-sổ-backup)
  - [Tạo điểm dữ liệu đứng yên](#tạo-điểm-dữ-liệu-đứng-yên)
  - [Backup persistent data và xác minh ngay](#backup-persistent-data-và-xác-minh-ngay)
  - [Ghi nhận bằng chứng và khôi phục dịch vụ](#ghi-nhận-bằng-chứng-và-khôi-phục-dịch-vụ)
- [Quy trình restore trên controller cô lập](#quy-trình-restore-trên-controller-cô-lập)
  - [Chọn bản sao và kiểm tra tính phù hợp](#chọn-bản-sao-và-kiểm-tra-tính-phù-hợp)
  - [Chuẩn bị controller cô lập](#chuẩn-bị-controller-cô-lập)
  - [Đặt dữ liệu và khóa theo đúng quan hệ](#đặt-dữ-liệu-và-khóa-theo-đúng-quan-hệ)
  - [Khởi động có kiểm soát và đối chiếu môi trường](#khởi-động-có-kiểm-soát-và-đối-chiếu-môi-trường)
  - [Quyết định chuyển đổi hoặc rollback](#quyết-định-chuyển-đổi-hoặc-rollback)
- [Kiểm chứng phục hồi và restore drill](#kiểm-chứng-phục-hồi-và-restore-drill)
- [Lab local sandbox](#lab-local-sandbox)
  - [Tạo workspace lab và dữ liệu giả](#tạo-workspace-lab-và-dữ-liệu-giả)
  - [Đóng gói, tạo checksum và kiểm tra archive](#đóng-gói-tạo-checksum-và-kiểm-tra-archive)
  - [Restore sang thư mục cô lập và đối chiếu nội dung](#restore-sang-thư-mục-cô-lập-và-đối-chiếu-nội-dung)
  - [Cleanup đúng phạm vi lab](#cleanup-đúng-phạm-vi-lab)
- [Khắc phục sự cố](#khắc-phục-sự-cố)
- [Checklist vận hành](#checklist-vận-hành)
- [Tài liệu liên quan](#tài-liệu-liên-quan)
- [Nguồn chính thức](#nguồn-chính-thức)

## Mục tiêu phục hồi

Backup Jenkins không chỉ là nén một thư mục. Mục tiêu là khôi phục một controller về trạng thái có thể đăng nhập, đọc cấu hình job, giải mã credential bằng **đúng khóa gốc**, nhận diện plugin và chạy một kiểm tra không phá hủy.

Trước khi chọn công cụ, chốt hai mục tiêu với owner dịch vụ:

| Mục tiêu | Câu hỏi cần trả lời | Ví dụ policy |
| --- | --- | --- |
| RPO (Recovery Point Objective) | Có thể mất tối đa bao nhiêu dữ liệu mới? | Chấp nhận mất tối đa 24 giờ cấu hình và build record. |
| RTO (Recovery Time Objective) | Phải đưa controller hoạt động lại trong bao lâu? | Có controller cô lập để xác nhận backup trong 4 giờ; production chỉ chuyển đổi sau phê duyệt. |

RPO quyết định tần suất và loại snapshot. RTO quyết định vị trí bản sao, băng thông, tài liệu runbook và mức độ tự động hóa. Cả hai phải tính cả thời gian tải bản sao offsite, giải mã, kiểm tra checksum và xác nhận của người vận hành.

## Phạm vi cần bảo vệ

### Dữ liệu thuộc JENKINS_HOME

`JENKINS_HOME` là trạng thái bền vững của controller, không chỉ là thư mục job. Vị trí thực tế phụ thuộc cách cài đặt; xác nhận nó tại **Manage Jenkins → System** hoặc qua biến môi trường của service/container trước khi đưa vào policy.

| Nhóm | Ví dụ thường gặp trong `JENKINS_HOME` | Vì sao cần bảo vệ |
| --- | --- | --- |
| Cấu hình controller | `config.xml`, cấu hình node, shared configuration và file cấu hình job | Giữ global settings, job/Pipeline definition, quyền và metadata vận hành. |
| Job và build record | `jobs/`, `builds/`, build metadata, log và fingerprint nếu còn trong home | Khôi phục lịch sử, trạng thái build và dấu vết chẩn đoán theo retention đã chọn. |
| Plugin | `plugins/` và plugin pin/metadata liên quan | Giúp tái tạo plugin inventory tương thích với cấu hình đã backup. |
| Credential metadata đã mã hóa | `credentials.xml` và metadata credential store | Nội dung chỉ có nghĩa khi đi kèm khóa trong `secrets/`; không đưa credential thật vào tài liệu, log hay ticket. |
| Khóa controller | đặc biệt `secrets/`, gồm `master.key` và các file khóa liên quan | Cho phép Jenkins giải mã dữ liệu nhạy cảm đã mã hóa. Mất hoặc thay sai khóa có thể làm credential không đọc được. |
| Artifact | artifact được lưu trong `JENKINS_HOME` hoặc storage được cấu hình riêng | Artifact là dữ liệu build, cần policy riêng theo giá trị, dung lượng và retention. |

Nếu artifact được đẩy sang object storage, artifact manager hoặc repository ngoài `JENKINS_HOME`, backup home **không** bao hàm dữ liệu đó. Lập inventory cho từng backend và kiểm tra cơ chế backup/retention của backend tương ứng.

<Callout type="error" title="Bảo vệ secrets và master key">
  `JENKINS_HOME/secrets/` có độ nhạy tương đương credential vault của controller. Mã hóa bản sao, giới hạn người có thể đọc hoặc restore, tách quyền quản trị backup khỏi quyền dùng Jenkins khi khả thi, và không gửi thư mục này qua chat, email hoặc repository. Đừng thử “sửa” khóa bằng file từ controller khác.
</Callout>

### Dữ liệu không nên sao lưu mù

Không phải byte nào gần Jenkins cũng đáng đưa vào backup. Sao lưu mù làm tăng chi phí, kéo dài RTO và có thể thu thập dữ liệu tạm hoặc secret bị rò trong workspace.

- **Cache và dữ liệu tái tạo được:** download cache, update center cache, thư mục tạm và file lock nên được loại trừ sau khi xác nhận chúng không chứa cấu hình cần giữ.
- **Agent workspace:** workspace là vùng làm việc của agent, không phải nguồn khôi phục controller. Nó có thể lớn, ngắn hạn, chứa checkout hoặc file sinh ra từ build. Hãy tái tạo từ source, dependency cache có kiểm soát và Pipeline.
- **Remote agent và ephemeral agent:** dữ liệu trên VM agent, Docker agent hoặc Pod agent có vòng đời riêng. Xác định retention theo workload thay vì gộp vào backup `JENKINS_HOME`.
- **Log và artifact lớn:** chỉ đưa vào bản sao khi RPO/RTO và yêu cầu audit cần chúng. Nếu chuyển sang log/artifact backend riêng, kiểm tra policy của backend đó.

Xem [tổng quan Jenkins](/docs/getting-started/overview), [kiến trúc Jenkins](/docs/getting-started/architecture), [Pipeline](/docs/pipelines/overview) và [agents](/docs/agents/overview) để phân biệt controller, agent, executor và workspace.

## Chiến lược nhất quán

Một bản sao nhất quán có các file phản ánh cùng một thời điểm logic. Copy `JENKINS_HOME` khi controller đang ghi `config.xml`, build record hoặc credential metadata có thể tạo tập file nửa cũ nửa mới. Không khuyến nghị copy live tùy tiện rồi coi đó là backup có thể restore.

### Chọn cửa sổ và phương pháp

Ưu tiên theo thứ tự sau, sau khi đánh giá RPO/RTO và cơ chế storage:

1. **Quiet down rồi dừng controller sạch sẽ.** Quiet down ngăn build mới vào queue; đợi build đang chạy kết thúc hoặc xử lý theo quyết định đã phê duyệt, sau đó stop service/container/Pod và tạo bản sao khi dữ liệu đứng yên. Đây là phương án dễ giải thích nhất cho backup file-level.
2. **Snapshot application-consistent.** Dùng snapshot volume/storage chỉ khi nền tảng và runbook chứng minh snapshot được điều phối sau quiet down hoặc stop, có điểm khôi phục rõ ràng và đã restore drill thành công.
3. **Backup do nền tảng quản lý.** Có thể dùng công cụ backup volume hoặc filesystem, nhưng nó phải bao phủ đúng persistent data, mã hóa, checksum, retention và quy trình khôi phục đã kiểm chứng.

<Callout type="warn" title="Quiet down không tự làm dữ liệu thành nhất quán">
  Quiet down không tự dừng các build đang chạy và không thay thế bước dừng hoặc snapshot application-consistent. Nếu không thể tạo một điểm nhất quán, đánh dấu bản sao là chưa được kiểm chứng; không hứa nó sẽ restore được.
</Callout>

### Docker, package/systemd và Kubernetes

| Cách triển khai | Vùng dữ liệu cần xác định | Cách tạo điểm nhất quán | Lưu ý restore |
| --- | --- | --- | --- |
| Docker | Docker named volume hoặc bind mount chứa `JENKINS_HOME`, không phải writable layer tạm của container | quiet down, stop container, rồi backup/snapshot **volume hoặc host path** | Dùng image Jenkins và plugin inventory tương thích; mount bản sao vào controller cô lập. |
| Package/systemd | `JENKINS_HOME` của service và ownership của user chạy Jenkins | quiet down, `systemctl stop jenkins`, rồi backup filesystem hoặc snapshot đã được phê duyệt | Khôi phục owner/group và mode trước khi start service; xác nhận service unit trỏ đúng home. |
| Kubernetes | PVC chứa home, StorageClass/snapshot capability và namespace liên quan | quiet down, scale/stop controller theo runbook, rồi tạo `VolumeSnapshot` application-consistent hoặc backup PVC | Restore sang PVC mới trong namespace cô lập; không ghi đè PVC production để thử nghiệm. |

Tham khảo hướng dẫn [Docker](/docs/installation/docker), [Linux](/docs/installation/linux), [Kubernetes](/docs/installation/kubernetes) và [Windows](/docs/installation/windows) để đối chiếu cách cài đặt. Với agent chạy container hoặc Pod, xem [Docker agents](/docs/agents/docker-agents) và [Kubernetes agents](/docs/agents/kubernetes-agents).

```text
                 điểm khôi phục đã kiểm chứng
┌──────────────┐  quiet down / stop  ┌────────────────┐
│ Jenkins       │ ─────────────────► │ JENKINS_HOME    │
│ controller    │                    │ + keys + data   │
└──────┬───────┘                    └───────┬────────┘
       │                                      │ snapshot / archive
       │                                      ▼
       │                           ┌────────────────────┐
       │                           │ encrypted backup    │
       │                           │ checksum + manifest │
       │                           └─────────┬──────────┘
       │                                     │ offsite copy
       ▼                                     ▼
┌──────────────────┐               ┌────────────────────┐
│ controller cô lập │ ◄──────────── │ kho lưu trữ tách    │
│ restore + verify  │               │ quyền truy cập      │
└──────────────────┘               └────────────────────┘
```

## Chính sách bảo vệ bản sao

Một policy tối thiểu phải trả lời được **ai** tạo/đọc/restore bản sao, bản sao được giữ **ở đâu**, trong **bao lâu**, và có thể chứng minh nó không bị thay đổi thế nào.

- **Mã hóa:** mã hóa khi truyền và khi lưu. Lưu khóa mã hóa backup trong hệ thống quản lý khóa được phê duyệt, tách khỏi nơi chứa archive; định kỳ kiểm tra khả năng giải mã theo quy trình kiểm soát.
- **Offsite:** duy trì ít nhất một bản sao ở fault domain khác với controller, ví dụ account/project hoặc site khác. Offsite không đồng nghĩa public bucket; chặn public access và dùng IAM tối thiểu.
- **Retention:** định nghĩa chu kỳ daily/weekly/monthly, thời gian giữ và cơ chế xóa theo policy. Giữ đủ generations để rollback về trước thời điểm lỗi được phát hiện, đồng thời kiểm soát chi phí artifact/log lớn.
- **Access control:** cấp quyền đọc bản sao, quyền dùng khóa và quyền khởi tạo restore theo vai trò riêng. Bật audit log cho thao tác tải, xóa, thay policy và restore.
- **Checksum và chain of custody:** tạo manifest ghi backup ID, thời điểm, nguồn, công cụ, phiên bản, checksum SHA-256 và người/automation tạo. Kiểm tra checksum sau upload và trước restore. Lưu log phê duyệt, vị trí archive và kết quả drill để truy vết ai đã chạm vào bản sao.

Ví dụ dưới đây chỉ minh họa manifest cho **archive đã mã hóa**. Thay `<backup-file>` bằng tên file trong sandbox hoặc runbook nội bộ; không dùng tên, bucket hay khóa thật trong tài liệu công khai.

```bash
sha256sum <backup-file>.tar.enc > <backup-file>.tar.enc.sha256
sha256sum --check <backup-file>.tar.enc.sha256
```

Kết quả mong đợi của lệnh thứ hai là `<backup-file>.tar.enc: OK`. Checksum chỉ chứng minh file đã kiểm tra không đổi so với manifest; nó không chứng minh archive chứa một snapshot Jenkins nhất quán.

## Quy trình tạo backup tham chiếu

Điều chỉnh câu lệnh theo công cụ backup đã được phê duyệt. Các giá trị minh họa dưới đây cố ý không thể chạy trực tiếp trên một hệ thống thật.

<Steps>
<Step>

### Ghi nhận inventory và cửa sổ backup

Ghi `JENKINS_HOME` thực tế, Jenkins core version, image/package version, OS/storage driver, plugin inventory, backend artifact, RPO/RTO và người phê duyệt. Đối chiếu plugin với [hướng dẫn upgrade](/docs/installation/upgrade) trước khi dùng bản sao cho migration.

Ví dụ inventory an toàn cho sandbox:

```bash
find <lab-jenkins-home>/plugins -maxdepth 1 -name '*.jpi' -printf '%f\n' | sort > <lab-backup-dir>/plugin-inventory.txt
```

Kết quả mong đợi: một file tên plugin, không chứa credential value.

</Step>
<Step>

### Tạo điểm dữ liệu đứng yên

Đặt controller vào quiet down, thông báo cửa sổ bảo trì và theo dõi build đang chạy. Khi runbook cho phép, dừng controller sạch sẽ hoặc kích hoạt snapshot application-consistent. Không kill process để “cho nhanh”; ghi nhận mọi build bị gián đoạn và quyết định xử lý của owner.

</Step>
<Step>

### Backup persistent data và xác minh ngay

Backup đúng `JENKINS_HOME` persistent storage, bao gồm `secrets/`, theo danh sách scope đã duyệt. Loại trừ cache/temp/workspace bằng quy tắc cụ thể đã review, không bằng wildcard không rõ nghĩa. Mã hóa archive, tạo manifest/checksum, upload bản sao offsite và xác nhận checksum ở đích.

Không in cây `secrets/`, không đính kèm archive vào ticket, và không đưa backup vào image Docker hoặc Git repository.

</Step>
<Step>

### Ghi nhận bằng chứng và khôi phục dịch vụ

Cập nhật backup ID, thời điểm, checksum, retention expiry, vị trí offsite và trạng thái thành công/thất bại vào hệ thống vận hành. Start lại controller chỉ sau khi hoàn tất thao tác storage; bỏ quiet down theo runbook và theo dõi queue, agent cùng log khởi động.

</Step>
</Steps>

## Quy trình restore trên controller cô lập

Restore là một thay đổi rủi ro cao. Làm trên network/namespace/account cô lập trước; controller thử nghiệm không được có quyền gửi webhook, trigger production agent hay ghi vào artifact repository production.

<Steps>
<Step>

### Chọn bản sao và kiểm tra tính phù hợp

Chọn backup ID đáp ứng RPO, xác minh chain of custody và checksum trước khi giải mã. Đối chiếu Jenkins core version, Java/runtime, OS/image và plugin inventory. Bản restore nên dùng phiên bản tương thích với thời điểm backup; nâng cấp chỉ là bước riêng có backup và kế hoạch rollback.

</Step>
<Step>

### Chuẩn bị controller cô lập

Tạo host/container/namespace mới với `JENKINS_HOME` trống, storage mới và quyền tối thiểu. Chặn egress hoặc dùng endpoint giả lập nếu job có thể gọi hệ thống ngoài. Đảm bảo user chạy Jenkins sở hữu file restore; ví dụ minh họa trên Linux là `chown -R <jenkins-user>:<jenkins-group> <isolated-jenkins-home>` sau khi đã xác nhận chính xác đường dẫn lab.

</Step>
<Step>

### Đặt dữ liệu và khóa theo đúng quan hệ

Giải mã archive trong vùng được bảo vệ, kiểm tra checksum lần nữa rồi đặt nội dung vào `JENKINS_HOME` cô lập. Phục hồi `secrets/` cùng metadata đã mã hóa từ **cùng** backup generation. Không trộn `master.key` hoặc bất kỳ file trong `secrets/` giữa các controller hay giữa các ngày backup.

</Step>
<Step>

### Khởi động có kiểm soát và đối chiếu môi trường

Khởi động controller cô lập, đọc log để phát hiện lỗi plugin, migration hoặc permission. Xác nhận Jenkins URL, DNS, reverse proxy, webhook endpoint và agent endpoint dùng hostname sandbox; đổi DNS/URL có thể làm link, callback hoặc agent cũ trỏ nhầm. Đối chiếu plugin inventory đã ghi nhận trước backup, nhưng không tự động cài plugin mới chỉ để làm mất cảnh báo.

</Step>
<Step>

### Quyết định chuyển đổi hoặc rollback

Chỉ cân nhắc đưa dữ liệu vào controller thay thế sau khi verification đạt và owner phê duyệt. Migration plugin/core có thể thay đổi dữ liệu hoặc schema; rollback sau migration có thể không an toàn. Giữ controller/bản sao gốc bất biến cho tới khi có bằng chứng chuyển đổi thành công. Không ghi đè controller production bằng một backup chưa được kiểm chứng.

</Step>
</Steps>

<Callout type="warn" title="Không có bảo đảm từ bản sao lỗi">
  Thiếu file khóa, archive hỏng, version/plugin không tương thích hoặc copy khi controller đang ghi đều có thể làm restore thất bại hoặc tạo trạng thái không tin cậy. Escalate thay vì cố chạy job trên controller restore có dấu hiệu bất thường.
</Callout>

## Kiểm chứng phục hồi và restore drill

Một restore drill là phép thử định kỳ rằng người, khóa, công cụ, backup và runbook cùng hoạt động. Lên lịch drill theo RPO/RTO và sau thay đổi lớn như nâng Jenkins, thay storage, đổi artifact backend hoặc xoay quyền truy cập.

Đặt tiêu chí pass/fail trước khi thử:

- controller cô lập start thành công, không có lỗi permission hoặc plugin nghiêm trọng;
- job/folder và một mẫu build record xuất hiện như inventory mong đợi;
- credential metadata có mặt nhưng không xem/in/tiết lộ credential value;
- một Pipeline vô hại chỉ thực hiện `echo` trên agent sandbox chạy thành công;
- checksum, backup ID, thời gian restore thực tế và người xác nhận được ghi vào biên bản;
- kiểm tra DNS/URL, webhook và agent endpoint không chạm production.

Không cần dùng credential thật để chứng minh khả năng restore. Nếu policy cho phép kiểm tra credential, chỉ kiểm tra qua quy trình nội bộ có ủy quyền và không làm lộ giá trị vào console log.

## Lab local sandbox

Lab này minh họa chuỗi backup → restore → verify bằng dữ liệu giả. Nó không dùng Docker volume thật, không cần Jenkins đang chạy và cleanup chỉ xóa thư mục do lab tự tạo dưới `${TMPDIR:-/tmp}`.

<Steps>
<Step>

### Tạo workspace lab và dữ liệu giả

```bash
LAB_ROOT="${TMPDIR:-/tmp}/jenkins-backup-lab-$USER"
mkdir -p "$LAB_ROOT/source/jobs/demo/builds/1" "$LAB_ROOT/source/plugins" "$LAB_ROOT/source/secrets" "$LAB_ROOT/restore"
printf '<project/>\n' > "$LAB_ROOT/source/jobs/demo/config.xml"
printf 'lab build record\n' > "$LAB_ROOT/source/jobs/demo/builds/1/log"
printf 'lab plugin marker\n' > "$LAB_ROOT/source/plugins/example.jpi"
printf 'lab key marker; not a real secret\n' > "$LAB_ROOT/source/secrets/master.key"
printf 'Jenkins-Version: <lab-version>\n' > "$LAB_ROOT/source/backup-manifest.txt"
```

Kết quả mong đợi: `$LAB_ROOT/source` có job, build record, plugin, khóa giả và manifest. File khóa chỉ là text giả, không sao chép từ Jenkins thật.

</Step>
<Step>

### Đóng gói, tạo checksum và kiểm tra archive

```bash
tar --create --file "$LAB_ROOT/jenkins-home-lab.tar" -C "$LAB_ROOT/source" .
sha256sum "$LAB_ROOT/jenkins-home-lab.tar" > "$LAB_ROOT/jenkins-home-lab.tar.sha256"
sha256sum --check "$LAB_ROOT/jenkins-home-lab.tar.sha256"
```

Kết quả mong đợi: lệnh cuối in `...: OK`. Archive lab này không được mã hóa vì chỉ chứa dữ liệu giả; policy production vẫn phải mã hóa trước khi lưu offsite.

</Step>
<Step>

### Restore sang thư mục cô lập và đối chiếu nội dung

```bash
tar --extract --file "$LAB_ROOT/jenkins-home-lab.tar" -C "$LAB_ROOT/restore"
test -f "$LAB_ROOT/restore/jobs/demo/config.xml"
test -f "$LAB_ROOT/restore/secrets/master.key"
printf 'restore verification: PASS\n'
```

Kết quả mong đợi: hai kiểm tra file thành công và dòng `restore verification: PASS`. Đây chỉ là kiểm tra archive/filesystem; nó không thay thế việc khởi động Jenkins cô lập với version và plugin tương thích.

</Step>
<Step>

### Cleanup đúng phạm vi lab

Kiểm tra giá trị biến trước, rồi chỉ xóa thư mục có prefix lab đã tạo ở bước đầu:

```bash
case "$LAB_ROOT" in
  "${TMPDIR:-/tmp}"/jenkins-backup-lab-*) rm -rf -- "$LAB_ROOT" ;;
  *) printf 'Refuse cleanup outside lab: %s\n' "$LAB_ROOT" ;;
esac
```

Kết quả mong đợi: chỉ thư mục lab bị xóa. Lệnh từ chối mọi path không khớp prefix; không thay biến bằng đường dẫn `JENKINS_HOME` hoặc volume thật.

</Step>
</Steps>

<Callout type="idea" title="Tự kiểm tra">
  Hãy thử mô tả backup ID nào đáp ứng RPO, dữ liệu nào không thuộc `JENKINS_HOME`, và ba điều kiện phải pass trước khi cân nhắc chuyển đổi. Nếu không thể trả lời từ manifest và drill record, runbook còn thiếu bằng chứng.
</Callout>

## Khắc phục sự cố

| Triệu chứng | Nguyên nhân thường gặp | Hành động an toàn |
| --- | --- | --- |
| Jenkins không đọc được credential sau restore | thiếu, sai hoặc trộn file trong `secrets/` với metadata khác generation | Stop thử nghiệm, đối chiếu backup ID và khôi phục lại toàn bộ cặp metadata/khóa từ cùng generation; không thay khóa bằng controller khác. |
| Controller không start hoặc plugin lỗi | Jenkins core, Java hoặc plugin không tương thích | Giữ môi trường cô lập, đối chiếu core/plugin inventory và log startup; chọn image/package tương thích thay vì nâng cấp ngẫu nhiên. |
| Job có nhưng artifact không có | artifact nằm ở backend ngoài home hoặc bị retention riêng | Kiểm tra inventory backend và policy backup/retention của artifact store; không kết luận `JENKINS_HOME` backup bao gồm artifact ngoài. |
| Agent/webhook trỏ nhầm | Jenkins URL, DNS, proxy hoặc credential endpoint còn là production | Cô lập mạng, đặt URL/hostname sandbox và tắt trigger trước verification. |
| Checksum không khớp | upload lỗi, archive hỏng hoặc manifest sai | Dừng restore, lấy lại bản sao theo chain of custody và ghi nhận sự cố; không bỏ qua checksum. |

## Checklist vận hành

- [ ] Đã xác định `JENKINS_HOME`, artifact backend, plugin inventory, owner, RPO và RTO.
- [ ] Scope gồm cấu hình, job, build record cần giữ, plugin, credential metadata đã mã hóa và `secrets/` cùng generation.
- [ ] Cache, temp, agent workspace và dữ liệu tái tạo được có policy riêng, không bị sao lưu mù.
- [ ] Điểm backup được tạo sau quiet down + stop hoặc snapshot application-consistent đã kiểm chứng.
- [ ] Archive được mã hóa, giữ offsite, có retention, IAM tối thiểu, checksum và chain of custody.
- [ ] Restore drill diễn ra trên controller cô lập với version, Java, quyền file và plugin inventory tương thích.
- [ ] DNS/URL, webhook, agent và artifact endpoint của sandbox không chạm production.
- [ ] Biên bản drill ghi thời gian thực tế, pass/fail, sai lệch RPO/RTO và hành động khắc phục.

## Tài liệu liên quan

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn lại controller, job, agent và persistent state." />
  <Card title="Yêu cầu hệ thống" href="/docs/getting-started/requirements" description="Đánh giá storage, capacity và network trước khi đặt RPO/RTO." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Hiểu ranh giới bảo mật khi credential được Jenkins quản lý." />
  <Card title="Nâng cấp Jenkins" href="/docs/installation/upgrade" description="Lập kế hoạch version và rollback trước migration." />
</Cards>

## Nguồn chính thức

- [Jenkins: Backing up](https://www.jenkins.io/doc/book/system-administration/backing-up/)
- [Jenkins: Managing Jenkins](https://www.jenkins.io/doc/book/managing/)
- [Jenkins: Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/)
- [Jenkins: Security](https://www.jenkins.io/doc/book/security/)
- [Jenkins: Plugins](https://www.jenkins.io/doc/book/managing/plugins/)
