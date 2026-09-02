---
title: "Declarative Pipeline"
description: "Viết Jenkinsfile Declarative dễ đọc, kiểm soát agent, điều kiện, phê duyệt và lỗi một cách có chủ đích."
---

Declarative Pipeline là cách mô tả Pipeline bằng một khung cố định: người đọc nhìn thấy nơi cấp agent, các stage, điều kiện và xử lý kết quả mà không phải lần theo toàn bộ Groovy. Đây là điểm bắt đầu phù hợp khi một quy trình CI/CD cần được review và vận hành bởi cả nhóm.

<Callout type="info" title="Phạm vi và điều kiện">
  Cú pháp `pipeline { ... }` là mô hình do plugin **Pipeline: Declarative** cung cấp, không phải Jenkins core đơn lẻ. Pipeline chỉ chạy khi controller có các plugin Pipeline cần thiết, agent phù hợp và các step mà Jenkinsfile gọi đã được cài/cấu hình. Mẫu bên dưới dùng `timestamps()`, nên giả định plugin **Timestamper** đã cài; nếu không có, bỏ directive đó trước khi validate. Hai stage phát hành chỉ mô phỏng an toàn bằng cách tạo và kiểm tra một file trong workspace, không kết nối hay triển khai đến môi trường nào. Một Jenkinsfile đúng cú pháp vẫn có thể thất bại lúc chạy vì thiếu label, tool, credential hoặc plugin tích hợp.
</Callout>

## Mục lục

