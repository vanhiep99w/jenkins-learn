---
title: "Thiết kế Stages & Steps"
description: "Chia Jenkins Pipeline thành stage và step rõ ràng, dễ quan sát, đồng thời chọn đúng agent để lệnh chạy được."
---

<Callout type="info" title="Mục tiêu bài học">
  Sau bài này, bạn có thể đặt ranh giới stage theo kết quả cần quan sát, chọn agent có đúng hệ điều hành và toolchain, và viết step shell an toàn. Ví dụ dùng Declarative Pipeline; hãy có một Jenkins controller và agent đã sẵn sàng trước khi chạy. Nếu đang dựng môi trường học, xem [chạy Jenkins bằng Docker](/docs/installation/docker).
</Callout>

## Mục lục

- [Mô hình stage step và agent](#mô-hình-stage-step-và-agent)
  - [Ranh giới stage trong Pipeline](#ranh-giới-stage-trong-pipeline)
- [Thiết kế ranh giới stage](#thiết-kế-ranh-giới-stage)
  - [Đặt tên theo mục tiêu](#đặt-tên-theo-mục-tiêu)
  - [Độ hạt và khả năng quan sát](#độ-hạt-và-khả-năng-quan-sát)
  - [Chọn agent phù hợp](#chọn-agent-phù-hợp)
- [Phân loại step trước khi dùng](#phân-loại-step-trước-khi-dùng)
  - [Stage steps và step cụ thể](#stage-steps-và-step-cụ-thể)
  - [Step cơ bản và step phụ thuộc plugin](#step-cơ-bản-và-step-phụ-thuộc-plugin)
- [Jenkinsfile Linux có thể chạy](#jenkinsfile-linux-có-thể-chạy)
  - [Đọc Jenkinsfile theo stage](#đọc-jenkinsfile-theo-stage)
- [Shell sh và batch bat](#shell-sh-và-batch-bat)
  - [Exit code quyết định kết quả build](#exit-code-quyết-định-kết-quả-build)
  - [Quoting và đường dẫn](#quoting-và-đường-dẫn)
- [Đặt tên custom step](#đặt-tên-custom-step)
  - [Shared Library không phải plugin ngầm định](#shared-library-không-phải-plugin-ngầm-định)
- [Lab thiết kế và quan sát Pipeline](#lab-thiết-kế-và-quan-sát-pipeline)
  - [Kết quả mong đợi](#kết-quả-mong-đợi)
- [Lỗi thường gặp](#lỗi-thường-gặp)
- [Checklist trước khi review](#checklist-trước-khi-review)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Nền tảng nên đọc](#nền-tảng-nên-đọc)

## Mô hình stage step và agent

Một **stage** là một chặng có kết quả mà con người cần nhận biết, chẳng hạn `Unit test` hoặc `Build package`. Một **step** là hành động cụ thể bên trong chặng đó, chẳng hạn `sh 'npm test'`. Agent là môi trường thực thi: nó quyết định hệ điều hành, toolchain, workspace và executor thật sự chạy step.

```text
Commit → controller xếp hàng → agent phù hợp → workspace
                                             │
                                             ▼
                                  Checkout source
                                             │
                                             ▼
                                  Unit test ── lỗi → log stage Test
                                             │
                                             ▼
                                  Build package → artifact/kết quả
```

Controller hiển thị trạng thái stage và tập hợp console log, còn lệnh chạy trên agent. Vì vậy, một Jenkinsfile đúng cú pháp vẫn có thể chờ trong queue nếu không có agent mang label yêu cầu, hoặc thất bại nếu agent thiếu `node`, `npm`, shell hay quyền trên workspace. Nền tảng về controller, queue, executor và workspace được giải thích tại [Kiến trúc Jenkins](/docs/getting-started/architecture).

### Ranh giới stage trong Pipeline

Ranh giới stage nên trùng với một **mục tiêu kiểm chứng được** hoặc một **điểm đổi loại công việc**. Ví dụ, `Checkout source`, `Unit test` và `Build package` cho biết ngay mã chưa được lấy, test lỗi, hay quá trình đóng gói lỗi. Không dùng stage chung chung như `Run`, `Process` hoặc `Step 2`; chúng không trả lời người sửa build cần làm gì tiếp theo.

Một stage không phải một dòng lệnh. Hai lệnh `npm ci` và `npm test` có thể ở cùng stage `Unit test` nếu chúng cùng phục vụ phản hồi kiểm thử và cần đọc cùng log. Ngược lại, tách `Build package` khỏi `Unit test` khi artifact hoặc toolchain thay đổi: giao diện Jenkins sẽ chỉ đúng chặng bị đỏ và thời lượng từng chặng có thể được theo dõi độc lập.

## Thiết kế ranh giới stage

### Đặt tên theo mục tiêu

Tên stage nên là động từ hoặc kết quả nghiệp vụ ngắn, nhất quán với ngôn ngữ của nhóm. Những tên sau giúp nhận diện nguyên nhân nhanh hơn:

| Mục đích | Tên nên dùng | Tên khó quan sát |
| --- | --- | --- |
| Lấy mã nguồn đúng revision | `Checkout source` | `Git` |
| Xác nhận unit test | `Unit test` | `Check` |
| Tạo gói phát hành | `Build package` | `Build` khi còn có nhiều loại build |
| Chạy kiểm tra trên Windows | `Windows smoke test` | `bat` |

Tên cần mô tả **đích**, không mô tả implementation duy nhất. Chẳng hạn `Unit test` vẫn đúng khi nhóm đổi từ `npm test` sang `mvn test`; còn `Run npm test` buộc UI và lịch sử stage gắn với một công cụ.

### Độ hạt và khả năng quan sát

Tách stage khi ít nhất một điều đúng:

- kết quả tạo ra một quality gate độc lập, ví dụ lint pass/fail trước unit test;
- stage cần agent, container, quyền hoặc toolchain khác;
- người trực build sẽ xử lý lỗi bằng log khác nhau;
- thời lượng của chặng cần được đo riêng để tìm bottleneck.

Không tách `Install dependency`, `Run test command` và `Print test result` thành ba stage chỉ để pipeline có nhiều ô. Quá nhiều stage làm luồng khó đọc và tăng lần cấp agent nếu mỗi stage khai báo agent riêng. Một điểm bắt đầu tốt cho CI nhỏ là `Checkout source` → `Unit test` → `Build package`; điều chỉnh sau khi đã quan sát log, thời lượng và tỷ lệ lỗi.

<Callout type="idea" title="Log phải gắn với quyết định">
  Mỗi step nên in một thông điệp ngắn nêu việc đang làm, ví dụ `echo 'Running unit tests'`. Đừng in toàn bộ environment, command chứa credential, token hay nội dung file cấu hình nhạy cảm. Log hữu ích là log dẫn tới nguyên nhân, không phải log nhiều nhất.
</Callout>

### Chọn agent phù hợp

Khai báo `agent { label 'linux && node20' }` chỉ chạy khi có agent online mang **cả hai** label. Nhãn nên phản ánh năng lực đã quản lý, như `linux`, `windows`, `node20`, `jdk21` hoặc `arm64`; không dùng `agent any` để che sự khác nhau về toolchain trong production.

Đặt agent ở cấp `pipeline` khi đa số stage dùng cùng môi trường và workspace. Đặt agent trong từng stage khi một chặng thật sự cần môi trường khác, ví dụ ký gói trên Windows sau khi test trên Linux. Khi stage dùng agent riêng, không giả định workspace của stage trước tự xuất hiện trên agent sau: cần checkout lại hoặc chuyển artifact bằng cơ chế đã được thiết kế.

<Callout type="warn" title="Queue không tự chọn agent gần đúng">
  Nếu nhãn là `windows` nhưng chỉ có agent Linux rảnh, build phải chờ. Mở Build Queue để đọc lý do, rồi kiểm tra agent online, labels, số executor, disk và toolchain. Không đổi label thành `any` chỉ để build rời queue.
</Callout>

## Phân loại step trước khi dùng

### Stage steps và step cụ thể

Trong Declarative Pipeline, `stage('Unit test')` là **directive** tạo một chặng hiển thị được, không phải step chạy command. `steps { ... }` là block chứa các hành động. Bên trong block này mới là các step như `echo`, `checkout`, `sh` và `bat`.

| Cú pháp | Vai trò | Ví dụ |
| --- | --- | --- |
| `stage('...')` | Đặt ranh giới và tên chặng trên UI | `stage('Unit test')` |
| `steps { ... }` | Gom các hành động của stage | `steps { echo 'start'; sh 'npm test' }` |
| `echo` | Ghi thông điệp không nhạy cảm vào console log | `echo 'Running unit tests'` |
| `checkout scm` | Checkout revision do job SCM cung cấp vào workspace | `checkout scm` |
| `sh` | Chạy script qua shell Unix trên agent tương thích | `sh 'npm test'` |
| `bat` | Chạy script qua `cmd.exe` trên agent Windows | `bat 'npm test'` |

### Step cơ bản và step phụ thuộc plugin

Đừng hiểu “built-in step” là mọi Jenkins cài mới đều có mọi lệnh. Jenkins Core điều phối controller và agent; khả năng Pipeline, Declarative syntax và các step thường được phân phối qua các plugin Pipeline. Một Jenkins LTS cài bộ Pipeline phổ biến thường có các step cơ bản như `echo`, `sh`, `bat` và `checkout`, nhưng tên plugin hay phiên bản có thể thay đổi theo bản cài.

| Loại | Ví dụ | Điều cần xác minh |
| --- | --- | --- |
| Cú pháp Pipeline phổ biến | `stage`, `steps`, `echo`, `sh`, `bat` | Declarative Pipeline và các plugin Pipeline cần thiết đã được cài; agent có đúng hệ điều hành/shell. |
| Step SCM tổng quát | `checkout scm` | Pipeline job có cấu hình SCM; plugin SCM tương ứng, như Git, đã được cài và credential đọc repository đã được cấp. |
| Step tích hợp | Gửi Slack, quét SonarQube, upload registry | Plugin hoặc API integration cụ thể, version tương thích, cấu hình và quyền tối thiểu đã được xác minh. |
| Custom step | `verifyProject()` | Shared Library hoặc helper do đội sở hữu đã được nạp; tên không tự tồn tại trong Jenkins. |

Vì vậy, hãy tra **Pipeline Syntax → Steps Reference** trên controller của chính bạn trước khi thêm step mới. Trang này phản ánh plugin đang cài, thay vì giả định một plugin có trên mọi Jenkins.

## Jenkinsfile Linux có thể chạy

Ví dụ sau dành cho một Multibranch Pipeline hoặc Pipeline from SCM đã cấu hình repository. Nó yêu cầu agent Linux có labels `linux` và `node20`, cùng `git`, `node` và `npm`. `checkout scm` sẽ lấy revision mà job đang build; với job script nội tuyến không cấu hình SCM, bước này không có nguồn để checkout.

```groovy
pipeline {
  agent { label 'linux && node20' }

  stages {
    stage('Checkout source') {
      steps {
        echo 'Checking out the revision selected by Jenkins'
        checkout scm
      }
    }

    stage('Unit test') {
      steps {
        sh label: 'Install dependencies and run tests', script: '''
          set -eu
          echo 'Running unit tests'
          npm ci
          npm test
        '''
      }
    }

    stage('Build package') {
      steps {
        sh label: 'Build distributable package', script: '''
          set -eu
          echo "Building in $WORKSPACE"
          npm run build
        '''
      }
    }
  }
}
```

### Đọc Jenkinsfile theo stage

- `agent { label 'linux && node20' }` giữ một agent phù hợp trong toàn Pipeline, nên ba stage dùng cùng workspace của lần build đó.
- `echo` tạo dấu mốc dễ tìm trong Console Output. Thông điệp là hằng số hoặc metadata không nhạy cảm; không echo credential hay toàn bộ biến môi trường.
- `checkout scm` lấy source vào `WORKSPACE`. Nếu checkout thất bại, xem URL/credential SCM và log của chính stage này.
- `sh` chạy chuỗi lệnh trong shell Unix. `set -e` dừng script ở command lỗi; `set -u` biến việc dùng biến chưa đặt thành lỗi. Exit code khác `0` làm step thất bại, từ đó stage và build thất bại.
- Triple single quote Groovy (`'''...'''`) chuyển nguyên script cho shell. Dòng `"Building in $WORKSPACE"` dùng double quote của shell để shell mở rộng biến môi trường, không yêu cầu Groovy nội suy `${...}`.

Ví dụ minh họa một ứng dụng Node.js. Với dự án khác, thay `npm ci`, `npm test` và `npm run build` bằng các lệnh đã chạy được trên agent tương ứng. Khái niệm CI/CD và lý do đưa Jenkinsfile vào repository có tại [Nền tảng CI/CD](/docs/getting-started/ci-cd-fundamentals).

## Shell sh và batch bat

### Exit code quyết định kết quả build

Trên Linux/Unix, `sh` coi exit code `0` là thành công; giá trị khác `0` là lỗi và mặc định làm Pipeline dừng. Nếu cần thu exit code để thêm ngữ cảnh, dùng `returnStatus: true`, rồi chủ động fail bằng `error`:

```groovy
script {
  int status = sh(returnStatus: true, script: 'npm test')
  if (status != 0) {
    error "Unit test failed with exit code ${status}"
  }
}
```

Trên Windows, `bat` chạy qua `cmd.exe`. Lệnh cuối cùng cần trả về mã lỗi chính xác; `exit /b %ERRORLEVEL%` chuyển mã lỗi của command vừa chạy về Jenkins.

```groovy
bat '''
  @echo off
  echo Running unit tests
  call npm ci
  if errorlevel 1 exit /b %ERRORLEVEL%
  call npm test
  exit /b %ERRORLEVEL%
'''
```

`call` quan trọng với file batch như `npm.cmd`: không có `call`, `cmd.exe` có thể không quay lại script cha để chạy dòng tiếp theo. Khi `npm test` thất bại, `bat` trả exit code khác `0`, stage `Unit test` đỏ và Console Output hiển thị command lỗi.

### Quoting và đường dẫn

Groovy quote, shell quote và Windows quote là ba lớp khác nhau. Dùng Groovy single quote hoặc triple single quote khi không cần Groovy nội suy. Chỉ dùng double quote ở shell/batch để bao đường dẫn có khoảng trắng hoặc để mở rộng biến của chính shell.

**Linux với `sh`:** `$WORKSPACE` được shell mở rộng. Double quote giữ đường dẫn là một đối số, kể cả khi workspace chứa khoảng trắng.

```groovy
sh '''
  set -eu
  test -f "$WORKSPACE/package.json"
  ./scripts/check-file "$WORKSPACE/docs/release notes.md"
'''
```

**Windows với `bat`:** `%WORKSPACE%` được `cmd.exe` mở rộng và backslash là dấu phân tách đường dẫn. `call` giúp chạy file `.cmd` một cách rõ ràng.

```groovy
bat '''
  @echo off
  call "%WORKSPACE%\scripts\check-file.cmd" "%WORKSPACE%\docs\release notes.md"
  exit /b %ERRORLEVEL%
'''
```

Không ghép secret vào command, kể cả bằng quote. Ví dụ, `curl -H "Authorization: Bearer $TOKEN"` có thể lộ token qua log debug, process list hoặc lỗi command. Lưu secret trong Jenkins Credentials, giới hạn scope của credential và gọi công cụ theo cơ chế an toàn đã được đội kiểm tra. Xem nguyên tắc cài đặt và bảo vệ controller/agent tại [Yêu cầu hệ thống](/docs/getting-started/requirements).

## Đặt tên custom step

Custom step nên mang ý định của tổ chức, dùng động từ và danh từ: `verifyProject()`, `publishBuildMetadata()` hoặc `notifyBuildResult()`. Tránh tên mơ hồ như `run()` và tránh gắn tên tool vào API chung nếu muốn giữ quyền đổi implementation. Tên tốt nói **việc cần đạt**; implementation có thể gọi `sh`, `bat` hay API khác.

### Shared Library không phải plugin ngầm định

`verifyProject()` dưới đây **chỉ tồn tại nếu** đội đã tạo Shared Library và cấu hình library đó cho job/folder/global Jenkins. Nó không phải Jenkins core step và không giả định plugin tích hợp bên thứ ba nào. Ví dụ `vars/verifyProject.groovy` của Shared Library có thể là:

```groovy
// vars/verifyProject.groovy
def call() {
  sh label: 'Verify project', script: '''
    set -eu
    npm ci
    npm test
  '''
}
```

Sau khi library đã được nạp theo chính sách của tổ chức, Jenkinsfile trên agent Linux có thể gọi:

```groovy
stage('Verify project') {
  steps {
    verifyProject()
  }
}
```

Giữ custom step nhỏ, ghi rõ điều kiện cần có và trả lỗi có ngữ cảnh. Nếu cần chạy Windows, đừng tái sử dụng helper chỉ chứa `sh`; hãy tạo implementation theo platform hoặc kiểm tra agent trước khi gọi. Shared Library cũng là code có quyền chạy trong Pipeline, nên review, version/pin theo quy ước và không đặt credential trong source library.

## Lab thiết kế và quan sát Pipeline

Lab này dùng Jenkinsfile Linux ở trên. Điều kiện trước: Jenkins có Pipeline plugins cần thiết, một agent online mang `linux` và `node20`, và repository Node.js có `package.json`, script `test` và script `build`. Nếu chưa nắm mô hình controller-agent, đọc [Tổng quan về Jenkins](/docs/getting-started/overview) trước.

<Steps>
<Step>

### Xác nhận agent trước khi chạy

Vào **Manage Jenkins → Nodes**, mở agent mục tiêu và xác nhận trạng thái `Online`, labels gồm `linux` và `node20`, còn executor rảnh, và `node --version` cùng `npm --version` có thể chạy trên agent. Không chạy lab trên built-in node production.

</Step>
<Step>

### Lưu Jenkinsfile cùng source

Lưu Jenkinsfile ở phần trên vào repository. Tạo Multibranch Pipeline hoặc Pipeline from SCM, chọn repository và branch chứa file. Cấp credential chỉ đọc cho SCM nếu repository private; không ghi token vào remote URL hoặc Jenkinsfile.

</Step>
<Step>

### Chạy và đọc stage

Trigger build hoặc push một commit. Mở Pipeline Graph/Stage View và Console Output. Ghi lại stage nào mất thời gian nhất, agent được gán và `WORKSPACE` in ở `Build package`.

</Step>
<Step>

### Tạo lỗi có chủ đích rồi khôi phục

Tạm đổi `npm test` thành `npm run test-does-not-exist`, commit thay đổi và chạy lại. Build phải dừng ở `Unit test` với exit code khác `0`. Khôi phục `npm test`, commit lần nữa và xác nhận build qua `Build package`.

</Step>
</Steps>

### Kết quả mong đợi

- Khi agent có đủ labels và toolchain, ba stage xuất hiện theo thứ tự `Checkout source`, `Unit test`, `Build package` và build kết thúc `SUCCESS`.
- Khi `npm run test-does-not-exist` được dùng, chỉ stage `Unit test` thất bại; console log có command và exit code để chẩn đoán.
- Khi agent không có một trong hai label, build chờ trong queue thay vì chạy nhầm agent.
- Khi đường dẫn có khoảng trắng, các ví dụ đã quote vẫn truyền đường dẫn như một đối số duy nhất.

## Lỗi thường gặp

<Callout type="warn" title="Build treo ở trạng thái chờ">
  Thường là không có executor phù hợp, agent offline hoặc label không khớp. Đọc nguyên văn lý do trong Build Queue; đừng đổi sang `agent any` trước khi biết toolchain nào Pipeline cần.
</Callout>

<Callout type="warn" title="Checkout hoặc file không tìm thấy">
  `checkout scm` cần job có SCM. Ngoài ra workspace thuộc agent: một stage trên agent khác không tự có source hoặc output của stage trước. Checkout lại, archive/stash artifact theo thiết kế, hoặc giữ cùng agent khi phù hợp.
</Callout>

<Callout type="warn" title="Lệnh báo thành công dù test đã lỗi">
  Kiểm tra exit code cuối của shell/batch. Trên Windows, dùng `call` cho `.cmd` và `exit /b %ERRORLEVEL%`; trên Unix, tránh nuốt lỗi bằng `|| true` trừ khi bạn đã kiểm tra và xử lý status một cách có chủ đích.
</Callout>

## Checklist trước khi review

- [ ] Mỗi stage có tên theo mục tiêu/kết quả và là một ranh giới quan sát có ích.
- [ ] Stage không quá vụn; các chặng tách riêng khi quality gate, agent, toolchain hoặc cách xử lý lỗi khác nhau.
- [ ] `agent`/labels khớp hệ điều hành và toolchain thực tế; queue được kiểm tra khi build chờ.
- [ ] `checkout scm` chỉ dùng trong job đã cấu hình SCM và credential có quyền tối thiểu.
- [ ] `sh` hoặc `bat` kiểm tra exit code; đường dẫn và biến workspace được quote đúng platform.
- [ ] Log chứa dấu mốc hữu ích nhưng không chứa secret, token, password, private key hoặc dump environment.
- [ ] Mỗi step tích hợp đã được đối chiếu với plugin/configuration hiện có; custom step có owner và nguồn Shared Library/helper rõ ràng.
- [ ] Workspace, artifact và chuyển đổi giữa agent được thiết kế thay vì giả định là dùng chung.

## Nguồn Jenkins chính thức

- [Pipeline syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — cú pháp Declarative Pipeline, `agent`, `stages` và `steps`.
- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/) — Jenkinsfile, agent và workspace.
- [Pipeline Steps Reference](https://www.jenkins.io/doc/pipeline/steps/) — danh sách step theo plugin đang cài.
- [Pipeline: Basic Steps](https://plugins.jenkins.io/workflow-basic-steps/) — plugin cung cấp các step Pipeline cơ bản.
- [Pipeline: SCM Step](https://plugins.jenkins.io/workflow-scm-step/) — `checkout` tổng quát cho Pipeline.
- [Pipeline: Nodes and Processes](https://plugins.jenkins.io/workflow-durable-task-step/) — các step chạy process như `sh` và `bat`.
- [Extending with Shared Libraries](https://www.jenkins.io/doc/book/pipeline/shared-libraries/) — cách tổ chức custom step/library.

## Nền tảng nên đọc

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn controller, agent, job và Pipeline trước khi thiết kế Jenkinsfile." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu queue, executor và workspace để chọn agent đúng." />
  <Card title="Yêu cầu hệ thống" href="/docs/getting-started/requirements" description="Chuẩn bị toolchain, tài nguyên và network cho controller/agent." />
  <Card title="Nền tảng CI/CD" href="/docs/getting-started/ci-cd-fundamentals" description="Đặt stage vào feedback loop CI/CD." />
  <Card title="Chạy Jenkins bằng Docker" href="/docs/installation/docker" description="Dựng môi trường Jenkins LTS cho lab." />
</Cards>
