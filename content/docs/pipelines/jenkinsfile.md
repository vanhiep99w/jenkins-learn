---
title: "Jenkinsfile"
description: "Đặt, cấu trúc, kiểm tra cú pháp và versioning Pipeline-as-code bằng Jenkinsfile."
---

<Callout type="info" title="Phạm vi và điều kiện">
  Bài này dùng Declarative Pipeline trên một Jenkins đã cài Pipeline: Declarative (Pipeline Model Definition), có tích hợp SCM phù hợp và một agent Linux có Git, Node.js 20 cùng quyền chạy `npm`. Nếu chưa có Jenkins hoặc agent, hãy chuẩn bị theo [Yêu cầu hệ thống](/docs/getting-started/requirements) và [chạy Jenkins với Docker](/docs/installation/docker) trước; các lệnh linter bên dưới không được coi là đã chạy chỉ vì chúng xuất hiện trong bài.
</Callout>

Jenkinsfile biến quy trình CI/CD thành mã nguồn: thay đổi có commit, có diff và có người phê duyệt. Trang [Tổng quan về Jenkins](/docs/getting-started/overview) giải thích controller, agent và job; [Nền tảng CI/CD](/docs/getting-started/ci-cd-fundamentals) đặt Pipeline vào vòng đời từ commit đến phản hồi.

## Mục lục