- [Khung tư duy](#khung-tư-duy)
- [Pipeline, agent, stages và steps](#pipeline-agent-stages-và-steps)
  - [Pipeline](#pipeline)
  - [Agent](#agent)
  - [Stages và steps](#stages-và-steps)
- [Các directive dùng thường xuyên](#các-directive-dùng-thường-xuyên)
  - [Options đặt giới hạn thời gian và lần thử](#options-đặt-giới-hạn-thời-gian-và-lần-thử)
  - [Environment và parameters](#environment-và-parameters)
  - [When và input kiểm soát đường đi](#when-và-input-kiểm-soát-đường-đi)
  - [Post kết thúc có chủ đích](#post-kết-thúc-có-chủ-đích)
- [Jenkinsfile mẫu có thể chạy](#jenkinsfile-mẫu-có-thể-chạy)
  - [Đọc từng phần của mẫu](#đọc-từng-phần-của-mẫu)
- [Chọn agent và bảo vệ executor workspace](#chọn-agent-và-bảo-vệ-executor-workspace)
- [Secret và credential an toàn](#secret-và-credential-an-toàn)
- [Giới hạn của Declarative và script](#giới-hạn-của-declarative-và-script)
- [Lab từng bước](#lab-từng-bước)
- [Lỗi cú pháp và hành vi ngầm định](#lỗi-cú-pháp-và-hành-vi-ngầm-định)
- [Checklist Jenkinsfile dễ kiểm soát](#checklist-jenkinsfile-dễ-kiểm-soát)
- [Nguồn chính thức và đọc tiếp](#nguồn-chính-thức-và-đọc-tiếp)

## Khung tư duy

Hãy xem Jenkinsfile như một bản thiết kế thực thi, không phải chỉ là nơi chứa lệnh shell. Một thiết kế dễ đọc trả lời nhanh năm câu hỏi:

1. **Chạy ở đâu?** `agent` chỉ ra môi trường, nhãn và executor mà công việc cần.
2. **Chạy những chặng nào?** `stages` đặt tên theo kết quả nghiệp vụ như `Kiểm tra`, `Đóng gói`, `Duyệt phát hành`.
3. **Mỗi chặng làm gì?** `steps` là lệnh hoặc hành động cụ thể.
4. **Khi nào được đi tiếp?** `when`, `input`, `options` và `parameters` làm điều kiện, giới hạn và quyền quyết định hiện rõ.
5. **Kết thúc thì sao?** `post` ghi kết quả, dọn dẹp hoặc gửi tín hiệu phù hợp với trạng thái build.

Đừng đặt mọi thứ vào một stage tên `Build`. Nếu `npm test` thất bại, người xem cần thấy ngay đó là lỗi kiểm thử, không phải đoán từ một log dài. Ngược lại, cũng không cần biến từng câu `echo` thành một stage; một stage nên là một mốc mà người dùng hoặc người vận hành thực sự muốn quan sát.

## Pipeline, agent, stages và steps

### Pipeline

Khối ngoài cùng `pipeline {}` là một Declarative Pipeline. Bên trong nó phải có `agent` ở cấp Pipeline hoặc mỗi stage, và thường có `stages`. Các directive như `options`, `environment`, `parameters` và `post` khai báo chính sách chung. Cấu trúc này được Declarative validator kiểm tra trước khi Pipeline thực thi đầy đủ.

```groovy
pipeline {
  agent any

  stages {
    stage('Kiểm tra nhanh') {
      steps {
        echo 'Một step đang chạy trong một stage.'
      }
    }
  }
}
```

`agent any` là lựa chọn tiện cho một lab, vì Jenkins lấy một executor đang rảnh. Nó không bảo đảm agent đó có Node.js, Maven, Docker hoặc quyền truy cập network mà dự án cần. Với công việc thật, hãy mô tả nhu cầu bằng label hoặc một loại agent rõ ràng.

### Agent

Agent là nơi Jenkins cấp **executor** và workspace để chạy step. `agent { label 'linux' }` yêu cầu node có label `linux`; `agent none` không cấp executor cho toàn Pipeline mà buộc từng stage phải tự khai báo agent.

```groovy
pipeline {
  agent none

  stages {
    stage('Chạy trên Linux') {
      agent { label 'linux' }
      steps {
        sh 'uname -s'
      }
    }
  }
}
```

Cách `agent none` làm chi phí tài nguyên rõ ràng: stage nào cần chạy lệnh mới giữ executor. Nó đặc biệt hữu ích khi Pipeline có stage chờ approval hoặc các stage cần toolchain khác nhau. Đổi lại, các stage có thể được cấp agent hoặc workspace khác nhau. Đừng giả định file tạo ở stage trước luôn tồn tại ở stage sau; hãy checkout lại, lưu artifact, hoặc dùng cơ chế chuyển file phù hợp với thiết kế của bạn.

### Stages và steps

`stages` là danh sách các chặng theo thứ tự. Mỗi `stage('Tên')` tổ chức một đơn vị công việc có thể quan sát trên giao diện Pipeline. Trong `steps`, Jenkins gọi các hành động như `echo`, `sh`, `bat`, `checkout` hoặc step do plugin bổ sung.

```groovy
stage('Kiểm tra') {
  steps {
    sh 'npm ci'
    sh 'npm test'
  }
}
```

`sh` cần shell Unix trên agent; agent Windows thường dùng `bat` hoặc `powershell`. Các step tích hợp như deploy lên cloud, gửi Slack, quét chất lượng hay thao tác Docker thường do plugin cung cấp. Trước khi đưa một step vào Jenkinsfile, kiểm tra trang plugin, quyền cần cấp và cú pháp được Jenkins instance của bạn hỗ trợ.

## Các directive dùng thường xuyên

| Directive     | Dùng để làm gì?                                                              | Thiết kế nên ưu tiên                                               |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `options`     | Áp timeout, retry, timestamp, giới hạn chạy đồng thời hoặc hành vi checkout. | Đặt giới hạn để build không chiếm tài nguyên vô hạn.               |
| `environment` | Khai báo biến môi trường tĩnh hoặc tham chiếu credential.                    | Tách cấu hình không nhạy cảm; không ghi secret trực tiếp.          |
| `parameters`  | Nhận giá trị người dùng chọn khi khởi tạo build.                             | Chỉ cho phép lựa chọn có ý nghĩa và kiểm tra giá trị trước deploy. |
| `when`        | Bỏ qua stage khi điều kiện không đạt.                                        | Diễn đạt policy branch/môi trường ngay cạnh stage bị kiểm soát.    |
| `input`       | Dừng stage để một người được phép quyết định.                                | Giới hạn người duyệt và đặt timeout cho approval.                  |
| `post`        | Chạy hành động theo kết quả như `success`, `failure`, `always`.              | Luôn giữ log/dọn dẹp tối thiểu và báo đúng tín hiệu.               |

### Options đặt giới hạn thời gian và lần thử

`timeout` giới hạn thời gian một Pipeline hoặc stage được phép kéo dài. Đây là hàng rào chống lệnh treo, agent bị kẹt hoặc approval bị bỏ quên. `retry` yêu cầu Jenkins thử lại khi scope đó thất bại, phù hợp hơn với lỗi tạm thời như network chập chờn hơn là lỗi test xác định.

```groovy
options {
  timeout(time: 30, unit: 'MINUTES')
  retry(2)
  timestamps()
  disableConcurrentBuilds()
}
```

Đoạn trên đặt chính sách ở cấp Pipeline. `timestamps()` là step/directive do plugin **Timestamper** cung cấp, giúp đối chiếu log với sự cố bên ngoài; nó không phải một phần của Jenkins core hay Pipeline: Declarative. Chỉ giữ dòng này khi Timestamper đã được cài trên controller; nếu không, xóa riêng `timestamps()` mà không làm thay đổi timeout hay luồng Pipeline. `disableConcurrentBuilds()` tránh hai lần chạy của cùng job cùng ghi vào một tài nguyên. Khi đặt `timeout` ở cấp stage, Jenkins áp nó trước khi cấp stage agent, vì vậy thời gian chờ cấp agent cũng bị tính vào giới hạn đó.

<Callout type="warn" title="Retry không làm deploy an toàn hơn">
  Không đặt `retry` bao quanh thao tác có side effect mà chưa thiết kế idempotent, ví dụ tạo release, trừ tiền hoặc migrate schema. Lần chạy lại có thể thực hiện hành động lần thứ hai. Với deploy, hãy dùng artifact có định danh, kiểm tra trạng thái đích và có rollback rõ ràng.
</Callout>

### Environment và parameters

`environment` đặt biến cho phạm vi Pipeline hoặc stage. `parameters` tạo form khi người dùng khởi động build; giá trị được đọc qua `params.<TÊN>`.

```groovy
parameters {
  choice(name: 'DEPLOY_TARGET', choices: ['staging', 'production'], description: 'Môi trường được mô phỏng')
  booleanParam(name: 'RUN_EXTENDED_SANDBOX_CHECK', defaultValue: false, description: 'Chạy kiểm tra sandbox mở rộng')
}

environment {
  APP_NAME = 'catalog-api'
}
```

Dùng parameter để người khởi tạo chọn trong một tập giá trị hẹp, thay vì để họ điền tùy ý một hostname hay câu lệnh shell. Parameter không phải cơ chế phân quyền: người có quyền build vẫn có thể chọn `production` nếu Jenkinsfile cho phép. Quyền job, quyền credential và `input` phải kiểm soát riêng.

### When và input kiểm soát đường đi

`when` quyết định một stage có chạy hay bị đánh dấu `skipped`. Ví dụ dưới chỉ chạy kiểm tra sandbox mở rộng khi người dùng đã chọn nó:

```groovy
when {
  expression { params.RUN_EXTENDED_SANDBOX_CHECK }
}
```

Với điều kiện không cần workspace, thêm `beforeAgent true` để kiểm tra trước khi Jenkins giữ executor:

```groovy
when {
  beforeAgent true
  branch 'main'
}
```

`branch` hữu ích trong Multibranch Pipeline; trong job Pipeline thông thường, metadata branch có thể không tồn tại như bạn kỳ vọng. Nếu policy dựa vào branch, hãy kiểm tra nó trên đúng loại job và đúng SCM provider.

`input` là directive của stage để chờ phê duyệt. Đặt `beforeInput true` trong `when` để Jenkins đánh giá điều kiện trước khi mở hộp approval. Khối `input` ở dưới chỉ hiện khi `DEPLOY_TARGET` là `production`, và chỉ tài khoản/nhóm được cấu hình là `release-managers` mới có thể duyệt.

```groovy
stage('Duyệt gate production') {
  when {
    beforeInput true
    expression { params.DEPLOY_TARGET == 'production' }
  }
  input {
    message 'Cho phép Pipeline đi qua gate phát hành production?'
    ok 'Cho phép'
    submitter 'release-managers'
  }
  agent { label 'linux' }
  steps {
    sh 'printf "%s\\n" "Approval accepted; no deployment is run in this example."'
  }
}
```

Bọc stage approval bằng `options { timeout(...) }` hoặc có timeout phù hợp ở Pipeline để build không chờ vô thời hạn. Ví dụ trên chỉ xác nhận gate và cố ý không gọi lệnh deploy. Approval kiểm soát thời điểm thực hiện; nó không thay thế phân quyền, review thay đổi, quality gate hay kiểm tra rollback.

### Post kết thúc có chủ đích

`post` chạy theo trạng thái sau các stage. `always` hợp cho dọn file tạm hoặc ghi thông tin chẩn đoán. `failure` và `success` hợp cho tín hiệu khác nhau. Chỉ gọi các kênh thông báo hoặc step plugin mà instance đã cài.

```groovy
post {
  always {
    echo "Build #${env.BUILD_NUMBER} đã kết thúc với trạng thái ${currentBuild.currentResult}."
  }
  failure {
    echo 'Đọc stage lỗi đầu tiên và console log trước khi chạy lại.'
  }
  success {
    echo 'Các kiểm tra đã đạt; artifact có thể đi tới gate tiếp theo.'
  }
}
```

Không dựa vào `post { success }` để suy ra một deploy đã an toàn. Nó chỉ nói Pipeline có trạng thái thành công theo các step và điều kiện đang có; chất lượng của gate vẫn do test, kiểm soát thay đổi và quan sát thực tế quyết định.

## Jenkinsfile mẫu có thể chạy

Mẫu sau có cú pháp Declarative hoàn chỉnh. Nó giả định job dùng **Pipeline script from SCM**, repository có `Jenkinsfile`, có agent Unix online mang label `linux`, và controller đã cài plugin **Timestamper** cho `timestamps()`. `checkout scm` vì vậy lấy đúng revision mà job đã cấu hình. Các stage có chữ “mô phỏng” chỉ tạo rồi kiểm tra file trong workspace; chúng không gọi API, không dùng credential và không triển khai ứng dụng. Nếu controller không có Timestamper, xóa dòng `timestamps()` trước khi chạy mẫu.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timeout(time: 30, unit: 'MINUTES')
    timestamps()
  }

  parameters {
    choice(name: 'DEPLOY_TARGET', choices: ['staging', 'production'], description: 'Môi trường được mô phỏng')
    booleanParam(name: 'RUN_EXTENDED_SANDBOX_CHECK', defaultValue: false, description: 'Chạy kiểm tra sandbox mở rộng')
  }

  environment {
    APP_NAME = 'catalog-api'
  }

  stages {
    stage('Kiểm tra') {
      agent { label 'linux' }
      steps {
        checkout scm
        sh '''
          set -eu
          test -f Jenkinsfile
          mkdir -p dist
          printf 'app=%s build=%s\n' "$APP_NAME" "$BUILD_NUMBER" > dist/build.txt
          test -s dist/build.txt
        '''
      }
    }

    stage('Kiểm tra sandbox mở rộng') {
      when {
        beforeAgent true
        expression { params.RUN_EXTENDED_SANDBOX_CHECK }
      }
      agent { label 'linux' }
      steps {
        sh '''
          set -eu
          mkdir -p dist
          printf 'sandbox-check=extended app=%s build=%s\n' "$APP_NAME" "$BUILD_NUMBER" > dist/extended-sandbox-check.txt
          grep -Fx "sandbox-check=extended app=$APP_NAME build=$BUILD_NUMBER" dist/extended-sandbox-check.txt
        '''
      }
    }

    stage('Mô phỏng phát hành staging') {
      when {
        beforeAgent true
        expression { params.DEPLOY_TARGET == 'staging' }
      }
      agent { label 'linux' }
      steps {
        sh '''
          set -eu
          mkdir -p dist
          printf 'target=staging build=%s\n' "$BUILD_NUMBER" > dist/simulated-release.txt
          grep -Fx "target=staging build=$BUILD_NUMBER" dist/simulated-release.txt
        '''
      }
    }

    stage('Duyệt mô phỏng production') {
      when {
        beforeInput true
        expression { params.DEPLOY_TARGET == 'production' }
      }
      input {
        message 'Xác nhận chạy mô phỏng phát hành production?'
        ok 'Chạy mô phỏng'
        submitter 'release-managers'
      }
      agent { label 'linux' }
      steps {
        sh '''
          set -eu
          mkdir -p dist
          printf 'target=production approval=accepted build=%s\n' "$BUILD_NUMBER" > dist/simulated-release.txt
          grep -Fx "target=production approval=accepted build=$BUILD_NUMBER" dist/simulated-release.txt
        '''
      }
    }
  }

  post {
    always {
      echo "Build #${env.BUILD_NUMBER}: ${currentBuild.currentResult}"
    }
    failure {
      echo 'Xem console log và stage thất bại trước khi thử lại.'
    }
  }
}
```

### Đọc từng phần của mẫu

- `agent none` bảo đảm Pipeline không giữ một executor xuyên suốt thời gian chờ hoặc khi stage bị bỏ qua. Mỗi stage thực thi đều khai báo `agent { label 'linux' }`.
- `skipDefaultCheckout(true)` tắt checkout tự động của Declarative. Vì thế `checkout scm` trong stage `Kiểm tra` là một hành động rõ ràng, không bị checkout hai lần.
- `timeout` giới hạn toàn bộ build. `timestamps()` thêm thời điểm vào log và cần plugin Timestamper; nếu plugin không có, bỏ dòng đó thay vì giả định Jenkins core hỗ trợ. Có thể thêm `disableConcurrentBuilds()` khi job ghi vào tài nguyên dùng chung, nhưng không dùng nó để che lỗi cạnh tranh cần được sửa trong ứng dụng.
- `parameters` mô tả một kiểm tra sandbox và một lựa chọn mô phỏng có kiểm soát. `when` đọc các lựa chọn đó trước khi cấp agent, nên stage bị bỏ qua không tiêu tốn executor.
- Stage staging chỉ ghi rồi kiểm tra `dist/simulated-release.txt`. Với production, Jenkins dừng để duyệt **mô phỏng** trước khi cấp stage agent; sau approval, nó cũng chỉ kiểm tra file đó. `submitter` phải khớp user hoặc group đã được cấu hình thực tế trong Jenkins của bạn.
- `post { always }` chạy dù Pipeline thành công, thất bại hay bị hủy sau khi đã vào phần thực thi. Nó là vị trí hợp lý cho thông tin kết thúc ngắn gọn, không phải nơi in secret.

<Callout type="idea" title="Kiểm tra trước khi lưu Jenkinsfile">
  Trong Jenkins, mở **Pipeline Syntax** để tra step và tạo snippet theo plugin đã cài. Với Declarative Pipeline, dùng **Declarative Directive Generator** hoặc validator/linter của Jenkins để bắt lỗi cấu trúc trước khi chờ một build thật. Đây là nguồn sự thật của chính Jenkins instance, đặc biệt khi plugin của đội khác với ví dụ trên web.
</Callout>

## Chọn agent và bảo vệ executor workspace

Label nên mô tả năng lực thực tế, ví dụ `linux`, `node20` hoặc `trusted-deploy`, thay vì một tên agent ngẫu nhiên. Một biểu thức label như `linux && node20` chỉ được cấp khi một node có **cả hai** label và còn executor. Nếu không, build sẽ chờ trong queue; tăng số executor không tự tạo thêm CPU, RAM, disk hay toolchain.

Stage agent tạo một lần cấp executor/workspace riêng. Đây là lợi ích khi `Build` cần môi trường Node.js còn `Deploy` cần môi trường được tin cậy khác, nhưng có hai hệ quả cần thiết kế:

- workspace là dữ liệu local của agent, không phải kho chuyển giao giữa các stage hay giữa các build;
- agent có thể tái sử dụng workspace cũ, vì vậy phải dọn dữ liệu sinh ra và không để secret trong workspace;
- stage giữ agent trong khi chạy lệnh; một approval đặt sai vị trí có thể chiếm executor trong nhiều giờ;
- build từ source hoặc pull request không tin cậy không nên chạy trên controller hay agent có credential production.

<Callout type="warn" title="Executor và workspace là tài nguyên dùng chung">
  `agent any` có thể chọn built-in node trong lab nếu nó có executor. Trong production, đặt built-in node của controller là `0` executor và dùng agent tách biệt. Theo dõi queue theo label trước khi đổi capacity; một build chờ có thể chỉ thiếu đúng loại agent, không phải thiếu executor nói chung.
</Callout>

Để hiểu controller, queue, node, executor và workspace sâu hơn trước khi thêm agent, xem [Kiến trúc Jenkins](/docs/getting-started/architecture).

## Secret và credential an toàn

Không hard-code token, mật khẩu, private key hoặc URL có token trong `environment`, parameter, Jenkinsfile, shell command hay log. Thay vào đó, tạo credential trong Jenkins với phạm vi và quyền tối thiểu. `credentials('credential-id')` trong `environment` là helper của Declarative; `withCredentials` là step thường được cung cấp bởi plugin Credentials Binding. Cả hai phụ thuộc credential đã tồn tại và quyền job cho phép dùng nó.

Ví dụ dưới chỉ cấp credential cho một block kiểm tra scope ngắn nhất có thể. `DEPLOY_TOKEN` là tên biến môi trường tạm, còn `deploy-token` là ID credential đã tạo trong Jenkins. Nó không được dùng trong lab hay để chạy deploy; chỉ xác nhận rằng binding có mặt mà không in giá trị.

```groovy
stage('Kiểm tra scope credential') {
  agent { label 'trusted-deploy' }
  steps {
    withCredentials([string(credentialsId: 'deploy-token', variable: 'DEPLOY_TOKEN')]) {
      sh '''
        set +x
        test -n "$DEPLOY_TOKEN"
        printf '%s\n' 'Credential was bound only in this block.'
      '''
    }
  }
}
```

Masking của Jenkins hữu ích nhưng không phải ranh giới bảo mật tuyệt đối. Không `echo` biến secret, không bật `set -x`, không truyền secret qua command line nếu công cụ có file descriptor/stdin hay cơ chế an toàn hơn, và không lưu nó thành artifact. Credential nên bị giới hạn theo folder/job/môi trường; agent deploy cũng cần được tách khỏi workload không tin cậy.

## Giới hạn của Declarative và script

Declarative cố ý giới hạn hình dạng Jenkinsfile: directive phải ở vị trí hợp lệ, stage cần cấu trúc rõ ràng, và không phải mọi Groovy control flow đều đặt trực tiếp vào `steps` được. Hạn chế này đổi lấy validator tốt hơn, giao diện stage rõ hơn và review dễ hơn. Hãy ưu tiên `when`, `matrix`, `parallel`, parameter và Shared Library trước khi viết logic Groovy tùy ý.

Khi cần tính toán động mà Declarative không biểu đạt tốt — ví dụ duyệt một cấu trúc dữ liệu phức tạp để tạo lệnh, gọi helper Groovy nhỏ, hoặc đọc kết quả rồi chọn nhánh — đặt phần Groovy nhỏ đó trong `script {}`:

```groovy
steps {
  script {
    def target = params.DEPLOY_TARGET == 'production' ? 'prod' : 'staging'
    echo "Target đã chọn: ${target}"
  }
}
```

`script {}` là lối thoát có kiểm soát, không phải nơi dồn cả Pipeline. Code trong đó khó được Declarative validator mô hình hóa hơn, có thể cần Script Security approval, và làm luồng stage khó đọc nếu quá dài. Tách logic lặp lại hoặc nhạy cảm thành Shared Library đã review thay vì sao chép Groovy qua nhiều Jenkinsfile.

So với Scripted Pipeline, Declarative hy sinh một phần tự do Groovy để lấy cấu trúc, tính nhất quán và khả năng quan sát tốt hơn. Scripted phù hợp khi bản chất workflow thật sự rất động và đội có năng lực review/vận hành Groovy; nó không phải lựa chọn mặc định chỉ vì Jenkinsfile đầu tiên gặp một nhánh điều kiện.

## Lab từng bước

Lab này chạy được mà không cần application thật. Bạn cần Jenkins có Pipeline: Declarative, plugin **Timestamper** cho dòng `timestamps()`, một agent Unix online mang label `linux`, và quyền tạo Pipeline job. Nếu không cài Timestamper, xóa dòng `timestamps()` trong mẫu trước khi validate; các kết quả còn lại không đổi. Nếu chưa có Jenkins local, hãy bắt đầu bằng [Chạy Jenkins với Docker](/docs/installation/docker). Trước đó, kiểm tra [Yêu cầu hệ thống](/docs/getting-started/requirements) để biết agent cần Java, disk và network phù hợp.

1. **Tạo repository.** Tạo repository Git rỗng, tạo file tên chính xác `Jenkinsfile`, rồi dán mẫu ở phần trên. Commit và push file. Mẫu dùng `checkout scm`, nên job phải lấy Jenkinsfile từ SCM thay vì dán script trực tiếp trong UI.
2. **Tạo Pipeline job.** Trong Jenkins chọn **New Item** → **Pipeline**. Ở phần Pipeline, chọn **Pipeline script from SCM**, chọn Git, nhập repository URL, chọn credential đọc repository nếu nó private, rồi đặt branch đúng với branch đã push.
3. **Xác minh agent.** Vào **Manage Jenkins** → **Nodes** và xác nhận có node `Online`, mang label `linux`, có shell Unix và executor trống. Đừng đổi mẫu thành `agent any` chỉ để bỏ qua sự thiếu hụt hạ tầng; hãy sửa label hoặc cấu hình agent theo nhu cầu thật.
4. **Kiểm tra cú pháp.** Mở **Pipeline Syntax** và **Declarative Directive Generator** trong Jenkins để đối chiếu directive/step. Chạy validator nếu Jenkins của bạn cung cấp. Sửa lỗi cấu trúc trước khi chọn **Build Now**.
5. **Chạy mô phỏng staging.** Chọn **Build with Parameters**, để `DEPLOY_TARGET=staging` và bỏ chọn `RUN_EXTENDED_SANDBOX_CHECK`. Build cần hoàn thành `Kiểm tra`, bỏ qua `Kiểm tra sandbox mở rộng`, chạy `Mô phỏng phát hành staging` và bỏ qua approval production. Console log phải in dòng `target=staging build=<số-build>` từ lệnh `grep`; đó là kết quả kiểm chứng của mô phỏng.
6. **Quan sát kiểm tra sandbox.** Chạy lại với `RUN_EXTENDED_SANDBOX_CHECK=true`. Stage `Kiểm tra sandbox mở rộng` sẽ xuất hiện, tạo `dist/extended-sandbox-check.txt` và in dòng `sandbox-check=extended app=catalog-api build=<số-build>`. Nó chỉ xác minh file local do chính stage tạo, không phải bộ test của ứng dụng. Đặt lại `false` để xác nhận `when` thật sự bỏ qua stage thay vì chỉ đổi nội dung lệnh.
7. **Thử approval mô phỏng.** Chọn `DEPLOY_TARGET=production`. Build phải dừng ở `Duyệt mô phỏng production`. Duyệt bằng tài khoản thuộc `release-managers`, hoặc hủy build nếu lab chưa có group đó. Nếu group chưa tồn tại, thay `submitter` bằng user/group lab có quyền trước khi chạy. Khi duyệt, console phải in `target=production approval=accepted build=<số-build>`; không có lệnh nào liên hệ production.
8. **Tạo lỗi có chủ đích và sửa.** Đổi `test -s dist/build.txt` thành `test -s dist/missing.txt`, commit/push rồi chạy lại. Build phải thất bại tại stage `Kiểm tra` và vẫn in `post { always }`. Khôi phục lệnh đúng, commit/push và chạy lần cuối để xác nhận build xanh.

Kết quả lab cho thấy một Jenkinsfile có thể vừa tường minh về agent, vừa ngăn stage không liên quan chiếm executor, vừa có điểm approval có giới hạn. Các stage “mô phỏng” chỉ tạo và xác minh file local trong workspace, nên không deploy, không gọi API và không dùng secret. Khi áp dụng vào dự án, thiết kế riêng bước triển khai đã kiểm thử, quyền tối thiểu và rollback thay vì thay thẳng mô phỏng bằng một lệnh production.

## Lỗi cú pháp và hành vi ngầm định

<Callout type="error" title="Cú pháp đúng không đồng nghĩa runtime đúng">
  `agent { label 'linux' }` có thể hợp lệ nhưng build vẫn nằm queue nếu không có node online khớp label. `sh` có thể hợp lệ nhưng thất bại trên Windows hoặc khi tool chưa cài. `checkout scm` phụ thuộc cấu hình SCM của job. Hãy phân biệt lỗi validator, lỗi cấp agent và lỗi command trong console log.
</Callout>

<Callout type="warn" title="Checkout và condition có thứ tự ngầm định">
  Declarative thường tự checkout source khi stage có agent. Nếu bạn gọi `checkout scm` rõ ràng mà không đặt `skipDefaultCheckout(true)`, repository có thể bị checkout hai lần. Ngoài ra, `when` mặc định được đánh giá sau khi stage agent được cấp; dùng `beforeAgent true` khi điều kiện không cần workspace để tránh giữ executor vô ích. `input` của stage được xử lý trước stage agent; kết hợp `beforeInput true` để condition không đạt thì không hỏi approval.
</Callout>

Các lỗi thường gặp khác và cách phòng tránh:

- đặt `steps` trực tiếp trong `pipeline {}` thay vì trong `stage`; hãy giữ hierarchy `pipeline → stages → stage → steps`;
- viết một directive không thuộc phạm vi của nó, chẳng hạn `parameters` bên trong `steps`; tra Pipeline Syntax/Directive Generator thay vì đoán;
- dùng một plugin step chưa được cài hoặc đã đổi phiên bản; kiểm tra plugin, quyền và snippet trên controller;
- cho parameter nhập giá trị deploy tùy ý; dùng choice/allowlist và kiểm soát quyền ở Jenkins lẫn hạ tầng đích;
- dùng retry cho deploy không idempotent hoặc để approval không timeout; thiết kế trạng thái, deduplication và deadline trước.

## Checklist Jenkinsfile dễ kiểm soát

- [ ] Jenkinsfile có một `pipeline {}` rõ ràng và không có H1/code ngoài phạm vi cần thiết.
- [ ] Mỗi stage có tên theo kết quả có thể quan sát, không gộp cả CI/CD vào một stage mơ hồ.
- [ ] Agent/label diễn đạt đúng toolchain và trust boundary; controller không chạy workload production.
- [ ] `agent none` hoặc stage agent được dùng khi các stage có nhu cầu môi trường/thời gian khác nhau.
- [ ] Timeout, retry và concurrency được chọn theo rủi ro side effect, không phải chỉ để build “xanh”.
- [ ] Parameter có tập giá trị giới hạn; `when` khiến policy branch/môi trường đọc được ngay trong Jenkinsfile.
- [ ] Approval có người duyệt, timeout và tiêu chí rõ ràng; nó không thay thế phân quyền hay test.
- [ ] Secret ở Jenkins Credentials, chỉ xuất hiện trong scope nhỏ nhất và không bị in/lưu trong log, artifact hay workspace.
- [ ] `post` xử lý tín hiệu/dọn dẹp phù hợp cho `always`, `failure` hoặc `success`.
- [ ] Nếu dùng `timestamps()`, plugin Timestamper đã được cài và dòng này được kiểm tra trên controller; nếu không, directive đã được bỏ khỏi Jenkinsfile.
- [ ] Mọi step plugin-dependent đã được kiểm tra trên Jenkins instance bằng Pipeline Syntax và qua một build lab.

## Nguồn chính thức và đọc tiếp

- [Jenkins Pipeline](https://www.jenkins.io/doc/book/pipeline/) — khái niệm Jenkinsfile và mô hình Pipeline.
- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — nguồn tra cứu chính thức cho Declarative directives, `agent`, `when`, `input`, `options` và `post`.
- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/) — pattern Jenkinsfile, environment, parameters và credentials.
- [Pipeline Syntax — Global Variable Reference](https://www.jenkins.io/doc/book/pipeline/getting-started/#global-variable-reference) — biến, step và global variables đang có trên Jenkins instance.
- [Using Jenkins agents](https://www.jenkins.io/doc/book/using/using-agents/) — chọn agent, executor và workspace.
- [Timestamper plugin](https://plugins.jenkins.io/timestamper/) — dependency cung cấp `timestamps()` trong mẫu.

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn mô hình Jenkins trước khi mở rộng Pipeline." />
  <Card title="Nền tảng CI/CD" href="/docs/getting-started/ci-cd-fundamentals" description="Đặt stage và approval trong vòng phản hồi CI/CD." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu controller, agent, queue và executor." />
  <Card title="Yêu cầu hệ thống" href="/docs/getting-started/requirements" description="Chuẩn bị runtime và tài nguyên cho controller/agent." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Tạo Jenkins local để thực hành Pipeline." />
</Cards>
