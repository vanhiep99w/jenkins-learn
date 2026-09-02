---
title: "Điều kiện when và phê duyệt input"
description: "Chọn stage bằng when và kiểm soát điểm dừng thủ công bằng input trong Declarative Pipeline."
---

<Callout type="info" title="Phạm vi và giả định">
  Bài này dùng Declarative Pipeline trên Jenkins LTS. Lab chỉ tạo file và in log trên agent `linux`; không deploy, không gọi hệ thống production và không dùng credential hay secret.
</Callout>

## Mục lục

- [Mục tiêu và giả định](#mục-tiêu-và-giả-định)
  - [Job thường và Multibranch Pipeline](#job-thường-và-multibranch-pipeline)
- [Khi nào một stage được chạy](#khi-nào-một-stage-được-chạy)
  - [when và stage bị skip](#when-và-stage-bị-skip)
  - [Thứ tự đánh giá và stage agent](#thứ-tự-đánh-giá-và-stage-agent)
- [Các điều kiện when thường dùng](#các-điều-kiện-when-thường-dùng)
  - [branch](#branch)
  - [changeRequest](#changerequest)
  - [expression và parameter allowlist](#expression-và-parameter-allowlist)
- [Điểm phê duyệt thủ công với input](#điểm-phê-duyệt-thủ-công-với-input)
  - [Thông tin trong hộp phê duyệt](#thông-tin-trong-hộp-phê-duyệt)
  - [Timeout, executor và hủy build](#timeout-executor-và-hủy-build)
  - [Audit và giới hạn của approval](#audit-và-giới-hạn-của-approval)
- [Jenkinsfile lab sandbox](#jenkinsfile-lab-sandbox)
  - [Điều mà Jenkinsfile chứng minh](#điều-mà-jenkinsfile-chứng-minh)
- [Thực hành lab sandbox](#thực-hành-lab-sandbox)
  - [Chuẩn bị job](#chuẩn-bị-job)
  - [Quan sát các nhánh điều kiện và approval](#quan-sát-các-nhánh-điều-kiện-và-approval)
- [Ranh giới tin cậy và vận hành an toàn](#ranh-giới-tin-cậy-và-vận-hành-an-toàn)
  - [Pull request và fork là input không tin cậy](#pull-request-và-fork-là-input-không-tin-cậy)
  - [Không đưa input của người dùng vào shell hoặc hostname](#không-đưa-input-của-người-dùng-vào-shell-hoặc-hostname)
- [Lỗi thường gặp](#lỗi-thường-gặp)
- [Checklist](#checklist)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mục tiêu và giả định

`when` là điều kiện đặt trên một stage. Jenkins chỉ chạy stage khi điều kiện đúng; khi sai, stage được đánh dấu **skipped** thay vì làm cả build thất bại. `input` tạo một điểm dừng để một người có quyền xác nhận hoặc cung cấp một giá trị trước khi stage tiếp tục.

Hai cơ chế này trả lời hai câu hỏi khác nhau. `when` trả lời “stage này có áp dụng cho revision và cấu hình hiện tại không?”. `input` trả lời “có người được phép xác nhận bước này không?”. Dùng `when` để tránh công việc không cần thiết, và dùng `input` cho một quyết định thủ công có ngữ cảnh, thời hạn và dấu vết.

### Job thường và Multibranch Pipeline

Một Pipeline job thường checkout một branch/ref mà cấu hình job chỉ định. Jenkins không tự quét repository để tạo job con cho từng branch hoặc pull request (PR), nên các metadata như `BRANCH_NAME`, change request ID hay target branch thường không tồn tại theo cùng cách.

**Multibranch Pipeline** quét SCM và tạo một job con cho mỗi branch hoặc SCM change request mà source plugin phát hiện. Khi đó Jenkins cung cấp metadata branch/change request để điều kiện `branch` và `changeRequest` dùng được. Ví dụ trong bài cần Git, Pipeline và plugin Branch Source phù hợp với SCM của bạn, chẳng hạn GitHub Branch Source khi học với GitHub.

<Callout type="warn" title="Đừng đoán metadata từ tên job">
  `branch` và `changeRequest` được thiết kế cho Multibranch Pipeline. Đừng tự tách `JOB_NAME`, URL repository hoặc tên ref để giả lập chúng trong job thường; cách đó dễ sai khi provider đổi ref, cách đặt tên hoặc chiến lược khám phá PR.
</Callout>

## Khi nào một stage được chạy

### when và stage bị skip

Khai báo `when` nằm trong `stage` và có thể chứa một điều kiện đơn hoặc tổ hợp `allOf`, `anyOf`, `not`. Nếu điều kiện sai, Jenkins hiển thị stage là skipped trong Pipeline view; các `steps` của stage không chạy. Đây là trạng thái mong đợi, khác với `FAILURE` do test hoặc lệnh thất bại.

Ví dụ dưới đây chỉ chạy stage khi `RUN_MODE` nằm trong allowlist. Giá trị khác không được ghép vào lệnh shell và chỉ khiến stage bị skip.

```groovy
stage('Kiểm tra mở rộng') {
  when {
    beforeAgent true
    expression { params.RUN_MODE == 'sandbox' }
  }
  agent { label 'linux' }
  steps {
    sh 'printf "%s\\n" "Extended sandbox check ran"'
  }
}
```

### Thứ tự đánh giá và stage agent

Mặc định, Jenkins áp dụng `options` của stage, cấp **stage agent** nếu có, rồi đánh giá `when` trước khi chạy `steps`. Vì vậy một stage cuối cùng bị skip vẫn có thể đã chờ hoặc chiếm executor để cấp agent. Với Pipeline có `agent` ở cấp pipeline, allocation đó còn có thể đã xảy ra trước khi Jenkins đi tới stage.

Đặt `beforeAgent true` trong `when` để Jenkins đánh giá điều kiện trước khi cấp agent của stage. Đây là lựa chọn tốt cho điều kiện chỉ đọc metadata hoặc parameter và cho agent tốn kém. Nó không giải phóng một pipeline-level agent đã được cấp; để tránh giữ executor khi chờ, thường dùng `agent none` ở cấp pipeline rồi khai báo agent cho từng stage cần chạy.

Khi một stage cũng có `input`, thứ tự mặc định khiến `input` được xử lý sau stage `options` nhưng **trước** stage agent và `when`. Đặt `beforeInput true` để đánh giá `when` trước hộp phê duyệt. `beforeInput true` được ưu tiên hơn `beforeAgent true`: stage sai điều kiện sẽ không hỏi approval cũng không cấp stage agent. Tóm tắt cho stage có `input`:

```text
Mặc định:        stage options → input → stage agent → when → steps
beforeAgent:     stage options → input → when → stage agent → steps
beforeInput:     stage options → when → input → stage agent → steps
```

Đây là thứ tự ở mức **stage**. Pipeline-level `options`, `agent`, checkout mặc định hoặc plugin có thể tạo thêm hành vi quanh stage; hãy quan sát log trên phiên bản Jenkins/plugin đang vận hành trước khi tối ưu capacity.

## Các điều kiện when thường dùng

### branch

`branch 'main'` khớp tên branch hiện tại của **Multibranch Pipeline**. Nó phù hợp cho stage chỉ chạy trên `main`, ví dụ tạo artifact release sau khi CI xanh. Có thể dùng `comparator` khi cần quy tắc so khớp khác, nhưng bắt đầu bằng tên branch cố định sẽ dễ review hơn.

```groovy
when {
  beforeAgent true
  branch 'main'
}
```

Trong job Pipeline thường, cấu hình Branch Specifier chỉ quyết định ref được checkout; nó không biến job thành Multibranch Pipeline. Vì thế không dùng `branch` để suy ra branch trong loại job này. Nếu buộc phải có hành vi theo branch ở job thường, thiết kế lại trigger/job hoặc truyền một parameter đã được kiểm soát, thay vì tin vào chuỗi do người dùng cung cấp.

### changeRequest

`changeRequest` chỉ áp dụng khi SCM source của Multibranch Pipeline phát hiện change request. Điều kiện có thể kiểm tra thuộc tính do SCM plugin cung cấp, ví dụ target branch:

```groovy
when {
  beforeAgent true
  changeRequest target: 'main'
}
```

Stage trên chạy cho PR/change request hướng vào `main`, không chạy cho một branch `main` thông thường. Tên thuộc tính và metadata thực tế phụ thuộc SCM provider cùng Branch Source plugin; kiểm tra cách plugin khám phá branch, origin PR và fork PR trước khi dựa vào điều kiện này cho policy release.

Một branch được push thẳng, PR cùng repository và PR từ fork là ba ngữ cảnh khác nhau. `changeRequest` nhận diện change request, nhưng **không** tự chứng minh tác giả có quyền, source đáng tin hoặc revision đủ an toàn để nhận credential.

### expression và parameter allowlist

`expression` là Groovy closure trả về giá trị boolean. Dùng nó cho logic ngắn, quyết định và không có side effect. Một string không rỗng có thể bị Groovy xem là true, vì vậy hãy so sánh rõ ràng hoặc dùng `.toBoolean()` thay vì trả về string như `'false'`.

```groovy
when {
  beforeAgent true
  expression { params.SANDBOX_ACTION == 'approve' }
}
```

Parameter là input của người dùng hoặc trigger. Chỉ cho phép tập giá trị nhỏ, cố định — ví dụ choice `sandbox`, `skip`, `approve` — rồi map từng giá trị sang hành vi đã định nghĩa. Không dùng `expression` để chạy `sh`, gọi API, đọc secret hoặc quyết định hostname từ một parameter. Điều kiện phải rẻ, dễ lặp lại và không biến Jenkinsfile thành chỗ thực thi logic không tin cậy.

## Điểm phê duyệt thủ công với input

### Thông tin trong hộp phê duyệt

Trong Declarative Pipeline, directive `input` của stage hiện hộp phê duyệt trên trang build. Các trường thường dùng là:

| Trường | Mục đích | Lưu ý |
| --- | --- | --- |
| `message` | Nêu chính xác người duyệt đang xác nhận điều gì. | Ghi revision, môi trường sandbox và hệ quả; không đưa secret vào message. |
| `ok` | Đổi nhãn nút tiếp tục. | Dùng động từ cụ thể như `Approve sandbox`. |
| `submitter` | Giới hạn user/group được phép submit. | Danh tính/group phải khớp security realm và authorization strategy của Jenkins. |
| `submitterParameter` | Lưu ID người đã submit vào biến được đặt tên. | Hữu ích để liên kết audit; không coi biến này là credential hay bằng chứng duy nhất. |
| `parameters` | Yêu cầu thêm dữ liệu khi duyệt. | Chỉ dùng choice/boolean allowlist; validate lại trước mọi hành động có tác động. |

`submitter` thu hẹp ai có thể phê duyệt ở bước này, nhưng không cấp quyền Jenkins cho họ. Job permissions, quyền xem build, quyền trigger và quyền chỉnh Jenkinsfile vẫn do authorization strategy của Jenkins và SCM bảo vệ.

### Timeout, executor và hủy build

Một approval không có deadline có thể treo build vô thời hạn. Đặt `options { timeout(...) }` ngay trên stage chứa `input`; timeout bắt đầu trước `input`, vì stage options được áp dụng trước hộp phê duyệt. Khi hết hạn, build bị abort/failed theo kết quả interruption và log chỉ rõ timeout; xem kết quả thực tế trên Jenkins LTS của bạn để áp dụng notification phù hợp.

`input` được đặt ở cấp stage xảy ra trước stage agent. Vì vậy stage agent chưa bị giữ khi build đang chờ approval. Tuy nhiên, `agent any` ở cấp pipeline hoặc lock/resource đã lấy từ trước vẫn có thể giữ executor hay tài nguyên trong thời gian chờ. Mẫu lab dùng `agent none` để tránh nhầm lẫn này.

Người được phép có thể chọn **Abort** tại input, hoặc administrator có thể abort build. Kết quả thông thường là `ABORTED` và các stage sau không chạy. Không bắt một interruption chung rồi tự động đi tiếp; nếu cần xử lý abort, chỉ ghi nhận/notify an toàn và để quy trình release quay lại một quyết định mới.

### Audit và giới hạn của approval

Lưu build URL, build number, revision, trạng thái input, người submit (khi dùng `submitterParameter`) và giá trị parameter không nhạy cảm vào record release hoặc hệ thống audit tập trung. Jenkins build history và console log là dấu vết vận hành hữu ích, nhưng retention có thể xóa chúng; chính sách audit phải xác định nơi lưu, thời gian giữ và ai được xem.

Approval không phải authorization, test, code review hay rollback. Nó không xác minh artifact có an toàn, không thay thế quyền tối thiểu, không chứng minh PR đã được review và không khôi phục được thay đổi lỗi. Trước một hành động thật, vẫn cần quality gates, review SCM, phân quyền, artifact truy vết, quan sát và một rollback đã được kiểm thử.

<Callout type="warn" title="Approval không làm mã không tin cậy trở nên đáng tin">
  Một người bấm nút không biến Jenkinsfile từ fork thành mã được phép dùng secret hoặc chạy trên agent đặc quyền. Tách trust boundary trước, rồi mới thêm approval như một control bổ sung.
</Callout>

## Jenkinsfile lab sandbox

Jenkinsfile này minh họa branch, change request, `expression`, `beforeInput`, timeout và approval. Nó không checkout secret, không gọi network, không deploy và chỉ in các chuỗi cố định. Thay `jenkins-lab-approvers` bằng user/group thực tế được phép phê duyệt **lab** của bạn.

```groovy
pipeline {
  agent none

  parameters {
    choice(
      name: 'RUN_MODE',
      choices: ['sandbox', 'skip'],
      description: 'Chỉ chọn hành vi sandbox đã được allowlist.'
    )
    choice(
      name: 'SANDBOX_ACTION',
      choices: ['approve', 'skip'],
      description: 'Chỉ approval khi chọn approve.'
    )
  }

  stages {
    stage('Baseline') {
      agent { label 'linux' }
      steps {
        sh 'mkdir -p sandbox-output && printf "%s\\n" "safe lab artifact" > sandbox-output/result.txt'
        sh 'test -s sandbox-output/result.txt'
        archiveArtifacts artifacts: 'sandbox-output/**', allowEmptyArchive: false
      }
    }

    stage('Chỉ main') {
      when {
        beforeAgent true
        branch 'main'
      }
      agent { label 'linux' }
      steps {
        sh 'printf "%s\\n" "main branch condition matched"'
      }
    }

    stage('Chỉ change request vào main') {
      when {
        beforeAgent true
        changeRequest target: 'main'
      }
      agent { label 'linux' }
      steps {
        sh 'printf "%s\\n" "change request condition matched"'
      }
    }

    stage('Expression allowlist') {
      when {
        beforeAgent true
        expression { params.RUN_MODE == 'sandbox' }
      }
      agent { label 'linux' }
      steps {
        sh 'printf "%s\\n" "expression condition matched"'
      }
    }

    stage('Sandbox approval') {
      options {
        timeout(time: 5, unit: 'MINUTES')
      }
      when {
        beforeInput true
        allOf {
          expression { params.SANDBOX_ACTION == 'approve' }
          anyOf {
            branch 'main'
            changeRequest target: 'main'
          }
        }
      }
      input {
        message 'Approve only the no-network, no-deploy sandbox log step?'
        ok 'Approve sandbox'
        submitter 'jenkins-lab-approvers'
        submitterParameter 'APPROVED_BY'
        parameters {
          choice(
            name: 'CONFIRMATION',
            choices: ['sandbox-only', 'cancel'],
            description: 'This value is recorded for the lab; it controls no shell command.'
          )
        }
      }
      agent { label 'linux' }
      steps {
        sh 'printf "%s\\n" "sandbox approval accepted; no external action ran"'
      }
    }
  }

  post {
    aborted {
      echo 'Lab was aborted or its approval timed out; no external action was attempted.'
    }
  }
}
```

### Điều mà Jenkinsfile chứng minh

- Trên branch `main`, stage `Chỉ main` chạy. Trên branch khác, nó bị skip.
- Trên SCM change request hướng tới `main`, `Chỉ change request vào main` chạy. Trên branch build thông thường, nó bị skip.
- `RUN_MODE=skip` làm `Expression allowlist` bị skip. Không có giá trị parameter nào được nội suy vào `sh`.
- `SANDBOX_ACTION=skip` hoặc branch/change request không khớp làm `Sandbox approval` bị skip **trước** khi hiện hộp input, nhờ `beforeInput true`.
- Khi condition khớp, approval chỉ có năm phút. Chọn `Approve sandbox` chỉ in log cố định và archive `sandbox-output/result.txt`; không có deploy thật.

`CONFIRMATION` và `APPROVED_BY` có mặt để minh họa dữ liệu input/audit. Mẫu cố ý không đưa chúng vào shell, URL, hostname, path hay lệnh deploy. Nếu một quy trình thật cần dùng giá trị đã duyệt, kiểm tra allowlist lại trong code đáng tin cậy và map sang target cố định.

## Thực hành lab sandbox

### Chuẩn bị job

<Steps>
<Step>

**Chuẩn bị Jenkins và agent.** Cần Jenkins LTS có Pipeline/Declarative Pipeline, Git và SCM Branch Source plugin tương ứng. Dùng agent Linux mang label `linux`, có `sh` và một executor. Để có metadata `branch`/`changeRequest`, tạo Multibranch Pipeline; một Pipeline job thường chỉ phù hợp để quan sát `expression`.

Nếu chưa có Jenkins local, bắt đầu từ [chạy Jenkins bằng Docker](/docs/installation/docker). Lab có thể dùng controller cho mục đích học ngắn hạn nếu bạn chấp nhận rủi ro lab, nhưng không dùng built-in node cho workload production.

</Step>
<Step>

**Tạo repository sandbox.** Tạo repository bạn kiểm soát, thêm Jenkinsfile trên vào branch `main`, rồi cấu hình Multibranch Pipeline quét repository đó. Bật branch discovery và, nếu provider hỗ trợ, change request discovery. Không thêm webhook production, credential production hoặc URL service vào repository lab.

Tạo user/group `jenkins-lab-approvers` theo security realm của Jenkins, hoặc thay chính xác giá trị `submitter` trong Jenkinsfile bằng user/group lab có quyền phù hợp. Nếu không có quyền quản trị Jenkins, nhờ người quản trị tạo group thay vì bỏ `submitter` cho mọi người duyệt.

</Step>
<Step>

**Tạo ba revision để quan sát.** Trigger build cho `main`; tạo branch `feature/condition-lab`; rồi mở change request từ branch đó vào `main`. Chọn `RUN_MODE=sandbox` và `SANDBOX_ACTION=approve` khi trigger thủ công nếu UI cho phép parameters. Với trigger từ SCM, kiểm tra giá trị mặc định trước khi để build chờ approval.

</Step>
</Steps>

### Quan sát các nhánh điều kiện và approval

| Revision / parameter | Kết quả mong đợi |
| --- | --- |
| Build `main`, `RUN_MODE=sandbox`, `SANDBOX_ACTION=approve` | `Chỉ main`, `Expression allowlist` và `Sandbox approval` chạy; input hiện trong tối đa 5 phút. |
| Change request vào `main`, cùng parameters | `Chỉ change request vào main`, `Expression allowlist` và `Sandbox approval` chạy; `Chỉ main` bị skip. |
| `feature/condition-lab`, cùng parameters | Hai stage SCM và approval bị skip; expression vẫn chạy. |
| Bất kỳ revision, `RUN_MODE=skip` | `Expression allowlist` bị skip. |
| `main`, `SANDBOX_ACTION=skip` | Approval bị skip, không giữ stage agent để chờ input. |

Khi input hiện, thử một lần chọn **Abort** và xác nhận build có trạng thái `ABORTED`, `post { aborted }` chạy và không có stage action sau input. Chạy lại, duyệt bằng user trong `submitter`, rồi ghi nhận build URL, revision và user trong `APPROVED_BY` từ metadata/log của build theo chính sách lab. Để kiểm tra timeout, không bấm gì trong năm phút; không rút ngắn bằng cách xóa timeout.

<Callout type="idea" title="Bài lab an toàn có chủ đích">
  Artifact lab chỉ là file text trong workspace. Bạn có thể xóa workspace sau khi quan sát theo chính sách Jenkins của mình; không có resource cloud, service, secret hay dữ liệu production nào cần dọn.
</Callout>

## Ranh giới tin cậy và vận hành an toàn

### Pull request và fork là input không tin cậy

Jenkinsfile, source code, dependency manifest, branch name, PR title và metadata từ fork đều có thể do người đóng góp kiểm soát. Một `when { changeRequest ... }` chỉ phân loại build, không tạo ranh giới bảo mật. Đặc biệt, không cấp credential deploy, token registry, Docker socket, kubeconfig hay agent đặc quyền cho build PR/fork chỉ vì nó đã qua approval.

Tách agent và credential theo trust boundary: PR/fork chạy trên agent không đặc quyền, tái tạo được, không có secret; branch tin cậy sau review/merge mới đi vào stage dùng capability nhạy cảm. Cấu hình SCM discovery cũng cần được review: provider có thể checkout revision khác cho PR, cần policy riêng cho fork và chỉ cho phép người tin cậy re-run một build khi phù hợp.

Xem [kiến trúc Jenkins](/docs/getting-started/architecture) để hiểu controller, agent và executor; xem [yêu cầu hệ thống](/docs/getting-started/requirements) trước khi tạo pool agent riêng.

### Không đưa input của người dùng vào shell hoặc hostname

Không ghép `params`, input parameters, `BRANCH_NAME`, PR title hay `APPROVED_BY` trực tiếp vào `sh`, `bat`, hostname, URL, file path hoặc biểu thức target. Ký tự shell, khoảng trắng, URL lạ và hostname ngoài allowlist có thể biến một lựa chọn giao diện thành injection hoặc SSRF.

Thay vào đó, chọn một giá trị allowlist rồi map ở code đáng tin cậy. Ví dụ, `sandbox` chỉ có thể map tới một nhãn/target cố định do người vận hành định nghĩa; giá trị lạ phải làm build thất bại hoặc bị từ chối. Không log secret khi validation thất bại.

```groovy
// Minh họa policy: không đưa params.TARGET vào sh hoặc hostname.
def sandboxTargets = [
  'sandbox-a': 'sandbox-a.internal.example',
  'sandbox-b': 'sandbox-b.internal.example',
]
def selectedHost = sandboxTargets[params.SANDBOX_TARGET]
if (selectedHost == null) {
  error('SANDBOX_TARGET is not allowlisted')
}
// Chỉ selectedHost từ map do đội vận hành quản lý mới được dùng tiếp.
```

Ngay cả map này cũng không phải lý do để mở network từ lab. Trong production, đặt validation trước capability nhạy cảm, giới hạn egress/credential của agent và review thay đổi allowlist như thay đổi hạ tầng.

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân có thể | Cách kiểm tra hoặc sửa an toàn |
| --- | --- | --- |
| `branch 'main'` luôn bị skip | Job thường không có Multibranch metadata. | Dùng Multibranch Pipeline và quét SCM; không parse tên job. |
| `changeRequest` không khớp | PR discovery tắt, provider/plugin không cung cấp metadata hoặc target khác dự kiến. | Kiểm tra cấu hình Branch Source và log scan trước khi sửa Jenkinsfile. |
| Stage skip vẫn chờ agent | `when` đang dùng thứ tự mặc định. | Thêm `beforeAgent true` nếu condition không cần agent. |
| Hộp approval hiện cho stage đáng lẽ skip | `when` được đánh giá sau `input`. | Dùng `beforeInput true` và test cả nhánh true/false. |
| Build chờ approval nhưng executor vẫn bận | Pipeline-level agent hoặc lock đã được lấy trước input. | Dùng `agent none` và stage agent; xem executor/lock thực tế. |
| User hợp lệ không thể approve | `submitter` không khớp security realm/group hoặc authorization thiếu. | Kiểm tra user/group và quyền Jenkins; không xóa `submitter` để né policy. |
| Giá trị `false` trong expression vẫn chạy | Closure trả string không rỗng thay vì boolean. | So sánh rõ ràng, ví dụ `params.FLAG == 'true'`. |
| Approval bị xem là gate duy nhất | Thiếu test, review, authorization hoặc rollback. | Thiết kế controls độc lập và diễn tập rollback trước hành động thật. |

## Checklist

- [ ] Mỗi `when` có lý do nghiệp vụ rõ ràng và stage bị skip được xem là kết quả hợp lệ.
- [ ] Tôi biết `branch` và `changeRequest` cần Multibranch Pipeline/SCM metadata, không phải chỉ Branch Specifier của job thường.
- [ ] Tôi đã chọn `beforeAgent true` cho condition không cần agent và `beforeInput true` khi stage approval có thể bị skip.
- [ ] Pipeline không giữ pipeline-level executor trong lúc chờ approval nếu không thật sự cần.
- [ ] `input` có `message`, `ok`, `submitter` phù hợp, timeout và owner xử lý timeout/abort.
- [ ] Dấu vết approval chứa build URL, revision, kết quả và người duyệt theo retention policy; không chứa secret.
- [ ] Parameter/input chỉ dùng allowlist; không được ghép trực tiếp vào shell, hostname, URL hoặc path.
- [ ] PR/fork không nhận credential hay agent đặc quyền; approval không được dùng để vượt trust boundary.
- [ ] Quality gate, SCM review, authorization, artifact truy vết, quan sát và rollback tồn tại độc lập với approval.
- [ ] Lab đã chứng minh ít nhất một stage chạy, một stage skip, approval thành công, abort và timeout mà không gọi hệ thống bên ngoài.

## Nguồn Jenkins chính thức

- [Pipeline Syntax — `when`, `input`, `beforeAgent` và `beforeInput`](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Using a Jenkinsfile — conditions, parameters và stages](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/)
- [Multibranch Pipeline](https://www.jenkins.io/doc/book/pipeline/multibranch/)
- [Pipeline: Input Step](https://www.jenkins.io/doc/pipeline/steps/pipeline-input-step/)
- [Pipeline: Basic Steps — timeout](https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/#timeout-enforce-time-limit)
- [Jenkins Security — Controller Isolation](https://www.jenkins.io/doc/book/security/controller-isolation/)
- [Jenkins Security — Managing Security](https://www.jenkins.io/doc/book/security/managing-security/)

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn lại vai trò của Jenkins trong CI/CD." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu controller, agent, executor và queue." />
  <Card title="Yêu cầu hệ thống" href="/docs/getting-started/requirements" description="Chuẩn bị agent, capacity và ranh giới mạng." />
  <Card title="Nền tảng CI/CD" href="/docs/getting-started/ci-cd-fundamentals" description="Đặt approval trong quality gate và release flow." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Tạo Jenkins local an toàn cho lab." />
</Cards>
