---
title: "Scripted Pipeline"
description: "Dùng Groovy DSL để viết Jenkins Pipeline linh hoạt, hiểu node, step, kiểm soát luồng và lúc nên ưu tiên Declarative."
---

Scripted Pipeline là cách viết Jenkins Pipeline trực tiếp bằng Groovy DSL. Nó phù hợp khi luồng công việc thật sự cần tính toán, lặp hoặc rẽ nhánh động mà khuôn dạng của Declarative trở nên gượng ép. Trước khi dùng, hãy nắm mô hình controller, agent và job trong [Tổng quan về Jenkins](/docs/getting-started/overview), cũng như khái niệm Pipeline as Code trong [Tổng quan Jenkins Pipeline](/docs/pipelines/overview).

<Callout type="info" title="Phạm vi và điều kiện">
  Ví dụ dùng một agent Linux có Git, Node.js và quyền chạy `npm`. Cần có các plugin Pipeline cơ bản cùng SCM integration tương ứng. `checkout scm` chỉ dùng được khi job đã được cấu hình SCM; `BRANCH_NAME` có ý nghĩa tự nhiên nhất trong Multibranch Pipeline. Đây là tài liệu về Scripted syntax, không phải hướng dẫn cấp quyền production cho Jenkins.
</Callout>

## Mục lục