- [Jenkinsfile nằm ở đâu?](#jenkinsfile-nằm-ở-đâu)
  - [Tên và vị trí trong repository](#tên-và-vị-trí-trong-repository)
  - [Pipeline script from SCM](#pipeline-script-from-scm)
  - [Branch và pull request](#branch-và-pull-request)
- [Cấu trúc Declarative Pipeline](#cấu-trúc-declarative-pipeline)
  - [Ví dụ Jenkinsfile hoàn chỉnh](#ví-dụ-jenkinsfile-hoàn-chỉnh)
  - [Đọc từng khối](#đọc-từng-khối)
  - [Ghi chú về Scripted Pipeline](#ghi-chú-về-scripted-pipeline)
- [Kiểm tra cú pháp trước khi chạy](#kiểm-tra-cú-pháp-trước-khi-chạy)
  - [Declarative linter qua Jenkins CLI](#declarative-linter-qua-jenkins-cli)
  - [Kiểm tra trong Jenkins và giới hạn](#kiểm-tra-trong-jenkins-và-giới-hạn)
- [Quy ước và versioning](#quy-ước-và-versioning)
  - [Tách logic dùng chung](#tách-logic-dùng-chung)
  - [Pin phiên bản và bảo vệ secret](#pin-phiên-bản-và-bảo-vệ-secret)
  - [Review như code](#review-như-code)
- [Lab: đưa Jenkinsfile vào SCM](#lab-đưa-jenkinsfile-vào-scm)
- [Lỗi thường gặp](#lỗi-thường-gặp)
- [Checklist trước khi merge](#checklist-trước-khi-merge)
- [Tài liệu Jenkins chính thức](#tài-liệu-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Jenkinsfile nằm ở đâu?

### Tên và vị trí trong repository

Dùng chính xác tên `Jenkinsfile`, không phần mở rộng, và đặt nó ở thư mục gốc của repository. Đây là convention mà Jenkins và người review dễ nhận ra nhất:

```text
shop-api/
├── Jenkinsfile
├── package.json
├── package-lock.json
├── src/
└── test/
```

Có thể đặt file ở đường dẫn khác, chẳng hạn `ci/Jenkinsfile`, nhưng khi đó phải cấu hình **Script Path** của job đúng là `ci/Jenkinsfile`. Không nên để pipeline chỉ tồn tại trong ô script của giao diện Jenkins: thay đổi ngoài Git không đi cùng commit ứng dụng, khó review và khó tái lập ở branch khác.

Một repository có thể có nhiều Jenkinsfile khi có nhiều thành phần độc lập. Hãy đặt tên đường dẫn theo trách nhiệm, ví dụ `services/payments/Jenkinsfile`, và cấu hình job tương ứng. Tránh một Jenkinsfile khổng lồ điều khiển mọi sản phẩm nếu các thành phần có chu kỳ phát hành, quyền agent hoặc secret khác nhau.

### Pipeline script from SCM

Với Pipeline job, tại phần **Pipeline** chọn **Definition: Pipeline script from SCM**, chọn hệ SCM, nhập URL repository và credential đọc repository khi nó là private. Chọn **Script Path** là `Jenkinsfile` cho layout mặc định. Jenkins checkout revision đã chọn rồi đọc file từ workspace; script không nằm cố định trong cấu hình job.

Cấu hình này cần plugin SCM tương ứng — thường là Git plugin cho Git repository — ngoài Pipeline Model Definition. Credential SCM chỉ cần quyền đọc tối thiểu. Không đặt token trong URL repository hoặc trong Jenkinsfile; tạo credential trong Jenkins và chỉ cấp nó cho job/folder cần dùng.

<Callout type="idea" title="Giữ job mỏng">
  Job nên giữ thông tin kết nối SCM, trigger và quyền; Jenkinsfile giữ các bước build, test và phát hành. Khi cần hiểu controller, agent, executor và trust boundary của tác vụ, xem [Kiến trúc Jenkins](/docs/getting-started/architecture).
</Callout>

### Branch và pull request

Pipeline job thông thường có thể build một branch cố định, ví dụ branch specifier `*/main`. Cách này phù hợp khi chỉ cần CI cho một nhánh, nhưng phải đổi cấu hình job nếu muốn kiểm tra branch khác.

Với repository có nhiều branch hoặc pull request (PR), Multibranch Pipeline quét source, tìm `Jenkinsfile` trên từng branch/PR và tạo job con theo cấu hình source. Mỗi build phải dùng Jenkinsfile thuộc đúng revision của branch hoặc PR đó. Đừng cấu hình job PR đọc Jenkinsfile từ `main`, vì người review sẽ không kiểm tra được chính pipeline mà build sắp chạy.

PR là code chưa tin cậy hơn branch đã merge. Không để build PR từ fork dùng credential phát hành, deploy production hoặc agent chứa dữ liệu nhạy cảm. Tách agent và credential theo mức tin cậy; chỉ chạy bước release sau merge, hoặc sau điều kiện/approval mà tổ chức đã thiết kế.

## Cấu trúc Declarative Pipeline

Declarative Pipeline có hình dạng rõ ràng: một khối `pipeline` bao ngoài, một `agent`, các `stages`, và các `steps` trong mỗi stage. Nó cần plugin Pipeline Model Definition. Ví dụ dưới đây giả định agent mang label `linux && node20`, có Git và Node.js 20; `npm ci` cũng cần `package-lock.json` trong repository. `timestamps()` cần plugin Timestamper, `junit` cần plugin JUnit, còn `archiveArtifacts` lưu file vào Jenkins và cần đủ dung lượng/retention phù hợp.

### Ví dụ Jenkinsfile hoàn chỉnh

```groovy
pipeline {
  agent { label 'linux && node20' }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Test') {
      steps {
        sh 'node --version'
        sh 'npm ci'
        sh 'npm test -- --reporter=junit --outputFile=reports/junit.xml'
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
        archiveArtifacts artifacts: 'dist/**', fingerprint: true
      }
    }
  }

  post {
    always {
      junit testResults: 'reports/junit.xml', allowEmptyResults: true
      deleteDir()
    }
    failure {
      echo 'Đọc Console Output và test report trước khi chạy lại build.'
    }
    success {
      echo 'CI hoàn tất; artifact đã được lưu cho build này.'
    }
  }
}
```

Các script test khác nhau có thể không hỗ trợ `--reporter=junit` hoặc `--outputFile`; hãy thay bằng lệnh thực sự của dự án. `allowEmptyResults: true` chỉ tránh làm hỏng bước dọn dẹp khi report chưa được tạo, không biến việc thiếu report thành test đã chạy.

### Đọc từng khối

| Khối | Vai trò | Điều cần kiểm tra |
|---|---|---|
| `pipeline` | Gốc của Declarative Pipeline, nơi các directive hợp lệ được tổ chức. | Không trộn cú pháp Scripted tùy tiện vào cùng cấp. |
| `agent` | Chọn nơi thực thi toàn Pipeline. Label yêu cầu agent có cả hai nhãn. | Agent đang online, có executor, OS và toolchain đúng; không chạy workload không tin cậy trên controller. |
| `stages` | Nhóm các chặng có ý nghĩa với người đọc, như checkout, test và build. | Tên stage mô tả mục đích, thứ tự phản ánh phụ thuộc thực tế. |
| `steps` | Lệnh hoặc Pipeline step được chạy trong một stage. | `sh` cần shell Unix; lệnh Node và đường dẫn artifact/report phải tồn tại trên agent. |
| `post` | Hành động sau kết quả Pipeline. `always` chạy cả khi thất bại; `failure` và `success` chạy theo trạng thái cuối. | Thu thập report trước `deleteDir()` để không xóa dữ liệu cần xuất bản. |

`timestamps()` thêm thời gian vào log để điều tra. `disableConcurrentBuilds()` tránh hai build của cùng job ghi đè workspace hoặc tài nguyên chung, nhưng có thể làm build sau chờ queue. Chỉ bật khi sự tuần tự đó là điều nhóm muốn.

### Ghi chú về Scripted Pipeline

Scripted Pipeline dùng Groovy linh hoạt hơn, thường bắt đầu bằng `node { ... }`. Nó hữu ích khi flow động thực sự cần code Groovy, nhưng độ linh hoạt cũng làm review, sandbox và lỗi runtime khó hơn. Với CI thông thường, bắt đầu bằng Declarative Pipeline; khi dùng `script { ... }` trong Declarative, giữ đoạn Groovy ngắn và đưa logic đã được review vào Shared Library thay vì phình to Jenkinsfile.

## Kiểm tra cú pháp trước khi chạy

Syntax validation trả lời liệu Jenkins có parse được **Declarative syntax** hay không. Nó không chứng minh `npm test` sẽ thành công, agent có label, plugin cần thiết đã cài, credential tồn tại hay production deployment an toàn. Linter cần một Jenkins có thể truy cập và plugin Pipeline Model Definition tương thích với Jenkinsfile.

### Declarative linter qua Jenkins CLI

Tải `jenkins-cli.jar` từ URL Jenkins của tổ chức, rồi dùng API token của một tài khoản có quyền tối thiểu theo chính sách Jenkins. Không commit file chứa `user:apiToken`; lưu nó ngoài repository với quyền đọc hạn chế hoặc dùng cơ chế secret của CI.

```bash
export JENKINS_URL='https://jenkins.example.com'
java -jar jenkins-cli.jar -s "$JENKINS_URL" \
  -auth @"$HOME/.config/jenkins-cli-auth" \
  declarative-linter -f Jenkinsfile
```

File được tham chiếu bởi `-auth @...` chứa một dòng `username:apiToken` do Jenkins cấp, không phải mật khẩu đăng nhập và không phải giá trị mẫu để chép vào Git. Lệnh trả về kết quả parser của Jenkins; chỉ xem syntax là hợp lệ khi command thành công và output không báo lỗi. Jenkins CLI phải được bật/cho phép, endpoint phải truy cập được qua TLS, và tài khoản vẫn cần các quyền mà controller yêu cầu. Một số cài đặt có CSRF, SSO hoặc policy mạng khiến cách gọi HTTP trực tiếp cần crumb/xác thực bổ sung; dùng CLI theo cấu hình tổ chức thay vì tắt bảo vệ để “cho linter chạy”.

### Kiểm tra trong Jenkins và giới hạn

Khi đã có Jenkins, có thể dùng **Pipeline Syntax** để tra cứu và tạo snippet cho step/directive, rồi tạo một Pipeline job thử nghiệm hoặc branch CI để chạy Jenkinsfile từ SCM. Với Declarative Pipeline, endpoint `POST /declarative-linter/validate` cũng có thể được tích hợp vào công cụ nội bộ, nhưng phải xác thực, dùng crumb nếu Jenkins yêu cầu và không gửi Jenkinsfile có secret.

Nếu chưa có Jenkins, chỉ có thể kiểm tra cục bộ ở mức cơ bản: review dấu ngoặc, dùng syntax highlighting Groovy và chạy formatter/check của repository nếu có. Những việc này **không thay thế** Declarative linter. Không cài plugin hoặc mở endpoint chỉ để xác minh một file; hãy thực hiện validation trên controller lab/staging được quản trị.

<Callout type="warn" title="Linter không chạy build">
  Một Jenkinsfile có thể qua linter nhưng vẫn thất bại vì agent thiếu Node.js, `npm ci` không tải được dependency, report sai đường dẫn hoặc credential bị từ chối. Sau lint, chạy build ở branch an toàn và đọc log như một kiểm thử tích hợp của Pipeline.
</Callout>

## Quy ước và versioning

Đặt Jenkinsfile cạnh code giúp lịch sử Git trả lời được “quy trình nào đã chạy cho commit này?”. Một thay đổi dependency, agent image, lệnh deploy hoặc quyền credential đều là thay đổi vận hành và cần commit có chủ đích.

- Dùng stage name ổn định, mô tả hành động (`Test`, `Build`, `Publish`) thay vì tên người hoặc ticket ngắn hạn.
- Giữ command có thể chạy lại; pin dependency qua lockfile và pin image/toolchain tới version hoặc digest đã kiểm thử.
- Không dựa vào `latest`, branch library di động hoặc plugin version ngầm định cho đường phát hành quan trọng.
- Tách CI, staging và production bằng điều kiện, credential scope và approval rõ ràng; không dùng một secret quyền rộng cho tất cả stage.

### Tách logic dùng chung

Jenkinsfile nên mô tả flow riêng của repository. Khi nhiều repository lặp lại policy hoặc hàm phức tạp, đưa phần chung vào Jenkins Shared Library được quản trị như source code độc lập. Ví dụ một Jenkinsfile có thể tham chiếu bản phát hành đã xét duyệt:

```groovy
@Library('company-ci@v1.4.2') _
```

Pin library vào tag bất biến hoặc commit đã kiểm thử tốt hơn branch như `main`: cùng một commit ứng dụng sẽ gọi cùng logic CI. Quy trình cập nhật library nên là PR riêng, chạy tương thích trên consumer đại diện rồi nâng version rõ ràng ở từng repository. Library có thể chạy Groovy với quyền lớn, vì vậy giới hạn người được sửa, review kỹ và chỉ đặt library đã tin cậy ở global trusted configuration.

### Pin phiên bản và bảo vệ secret

Pin version ở mọi ranh giới có thể thay đổi: action của Shared Library, agent/container image, package lockfile và công cụ build. Ghi lý do nâng version trong PR, kiểm thử trên branch trước khi merge và giữ đường rollback về version trước. Branch `main` nên là nguồn CI sau merge; release branch chỉ nhận các thay đổi CI cần thiết được backport có chủ đích, không copy-paste rồi để hai Jenkinsfile trôi khác nhau.

Secret thuộc Jenkins Credentials hoặc secret manager tích hợp, không thuộc Git. Cấp credential theo folder/job/environment và quyền tối thiểu. Chỉ nạp nó ở stage cần thiết, tắt shell tracing quanh lệnh nhạy cảm, không echo biến môi trường và không đưa secret vào artifact, test fixture, URL hay tham số build. Masking log là lớp giảm lộ lọt, không phải bảo đảm tuyệt đối: process khác trên cùng agent hoặc script độc hại vẫn có thể tìm cách đọc secret.

### Review như code

Mỗi thay đổi Jenkinsfile đi qua pull request cùng code ứng dụng. Người review cần đọc diff với câu hỏi vận hành, không chỉ kiểm tra Groovy hợp lệ:

1. Revision này có đổi agent, image, command, network target hoặc quyền credential không?
2. Stage mới có làm PR chạm môi trường phát hành hoặc dữ liệu thật không?
3. Artifact, report và điều kiện `post` có phản ánh đúng kết quả mong đợi không?
4. Có version pin, test/lint evidence và kế hoạch rollback nếu thay đổi ảnh hưởng release không?

Áp dụng branch protection, required review và status check cho Jenkinsfile như với mã ứng dụng. Mọi thay đổi cấu hình job nằm ngoài SCM cũng nên có owner, audit trail và quy trình review tương đương.

## Lab: đưa Jenkinsfile vào SCM

Lab này tạo CI cho một repository Node.js đã có `package.json`, `package-lock.json`, script `test`/`build` và một Jenkins agent Linux nhãn `linux` và `node20`. Cần Pipeline Model Definition, Git, Timestamper và JUnit plugin; Jenkins phải có credential đọc repository private. Không dùng secret thật trong các bước lab.

<Steps>
  <Step>

### Tạo file và kiểm tra diff

Đặt ví dụ ở trên vào `Jenkinsfile` tại root repository. Xác nhận lockfile và các đường dẫn `dist/`, `reports/junit.xml` phù hợp dự án, rồi review như một thay đổi code:

```bash
git diff -- Jenkinsfile
git status --short
```

  </Step>
  <Step>

### Validate khi có Jenkins

Nếu controller lab/staging đã chuẩn bị CLI và quyền phù hợp, chạy lệnh `declarative-linter` ở phần trước. Nếu chưa có Jenkins, ghi rõ validation bị trì hoãn; không báo “đã lint” dựa trên editor.

  </Step>
  <Step>

### Commit lên branch

Tạo branch làm việc, commit Jenkinsfile rồi push tới remote theo quy trình repository:

```bash
git switch -c ci/add-jenkinsfile
git add Jenkinsfile
git commit -m "ci: add declarative Jenkins pipeline"
git push -u origin ci/add-jenkinsfile
```

Mở PR để người khác review agent, commands, artifact và bề mặt credential trước khi merge.

  </Step>
  <Step>

### Tạo Pipeline từ SCM

Trong Jenkins, tạo **New Item → Pipeline**. Chọn **Pipeline script from SCM**, chọn Git, điền URL repository và credential đọc tối thiểu nếu cần. Đặt **Script Path** là `Jenkinsfile`; với Pipeline job đơn lẻ, dùng branch specifier `*/ci/add-jenkinsfile` để kiểm tra branch lab. Lưu rồi chọn **Build Now**.

  </Step>
  <Step>

### Xác nhận và chuyển sang PR workflow

Build thành công có ba stage `Checkout`, `Test`, `Build`, test report và artifact nếu dự án tạo chúng. Nếu build chờ, kiểm tra agent `linux && node20` đang online thay vì sửa syntax. Khi flow này ổn định, cấu hình Multibranch Pipeline cho repository để Jenkins phát hiện Jenkinsfile theo từng branch/PR, đồng thời giữ release credential ngoài build PR không tin cậy.

  </Step>
</Steps>

## Lỗi thường gặp

<Callout type="error" title="Đúng tên file không có nghĩa Jenkins đọc đúng file">
  `Jenkinsfile` ở root nhưng **Script Path** là `ci/Jenkinsfile`, hoặc job đang build `main` trong khi file mới chỉ có ở branch PR, sẽ làm Jenkins đọc file khác hoặc không tìm thấy file. Kiểm tra revision, branch specifier và Script Path trong cấu hình job trước.
</Callout>

- **`agent` nằm mãi trong queue:** label không khớp agent online, hoặc agent hết executor. Xem trạng thái node/queue; đừng thay `agent any` để che thiếu toolchain.
- **Linter qua nhưng build hỏng:** linter không tải dependency, không tạo report và không xác minh plugin/credential. Chạy trên branch an toàn, đọc dòng lỗi đầu tiên trong Console Output.
- **PR có quyền release:** credential hoặc deploy step được cấp cho mọi branch. Tách trust boundary và chỉ release từ branch đã bảo vệ sau merge/approval.
- **Artifact trống:** `dist/**` không khớp output thực tế hoặc build không tạo file. Kiểm tra output trước `archiveArtifacts`; không bỏ qua lỗi chỉ để pipeline xanh.
- **Secret xuất hiện trong log:** lệnh có `set -x`, `echo`, URL hoặc command-line chứa secret. Thu hồi/rotate secret theo policy, xóa log/artifact theo quy trình và sửa cách nạp credential.

## Checklist trước khi merge

- [ ] File tên `Jenkinsfile` ở root, hoặc Script Path được nêu rõ và đã kiểm tra.
- [ ] `agent` có label, OS, Git và toolchain đúng; build không chạy workload không tin cậy trên controller.
- [ ] Plugin/credential cần thiết và giới hạn của chúng đã được nêu rõ.
- [ ] Stages, steps, `post`, artifact và test report khớp với dự án thật.
- [ ] Declarative linter đã chạy trên Jenkins phù hợp, hoặc việc chưa chạy được ghi rõ.
- [ ] Image, Shared Library và dependency quan trọng được pin tới revision đã kiểm thử.
- [ ] Không có token, password, private key hay URL chứa secret trong Jenkinsfile, log hoặc PR.
- [ ] PR có review vận hành/bảo mật khi thay đổi agent, credential, deploy hoặc shared logic.
- [ ] Build PR không tin cậy không nhận credential phát hành hoặc quyền production.
- [ ] Có cách rollback version Jenkinsfile/Shared Library nếu thay đổi làm hỏng CI hoặc release.

## Tài liệu Jenkins chính thức

- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/)
- [Pipeline syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Pipeline development tools and declarative linter](https://www.jenkins.io/doc/book/pipeline/development/#linter)
- [Jenkins CLI](https://www.jenkins.io/doc/book/managing/cli/)
- [Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/)
- [Pipeline: Declarative plugin](https://plugins.jenkins.io/pipeline-model-definition/)
- [Jenkins Shared Libraries](https://www.jenkins.io/doc/book/pipeline/shared-libraries/)

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn lại controller, agent, job và Pipeline." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Chọn agent và hiểu ranh giới tin cậy." />
  <Card title="Nền tảng CI/CD" href="/docs/getting-started/ci-cd-fundamentals" description="Nối Jenkinsfile với vòng phản hồi CI/CD." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Dựng controller lab trước khi chạy Pipeline." />
</Cards>
