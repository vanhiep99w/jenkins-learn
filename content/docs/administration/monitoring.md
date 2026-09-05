---
title: "Monitoring & Metrics"
description: "Thiết kế health checks, Prometheus metrics, dashboard và alert có thể hành động cho Jenkins controller và agent."
---

Monitoring tốt trả lời hai câu hỏi khác nhau: Jenkins còn **phục vụ** được không, và hệ thống còn **đủ năng lực** để build bắt đầu cũng như hoàn tất đúng kỳ vọng không. Trang này biến hai câu hỏi đó thành health check, metrics, dashboard và alert có runbook.

<Callout type="info" title="Phạm vi và giả định">
  Ví dụ dùng Jenkins LTS trong mạng nội bộ, Prometheus Metrics Plugin có ID `prometheus` và Prometheus Server đã được phép kết nối đến controller. Tên metric, labels và quyền endpoint phải được xác nhận lại trên `/prometheus/` của chính phiên bản plugin đang cài trước khi dùng query hoặc alert ở production.
</Callout>

## Mục lục

- [Mô hình giám sát](#mô-hình-giám-sát)
  - [Liveness readiness availability và capacity](#liveness-readiness-availability-và-capacity)
  - [Luồng dữ liệu giám sát](#luồng-dữ-liệu-giám-sát)
- [Health checks HTTP an toàn](#health-checks-http-an-toàn)
  - [Chọn tín hiệu đúng mục đích](#chọn-tín-hiệu-đúng-mục-đích)
  - [Endpoint authentication và CSRF](#endpoint-authentication-và-csrf)
  - [Tài nguyên và build health](#tài-nguyên-và-build-health)
- [Prometheus metrics](#prometheus-metrics)
  - [Plugin endpoint và phiên bản](#plugin-endpoint-và-phiên-bản)
  - [Scrape qua TLS và tài khoản tối thiểu](#scrape-qua-tls-và-tài-khoản-tối-thiểu)
  - [Labels và cardinality](#labels-và-cardinality)
  - [Queries khởi điểm](#queries-khởi-điểm)
- [Dashboard và SLI SLO](#dashboard-và-sli-slo)
- [Alerting có thể hành động](#alerting-có-thể-hành-động)
  - [Rule mẫu](#rule-mẫu)
  - [Giảm alert storm](#giảm-alert-storm)
- [Lab local với mock metrics](#lab-local-với-mock-metrics)
  - [Chuẩn bị dữ liệu mẫu](#chuẩn-bị-dữ-liệu-mẫu)
  - [Kiểm tra và đọc kết quả](#kiểm-tra-và-đọc-kết-quả)
- [Troubleshooting](#troubleshooting)
- [Checklist trước khi publish](#checklist-trước-khi-publish)
- [Nguồn chính thức](#nguồn-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mô hình giám sát

**Controller** nhận HTTP request, giữ cấu hình, queue và trạng thái build. **Agent** mới là nơi chạy phần lớn workload. Do đó một probe HTTP xanh chỉ là tín hiệu controller còn phản hồi; nó không chứng minh agent, executor, disk, SCM hay Pipeline đang khỏe. Khái niệm controller, queue và executor được giải thích nền tảng trong [Kiến trúc Jenkins](/docs/getting-started/architecture).

### Liveness readiness availability và capacity

| Tín hiệu | Câu hỏi trả lời | Ví dụ Jenkins | Không chứng minh điều gì |
| --- | --- | --- | --- |
| **Liveness** | Tiến trình có còn sống để platform nên giữ/khởi động lại? | JVM còn phục vụ một HTTP GET cơ bản. | Jenkins đã khởi tạo xong, agent dùng được hoặc queue thông. |
| **Readiness** | Instance có nên nhận traffic ngay lúc này? | Controller khởi tạo xong, không ở trạng thái maintenance và endpoint được kiểm tra phản hồi. | Có đủ executor cho workload sắp đến. |
| **Availability** | Người dùng hay integration có hoàn tất thao tác quan trọng trong cửa sổ đo không? | UI/API phản hồi qua TLS, webhook được nhận, một smoke check đọc được trạng thái. | Build sẽ chạy nhanh; availability không phải capacity. |
| **Capacity** | Hệ thống còn headroom để nhận và chạy build không? | Queue age, executor bận/rảnh theo pool label, CPU, heap, disk và I/O. | Controller chết hay HTTP không route được. |

Đừng dùng liveness để autoscale hoặc kết luận capacity. Ví dụ `/login` trả `200` trong khi tất cả agent `linux && docker` offline; controller sống nhưng hotfix vẫn chờ vô hạn. Ngược lại, queue có thể dài chủ đích trong maintenance hoặc vì giới hạn concurrency, không làm liveness thất bại.

### Luồng dữ liệu giám sát

```mermaid
flowchart LR
  U[Người dùng hoặc webhook] --> J[Jenkins controller]
  J --> Q[Build queue]
  Q --> A[Agent và executor]
  A --> B[Pipeline build test]
  J --> M[/prometheus/ nội bộ]
  M --> P[Prometheus scrape qua TLS]
  P --> D[Dashboard và SLO]
  P --> R[Alert rules]
  R --> AM[Alertmanager dedupe route]
  AM --> O[On-call và runbook]
```

Luồng trên tách telemetry ra khỏi luồng build. Prometheus phải là client được cấp quyền tối thiểu trên network nội bộ; không publish endpoint metrics qua Internet chỉ để dashboard có dữ liệu.

## Health checks HTTP an toàn

### Chọn tín hiệu đúng mục đích

Dùng một probe GET nông cho **liveness**, ví dụ URL UI chuẩn như `https://jenkins.example.internal/login`, sau khi đã xác nhận mã phản hồi thực tế qua reverse proxy của tổ chức. Image Docker chính thức thường dùng `/login` cho healthcheck; đó là kiểm tra HTTP, không phải API contract đầy đủ. Khi chạy Kubernetes, dùng path, `initialDelaySeconds`, timeout và failure threshold phù hợp với thời gian khởi động thực của controller, thay vì copy ngưỡng từ một cluster khác.

**Readiness** nên kết hợp ít nhất các điều kiện có chủ đích: controller đã xong startup, route TLS/reverse proxy hoạt động và không có maintenance/quiet-down ngoài kế hoạch. Với Jenkins vanilla, không giả định có một endpoint native duy nhất chứng minh mọi plugin và agent đã sẵn sàng. Một smoke check chỉ đọc trạng thái hoặc một build sandbox đã được phê duyệt có thể là tín hiệu availability sâu hơn, nhưng không nên chạy nó mỗi vài giây như liveness probe.

<Callout type="warn" title="Không restart vì queue dài">
  Queue dài, executor đầy, agent offline, heap cao hoặc disk thấp là sự cố capacity/dependency cần điều tra. Restart controller theo liveness khi JVM vẫn phản hồi có thể làm mất thêm thời gian điều phối và tạo build gián đoạn; nó không tạo executor hoặc disk.
</Callout>

### Endpoint authentication và CSRF

Jenkins thường bảo vệ UI, API và metrics bằng authentication/authorization. Probe và scraper chỉ cần **đọc** endpoint, dùng một service account riêng và quyền tối thiểu. Giới hạn ingress sao cho chỉ load balancer, kubelet hoặc Prometheus đã biết mới chạm được controller; áp dụng TLS đến điểm phù hợp với mô hình proxy của tổ chức.

CSRF protection (Jenkins crumb) bảo vệ request thay đổi trạng thái như `POST`. Một `GET` health/metrics không nên tắt CSRF, thêm crumb exemption hoặc mở anonymous access để "cho chạy probe". Nếu script vận hành thực sự phải gọi API ghi, lấy crumb theo tài liệu Jenkins, dùng token của service account và giới hạn quyền; không tái dùng cơ chế đó cho health check.

```bash
# Chỉ chạy từ máy quản trị hoặc network monitoring được cho phép.
# Không ghi token vào shell history, source repository hay output CI.
export JENKINS_URL='https://jenkins.example.internal'
export JENKINS_SCRAPER_USER='prometheus-scraper'
export JENKINS_SCRAPER_TOKEN='<read-from-secret-manager>'

curl --fail --silent --show-error \
  --user "${JENKINS_SCRAPER_USER}:${JENKINS_SCRAPER_TOKEN}" \
  "${JENKINS_URL}/prometheus/" \
  | head -n 20
```

Lệnh trên là kiểm tra có xác thực với giá trị minh họa, không phải cách lưu secret. Trong production, để Prometheus đọc `password_file` nằm trên filesystem được bảo vệ hoặc cơ chế secret của platform; không đặt token thẳng trong YAML, label hoặc annotation.

### Tài nguyên và build health

Theo dõi controller và agent tách riêng. Trên controller, theo dõi JVM/heap (used, max, GC pause), CPU, process restart/uptime, filesystem chứa `JENKINS_HOME`, free bytes/inodes, latency HTTP và lỗi reverse proxy. Heap tăng liên tục sau full GC, disk/inode gần đầy hoặc pause GC dài đều có thể làm UI và scheduler chậm trước khi tiến trình chết.

Trên agent, theo dõi trạng thái online/offline, offline cause, executor defined/online/busy/idle, CPU/RAM, disk/inodes của workspace và cache, I/O wait, network và provisioning/quota của agent động. Phân tách theo pool label: executor rảnh ở `windows` không giải quyết job đòi `linux && docker`. Xem cách diễn giải labels và executors tại [Labels & Executors](/docs/agents/labels-executors).

**Build health** là outcome theo job/Pipeline: queue wait, runtime, tỷ lệ `FAILURE`/`UNSTABLE`/`ABORTED`, test failure, stage chậm, build bị kẹt và artifact/storage lỗi. Nó là tín hiệu chất lượng dịch vụ CI, khác với "JVM còn chạy". Baseline hữu ích là so sánh p50/p95 với chính workload cùng branch/pool trong một cửa sổ thời gian, không trộn nightly nặng với hotfix.

## Prometheus metrics

### Plugin endpoint và phiên bản

[Prometheus Metrics Plugin](https://plugins.jenkins.io/prometheus/) (`prometheus`) xuất metrics của plugin và của [Metrics Plugin](https://plugins.jenkins.io/metrics/) ở endpoint mặc định `/prometheus/`. Endpoint cấu hình khác được phép, nhưng scraper phải dùng đúng path và **dấu `/` cuối**; thiếu slash có thể nhận `302`, một số scraper không theo redirect như mong đợi.

| Giả định cần xác minh | Cách xác minh trước rollout |
| --- | --- |
| Jenkins core | Dùng Jenkins LTS được tổ chức hỗ trợ; đọc **Manage Jenkins → About Jenkins**. |
| Plugin | Cài đúng plugin ID `prometheus`, đọc version và yêu cầu Jenkins core trong **Manage Jenkins → Plugins** hoặc trang plugin chính thức. Không suy đoán version từ dashboard cũ. |
| Namespace và endpoint | Đọc cấu hình plugin và vài dòng đầu `/prometheus/`. Ví dụ bên dưới giả sử namespace được đặt là `ci`, vì vậy metric có tiền tố `ci_jenkins_`. |
| Collector tùy chọn | Disk usage, node status, test result và per-build metrics có thể bị tắt hoặc phụ thuộc plugin khác. Xác nhận metric có mặt trước khi import dashboard. |

Các metrics plugin-specific thường có `ci_jenkins_up`, `ci_jenkins_executors_queue_length`, `ci_jenkins_executors_busy`, `ci_jenkins_nodes_online` và build counters. Collector per-build thêm label số build cho mọi run giữ lại; đây là nguồn cardinality và chi phí scrape/storage đáng kể. Chỉ bật nó khi có use case và giới hạn tuổi hoặc số build mỗi job.

### Scrape qua TLS và tài khoản tối thiểu

Bật authentication cho Prometheus endpoint nếu mô hình quyền của bạn yêu cầu. Plugin có tùy chọn này và dùng quyền `Metrics/View`; cấp quyền đó cho service account scrape, không cấp `Overall/Administer`. Kiểm tra quyền thực tế của plugin/version đang dùng bằng account test trước khi áp dụng vào Prometheus.

Ví dụ sau chỉ là cấu hình tham khảo. Tên DNS, CA, server name và file token đều là giá trị minh họa; file token phải được mount read-only với quyền đọc chỉ cho tiến trình Prometheus. `static_configs` chỉ chứa địa chỉ private hay service DNS nội bộ, không dùng IP public.

```yaml
scrape_configs:
  - job_name: jenkins-controller
    scheme: https
    metrics_path: /prometheus/
    scrape_interval: 30s
    scrape_timeout: 10s
    basic_auth:
      username: prometheus-scraper
      password_file: /etc/prometheus/secrets/jenkins-scraper-token
    tls_config:
      ca_file: /etc/prometheus/ca/internal-ca.pem
      server_name: jenkins.example.internal
    static_configs:
      - targets:
          - jenkins.example.internal:443
        labels:
          environment: staging
          service: jenkins-controller
```

Ngoài TLS, giới hạn network theo allowlist/security group/NetworkPolicy từ Prometheus đến controller và theo ingress từ proxy đến endpoint. Đừng dùng `insecure_skip_verify: true` để "sửa" lỗi chứng chỉ; sửa CA, SAN hoặc `server_name`. Không expose `/prometheus/`, API token, basic-auth header hoặc file secret ra Internet, dashboard public, repository hay console log.

### Labels và cardinality

Label làm một metric có ngữ cảnh, nhưng mỗi tổ hợp label là một time series. Giữ labels ổn định, ít giá trị và có ích cho câu hỏi vận hành: `environment`, `controller`, `pool` hoặc `job` đã được chuẩn hóa. Đặt external labels ở Prometheus khi chúng là thuộc tính scrape; không sao chép cùng giá trị vào mọi collector nếu không cần.

Tránh labels có giá trị gần như vô hạn hoặc chứa dữ liệu nhạy cảm: build number, commit SHA, branch/PR name không giới hạn, timestamp, workspace path, URL đầy query string, parameter đầu vào, username, email, token hoặc secret. Plugin cảnh báo rõ rằng thêm build parameters và per-build metrics có thể tạo cardinality cao. Nếu cần truy vết một build, dùng URL build/log có kiểm soát quyền thay vì biến từng run thành series lâu dài.

| Nên giữ | Tránh giữ | Lý do |
| --- | --- | --- |
| `environment=staging`, `controller=ci-a` | `build_number=184392` | Giá trị đầu ổn định; build number tăng không ngừng. |
| `pool=linux-docker` | `git_sha=...`, `pull_request=...` | Pool phục vụ capacity; revision dành cho log/tracing. |
| Job đã chuẩn hóa và có retention | `parameter_*`, workspace path, username | Dễ làm nổ series và có thể lộ dữ liệu. |

### Queries khởi điểm

Các query dưới đây giả sử namespace `ci`; thay toàn bộ tiền tố sau khi xem output thật. Nếu metric có labels khác dự kiến, sửa aggregation theo label đang tồn tại thay vì thêm label bịa ra.

```text
# Controller báo chưa sẵn sàng nhận request theo collector của plugin.
ci_jenkins_up == 0

# Số item đã có thể chạy nhưng đang đợi executor trống.
sum(ci_jenkins_executors_queue_length)

# Tỷ lệ executor bận: dùng cùng scope controller/pool khi labels có mặt.
sum(ci_jenkins_executors_busy)
  / clamp_min(sum(ci_jenkins_executors_online), 1)

# Tốc độ build failure trong 15 phút; phân nhóm job chỉ khi label job ổn định.
sum by (job) (increase(ci_jenkins_builds_failed_build_count[15m]))

# Job có kết quả last build không thành công theo boolean của plugin.
max by (job) (ci_jenkins_builds_last_build_result == 0)
```

JVM, GC và process metric do Metrics Plugin xuất ra có thể đổi tên theo plugin/version. Khám phá bằng cách tìm `jvm`, `heap`, `gc`, `process` trong endpoint hoặc metric browser trước; dashboard phải tham chiếu tên đã scrape được, không sao chép một tên từ hệ khác.

## Dashboard và SLI SLO

Thiết kế dashboard theo người đang điều tra, không chỉ theo danh sách metric. Mỗi panel cần khoảng thời gian, scope controller/pool và liên kết đến runbook hoặc Jenkins UI liên quan.

| Góc nhìn | Panel nên có | SLI gợi ý | Ví dụ SLO, cần hiệu chỉnh theo dịch vụ |
| --- | --- | --- | --- |
| Controller | `up`, uptime/restart, HTTP errors/latency ở proxy, JVM heap/GC, `JENKINS_HOME` free bytes và inodes | Tỷ lệ probe/controller API thành công | 99.9% availability theo tháng cho controller production. |
| Queue | Queue length, queue age p50/p95, executor busy/online theo pool và reason chờ | Tỷ lệ build ưu tiên bắt đầu trước ngưỡng | 95% hotfix bắt đầu dưới 5 phút trong 28 ngày. |
| Agent | Nodes online/offline cause, executor saturation, CPU/RAM/disk/I/O, provisioning latency/quota | Tỷ lệ pool có agent online và headroom | 99% khoảng 5 phút có ít nhất một agent online cho pool critical. |
| Pipeline | Build success/failure/aborted, runtime p50/p95, stage duration, test outcome | Tỷ lệ build hợp lệ hoàn tất trong mục tiêu | 90% build `main` hoàn tất dưới 20 phút; loại trừ maintenance đã định nghĩa. |
| Storage | Controller home, workspace/cache, artifact store capacity/latency/error | Tỷ lệ thời gian storage còn ngưỡng an toàn | Không vượt 80% dung lượng vận hành trong peak, với cảnh báo sớm trước ngưỡng cứng. |

SLI là phép đo, SLO là mục tiêu được đồng thuận; cả hai cần phạm vi và cửa sổ rõ ràng. "Queue dưới 5 phút" chỉ có ý nghĩa khi nói rõ pool nào, build nào và có loại trừ maintenance đã thông báo hay không. Dashboard nên cho drill-down từ panel queue sang Build Queue, Nodes và log; phần log/diagnostic được xử lý riêng tại tài liệu quản trị khi trang đó hoàn thiện.

## Alerting có thể hành động

Alert tốt có **owner**, tác động, ngưỡng, duration, severity và runbook. Cảnh báo availability khi người dùng bị ảnh hưởng; cảnh báo capacity khi có nguy cơ vi phạm SLO; dùng ticket hoặc dashboard cho tín hiệu cần theo dõi nhưng chưa cần đánh thức on-call.

### Rule mẫu

File bên dưới không áp dụng rule thật. `controller`, namespace và runbook URL đều là giá trị minh họa; kiểm tra tên metric và scope labels trên Prometheus trước khi nạp vào bất kỳ Alertmanager nào.

```yaml
groups:
  - name: jenkins-baseline-example
    rules:
      - alert: JenkinsControllerUnavailable
        expr: ci_jenkins_up == 0
        for: 5m
        labels:
          severity: critical
          service: jenkins-controller
        annotations:
          summary: "Jenkins controller {{ $labels.instance }} không sẵn sàng"
          runbook_url: "https://runbooks.example.internal/jenkins/controller-unavailable"

      - alert: JenkinsExecutorQueueSustained
        expr: sum(ci_jenkins_executors_queue_length) > 5
        for: 15m
        labels:
          severity: warning
          service: jenkins-controller
        annotations:
          summary: "Queue Jenkins duy trì trên 5 item trong 15 phút"
          runbook_url: "https://runbooks.example.internal/jenkins/queue-capacity"

      - alert: JenkinsNoAgentsOnline
        expr: sum(ci_jenkins_nodes_online) < 1
        for: 10m
        labels:
          severity: critical
          service: jenkins-controller
        annotations:
          summary: "Không còn Jenkins agent online"
          runbook_url: "https://runbooks.example.internal/jenkins/agents-offline"
```

Ngưỡng `> 5`, `5m`, `15m` và `10m` là điểm bắt đầu, không phải chuẩn chung. Chọn chúng từ baseline và SLO: một queue nightly dài 15 phút có thể bình thường, nhưng hotfix queue 5 phút có thể là critical. Với disk, alert warning trước khi hết headroom và critical trước ngưỡng có thể làm controller/agent không ghi được dữ liệu; dựa trên tốc độ đầy disk thay vì chỉ một phần trăm tĩnh nếu có dữ liệu.

Mỗi runbook nên bắt đầu bằng: xác nhận alert còn firing, xem dashboard đúng controller/pool, đọc Build Queue và offline cause, kiểm tra thay đổi gần đây, rồi mới chọn hành động khôi phục. Runbook phải nêu điều không được làm, ví dụ không restart controller để chữa thiếu executor và không mở anonymous metrics để chữa scrape `401`.

### Giảm alert storm

- Route Alertmanager theo `service`, `environment`, `controller` và `severity`; group các alert cùng nguyên nhân để một controller down không gửi hàng trăm alert job/agent phụ.
- Dùng inhibition: khi `JenkinsControllerUnavailable` critical firing, ức chế alert queue/agent phụ thuộc cùng controller. Không ức chế alert disk hoặc security độc lập chỉ vì controller có vấn đề.
- Thêm `for` để loại spike scrape ngắn, `repeat_interval` hợp lý và maintenance silence có thời hạn, lý do và owner. Không xóa rule để dập noise.
- Alert trên triệu chứng có tác động (queue age/SLO, toàn bộ pool offline, disk nguy hiểm), không alert từng job failure mặc định. Job quan trọng có thể có rule riêng và owner rõ ràng.
- Dedupe dựa trên labels ổn định. Không thêm `build_number`, commit hay timestamp vào alert labels; chúng phá grouping và tạo một notification cho mỗi run.

<Callout type="idea" title="Phân cấp severity">
  `critical` cần can thiệp ngay vì availability hoặc pool thiết yếu đã mất. `warning` cần điều tra trong giờ làm việc hoặc trước khi SLO bị vi phạm. Nếu chưa có owner hay runbook, hãy để tín hiệu trên dashboard/ticket trước khi tạo pager alert.
</Callout>

## Lab local với mock metrics

Lab này chỉ kiểm tra định dạng exposition và cách đọc metric; nó không chạm Jenkins, Prometheus production, token hay alert thật. Cần Docker để chạy `promtool` trong container tạm. Nếu không có Docker, chạy cùng file bằng một bản `promtool` đã cài local.

### Chuẩn bị dữ liệu mẫu

```bash
mkdir -p /tmp/jenkins-monitoring-lab
cd /tmp/jenkins-monitoring-lab

cat > jenkins.prom <<'EOF'
# HELP ci_jenkins_up Jenkins ready to receive requests
# TYPE ci_jenkins_up gauge
ci_jenkins_up 1
# HELP ci_jenkins_executors_queue_length Items waiting for a free executor
# TYPE ci_jenkins_executors_queue_length gauge
ci_jenkins_executors_queue_length 7
# HELP ci_jenkins_executors_busy Busy Jenkins executors
# TYPE ci_jenkins_executors_busy gauge
ci_jenkins_executors_busy 3
# HELP ci_jenkins_executors_online Online Jenkins executors
# TYPE ci_jenkins_executors_online gauge
ci_jenkins_executors_online 4
# HELP ci_jenkins_nodes_online Online Jenkins nodes
# TYPE ci_jenkins_nodes_online gauge
ci_jenkins_nodes_online 2
EOF

docker run --rm \
  -v "$PWD:/work:ro" \
  prom/prometheus:latest \
  promtool check metrics /work/jenkins.prom
```

Không dùng tag `latest` cho hạ tầng production; ở đây nó chỉ làm lab local ngắn gọn. Khi tự động hóa lab/CI, pin image digest hoặc version đã phê duyệt.

### Kiểm tra và đọc kết quả

1. Kết quả `SUCCESS` từ `promtool` nghĩa là file mock tuân thủ Prometheus text exposition format; nó không chứng minh Jenkins plugin đã được cài.
2. Giá trị queue là `7`, nên rule mẫu `sum(ci_jenkins_executors_queue_length) > 5` có điều kiện đúng. Nó chỉ firing sau khi duy trì đủ `for: 15m` trong Prometheus thật.
3. Tỷ lệ executor bận từ mock là `3 / 4 = 0.75`. Đây là dấu hiệu cần quan sát cùng queue age, CPU, disk và lý do queue, không tự động là một alert critical.
4. Để chuyển sang sandbox Jenkins, cài plugin đã được phê duyệt, đặt namespace `ci`, bật authentication, scrape từ Prometheus nội bộ rồi so sánh tên metric thật với mock. Không copy secret hoặc endpoint sandbox sang production.

<Callout type="warn" title="Kết quả lab mong đợi">
  Nếu `promtool` báo lỗi, sửa HELP/TYPE hoặc dòng metric trong file mock. Nếu scrape sandbox nhận `302`, kiểm tra `metrics_path` có `/prometheus/` với slash cuối. Nếu nhận `401` hoặc `403`, kiểm tra network, TLS, account và quyền `Metrics/View`; không tắt auth hoặc CSRF để vượt qua lỗi.
</Callout>

## Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Kiểm tra và hướng xử lý an toàn |
| --- | --- | --- |
| Health probe xanh nhưng build không bắt đầu | Agent offline, label không khớp, executor đầy, throttle/lock hoặc quota provisioning. | Đọc Build Queue nguyên văn, Nodes và saturation theo pool; khôi phục capability hoặc thêm capacity sau khi đo. |
| `/prometheus/` trả `302` | Scraper thiếu dấu slash cuối hoặc endpoint plugin đã đổi. | Dùng đúng `metrics_path: /prometheus/`; xác nhận Path trong cấu hình plugin. |
| Scrape trả `401`/`403` | Auth bật, service account sai hoặc thiếu `Metrics/View`. | Dùng account scrape riêng, token từ secret store và quyền tối thiểu; không mở anonymous endpoint. |
| TLS scrape thất bại | CA/SAN/server name sai hoặc proxy route sai. | Cài CA tin cậy, kiểm tra hostname/certificate chain và allowlist; không bật `insecure_skip_verify`. |
| Prometheus chậm hoặc tốn bộ nhớ | Per-build metrics, parameter labels hoặc job/branch labels quá nhiều. | Tắt/giới hạn per-build collector, tuổi/số build và parameters; giữ labels ổn định rồi đo lại series. |
| Heap/controller latency tăng | Plugin, GC, tải UI/queue hoặc storage chậm. | So JVM/GC, CPU, disk/inodes, proxy latency và thay đổi gần đây; thu thập diagnostic theo quy trình trước khi restart. |
| Disk gần đầy nhưng dashboard không có metric | Disk collector chưa bật hoặc backend storage không phù hợp để scan. | Theo dõi filesystem ở platform/node exporter; xác nhận collector và không quét cloud storage vô hạn chỉ để có panel. |
| Alert gửi lặp theo mỗi build | Label động phá dedupe hoặc rule quá nhạy. | Bỏ build number/SHA/timestamp khỏi alert labels, thêm `for`, grouping/inhibition và liên kết runbook. |

## Checklist trước khi publish

- [ ] Phân biệt liveness, readiness, availability và capacity; probe HTTP không được dùng thay queue/agent/build health.
- [ ] Health check đã thử qua route TLS/proxy thực tế, có timeout/threshold phù hợp startup và không nới auth/CSRF chỉ vì probe.
- [ ] Controller JVM/heap/GC, `JENKINS_HOME` disk/inodes và agent CPU/RAM/disk/I/O đều có owner/panel.
- [ ] Queue, executor và agent offline được xem theo pool label; build outcome và runtime được đo riêng với health HTTP.
- [ ] Plugin ID, version, Jenkins LTS compatibility, endpoint, namespace và collectors tùy chọn đã xác minh trên sandbox.
- [ ] Prometheus scrape dùng TLS, private network allowlist, service account quyền tối thiểu và secret file/secret manager; metrics không public.
- [ ] Labels không chứa secret hay giá trị động; per-build/parameter metrics có giới hạn cardinality và retention.
- [ ] Dashboard có controller, queue, agent, pipeline và storage; mỗi SLI/SLO có scope, cửa sổ và owner.
- [ ] Alert có threshold, duration, severity, dedupe/grouping, inhibition hợp lý và URL runbook đã review; có kế hoạch silence maintenance có hạn.
- [ ] Lab/mock hoặc sandbox đã xác nhận exposition format, scrape path slash cuối và kết quả query trước rollout.

## Nguồn chính thức

- [Jenkins Prometheus Metrics Plugin](https://plugins.jenkins.io/prometheus/) — endpoint, phiên bản đang phát hành và cấu hình plugin.
- [Prometheus Plugin README](https://github.com/jenkinsci/prometheus-plugin) — endpoint mặc định, slash cuối và metrics do plugin xuất.
- [Jenkins Metrics Plugin](https://plugins.jenkins.io/metrics/) — metrics nền tảng được Prometheus plugin đưa ra.
- [Jenkins Security: CSRF Protection](https://www.jenkins.io/doc/book/security/csrf-protection/) — crumbs cho thao tác thay đổi trạng thái.
- [Jenkins Managing Nodes](https://www.jenkins.io/doc/book/managing/nodes/) — node, agent và executor để điều tra capacity.
- [Prometheus Configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) — `scrape_configs`, TLS và service discovery.
- [Prometheus Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) và [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/) — duration, grouping, routing và inhibition.
- [Prometheus Instrumentation Best Practices](https://prometheus.io/docs/practices/instrumentation/) — tên metric và kiểm soát cardinality.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn mô hình controller, job, Pipeline và agent." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu queue, executor, workspace và luồng build." />
  <Card title="Cài Jenkins với Docker" href="/docs/installation/docker" description="Thiết lập controller Docker có healthcheck và TLS baseline." />
  <Card title="Agents trong Pipeline" href="/docs/pipelines/agents" description="Chọn môi trường thực thi phù hợp cho từng stage." />
  <Card title="Labels & Executors" href="/docs/agents/labels-executors" description="Đo capacity theo pool label thay vì tổng executor." />
</Cards>
