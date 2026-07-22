---
title: "Job đầu tiên"
description: "Tạo Freestyle job, chạy build step, archive artifact và đọc kết quả trong Jenkins."
---

# Job đầu tiên

## Mục lục

- [Mục tiêu](#mục-tiêu)
- [1. Phạm vi bài lab](#1-phạm-vi-bài-lab)
- [2. Điều kiện trước khi bắt đầu](#2-điều-kiện-trước-khi-bắt-đầu)
- [3. Tạo Freestyle job](#3-tạo-freestyle-job)
- [4. Thêm build step](#4-thêm-build-step)
- [5. Lưu artifact](#5-lưu-artifact)
- [6. Chạy và đọc build result](#6-chạy-và-đọc-build-result)
- [7. Thêm source code từ Git](#7-thêm-source-code-từ-git)
- [8. Thử một build thất bại](#8-thử-một-build-thất-bại)
- [9. Troubleshooting](#9-troubleshooting)
- [10. Dọn dẹp và bước tiếp theo](#10-dọn-dẹp-và-bước-tiếp-theo)
- [Checklist hoàn thành](#checklist-hoàn-thành)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Mục tiêu

Sau bài lab này, bạn có thể:

- tạo và cấu hình một Freestyle job;
- chạy command trên Jenkins node;
- dùng biến môi trường như `JOB_NAME`, `BUILD_NUMBER` và `WORKSPACE`;
- archive file output thành build artifact;
- đọc Console Output và phân biệt các trạng thái build;
- cấu hình Git repository cho job;
- xác định lỗi nằm ở cấu hình job, toolchain hay command.

---

## 1. Phạm vi bài lab

Bài lab dùng **Freestyle project** để làm rõ mô hình job → build → workspace → artifact mà chưa cần học cú pháp Pipeline. Job sẽ:

1. chạy thủ công;
2. in thông tin build;
3. tạo file `build/result.txt`;
4. archive file đó;
5. cho phép tải artifact từ trang build.

```mermaid
flowchart LR
    User[Build Now] --> Job[Freestyle job]
    Job --> Queue[Build queue]
    Queue --> Executor[Executor]
    Executor --> Workspace[Workspace]
    Workspace --> Script[Build step]
    Script --> File[build/result.txt]
    File --> Archive[Archived artifact]
```

<Callout type="info" title="Vì sao chưa dùng Pipeline?">Freestyle phù hợp để học giao diện và các khái niệm cơ bản. Với dự án thật, hãy chuyển workflow sang `Jenkinsfile` để review, version hóa và tái tạo cấu hình.</Callout>

---

## 2. Điều kiện trước khi bắt đầu

Bạn cần một Jenkins instance đã:

- cài đặt và khởi động;
- hoàn tất bước unlock;
- cài suggested plugins;
- tạo user quản trị đầu tiên;
- có ít nhất một executor khả dụng cho lab;
- truy cập được bằng trình duyệt.

Nếu chưa có Jenkins, chọn hướng dẫn phù hợp:

<Cards>
  <Card href="/docs/installation/docker/" title="Cài bằng Docker">
    Phù hợp lab cục bộ và có thể dọn dẹp nhanh.
  </Card>
  <Card href="/docs/installation/linux/" title="Cài trên Linux">
    Chạy Jenkins như systemd service.
  </Card>
  <Card href="/docs/installation/initial-setup/" title="Initial setup">
    Unlock Jenkins, cài plugin và tạo admin user.
  </Card>
</Cards>

### 2.1 Kiểm tra executor

Từ dashboard, quan sát **Build Executor Status** hoặc vào **Manage Jenkins → Nodes**. Với lab một máy, built-in node có thể có executor. Nếu tất cả executor bận hoặc node offline, build sẽ nằm trong queue.

<Callout type="warn" title="Chỉ dùng built-in node cho lab">Trong production, đặt executor trên controller bằng `0` và chạy job trên agent riêng để bảo vệ controller khỏi workload build.</Callout>

### 2.2 Quyền cần thiết

User thực hành cần quyền tối thiểu để:

- xem Jenkins và job;
- tạo/configure job;
- trigger và cancel build;
- đọc build log và artifact.

Trong lab cá nhân, admin có đủ quyền. Production không nên cấp quyền admin chỉ để tạo job.

---

## 3. Tạo Freestyle job

<Steps>
  <Step>
    ### Mở màn hình tạo item

    Từ Jenkins dashboard, chọn **New Item**.
  </Step>
  <Step>
    ### Đặt tên job

    Nhập `hello-jenkins`. Tên job xuất hiện trong URL, biến `JOB_NAME`, workspace và lịch sử build; nên dùng tên ngắn, ổn định, không chứa secret.
  </Step>
  <Step>
    ### Chọn loại item

    Chọn **Freestyle project**, sau đó chọn **OK**.
  </Step>
  <Step>
    ### Thêm mô tả

    Trong trường **Description**, nhập:

    ```text
    Job lab đầu tiên: in biến môi trường và tạo artifact mẫu.
    ```
  </Step>
  <Step>
    ### Giữ cấu hình SCM ở None

    Ở lần chạy đầu, giữ **Source Code Management → None** để job không phụ thuộc repository bên ngoài. Phần sau sẽ thêm Git.
  </Step>
</Steps>

### 3.1 Các tùy chọn chưa cần bật

Để lab dễ chẩn đoán, chưa cấu hình:

- build parameter;
- webhook hoặc schedule;
- concurrent build;
- credential;
- agent label;
- timeout/retry plugin.

Mỗi lần chỉ thêm một thay đổi rồi chạy lại giúp bạn biết cấu hình nào gây lỗi.

---

## 4. Thêm build step

Trong trang cấu hình job, tìm phần **Build Steps**, chọn **Add build step**.

<Tabs items={['Linux/macOS agent', 'Windows agent']}>
  <Tab value="Linux/macOS agent">
    Chọn **Execute shell**, sau đó nhập:

    ```bash
    set -eu

    echo "Job: ${JOB_NAME}"
    echo "Build number: ${BUILD_NUMBER}"
    echo "Node: ${NODE_NAME}"
    echo "Workspace: ${WORKSPACE}"

    mkdir -p build
    {
      echo "job=${JOB_NAME}"
      echo "build_number=${BUILD_NUMBER}"
      echo "node=${NODE_NAME}"
      echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    } > build/result.txt

    echo '--- Artifact content ---'
    cat build/result.txt
    ```
  </Tab>
  <Tab value="Windows agent">
    Chọn **Execute Windows batch command**, sau đó nhập:

    ```batch
    @echo on
    echo Job: %JOB_NAME%
    echo Build number: %BUILD_NUMBER%
    echo Node: %NODE_NAME%
    echo Workspace: %WORKSPACE%

    if not exist build mkdir build
    echo job=%JOB_NAME%> build\result.txt
    echo build_number=%BUILD_NUMBER%>> build\result.txt
    echo node=%NODE_NAME%>> build\result.txt
    echo created_at=%DATE% %TIME%>> build\result.txt

    echo --- Artifact content ---
    type build\result.txt
    ```
  </Tab>
</Tabs>

### 4.1 Script đang làm gì?

| Dòng/biến | Ý nghĩa |
|---|---|
| `set -e` | Dừng shell khi command thất bại |
| `set -u` | Báo lỗi khi dùng biến chưa tồn tại |
| `JOB_NAME` | Tên job hiện tại |
| `BUILD_NUMBER` | Số thứ tự build trong job |
| `NODE_NAME` | Node được cấp để chạy build |
| `WORKSPACE` | Đường dẫn workspace của job trên node |
| `mkdir` | Tạo thư mục output |
| `result.txt` | File mẫu sẽ được archive |

Không in credential hoặc toàn bộ environment bằng `env`/`printenv` trong Pipeline thật. Log có thể chứa dữ liệu nhạy cảm ngoài dự kiến.

---

## 5. Lưu artifact

Trong phần **Post-build Actions**:

1. chọn **Add post-build action**;
2. chọn **Archive the artifacts**;
3. nhập pattern:

```text
build/*.txt
```

4. giữ các tùy chọn khác ở mặc định;
5. chọn **Save**.

### 5.1 Pattern được tính từ đâu?

Pattern được tính tương đối từ workspace. Với file:

```text
$WORKSPACE/build/result.txt
```

pattern đúng là:

```text
build/*.txt
```

Không dùng absolute path của một agent cụ thể vì job có thể được schedule sang node khác.

### 5.2 Archive và artifact repository

`Archive the artifacts` phù hợp với lab, file report nhỏ hoặc nhu cầu tải trực tiếp theo build. Với binary/image phát hành, nên publish tới Nexus, Artifactory, package registry hoặc container registry và dùng version/digest bất biến.

---

## 6. Chạy và đọc build result

### 6.1 Trigger build

Từ trang `hello-jenkins`, chọn **Build Now**. Jenkins tạo queue item; khi có executor rảnh, item trở thành build `#1`.

Nếu build chưa bắt đầu, mở queue để đọc lý do. Thông báo thường chỉ ra node offline, thiếu label hoặc executor đang bận.

### 6.2 Mở Console Output

Chọn build `#1` trong **Build History**, sau đó chọn **Console Output**. Bạn sẽ thấy nội dung tương tự:

```text
Started by user admin
Running as SYSTEM
Building in workspace /var/lib/jenkins/workspace/hello-jenkins
Job: hello-jenkins
Build number: 1
Node: built-in
Workspace: /var/lib/jenkins/workspace/hello-jenkins
--- Artifact content ---
job=hello-jenkins
build_number=1
node=built-in
created_at=2026-01-15T10:30:00Z
Finished: SUCCESS
```

Đường dẫn, user, node và timestamp sẽ khác theo môi trường.

### 6.3 Đọc log có hệ thống

Đọc theo thứ tự:

1. **Cause** — ai hoặc sự kiện nào trigger build;
2. **Node/workspace** — build chạy ở đâu;
3. **Command** — command nào thực sự được gọi;
4. **Dòng lỗi đầu tiên** — thường hữu ích hơn stack trace cuối;
5. **Exit code** — command trả trạng thái nào;
6. **Post-build action** — archive/report/notification có thành công không;
7. **Final status** — `SUCCESS`, `UNSTABLE`, `FAILURE` hoặc `ABORTED`.

### 6.4 Tải artifact

Quay lại trang build `#1`. Trong phần **Build Artifacts**, mở hoặc tải `result.txt`. Nội dung phải khớp với build number hiện tại.

Chạy **Build Now** lần nữa. Build `#2` sẽ có artifact riêng chứa `build_number=2`. Đây là khác biệt giữa job (định nghĩa) và build (một lần chạy).

### 6.5 Các trạng thái cần biết

| Trạng thái | Ý nghĩa trong lab |
|---|---|
| `SUCCESS` | Script và archive action thành công |
| `FAILURE` | Command lỗi hoặc không tìm thấy artifact bắt buộc |
| `UNSTABLE` | Thường do publisher/test report báo vấn đề không fatal |
| `ABORTED` | User dừng build hoặc timeout |

---

## 7. Thêm source code từ Git

Sau khi job không SCM chạy ổn định, có thể cấu hình repository của bạn.

### 7.1 Chuẩn bị repository

Repository mẫu tối thiểu:

```text
hello-jenkins-repo/
├── README.md
└── scripts/
    └── verify.sh
```

`scripts/verify.sh`:

```bash
#!/usr/bin/env bash
set -eu

echo "Đang kiểm tra revision: $(git rev-parse --short HEAD)"
test -f README.md
mkdir -p build
printf 'commit=%s\n' "$(git rev-parse HEAD)" > build/git-result.txt
```

Commit file và cấp quyền executable:

```bash
chmod +x scripts/verify.sh
git add README.md scripts/verify.sh
git commit -m "Add Jenkins verification script"
git push
```

### 7.2 Cấu hình Git trong job

1. chọn **Configure** trên job;
2. tại **Source Code Management**, chọn **Git**;
3. nhập **Repository URL**;
4. nếu repository private, chọn credential đã tạo trong Jenkins;
5. đặt branch specifier phù hợp, ví dụ `*/main`;
6. thay build step bằng:

```bash
./scripts/verify.sh
```

7. đổi artifact pattern thành:

```text
build/*.txt
```

8. lưu và chạy build.

### 7.3 Không nhập secret vào URL

Tránh URL dạng:

```text
https://username:token@git.example.com/team/repo.git
```

Token có thể xuất hiện trong config hoặc log. Hãy tạo credential trong Jenkins, chọn credential theo ID và giới hạn scope. Xem [Credentials và secrets](/docs/security/credentials-secrets/).

### 7.4 Xác nhận checkout đúng revision

Trong Console Output, kiểm tra:

- remote URL đúng;
- branch/revision đúng;
- commit SHA trong `git-result.txt` khớp revision Jenkins checkout;
- workspace không chứa file cũ làm test pass sai.

---

## 8. Thử một build thất bại

Học cách đọc lỗi bằng cách thêm tạm một command thất bại vào cuối build step.

Linux/macOS:

```bash
printf '%s\n' 'Mô phỏng lỗi'
exit 2
```

Windows:

```batch
echo Mô phỏng lỗi
exit /b 2
```

Lưu và chạy lại. Kết quả mong đợi:

- build chuyển sang `FAILURE`;
- Console Output cho thấy command trả exit code khác `0`;
- build number vẫn tăng;
- job configuration không mất;
- artifact có thể không được archive tùy vị trí lỗi và cấu hình post-build action.

Sau khi quan sát, xóa hai dòng mô phỏng lỗi và chạy lại để khôi phục trạng thái `SUCCESS`.

<Callout type="warn" title="Không che lỗi bằng mọi giá">Đừng thêm `|| true` chỉ để build xanh. Nếu cần tiếp tục publish test report sau lỗi, hãy xử lý có chủ đích trong Pipeline và giữ trạng thái phản ánh đúng chất lượng.</Callout>

---

## 9. Troubleshooting

### 9.1 Build nằm mãi trong queue

| Kiểm tra | Cách xử lý |
|---|---|
| Built-in node/agent offline | Mở **Manage Jenkins → Nodes** và đọc log node |
| Không có executor | Chờ workload khác hoặc cấu hình agent đúng capacity |
| Label không khớp | Gỡ restriction trong lab hoặc sửa label |
| Controller đang quiet down | Kiểm tra trạng thái quản trị trước khi tiếp tục |

### 9.2 `Execute shell` không xuất hiện

Bạn có thể đang chạy Windows agent hoặc plugin/cấu hình không cung cấp step đó. Dùng **Execute Windows batch command** cho Windows. Đảm bảo job được schedule tới OS phù hợp.

### 9.3 `Permission denied` khi chạy script Git

Kiểm tra executable bit đã được commit:

```bash
git ls-files --stage scripts/verify.sh
```

Có thể gọi rõ shell nếu repository/platform không giữ executable bit:

```bash
bash scripts/verify.sh
```

### 9.4 `No artifacts found`

Kiểm tra:

```bash
pwd
find . -maxdepth 3 -type f -print
```

Sau đó đối chiếu đường dẫn với pattern tương đối từ workspace. Không sửa bằng pattern quá rộng như `**/*` vì có thể archive source, cache hoặc secret ngoài ý muốn.

### 9.5 Git authentication thất bại

Xác nhận:

- credential type phù hợp HTTPS hoặc SSH;
- credential có quyền đọc repository;
- host key verification được cấu hình đúng khi dùng SSH;
- controller/agent resolve DNS và kết nối được SCM;
- credential nằm trong scope job có thể sử dụng.

### 9.6 Command chạy local nhưng lỗi trên Jenkins

So sánh:

- OS và shell;
- `PATH` và version tool;
- current working directory;
- file permission và line ending;
- user chạy process;
- network/proxy;
- environment variable;
- dependency/cache có sẵn local nhưng thiếu trên agent.

Mục tiêu không phải làm agent giống laptop bằng sửa tay, mà làm toolchain có thể tái tạo.

---

## 10. Dọn dẹp và bước tiếp theo

### 10.1 Dọn job lab

Nếu không cần giữ:

1. mở job `hello-jenkins`;
2. chọn **Delete Project**;
3. xác nhận đúng job;
4. kiểm tra workspace/artifact đã được cleanup theo cấu hình.

Nếu giữ job, cấu hình **Discard old builds** để tránh lịch sử tăng không giới hạn.

### 10.2 Chuyển sang Pipeline as Code

Freestyle job đã giúp bạn thấy các thành phần cơ bản. Bước tiếp theo là tạo Pipeline với cùng hành vi:

```groovy
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                sh '''
                    set -eu
                    mkdir -p build
                    echo "build_number=${BUILD_NUMBER}" > build/result.txt
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'build/*.txt', fingerprint: true
        }
    }
}
```

Học tiếp:

<Cards>
  <Card href="/docs/jobs/freestyle/" title="Freestyle job">
    Cấu hình trigger, build step và post-build action chi tiết.
  </Card>
  <Card href="/docs/pipelines/overview/" title="Tổng quan Pipeline">
    Chuyển từ cấu hình UI sang workflow bằng code.
  </Card>
  <Card href="/docs/pipelines/jenkinsfile/" title="Jenkinsfile">
    Lưu Pipeline trong source control.
  </Card>
  <Card href="/docs/agents/overview/" title="Jenkins agents">
    Tách workload khỏi controller.
  </Card>
</Cards>

---

## Checklist hoàn thành

- [ ] Tạo được Freestyle job `hello-jenkins`.
- [ ] Build chạy trên executor và có trạng thái `SUCCESS`.
- [ ] Console Output hiển thị job, build number, node và workspace.
- [ ] Tải được `build/result.txt` từ Build Artifacts.
- [ ] Chạy lần hai và thấy build number tăng độc lập.
- [ ] Tạo được một build `FAILURE` có chủ đích và tìm thấy nguyên nhân trong log.
- [ ] Không hard-code credential trong job hoặc repository URL.
- [ ] Biết bước tiếp theo là chuyển workflow sang `Jenkinsfile` và agent riêng.

---

## Tài liệu tham khảo

- [Jenkins — Working with Projects](https://www.jenkins.io/doc/book/using/working-with-projects/)
- [Jenkins Glossary](https://www.jenkins.io/doc/book/glossary/)
- [Using Jenkins Agents](https://www.jenkins.io/doc/book/using/using-agents/)
- [Using Credentials](https://www.jenkins.io/doc/book/using/using-credentials/)
- [Getting Started with Pipeline](https://www.jenkins.io/doc/book/pipeline/getting-started/)
- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/)
