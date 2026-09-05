---
title: "Build Parameters"
description: "Khai báo và sử dụng tham số khi chạy job."
---

Build parameter là input gắn với **một lần chạy** của job. Nó giúp cùng một Jenkinsfile chạy các biến thể đã được dự kiến, chẳng hạn kiểm tra `sandbox` hoặc `staging`. Parameter không phải là cơ chế cấp quyền, không phải nơi lưu secret và không làm input từ người dùng trở nên đáng tin cậy.

<Callout type="warn" title="Giới hạn tin cậy">
  Người có quyền chạy job, API caller, webhook và source của Pipeline có thể thuộc các trust boundary khác nhau. Luôn kiểm tra parameter trong Jenkinsfile trước khi nó quyết định command, path, URL, agent, credential hoặc thao tác có side effect. Dùng Choice và allowlist để thu hẹp đầu vào; vẫn validate lại ở runtime.
</Callout>

## Mục lục

- [Mục tiêu](#mục-tiêu)
- [Mô hình parameter trong Jenkins](#mô-hình-parameter-trong-jenkins)
  - [Khai báo, chọn giá trị và phạm vi](#khai-báo-chọn-giá-trị-và-phạm-vi)
  - [`params` khác environment như thế nào?](#params-khác-environment-như-thế-nào)
- [Các loại parameter](#các-loại-parameter)
  - [String và Text parameter](#string-và-text-parameter)
  - [Choice và Boolean parameter](#choice-và-boolean-parameter)
  - [File và Password parameter](#file-và-password-parameter)
- [Validation: khả năng và giới hạn](#validation-khả-năng-và-giới-hạn)
  - [Validate sớm, allowlist và map giá trị](#validate-sớm-allowlist-và-map-giá-trị)
  - [Những gì UI không bảo đảm](#những-gì-ui-không-bảo-đảm)
- [Dùng parameter an toàn trong Pipeline](#dùng-parameter-an-toàn-trong-pipeline)
  - [Declarative Pipeline](#declarative-pipeline)
  - [Scripted Pipeline](#scripted-pipeline)
  - [File upload và password trong luồng thật](#file-upload-và-password-trong-luồng-thật)
- [Lab sandbox: quan sát parameter không có side effect](#lab-sandbox-quan-sát-parameter-không-có-side-effect)
  - [Chuẩn bị và Jenkinsfile](#chuẩn-bị-và-jenkinsfile)
  - [Các bước chạy và kết quả mong đợi](#các-bước-chạy-và-kết-quả-mong-đợi)
- [Troubleshooting](#troubleshooting)
- [Checklist xác minh](#checklist-xác-minh)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mục tiêu

Sau bài này, bạn có thể:

- chọn đúng loại parameter cho dữ liệu ngắn, ghi chú nhiều dòng, tập lựa chọn hữu hạn, cờ bật/tắt, file upload và dữ liệu nhạy cảm;
- đọc input qua `params.NAME`, hiểu khi nào process shell thấy environment variable tương ứng;
- validate và map input sang giá trị đã review trước khi chạy command;
- không đưa password, token hoặc file nhạy cảm vào parameter, log, artifact hay URL; và
- tạo một job lab chỉ tạo output vô hại để kiểm tra cấu hình trước khi áp dụng vào job có tác động thật.

## Mô hình parameter trong Jenkins

### Khai báo, chọn giá trị và phạm vi

Parameter là **job property**: Jenkinsfile hoặc UI định nghĩa tên, loại, default và mô tả; người chạy chọn giá trị khi dùng **Build with Parameters**. Giá trị được chụp vào build hiện tại. Build đang chạy không đổi theo lần bấm Build with Parameters kế tiếp.

Trong Declarative Pipeline, khai báo bằng directive `parameters`. Trong Scripted Pipeline, có thể dùng step `properties([parameters(...)])`. Nếu Scripted Jenkinsfile tự tạo property lần đầu, form parameter thường chỉ xuất hiện ở build kế tiếp; chạy một build khởi tạo hoặc cấu hình property trước, rồi bắt đầu build có input.

Tên parameter là contract giữa UI, Jenkinsfile, caller API và script. Dùng tên viết hoa có ý nghĩa, ví dụ `TARGET_ENV`, `RUN_CHECKS`, `RELEASE_NOTE`. Tránh trùng với `PATH`, `HOME`, `BUILD_NUMBER`, credential ID hoặc biến mà plugin/tool đã dùng. Đổi tên cần được xem là thay đổi API: caller tự động có thể vẫn gửi tên cũ.

### `params` khác environment như thế nào?

Trong Pipeline, đọc parameter bằng `params.NAME`. Jenkins cũng export parameter tiêu chuẩn thành environment variable khi build bắt đầu, nên Unix shell thường đọc `TARGET_ENV` qua `$TARGET_ENV`, Windows Command Prompt qua `%TARGET_ENV%`, và PowerShell qua `$env:TARGET_ENV`.

| Bề mặt | Ví dụ | Ý nghĩa thực hành |
| --- | --- | --- |
| `params.TARGET_ENV` | `params.TARGET_ENV == 'sandbox'` | Dùng trong Groovy và `when`. Boolean giữ ngữ nghĩa boolean. |
| `env.TARGET_ENV` | `env.TARGET_ENV` | Biểu diễn chuỗi của environment hiệu lực trong Pipeline. Có thể bị `environment`, `withEnv` hoặc plugin overlay nếu trùng tên. |
| Shell process | `"$TARGET_ENV"` | Process nhận chuỗi environment. Quote expansion; không ghép input thành source code shell. |

Không dùng `if (env.RUN_CHECKS)` để kiểm tra cờ: chuỗi không rỗng như `"false"` vẫn có thể được Groovy coi là true. Dùng `if (params.RUN_CHECKS)` cho Boolean Parameter. Nếu bắt buộc đọc environment, so sánh tường minh với chuỗi `"true"` sau khi chuẩn hóa.

<Callout type="info" title="Tránh collision">
  `params.NAME` biểu diễn input ban đầu, còn `env.NAME` và shell có thể thấy một overlay scope gần hơn. Không dùng cùng tên cho parameter và `environment {}`. Nếu không thể tránh, kiểm tra cả `params`, `env` và một marker vô hại trong build sandbox trên chính controller của bạn.
</Callout>

## Các loại parameter

### String và Text parameter

**String Parameter** nhận một dòng text. Dùng nó cho dữ liệu nhỏ, không nhạy cảm và có format rõ, chẳng hạn `RELEASE_LABEL=demo-17`. Declarative hỗ trợ `trim: true` để loại space đầu/cuối trước khi Pipeline nhận giá trị. `trim` không kiểm tra ký tự hợp lệ, độ dài hoặc ý nghĩa của chuỗi.

**Text Parameter** nhận nhiều dòng. Nó phù hợp với ghi chú phát hành hoặc lý do chạy lại build mà Pipeline chỉ lưu như metadata đã được kiểm soát. Text không phù hợp để nhập shell script, YAML cấu hình đặc quyền, URL tùy ý, JSON có secret hay danh sách lệnh. Một dòng mới có thể đổi cấu trúc log, request hoặc command nếu giá trị bị nội suy không đúng chỗ.

```groovy
parameters {
  string(
    name: 'RELEASE_LABEL',
    defaultValue: 'demo-01',
    trim: true,
    description: 'Nhãn sandbox: chữ thường, số và dấu gạch ngang.'
  )
  text(
    name: 'CHANGE_NOTE',
    defaultValue: 'Kiểm tra Pipeline sandbox.',
    description: 'Ghi chú nội bộ; không nhập secret hay lệnh.'
  )
}
```

Trong ví dụ, `RELEASE_LABEL` vẫn phải qua regex/giới hạn độ dài trước khi dùng. `CHANGE_NOTE` không được đưa vào shell hay in toàn bộ Console Output: nó có thể chứa dữ liệu không phù hợp với log, dù không được thiết kế để chứa secret.

### Choice và Boolean parameter

**Choice Parameter** hiển thị một tập giá trị định trước. Đây là lựa chọn tốt cho môi trường, chế độ kiểm tra hay profile đã review, ví dụ `sandbox` và `staging`. Choice giảm bề mặt input so với String, nhưng Pipeline vẫn nên kiểm tra allowlist vì cấu hình, plugin, API caller và Jenkinsfile có thể thay đổi.

**Boolean Parameter** là cờ `true`/`false`. Dùng cho một quyết định có ý nghĩa rõ, ví dụ `RUN_CHECKS`. Không dùng nó như cờ cho phép deploy production, bỏ qua review hoặc chọn credential đặc quyền; authorization phải đến từ quyền Jenkins, policy và trust của source, không đến từ checkbox.

```groovy
parameters {
  choice(
    name: 'TARGET_ENV',
    choices: ['sandbox', 'staging'],
    description: 'Chỉ chọn mục tiêu mô phỏng đã được phê duyệt.'
  )
  booleanParam(
    name: 'RUN_CHECKS',
    defaultValue: true,
    description: 'Chạy kiểm tra nội bộ không có side effect.'
  )
}
```

Khi một choice cuối cùng phải thành URL, namespace, account hay command option, hãy map nó sang hằng số đã review. Không dùng trực tiếp giá trị choice để tạo hostname, đường dẫn hoặc credential ID.

### File và Password parameter

**File Parameter** cho phép người chạy upload một file cùng build. Nó chỉ hợp với file input nhỏ, không nhạy cảm, có format đã biết và được kiểm tra nội dung. File upload là dữ liệu không tin cậy: tên file, extension, MIME type và nội dung đều không chứng minh file an toàn. Không upload private key, kubeconfig, token, dữ liệu khách hàng hay bất kỳ secret nào.

Nơi Jenkins đặt file và cách Pipeline truy cập nó phụ thuộc loại parameter/plugin và phiên bản. Pipeline Syntax trên controller là nguồn xác nhận cho parameter `file`; nếu cần chuyển file vào workspace một cách rõ ràng trong Pipeline, File Parameters plugin cung cấp `withFileParameter`. Đừng giả định tên file từ UI là path an toàn hoặc file luôn tồn tại trên mọi agent/stage.

**Password Parameter** che ký tự trên form, nhưng không thay thế Jenkins Credentials. Nó không mang scope, rotation, audit và quyền tối thiểu như credential. Giá trị người dùng nhập còn có thể đi qua metadata build, log/plugin, process environment hoặc persistence tùy implementation và quyền truy cập. Không đặt default password, không truyền password qua API query, không echo nó, và không dùng nó cho token phát hành.

<Callout type="error" title="Dùng Credentials cho secret">
  Dùng Jenkins Credentials với credential ID và binding ngắn quanh step cần capability. Password Parameter chỉ nên được xem là cơ chế legacy/ngoại lệ đã được security review; đa số Pipeline mới không nên khai báo nó. Masking console không ngăn process con, artifact, network hoặc code không tin cậy làm lộ secret.
</Callout>

| Loại | Dùng khi | Không dùng khi |
| --- | --- | --- |
| String | Nhãn ngắn có format được validate | Command, path, URL hay credential ID tự do |
| Text | Ghi chú nhiều dòng không nhạy cảm | Script, cấu hình đặc quyền hoặc nội dung đưa vào command |
| Choice | Tập giá trị hữu hạn đã review | Thay authorization hoặc bỏ qua validation runtime |
| Boolean | Bật/tắt hành vi vô hại, rõ ràng | Cấp quyền deploy, chọn secret hoặc bỏ policy |
| File | Input nhỏ, không secret, được kiểm type/size/content | Key, token, file khách hàng, archive không kiểm soát |
| Password | Ngoại lệ legacy đã review | Secret mới; thay bằng Jenkins Credentials |

## Validation: khả năng và giới hạn

### Validate sớm, allowlist và map giá trị

Validation đáng tin cậy nằm ngay đầu Pipeline, trước checkout không tin cậy, shell, upload, deploy hoặc binding credential. Kiểm tra presence, kiểu/độ dài, format và tập giá trị hợp lệ. Sau đó **map** input sang hằng số được review; mapping tách dữ liệu do người dùng chọn khỏi giá trị dùng bởi công cụ.

```groovy
script {
  def label = (params.RELEASE_LABEL ?: '').trim()
  if (!(label ==~ /[a-z0-9][a-z0-9-]{0,30}/)) {
    error('RELEASE_LABEL must be 1-31 lowercase letters, digits, or hyphens')
  }

  def targets = [
    sandbox: [mode: 'sandbox', reportDir: 'reports/sandbox'],
    staging: [mode: 'preflight', reportDir: 'reports/staging']
  ]
  def selected = targets[params.TARGET_ENV]
  if (selected == null) {
    error('TARGET_ENV is not allowlisted')
  }

  env.SAFE_MODE = selected.mode
  env.SAFE_REPORT_DIR = selected.reportDir
}
```

Mẫu chỉ đặt environment từ map nội bộ. Nó không tạo path từ `RELEASE_LABEL`, không biến choice thành URL và không cho parameter chọn agent, SCM ref, credential ID hay command. Khi có side effect thật, validation input vẫn chỉ là một lớp: thêm approval, quyền Jenkins, identity có least privilege, target policy và kiểm tra trạng thái đích.

Với file, kiểm tra file tồn tại, kích thước tối đa do đội quy định và magic/header hoặc parser chặt chẽ của format trước khi dùng. Không giải nén archive không tin cậy vào workspace dùng chung. Không gọi parser có đặc quyền trên agent có secret. Giới hạn upload, disk quota và reverse-proxy/controller request limit là kiểm soát vận hành riêng; core parameter không tự cung cấp một policy nội dung đầy đủ.

### Những gì UI không bảo đảm

- `trim: true` chỉ loại space đầu/cuối của String; không sanitize shell, URL hay path.
- Choice làm form dễ chọn đúng hơn, nhưng không thay validation/mapping ở Jenkinsfile.
- `description` là hướng dẫn cho người dùng, không phải policy thực thi.
- Regex validation, active/dynamic choices, required field nâng cao và file-type checking thường cần code Pipeline hoặc plugin. Đây không phải behavior portable của Jenkins core; đánh giá plugin, quyền chạy Groovy, tương thích LTS và bề mặt security trước khi cài.
- Jenkins không thể biết một chuỗi là secret chỉ vì field có tên `TOKEN`. Không đưa secret vào String, Text, Choice, File hoặc Password Parameter.
- Parameter không kiểm tra authorization của người bấm build. Một giá trị `production` không được phép chọn credential production hoặc bỏ approval.

Nói ngắn gọn: UI giúp thu thập input; Jenkinsfile và policy phía đích mới quyết định input đó có được sử dụng hay không.

## Dùng parameter an toàn trong Pipeline

### Declarative Pipeline

Mẫu sau khai báo String, Text, Choice và Boolean, sau đó chỉ chuyển giá trị đã validate/map vào shell. Nó không checkout source, gọi network, dùng credential, upload file hoặc deploy.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timeout(time: 3, unit: 'MINUTES')
  }

  parameters {
    string(name: 'RELEASE_LABEL', defaultValue: 'demo-01', trim: true,
      description: 'Nhãn sandbox, không phải command hoặc path.')
    text(name: 'CHANGE_NOTE', defaultValue: 'Kiểm tra sandbox.',
      description: 'Ghi chú nội bộ; không nhập secret.')
    choice(name: 'TARGET_ENV', choices: ['sandbox', 'staging'],
      description: 'Chỉ đổi chế độ mô phỏng.')
    booleanParam(name: 'RUN_CHECKS', defaultValue: true,
      description: 'Chỉ điều khiển kiểm tra vô hại.')
  }

  stages {
    stage('Validate') {
      agent { label 'sandbox-linux' }
      steps {
        script {
          def label = (params.RELEASE_LABEL ?: '').trim()
          if (!(label ==~ /[a-z0-9][a-z0-9-]{0,30}/)) {
            error('RELEASE_LABEL is invalid')
          }
          def modes = [sandbox: 'sandbox', staging: 'preflight']
          def mode = modes[params.TARGET_ENV]
          if (mode == null) {
            error('TARGET_ENV is not allowlisted')
          }
          env.SAFE_MODE = mode
          env.SAFE_LABEL = label
        }
      }
    }

    stage('Run harmless check') {
      agent { label 'sandbox-linux' }
      when { expression { params.RUN_CHECKS } }
      steps {
        sh '''#!/bin/sh
          set -eu
          printf 'mode=%s label=%s\n' "$SAFE_MODE" "$SAFE_LABEL"
        '''
      }
    }
  }

  post {
    always {
      echo 'Finished without using CHANGE_NOTE as code or logging its contents.'
    }
  }
}
```

`when { expression { params.RUN_CHECKS } }` dùng boolean từ `params`, không dùng string environment. `CHANGE_NOTE` được khai báo để minh họa Text nhưng cố ý không đi vào log hoặc shell. Shell dùng triple single quote để Groovy không nội suy; nó chỉ nhận hai environment do Pipeline tạo từ allowlist/regex.

### Scripted Pipeline

Trong Scripted Pipeline, `properties` cập nhật cấu hình job. Khai báo property ở đầu flow và biết rằng lần chạy đầu có thể chỉ tạo form; đừng coi build khởi tạo không có parameter là một production run. Ví dụ dưới đây chỉ xác nhận mode vô hại sau khi form đã tồn tại.

```groovy
properties([
  parameters([
    choice(name: 'TARGET_ENV', choices: ['sandbox', 'staging'],
      description: 'Mục tiêu mô phỏng đã review.'),
    booleanParam(name: 'RUN_CHECKS', defaultValue: true,
      description: 'Chạy kiểm tra sandbox.')
  ])
])

node('sandbox-linux') {
  stage('Validate') {
    def modes = [sandbox: 'sandbox', staging: 'preflight']
    def safeMode = modes[params.TARGET_ENV]
    if (safeMode == null) {
      error('TARGET_ENV is not allowlisted')
    }
    if (!params.RUN_CHECKS) {
      echo 'RUN_CHECKS=false; no shell step will run.'
      return
    }

    withEnv(["SAFE_MODE=${safeMode}"]) {
      sh '''#!/bin/sh
        set -eu
        printf 'scripted-mode=%s\n' "$SAFE_MODE"
      '''
    }
  }
}
```

`withEnv` chỉ nhận `safeMode` đã lấy từ map, không nhận input tự do. Khi Pipeline có nhiều stage/agent, bind environment hoặc file ở scope nhỏ nhất cần thiết; không giả định file upload hay workspace của agent này tự xuất hiện trên agent khác.

### File upload và password trong luồng thật

Nếu công việc thật cần file parameter, đặt parameter và mọi xử lý file ở một stage trên agent sandbox phù hợp. Xác nhận cách file đến workspace bằng **Pipeline Syntax** và test với một file fixture vô hại. Với File Parameters plugin, chỉ dùng `withFileParameter` sau khi plugin đã được quản trị viên phê duyệt; closure phải bao đúng step đọc file.

Một thao tác tối thiểu chỉ kiểm tra metadata không nhạy cảm có thể theo mẫu sau. `INPUT_FILE` là tên parameter, không phải tên file do người dùng kiểm soát. Giới hạn `1048576` là ví dụ policy 1 MiB; thay bằng giới hạn của đội và quota thực tế.

```groovy
withFileParameter('INPUT_FILE') {
  sh '''#!/bin/sh
    set -eu
    test -f "$INPUT_FILE"
    bytes=$(wc -c < "$INPUT_FILE")
    test "$bytes" -le 1048576
    printf 'uploaded-file-bytes=%s\n' "$bytes"
  '''
}
```

Đoạn này cần File Parameters plugin và không in tên/nội dung file. Nó chưa đủ để chấp nhận file: application vẫn phải parse theo schema, từ chối dữ liệu bất thường và dọn file theo policy. Không đặt `withFileParameter` quanh `archiveArtifacts`, `stash`, test report hay shell debug dump.

Với password/token, dùng credential ID cố định do job owner chọn và `withCredentials` quanh command cần nó. Không để parameter chọn `credentialsId`, không Groovy-interpolate secret và không in environment. Xem [Credentials trong Pipeline](/docs/pipelines/credentials) trước khi thêm credential vào một flow có source không tin cậy.

## Lab sandbox: quan sát parameter không có side effect

### Chuẩn bị và Jenkinsfile

Cần một Jenkins sandbox/LTS, quyền tạo Pipeline job, Pipeline: Declarative và một agent Unix tách biệt có label `sandbox-linux`. Không chạy trên built-in node/controller production. Lab không cần SCM, network, credential, file upload, artifact hoặc lệnh xóa.

1. Tạo Pipeline job tạm tên `build-parameters-lab`.
2. Dán Jenkinsfile ở phần [Declarative Pipeline](#declarative-pipeline).
3. Nếu pool lab không dùng label `sandbox-linux`, thay bằng label của **agent sandbox** đã được quản trị viên chỉ định. Không thay bằng controller để chạy cho nhanh.
4. Lưu job. Jenkins hiển thị **Build with Parameters** với `RELEASE_LABEL`, `CHANGE_NOTE`, `TARGET_ENV` và `RUN_CHECKS`.

### Các bước chạy và kết quả mong đợi

1. Chạy với default: `RELEASE_LABEL=demo-01`, `TARGET_ENV=sandbox`, `RUN_CHECKS=true`. Console phải chứa `mode=sandbox label=demo-01` và trạng thái `SUCCESS`.
2. Chạy lần hai với `RELEASE_LABEL=release-7`, `TARGET_ENV=staging`, `RUN_CHECKS=true`. Console phải chứa `mode=preflight label=release-7`. Không có deploy, network request hay artifact.
3. Chạy lần ba với `RUN_CHECKS=false`. Build phải `SUCCESS` và in `Finished without using CHANGE_NOTE as code or logging its contents.`; stage shell bị skip. Đây là bằng chứng boolean được dùng làm boolean trong `when`.
4. Chạy một lần với `RELEASE_LABEL=bad_label`. Stage **Validate** phải fail trước shell với `RELEASE_LABEL is invalid`. Không “sửa” validation bằng cách nới regex nếu format chưa được đội phê duyệt.
5. Để kiểm tra Text an toàn, nhập một ghi chú nhiều dòng vô hại. Xác nhận Console không chứa nội dung ghi chú. Không thử với secret thật.
6. Xóa hoặc disable job lab theo policy sau khi ghi nhận kết quả. Lab không tạo file cần cleanup ngoài build record của chính nó.

| Tình huống | Kết quả mong đợi | Điều được kiểm chứng |
| --- | --- | --- |
| Default sandbox | `mode=sandbox label=demo-01` | Choice được map thành hằng số; String hợp lệ qua regex. |
| Staging mô phỏng | `mode=preflight label=release-7` | Choice không trực tiếp thành URL hay command. |
| `RUN_CHECKS=false` | Stage shell `skipped`; build `SUCCESS` | Boolean đi qua `params` trong `when`. |
| Nhãn có `_` | Fail tại **Validate** | Pipeline fail sớm trước side effect. |
| Text nhiều dòng | Nội dung text không xuất hiện trong Console | Text không bị biến thành lệnh hoặc debug output. |

<Callout type="idea" title="Quan sát tối thiểu">
  Khi debug parameter, chỉ in marker đã được tạo từ allowlist, như `SAFE_MODE`. Không chạy `env`, `printenv`, `set`, không echo `params` map và không copy Console Output có dữ liệu người dùng vào ticket công khai.
</Callout>

## Troubleshooting

| Triệu chứng | Nguyên nhân có thể | Cách xử lý có bằng chứng |
| --- | --- | --- |
| Không thấy **Build with Parameters** | Job chưa có parameter property, Jenkinsfile chưa được run/reload, hoặc Scripted `properties` vừa chạy lần đầu | Xác nhận Jenkinsfile/revision và cấu hình job; chạy build khởi tạo sandbox, sau đó mở lại form. |
| `params.NAME` rỗng/null | Sai tên/case, parameter mới thêm nhưng build cũ, hoặc property chưa được áp dụng | Kiểm tra build mới và tên đúng; fail sớm với message không chứa input nhạy cảm. |
| Shell thấy giá trị khác `params` | Trùng tên với `environment`, `withEnv` hoặc plugin injection | Đổi tên để tránh collision; quan sát `params`, `env` và marker trên build sandbox. |
| `false` vẫn vào nhánh Groovy | Code dùng string `env.FLAG` thay vì boolean | Dùng `params.FLAG`; hoặc so sánh chuỗi đã chuẩn hóa với `"true"`. |
| File không tìm thấy trên agent/stage | Khác agent/workspace, behavior type/plugin hoặc scope binding không đúng | Kiểm tra Pipeline Syntax và plugin version; xử lý file trong một closure/stage sandbox, không hard-code path. |
| Upload file làm queue/disk chậm | File quá lớn hoặc controller/agent quota không đủ | Dừng thử nghiệm, đặt giới hạn ở proxy/controller/policy và chuyển dữ liệu lớn qua luồng artifact đã phê duyệt. |
| Password bị che trong log nhưng vẫn đáng lo | Masking có giới hạn; secret có thể đã vào process, file, artifact hoặc external service | Ngừng dùng parameter cho secret, đánh giá exposure và rotate/thu hồi theo incident process. |
| Parameter từ API khác UI expectation | Caller gửi sai/missing input hoặc contract đã đổi | Version/ghi rõ contract, validate runtime và trả lỗi trước mọi side effect. |

## Checklist xác minh

- [ ] Loại parameter được chọn theo dữ liệu: String/Text/Choice/Boolean/File/Password không bị dùng lẫn với credential.
- [ ] Mọi parameter có tên, description và default không nhạy cảm; không trùng biến built-in, tool, `environment` hay credential ID.
- [ ] String có `trim` khi phù hợp và được kiểm tra presence, độ dài, format; Text không đi vào command/log tùy tiện.
- [ ] Choice và Boolean chỉ điều khiển hành vi đã review; authorization, approval và credential scope không dựa vào parameter.
- [ ] Pipeline đọc điều kiện qua `params`; shell chỉ nhận environment đã validate/map và quote expansion.
- [ ] Không có `eval`, `sh -c` từ input, Groovy interpolation của dữ liệu nhạy cảm, URL/path/agent/SCM ref/credential ID do input tự do điều khiển.
- [ ] File upload là không nhạy cảm, giới hạn size, kiểm tra bằng parser/schema và được xử lý trên agent/trust tier phù hợp.
- [ ] Password/token/secret dùng Jenkins Credentials với binding hẹp; không nằm trong parameter, log, API query, artifact, workspace hay process argument.
- [ ] Plugin validation/file parameter, nếu cần, đã được kiểm tra compatibility, security advisory, permission và Snippet Generator trên controller mục tiêu.
- [ ] Lab chạy trên agent sandbox, cho kết quả expected, fail sớm với input sai và được disable/xóa theo policy sau khi dùng.

## Nguồn Jenkins chính thức

- [Pipeline Syntax — Parameters](https://www.jenkins.io/doc/book/pipeline/syntax/#parameters) — các loại parameter Declarative, `params` và export environment khi build bắt đầu.
- [Using a Jenkinsfile — Handling parameters](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#handling-parameters) — khai báo và sử dụng parameter trong Jenkinsfile.
- [Pipeline: Basic Steps — `withEnv`](https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/#withenv-set-environment-variables) — scope environment ngắn hạn trong Pipeline.
- [Pipeline: Input Step](https://www.jenkins.io/doc/pipeline/steps/pipeline-input-step/) — input tương tác tại một điểm Pipeline; đánh giá quyền và timeout riêng trước khi dùng.
- [Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — credential store, scope và quyền truy cập.
- [Credentials Binding plugin](https://plugins.jenkins.io/credentials-binding/) — `withCredentials`, masking và các giới hạn bảo mật.
- [File Parameters plugin](https://plugins.jenkins.io/file-parameters/) — `withFileParameter` và lưu ý khi dùng file parameter trong Pipeline.
- [Securing Jenkins](https://www.jenkins.io/doc/book/security/) — authorization, bảo vệ controller và vận hành an toàn.

## Đọc tiếp

<Cards>
  <Card title="Freestyle Project" href="/docs/jobs/freestyle" description="Cấu hình parameterized build qua UI và kiểm soát Execute shell." />
  <Card title="Biến môi trường Jenkins" href="/docs/jobs/environment-variables" description="Hiểu `params`, `env`, process environment và scope override." />
  <Card title="Declarative Pipeline" href="/docs/pipelines/declarative" description="Tổ chức Jenkinsfile có stage, agent và policy rõ ràng." />
  <Card title="Scripted Pipeline" href="/docs/pipelines/scripted" description="Dùng `properties`, `node` và Groovy Pipeline có kiểm soát." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Bind secret trong phạm vi hẹp thay vì truyền qua parameter." />
</Cards>