- [Khi nào chọn Scripted Pipeline](#khi-nào-chọn-scripted-pipeline)
  - [Scripted Pipeline là gì](#scripted-pipeline-là-gì)
  - [Quyết định nhanh](#quyết-định-nhanh)
- [Mô hình thực thi node executor và workspace](#mô-hình-thực-thi-node-executor-và-workspace)
  - [Node block cấp executor và workspace](#node-block-cấp-executor-và-workspace)
  - [Luồng từ queue đến dọn dẹp](#luồng-từ-queue-đến-dọn-dẹp)
- [Cú pháp Scripted Groovy và Pipeline step](#cú-pháp-scripted-groovy-và-pipeline-step)
  - [Groovy control flow](#groovy-control-flow)
  - [Gọi Pipeline step](#gọi-pipeline-step)
- [Jenkinsfile Scripted hoàn chỉnh](#jenkinsfile-scripted-hoàn-chỉnh)
  - [Đọc ví dụ Groovy và step](#đọc-ví-dụ-groovy-và-step)
  - [Exit code và exception](#exit-code-và-exception)
- [Độ tin cậy và vệ sinh workspace](#độ-tin-cậy-và-vệ-sinh-workspace)
  - [Timeout retry và side effect](#timeout-retry-và-side-effect)
  - [Dọn dẹp có chủ đích](#dọn-dẹp-có-chủ-đích)
- [Bảo mật Script Security và nguồn không tin cậy](#bảo-mật-script-security-và-nguồn-không-tin-cậy)
  - [Sandbox approval và trusted code](#sandbox-approval-và-trusted-code)
  - [Secret và pull request từ fork](#secret-và-pull-request-từ-fork)
- [Scripted và Declarative](#scripted-và-declarative)
  - [Bảng so sánh](#bảng-so-sánh)
  - [Tiêu chí chọn](#tiêu-chí-chọn)
- [Lab tuyến tính](#lab-tuyến-tính)
  - [Chuẩn bị](#chuẩn-bị)
  - [Các bước và kết quả mong đợi](#các-bước-và-kết-quả-mong-đợi)
- [Lỗi thường gặp](#lỗi-thường-gặp)
- [Checklist trước khi dùng](#checklist-trước-khi-dùng)
- [Nguồn chính thức](#nguồn-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Khi nào chọn Scripted Pipeline

### Scripted Pipeline là gì

Scripted Pipeline là một chương trình Groovy chạy bởi Pipeline engine của Jenkins. Khung tối thiểu là `node { ... }`: bên trong khối này, bạn tổ chức các mốc hiển thị bằng `stage`, rồi gọi các Pipeline step như `checkout`, `sh`, `timeout` hoặc `deleteDir`. Không có khối `pipeline {}` bắt buộc như Declarative.

Groovy cho phép biến, danh sách, closure, `if/else`, `for` và `try/catch/finally`. Chính độ tự do này hữu ích khi Pipeline phải tạo danh sách stage từ manifest, chọn agent theo dữ liệu đã kiểm tra, hoặc chia sẻ một thuật toán phức tạp. Đổi lại, luồng có thể khó review hơn và lỗi cú pháp hoặc lỗi runtime thường xuất hiện muộn hơn.

### Quyết định nhanh

Ưu tiên **Declarative** khi quy trình có các stage tương đối cố định, nhóm cần đọc nhanh policy về agent, timeout, condition và post action. Bài [Declarative Pipeline](/docs/pipelines/declarative) là điểm bắt đầu tốt cho đa số CI/CD pipeline.

Chọn **Scripted** khi một yêu cầu cụ thể không diễn đạt rõ ràng trong Declarative mà không phải viết nhiều `script { ... }`, ví dụ tạo số stage từ danh sách module đã được kiểm soát. Không chọn Scripted chỉ vì Groovy quen thuộc: một Jenkinsfile ngắn, tuyến tính thường dễ bảo trì hơn trong Declarative.

<Callout type="idea" title="Nguyên tắc thực dụng">
  Bắt đầu bằng Declarative nếu không có lý do kỹ thuật rõ ràng để dùng Scripted. Khi cần Scripted, giữ phần Groovy nhỏ, đặt tên stage theo kết quả quan sát được và đưa logic dùng lại đã review vào Shared Library thay vì sao chép giữa Jenkinsfile.
</Callout>

## Mô hình thực thi node executor và workspace

### Node block cấp executor và workspace

`node('linux') { ... }` yêu cầu Jenkins tìm một agent có label `linux`. Khi agent phù hợp có một executor rảnh, build nhận executor đó và Jenkins cấp một workspace cho phần thân của `node`. Nếu không có agent hay executor phù hợp, build đứng trong queue; đây không phải lỗi Groovy.

```groovy
node('linux') {
  stage('Kiểm tra môi trường') {
    sh 'git --version'
  }
}
```

`node` là Pipeline step đặc biệt, không phải một từ khóa Groovy thuần. Label là biểu thức chọn node do Jenkins xử lý; nó cần khớp cấu hình agent thực tế. Một `node` dài bao quanh toàn bộ build giữ executor suốt thời gian chạy, kể cả khi Groovy chỉ đang quyết định bước tiếp theo. Chỉ giữ nó khi cần workspace liên tục; nếu các pha dùng toolchain khác nhau, tách thành các `node` ngắn hơn và chuyển artifact bằng cơ chế phù hợp.

Workspace là thư mục làm việc trên agent, không phải kho lưu trữ an toàn hay bộ nhớ bền vững cho mọi build. Các build đồng thời có thể dùng workspace được Jenkins tách tên; vẫn không được giả định file cũ sẽ tồn tại hoặc workspace luôn sạch. Xem thêm cách queue, executor và agent phối hợp trong [Kiến trúc Jenkins](/docs/getting-started/architecture).

### Luồng từ queue đến dọn dẹp

```text
Jenkinsfile được nạp
        │
        ▼
node('linux') yêu cầu label
        │
        ├── Không có executor phù hợp ──► build chờ trong queue
        │
        ▼
agent + executor được cấp, workspace sẵn sàng
        │
        ▼
checkout → stage → Pipeline steps → kết quả build
        │
        ▼
finally chạy dọn workspace, executor được trả lại
```

Sơ đồ cho thấy `finally` là nơi thích hợp cho vệ sinh cục bộ vì nó chạy cả khi phần `try` thành công lẫn khi một step ném exception. Nó không thay thế retention policy, cleanup ở cấp agent hoặc quản trị dung lượng đĩa.

## Cú pháp Scripted Groovy và Pipeline step

### Groovy control flow

Các cấu trúc dưới đây là **Groovy**: Jenkins thực thi chúng như logic của Pipeline, rồi logic đó quyết định step nào được gọi.

```groovy
def checks = [
  [name: 'Lint', command: 'npm run lint'],
  [name: 'Unit test', command: 'npm test'],
]

checks.each { check ->
  stage(check.name) {
    sh check.command
  }
}

if (env.BRANCH_NAME == 'main') {
  stage('Build production') {
    sh 'npm run build'
  }
} else {
  echo "Bỏ qua build production cho branch ${env.BRANCH_NAME ?: 'không xác định'}"
}
```

`def`, list/map, closure `each`, `if/else` và phép nội suy chuỗi là Groovy. `env` là global variable do Jenkins cung cấp; biểu thức `?:` là Elvis operator của Groovy, chọn giá trị dự phòng khi vế trái rỗng hoặc false. Vòng lặp nên ngắn và dữ liệu đầu vào phải có giới hạn. Tạo hàng trăm stage động làm giao diện và việc khôi phục Pipeline khó quan sát hơn.

Trong Pipeline có CPS transformation để Jenkins có thể lưu trạng thái và tiếp tục sau restart. Vì vậy, đừng mang vào Jenkinsfile các object Java/Groovy phức tạp, closure có side effect khó dự đoán, hoặc vòng lặp nặng chạy trên controller. Khi logic lớn, hãy đơn giản hóa đầu vào hoặc dùng Shared Library đã được kiểm thử và kiểm soát quyền.

### Gọi Pipeline step

`stage('Tên')`, `sh 'lệnh'`, `checkout scm`, `echo '...'`, `timeout { ... }` và `deleteDir()` là **Pipeline step** hoặc global do plugin Jenkins cung cấp. Chúng có thể trông như hàm Groovy, nhưng được Pipeline engine thực hiện; tính sẵn có phụ thuộc plugin và cấu hình controller.

Có thể gọi step theo dạng một đối số hoặc named arguments:

```groovy
stage('Test') {
  sh 'npm test'
  sh label: 'Kiểm tra phiên bản Node', script: 'node --version'
}
```

`stage` tạo mốc trực quan cho người đọc; nó không tự cấp agent. `sh` chạy shell trên agent hiện tại và cần môi trường Unix-like. Trên Windows, dùng step phù hợp như `bat` hoặc `powershell` theo plugin/cấu hình đang có, thay vì giả định `sh` hoạt động ở mọi nơi. Dùng **Pipeline Syntax** trên chính controller để lấy snippet đúng cho plugin đang cài.

## Jenkinsfile Scripted hoàn chỉnh

Ví dụ sau là Jenkinsfile cho repository Node.js có các script `lint`, `test` và `build` trong `package.json`. Job là Multibranch Pipeline, agent có label `linux` cùng Git, Node.js và npm. Mẫu chỉ build artifact; không deploy và không dùng credential.

```groovy
node('linux') {
  try {
    timeout(time: 20, unit: 'MINUTES') {
      stage('Checkout') {
        checkout scm
      }

      stage('Cài dependencies') {
        sh 'npm ci'
      }

      def checks = [
        [name: 'Lint', command: 'npm run lint'],
        [name: 'Unit test', command: 'npm test'],
      ]

      checks.each { check ->
        stage(check.name) {
          sh label: check.name, script: check.command
        }
      }

      if (env.BRANCH_NAME == 'main') {
        stage('Build production') {
          sh 'npm run build'
        }
      } else {
        echo "Không build production cho ${env.BRANCH_NAME ?: 'branch không xác định'}"
      }
    }
  } catch (err) {
    currentBuild.result = 'FAILURE'
    echo 'Pipeline dừng; xem Console Output để biết step thất bại.'
    throw err
  } finally {
    deleteDir()
  }
}
```

### Đọc ví dụ Groovy và step

| Thành phần | Loại | Vai trò trong ví dụ |
| --- | --- | --- |
| `node('linux')` | Pipeline step | Chờ agent có label `linux`, cấp executor và workspace. |
| `try/catch/finally` | Groovy control flow | Bắt lỗi để ghi tín hiệu tối thiểu, ném lại lỗi, rồi luôn dọn workspace. |
| `timeout(...) { ... }` | Pipeline step | Đặt giới hạn 20 phút cho phần checkout đến build. |
| `def checks = [...]` và `checks.each` | Groovy control flow | Khai báo danh sách kiểm tra và tạo hai stage theo dữ liệu nhỏ, cố định. |
| `stage(...)`, `checkout scm`, `sh`, `echo` | Pipeline step/global | Hiển thị mốc, lấy source và thực thi lệnh trên agent. |
| `if (env.BRANCH_NAME == 'main')` | Groovy control flow | Chỉ build production khi Multibranch báo branch `main`. |
| `currentBuild.result` | Jenkins global | Ghi kết quả thất bại trước khi lỗi được ném lại. |

`catch` không được nuốt lỗi. Sau khi `echo`, `throw err` giữ nguyên failure để Jenkins đánh dấu build thất bại và upstream/downstream thấy kết quả đúng. `finally` chỉ dọn sau khi đã chạy trong `node`, vì `deleteDir()` cần workspace hiện hành.

### Exit code và exception

Theo mặc định, `sh 'command'` thất bại khi command trả exit code khác `0`; Pipeline step ném exception và luồng nhảy vào `catch`. `npm test` trả `1` thì `Build production` không chạy, `finally` vẫn chạy và build kết thúc FAILURE do `throw err`.

Đừng che exit code bằng `sh 'npm test || true'` chỉ để build xanh. Nếu cần đọc trạng thái để quyết định có kiểm soát, dùng `returnStatus: true`, ghi rõ policy và vẫn kết thúc build đúng theo policy đó:

```groovy
int status = sh(script: 'npm test', returnStatus: true)
if (status != 0) {
  error "Unit test trả exit code ${status}"
}
```

`error` là Pipeline step ném exception có chủ đích. Tương tự, `timeout` có thể ngắt phần thân khi hết thời gian; `checkout` cũng có thể ném exception khi SCM hoặc network lỗi. Luôn xem Console Output để phân biệt lỗi Jenkinsfile, lỗi cấp agent và exit code của command.

## Độ tin cậy và vệ sinh workspace

### Timeout retry và side effect

`timeout` giới hạn thời gian chờ vô hạn do network, SCM hoặc command treo. Đặt timeout sát với hành vi bình thường và cộng biên độ có lý do; 20 phút trong ví dụ chỉ là giá trị lab, không phải chuẩn chung.

`retry(n) { ... }` chỉ nên bao quanh thao tác có thể chạy lại an toàn, chẳng hạn tải dependency từ mirror ổn định hoặc một checkout chịu lỗi mạng tạm thời. Không bọc mù quáng thao tác có side effect như tạo release, gửi tiền, migrate schema hay gọi API không idempotent: lần chạy lại có thể tạo thay đổi lặp. Nếu phải retry một API, thiết kế idempotency key, kiểm tra trạng thái đích và log request identifier trước.

```groovy
stage('Checkout') {
  retry(2) {
    checkout scm
  }
}
```

Con số trên nghĩa là tối đa hai lần thực thi phần thân, không bảo đảm SCM sẽ thành công. Đặt `timeout` ngoài `retry` nếu cả chuỗi thử phải có một deadline chung; đặt nó trong `retry` nếu mỗi lần thử cần deadline riêng. Chọn một trong hai theo policy, rồi kiểm thử bằng lỗi mô phỏng an toàn.

### Dọn dẹp có chủ đích

`deleteDir()` xóa nội dung workspace hiện hành. Đặt nó trong `finally` giúp không để dependency, source hoặc artifact tạm từ build trước ảnh hưởng build sau. Tuy nhiên, nó cũng xóa mọi file trong workspace mà build đang có quyền truy cập; không chạy step này ở một thư mục dùng chung hoặc khi workspace bị cấu hình sai.

Với artifact cần giữ, archive hoặc xuất bản nó **trước** cleanup theo retention policy của Jenkins. Không dựa vào workspace để chuyển dữ liệu giữa agent; dùng artifact, stash/unstash trong phạm vi phù hợp, hoặc một kho lưu trữ được quản trị. Hạ tầng có thể vẫn cần dọn workspace cũ khi agent bị mất trước lúc `finally` chạy.

<Callout type="warn" title="Cleanup không bù cho isolation">
  `deleteDir()` giảm file tồn dư, nhưng không biến agent dùng chung thành môi trường đáng tin. Tách agent cho workload nhạy cảm, giới hạn quyền filesystem/network và không chạy workload production trên controller. Kiến trúc controller-agent và capacity được trình bày thêm trong [Kiến trúc Jenkins](/docs/getting-started/architecture).
</Callout>

## Bảo mật Script Security và nguồn không tin cậy

### Sandbox approval và trusted code

Jenkins Pipeline thường chạy trong **Script Security sandbox**. Sandbox chặn nhiều API Groovy/Java và chỉ cho phép các operation đã được phê chuẩn. Nếu Jenkins báo một signature cần approval, quản trị viên phải đọc và hiểu chính xác API đó làm gì; không approve chỉ để build hết lỗi. Approval sai có thể mở đường cho Jenkinsfile làm việc vượt ngoài ý định.

**Trusted code** như Shared Library toàn cục được cấu hình tin cậy có thể chạy ngoài sandbox tùy cấu hình. Vì nó có quyền mạnh hơn Jenkinsfile thông thường, chỉ người duy trì đáng tin cậy mới được sửa repository và phiên bản library đó. Đưa logic phức tạp vào trusted library không làm logic tự động an toàn; nó chỉ chuyển trust boundary sang nơi cần review, test và kiểm soát chặt hơn.

Tránh yêu cầu approval cho từng Jenkinsfile của developer. Hãy ưu tiên Pipeline step được hỗ trợ, API nhỏ đã được review, hoặc một shared library có interface hẹp. Xem hướng dẫn chính thức về [Script Security](https://www.jenkins.io/doc/book/managing/script-approval/) trước khi thay đổi approval trên controller.

### Secret và pull request từ fork

Scripted syntax có thể gọi bất kỳ step credential nào plugin cho phép, nhưng secret không nên được cấp chỉ vì Pipeline cần dùng `sh`. Lấy credential qua Jenkins Credentials trong scope hẹp, tránh in biến môi trường, tránh đưa secret vào command line và không archive file tạm chứa secret. Masking log chỉ là lớp giảm rò rỉ, không phải phân quyền.

Pull request từ fork là mã do bên ngoài kiểm soát. Không chạy nó trên agent tin cậy với credential phát hành, SSH key mạnh hoặc quyền truy cập network nội bộ. Chính sách branch source, quyền đọc credential và agent isolation phải bảo đảm build từ fork không nhận secret hay quyền deploy. Nếu cần kiểm tra fork, dùng agent/credential tách biệt và chỉ chạy test không đặc quyền.

<Callout type="error" title="Không dùng secret để làm build fork tiện hơn">
  Một Jenkinsfile từ fork có thể sửa command, đọc file trong workspace và cố gắng exfiltrate biến môi trường. Approval thủ công hay sandbox không phải lý do để cấp credential deploy cho build đó. Thiết kế trust boundary trước, rồi mới thêm step dùng secret.
</Callout>

## Scripted và Declarative

### Bảng so sánh

| Tiêu chí | Scripted Pipeline | Declarative Pipeline |
| --- | --- | --- |
| Khung chính | Groovy tự do, thường bắt đầu bằng `node {}` | Khung `pipeline { agent; stages; ... }` có quy ước rõ |
| Logic động | Tốt cho danh sách stage, tính toán và flow phức tạp | Đủ cho flow thông thường; dùng `script` khi cần Groovy tùy biến |
| Khả năng đọc/review | Phụ thuộc kỷ luật tác giả; control flow có thể che policy | Cấu trúc nhất quán, dễ thấy stage, agent, `when`, `post`, options |
| Validation | Nhiều lỗi chỉ lộ khi thực thi Groovy/step | Có model validation sớm hơn cho cấu trúc Declarative |
| Xử lý hậu kỳ | Tự viết bằng `try/catch/finally` | Có `post { always/failure/success }` theo khuôn |
| Bảo trì đội nhóm | Mạnh nhưng dễ thành một chương trình khó hiểu | Phù hợp mặc định cho pipeline CI/CD chuẩn hóa |

Cả hai đều là Jenkins Pipeline, dùng Jenkinsfile trong SCM, cần agent/step/plugin hợp lệ và phải xử lý secret, timeout, retry một cách có trách nhiệm. Declarative không thay thế kiểm tra runtime; Scripted không mặc nhiên dành cho luồng “nâng cao”.

### Tiêu chí chọn

Dùng các câu hỏi sau khi quyết định:

1. **Stage có cố định và policy có cần nhìn thấy ngay không?** Nếu có, chọn Declarative.
2. **Có dữ liệu nhỏ, đã kiểm soát, thực sự phải tạo flow động không?** Nếu có, Scripted có thể rõ ràng hơn việc nhồi nhiều Groovy vào `script {}`.
3. **Ai sẽ review và vận hành?** Nếu nhiều người không chuyên Groovy phải sửa Jenkinsfile, Declarative giảm chi phí đọc.
4. **Logic có thể là library không?** Nếu logic động lặp lại, tách thành shared library có test, version và quyền phù hợp; giữ Jenkinsfile là điều phối mỏng.
5. **Có đang đổi cú pháp để né một vấn đề hạ tầng không?** Thiếu label, plugin, credential hay agent isolation phải được sửa ở cấu hình/hạ tầng, không phải bằng Scripted.

Nói ngắn gọn: chọn Declarative cho quy trình chuẩn và chọn Scripted cho độ động có lý do, được giới hạn và được review.

## Lab tuyến tính

### Chuẩn bị

1. Chuẩn bị Jenkins theo [chạy Jenkins với Docker](/docs/installation/docker) hoặc một controller lab tương đương. Agent `linux` cần Git, Node.js và npm.
2. Dùng một repository Node.js an toàn, có `package-lock.json` và `package.json` khai báo `lint`, `test`, `build`. Đặt Jenkinsfile ở root repository như hướng dẫn trong [Jenkinsfile](/docs/pipelines/jenkinsfile).
3. Tạo **Multibranch Pipeline** trỏ vào repository. Cấu hình branch `main` để quan sát nhánh build production; dùng một branch khác để quan sát nhánh bị bỏ qua. Không thêm credential production vào job lab.

### Các bước và kết quả mong đợi

1. Dán Jenkinsfile ở phần trên vào repository, commit rồi để Jenkins quét branch.
   - **Kết quả mong đợi:** Build chờ queue nếu chưa có executor `linux`; khi được cấp, stage `Checkout` xuất hiện đầu tiên.
2. Chạy build của branch không phải `main`.
   - **Kết quả mong đợi:** `Cài dependencies`, `Lint`, `Unit test` đều chạy; Console Output có dòng bỏ qua build production; stage `Build production` không xuất hiện.
3. Chạy build của `main` khi `npm test` đang pass.
   - **Kết quả mong đợi:** Sau hai stage kiểm tra, `Build production` chạy; build kết thúc SUCCESS; workspace được xóa trong `finally`.
4. Tạm làm cho `npm test` trả exit code khác `0`, chẳng hạn đổi riêng script test trong một branch lab rồi chạy lại.
   - **Kết quả mong đợi:** `Unit test` thất bại, `Build production` không chạy, Console Output có command lỗi; build kết thúc FAILURE và cleanup vẫn được gọi.
5. Khôi phục script test, commit thay đổi và chạy lại.
   - **Kết quả mong đợi:** Build xanh trở lại mà không còn file dependency/artifact cũ được giả định từ build trước.

<Callout type="idea" title="Quan sát thay vì chỉ nhìn màu build">
  Mở Pipeline Graph và Console Output ở mỗi bước. Hãy xác nhận tên stage do vòng lặp tạo ra, branch condition đang dùng giá trị nào và lỗi xuất phát từ command, checkout hay việc cấp agent. Đó là cách phân biệt Groovy flow với lỗi hạ tầng.
</Callout>

## Lỗi thường gặp

<Callout type="warn" title="Node không có nghĩa là build đã chạy ngay">
  `node('linux')` có thể đúng cú pháp nhưng build vẫn chờ vì label không khớp, agent offline hoặc không có executor rảnh. Kiểm tra queue, label và cấu hình agent trước khi sửa Jenkinsfile.
</Callout>

<Callout type="warn" title="Nuốt exception làm tín hiệu sai">
  `catch (err) { echo 'lỗi' }` rồi không `throw err` có thể khiến build tiếp tục hoặc kết thúc với trạng thái không phản ánh lỗi. Chỉ bắt exception khi có policy rõ ràng; nếu build phải thất bại, ném lại lỗi hoặc gọi `error`.
</Callout>

<Callout type="warn" title="Dữ liệu động không được kiểm soát">
  Không ghép input branch, parameter hoặc tên file không tin cậy trực tiếp vào shell command. Validate bằng allowlist, quote đúng theo shell và tránh để dữ liệu bên ngoài quyết định label, credential hay command có đặc quyền.
</Callout>

## Checklist trước khi dùng

- [ ] Jenkinsfile bắt đầu bằng `node` chọn đúng agent/label; workload không chạy trên controller.
- [ ] `node` chỉ bao quanh phần thực sự cần executor và workspace.
- [ ] Mỗi `stage` mô tả một kết quả quan sát được; vòng lặp tạo số stage nhỏ, có giới hạn.
- [ ] Phân biệt rõ Groovy control flow với Pipeline step và kiểm tra step/plugin trên controller.
- [ ] `sh` có exit code được xử lý theo policy; exception quan trọng không bị nuốt.
- [ ] Timeout và retry có scope, deadline và đánh giá side effect/idempotency.
- [ ] `finally` hoặc policy tương đương dọn workspace; artifact cần giữ được xuất bản trước cleanup.
- [ ] Jenkinsfile sandbox không yêu cầu approval tùy tiện; trusted library có owner và review.
- [ ] Build từ fork không nhận secret, quyền deploy hay agent tin cậy.
- [ ] Jenkinsfile, agent label, SCM và scripts trong repository đã được chạy qua một build lab.

## Nguồn chính thức

- [Jenkins Pipeline](https://www.jenkins.io/doc/book/pipeline/) — tổng quan Pipeline, Scripted và Declarative.
- [Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — cú pháp và các bước Pipeline, gồm phần Scripted Pipeline.
- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/) — Jenkinsfile, SCM, environment và thực hành Pipeline as Code.
- [Using Jenkins agents](https://www.jenkins.io/doc/book/using/using-agents/) — controller, agent, executor và workspace.
- [Pipeline Basic Steps](https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/) — tài liệu `timeout`, `retry`, `deleteDir`, `error` và các step cơ bản.
- [Script Security](https://www.jenkins.io/doc/book/managing/script-approval/) — sandbox và script approval.
- [Jenkins Pipeline Global Variable Reference](https://www.jenkins.io/doc/book/pipeline/getting-started/#global-variable-reference) — `env`, `currentBuild`, `scm` và step có trên instance.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Pipeline" href="/docs/pipelines/overview" description="Ôn lại flow node, stage, step và mô hình Pipeline." />
  <Card title="Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Đặt Jenkinsfile trong SCM và kiểm tra trước khi chạy." />
  <Card title="Declarative Pipeline" href="/docs/pipelines/declarative" description="Chọn cú pháp có cấu trúc cho flow CI/CD thông thường." />
  <Card title="Nền tảng CI/CD" href="/docs/getting-started/ci-cd-fundamentals" description="Đặt feedback, quality gate và release vào vòng đời CI/CD." />
</Cards>
