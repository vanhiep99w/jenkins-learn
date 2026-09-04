---
title: "Job DSL: seed job và generated jobs"
description: "Quản trị Jenkins job bằng Groovy DSL với seed job, ownership, review và cơ chế gỡ bỏ an toàn."
---

Job DSL biến cấu hình job Jenkins thành mã Groovy được phiên bản hóa. Một **seed job** đọc các file DSL đã review rồi tạo hoặc cập nhật các folder, job và view được gọi chung là **generated items**. Cách này phù hợp khi nhiều job có cùng quy ước, nhưng seed job cũng có thể thay đổi cấu hình Jenkins trên diện rộng; hãy bắt đầu trong sandbox và giữ quyền của nó ở mức tối thiểu.

<Callout type="warn" title="Không chạy seed thử nghiệm trên production">
  Ví dụ và lab bên dưới chỉ tạo job sandbox. Không cấp quyền administrator, credential thật, network production hoặc quyền xóa hàng loạt cho seed job. Một seed chạy với quyền cao có thể biến thay đổi Groovy nhỏ thành thay đổi lớn trên controller.
</Callout>

## Mục lục

- [Job DSL giải quyết việc gì?](#job-dsl-giải-quyết-việc-gì)
  - [Phân biệt với Pipeline, JCasC và Multibranch](#phân-biệt-với-pipeline-jcasc-và-multibranch)
  - [Giả định phiên bản và DSL API Viewer](#giả-định-phiên-bản-và-dsl-api-viewer)
- [Mô hình seed, source và generated items](#mô-hình-seed-source-và-generated-items)
  - [Luồng thay đổi có kiểm soát](#luồng-thay-đổi-có-kiểm-soát)
  - [Naming, folder và lookupStrategy](#naming-folder-và-lookupstrategy)
  - [Idempotency và ownership](#idempotency-và-ownership)
- [Seed workflow tái lập từ SCM](#seed-workflow-tái-lập-từ-scm)
  - [Cấu trúc repository](#cấu-trúc-repository)
  - [Jenkinsfile cho seed job](#jenkinsfile-cho-seed-job)
  - [Ví dụ DSL an toàn](#ví-dụ-dsl-an-toàn)
- [Vòng đời generated jobs và removal safety](#vòng-đời-generated-jobs-và-removal-safety)
  - [Review và promotion](#review-và-promotion)
  - [removedJobAction và orphan handling](#removedjobaction-và-orphan-handling)
- [Bảo mật seed job và Groovy DSL](#bảo-mật-seed-job-và-groovy-dsl)
  - [Sandbox, Script Approval và nguồn tin cậy](#sandbox-script-approval-và-nguồn-tin-cậy)
  - [Quyền, credential và input](#quyền-credential-và-input)
- [Lab local sandbox](#lab-local-sandbox)
  - [Điều kiện và chuẩn bị](#điều-kiện-và-chuẩn-bị)
  - [Chạy seed và quan sát kết quả](#chạy-seed-và-quan-sát-kết-quả)
  - [Cleanup](#cleanup)
- [Troubleshooting](#troubleshooting)
- [Checklist vận hành](#checklist-vận-hành)
- [Nguồn chính thức](#nguồn-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Job DSL giải quyết việc gì?

Plugin **Job DSL** cung cấp một DSL Groovy để khai báo item Jenkins. Thay vì tạo 50 job giống nhau qua UI, nhóm lưu file như `jobs/catalog.groovy` trong SCM, review diff, rồi để một seed job áp dụng đúng tập file đó. DSL đặc biệt hữu ích cho folder hierarchy, Freestyle job legacy, Pipeline job có cấu hình SCM lặp lại và các cấu hình job mà Jenkinsfile không sở hữu.

Job DSL không thay thế source code ứng dụng. Nó là **job configuration as code**: code DSL tạo đối tượng Jenkins và cấu hình nguồn/trigger của chúng. Sau khi được tạo, một Pipeline job vẫn đọc `Jenkinsfile` từ repository ứng dụng khi build; job DSL không thực thi các stage của `Jenkinsfile` trong lúc seed chạy.

### Phân biệt với Pipeline, JCasC và Multibranch

| Công cụ/khái niệm | Sở hữu chính | Ví dụ | Không nên dùng thay cho |
| --- | --- | --- | --- |
| **Job DSL plugin** | Folder, job, view và cấu hình job sinh bởi seed. | Tạo `teams/payments/catalog-verify` có SCM và build step. | Logic CI/CD của ứng dụng hoặc cấu hình toàn controller. |
| **Declarative/Scripted Pipeline** | Flow một build: agent, stage, step, artifact, gate. | `Jenkinsfile` chạy test và build cho `catalog`. | Hàng loạt job/folder qua một vòng lặp DSL không kiểm soát. |
| **JCasC** | Cấu hình controller và plugin ở scope instance. | Security realm, Jenkins URL hoặc global configuration. | Nguồn cấu hình từng job có lifecycle riêng. |
| **Multibranch Pipeline** | Khám phá branch/PR và job con theo SCM source. | Tạo child job cho mỗi branch chứa `Jenkinsfile`. | Catalog job tĩnh hoặc policy folder được DSL quản lý. |

Declarative Pipeline ưu tiên cấu trúc `pipeline { ... }` dễ validate. Scripted Pipeline linh hoạt Groovy hơn. Cả hai mô tả **một lần chạy**; Job DSL mô tả **đối tượng job** trước khi lần chạy đó tồn tại. JCasC và Job DSL có thể cùng dùng, nhưng phải có ranh giới ownership: JCasC quản lý controller/plugin configuration, còn một seed được giới hạn scope quản lý generated items.

Multibranch có orphan strategy riêng cho child items khi branch biến mất. Đừng dùng Job DSL để cố tái tạo cơ chế khám phá branch đó. Khi cần Multibranch, Job DSL có thể chỉ tạo một Multibranch job cấp cha nếu plugin SCM tương ứng hỗ trợ DSL trên instance; cách discovery và orphan handling vẫn thuộc Multibranch/plugin SCM, không phải `removedJobAction` của seed.

### Giả định phiên bản và DSL API Viewer

Tài liệu này giả định một Jenkins LTS được tổ chức hỗ trợ, plugin **Job DSL** tương thích với Jenkins đó, và các plugin cần cho loại item ví dụ đã được cài: Pipeline để có `pipelineJob`, Git để có cấu hình `git`, và plugin liên quan nếu DSL gọi tính năng khác. `jobDsl` Pipeline step cần Job DSL plugin; nó không phải Jenkins core.

DSL thay đổi theo version của Job DSL và plugin đóng góp API. Vì vậy, không coi snippet trên Internet là contract bất biến. Trên **chính controller sandbox**, mở **Manage Jenkins → Job DSL API Viewer** hoặc URL sau để xem method/property thực sự khả dụng:

```text
<JENKINS_URL>/plugin/job-dsl/api-viewer/index.html
```

API Viewer phản ánh plugin đang cài, nên là nguồn tra cú pháp trước khi merge. Ghi Jenkins core, Java, Job DSL plugin và plugin mở rộng DSL vào pull request hoặc change record. Nâng plugin trước ở sandbox, chạy seed canary, kiểm tra deprecation và diff generated configuration rồi mới promotion.

## Mô hình seed, source và generated items

### Luồng thay đổi có kiểm soát

```text
Developer
   │ pull request: jobs/**/*.groovy
   ▼
Repository DSL ── review + syntax/API check ──► protected branch
   │                                             │
   │ checkout revision đã duyệt                  ▼
   └──────────────────────────────────────► seed job sandbox
                                                  │ Job DSL plugin, sandbox enabled
                                                  ▼
                                      folder/job generated trong namespace lab
                                                  │ review result, config diff, log
                                                  ▼
                                      promotion seed riêng, scope hẹp
```

Seed job là consumer duy nhất được phép áp dụng DSL cho namespace của nó. Repository DSL phải có owner, branch protection và review tương tự source chứa hạ tầng. Một seed chạy từ branch/pull request không tin cậy không được phép cập nhật folder/job dùng chung.

### Naming, folder và lookupStrategy

Đặt tên để người đọc biết owner và môi trường. Ví dụ dùng prefix `lab/teams/payments/` cho sandbox, còn production có namespace khác đã được phê duyệt. Không để seed lab ghi vào `teams/` hoặc root production vì một path ngắn “tiện” hơn.

Khai báo folder trước, sau đó dùng đường dẫn đầy đủ, ổn định cho item:

```text
lab/
└── teams/
    └── payments/
        └── catalog-verify
```

`lookupStrategy` quyết định cách Job DSL diễn giải tên tương đối. Với `SEED_JOB`, tên tương đối được resolve từ folder chứa seed job. Ví dụ seed ở `lab/seeds/catalog` và DSL khai báo `pipelineJob('catalog-ci')` sẽ tạo `lab/seeds/catalog/catalog-ci`, không phải job ở root. Điều này giúp mỗi seed bị neo vào namespace của nó, nhưng cũng dễ tạo path sai nếu người viết không hiểu vị trí seed.

Trong ví dụ này, DSL dùng path đầy đủ `lab/teams/payments/...` **và** `lookupStrategy: 'SEED_JOB'`. Path đầy đủ làm đích rõ trong review; strategy vẫn bảo vệ các tham chiếu tương đối nếu được thêm sau này. Chọn một convention, test trong folder sandbox và không đổi strategy giữa các lần chạy chỉ vì muốn sửa nhanh một path.

### Idempotency và ownership

Với cùng revision DSL, plugin và input, seed nên tạo lại cùng cấu hình: lần đầu tạo item, các lần sau cập nhật item đã được plugin nhận diện. Đây là **idempotency** ở mức cấu hình, không có nghĩa mọi side effect của một build do generated job chạy cũng idempotent.

Plugin ghi nhận item nào được seed sinh ra. Cấu hình UI thủ công trên generated job có thể bị seed ghi đè ở lần tiếp theo, nên thiết lập một trong hai ownership rõ ràng:

- DSL là source of truth: mọi thay đổi job đi qua PR và seed; không sửa UI trừ incident được ghi nhận rồi đưa ngược về DSL.
- Job do đội khác sở hữu: không đưa path đó vào targets của seed và không để hai seed cùng tạo một tên.

Một item chỉ nên có một seed owner. Chia catalog theo folder/namespace, ghi owner trong description và review log seed sau mỗi lần chạy. Trước khi đổi tên hoặc chuyển folder, coi đó là migration: tạo đích mới trong sandbox, xác minh trigger/quyền/history cần giữ, rồi xử lý item cũ bằng quy trình riêng thay vì để removal tự diễn ra.

## Seed workflow tái lập từ SCM

### Cấu trúc repository

Repository ví dụ sau chỉ chứa DSL. Tên `lab` xuất hiện trong source để giảm nguy cơ copy nhầm vào namespace thật.

```text
jenkins-job-dsl/
├── Jenkinsfile
└── jobs/
    └── catalog-verify.groovy
```

Tạo một Pipeline job bootstrap tên `lab/seeds/catalog` bằng UI **trong controller local sandbox**. Job này lấy `Jenkinsfile` từ SCM. Đây là bootstrap tối thiểu và được ghi nhận như một ngoại lệ; sau đó logic generate nằm hoàn toàn trong repository. Đặt URL SCM và credential đọc repository bằng cấu hình job/Jenkins Credentials nếu repository private, không đặt token trong DSL hoặc URL Git.

### Jenkinsfile cho seed job

Jenkinsfile dưới đây cần agent Linux sandbox có Git và Job DSL plugin. `jobDsl` dùng `targets` cố định trong repository đã checkout, `sandbox: true` và `removedJobAction: 'DISABLE'`. Nó không tạo credential, không đọc parameter do người dùng nhập và không deploy.

```groovy
pipeline {
  agent { label 'linux && ci-sandbox' }

  options {
    skipDefaultCheckout(true)
    disableConcurrentBuilds()
    timeout(time: 5, unit: 'MINUTES')
  }

  stages {
    stage('Checkout DSL đã review') {
      steps {
        checkout scm
        sh '''
          set -eu
          test -f Jenkinsfile
          test -n "$(find jobs -type f -name '*.groovy' -print -quit)"
          git rev-parse --verify HEAD
        '''
      }
    }

    stage('Generate namespace lab') {
      steps {
        jobDsl(
          targets: 'jobs/**/*.groovy',
          lookupStrategy: 'SEED_JOB',
          sandbox: true,
          ignoreExisting: false,
          failOnMissingPlugin: true,
          unstableOnDeprecation: true,
          removedJobAction: 'DISABLE',
          removedViewAction: 'IGNORE'
        )
      }
    }
  }

  post {
    always {
      echo "Seed revision=${env.GIT_COMMIT ?: 'see checkout log'} result=${currentBuild.currentResult}"
    }
  }
}
```

`disableConcurrentBuilds()` tránh hai lần seed cùng sửa catalog trong lab. Nó không thay thế review hay lock liên controller. `failOnMissingPlugin: true` làm seed thất bại thay vì âm thầm bỏ qua DSL cần plugin; `unstableOnDeprecation: true` biến API cũ thành tín hiệu cần xử lý trước khi promotion. Kiểm tra các option này trong API Viewer/Pipeline Syntax của instance trước khi tiêu chuẩn hóa, vì version plugin là giả định bắt buộc.

Nếu một seed có nhiều `jobDsl` build step, chỉ để removal action ở **step cuối** sau khi đã kiểm tra hành vi plugin/version. Nếu mỗi step đều xử lý removal, item tạo ở step trước có thể bị nhận nhầm là không còn tồn tại. Đơn giản nhất là một targets pattern và một step cho một namespace.

### Ví dụ DSL an toàn

`jobs/catalog-verify.groovy` dưới đây tạo folder và một Freestyle job lab. Job chỉ checkout URL public không tồn tại dành cho minh họa và xác nhận file `Jenkinsfile`; nó không có credential, secret, trigger hay quyền deploy. `git` và `shell` trong DSL cần API do plugin phù hợp cung cấp, vì vậy hãy đối chiếu API Viewer trước khi chạy.

```groovy
folder('lab') {
  description('Namespace chỉ dành cho Job DSL local sandbox.')
}

folder('lab/teams') {
  description('Nhóm generated jobs trong lab.')
}

folder('lab/teams/payments') {
  description('Owner: payments-platform; thay đổi qua repository jenkins-job-dsl.')
}

job('lab/teams/payments/catalog-verify') {
  description('Generated by lab/seeds/catalog. Do not edit in UI; change jobs/catalog-verify.groovy.')

  logRotator {
    numToKeep(10)
  }

  scm {
    git {
      remote {
        url('https://example.invalid/training/catalog.git')
      }
      branches('*/main')
    }
  }

  steps {
    shell('test -f Jenkinsfile')
  }
}
```

Để tạo một Pipeline job thay vì Freestyle, dùng `pipelineJob('lab/teams/payments/catalog-ci')` và cấu hình definition/SCM theo snippet do API Viewer của controller tạo ra. `pipelineJob` cần plugin Pipeline tương thích. Chính `Jenkinsfile` của repository ứng dụng mới nên chứa stage, agent và logic CI/CD; seed chỉ tạo wrapper job cùng naming, SCM, quyền và policy đã review.

<Callout type="info" title="Không nhúng credential vào DSL">
  Không dùng token trong `remote { url(...) }`, không gọi `withCredentials` trong Job DSL và không ghi password vào description, parameter mặc định hay shell command. Gắn credential đọc SCM qua cấu hình job/folder được quản lý có scope tối thiểu, hoặc dùng SCM public cho lab. Nếu một generated Pipeline cần secret lúc chạy, binding phải nằm trong Jenkinsfile đáng tin cậy với scope stage ngắn nhất.
</Callout>

## Vòng đời generated jobs và removal safety

### Review và promotion

Một quy trình an toàn tách discovery khỏi áp dụng:

1. **Thay đổi DSL qua pull request.** Review naming, path, plugin API, SCM URL, build step, quyền dự kiến và liệu có chạm namespace owner khác không.
2. **Chạy canary ở sandbox.** Seed vào prefix như `lab/`; kiểm tra Console Output, danh sách generated/updated/disabled items và cấu hình job đã tạo. Không dùng seed production để “test nhanh”.
3. **Promote revision bất biến.** Merge hoặc tag revision đã đạt review, rồi để seed của môi trường đích checkout đúng protected revision. Không để seed production bám một branch cá nhân hoặc `latest` library.
4. **Ghi bằng chứng và rollback.** Ghi commit SHA, Jenkins/Job DSL/plugin versions, seed build number và danh sách item thay đổi. Rollback bằng revision DSL đã biết tốt, chạy trước trong namespace an toàn nếu removal policy có liên quan.

Review phải coi mỗi diff DSL là thay đổi hạ tầng. Một dòng thêm `shell`, SCM source, trigger hoặc authorization có thể thay đổi bề mặt thực thi của tất cả job được sinh. Cần owner của folder, platform/Jenkins và security review khi diff chạm quyền, source không tin cậy, credential, network hoặc removal policy.

### removedJobAction và orphan handling

`removedJobAction` nói với Job DSL phải làm gì với **job đã do seed quản lý** nhưng không còn được tạo bởi lần chạy hiện tại. Các giá trị thường gặp là:

| Giá trị | Hành vi | Khi nào dùng |
| --- | --- | --- |
| `IGNORE` | Không thay đổi item cũ. | Discovery ban đầu hoặc khi chưa có inventory đáng tin cậy. |
| `DISABLE` | Giữ cấu hình/lịch sử nhưng ngăn job chạy theo cách Jenkins hỗ trợ. | Mặc định an toàn sau review: có thời gian xác minh owner và migration. |
| `DELETE` | Xóa item mà plugin coi là removed. | Chỉ theo runbook đã phê duyệt, phạm vi rất hẹp và có backup/rollback đã kiểm chứng. |

Ví dụ chọn `DISABLE`, không phải `DELETE`. Trước khi bật bất kỳ removal action nào, lập inventory generated items, xác định seed owner, thử remove **một** item lab không có dữ liệu giá trị và review kết quả. Không đổi targets glob, lookup strategy, folder prefix và removal action trong cùng một lần chạy. Những thay đổi kết hợp này làm khó biết item nào sẽ bị coi là orphan.

Orphan handling là vấn đề lifecycle, không phải cơ chế dọn dẹp tự động. Một job biến mất khỏi DSL có thể là đổi tên, move folder, tách repository hoặc lỗi glob. Disable trước cho phép owner đối chiếu downstream trigger, lịch sử và quyền; chỉ xóa theo retention/runbook được phê duyệt. Backup controller và khả năng restore được kiểm chứng là điều kiện vận hành bổ sung, không phải lý do cho phép xóa hàng loạt.

<Callout type="error" title="Seed quyền cao + DELETE là tổ hợp rủi ro">
  Không chạy seed có quyền global admin, không cấp nó quyền xóa mọi folder, và không dùng `DELETE` chỉ vì catalog “trông đúng”. Giới hạn seed trong folder namespace, áp dụng principle of least privilege và yêu cầu review độc lập cho thay đổi removal. Dừng rollout khi log cho thấy item ngoài inventory bị tác động.
</Callout>

## Bảo mật seed job và Groovy DSL

### Sandbox, Script Approval và nguồn tin cậy

Job DSL là Groovy. `sandbox: true` yêu cầu script chạy dưới Groovy sandbox của Jenkins; các method/signature không được cho phép có thể chờ **In-process Script Approval**. Sandbox giảm bề mặt thực thi nhưng không biến DSL thành dữ liệu vô hại, cũng không tự xác thực nguồn SCM hay quyền của seed.

- **Nguồn tin cậy** là repository/branch có owner, protected branch, review bắt buộc và quyền ghi giới hạn. Chỉ source này được promotion tới seed quản lý catalog thật.
- **Nguồn không tin cậy** gồm fork, pull request mở, branch cá nhân hoặc DSL do người dùng tải lên. Không chạy chúng trong seed có quyền tạo/cấu hình job; dùng controller/prefix sandbox cô lập nếu cần học hoặc kiểm tra.
- **Script Approval** là quyết định bảo mật, không phải nút để build xanh. Đọc chữ ký method, code và caller; từ chối signature cho phép I/O, reflection, process execution, truy cập credential hoặc leo thang quyền nếu không có use case đã review.
- **Trusted** không có nghĩa bỏ sandbox mặc định. Chỉ cân nhắc script không sandbox khi có thiết kế, owner, review và ranh giới controller/agent rõ; đa số catalog nên tiếp tục dùng sandbox.

Không tự động approve signatures từ log hay copy danh sách approval giữa controller. Lưu lại lý do, revision, reviewer và scope của mỗi approval; xem lại sau khi plugin/core thay đổi. Một approval rộng có thể mở đường cho nhiều script khác sử dụng cùng method.

### Quyền, credential và input

Seed cần quyền tạo/đọc/cấu hình item **chỉ trong folder namespace đã định**, cùng quyền Build cần thiết để chạy. Tên permission chính xác tùy authorization strategy/plugin, nên administrator phải dùng màn hình quyền của instance để cấp tối thiểu và thử bằng tài khoản seed riêng. Không dùng tài khoản administrator chung để tránh lỗi permission.

Giới hạn thêm ở các lớp khác:

- seed chạy trên agent `ci-sandbox`, không phải built-in node/controller; agent không có Docker socket, secret release hoặc egress không cần thiết;
- credential đọc SCM, nếu thật sự cần, có quyền read-only và scope folder/job; seed DSL không thấy hoặc in giá trị này;
- parameter của seed không nhận Groovy, path glob, tên job, URL hay shell command tùy ý từ người dùng;
- nếu cần chọn catalog, dùng allowlist cố định trong Jenkinsfile, ví dụ `['payments', 'orders']`, rồi map tới targets đã review;
- không dùng `evaluate`, `GroovyShell`, dynamic class loading hay `load` để thực thi input/repository chưa review; không ghép input vào `shell` hay DSL string.

Validation không thay authorization. Một allowlist ngăn input lạ đi vào DSL, còn quyền folder/credential/network mới giới hạn thiệt hại nếu source hợp lệ có lỗi. Log seed chỉ nên có revision, target file và tên item; không dump environment, XML config hay secret.

## Lab local sandbox

### Điều kiện và chuẩn bị

Lab tạo một controller local và namespace `lab/`; nó không cần SCM production hay credential. Cần Docker, port `8080` còn trống và một image Jenkins LTS mà tổ chức cho phép dùng. Chạy lệnh trong terminal riêng; các lệnh không được thực hiện thay cho production.

```bash
docker volume create jenkins-job-dsl-lab
docker run --name jenkins-job-dsl-lab --rm -p 8080:8080 \
  -v jenkins-job-dsl-lab:/var/jenkins_home \
  jenkins/jenkins:lts-jdk17
```

Mở `http://localhost:8080`, lấy initial password từ log container, rồi hoàn tất setup local bằng admin **chỉ dùng cho lab**. Cài Job DSL, Pipeline và Git plugin qua Plugin Manager; restart local controller khi UI/plugin yêu cầu. Tại API Viewer, xác nhận `folder`, `job`, `git`, `shell` và các option của `jobDsl` phù hợp version vừa cài.

Tạo repository local chứa `Jenkinsfile` và `jobs/catalog-verify.groovy` đúng như phần trên. Có thể dùng Git server local hoặc repository public chứa dữ liệu vô hại; nếu chưa có SCM, tạo Pipeline seed bằng script inline **chỉ cho lab**, sau đó chuyển Jenkinsfile vào SCM trước khi áp dụng quy trình thật. Tạo seed job trong folder `lab/seeds` và đảm bảo agent/executor dùng cho lab, không phải controller production.

### Chạy seed và quan sát kết quả

1. Chạy `lab/seeds/catalog` lần đầu. Kỳ vọng Console Output cho biết DSL file đã được xử lý và `lab/teams/payments/catalog-verify` được tạo.
2. Chạy lại ở cùng commit. Kỳ vọng không xuất hiện thêm tên job khác; item được nhận diện là generated/updated theo log plugin. Đây là kiểm tra idempotency của cấu hình, không phải kiểm tra build ứng dụng.
3. Sửa **description** trong `jobs/catalog-verify.groovy`, commit, review mô phỏng rồi chạy lại seed. Kỳ vọng description của job đổi theo DSL. Không sửa UI để chứng minh idempotency: thay đổi UI là drift và sẽ bị source of truth ghi đè.
4. Tạo một branch lab chỉ bỏ file DSL, review diff và chạy seed với `removedJobAction: 'DISABLE'`. Kỳ vọng job cũ bị disable, không bị xóa. Đối chiếu config/history còn tồn tại, rồi khôi phục file và chạy seed để xác nhận lifecycle trước khi rời lab.
5. Kiểm tra **In-process Script Approval**. Kỳ vọng không có approval mới với DSL mẫu sandbox. Nếu có yêu cầu, dừng lab và đọc method/signature; không approve để tiếp tục cho nhanh.

Lab không chứng minh Jenkins production tương thích, authorization đúng hoặc removal an toàn ở catalog thật. Nó chỉ xác minh API/plugin cục bộ, seed flow, idempotency và hành vi disable trong namespace tự tạo.

### Cleanup

Dừng container rồi chỉ xóa volume có tên lab khi bạn chắc không cần quan sát state nữa:

```bash
docker stop jenkins-job-dsl-lab
case 'jenkins-job-dsl-lab' in
  jenkins-job-dsl-lab) docker volume rm jenkins-job-dsl-lab ;;
  *) printf 'Refuse cleanup outside lab\n' ;;
esac
```

Kết quả mong đợi: container dừng và chỉ volume `jenkins-job-dsl-lab` bị xóa. Không thay tên volume bằng volume controller thật; không dùng cleanup này khi cần giữ bằng chứng lab hoặc còn build đang chạy.

## Troubleshooting

| Triệu chứng | Kiểm tra có bằng chứng | Hướng xử lý an toàn |
| --- | --- | --- |
| `No such DSL method` hoặc property lạ | Job DSL API Viewer, version Job DSL/plugin và Console Output. | Cài/đồng bộ plugin trên sandbox hoặc sửa DSL theo API instance; không thêm method qua approve mù. |
| Seed chờ approval | Signature, file/revision gọi nó, trust của source và mục đích method. | Giữ sandbox; review/từ chối khi chưa hiểu. Không tắt sandbox để bỏ qua. |
| Job tạo sai folder | Vị trí seed, path đầy đủ, `lookupStrategy` và target file. | Dừng seed, sửa trong namespace lab, rồi chạy lại; không move tay nhiều item production. |
| Generated job bị đổi lại | Diff DSL, log seed và ownership marker description. | Đưa thay đổi cần thiết vào DSL; không duy trì song song UI và DSL. |
| Item bị disable bất ngờ | Targets glob, seed owner, inventory và `removedJobAction`. | Dừng promotion, khôi phục revision đã biết tốt hoặc re-enable theo runbook sau review; không chuyển ngay sang `DELETE`. |
| Seed thiếu plugin hoặc quyền | `failOnMissingPlugin` error, authorization của tài khoản seed và folder scope. | Thêm đúng plugin/quyền tối thiểu vào sandbox rồi review; không cấp global admin. |
| DSL từ PR có thể chạy quyền cao | Trigger/source branch, fork policy, agent/credential scope. | Chặn seed production chạy source untrusted; dùng controller/prefix cô lập cho thử nghiệm. |

## Checklist vận hành

- [ ] Jenkins LTS, Java, Job DSL và plugin mở rộng DSL đã được ghi version; API Viewer của instance đã được xem trước thay đổi.
- [ ] Job DSL, Pipeline, JCasC và Multibranch có ranh giới ownership rõ; không dùng Job DSL thay thế Jenkinsfile hoặc controller configuration.
- [ ] Seed checkout revision DSL đã review từ protected source; không chạy DSL từ fork, upload hoặc branch không tin cậy.
- [ ] Naming/folder prefix tách lab, staging và production; `lookupStrategy` đã được kiểm tra ở seed folder thật.
- [ ] Một generated item chỉ có một seed owner; UI drift được đưa về DSL thay vì giữ hai source of truth.
- [ ] Seed chạy lặp cùng revision không tạo item trùng; log build, commit SHA và item thay đổi được lưu làm bằng chứng.
- [ ] `removedJobAction` mặc định là `IGNORE` hoặc `DISABLE` theo giai đoạn; không xóa hàng loạt và đã có inventory/review trước mọi removal.
- [ ] Seed không có global admin, không chạy trên controller, không có credential release và chỉ có quyền folder/agent/network tối thiểu.
- [ ] Groovy sandbox bật; Script Approval được review theo signature/revision, không auto-approve và không dùng để tin cậy source lạ.
- [ ] Input/parameter được allowlist và validate; không `eval`, `GroovyShell`, dynamic load hoặc ghép input vào DSL/shell.
- [ ] Canary sandbox, promotion revision bất biến, rollback và cleanup đã được thực hành trước khi quản lý catalog thật.

## Nguồn chính thức

- [Job DSL plugin](https://plugins.jenkins.io/job-dsl/) — metadata, version, yêu cầu Jenkins và liên kết tài liệu plugin.
- [Job DSL documentation](https://jenkinsci.github.io/job-dsl-plugin/) — hướng dẫn seed, DSL và API Viewer của dự án plugin.
- [Job DSL plugin source and wiki](https://github.com/jenkinsci/job-dsl-plugin) — release, issue và tài liệu do dự án plugin duy trì.
- [Jenkins Pipeline](https://www.jenkins.io/doc/book/pipeline/) — mô hình Pipeline và Pipeline as Code.
- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/) — Jenkinsfile, SCM và credential trong Pipeline.
- [Jenkins Script Security](https://www.jenkins.io/doc/book/managing/script-approval/) — Groovy sandbox và In-process Script Approval.
- [Jenkins authorization](https://www.jenkins.io/doc/book/security/managing-security/) — authentication, authorization và nguyên tắc quyền tối thiểu.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn controller, agent, job, plugin và credential trước khi tự động hóa catalog." />
  <Card title="Tổng quan Pipeline" href="/docs/pipelines/overview" description="Phân biệt object job do seed tạo với flow build do Pipeline chạy." />
  <Card title="Declarative Pipeline" href="/docs/pipelines/declarative" description="Viết Jenkinsfile có agent, stage và kiểm soát rõ ràng cho generated Pipeline job." />
  <Card title="Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Versioning, review và bảo vệ source Pipeline trong SCM." />
  <Card title="Cấu hình hệ thống Jenkins" href="/docs/administration/system-configuration" description="Tách cấu hình controller/JCasC khỏi ownership của generated jobs." />
  <Card title="Backup & Restore Jenkins" href="/docs/administration/backup-restore" description="Chuẩn bị backup và restore drill trước thay đổi catalog có rủi ro." />
  <Card title="Tổng quan Jenkins Agent" href="/docs/agents/overview" description="Route seed và generated workload vào agent có trust boundary phù hợp." />
</Cards>
