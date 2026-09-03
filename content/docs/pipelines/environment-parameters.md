---
title: "Environment & Parameters"
description: "Khai báo, phân phạm vi và kiểm soát environment cùng parameters trong Jenkinsfile Declarative."
---

<Callout type="info" title="Phạm vi và giả định">
  Bài này dùng Declarative Pipeline trên Jenkins có plugin **Pipeline: Declarative**. Mẫu cần một agent Unix mang label `linux` và step `sh`; `withEnv` là Pipeline step do các plugin Pipeline cung cấp. Credential binding được nhắc ở mức tham chiếu và cần plugin **Credentials Binding** cùng credential đã được quản trị sẵn. Không có ví dụ nào kết nối, deploy hoặc dùng secret thật.
</Callout>

`environment` là cấu hình runtime không nhạy cảm của Pipeline, còn `parameters` là input lúc khởi tạo build. Cả hai làm Jenkinsfile linh hoạt hơn, nhưng không phải quyền truy cập: một giá trị được chọn không tự cho phép job chạm production, gọi hostname hoặc chạy lệnh tùy ý.

## Mục lục

- [Hai namespace `env` và `params`](#hai-namespace-env-và-params)
  - [`env`: biến môi trường của process](#env-biến-môi-trường-của-process)
  - [`params`: input của build](#params-input-của-build)
- [Khai báo environment và parameters](#khai-báo-environment-và-parameters)
  - [Pipeline-level và stage-level environment](#pipeline-level-và-stage-level-environment)
  - [String, boolean và choice parameters](#string-boolean-và-choice-parameters)
- [Scope, override và precedence](#scope-override-và-precedence)
  - [Bản đồ scope](#bản-đồ-scope)
  - [Quy tắc precedence](#quy-tắc-precedence)
  - [`withEnv` cho override ngắn hạn](#withenv-cho-override-ngắn-hạn)
- [Khi nào giá trị được resolve?](#khi-nào-giá-trị-được-resolve)
  - [Giá trị tĩnh và giá trị dynamic](#giá-trị-tĩnh-và-giá-trị-dynamic)
  - [Tính dynamic value trong `script` an toàn](#tính-dynamic-value-trong-script-an-toàn)
- [Jenkinsfile mẫu an toàn](#jenkinsfile-mẫu-an-toàn)
  - [Vì sao mẫu không nội suy parameter vào shell](#vì-sao-mẫu-không-nội-suy-parameter-vào-shell)
- [Credential, secret và ranh giới tin cậy](#credential-secret-và-ranh-giới-tin-cậy)
  - [Binding ở scope hẹp](#binding-ở-scope-hẹp)
  - [Masking không thay thế bảo mật](#masking-không-thay-thế-bảo-mật)
  - [PR, fork và plugin assumptions](#pr-fork-và-plugin-assumptions)
- [Lab: quan sát scope và dynamic value](#lab-quan-sát-scope-và-dynamic-value)
  - [Chuẩn bị](#chuẩn-bị)
  - [Tạo Jenkinsfile lab](#tạo-jenkinsfile-lab)
  - [Xác minh cú pháp và parameter](#xác-minh-cú-pháp-và-parameter)
  - [Chạy staging và đọc log](#chạy-staging-và-đọc-log)
  - [Kiểm tra scope ngắn hạn](#kiểm-tra-scope-ngắn-hạn)
  - [Chạy các trường hợp](#chạy-các-trường-hợp)
- [Lỗi thường gặp](#lỗi-thường-gặp)
- [Checklist](#checklist)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Hai namespace `env` và `params`

### `env`: biến môi trường của process

`env` là đối tượng Pipeline để đọc hoặc, trong các trường hợp phù hợp, đặt biến môi trường. Jenkins cũng đặt sẵn nhiều biến như `BUILD_NUMBER`, `JOB_NAME`, `WORKSPACE` và `BRANCH_NAME` khi ngữ cảnh cung cấp chúng. Khi gọi `sh`, các biến đang hiệu lực được truyền vào process shell; shell Unix đọc chúng bằng `$NAME`.

Dùng `env` cho cấu hình mà process cần biết, chẳng hạn tên ứng dụng, log level hoặc mã định danh build. Không dùng `env` làm kho secret trong Git. Với biến do `environment {}` khai báo, giá trị nên là hằng không nhạy cảm hoặc tham chiếu credential đã quản trị; chi tiết binding nằm ở [Credentials trong Pipeline](/docs/pipelines/credentials).

### `params`: input của build

`params` chứa các parameter mà người dùng hoặc trigger đã chọn cho **lần build hiện tại**. Trong Declarative Pipeline, đọc chúng qua `params.TÊN`, ví dụ `params.DEPLOY_TIER`. `params` khác `env`: parameter là dữ liệu điều khiển flow, không phải lời hứa rằng process shell sẽ nhận được biến cùng tên trên mọi loại job/plugin.

Dùng parameter cho lựa chọn nhỏ, đã định nghĩa trước, rồi kiểm tra/map lại trước hành động có side effect. `choice` cho phép Jenkins UI giới hạn lựa chọn, nhưng Jenkinsfile vẫn nên có allowlist khi giá trị chuẩn bị đi vào logic nhạy cảm. `string` là input tự do hơn nên phải có giới hạn độ dài/định dạng và không được đưa thẳng vào shell, URL, hostname, path hay câu lệnh.

<Callout type="warn" title="Parameter không phải authorization">
  Quyền **Build**, quyền dùng credential, policy môi trường, quyền ở hệ thống đích và approval là các kiểm soát riêng. Người chọn `production` không vì thế được cấp token production hay được phép deploy. Đừng dùng parameter để nhận một command, IP, hostname hoặc URL tùy ý.
</Callout>

## Khai báo environment và parameters

### Pipeline-level và stage-level environment

`environment` ở cấp `pipeline` áp dụng cho các stage. `environment` bên trong một `stage` chỉ áp dụng khi stage đó chạy và có thể đặt giá trị cùng tên để chuyên biệt hóa giá trị pipeline-level cho stage này.

```groovy
pipeline {
  agent any

  environment {
    APP_NAME = 'inventory-api'
    LOG_LEVEL = 'info'
  }

  stages {
    stage('Package') {
      environment {
        LOG_LEVEL = 'debug'
      }
      steps {
        sh 'printf "%s\\n" "$APP_NAME:$LOG_LEVEL"'
      }
    }
  }
}
```

Trong stage `Package`, output là `inventory-api:debug`; ngoài stage đó, `LOG_LEVEL` trở lại `info`. `agent any` chỉ giúp ví dụ ngắn; Pipeline thật nên chọn label/toolchain và trust boundary rõ ràng như giải thích ở [Declarative Pipeline](/docs/pipelines/declarative).

### String, boolean và choice parameters

Khai báo `parameters` ở cấp `pipeline`, không đặt trong `steps`. Ba loại dưới đây có vai trò khác nhau:

| Loại | Ví dụ | Cách dùng an toàn |
| --- | --- | --- |
| `string` | `RELEASE_NOTE` | Giới hạn độ dài/format; chỉ dùng làm metadata sau validation, không ghép vào command. |
| `booleanParam` | `DRY_RUN` | Dùng như boolean rõ ràng trong `when` hoặc `script`; không dựa vào chuỗi không rỗng. |
| `choice` | `DEPLOY_TIER` | Danh sách hẹp như `staging`, `production`; map sang hành vi/đích cố định do đội vận hành quản lý. |

Lần đầu Jenkins chạy một Jenkinsfile mới có `parameters`, UI của một số job có thể chưa hiện **Build with Parameters** cho đến khi build đầu tiên đã lưu properties của job. Chạy lần đầu trên branch/job lab, xác nhận parameter và default trong UI rồi mới dùng nó trong flow quan trọng.

## Scope, override và precedence

### Bản đồ scope

Sơ đồ này mô tả thứ tự các scope bao quanh một `sh` trong stage. Scope gần process hơn có thể che cùng tên biến từ scope ngoài trong thời gian nó còn hiệu lực.

```text
Jenkins/controller, node hoặc agent environment
                 │
                 ▼
pipeline-level environment { APP_NAME, LOG_LEVEL=info }
                 │
                 ▼
stage-level environment    { LOG_LEVEL=debug }
                 │
                 ▼
withEnv(['LOG_LEVEL=trace']) { sh ... }
                 │
                 ▼
process shell đọc APP_NAME và LOG_LEVEL=trace

params.DEPLOY_TIER ──► namespace Pipeline riêng; chỉ dùng khi Jenkinsfile đọc nó
```

| Nguồn giá trị | Phạm vi điển hình | Thời điểm hết hiệu lực | Dùng cho |
| --- | --- | --- | --- |
| Environment của controller/node/agent | Agent hoặc process kế thừa | Khi process/agent kết thúc hoặc cấu hình đổi | Toolchain, `PATH`, metadata hạ tầng; không xem là source cấu hình ứng dụng đáng tin cậy. |
| Jenkins built-in environment | Build hoặc stage theo ngữ cảnh | Hết build/stage | `BUILD_NUMBER`, `WORKSPACE`, metadata branch khi plugin/job cung cấp. |
| Pipeline-level `environment` | Toàn Pipeline | Kết thúc Pipeline | Hằng cấu hình chung không nhạy cảm. |
| Stage-level `environment` | Một stage | Stage kết thúc | Chuyên biệt hóa cấu hình cho một chặng. |
| `withEnv([...])` | Closure/block | Thoát block | Override tạm, cục bộ quanh một hoặc vài step. |
| `params` | Build hiện tại, nhưng namespace riêng | Kết thúc build | Lựa chọn/input để Jenkinsfile quyết định flow. |

### Quy tắc precedence

Khi **cùng tên biến môi trường** xuất hiện ở các scope trên, áp dụng các quy tắc thực hành sau:

1. Giá trị stage-level che giá trị cùng tên ở pipeline-level trong stage đó.
2. `withEnv` bên trong stage che giá trị từ pipeline-level lẫn stage-level trong closure của nó. Khi closure kết thúc, giá trị stage-level có hiệu lực lại.
3. Biến được khai báo bằng Declarative `environment` không nên bị sửa bằng phép gán imperative `env.NAME = '...'`. Jenkins bảo vệ giá trị Declarative theo cách này; dùng `withEnv` khi cần override tạm.
4. Biến do code tạo bằng `env.NAME = '...'` có thể bị ghi đè bởi một phép gán `env` sau đó, nhưng cách này làm provenance khó thấy hơn. Chỉ dùng cho giá trị runtime đã validate và ưu tiên một tên mới, ví dụ `RUN_SUMMARY`, thay vì đổi hằng cấu hình như `APP_NAME`.
5. `params.NAME` không tham gia precedence của `env.NAME`. Nếu tên trùng nhau, chúng vẫn là hai namespace khác; đọc đúng namespace và đừng dựa vào việc plugin có export parameter thành environment hay không.

Không dùng precedence để vượt policy. Một `withEnv` có thể đổi `LOG_LEVEL` cho test, nhưng không được dùng để tự nạp credential, đổi endpoint sang host do user nhập, hay giả mạo biến mà tool security dựa vào.

### `withEnv` cho override ngắn hạn

`withEnv` phù hợp khi một process riêng cần biến khác mà không muốn làm rò giá trị sang step kế tiếp. Đây là một Pipeline step, nên availability cụ thể phụ thuộc bộ plugin Pipeline của controller; kiểm tra **Pipeline Syntax** trên chính Jenkins của bạn.

```groovy
stage('Diagnostic an toàn') {
  environment {
    LOG_LEVEL = 'debug'
  }
  steps {
    withEnv(['LOG_LEVEL=trace']) {
      sh '''
        set -eu
        printf '%s\n' "inside=$LOG_LEVEL"
      '''
    }
    sh 'test "$LOG_LEVEL" = "debug"'
  }
}
```

Trong block, shell nhận `trace`; sau block, test xác nhận stage-level `debug` đã trở lại. Dùng triple single quote cho script nhiều dòng để Groovy không nội suy `$LOG_LEVEL` trước shell. Việc quote đúng không làm input không tin cậy an toàn: giải pháp chính vẫn là không đưa input tự do vào script.

## Khi nào giá trị được resolve?

### Giá trị tĩnh và giá trị dynamic

Jenkins parse cấu trúc Declarative trước khi thực thi flow. Khi người dùng khởi tạo build, parameter được chọn rồi Pipeline đọc qua `params`. Giá trị `environment` có scope tương ứng khi Jenkins đi vào Pipeline/stage/block đó; built-in như `BUILD_NUMBER` và `WORKSPACE` chỉ có ý nghĩa khi Jenkins đã tạo build hoặc cấp agent/workspace phù hợp.

Giá trị tĩnh nên nằm trực tiếp trong `environment`, ví dụ `APP_NAME = 'inventory-api'`. Đừng cố gọi shell để “tính động” trong top-level `environment`: việc đó phụ thuộc thứ tự cấp agent, workspace và version/plugin, có thể làm lúc parse hoặc lúc cấp agent khó đoán hơn. Nếu giá trị cần command hoặc metadata runtime, tính nó sau khi stage đã có agent, trong `script {}` hoặc step rõ ràng.

Với `when` chỉ đọc parameter/metadata, thêm `beforeAgent true` để Jenkins quyết định trước khi giữ executor. Xem [Điều kiện `when` và phê duyệt `input`](/docs/pipelines/when-input) để biết thứ tự `when`, `input` và stage agent.

### Tính dynamic value trong `script` an toàn

Dynamic value là dữ liệu chỉ biết khi build đang chạy, ví dụ build number hoặc kết quả một phép map đã review. Mẫu an toàn là: lấy input có giới hạn, kiểm tra allowlist, map sang giá trị cố định, rồi đặt một biến mới cho những step tiếp theo. Không chạy Groovy hay shell do parameter cung cấp.

```groovy
script {
  def tiers = [
    'staging': 'STAGING',
    'production': 'PRODUCTION',
  ]
  def selectedTier = tiers[params.DEPLOY_TIER]

  if (selectedTier == null) {
    error('DEPLOY_TIER is not allowlisted')
  }

  def mode = params.DRY_RUN ? 'dry-run' : 'preview'
  env.RUN_SUMMARY = "${selectedTier}-${mode}-${env.BUILD_NUMBER}"
}
```

`RUN_SUMMARY` chỉ được tạo từ map cố định, boolean và `BUILD_NUMBER` do Jenkins tạo. Step `sh` sau đó có thể đọc `$RUN_SUMMARY` mà không cần nội suy `params` vào script. Nếu dynamic value thật sự cần gọi tool, gọi một command cố định, lấy output qua `sh(returnStdout: true, script: '...').trim()`, kiểm tra format/allowlist/độ dài trước khi lưu và không làm điều này trong scope có secret trừ khi bắt buộc.

<Callout type="warn" title="Dynamic không đồng nghĩa an toàn">
  `script {}` cho phép Groovy linh hoạt hơn Declarative, nên validator khó mô hình hóa flow bên trong hơn. Giữ block ngắn, deterministic, không có side effect; đưa logic lặp lại hoặc phức tạp vào Shared Library đã review. Một output từ shell, API, SCM hay parameter vẫn là dữ liệu không tin cậy cho đến khi được validate.
</Callout>

## Jenkinsfile mẫu an toàn

Mẫu này có string, boolean và choice parameter; environment tĩnh ở hai scope; `withEnv`; và một dynamic value tính trong `script`. Nó chỉ in metadata đã kiểm soát và không checkout, deploy, gọi network hay dùng credential. Cần Declarative Pipeline và agent Unix `linux`; `sh` là step Unix. Đổi label theo agent lab thực tế, không chuyển workload không tin cậy sang controller để mẫu chạy được.

```groovy
pipeline {
  agent none

  parameters {
    string(
      name: 'RELEASE_NOTE',
      defaultValue: '',
      trim: true,
      description: 'Metadata tối đa 120 ký tự; không được đưa vào shell hoặc hostname.'
    )
    booleanParam(
      name: 'DRY_RUN',
      defaultValue: true,
      description: 'Chỉ chọn chế độ mô phỏng đã định nghĩa.'
    )
    choice(
      name: 'DEPLOY_TIER',
      choices: ['staging', 'production'],
      description: 'Chỉ là lựa chọn policy; không cấp quyền deploy.'
    )
  }

  environment {
    APP_NAME = 'inventory-api'
    LOG_LEVEL = 'info'
  }

  stages {
    stage('Validate và tính runtime metadata') {
      agent { label 'linux' }
      steps {
        script {
          if (params.RELEASE_NOTE.length() > 120) {
            error('RELEASE_NOTE must be 120 characters or fewer')
          }

          def tiers = [
            'staging': 'STAGING',
            'production': 'PRODUCTION',
          ]
          def selectedTier = tiers[params.DEPLOY_TIER]
          if (selectedTier == null) {
            error('DEPLOY_TIER is not allowlisted')
          }

          def mode = params.DRY_RUN ? 'dry-run' : 'preview'
          env.RUN_SUMMARY = "${selectedTier}-${mode}-${env.BUILD_NUMBER}"
        }

        sh '''
          set -eu
          test -n "$RUN_SUMMARY"
          printf '%s\n' "app=$APP_NAME summary=$RUN_SUMMARY level=$LOG_LEVEL"
        '''
      }
    }

    stage('Package preview') {
      agent { label 'linux' }
      environment {
        LOG_LEVEL = 'debug'
      }
      steps {
        withEnv(['LOG_LEVEL=trace']) {
          sh '''
            set -eu
            printf '%s\n' "package app=$APP_NAME summary=$RUN_SUMMARY level=$LOG_LEVEL"
          '''
        }
        sh 'test "$LOG_LEVEL" = "debug"'
      }
    }

    stage('Staging preview') {
      when {
        beforeAgent true
        expression { params.DEPLOY_TIER == 'staging' }
      }
      agent { label 'linux' }
      steps {
        sh '''
          set -eu
          printf '%s\n' "staging preview only: $RUN_SUMMARY"
        '''
      }
    }
  }

  post {
    always {
      echo 'Pipeline finished; no deployment or credential binding was attempted.'
    }
  }
}
```

### Vì sao mẫu không nội suy parameter vào shell

- `RELEASE_NOTE` chỉ được kiểm tra độ dài và không bị in. Nó có thể chứa nội dung tự do, nên không xuất hiện trong shell, path, URL, hostname hay message có khả năng bị diễn giải.
- `DEPLOY_TIER` có `choice` và còn được map lại qua `tiers`. Shell chỉ nhận `RUN_SUMMARY` được tạo từ map cố định, boolean và build number.
- `DRY_RUN` đi qua biểu thức boolean để tạo `dry-run` hoặc `preview`; không phải một chuỗi do user truyền vào command.
- Stage `Staging preview` chỉ quyết định có in một dòng cố định hay không. Dù chọn `production`, mẫu không deploy và không mở endpoint nào.

Trong Pipeline thật, target phải được map trong code/cấu hình đáng tin cậy sang endpoint cố định, còn authorization tồn tại ở Jenkins và hệ thống đích. Thêm gate/approval phù hợp theo [Điều kiện `when` và phê duyệt `input`](/docs/pipelines/when-input), không biến parameter thành lối tắt qua các gate đó.

## Credential, secret và ranh giới tin cậy

### Binding ở scope hẹp

Không truyền secret bằng `string` parameter hay `environment` hard-code. Tạo credential trong Jenkins, cấp scope folder/job hẹp nhất rồi bind đúng block cần dùng. `credentials('credential-id')` là helper của Declarative `environment`; `withCredentials` là step của plugin Credentials Binding. Chúng là capability khác với `params` và cần credential ID tồn tại cùng permission phù hợp.

```groovy
withCredentials([
  string(credentialsId: 'release-api-token', variable: 'API_TOKEN')
]) {
  sh '''
    set +x
    # Công cụ đã review đọc API_TOKEN từ environment.
    ./scripts/publish-release
  '''
}
```

Đây chỉ là pattern tham chiếu, không phải một phần của lab/mẫu chạy được ở trên. Nó giả định plugin Credentials Binding và script `./scripts/publish-release` tồn tại; kiểm tra snippet, version plugin và quyền trên controller của bạn. Giữ binding ngắn, dùng single quote/triple single quote để tránh Groovy interpolation của secret, và không gửi token qua URL hoặc command line.

### Masking không thay thế bảo mật

Jenkins/Credentials Binding cố gắng mask secret đã biết trong Console Output, kể cả một số dạng shell-escaped. Masking không chặn code có secret gửi nó ra network, ghi vào file/artifact/cache, biến đổi/encode nó hoặc để process khác cùng agent đọc. Không `echo`, `printenv`, `env`, `set`, `cat` hay bật `set -x` quanh binding.

<Callout type="error" title="Nếu secret đã xuất hiện trong log">
  Đừng coi các dấu `****` là bằng chứng không có lộ lọt. Dừng dùng credential theo incident process, rotate hoặc thu hồi giá trị ở hệ thống cấp secret, đánh giá log/artifact/report liên quan và sửa Pipeline. Xóa một dòng log không thu hồi bản sao đã bị đọc.
</Callout>

Xem hướng dẫn đầy đủ, gồm secret file và workspace, ở [Credentials trong Pipeline](/docs/pipelines/credentials).

### PR, fork và plugin assumptions

Jenkinsfile, dependency, source và parameter từ pull request (PR), đặc biệt PR từ fork, đều là input không tin cậy. Không cấp credential phát hành, Docker socket, cloud role, agent chứa dữ liệu nhạy cảm hoặc quyền production cho build đó. Chạy CI không tin cậy trên agent tách biệt; chỉ bind capability nhạy cảm sau merge hoặc trong flow được tổ chức tin cậy/phê duyệt.

`environment`, `parameters`, `when` và cấu trúc `pipeline {}` cần plugin Pipeline: Declarative. `withEnv`, `sh`, `withCredentials`, Branch Source metadata và integration deploy có thể do plugin/OS khác cung cấp, với behavior/version khác nhau. Pipeline Syntax và Declarative linter của controller là nguồn xác nhận cho instance đang chạy; tài liệu cú pháp chung không chứng minh agent có tool, credential có permission hay plugin đã cài. Để chuẩn bị controller/agent lab, xem [Yêu cầu hệ thống](/docs/getting-started/requirements) và [chạy Jenkins với Docker](/docs/installation/docker).

## Lab: quan sát scope và dynamic value

### Chuẩn bị

Lab dùng Jenkinsfile mẫu ở trên và không cần repository ứng dụng, credential hay service ngoài. Cần Jenkins có Pipeline: Declarative, agent Unix online có label `linux`, shell `sh` và quyền tạo Pipeline job. Nếu agent không có label đó, sửa **label của lab** thành label thực tế; không dùng controller/built-in node cho workload không tin cậy.

<Steps>
<Step>

### Tạo Jenkinsfile lab

Tạo repository Git do bạn kiểm soát, thêm mẫu vào file `Jenkinsfile`, commit rồi push. Trong Jenkins tạo **New Item → Pipeline**, chọn **Pipeline script from SCM**, chọn Git và branch lab. Nếu repository private, dùng credential đọc source có quyền tối thiểu; không dán token vào URL.

</Step>
<Step>

### Xác minh cú pháp và parameter

Mở **Pipeline Syntax** hoặc Declarative Directive Generator để đối chiếu directive theo plugin của controller. Nếu controller cho phép, chạy Declarative linter trước build. Chạy build đầu tiên với default để Jenkins lưu parameter properties; sau đó mở **Build with Parameters** và xác nhận ba control `RELEASE_NOTE`, `DRY_RUN`, `DEPLOY_TIER` xuất hiện.

</Step>
<Step>

### Chạy staging và đọc log

Chọn `DEPLOY_TIER=staging`, `DRY_RUN=true`, đặt `RELEASE_NOTE` thành một câu ngắn không nhạy cảm, rồi chạy build. Không đặt hostname, URL, shell fragment hay secret vào note: mẫu cố ý không dùng note trong command.

</Step>
<Step>

### Kiểm tra scope ngắn hạn

Trong Console Output, so sánh dòng đầu tiên từ `Validate và tính runtime metadata` với dòng từ `Package preview`. Dòng package phải có `level=trace` trong `withEnv`; test sau block phải thành công vì `LOG_LEVEL` đã quay lại `debug`. Stage `Staging preview` chạy và chỉ in preview cục bộ.

</Step>
</Steps>

### Chạy các trường hợp

| Thao tác | Kết quả mong đợi | Điều được chứng minh |
| --- | --- | --- |
| Default: `staging`, `DRY_RUN=true` | `RUN_SUMMARY` có dạng `STAGING-dry-run-<build>`; cả ba stage chạy. | Dynamic value chỉ gồm allowlist, boolean và build number. |
| Đổi `DRY_RUN=false` | Summary đổi thành `STAGING-preview-<build>`; không có side effect mới. | Boolean được resolve trong `script`, không phải chuỗi shell. |
| Đổi `DEPLOY_TIER=production` | `Staging preview` bị **skipped**; hai stage trước vẫn chạy, không deploy. | Choice điều khiển `when`, không cấp authorization. |
| Nhập note dài hơn 120 ký tự | Build thất bại ở `Validate và tính runtime metadata`; note không được echo. | String parameter được validate trước khi dùng và không đi vào shell. |

Sau mỗi build, đọc build number, stage state và Console Output thay vì chỉ nhìn trạng thái xanh/đỏ. Nếu build chờ queue, kiểm tra agent `linux` và executor trước khi sửa Jenkinsfile. Để hiểu job, build, agent và log, xem [Tổng quan Jenkins Pipeline](/docs/pipelines/overview) và [Jenkinsfile](/docs/pipelines/jenkinsfile).

## Lỗi thường gặp

<Callout type="error" title="Dùng parameter như một mảnh command">
  `sh "curl https://${params.HOST}/deploy"`, `sh params.COMMAND` hoặc ghép `params` vào path/URL là injection/SSRF risk, kể cả khi UI có choice. Map lựa chọn allowlist sang giá trị cố định trong code đáng tin cậy; từ chối giá trị lạ trước mọi network hoặc side effect.
</Callout>

| Triệu chứng | Nguyên nhân thường gặp | Cách sửa an toàn |
| --- | --- | --- |
| `$APP_NAME` rỗng hoặc literal trong log | Nhầm `params` với `env`, hoặc dùng quote/Groovy interpolation không đúng. | Dùng `params.NAME` trong Groovy; dùng `$NAME` trong script single-quoted để shell mở rộng environment. |
| Stage không thấy giá trị pipeline-level mong đợi | Stage-level `environment` hoặc `withEnv` đã che cùng tên biến. | Đọc bảng scope, đổi tên biến theo trách nhiệm và thu hẹp `withEnv`. |
| `env.NAME =` không đổi hằng Declarative | Biến đã được khai báo bằng `environment`. | Giữ hằng đó bất biến; dùng `withEnv` cho override tạm hoặc đặt biến runtime tên mới. |
| `when` vẫn chiếm executor rồi mới skip | `when` được đánh giá theo thứ tự mặc định. | Thêm `beforeAgent true` khi condition chỉ đọc parameter/metadata. |
| Parameter chưa hiện trong UI | Job chưa chạy Jenkinsfile để lưu properties, hoặc job đang đọc revision khác. | Chạy build lab đầu tiên, xác minh branch/Script Path rồi mở lại **Build with Parameters**. |
| Secret bị mask nhưng vẫn có rủi ro | Masking chỉ che log, không cô lập process, file hay network. | Thu hẹp binding, tắt tracing, không archive/dump environment và tách agent PR. |
| Step hoạt động ở Jenkins khác nhưng không ở đây | Thiếu plugin, khác version hoặc agent OS/toolchain khác. | Dùng Pipeline Syntax/linter của controller và kiểm tra plugin/agent assumptions. |

## Checklist

- [ ] `environment` chỉ chứa cấu hình không nhạy cảm hoặc credential reference đã review; không hard-code secret.
- [ ] Tôi đọc đúng `env.NAME` và `params.NAME` như hai namespace riêng.
- [ ] Pipeline-level, stage-level và `withEnv` có scope tối thiểu; tên biến không che nhau vô tình.
- [ ] Override tạm dùng `withEnv`; hằng Declarative không bị sửa bằng `env.NAME =`.
- [ ] Parameter string có giới hạn/validation và không xuất hiện trong shell, URL, hostname, path, artifact hay log.
- [ ] Choice/boolean được map hoặc so sánh rõ ràng trước flow có tác động; parameter không được coi là authorization.
- [ ] Dynamic value được tính sau khi có runtime context, validate trước khi dùng và không thực thi command do input cung cấp.
- [ ] Shell dùng single quote/triple single quote khi cần shell mở rộng biến; không Groovy-interpolate secret.
- [ ] Credential binding ở closure/stage hẹp nhất; không `echo`, `set -x`, dump environment hoặc archive dữ liệu binding.
- [ ] PR/fork không nhận secret hay agent đặc quyền; plugin, step, agent và credential assumptions đã được xác minh trên controller.
- [ ] Lab đã chứng minh ít nhất một override `withEnv`, một dynamic value, một stage `when` chạy và một stage bị skip.

## Nguồn Jenkins chính thức

- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/) — `environment`, `parameters`, credentials và biến Pipeline.
- [Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — Declarative directives, `when`, parameter và thứ tự thực thi.
- [Pipeline development tools](https://www.jenkins.io/doc/book/pipeline/development/) — Pipeline Syntax, Directive Generator và Declarative linter.
- [Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — credential store, scope và permission.
- [Credentials Binding plugin](https://plugins.jenkins.io/credentials-binding/) — `withCredentials`, masking và cảnh báo secret file/workspace.
- [Pipeline: Basic Steps](https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/) — `withEnv` và các Pipeline step cơ bản.
- [Multibranch Pipeline](https://www.jenkins.io/doc/book/pipeline/multibranch/) — branch/PR metadata và trust policy theo SCM source.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn lại controller, agent, job và build trước khi cấu hình Pipeline." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu workspace, executor và ranh giới tin cậy của agent." />
  <Card title="Nền tảng CI/CD" href="/docs/getting-started/ci-cd-fundamentals" description="Đặt parameter và quality gate trong vòng phản hồi CI/CD." />
  <Card title="Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Đặt Jenkinsfile trong SCM và kiểm tra syntax trước build." />
  <Card title="Declarative Pipeline" href="/docs/pipelines/declarative" description="Mở rộng directive, agent, stage và step theo cấu trúc rõ ràng." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Nạp secret ở scope hẹp và hiểu giới hạn của masking." />
  <Card title="Điều kiện when và phê duyệt input" href="/docs/pipelines/when-input" description="Thiết kế condition và approval mà không biến parameter thành quyền." />
</Cards>
