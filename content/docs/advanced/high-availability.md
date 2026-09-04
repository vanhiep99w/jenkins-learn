---
title: "High availability, failover và disaster recovery"
description: "Thiết kế endpoint có khả năng phục hồi, chuyển đổi controller an toàn và khôi phục thảm họa cho Jenkins mà không dùng active-active."
---

<Callout type="info" title="Phạm vi">
  Jenkins controller mã nguồn mở là một thành phần có trạng thái và chỉ có một writer/instance active cho một `JENKINS_HOME`. Trang này thiết kế khả năng phục hồi cho endpoint và controller, không biến Jenkins thành cụm active-active. Hãy thử mọi runbook trên môi trường cô lập trước khi áp dụng theo quy trình thay đổi của tổ chức.
</Callout>

## Mục lục

- [Ba khái niệm cần tách bạch](#ba-khái-niệm-cần-tách-bạch)
- [Giới hạn controller và rủi ro active-active](#giới-hạn-controller-và-rủi-ro-active-active)
- [Topology tham chiếu](#topology-tham-chiếu)
  - [Endpoint, health check và sticky session](#endpoint-health-check-và-sticky-session)
  - [DNS, Jenkins URL và agent reconnect](#dns-jenkins-url-và-agent-reconnect)
- [Chọn chiến lược phục hồi](#chọn-chiến-lược-phục-hồi)
  - [So sánh cold standby, warm standby và restore mới](#so-sánh-cold-standby-warm-standby-và-restore-mới)
  - [RPO, RTO và dữ liệu cần bảo vệ](#rpo-rto-và-dữ-liệu-cần-bảo-vệ)
  - [Replication storage không thay thế quy trình](#replication-storage-không-thay-thế-quy-trình)
- [Thiết kế an toàn trước failover](#thiết-kế-an-toàn-trước-failover)
  - [Tương thích state, plugin và runtime](#tương-thích-state-plugin-và-runtime)
  - [Fencing và ngăn split-brain](#fencing-và-ngăn-split-brain)
  - [Build đang chạy, queue và tác dụng phụ](#build-đang-chạy-queue-và-tác-dụng-phụ)
- [Runbook failover mẫu](#runbook-failover-mẫu)
  - [Điều kiện vào và vai trò](#điều-kiện-vào-và-vai-trò)
  - [Cô lập primary và xác nhận quyền active](#cô-lập-primary-và-xác-nhận-quyền-active)
  - [Promote, chuyển traffic và xác minh](#promote-chuyển-traffic-và-xác-minh)
  - [Rollback và hậu kiểm](#rollback-và-hậu-kiểm)
- [Lab failover local mô phỏng](#lab-failover-local-mô-phỏng)
  - [Chuẩn bị hai home độc lập](#chuẩn-bị-hai-home-độc-lập)
  - [Mô phỏng lỗi và đổi endpoint](#mô-phỏng-lỗi-và-đổi-endpoint)
  - [Kết quả mong đợi và cleanup](#kết-quả-mong-đợi-và-cleanup)
- [Troubleshooting](#troubleshooting)
- [Checklist vận hành và game day](#checklist-vận-hành-và-game-day)
- [Tài liệu liên quan](#tài-liệu-liên-quan)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)

## Ba khái niệm cần tách bạch

**High availability (HA) endpoint** giảm thời gian người dùng, webhook và agent không gọi được địa chỉ Jenkins. Ví dụ, DNS hoặc load balancer giữ một hostname ổn định và chỉ route tới controller đã được xác nhận là active. HA endpoint không bảo đảm build sẽ tiếp tục chạy qua lúc controller đổi máy.

**Build HA** là khả năng tiếp tục hoặc nhanh chóng khôi phục workload. Jenkins đạt phần này chủ yếu bằng agent tách biệt, Pipeline bền vững, artifact/repository ngoài controller và job có thể chạy lại an toàn. Một controller HTTP còn sống không giúp build nếu agent, SCM, artifact store hoặc executor cần thiết bị lỗi.

**Disaster recovery (DR)** là khôi phục một controller và dữ liệu từ bản sao hoặc bản replicate sau sự cố lớn như mất host, volume, site hay lỗi vận hành. DR chấp nhận một RPO/RTO đã thỏa thuận; nó không đồng nghĩa không gián đoạn.

| Câu hỏi | HA endpoint | Build HA | DR |
| --- | --- | --- | --- |
| Giảm điều gì? | Thời gian endpoint không route được | Tác động lên thực thi build | Mất controller hoặc dữ liệu/site |
| Cơ chế chính | LB/DNS, health check, một active | Agent pool, Pipeline idempotent, backend ngoài | Backup/restore hoặc promote bản sao |
| Không tự bảo đảm | State Jenkins an toàn | Controller có thể active-active | RTO rất thấp hoặc không mất dữ liệu |
| Bằng chứng cần có | Probe qua URL canonical | Build smoke trên agent sandbox | Restore/failover drill đạt mục tiêu |

<Callout type="warn" title="Đừng hứa “không gián đoạn”">
  Khi controller mất kết nối, queue có thể ngừng điều phối và build đang chạy có thể bị `ABORTED`, mất log cuối hoặc cần chạy lại. Ghi nhận điều này trong SLA và runbook thay vì để load balancer che mất sự cố ứng dụng.
</Callout>

## Giới hạn controller và rủi ro active-active

Controller lưu cấu hình, queue, build record, Pipeline state, plugin và credential metadata trong `JENKINS_HOME`. Các file này không là một database phân tán có cơ chế đồng thuận. Vì vậy, mô hình đúng là **single-writer, single-active controller** cho mỗi `JENKINS_HOME`.

Không mount một `JENKINS_HOME` read-write cho hai controller active, kể cả khi storage cho phép `ReadWriteMany`. Hai process có thể đồng thời thay đổi XML, build record, queue hoặc file plugin. Hậu quả gồm corruption âm thầm, lock/file handle không nhất quán, build number trùng, trạng thái Pipeline sai và credential/metadata không còn cùng generation. PVC `ReadWriteOnce` hay filesystem lock có thể ngăn một số tình huống, nhưng không phải fencing đầy đủ cho mọi lỗi mạng hoặc thao tác thủ công.

Tăng số agent tạo thêm năng lực build, không tạo thêm controller writer. Khi cần cô lập blast radius hoặc mở rộng tổ chức, dùng nhiều controller **độc lập** với URL, `JENKINS_HOME`, plugin inventory, backup và lifecycle riêng. Xem [kiến trúc Jenkins](/docs/getting-started/architecture) và [tổng quan agents](/docs/agents/overview) để phân biệt controller với executor.

## Topology tham chiếu

```text
                         hostname canonical: jenkins.example.internal
┌───────────────┐                 │ HTTPS / WSS                 ┌────────────────┐
│ Browser, SCM, │ ────────────────▼───────────────────────────► │ DNS + LB/proxy │
│ inbound agent │    health chỉ route tới active, sticky UI     └───────┬────────┘
└───────────────┘                                                       │
                                      ┌────────────────────────────────┴───────────────┐
                                      │                                                │
                                      ▼                                                ▼
                         ┌─────────────────────────┐                    ┌─────────────────────────┐
                         │ Primary: ACTIVE          │                    │ Standby: FENCED/OFF     │
                         │ 1 controller writer      │                    │ 0 writer                │
                         │ JENKINS_HOME primary     │                    │ home/volume riêng       │
                         └────────────┬────────────┘                    └────────────┬────────────┘
                                      │ snapshot/replication có kiểm soát             │ promote sau fencing
                                      ▼                                                ▼
                         ┌─────────────────────────┐                    ┌─────────────────────────┐
                         │ encrypted backup +       │                    │ controller thay thế      │
                         │ offsite, immutable copy  │                    │ cùng core/plugin policy  │
                         └─────────────────────────┘                    └─────────────────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────────────────────────────────────────┐
                         │ Agent pools, SCM, artifact store, secrets/KMS: dependency   │
                         │ riêng; không suy ra khỏe chỉ từ HTTP controller              │
                         └─────────────────────────────────────────────────────────────┘
```

### Endpoint, health check và sticky session

Load balancer chỉ nên đưa traffic tới **một** controller active. Probe nên đi qua URL canonical và kiểm tra khả năng phục vụ HTTP sau khi Jenkins khởi tạo, chẳng hạn một `GET /login` đã được xác minh ở môi trường của bạn. Probe HTTP xanh không chứng minh queue, agent hay dependency build đang khỏe; thiết kế probe và alert theo [monitoring](/docs/administration/monitoring).

Dùng health check để loại instance chết hoặc chưa ready, không dùng nó để chọn primary khi không có fencing. Nếu primary mất kết nối với LB nhưng còn ghi vào volume, LB chuyển traffic sang standby sẽ tạo split-brain.

Sticky session hữu ích trong thời gian UI bình thường để hạn chế session/cookie bị đổi backend. Nó không thay thế tính đúng đắn khi failover: session đăng nhập hoặc form đang mở có thể hết hạn, và client phải theo redirect/đăng nhập lại. Với một active duy nhất, sticky session không phải điều kiện để bảo vệ state.

### DNS, Jenkins URL và agent reconnect

Dùng một DNS name và **Jenkins URL** canonical, ví dụ `https://jenkins.example.internal/`, không dùng hostname pod, IP primary hay URL tạm của standby. Reverse proxy phải giữ TLS, host và forwarded header nhất quán; xem [reverse proxy và TLS](/docs/installation/reverse-proxy-tls).

Giảm TTL DNS chỉ giúp client tìm endpoint mới sau cache expiry. Nó không dừng primary, không di chuyển queue và không bảo đảm mọi agent hoặc webhook provider bỏ cache cùng lúc. Load balancer thường chuyển nhanh hơn DNS, nhưng vẫn cần DNS để phục hồi khi cả edge/site lỗi.

Agent bị ngắt trong failover cần reconnect tới URL canonical theo launch method của nó. Kiểm tra Remoting/agent log, trust TLS, WebSocket hoặc port inbound sau khi promote. Không kỳ vọng process agent tự nối lại sẽ làm build đang chạy trước đó hợp lệ; xác nhận từng build và workspace theo [tổng quan agents](/docs/agents/overview).

## Chọn chiến lược phục hồi

### So sánh cold standby, warm standby và restore mới

| Mô hình | Trạng thái sẵn sàng | Ưu điểm | Giới hạn và quyết định trước khi dùng |
| --- | --- | --- | --- |
| **Cold standby** | Image, cấu hình hạ tầng và bản backup có sẵn; controller không chạy | Chi phí thấp, không có writer thứ hai | RTO gồm provision, restore, attach storage và startup. Cần đo drill thật. |
| **Warm standby** | Host/cluster và controller tương thích đã chuẩn bị; `JENKINS_HOME` riêng hoặc bản replicate chưa attach read-write | RTO thấp hơn vì bớt provision | Vẫn chỉ promote sau fencing. Đồng bộ dữ liệu có lag, nên phải đo RPO và tránh hai home cùng active. |
| **Restore-to-new-controller** | Tạo controller mới từ backup đã kiểm chứng sau thảm họa | Cô lập tốt, phù hợp corruption hoặc mất site | RTO cao hơn; cần mạng, KMS, plugin/core, ownership và endpoint thay thế. Không ghi đè bản gốc để thử. |

Chọn cold standby khi RTO dài vẫn chấp nhận được. Chọn warm standby khi chi phí hạ tầng đổi lấy RTO thấp hơn. Chọn restore-to-new-controller khi cần một môi trường sạch hoặc không tin storage replicate. Cả ba đều cần backup offsite: replication có thể sao chép cả xóa nhầm, corruption hoặc ransomware.

### RPO, RTO và dữ liệu cần bảo vệ

**RPO (Recovery Point Objective)** là lượng dữ liệu tối đa được phép mất. Ví dụ RPO 15 phút nghĩa là failover có thể mất tối đa 15 phút cấu hình, build record hoặc Pipeline state kể từ điểm nhất quán cuối. **RTO (Recovery Time Objective)** là thời gian tối đa để đưa dịch vụ về mức hoạt động đã định nghĩa, gồm phát hiện, phê duyệt, fencing, restore/promote, DNS/LB, startup và smoke test.

| Thành phần | Câu hỏi RPO/RTO | Biện pháp |
| --- | --- | --- |
| `JENKINS_HOME` | Có chấp nhận mất job config, queue, build record mới không? | Backup application-consistent, snapshot/replication có điểm khôi phục, manifest. |
| `secrets/` và credential metadata | Có cùng generation và quyền giải mã không? | Backup cùng generation, mã hóa, KMS/IAM tách quyền. |
| Plugin/core/Java | Standby có đọc được state đã backup không? | Pin/ghi inventory, kiểm tra trước upgrade và drill. |
| Artifact, SCM, log backend | Dữ liệu này có thật sự nằm trong home không? | Inventory backend và policy riêng. |
| Agent/workspace | Build có tái tạo được sau interruption không? | Pipeline idempotent, source/artifact ngoài agent, cleanup policy. |

Backup file-level chỉ đáng tin khi có điểm nhất quán. Thông thường: quiet down để ngăn build mới, xử lý build đang chạy theo quyết định đã phê duyệt, rồi dừng controller sạch sẽ hoặc tạo snapshot application-consistent. Xem chi tiết [backup và restore](/docs/administration/backup-restore). Mã hóa khi truyền/lưu, giới hạn ai được đọc archive và ai được dùng khóa, bật audit log, kiểm tra checksum và giữ ít nhất một bản ở fault domain khác. Không đưa `secrets/`, archive hay private key vào ticket hoặc repository.

### Replication storage không thay thế quy trình

Storage replication đồng bộ có thể làm RPO thấp nhưng tăng độ trễ và vẫn không thay thế backup bất biến. Replication bất đồng bộ có lag; đo lag, timestamp và điểm khôi phục thay vì tuyên bố RPO bằng tần suất job. Snapshot crash-consistent có thể không phản ánh một tập file Jenkins nhất quán nếu controller đang ghi.

Trước promote, xác nhận bản replica thuộc generation nào, đã replicate hoàn tất chưa và chỉ được attach write cho primary **hoặc** standby. Không dùng cơ chế replicate như giấy phép để chạy hai controller. Mã hóa volume/archive, encryption key và quyền storage phải còn truy cập được ở site DR; kiểm thử điều đó mà không in secret vào log.

## Thiết kế an toàn trước failover

### Tương thích state, plugin và runtime

Ghi inventory cho Jenkins LTS/core, Java, OS/image, plugin và version, cấu hình Configuration as Code nếu dùng, schema/backend artifact, URL, launch method agent và quyền file. Controller standby/restore nên chạy version tương thích với bản state được chọn. Khôi phục rồi nâng cấp là hai thay đổi khác nhau; không gộp chúng khi đang xử lý sự cố.

Plugin hoặc core mới có thể migrate dữ liệu. Sau migration, rollback về version cũ có thể không an toàn. Giữ primary và bản backup gốc bất biến cho đến khi smoke test đạt. Lập kế hoạch version/rollback qua [hướng dẫn upgrade](/docs/installation/upgrade); cách đóng gói controller tham chiếu có tại [Docker](/docs/installation/docker) và [Kubernetes](/docs/installation/kubernetes).

### Fencing và ngăn split-brain

**Split-brain** là tình huống primary cũ và standby mới cùng tin mình được phép active. Đây là lỗi dữ liệu, không chỉ là lỗi route. Trước khi standby ghi dữ liệu hoặc LB gửi traffic sang nó, thực hiện fencing có bằng chứng:

1. Xác nhận sự cố qua monitor, log và người trực; phân biệt process chết với lỗi mạng giữa primary và LB.
2. Chặn primary ở lớp đủ mạnh theo thiết kế: power-off/out-of-band, disable instance, chặn network route, revoke storage attachment hoặc cơ chế fencing của nền tảng. Chỉ disable target trong LB là không đủ.
3. Xác minh primary không còn process Jenkins, không có đường mạng tới storage/edge và không còn quyền write volume. Ghi timestamp, người thực hiện và bằng chứng vào incident record.
4. Chỉ một operator được chỉ định thực hiện promote. Lock/lease của orchestration nếu có là tín hiệu bổ sung; không thay bằng kết luận “pod đã Unready”.
5. Sau promote, đảm bảo storage chỉ attach write cho controller mới, giữ primary fenced cho đến khi hậu kiểm hoàn tất.

<Callout type="error" title="Không promote khi chưa fencing">
  Nếu chưa chứng minh primary cũ không thể ghi `JENKINS_HOME`, dừng runbook và escalate. Một endpoint hoạt động nhưng có hai writer là kết quả nguy hiểm hơn downtime ngắn.
</Callout>

### Build đang chạy, queue và tác dụng phụ

Trong lúc controller down, queue không được điều phối. Build đã được giao cho agent có thể mất liên lạc, kết thúc không được ghi nhận đầy đủ hoặc tiếp tục tạo tác dụng phụ ngoài Jenkins. Sau failover, một Pipeline có thể được đánh dấu gián đoạn và cần chạy lại; đừng tự động coi nó chưa từng chạy.

Lập danh sách build ở trạng thái `RUNNING`, `QUEUED`, `ABORTED` và build có deployment/publish/trigger downstream. Đối chiếu revision, build number, console log, artifact manifest và trạng thái hệ thống đích. RPO có thể làm record mới nhất biến mất, nên một webhook hoặc scheduler có thể tạo build trùng. Pipeline cần idempotency key, lock ở hệ thống đích hoặc bước xác nhận trước tác dụng phụ không đảo ngược. Xem [tổng quan Pipeline](/docs/pipelines/overview) để thiết kế flow có thể quan sát và chạy lại.

## Runbook failover mẫu

Runbook này là khung để điều chỉnh theo storage, LB, IAM và change policy của tổ chức. Không chạy trực tiếp trên production chỉ vì câu lệnh/điều kiện có trong tài liệu.

### Điều kiện vào và vai trò

Kích hoạt khi alert và triage xác nhận controller không thể phục vụ trong ngưỡng RTO, hoặc site/storage primary mất theo incident commander. Dừng nếu còn nghi ngờ primary vẫn ghi dữ liệu.

| Vai trò | Trách nhiệm |
| --- | --- |
| Incident commander | Quyết định activate/rollback, mốc thời gian và thông báo. |
| Jenkins operator | Quiet down nếu còn truy cập được, lập inventory build/queue và smoke test. |
| Platform/storage operator | Fencing, promote/restore storage, bằng chứng quyền write duy nhất. |
| Network operator | Chuyển LB/DNS sau fencing, xác minh TLS và URL canonical. |
| Application owner | Xác nhận build có tác dụng phụ, quyết định chạy lại/đối soát. |

### Cô lập primary và xác nhận quyền active

1. Mở incident record: thời điểm phát hiện, alert, RPO/RTO target, primary/standby ID và người chịu trách nhiệm.
2. Nếu UI còn truy cập, bật quiet down và ghi queue/build đang chạy. Không đợi vô hạn nếu primary đã không ổn định; quyết định xử lý build theo incident commander.
3. Thực hiện fencing primary theo cơ chế đã kiểm thử. Không chỉ scale/stop ở một lớp nếu VM/process còn có thể dùng storage qua đường khác.
4. Xác minh bằng ít nhất hai nguồn độc lập: trạng thái compute/power, đường mạng, storage attachment/write permission và log/monitor không còn heartbeat primary.
5. Chọn backup generation hoặc replica timestamp đáp ứng RPO. Xác minh checksum/replication health, encryption key access và plugin/core inventory trước restore hoặc attach.

### Promote, chuyển traffic và xác minh

1. Promote hoặc restore vào **một** home/volume của standby. Xác minh ownership, dung lượng, encryption/KMS và chỉ standby có write access.
2. Start controller với Jenkins core, Java và plugin inventory tương thích. Theo dõi startup log; xem [logs và diagnostics](/docs/administration/logs) để thu thập bằng chứng không làm lộ secret.
3. Trước khi route công khai, kiểm tra URL canonical, reverse proxy TLS, authentication và endpoint health từ network được phép. Không public upstream controller để vượt qua proxy.
4. Đổi LB target hoặc DNS sau khi controller ready. Giữ hostname/Jenkins URL cũ để webhook, bookmark và agent reconnect không phải biết primary mới.
5. Chạy smoke test không phá hủy: đăng nhập bằng tài khoản test, đọc một job/folder, xác nhận credential metadata **không in giá trị**, chạy Pipeline sandbox chỉ `echo` trên agent sandbox và kiểm tra upload artifact giả nếu có.
6. Đối chiếu queue/build đã ghi trước sự cố với trạng thái sau promote. Đánh dấu build cần chạy lại hoặc kiểm tra tác dụng phụ; không bấm retry hàng loạt.
7. Theo dõi error rate, queue age, agent reconnect, disk/heap, webhook và alert trong cửa sổ ổn định. Ghi thời gian thực tế từng mốc để so với RTO.

### Rollback và hậu kiểm

Rollback traffic chỉ khi controller mới không phục vụ được và primary vẫn **fenced**. Không rollback bằng cách bật lại primary trên home cũ sau khi standby đã ghi state; cần quyết định dữ liệu authoritative, tạo backup/snapshot của trạng thái hiện tại nếu policy cho phép, rồi thực hiện restore có kiểm soát. Nếu có dấu hiệu corruption hoặc hai writer từng active, dừng mọi promote tiếp theo và gọi owner storage/Jenkins.

Sau sự cố, đối soát webhook, build số, deployment, artifact và thay đổi cấu hình trong khoảng RPO. Cập nhật runbook bằng lỗi phát hiện, thời gian fencing, failover, agent reconnect và quyết định duplicate build. Làm sạch/khôi phục primary chỉ khi đã tách storage và có kế hoạch re-seed; không attach lại volume cũ read-write để “so sánh nhanh”.

## Lab failover local mô phỏng

Lab này chỉ mô phỏng endpoint chuyển từ primary sang standby bằng hai HTTP server Python và hai thư mục trạng thái **riêng** dưới thư mục tạm. Nó không cài Jenkins, không dùng Docker/Kubernetes, không mount volume dùng chung và không mô phỏng chính xác storage fencing. Không chạy nó trên host production hay thay giá trị `LAB_ROOT` bằng `JENKINS_HOME`.

### Chuẩn bị hai home độc lập

```bash
LAB_ROOT="${TMPDIR:-/tmp}/jenkins-ha-lab-$USER"
PRIMARY_PORT=18080
STANDBY_PORT=18081
mkdir -p "$LAB_ROOT/primary/home" "$LAB_ROOT/standby/home"
printf 'primary active; simulated Jenkins state\n' > "$LAB_ROOT/primary/home/state.txt"
printf 'primary health: OK\n' > "$LAB_ROOT/primary/healthz"
printf 'standby health: OK\n' > "$LAB_ROOT/standby/healthz"

# Sao chép một điểm state giả; hai server không bao giờ dùng chung thư mục home.
cp -a "$LAB_ROOT/primary/home/." "$LAB_ROOT/standby/home/"
printf 'http://127.0.0.1:%s\n' "$PRIMARY_PORT" > "$LAB_ROOT/current-endpoint"
python3 -m http.server "$PRIMARY_PORT" --directory "$LAB_ROOT/primary" \
  > "$LAB_ROOT/primary-server.log" 2>&1 &
PRIMARY_PID=$!
sleep 1
curl --fail --silent "$(cat "$LAB_ROOT/current-endpoint")/healthz"
```

Kết quả mong đợi: `primary health: OK`. `$LAB_ROOT/primary/home` và `$LAB_ROOT/standby/home` là hai path khác nhau; lệnh `cp` chỉ tạo dữ liệu giả ban đầu, không replication live.

### Mô phỏng lỗi và đổi endpoint

```bash
# Mô phỏng primary bị fenced trong lab: dừng đúng process Python vừa tạo.
kill "$PRIMARY_PID"
wait "$PRIMARY_PID" 2>/dev/null || true

# Chỉ sau khi primary dừng mới khởi động standby và đổi pointer endpoint giả.
python3 -m http.server "$STANDBY_PORT" --directory "$LAB_ROOT/standby" \
  > "$LAB_ROOT/standby-server.log" 2>&1 &
STANDBY_PID=$!
printf 'http://127.0.0.1:%s\n' "$STANDBY_PORT" > "$LAB_ROOT/current-endpoint"
sleep 1
curl --fail --silent "$(cat "$LAB_ROOT/current-endpoint")/healthz"
test -f "$LAB_ROOT/standby/home/state.txt"
printf 'simulated failover: PASS\n'
```

Kết quả mong đợi: `standby health: OK` và `simulated failover: PASS`. Pointer file chỉ minh họa mục tiêu của LB/DNS; nó không là load balancer hay cơ chế fencing production.

### Kết quả mong đợi và cleanup

Dừng server standby, rồi chỉ xóa thư mục mà lab vừa tạo. Guard từ chối mọi path khác prefix lab.

```bash
kill "${STANDBY_PID:-}" 2>/dev/null || true
wait "${STANDBY_PID:-}" 2>/dev/null || true
case "$LAB_ROOT" in
  "${TMPDIR:-/tmp}"/jenkins-ha-lab-*) rm -rf -- "$LAB_ROOT" ;;
  *) printf 'Refuse cleanup outside lab: %s\n' "$LAB_ROOT" ;;
esac
```

Kết quả mong đợi: thư mục tạm của lab biến mất; không có Jenkins controller, volume, namespace hay dữ liệu thật nào bị thay đổi. Để diễn tập production, dùng game day được phê duyệt với environment cô lập/không critical và runbook riêng, không tái sử dụng lab này.

## Troubleshooting

| Dấu hiệu | Nguyên nhân thường gặp | Hành động an toàn |
| --- | --- | --- |
| LB route tới standby nhưng primary vẫn phản hồi | Health check chỉ nhìn network/HTTP, chưa fencing | Rút traffic khỏi standby nếu cần, fence primary ở compute/network/storage và chỉ promote lại khi có bằng chứng một writer. |
| Controller mới không start hoặc plugin lỗi | Core, Java, plugin hoặc ownership không tương thích | Giữ cô lập, đọc startup log, đối chiếu inventory/backup generation; không tự nâng plugin để che lỗi. |
| Credential không đọc được | `secrets/` và metadata bị thiếu hoặc khác generation | Stop thử nghiệm, restore lại cặp dữ liệu/khóa cùng generation; không lấy khóa từ controller khác. |
| Agent không reconnect | DNS/TLS/Jenkins URL/transport khác, timeout proxy | Kiểm tra canonical URL, certificate chain, launch method, log agent và proxy; không mở port ngẫu nhiên. |
| Queue dài sau failover | Agent chưa online, label/executor thiếu hoặc build bị giữ | Kiểm tra lý do queue, pool agent và build interruption trước khi restart controller. |
| Build/deployment xuất hiện hai lần | RPO làm mất record hoặc retry không idempotent | Đối soát revision, artifact và hệ thống đích; dừng retry tự động, dùng idempotency/lock và owner xác nhận. |
| Restore đạt HTTP nhưng webhook lỗi | DNS, Jenkins URL hoặc TLS proxy chưa nhất quán | Test callback đại diện qua hostname canonical; giữ upstream private và sửa URL/header tại edge. |
| RPO thực tế lớn hơn policy | Replication lag, backup chưa nhất quán hoặc backup job lỗi | Đo timestamp/lag, kiểm tra manifest/checksum và tăng tần suất hay đổi chiến lược sau review. |

## Checklist vận hành và game day

- [ ] Mỗi controller có đúng một `JENKINS_HOME` writer/active; không có shared active-active volume.
- [ ] DNS, Jenkins URL, certificate, reverse proxy và webhook dùng một hostname canonical.
- [ ] Health check xác minh đúng readiness qua edge; alert phân biệt endpoint, controller, queue, agent và dependency build.
- [ ] LB chỉ route một active; sticky session được hiểu là tiện ích UI, không phải data safety.
- [ ] RPO/RTO được owner phê duyệt, có timestamp backup/replica, checksum và evidence drill thực tế.
- [ ] Backup nhất quán gồm state, plugin inventory, credential metadata và `secrets/` cùng generation; archive/keys được mã hóa và kiểm soát truy cập.
- [ ] Replication, volume attachment và KMS/IAM đã được thử ở site/region DR; có backup immutable/offsite độc lập.
- [ ] Runbook có bước fencing, quyền promote duy nhất, quyết định data authoritative, verification và rollback không tạo writer thứ hai.
- [ ] Danh sách build/queue trước failover và quy trình phát hiện duplicate/tác dụng phụ được chuẩn bị.
- [ ] Game day định kỳ diễn tập phát hiện → fencing → promote/restore → DNS/LB → agent reconnect → smoke test → hậu kiểm, với môi trường và phê duyệt an toàn.
- [ ] Biên bản game day ghi RTO thực tế, điểm RPO, build gián đoạn, lỗi plugin/state, sai lệch runbook và owner xử lý.

<Callout type="idea" title="Tiêu chí game day đạt">
  Một game day không chỉ là endpoint trả `200`. Bài diễn tập đạt khi đội chứng minh được một writer, dữ liệu được chọn đáp ứng RPO, URL/agent hoạt động, build sandbox an toàn chạy được và biết rõ build nào cần đối soát hoặc chạy lại.
</Callout>

## Tài liệu liên quan

<Cards>
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu controller, queue, executor và state trung tâm." />
  <Card title="Docker" href="/docs/installation/docker" description="Vận hành controller persistent trên Docker." />
  <Card title="Kubernetes" href="/docs/installation/kubernetes" description="Triển khai một controller stateful trên Kubernetes." />
  <Card title="Reverse proxy và TLS" href="/docs/installation/reverse-proxy-tls" description="Giữ URL canonical và kết nối agent qua edge." />
  <Card title="Nâng cấp Jenkins" href="/docs/installation/upgrade" description="Kiểm soát tương thích core, Java và plugin." />
  <Card title="Backup và restore" href="/docs/administration/backup-restore" description="Tạo bản sao nhất quán và restore cô lập." />
  <Card title="Monitoring" href="/docs/administration/monitoring" description="Thiết kế probe, metric và alert có hành động." />
  <Card title="Logs và diagnostics" href="/docs/administration/logs" description="Thu thập bằng chứng controller và agent an toàn." />
  <Card title="Tổng quan agents" href="/docs/agents/overview" description="Xử lý reconnect, capacity và trust boundary của agent." />
  <Card title="Tổng quan Pipeline" href="/docs/pipelines/overview" description="Thiết kế Pipeline có thể quan sát và chạy lại." />
</Cards>

## Nguồn Jenkins chính thức

- [Jenkins: Scaling](https://www.jenkins.io/doc/book/scaling/) — giới hạn controller và cách mở rộng bằng controller/agent độc lập.
- [Jenkins: Backing up](https://www.jenkins.io/doc/book/system-administration/backing-up/) — phạm vi dữ liệu Jenkins và nguyên tắc backup.
- [Jenkins: Managing Jenkins](https://www.jenkins.io/doc/book/managing/) — vận hành controller và dữ liệu bền vững.
- [Jenkins: Using Jenkins agents](https://www.jenkins.io/doc/book/using/using-agents/) — kết nối và vận hành agent.
- [Jenkins: Reverse proxy configuration](https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/) — URL, proxy và kiểm tra cấu hình edge.
- [Jenkins: Installing Jenkins with Docker](https://www.jenkins.io/doc/book/installing/docker/) — controller container và persistent data.
- [Jenkins: Installing Jenkins with Kubernetes](https://www.jenkins.io/doc/book/installing/kubernetes/) — triển khai Jenkins trên Kubernetes.
