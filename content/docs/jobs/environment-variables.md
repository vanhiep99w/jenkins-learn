---
title: "Biến môi trường Jenkins"
description: "Chọn đúng nguồn, scope và precedence của Jenkins environment variables; override an toàn và bảo vệ secret trong Pipeline."
---

Biến môi trường giúp Jenkins truyền cấu hình và metadata vào process build, nhưng cùng một tên có thể xuất hiện ở controller, agent, job và Jenkinsfile. Trang này chỉ ra giá trị đi từ đâu, scope nào thắng tại một process cụ thể và khi nào phải dùng Jenkins Credentials thay vì environment.

## Mục lục

- [Mô hình và hai namespace](#mô-hình-và-hai-namespace)
  - [Controller, agent và process shell](#controller-agent-và-process-shell)
  - [Biến built-in và biến custom](#biến-built-in-và-biến-custom)
  - [Parameters: `params` và environment của build](#parameters-params-và-environment-của-build)
- [Nguồn biến môi trường](#nguồn-biến-môi-trường)
  - [Bảng nguồn scope và lifecycle](#bảng-nguồn-scope-và-lifecycle)
  - [Thay đổi cấu hình, restart và build đang chạy](#thay-đổi-cấu-hình-restart-và-build-đang-chạy)
- [Scope, precedence và override](#scope-precedence-và-override)
  - [Sơ đồ precedence của một process](#sơ-đồ-precedence-của-một-process)
  - [Quy tắc thực hành](#quy-tắc-thực-hành)
  - [Bảng chẩn đoán precedence](#bảng-chẩn-đoán-precedence)
- [Đọc và truyền giá trị đúng cách](#đọc-và-truyền-giá-trị-đúng-cách)
  - [Shell process khác Jenkins env](#shell-process-khác-jenkins-env)
  - [Quote và interpolation](#quote-và-interpolation)
  - [Null boolean path và khác biệt hệ điều hành](#null-boolean-path-và-khác-biệt-hệ-điều-hành)
- [Jenkinsfile mẫu an toàn](#jenkinsfile-mẫu-an-toàn)
- [Secret và credentials](#secret-và-credentials)
  - [Environment không phải secret store](#environment-không-phải-secret-store)
  - [Binding ngắn hạn và giới hạn masking](#binding-ngắn-hạn-và-giới-hạn-masking)
- [Lab sandbox: quan sát override vô hại](#lab-sandbox-quan-sát-override-vô-hại)
  - [Chuẩn bị và Jenkinsfile](#chuẩn-bị-và-jenkinsfile)
  - [Kết quả mong đợi và cleanup](#kết-quả-mong-đợi-và-cleanup)
- [Troubleshooting](#troubleshooting)
- [Checklist](#checklist)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mô hình và hai namespace

### Controller, agent và process shell

Controller điều phối build và tạo context Pipeline. Agent nhận executor, workspace và chạy `sh`, `bat` hoặc `powershell`. Khi Jenkins gọi một step process, nó tạo **một environment cho process đó** từ context đang hiệu lực trên agent. Vì vậy, biến của service controller không tự động là biến của shell trên agent.

Ví dụ `JENKINS_URL` có thể do controller cung cấp cho build, còn `PATH` của process lại phụ thuộc OS, image hoặc cấu hình node/agent. `WORKSPACE` chỉ có ý nghĩa sau khi Jenkins đã cấp agent và workspace. Không chuyển workload lên controller chỉ vì một biến chỉ có ở đó; hãy chọn agent có label và trust boundary phù hợp. Xem [Kiến trúc Jenkins](/docs/getting-started/architecture) và [Tổng quan Jenkins Agent](/docs/agents/overview).

### Biến built-in và biến custom

**Built-in variables** là metadata Jenkins hoặc plugin đặt theo context, như `BUILD_NUMBER`, `BUILD_TAG`, `JOB_NAME`, `NODE_NAME`, `WORKSPACE`, `JENKINS_URL` và, với Multibranch Pipeline khi nguồn SCM cung cấp, `BRANCH_NAME`. Đừng giả định mọi biến built-in luôn có: một job không có workspace chưa có `WORKSPACE`; Freestyle, Pipeline và plugin Branch Source cũng có thể cung cấp context khác nhau. Tra **Global Variable Reference** trên controller để xem biến/step của chính instance.

**Custom variables** là tên đội tự đặt, ví dụ `APP_COMPONENT=reports-api` hoặc `LOG_LEVEL=info`. Dùng tên mô tả trách nhiệm, tránh ghi đè các tên Jenkins/tool/OS phổ biến như `PATH`, `HOME`, `JAVA_HOME` nếu chưa hiểu hậu quả. Thiết lập custom variable ở scope hẹp nhất đáp ứng nhu cầu và ghi owner của những biến global.

### Parameters: `params` và environment của build

Jenkins export **build parameters tiêu chuẩn** thành environment variables khi build bắt đầu, nên step process thường có thể đọc `DEPLOY_TIER` bằng `$DEPLOY_TIER` (POSIX shell), `%DEPLOY_TIER%` (`cmd.exe`) hoặc `$env:DEPLOY_TIER` (PowerShell). Cùng giá trị đó cũng có qua `params.DEPLOY_TIER` trong Pipeline. Không cần tự export một parameter tiêu chuẩn chỉ để shell thấy nó.

Hai API phục vụ hai mục đích khác nhau. `params.NAME` giữ giá trị parameter theo kiểu/ngữ nghĩa parameter cho Groovy/Pipeline, chẳng hạn `params.DRY_RUN` là boolean. `env.NAME` là biểu diễn **chuỗi** trong Pipeline environment; process chỉ nhận biểu diễn này. Ví dụ `params.DRY_RUN` nên được dùng trong condition Groovy, còn shell phải so sánh chuỗi `"true"`/`"false"` nếu thật sự cần đọc `$DRY_RUN`.

Parameter là một **nguồn baseline** của environment build, không phải một tầng `env` tách biệt. Nếu tên parameter trùng với `environment`, `withEnv` hoặc biến do plugin inject, giá trị `env.NAME`/process thấy có thể bị overlay bởi scope gần step hơn. `params.NAME` vẫn là input đã chọn. Jenkins documentation bảo đảm parameter được export khi build bắt đầu và `environment` áp dụng cho các step theo scope, nhưng không quy định một precedence phổ quát cho mọi plugin hay parameter type tùy biến. Tránh collision bằng tên riêng; nếu không tránh được, kiểm chứng trên controller/version/plugin bằng lab ở dưới.

<Callout type="warn" title="Built-in không phải dữ liệu tin cậy từ người dùng">
  Metadata build hữu ích để định danh lần chạy, nhưng branch, commit message, tên job hiển thị, parameter và nội dung repository vẫn có thể bị kiểm soát bởi người không đáng tin ở các mô hình job khác nhau. Không ghép chúng trực tiếp thành command, URL, path hay chính sách authorization.
</Callout>

## Nguồn biến môi trường

### Bảng nguồn scope và lifecycle

Không có một nguồn duy nhất cho environment. Bảng này mô tả nơi một giá trị thường được tạo và nơi nó có thể được quan sát; plugin hoặc loại job có thể bổ sung biến khác.

| Nguồn | Ví dụ | Scope thường gặp | Lưu ý precedence và lifecycle |
| --- | --- | --- | --- |
| Controller/system | service environment, Java/system setting, **Global properties → Environment variables** | Controller process hoặc build mới nhận global property | Service/JVM setting có consumer riêng và thường cần restart controller. Global property không phải nơi chứa secret. |
| Node/agent | image/host OS, node property, `PATH`, CA nội bộ | Agent hoặc process kế thừa trên agent đó | Controller không suy ra được tool/`PATH` của agent. Image/host đổi có thể chỉ thấy ở allocation/process mới. |
| Folder/job | job property, Folder property hoặc plugin inject environment | Job/folder và build của item con theo plugin/cấu hình | Phạm vi, thứ tự và khả năng override phụ thuộc plugin; ghi rõ owner và không dựa vào UI field không được kiểm chứng. |
| Parameters | `params.DEPLOY_TIER`, `params.DRY_RUN`; `$DEPLOY_TIER` trong shell | Input build và baseline environment được export lúc build bắt đầu | `params.NAME` là API Pipeline theo kiểu/ngữ nghĩa parameter; `env.NAME`/process nhận chuỗi. `environment`, `withEnv` hoặc plugin có thể overlay khi trùng tên; kiểm chứng collision trên instance. Validate và map allowlist trước side effect. |
| Declarative `environment` | Pipeline-level `LOG_LEVEL`, stage-level `LOG_LEVEL` | Toàn Pipeline hoặc một stage | Scope gần process hơn che scope ngoài theo cấu trúc Pipeline. Dùng cho cấu hình không nhạy cảm. |
| `withEnv` | `withEnv(['LOG_LEVEL=trace'])` | Closure/block ngắn | Override tạm cho step bên trong; hết block là trở lại giá trị trước đó. |
| Tool installers | `tools { jdk 'temurin-21.0.6' }`, tool plugin thêm `PATH` | Agent/stage khi tool được resolve | Tool name là contract; installer có thể tải code trên agent. Pin version và kiểm tra source/provenance. |
| Credentials Binding | `withCredentials([...])` hoặc `credentials('id')` | Closure hoặc `environment` của Pipeline/stage | Đây là capability nhạy cảm, không phải cấu hình thông thường. Thu hẹp scope và không in environment. |

`environment` không thay thế cấu hình tool. Ví dụ, nối một đường dẫn tùy ý vào `PATH` không cài JDK, không xác minh checksum và không tạo quyền dùng tool. Với tool dùng chung, xem [Cấu hình hệ thống Jenkins](/docs/administration/system-configuration); với labels và executor, xem [Labels & Executors](/docs/agents/labels-executors).

### Thay đổi cấu hình, restart và build đang chạy

Một build đang chạy không phải bảng điều khiển để thay đổi environment giữa chừng. Nó có thể đã tạo process environment hoặc đã đi qua stage cần biến đó. Hãy trigger **một build sandbox mới** để xác minh thay đổi thay vì suy ra từ build cũ.

| Thay đổi | Thường cần restart? | Cách xác minh an toàn |
| --- | --- | --- |
| Global property lưu từ UI/JCasC | Thường không; build mới là đối tượng kiểm tra | Chạy job sandbox mới trên đúng agent và chỉ in marker không nhạy cảm. |
| Node property, image hoặc host environment | Tùy launcher, image và tiến trình agent | Drain/refresh agent theo quy trình, xác nhận node online rồi chạy canary. |
| Service environment hoặc JVM `-D` của controller | Có; restart/recreate controller | Change window, health check controller/agent và rollback đã chuẩn bị. |
| `environment`/`withEnv` trong Jenkinsfile | Không; có hiệu lực khi revision mới chạy | Review revision, validate syntax và chạy build lab. |
| Tool definition/installer | Không nhất thiết cho controller; build sau mới resolve | Xem log của đúng agent và chạy `--version` không nhạy cảm. |

<Callout type="info" title="Không có precedence phổ quát cho mọi plugin">
  Bảng precedence bên dưới áp dụng cho **cùng một tên environment mà process Pipeline nhận**. System property Java, option plugin, parameter và configuration field của tool có consumer khác nhau; đừng đổi tên một giá trị giữa các lớp với hy vọng nó sẽ tự ghi đè.
</Callout>

## Scope, precedence và override

### Sơ đồ precedence của một process

Khi cùng tên `LOG_LEVEL` được đặt ở nhiều lớp, hãy đọc từ ngoài vào trong. Scope gần step process nhất sẽ che giá trị của scope ngoài trong thời gian nó hiệu lực.

```text
Controller/global, node/agent và parameter export lúc build bắt đầu
                    │
                    ▼
Baseline environment: env.LOG_LEVEL / process LOG_LEVEL
                    │
                    ▼
Pipeline environment { LOG_LEVEL = 'info' }
                    │
                    ▼
Stage environment    { LOG_LEVEL = 'debug' }
                    │
                    ▼
withEnv(['LOG_LEVEL=trace']) { sh / bat / powershell }
                    │
                    ▼
Process nhận LOG_LEVEL=trace

params.LOG_LEVEL ── API giữ input parameter; env/process là biểu diễn chuỗi có thể bị overlay.
```

Sơ đồ là mô hình cho Declarative/Pipeline context thông dụng, không phải cam kết của mọi plugin inject environment. Đối với job/folder/plugin, xác minh bằng một build lab có tên marker mới thay vì ghi đè biến hệ thống quan trọng.

### Quy tắc thực hành

1. Agent/node và global property tạo **baseline** cho process, nhưng không đáng tin để che cấu hình job mà không có owner.
2. Pipeline-level `environment` áp dụng trong Pipeline. Stage-level `environment` che cùng tên trong stage đó.
3. `withEnv` che giá trị bên ngoài chỉ trong closure. Đây là lựa chọn rõ ràng cho override tạm.
4. Không dùng `env.NAME = '...'` để cố sửa giá trị đã khai báo bằng Declarative `environment`; behavior này dễ gây hiểu nhầm và không phải cách override tường minh. Đặt một tên runtime mới đã validate, hoặc dùng `withEnv`.
5. Parameter tiêu chuẩn vừa có qua `params.NAME` vừa được export thành `env.NAME`/process environment khi build bắt đầu. `params.NAME` giữ input theo kiểu parameter, còn `env.NAME` là chuỗi và có thể bị `environment`, `withEnv` hoặc plugin overlay khi trùng tên. Đừng suy luận collision từ tên giống nhau: đặt tên riêng hoặc quan sát cả ba bề mặt trên controller của bạn.
6. Credentials binding có thể đưa secret vào environment của scope binding, nhưng **không** là một tầng precedence để lạm dụng. Chỉ bind ngay cạnh công cụ cần capability đó.

### Bảng chẩn đoán precedence

| Tình huống | Giá trị process thấy | Sau scope | Hướng làm an toàn |
| --- | --- | --- | --- |
| Pipeline `LOG_LEVEL=info`, stage `LOG_LEVEL=debug` | `debug` trong stage | Trở về `info` khi stage kết thúc | Giữ override stage ngắn và theo mục đích. |
| Stage `debug`, `withEnv(['LOG_LEVEL=trace'])` | `trace` trong closure | Trở về `debug` | Dùng `withEnv`, không sửa global property. |
| Parameter `LOG_LEVEL='trace'`, chưa có collision | `params.LOG_LEVEL` là input; `env.LOG_LEVEL` và shell thường nhận chuỗi `trace` từ parameter export | Hết build | Không cần tự export parameter tiêu chuẩn; vẫn không đưa input tự do vào command/path. |
| Parameter `LOG_LEVEL` trùng Declarative `environment` hoặc plugin injection | `params.LOG_LEVEL` vẫn là input; `env.LOG_LEVEL`/shell phụ thuộc overlay và version/plugin | Theo scope overlay | Tránh trùng tên. Nếu bắt buộc, dùng marker vô hại và quan sát `params`, `env`, process trong lab; không coi đây là precedence phổ quát. |
| Tool thêm đường dẫn vào `PATH` | `PATH` của stage/process có thể được tool sửa | Theo scope tool/step | Dùng tool definition đã pin version; không hard-code path theo máy. |
| Một plugin/job property inject biến trùng tên | Phụ thuộc thứ tự/plugin đã cài | Phụ thuộc plugin | Đổi sang tên custom có namespace và kiểm chứng bằng lab. |

## Đọc và truyền giá trị đúng cách

### Shell process khác Jenkins env

Trong Groovy/Pipeline, đọc environment bằng `env.NAME`; đọc parameter bằng `params.NAME`. Parameter tiêu chuẩn cũng được Jenkins export thành environment lúc build bắt đầu, nên Unix shell có thể đọc `$NAME` hoặc `${NAME}` mà không cần export lại. `env` không phải một map Java/Groovy chung để mọi process đang chạy cùng thấy thay đổi; một assignment Pipeline chỉ ảnh hưởng các step được tạo sau trong scope phù hợp. Khi tên trùng nhau, `params.NAME` diễn tả input parameter còn `env.NAME` là chuỗi effective environment ở scope hiện tại.

```groovy
script {
  def tier = params.DEPLOY_TIER
  if (!(tier in ['sandbox', 'staging'])) {
    error('DEPLOY_TIER is not allowlisted')
  }
  env.RUN_MODE = tier == 'staging' ? 'preview' : 'sandbox'
}

sh 'printf "mode=%s build=%s\\n" "$RUN_MODE" "$BUILD_NUMBER"'
```

Mẫu chỉ map một parameter từ allowlist sang giá trị cố định và in metadata vô hại. Không lấy parameter tự do để đặt `PATH`, label, credential ID, hostname hay command.

### Quote và interpolation

Groovy interpolation xảy ra trước khi Jenkins gửi script tới shell. Shell interpolation xảy ra khi shell chạy. Giữ hai lớp này tách biệt, đặc biệt trong scope có credential.

| Mục tiêu | Mẫu phù hợp | Tránh |
| --- | --- | --- |
| Để shell Unix mở rộng biến environment | `sh 'printf "%s\\n" "$APP_COMPONENT"'` | `sh "... ${env.APP_COMPONENT} ..."` khi không cần Groovy. |
| Script nhiều dòng | `sh '''\nset -eu\nprintf '%s\\n' "$RUN_MODE"\n'''` | Triple double quote chứa `$TOKEN` hoặc `${TOKEN}`. |
| Đưa giá trị đã validate vào Groovy logic | `def enabled = params.DRY_RUN` | Nhét input tự do vào `sh "...${params.INPUT}..."`. |
| Windows Command Prompt | `bat 'echo APP_COMPONENT=%APP_COMPONENT%'` | Sao chép `$APP_COMPONENT` từ `sh` sang `bat`. |
| PowerShell | `powershell '$env:APP_COMPONENT'` | Giả định `%APP_COMPONENT%` hoạt động trong PowerShell. |

Single quote ở Groovy không tự làm dữ liệu không tin cậy trở nên an toàn: nó chỉ tránh Groovy nội suy. Input tự do vẫn không được đưa vào script, URL, path hoặc command. Trong shell Unix, luôn quote expansion như `"$NAME"` khi nó là dữ liệu, để space và glob không làm đổi argument. Trên Windows, quy tắc escape khác giữa `cmd.exe` và PowerShell; chọn đúng step/shell rồi kiểm tra trên agent Windows thực tế.

### Null boolean path và khác biệt hệ điều hành

Environment là chuỗi. `env.FLAG = false` trở thành chuỗi như `"false"`; trong Groovy, chuỗi không rỗng thường là truthy. Đọc boolean từ `params` qua `params.DRY_RUN`, hoặc so sánh tường minh với chuỗi đã được chuẩn hóa khi nguồn thực sự là environment.

```groovy
if (params.DRY_RUN) {
  echo 'Dry run is enabled.'
}

if ((env.FEATURE_FLAG ?: '').toLowerCase() == 'true') {
  echo 'Feature flag is explicitly true.'
}
```

`env.MISSING` có thể là `null` trong Groovy, còn shell với `set -u` sẽ lỗi khi mở rộng biến chưa đặt. Dùng default có chủ đích, ví dụ `${OPTIONAL_NAME:-}` trong POSIX shell, nhưng đừng biến default thành cách bỏ qua một config bắt buộc: kiểm tra `test -n "$REQUIRED_NAME"` và fail sớm khi cần.

`PATH` dùng dấu `:` trên Unix và `;` trên Windows; case sensitivity của tên biến cũng phụ thuộc OS/tool. Đường dẫn có space cần được quote. Không tách/ghép `PATH` bằng một rule dùng cho cả `sh`, `bat` và PowerShell. Đặt toolchain trong image, node configuration hoặc `tools` đã review thay vì dựa vào path local của một agent.

## Jenkinsfile mẫu an toàn

Mẫu Declarative này thể hiện parameter, Pipeline/stage `environment`, `withEnv` và xử lý boolean. Nó không checkout, không gọi network, không dùng credential và chỉ in metadata không nhạy cảm. Cần một agent Unix có label placeholder `sandbox-linux`; thay label này bằng **pool sandbox** của bạn, không phải controller.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timeout(time: 3, unit: 'MINUTES')
  }

  parameters {
    choice(
      name: 'DEPLOY_TIER',
      choices: ['sandbox', 'staging'],
      description: 'Lựa chọn mô phỏng; không cấp quyền deploy.'
    )
    booleanParam(
      name: 'DRY_RUN',
      defaultValue: true,
      description: 'Chỉ điều khiển output sandbox.'
    )
    choice(
      name: 'LAB_PARAM_MARKER',
      choices: ['parameter-baseline'],
      description: 'Marker vô hại để quan sát params, env và process environment.'
    )
    choice(
      name: 'LAB_COLLISION_MARKER',
      choices: ['parameter-baseline'],
      description: 'Marker vô hại để quan sát collision với stage environment.'
    )
  }

  environment {
    APP_COMPONENT = 'example-component'
    LOG_LEVEL = 'info'
  }

  stages {
    stage('Validate context') {
      agent { label 'sandbox-linux' }
      steps {
        script {
          def tiers = ['sandbox': 'sandbox', 'staging': 'preview']
          def selected = tiers[params.DEPLOY_TIER]
          if (selected == null) {
            error('DEPLOY_TIER is not allowlisted')
          }
          env.RUN_MODE = params.DRY_RUN ? "${selected}-dry-run" : "${selected}-check"
          if (params.LAB_PARAM_MARKER != 'parameter-baseline') {
            error('LAB_PARAM_MARKER is not allowlisted')
          }
          echo "params.LAB_PARAM_MARKER=${params.LAB_PARAM_MARKER}"
          echo "env.LAB_PARAM_MARKER=${env.LAB_PARAM_MARKER}"
        }
        sh '''
          set -eu
          test -n "$RUN_MODE"
          test "$LAB_PARAM_MARKER" = 'parameter-baseline'
          printf 'process.LAB_PARAM_MARKER=%s\\n' "$LAB_PARAM_MARKER"
          printf 'component=%s mode=%s level=%s build=%s\\n' \\
            "$APP_COMPONENT" "$RUN_MODE" "$LOG_LEVEL" "$BUILD_NUMBER"
        '''
      }
    }

    stage('Observe parameter collision') {
      agent { label 'sandbox-linux' }
      environment {
        LAB_COLLISION_MARKER = 'declarative-overlay'
      }
      steps {
        script {
          echo "params.LAB_COLLISION_MARKER=${params.LAB_COLLISION_MARKER}"
          echo "env.LAB_COLLISION_MARKER=${env.LAB_COLLISION_MARKER}"
        }
        sh '''
          set -eu
          printf 'process.LAB_COLLISION_MARKER=%s\\n' "$LAB_COLLISION_MARKER"
        '''
      }
    }

    stage('Observe short override') {
      agent { label 'sandbox-linux' }
      environment {
        LOG_LEVEL = 'debug'
      }
      steps {
        withEnv(['LOG_LEVEL=trace']) {
          sh '''
            set -eu
            test "$LOG_LEVEL" = 'trace'
            printf 'inside-withEnv=%s\\n' "$LOG_LEVEL"
          '''
        }
        sh '''
          set -eu
          test "$LOG_LEVEL" = 'debug'
          printf 'after-withEnv=%s\\n' "$LOG_LEVEL"
        '''
      }
    }
  }

  post {
    always {
      echo 'Sandbox example finished; no credential, deploy, artifact, or network action was used.'
    }
  }
}
```

`RUN_MODE` được tạo từ allowlist, boolean và chuỗi cố định. `DEPLOY_TIER` không được nội suy vào shell. `LAB_PARAM_MARKER` chứng minh cùng parameter tiêu chuẩn xuất hiện qua `params`, `env` và process environment. `LAB_COLLISION_MARKER` chỉ quan sát collision: `params` phải còn input đã chọn, còn `env`/process phản ánh overlay effective của stage trên Jenkins đang chạy. `LOG_LEVEL` là ví dụ override vô hại: stage che Pipeline và `withEnv` che stage; test sau closure chứng minh giá trị stage trở lại.

Để chọn cấu trúc Pipeline, xem [Declarative Pipeline](/docs/pipelines/declarative) hoặc [Scripted Pipeline](/docs/pipelines/scripted). Parameter, `environment` và `withEnv` được giải thích bổ sung tại [Environment & Parameters](/docs/pipelines/environment-parameters).

## Secret và credentials

### Environment không phải secret store

Không đặt token, mật khẩu, private key, connection string nhạy cảm hoặc secret bootstrap trong Global properties, node property, folder/job environment, Jenkinsfile, parameter hoặc file `.env` commit vào SCM. Những nguồn này có thể bị nhiều job, process con, plugin, log/diagnostic, workspace, backup hoặc người có quyền cấu hình quan sát.

Dùng Jenkins Credentials với credential ID có nghĩa rõ, scope folder/job nhỏ nhất và permission tối thiểu. Tách token đọc source, token publish artifact và credential deploy. Một parameter tên `TARGET=production` không cấp authorization và không được dùng để chọn credential ID tùy ý. Binding credential là quyết định tin cậy cả Jenkinsfile, Shared Library, agent image, process con và source kích hoạt stage.

### Binding ngắn hạn và giới hạn masking

`withCredentials` của Credentials Binding nạp credential vào closure hẹp. Dùng single quote/triple single quote để shell mới mở rộng biến, tránh Groovy interpolation của secret.

```groovy
withCredentials([
  string(credentialsId: 'placeholder-service-token', variable: 'SERVICE_TOKEN')
]) {
  sh '''
    set +x
    # Công cụ đã review đọc SERVICE_TOKEN từ environment.
    ./tool --use-environment-token
  '''
}
```

`placeholder-service-token` chỉ là **credential ID placeholder**, không phải giá trị secret. Đoạn này không phải lab chạy được nếu ID/tool chưa tồn tại. Trong Pipeline thật, binding chỉ bao quanh command cần capability; không chuyển secret thành argument, URL hoặc file output nếu công cụ có cách đọc environment/file descriptor an toàn hơn.

<Callout type="error" title="Masking không phải ranh giới bảo mật">
  Jenkins cố gắng mask secret đã biết trong Console Output, nhưng không ngăn code đã nhận secret gửi ra network, encode/biến đổi nó, ghi nó vào file/artifact/cache, hoặc để process khác cùng agent đọc environment/process arguments. Không dùng `echo`, `printenv`, `env`, `set`, `set -x`, debug dump, artifact glob rộng hay report toàn workspace trong scope binding.
</Callout>

Tránh Groovy interpolation, `echo`, command-line/proc argv, URL, log, artifact, cache, test report và notification chứa secret. Không chạy PR/fork hoặc source không tin cậy trên agent có credential phát hành; áp dụng least privilege cho folder/job, identity agent, filesystem và egress. Nếu nghi ngờ lộ lọt, dừng sử dụng credential và rotate/thu hồi theo incident process; xóa log không thu hồi bản sao đã bị đọc. Xem quy trình và file binding tại [Credentials trong Pipeline](/docs/pipelines/credentials).

## Lab sandbox: quan sát override vô hại

### Chuẩn bị và Jenkinsfile

Lab không cần repository, credential, artifact, network hay secret. Cần controller sandbox, agent Unix online với label `sandbox-linux`, shell `sh` và quyền tạo Pipeline job. Đặt executor built-in node/controller là `0` trên môi trường production; không dùng controller thay agent để làm lab chạy nhanh hơn.

1. Tạo một Pipeline job tạm tên `environment-scope-lab` và dán Jenkinsfile ở phần [Jenkinsfile mẫu an toàn](#jenkinsfile-mẫu-an-toàn).
2. Mở **Pipeline Syntax** hoặc Declarative Directive Generator trên controller để xác nhận plugin/cú pháp. Thay `sandbox-linux` chỉ bằng label của pool lab tách biệt.
3. Chạy lần đầu với `DEPLOY_TIER=sandbox`, `DRY_RUN=true` và giữ hai marker ở default. Đọc riêng ba dòng `params.LAB_PARAM_MARKER`, `env.LAB_PARAM_MARKER`, `process.LAB_PARAM_MARKER`; không thêm `env`, `printenv` hay secret để debug.
4. Ghi ba dòng `LAB_COLLISION_MARKER` trong stage collision. `params` phải biểu diễn input `parameter-baseline`; đối chiếu `env` và process với `declarative-overlay` để ghi nhận overlay trên Jenkins/version plugin của bạn. Không dùng quan sát này để suy ra precedence cho plugin hay parameter type khác.
5. Chạy lần hai với `DEPLOY_TIER=staging` và `DRY_RUN=false`. So sánh `mode` với build đầu, rồi quan sát hai dòng `inside-withEnv` và `after-withEnv`.
6. Xóa job lab khi không còn cần. Vì mẫu không checkout/tạo artifact/credential, cleanup chỉ cần xóa job sandbox theo policy của đội; không xóa history hay workspace của job khác.

### Kết quả mong đợi và cleanup

| Thao tác | Kết quả mong đợi | Điều được chứng minh |
| --- | --- | --- |
| Build `sandbox`, dry run | `mode=sandbox-dry-run`; `level=info` tại stage đầu | Parameter được map trong Jenkinsfile sau validation; không đi vào command tự do. |
| `LAB_PARAM_MARKER` không trùng tên | Ba dòng `params`, `env`, `process` cùng là `parameter-baseline` | Parameter tiêu chuẩn có API `params` và được export thành environment cho step process. |
| `LAB_COLLISION_MARKER` trùng stage `environment` | `params` là `parameter-baseline`; ghi nhận `env` và process effective trên instance | Collision có thể có overlay; không khẳng định precedence phổ quát cho plugin/type tùy biến. |
| Build `staging`, không dry run | `mode=preview-check`; không deploy/network | Boolean được xử lý như boolean, choice đi qua allowlist. |
| Trong `withEnv` | `inside-withEnv=trace` | Closure gần process che stage-level value. |
| Sau `withEnv` | `after-withEnv=debug`; build `SUCCESS` | Override kết thúc khi closure kết thúc; stage value được khôi phục. |
| Cleanup | Job tạm được xóa hoặc giữ theo retention lab; không có artifact/secret cần thu hồi | Lab không tạo dữ liệu nhạy cảm hay chạm production. |

<Callout type="idea" title="Debug theo tên marker, không dump environment">
  Khi cần biết scope, thêm một custom marker vô hại như `LAB_ENV_MARKER=scope-test` và chỉ in đúng marker đó. Điều này giảm rủi ro vô tình lộ token, URL nội bộ hoặc metadata nhạy cảm trong toàn bộ environment.
</Callout>

## Troubleshooting

| Triệu chứng | Nguyên nhân khả dĩ | Cách xử lý có bằng chứng |
| --- | --- | --- |
| Biến rỗng trong `sh` | Sai scope, agent chưa được cấp, nhầm `params` với `env`, hoặc tên/case khác | Kiểm tra stage/agent, đọc đúng namespace và in một marker không nhạy cảm. |
| `WORKSPACE` rỗng hoặc không đúng | Code chạy trước allocation, stage khác agent, hoặc không có workspace context | Xác minh `NODE_NAME`/stage/queue; không giả định workspace chia sẻ giữa agent. |
| `withEnv` không thấy sau closure | Đây là behavior đúng: closure đã kết thúc | Đặt override ở block bao đúng step cần nó, không mở rộng thành global. |
| `env.NAME =` không đổi giá trị Declarative | Value được khai báo ở `environment` hoặc bị scope gần hơn che | Dùng `withEnv` cho override tạm, hoặc tạo biến runtime tên mới sau validation. |
| Build nhận tool/version sai | Agent/image khác, tool name không khớp hoặc `PATH` bị sửa thủ công | Kiểm tra label, `--version`, tool definition và installer log trên đúng agent. |
| Parameter tiêu chuẩn không thấy trong shell | Sai tên/case, build không dùng parameter chuẩn, hoặc overlay/plugin đã đổi cùng tên | Kiểm tra `params.NAME`, `env.NAME` và một process marker trong build mới; không tự export mù quáng hoặc dump toàn environment. |
| Secret hiện `****` nhưng vẫn có rủi ro | Masking che console có giới hạn, không chặn exfiltration/file/process | Thu hẹp binding, dừng debug dump, đánh giá artifact/log và rotate khi nghi ngờ lộ. |
| Build chờ hoặc chạy trên agent sai | Label/executor/policy không khớp | Đọc Build Queue và node labels trước khi đổi `agent` hay controller executor. |

## Checklist

- [ ] Tôi biết biến này đến từ controller/system, agent, job/folder, parameter, Jenkinsfile, tool hay credential binding.
- [ ] Mỗi custom environment có owner, mục đích và scope hẹp nhất; global property chỉ chứa cấu hình không nhạy cảm.
- [ ] Tôi phân biệt `params.NAME` (input theo kiểu parameter), `env.NAME` (chuỗi effective) và biến process shell; biết parameter tiêu chuẩn được export lúc build bắt đầu.
- [ ] Tôi tránh collision giữa parameter, Pipeline/stage `environment`, `withEnv` và plugin injection; khi cần, tôi kiểm chứng `params`/`env`/process trên instance thay vì giả định precedence phổ quát.
- [ ] Pipeline-level, stage-level và `withEnv` không dùng chung tên vô tình; override tạm nằm trong closure ngắn.
- [ ] Tôi không dùng `env.NAME =` để sửa hằng Declarative và không dùng precedence để vượt policy/authorization.
- [ ] Built-in variable chỉ được dùng khi context thực sự có; controller/agent và workspace được xác minh trên build mới.
- [ ] Shell script dùng quote đúng, không Groovy-interpolate secret; boolean/null/path được xử lý tường minh và theo OS.
- [ ] Toolchain được quản lý bằng image/node/tool definition đã review, pin version; không sửa `PATH` mù quáng.
- [ ] Secret không nằm trong environment global/job, parameter, Jenkinsfile, log, proc argv, URL, artifact, cache hoặc report.
- [ ] Credential dùng ID, scope folder/job nhỏ, `withCredentials` ngắn, least privilege và agent tách khỏi workload không tin cậy.
- [ ] Tôi không coi masking là bảo mật; có quy trình rotate/thu hồi và cleanup khi có nghi ngờ lộ lọt.
- [ ] Lab đã xác minh precedence bằng marker vô hại, có kết quả mong đợi và cleanup rõ ràng.

## Nguồn Jenkins chính thức

- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/) — `environment`, built-in variables, parameters và credential helper.
- [Pipeline Syntax — parameters](https://www.jenkins.io/doc/book/pipeline/syntax/#parameters) — parameter được expose qua `params` và export thành environment variables khi build bắt đầu.
- [Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — Declarative `environment`, `tools`, `parameters`, agent và step.
- [Pipeline: Basic Steps](https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/) — tham chiếu `withEnv` và các Pipeline step cơ bản.
- [Pipeline Global Variable Reference](https://www.jenkins.io/doc/book/pipeline/getting-started/#global-variable-reference) — global variables/steps khả dụng trên Jenkins instance.
- [System Configuration](https://www.jenkins.io/doc/book/system-administration/system-configuration/) — global properties, system configuration và phạm vi quản trị.
- [Using Jenkins agents](https://www.jenkins.io/doc/book/using/using-agents/) — controller, agent, executor và workspace.
- [Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — credential store, scope và permission.
- [Credentials Binding plugin](https://plugins.jenkins.io/credentials-binding/) — `withCredentials`, masking và cảnh báo secret file/workspace.
- [Jenkins Security](https://www.jenkins.io/doc/book/security/) — authorization, controller protection và vận hành bảo mật.

## Đọc tiếp

<Cards>
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu controller, agent, workspace và ranh giới tin cậy." />
  <Card title="Cấu hình hệ thống" href="/docs/administration/system-configuration" description="Quản lý global properties, service settings và tool definitions có kiểm soát." />
  <Card title="Tổng quan Agent" href="/docs/agents/overview" description="Chọn pool agent và lifecycle phù hợp cho workload." />
  <Card title="Labels & Executors" href="/docs/agents/labels-executors" description="Route Pipeline đến đúng agent và đọc lý do queue." />
  <Card title="Tổng quan Pipeline" href="/docs/pipelines/overview" description="Ôn Pipeline as Code, stage, step và quan sát build." />
  <Card title="Declarative Pipeline" href="/docs/pipelines/declarative" description="Tổ chức Jenkinsfile có environment, stage và policy rõ ràng." />
  <Card title="Scripted Pipeline" href="/docs/pipelines/scripted" description="Dùng `node`, Groovy và Pipeline step trong flow động có kiểm soát." />
  <Card title="Environment & Parameters" href="/docs/pipelines/environment-parameters" description="Đi sâu vào `environment`, `params` và `withEnv` trong Declarative Pipeline." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Bind credential ở scope hẹp và hiểu giới hạn masking." />
</Cards>
