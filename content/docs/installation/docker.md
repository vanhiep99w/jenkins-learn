---
title: "Chạy Jenkins với Docker"
description: "Triển khai Jenkins LTS bằng Docker từ local lab đến production với persistent volume, backup, upgrade và hardening an toàn."
---

<Callout type="info" title="Phạm vi">Bài này dùng image chính thức `jenkins/jenkins`, Docker Engine và Docker Compose. Cấu hình production ở đây là baseline cho một controller trên một Docker host, không phải mô hình high availability.</Callout>

## Mục lục

- [Mục tiêu](#mục-tiêu)
- [1. Mô hình Jenkins trong Docker](#1-mô-hình-jenkins-trong-docker)
  - [Image container và persistent volume](#image-container-và-persistent-volume)
  - [Luồng truy cập và các cổng](#luồng-truy-cập-và-các-cổng)
- [2. Điều kiện tiên quyết](#2-điều-kiện-tiên-quyết)
  - [Kiểm tra Docker](#kiểm-tra-docker)
  - [Tài nguyên và network](#tài-nguyên-và-network)
- [3. Chọn và xác minh image](#3-chọn-và-xác-minh-image)
  - [Chọn LTS với JDK 21](#chọn-lts-với-jdk-21)
  - [Pull và inspect image](#pull-và-inspect-image)
  - [Khai báo image đã chọn](#khai-báo-image-đã-chọn)
  - [Pull từ registry](#pull-từ-registry)
  - [Kiểm tra metadata và digest](#kiểm-tra-metadata-và-digest)
  - [Xác minh Jenkins và Java](#xác-minh-jenkins-và-java)
- [4. Local lab bằng docker run](#4-local-lab-bằng-docker-run)
  - [Khởi chạy controller](#khởi-chạy-controller)
  - [Lấy mật khẩu ban đầu và xem log](#lấy-mật-khẩu-ban-đầu-và-xem-log)
  - [Kiểm tra persistence](#kiểm-tra-persistence)
- [5. Baseline Docker Compose cho production](#5-baseline-docker-compose-cho-production)
  - [Khai báo biến triển khai](#khai-báo-biến-triển-khai)
  - [Tạo compose yaml](#tạo-compose-yaml)
  - [Khởi động và kiểm tra health](#khởi-động-và-kiểm-tra-health)
  - [Render và kiểm tra cấu hình](#render-và-kiểm-tra-cấu-hình)
  - [Pull image đã pin](#pull-image-đã-pin)
  - [Khởi động service](#khởi-động-service)
  - [Chờ healthcheck và xem log](#chờ-healthcheck-và-xem-log)
  - [Lấy mật khẩu unlock](#lấy-mật-khẩu-unlock)
  - [Những gì baseline đã và chưa bảo vệ](#những-gì-baseline-đã-và-chưa-bảo-vệ)
- [6. Quyền truy cập volume](#6-quyền-truy-cập-volume)
  - [Ưu tiên named volume](#ưu-tiên-named-volume)
  - [Khi bắt buộc dùng bind mount](#khi-bắt-buộc-dùng-bind-mount)
- [7. Reverse proxy TLS và agent](#7-reverse-proxy-tls-và-agent)
  - [Đưa giao diện web sau TLS](#đưa-giao-diện-web-sau-tls)
  - [Kết nối agent đúng cách](#kết-nối-agent-đúng-cách)
- [8. Backup và restore](#8-backup-và-restore)
  - [Tạo backup nhất quán](#tạo-backup-nhất-quán)
  - [Pull utility image trước downtime](#pull-utility-image-trước-downtime)
  - [Tạo thư mục đích](#tạo-thư-mục-đích)
  - [Dừng Jenkins có kiểm soát](#dừng-jenkins-có-kiểm-soát)
  - [Archive volume và tách controller key](#archive-volume-và-tách-controller-key)
  - [Khởi động lại và kiểm tra](#khởi-động-lại-và-kiểm-tra)
  - [Restore sang volume mới](#restore-sang-volume-mới)
- [9. Nâng cấp bằng cách recreate container](#9-nâng-cấp-bằng-cách-recreate-container)
  - [Chuẩn bị nâng cấp](#chuẩn-bị-nâng-cấp)
  - [Pull và recreate](#pull-và-recreate)
  - [Cập nhật target trong env](#cập-nhật-target-trong-env)
  - [Xác minh cấu hình và pull](#xác-minh-cấu-hình-và-pull)
  - [Recreate service](#recreate-service)
  - [Theo dõi sau nâng cấp](#theo-dõi-sau-nâng-cấp)
  - [Rollback có kiểm soát](#rollback-có-kiểm-soát)
- [10. Không mount Docker socket vào controller](#10-không-mount-docker-socket-vào-controller)
- [11. Troubleshooting](#11-troubleshooting)
  - [Container restart liên tục](#container-restart-liên-tục)
  - [Permission denied trong Jenkins home](#permission-denied-trong-jenkins-home)
  - [Jenkins báo offline hoặc không tải được plugin](#jenkins-báo-offline-hoặc-không-tải-được-plugin)
  - [Không truy cập được cổng](#không-truy-cập-được-cổng)
  - [Healthcheck unhealthy hoặc khởi động chậm](#healthcheck-unhealthy-hoặc-khởi-động-chậm)
  - [Disk đầy](#disk-đầy)
- [12. Cleanup an toàn](#12-cleanup-an-toàn)
- [Checklist production](#checklist-production)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Mục tiêu

Sau bài này, bạn có thể:

- phân biệt image, container và dữ liệu bền vững trong `JENKINS_HOME`;
- chạy Jenkins LTS bằng `docker run` cho local lab;
- triển khai một baseline Docker Compose có healthcheck, restart policy và named volume;
- quyết định có cần publish cổng `50000` hay không;
- xử lý quyền của volume theo UID/GID trong image;
- backup, restore, nâng cấp và rollback bằng cách thay container thay vì sửa bên trong container;
- tránh cấp quyền Docker daemon cho Jenkins controller;
- chẩn đoán các lỗi thường gặp mà không xóa nhầm dữ liệu.

---

## 1. Mô hình Jenkins trong Docker

### Image container và persistent volume

Image là mẫu chỉ đọc chứa Jenkins core, Java runtime và entrypoint. Container là tiến trình Jenkins được tạo từ image đó. Container có thể bị xóa và tạo lại; dữ liệu Jenkins thì không được phụ thuộc vào vòng đời container.

Image chính thức đặt `JENKINS_HOME` tại `/var/jenkins_home`. Thư mục này chứa cấu hình, plugin, credential được mã hóa, job, build history và nhiều trạng thái vận hành khác. Vì vậy phải mount một persistent volume vào đúng đường dẫn này.

```text
┌──────────────── Docker host ────────────────┐
│                                             │
│  image: jenkins/jenkins:<version>-jdk21     │
│              │ tạo                          │
│              ▼                              │
│  ┌──────────────────────┐                   │
│  │ Jenkins container    │                   │
│  │ HTTP 8080            │                   │
│  │ Agent TCP 50000      │                   │
│  │ /var/jenkins_home ───┼──► named volume  │
│  └──────────────────────┘     jenkins_home  │
│                                             │
└─────────────────────────────────────────────┘
```

Xóa container không xóa named volume. Ngược lại, `docker compose down --volumes`, `docker volume rm` hoặc `docker volume prune` có thể xóa dữ liệu nếu volume không còn được container tham chiếu.

<Callout type="error" title="Container không phải backup">Restart policy chỉ khởi động lại process. Persistent volume chỉ tách dữ liệu khỏi container. Cả hai đều không thay thế bản backup được mã hóa, lưu ở failure domain khác và đã kiểm thử restore.</Callout>

### Luồng truy cập và các cổng

| Cổng container | Mục đích | Khi nào publish |
|---:|---|---|
| `8080/tcp` | Web UI, REST API, webhook và WebSocket | Luôn cần đường truy cập, nhưng production nên chỉ cho reverse proxy hoặc private network tiếp cận |
| `50000/tcp` | Kết nối inbound agent qua Jenkins Remoting TCP | Chỉ publish khi thật sự dùng inbound TCP agent |

Không cần cổng `50000` trong các trường hợp sau:

- controller chủ động kết nối SSH tới agent;
- inbound agent kết nối bằng WebSocket qua HTTP(S);
- chưa dùng agent bên ngoài.

WebSocket agent đi qua cổng `443` của reverse proxy nên thường đơn giản hơn về firewall. Nếu dùng inbound TCP, có thể cấu hình một cổng cố định trong **Manage Jenkins → Security** rồi chỉ mở đúng cổng đó từ mạng agent.

---

## 2. Điều kiện tiên quyết

### Kiểm tra Docker

Cài Docker Engine hoặc Docker Desktop từ tài liệu chính thức. Docker Compose v2 được gọi bằng `docker compose`, không phải binary cũ `docker-compose`.

```bash
docker version
docker compose version
docker info --format 'Server={{.ServerVersion}} OS={{.OperatingSystem}} Architecture={{.Architecture}}'
```

Trên Linux, user chạy lệnh phải có quyền dùng Docker daemon. Thành viên nhóm `docker` gần như có quyền root trên host, vì vậy chỉ cấp quyền này cho tài khoản quản trị phù hợp.

### Tài nguyên và network

Cho local lab, nên bắt đầu với:

- 2 vCPU;
- 2–4 GB RAM;
- ít nhất 10 GB disk trống;
- outbound HTTPS tới Jenkins Update Center, SCM và registry cần dùng.

Cho nhóm nhỏ production, tài liệu Jenkins khuyến nghị 4 GB RAM trở lên và 50 GB disk trở lên. Đây chỉ là điểm bắt đầu. Cần theo dõi heap, CPU, disk latency, inode, tốc độ tăng build history và queue time.

Trước khi chạy, kiểm tra xung đột cổng:

<Tabs items={['Linux', 'macOS', 'Windows PowerShell']}>
  <Tab value="Linux">
    ```bash
    ss -lntp | grep -E ':(8080|50000)\b' || true
    ```
  </Tab>
  <Tab value="macOS">
    ```bash
    lsof -nP -iTCP:8080 -sTCP:LISTEN || true
    lsof -nP -iTCP:50000 -sTCP:LISTEN || true
    ```
  </Tab>
  <Tab value="Windows PowerShell">
    ```powershell
    Get-NetTCPConnection -State Listen -LocalPort 8080,50000 -ErrorAction SilentlyContinue
    ```
  </Tab>
</Tabs>

Xem thêm sizing và network flow tại [Yêu cầu hệ thống](/docs/getting-started/requirements).

---

## 3. Chọn và xác minh image

### Chọn LTS với JDK 21

Luôn dùng repository chính thức [`jenkins/jenkins`](https://hub.docker.com/r/jenkins/jenkins). Với cài đặt mới, Jenkins LTS và Java 21 là baseline hợp lý, tương thích rộng.

Các kiểu tag có ý nghĩa khác nhau:

| Tag | Đặc tính | Khuyến nghị |
|---|---|---|
| `2.568.1-jdk21` | Cố định Jenkins core và Java major | Dùng cho ví dụ và deployment đã qua kiểm thử |
| `lts-jdk21` | Di chuyển theo bản LTS hiện hành | Tiện cho lab; phải `pull` và kiểm thử trước mỗi lần triển khai |
| `latest` hoặc `latest-jdk21` | Dòng weekly mới nhất, không phải LTS | Không dùng mặc định cho production |
| Image kèm digest | Bất biến theo nội dung | Mức chặt nhất cho production; lưu digest sau khi xác minh multi-architecture image |

Các lệnh trong bài dùng `jenkins/jenkins:2.568.1-jdk21`. Tag này đã được Jenkins dùng trong hướng dẫn Docker chính thức tại thời điểm cập nhật tài liệu. Khi triển khai sau này, hãy chọn bản LTS hiện hành từ [Jenkins download](https://www.jenkins.io/download/) và kiểm tra tag tương ứng trên Docker Hub.

<Callout type="warn" title="Tag có thể di chuyển">`lts-jdk21` có thể trỏ tới image khác sau một lần pull. Production nên pin tag phiên bản hoặc digest đã kiểm thử, đồng thời lưu image cũ để rollback. Không giả định image đang cache trên host là image mới nhất của tag.</Callout>

### Pull và inspect image

<Steps>
  <Step>
    ### Khai báo image đã chọn

    ```bash
    IMAGE='jenkins/jenkins:2.568.1-jdk21'
    ```
  </Step>
  <Step>
    ### Pull từ registry

    ```bash
    docker pull "$IMAGE"
    ```
  </Step>
  <Step>
    ### Kiểm tra metadata và digest

    ```bash
    docker image inspect "$IMAGE" \
      --format 'Id={{.Id}} Architecture={{.Architecture}} Created={{.Created}}'

    docker image inspect "$IMAGE" \
      --format '{{range .RepoDigests}}{{println .}}{{end}}'
    ```

    Lưu digest vào change record hoặc artifact của deployment. Digest cho phép biết chính xác nội dung nào đã được chạy.
  </Step>
  <Step>
    ### Xác minh Jenkins và Java

    ```bash
    docker run --rm "$IMAGE" --version
    docker run --rm --entrypoint java "$IMAGE" -version
    docker run --rm --entrypoint id "$IMAGE"
    ```

    Lệnh `id` phải cho thấy Jenkins chạy với UID/GID `1000:1000` trên image Linux Debian chính thức.
  </Step>
</Steps>

---

## 4. Local lab bằng docker run

### Khởi chạy controller

Tạo named volume trước để tên dữ liệu rõ ràng:

```bash
docker volume create jenkins_home
```

Chạy Jenkins ở background:

```bash
docker run --detach \
  --name jenkins-lab \
  --restart unless-stopped \
  --publish 127.0.0.1:8080:8080 \
  --publish 127.0.0.1:50000:50000 \
  --mount type=volume,source=jenkins_home,target=/var/jenkins_home \
  jenkins/jenkins:2.568.1-jdk21
```

Mở [http://localhost:8080](http://localhost:8080). Cả hai port đang chỉ bind vào loopback nên máy khác không truy cập được.

Dòng publish `50000` chỉ minh họa đầy đủ mapping của Jenkins. Nếu không dùng inbound TCP agent, hãy xóa dòng này. Nếu agent ở máy khác phải kết nối TCP, đổi địa chỉ bind theo network design, mở firewall chỉ từ subnet agent và không công khai cổng ra Internet.

<Callout type="warn" title="Local lab không phải production">Lab dùng built-in node để học là chấp nhận được. Production nên đặt số executor trên controller bằng `0`, chạy build trên agent riêng và đặt UI sau reverse proxy có TLS.</Callout>

### Lấy mật khẩu ban đầu và xem log

Theo dõi quá trình khởi động:

```bash
docker logs --follow --tail 100 jenkins-lab
```

Nhấn `Ctrl+C` chỉ dừng việc theo dõi log, không dừng container. Lấy mật khẩu unlock trực tiếp:

```bash
docker exec jenkins-lab \
  cat /var/jenkins_home/secrets/initialAdminPassword
```

Nếu file chưa tồn tại, Jenkins vẫn đang khởi tạo hoặc startup đã lỗi. Kiểm tra lại bằng:

```bash
docker ps --filter name=jenkins-lab
docker logs --tail 200 jenkins-lab
```

Sau khi unlock, hoàn thành setup wizard, tạo tài khoản admin riêng và xóa mật khẩu khỏi clipboard/history nếu công cụ terminal có lưu. Xem tiếp [Thiết lập ban đầu](/docs/installation/initial-setup).

### Kiểm tra persistence

Ghi nhận mount hiện tại:

```bash
docker inspect jenkins-lab \
  --format '{{range .Mounts}}{{println .Type .Name .Destination}}{{end}}'

docker volume inspect jenkins_home
```

Bạn có thể xóa **container** rồi tạo lại với cùng volume mà không mất cấu hình:

```bash
docker stop jenkins-lab
docker rm jenkins-lab

docker run --detach \
  --name jenkins-lab \
  --restart unless-stopped \
  --publish 127.0.0.1:8080:8080 \
  --publish 127.0.0.1:50000:50000 \
  --mount type=volume,source=jenkins_home,target=/var/jenkins_home \
  jenkins/jenkins:2.568.1-jdk21
```

Jenkins phải nhận lại dữ liệu cũ và không sinh một setup wizard mới. Nếu wizard xuất hiện lại, hãy dừng và kiểm tra tên volume cùng destination mount trước khi cấu hình tiếp.

---

## 5. Baseline Docker Compose cho production

Docker Compose phù hợp cho một controller trên một host được quản trị tốt. Compose giúp version hóa image, port, volume, healthcheck và chính sách restart. Nó không tự tạo cluster hay đồng bộ `JENKINS_HOME` giữa nhiều controller.

### Khai báo biến triển khai

Tạo file `.env` cạnh `compose.yaml`:

```dotenv
JENKINS_IMAGE=jenkins/jenkins:2.568.1-jdk21
JENKINS_VOLUME=jenkins_home
```

Trong production, quản lý `.env` bằng configuration management. File này không nên chứa Jenkins credential. Việc pin image trong `.env` giúp change review thấy rõ version nào sẽ chạy.

### Tạo compose yaml

Tạo `compose.yaml`:

```yaml
services:
  jenkins:
    image: ${JENKINS_IMAGE}
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:8080"
      # Chỉ bỏ comment khi dùng inbound TCP agent từ máy khác.
      # Đồng thời giới hạn nguồn bằng firewall của host.
      # - "50000:50000"
    environment:
      JENKINS_JAVA_OPTS: >-
        -Xms1g
        -Xmx2g
        -Djava.awt.headless=true
    volumes:
      - jenkins_home:/var/jenkins_home
    healthcheck:
      test:
        - CMD-SHELL
        - curl --fail --silent --show-error http://localhost:8080/login >/dev/null || exit 1
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 90s
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    stop_grace_period: 60s
    mem_limit: 3g
    cpus: 2.0
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

volumes:
  jenkins_home:
    name: ${JENKINS_VOLUME}
```

Các giá trị `2.0` CPU, 3 GB container memory và 2 GB Java heap là baseline để bắt đầu, không phải sizing chung cho mọi hệ thống. Phần RAM còn lại dành cho non-heap memory, thread, native library và process phụ. Đo metric thực tế rồi điều chỉnh cả `mem_limit` và `-Xmx`; không đặt heap bằng toàn bộ memory limit.

`healthcheck` gọi `/login` từ bên trong container. Image Debian chính thức có `curl`. Kiểm tra này xác nhận HTTP endpoint phản hồi, nhưng không chứng minh SCM, plugin, credential hay agent đều hoạt động.

<Callout type="info" title="Port loopback là có chủ đích">Mapping `127.0.0.1:8080:8080` chỉ cho process trên Docker host truy cập trực tiếp. Reverse proxy chạy trên cùng host có thể forward tới địa chỉ này. Nếu reverse proxy cũng chạy trong Compose, nên đặt hai service chung một private network và không publish `8080` ra host.</Callout>

### Khởi động và kiểm tra health

<Steps>
  <Step>
    ### Render và kiểm tra cấu hình

    ```bash
    docker compose config
    ```

    Lệnh phải resolve được `JENKINS_IMAGE` và `JENKINS_VOLUME`. Đọc lại phần `ports`, đặc biệt trước khi chạy trên host có public IP.
  </Step>
  <Step>
    ### Pull image đã pin

    ```bash
    docker compose pull jenkins
    ```
  </Step>
  <Step>
    ### Khởi động service

    ```bash
    docker compose up -d
    docker compose ps
    ```
  </Step>
  <Step>
    ### Chờ healthcheck và xem log

    ```bash
    docker inspect "$(docker compose ps -q jenkins)" \
      --format 'Status={{.State.Status}} Health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'

    docker compose logs --tail 100 jenkins
    ```
  </Step>
  <Step>
    ### Lấy mật khẩu unlock

    ```bash
    docker compose exec jenkins \
      cat /var/jenkins_home/secrets/initialAdminPassword
    ```
  </Step>
</Steps>

### Những gì baseline đã và chưa bảo vệ

Baseline đã có:

- image phiên bản rõ ràng;
- dữ liệu trong named volume có tên ổn định;
- HTTP chỉ bind loopback;
- healthcheck và restart policy;
- thời gian graceful stop;
- giới hạn CPU/RAM khởi điểm;
- log rotation của Docker;
- bỏ Linux capabilities và chặn privilege escalation qua setuid/setgid.

Production vẫn cần bổ sung:

- reverse proxy và certificate TLS;
- authentication, authorization và secret management;
- controller có `0` executor và agent tách biệt;
- monitoring, alert dung lượng/heap/health và log shipping;
- backup tự động, retention, mã hóa và restore drill;
- patching Docker host và image theo security advisory;
- registry policy, vulnerability scanning và lưu digest;
- RPO, RTO và kế hoạch disaster recovery.

`restart: unless-stopped` khởi động lại container sau lỗi hoặc host reboot, trừ khi quản trị viên đã chủ động stop container. Nó không khởi động một Jenkins mới trên host khác khi host hiện tại hỏng.

---

## 6. Quyền truy cập volume

### Ưu tiên named volume

Image Linux Debian chính thức chạy user `jenkins` với UID/GID `1000:1000`. Named volume mới thường tránh được phần lớn lỗi ownership vì Docker quản lý mount và image khởi tạo nội dung đúng vị trí.

<Tabs items={['Named volume', 'Bind mount Linux', 'Bind mount SELinux']}>
  <Tab value="Named volume">
    ```bash
    docker volume create jenkins_home
    docker volume inspect jenkins_home
    ```

    Đây là lựa chọn mặc định của bài.
  </Tab>
  <Tab value="Bind mount Linux">
    ```bash
    sudo install -d -m 0750 -o 1000 -g 1000 /srv/jenkins/home

    docker run --rm \
      --mount type=bind,source=/srv/jenkins/home,target=/var/jenkins_home \
      --entrypoint id \
      jenkins/jenkins:2.568.1-jdk21
    ```

    Trong Compose, thay volume bằng:

    ```yaml
    volumes:
      - /srv/jenkins/home:/var/jenkins_home
    ```
  </Tab>
  <Tab value="Bind mount SELinux">
    Với host dùng SELinux, short syntax có thể thêm relabel riêng cho Jenkins:

    ```yaml
    volumes:
      - /srv/jenkins/home:/var/jenkins_home:Z
    ```

    `Z` gán private label cho một container. Không dùng tùy tiện trên thư mục hệ thống hoặc thư mục đang được service khác chia sẻ.
  </Tab>
</Tabs>

### Khi bắt buộc dùng bind mount

Bind mount hữu ích khi storage, backup agent hoặc policy của tổ chức yêu cầu một host path cụ thể. Đổi lại, deployment phụ thuộc filesystem layout, UID/GID và security module của host.

Nếu thấy `Permission denied`, kiểm tra trước khi sửa:

```bash
docker compose exec jenkins id
sudo stat -c 'owner=%u:%g mode=%a path=%n' /srv/jenkins/home
sudo namei -l /srv/jenkins/home
```

Chỉ sau khi xác nhận đây đúng là Jenkins home mới sửa ownership:

```bash
sudo chown -R 1000:1000 /srv/jenkins/home
sudo chmod 0750 /srv/jenkins/home
```

<Callout type="warn" title="Không chữa lỗi bằng chmod 777">`chmod -R 777` cho phép mọi user trên host sửa credential, job và plugin. Cũng không nên chạy controller lâu dài bằng `user: root` chỉ để né lỗi volume. Hãy sửa owner, mount label hoặc storage policy đúng nguyên nhân.</Callout>

Với NFS hoặc volume driver từ xa, UID `1000`, root squash, file locking, latency và snapshot consistency phải được kiểm thử. Không giả định named volume dùng driver từ xa có hành vi giống local volume.

---

## 7. Reverse proxy TLS và agent

### Đưa giao diện web sau TLS

Production nên cung cấp một URL ổn định, ví dụ `https://jenkins.example.com/`, và terminate TLS tại reverse proxy hoặc load balancer. Proxy phải truyền đúng host, scheme, client information và hỗ trợ request dài/WebSocket theo cấu hình Jenkins.

Với Compose ở trên, reverse proxy chạy trực tiếp trên host có thể forward tới:

```text
http://127.0.0.1:8080
```

Không mở trực tiếp `8080` ra Internet. Cấu hình Jenkins URL khớp URL HTTPS bên ngoài để webhook, callback và absolute link nhất quán. Hướng dẫn chi tiết nằm tại [Reverse Proxy và TLS](/docs/installation/reverse-proxy-tls).

### Kết nối agent đúng cách

Chọn một launch method theo trust boundary:

| Loại agent | Network flow | Cần publish `50000` |
|---|---|---|
| Inbound TCP | Agent → controller TCP | Có |
| Inbound WebSocket | Agent → reverse proxy HTTPS `443` | Không |
| SSH agent | Controller → agent SSH `22` | Không |

Nếu bật inbound TCP, bỏ comment mapping `50000:50000` trong Compose. Sau đó giới hạn firewall chỉ cho subnet/VPN của agent. Nếu reverse proxy hỗ trợ WebSocket và agent có thể đi qua HTTPS, ưu tiên WebSocket để giảm một cổng public riêng.

Dù dùng cách nào, production nên đặt **Number of executors** của built-in node bằng `0`. Build chạy code từ repository và có thể làm đầy disk, lấy hết RAM hoặc đọc dữ liệu nhạy cảm của controller.

---

## 8. Backup và restore

### Tạo backup nhất quán

Cách dễ kiểm chứng nhất cho một Docker host là dừng Jenkins trong lúc archive volume. Downtime đổi lại tính nhất quán tốt hơn so với copy các file đang thay đổi. Với storage hỗ trợ snapshot nhất quán, có thể dùng snapshot để giảm downtime nhưng vẫn phải kiểm thử restore.

Ví dụ dưới đây:

- archive gần như toàn bộ `JENKINS_HOME`;
- loại `secrets/master.key` khỏi archive thường;
- xuất `master.key` thành file riêng để đưa vào secret vault khác vị trí;
- tạo checksum cho archive.

<Callout type="error" title="Backup chứa dữ liệu cực nhạy cảm">`JENKINS_HOME` chứa credential đã mã hóa và key liên quan. Jenkins khuyến nghị lưu `master.key` riêng khỏi backup thường. Mã hóa cả hai, kiểm soát quyền truy cập và không để bản cuối cùng trên cùng Docker host.</Callout>

<Steps>
  <Step>
    ### Pull utility image trước downtime

    ```bash
    docker pull alpine:3.22
    ```
  </Step>
  <Step>
    ### Tạo thư mục đích

    ```bash
    BACKUP_DIR="$PWD/backups/$(date -u +%Y%m%dT%H%M%SZ)"
    JENKINS_VOLUME_NAME="$(docker inspect "$(docker compose ps -q jenkins)" \
      --format '{{range .Mounts}}{{if eq .Destination "/var/jenkins_home"}}{{.Name}}{{end}}{{end}}')"

    test -n "$JENKINS_VOLUME_NAME"
    mkdir -p "$BACKUP_DIR"
    ```
  </Step>
  <Step>
    ### Dừng Jenkins có kiểm soát

    ```bash
    docker compose stop jenkins
    docker compose ps
    ```
  </Step>
  <Step>
    ### Archive volume và tách controller key

    ```bash
    docker run --rm \
      --mount type=volume,source="$JENKINS_VOLUME_NAME",target=/source,readonly \
      --mount type=bind,source="$BACKUP_DIR",target=/backup \
      alpine:3.22 \
      sh -c "cd /source && tar --exclude='./secrets/master.key' -czf /backup/jenkins-home.tgz ."

    docker run --rm \
      --mount type=volume,source="$JENKINS_VOLUME_NAME",target=/source,readonly \
      alpine:3.22 \
      cat /source/secrets/master.key > "$BACKUP_DIR/master.key"

    chmod 0600 "$BACKUP_DIR/master.key"
    sha256sum "$BACKUP_DIR/jenkins-home.tgz" > "$BACKUP_DIR/jenkins-home.tgz.sha256"
    ```

    Biến `JENKINS_VOLUME_NAME` được lấy từ mount thực tế của container, nên vẫn đúng khi `.env` dùng tên volume khác `jenkins_home`.
  </Step>
  <Step>
    ### Khởi động lại và kiểm tra

    ```bash
    docker compose start jenkins
    docker compose ps
    docker compose logs --tail 50 jenkins
    ```
  </Step>
</Steps>

Sau đó chuyển `jenkins-home.tgz`, checksum và `master.key` đến các kho bảo vệ phù hợp. Controller key phải ở vị trí riêng. Áp dụng retention, mã hóa, immutability nếu có và ghi rõ RPO/RTO.

### Restore sang volume mới

Không restore đè lên volume production ngay. Tạo volume mới giúp giữ nguyên nguồn để rollback và so sánh.

Giả sử archive đã giải mã nằm tại `/srv/restore/jenkins-home.tgz`, còn controller key nằm tại `/secure/jenkins-key/master.key`:

```bash
ARCHIVE_DIR='/srv/restore'
KEY_DIR='/secure/jenkins-key'
RESTORE_VOLUME="jenkins_home_restore_$(date -u +%Y%m%dT%H%M%SZ)"

docker volume create "$RESTORE_VOLUME"

docker run --rm \
  --mount type=volume,source="$RESTORE_VOLUME",target=/target \
  --mount type=bind,source="$ARCHIVE_DIR",target=/backup,readonly \
  --mount type=bind,source="$KEY_DIR",target=/keys,readonly \
  alpine:3.22 \
  sh -eu -c '
    cd /target
    tar -xzf /backup/jenkins-home.tgz
    cp /keys/master.key /target/secrets/master.key
    chown -R 1000:1000 /target
    chmod 0600 /target/secrets/master.key
  '
```

Kiểm tra volume trước khi start:

```bash
docker run --rm \
  --mount type=volume,source="$RESTORE_VOLUME",target=/restore,readonly \
  alpine:3.22 \
  sh -c 'test -f /restore/config.xml && test -f /restore/secrets/master.key && echo OK'
```

Dừng controller hiện tại, rồi chạy Compose với volume restore để validation:

```bash
docker compose down
JENKINS_VOLUME="$RESTORE_VOLUME" docker compose up -d
docker compose logs --follow --tail 100 jenkins
```

Nếu chấp nhận bản restore, cập nhật `JENKINS_VOLUME` trong `.env` thành tên volume mới trước các lệnh Compose tiếp theo. Xác minh login, credential, plugin, job quan trọng, build history và agent connection. Không kết nối controller restore vào webhook/agent production khi đang diễn tập; cô lập network hoặc integration để tránh chạy job hai lần.

<Callout type="warn" title="Một volume chỉ cho một controller ghi">Không chạy đồng thời controller cũ và controller restore với cùng `JENKINS_HOME`. Jenkins home không phải shared database dành cho active-active controller.</Callout>

---

## 9. Nâng cấp bằng cách recreate container

Không nâng Jenkins bằng cách sửa WAR hoặc cài package trực tiếp trong container. Image là đơn vị phát hành; volume là trạng thái. Quy trình đúng là pull image mới, dừng/recreate container và mount lại cùng volume.

### Chuẩn bị nâng cấp

Trước change window:

- đọc [LTS upgrade guide](https://www.jenkins.io/doc/upgrade-guide/) cho các mốc đi qua;
- kiểm tra Java support policy và compatibility của plugin quan trọng;
- chọn tag version cụ thể hoặc digest, không đổi sang `latest`;
- tạo backup nhất quán và xác minh checksum;
- kiểm thử restore hoặc clone volume trong staging;
- ghi image ID/digest hiện tại và target;
- chuẩn bị rollback, bao gồm backup trước khi Jenkins mới migrate dữ liệu.

Ghi baseline hiện tại:

```bash
docker compose exec jenkins java -version
docker compose exec jenkins cat /var/jenkins_home/jenkins.install.UpgradeWizard.state || true

docker image inspect "$(docker compose config --images | head -n 1)" \
  --format 'Id={{.Id}} {{range .RepoDigests}}{{println .}}{{end}}'
```

### Pull và recreate

<Steps>
  <Step>
    ### Cập nhật target trong env

    Đổi `JENKINS_IMAGE` trong `.env` sang tag LTS/JDK đã kiểm thử. Ví dụ baseline hiện hành của bài:

    ```dotenv
    JENKINS_IMAGE=jenkins/jenkins:2.568.1-jdk21
    ```
  </Step>
  <Step>
    ### Xác minh cấu hình và pull

    ```bash
    docker compose config
    docker compose pull jenkins
    docker compose images
    ```
  </Step>
  <Step>
    ### Recreate service

    ```bash
    docker compose up -d --no-deps --force-recreate jenkins
    ```

    Compose tạo container mới từ image target nhưng giữ named volume.
  </Step>
  <Step>
    ### Theo dõi sau nâng cấp

    ```bash
    docker compose ps
    docker compose logs --follow --tail 200 jenkins
    ```

    Sau khi healthcheck xanh, kiểm tra version tại **Manage Jenkins → About Jenkins**, plugin, agent, queue và một smoke-test job không gây tác động production.
  </Step>
</Steps>

Không chạy `docker compose down --volumes` trong quy trình nâng cấp. Tùy chọn đó xóa named volume được Compose quản lý.

### Rollback có kiểm soát

Chỉ đổi tag về image cũ không bảo đảm rollback được. Jenkins core hoặc plugin mới có thể đã migrate file trong `JENKINS_HOME`, khiến phiên bản cũ không đọc được an toàn.

Rollback đáng tin cậy gồm:

1. dừng controller lỗi;
2. giữ nguyên volume sau nâng cấp để điều tra;
3. restore backup trước nâng cấp sang volume mới;
4. đặt lại `JENKINS_IMAGE` về image/digest cũ;
5. đặt `JENKINS_VOLUME` về volume restore;
6. recreate và chạy smoke test trước khi mở webhook/agent.

Xem thêm kế hoạch compatibility và rollback tại [Nâng cấp Jenkins](/docs/installation/upgrade).

---

## 10. Không mount Docker socket vào controller

Cấu hình sau nhìn có vẻ tiện nhưng không được khuyến nghị:

```yaml
# Không dùng trên Jenkins controller production.
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

Docker daemon thường có toàn quyền trên host. Process có quyền gọi socket có thể:

- tạo privileged container;
- mount `/` hoặc thư mục nhạy cảm của host vào container mới;
- đọc secret và dữ liệu của container khác;
- thay đổi network, image và workload trên host;
- đạt quyền tương đương root dù process Jenkins ban đầu chạy UID `1000`.

Rủi ro đặc biệt lớn vì Pipeline và build script là code có thể thực thi. Một pull request độc hại, plugin bị compromise hoặc credential bị lộ có thể biến quyền socket thành takeover Docker host và controller.

<Callout type="error" title="Không mount socket chỉ đọc để tự trấn an">Mount `/var/run/docker.sock:ro` không làm Docker API thành read-only. Client vẫn có thể gửi request tạo container có mount/privilege nguy hiểm qua socket.</Callout>

Thay vào đó:

- đặt Docker build trên agent riêng, ngắn hạn và có thể tái tạo;
- tách agent pool theo trust boundary của repository;
- dùng remote builder/service với authentication, TLS và authorization phù hợp;
- cân nhắc rootless BuildKit, Kaniko hoặc nền tảng build chuyên dụng theo use case;
- không chạy `docker:dind --privileged` cạnh controller nếu chưa chấp nhận và cô lập blast radius.

Nếu tổ chức buộc phải cấp Docker daemon cho một agent, hãy coi agent đó là host đặc quyền. Không dùng chung với controller, giới hạn job được phép chạy, rotate credential và tái tạo agent sau workload không tin cậy.

---

## 11. Troubleshooting

Bắt đầu bằng trạng thái, event và log thay vì xóa container/volume:

```bash
docker compose ps
docker compose logs --tail 200 jenkins
docker inspect "$(docker compose ps -q jenkins)"
docker events --since 15m --filter container="$(docker compose ps -q jenkins)"
```

### Container restart liên tục

Kiểm tra exit code và OOM:

```bash
docker inspect "$(docker compose ps -q jenkins)" \
  --format 'ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} Error={{.State.Error}}'

docker compose logs --tail 300 jenkins
```

- `OOMKilled=true`: giảm `-Xmx` hoặc tăng memory limit/host RAM sau khi đo.
- Exit code kèm lỗi plugin/config: giữ volume, backup trước khi sửa.
- `exec format error`: image architecture không phù hợp host.
- Restart quá nhanh: tạm `docker compose stop jenkins`, đọc log và xử lý nguyên nhân; không xóa volume.

### Permission denied trong Jenkins home

Xác minh UID và mount:

```bash
docker compose run --rm --no-deps --entrypoint id jenkins

docker inspect "$(docker compose ps -q jenkins)" \
  --format '{{range .Mounts}}{{println .Type .Source "->" .Destination "RW=" .RW}}{{end}}'
```

Với bind mount, kiểm tra owner và SELinux label. Với named volume đã restore, chạy một utility container có quyền root để sửa owner về `1000:1000`, nhưng chỉ sau khi backup và xác nhận đúng volume:

```bash
docker run --rm \
  --mount type=volume,source=jenkins_home,target=/target \
  alpine:3.22 \
  chown -R 1000:1000 /target
```

### Jenkins báo offline hoặc không tải được plugin

Kiểm tra DNS, route, proxy và certificate từ chính container:

```bash
docker compose exec jenkins getent hosts updates.jenkins.io
docker compose exec jenkins curl -I https://updates.jenkins.io/update-center.json
```

Nếu tổ chức dùng outbound proxy, cấu hình proxy ở Jenkins và container theo policy. Không chữa lỗi certificate production bằng `curl -k` hoặc tắt TLS verification. Với CA nội bộ, xây custom image hoặc truststore theo hướng dẫn Docker chính thức của Jenkins.

### Không truy cập được cổng

Xác minh mapping:

```bash
docker compose port jenkins 8080
docker compose port jenkins 50000 || true
curl -I http://127.0.0.1:8080/login
```

Nếu mapping là `127.0.0.1:8080`, truy cập từ máy khác sẽ thất bại theo thiết kế. Hãy đi qua reverse proxy. Nếu reverse proxy cũng ở trong Docker, dùng service name và container port trên cùng network, ví dụ `http://jenkins:8080`, không dùng `localhost` bên trong proxy container.

Với agent TCP, kiểm tra Jenkins đã bật fixed inbound agent port và firewall cho phép đúng flow. Agent WebSocket không cần `50000`.

### Healthcheck unhealthy hoặc khởi động chậm

Xem log từng lần probe:

```bash
docker inspect "$(docker compose ps -q jenkins)" \
  --format '{{range .State.Health.Log}}{{println .Start .ExitCode .Output}}{{end}}'
```

Lần khởi động đầu có thể lâu do giải nén WAR, copy reference files và cài plugin. Tăng `start_period` nếu log cho thấy Jenkins vẫn tiến triển bình thường. Không tăng vô hạn để che lỗi permission, OOM hoặc plugin dependency.

Chạy probe thủ công:

```bash
docker compose exec jenkins \
  curl --fail --silent --show-error http://localhost:8080/login >/dev/null \
  && echo healthy
```

### Disk đầy

Kiểm tra cả Docker host và Jenkins home:

```bash
docker system df
docker compose exec jenkins df -h /var/jenkins_home
docker compose exec jenkins df -i /var/jenkins_home
```

Thiết lập build retention, dọn workspace có chủ đích và chuyển release artifact sang artifact repository. Không chạy `docker system prune --volumes` trên host production như phản xạ; lệnh đó có thể xóa volume không được container hiện tại tham chiếu.

---

## 12. Cleanup an toàn

Dừng và xóa container nhưng **giữ dữ liệu**:

<Tabs items={['docker run lab', 'Docker Compose']}>
  <Tab value="docker run lab">
    ```bash
    docker stop jenkins-lab
    docker rm jenkins-lab
    ```
  </Tab>
  <Tab value="Docker Compose">
    ```bash
    docker compose down
    ```
  </Tab>
</Tabs>

Xác minh volume vẫn tồn tại:

```bash
docker volume inspect jenkins_home
```

Chỉ xóa dữ liệu sau khi đã xác nhận đúng volume, có backup cần thiết và được owner phê duyệt:

```bash
docker ps -a --filter volume=jenkins_home
docker volume inspect jenkins_home

docker volume rm jenkins_home
```

Xóa image cũ không xóa volume:

```bash
docker image ls jenkins/jenkins
docker image rm jenkins/jenkins:2.568.1-jdk21
```

<Callout type="error" title="Các lệnh phá hủy dữ liệu">`docker compose down --volumes`, `docker volume prune` và `docker system prune --volumes` có thể xóa Jenkins home. Không đưa chúng vào cron hoặc runbook cleanup chung nếu chưa có allowlist, backup và bước xác nhận.</Callout>

---

## Checklist production

- [ ] Dùng image chính thức `jenkins/jenkins` với LTS và Java được hỗ trợ.
- [ ] Pin tag phiên bản hoặc digest đã kiểm thử; không dùng `latest` mơ hồ.
- [ ] `JENKINS_HOME` mount vào persistent volume có tên rõ ràng.
- [ ] Volume có đủ dung lượng, inode, latency và alert.
- [ ] HTTP `8080` không public trực tiếp; user truy cập qua reverse proxy TLS.
- [ ] Cổng `50000` chỉ mở khi dùng inbound TCP agent và đã giới hạn firewall.
- [ ] Built-in node có `0` executor; build chạy trên agent tách biệt.
- [ ] Không mount Docker socket vào controller.
- [ ] Container không chạy root và không dùng `privileged`.
- [ ] Heap có headroom dưới memory limit và được điều chỉnh bằng metric.
- [ ] Có healthcheck, restart policy, graceful stop và log rotation.
- [ ] Authentication, authorization và credential scope theo least privilege.
- [ ] Backup có retention, mã hóa, checksum và lưu ngoài Docker host.
- [ ] `master.key` được bảo vệ riêng theo chính sách backup.
- [ ] Restore drill đáp ứng RPO/RTO và không kích hoạt nhầm integration production.
- [ ] Upgrade dùng recreate image, có staging và rollback bằng backup trước nâng cấp.
- [ ] Docker host, Jenkins core và plugin được theo dõi security advisory.

---

## Tài liệu tham khảo

- [Jenkins — Installing with Docker](https://www.jenkins.io/doc/book/installing/docker/)
- [Official Jenkins Docker image README](https://github.com/jenkinsci/docker/blob/master/README.md)
- [Jenkins Docker tags](https://hub.docker.com/r/jenkins/jenkins/tags)
- [Jenkins — Java Support Policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/)
- [Jenkins — Backing up and restoring](https://www.jenkins.io/doc/book/system-administration/backing-up/)
- [Jenkins — Reverse proxy configuration](https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/)
- [Docker — Volumes](https://docs.docker.com/engine/storage/volumes/)
- [Docker Compose — Services and healthcheck](https://docs.docker.com/reference/compose-file/services/)
- [Docker — Protect the Docker daemon socket](https://docs.docker.com/engine/security/protect-access/)
