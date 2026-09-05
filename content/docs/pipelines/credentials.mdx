---
title: "Credentials trong Pipeline"
description: "Nạp Jenkins credentials đúng phạm vi, dùng Credentials Binding an toàn và giảm rủi ro lộ secret trong Pipeline."
---

<Callout type="info" title="Phạm vi và giả định">
  Trang này giả định Jenkins đã được quản trị, plugin **Credentials Binding** đã cài và Pipeline chạy trên agent Linux được kiểm soát. Các credential ID trong ví dụ chỉ là tên minh họa; không phải secret, không tạo credential thật và không được chép giá trị bí mật vào Jenkinsfile.
</Callout>

Credential giúp Pipeline xác thực với dịch vụ ngoài mà không đưa token, mật khẩu hoặc private key vào Git. Nó không biến Pipeline thành môi trường an toàn tuyệt đối: code được chạy, agent và người có quyền cấu hình job vẫn là các phần của ranh giới tin cậy.

## Mục lục

- [Credentials là gì và cần chuẩn bị gì?](#credentials-là-gì-và-cần-chuẩn-bị-gì)
  - [Plugin và quyền tối thiểu](#plugin-và-quyền-tối-thiểu)
  - [Phạm vi credential và quyền truy cập](#phạm-vi-credential-và-quyền-truy-cập)
- [Chọn cơ chế nạp credential](#chọn-cơ-chế-nạp-credential)
  - [credentials helper trong Declarative environment](#credentials-helper-trong-declarative-environment)
  - [withCredentials cho phạm vi hẹp](#withcredentials-cho-phạm-vi-hẹp)
- [Các Credential Binding thường dùng](#các-credential-binding-thường-dùng)
  - [Secret text](#secret-text)
  - [Username và password](#username-và-password)
  - [SSH private key](#ssh-private-key)
  - [Secret file](#secret-file)
- [Masking giảm lộ lọt, không phải ranh giới bảo mật](#masking-giảm-lộ-lọt-không-phải-ranh-giới-bảo-mật)
- [Temporary files và workspace](#temporary-files-và-workspace)
  - [Vòng đời file binding](#vòng-đời-file-binding)
  - [Tránh làm file bí mật lộ trong workspace](#tránh-làm-file-bí-mật-lộ-trong-workspace)
- [Ranh giới tin cậy và vận hành](#ranh-giới-tin-cậy-và-vận-hành)
  - [PR không tin cậy và agent isolation](#pr-không-tin-cậy-và-agent-isolation)
  - [Least privilege và rotation](#least-privilege-và-rotation)
- [Lab sandbox không in secret](#lab-sandbox-không-in-secret)
  - [Điều kiện và Jenkinsfile](#điều-kiện-và-jenkinsfile)
  - [Kết quả mong đợi](#kết-quả-mong-đợi)
- [Debug an toàn](#debug-an-toàn)
- [Checklist trước khi dùng credential](#checklist-trước-khi-dùng-credential)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Credentials là gì và cần chuẩn bị gì?

Jenkins lưu credential trong credential store và Pipeline chỉ tham chiếu bằng **credential ID**. ID là một định danh như `release-api-token`; nó có thể xuất hiện trong Jenkinsfile. Giá trị phía sau ID chỉ được nạp khi cần, trên executor đang chạy bước đó. Cách tách này giúp người review thấy *credential nào* được yêu cầu mà không biết *giá trị credential là gì*.

Trước khi thêm một binding, xác định bốn điều: dịch vụ đích, quyền API nhỏ nhất cần có, stage/agent cần dùng và nguồn code nào được phép kích hoạt stage đó. Đặt một token production vào stage `Test` chỉ vì nó “có sẵn” là mở rộng bề mặt lộ lọt không cần thiết. Để ôn lại controller, agent và workspace, xem [Kiến trúc Jenkins](/docs/getting-started/architecture).

### Plugin và quyền tối thiểu

Các ví dụ `withCredentials` cần plugin [Credentials Binding](https://plugins.jenkins.io/credentials-binding/), cùng plugin Pipeline phù hợp. Plugin này liên kết một credential đã có với biến môi trường hoặc file tạm trong một closure Pipeline. Kiểu credential và binding khả dụng còn phụ thuộc plugin cung cấp kiểu đó, vì vậy hãy tra **Pipeline Syntax → Snippet Generator** trên chính controller trước khi dùng một binding mới.

Người chạy Pipeline không mặc nhiên được tạo, xem hoặc sửa mọi credential. Jenkins áp dụng authorization theo các permission trong nhóm Credentials và theo phạm vi nơi credential được đặt. Người quản trị nên tách người được quản lý credential khỏi người chỉ được kích hoạt job, đồng thời cấp cho Pipeline đúng quyền sử dụng cần thiết thay vì quyền quản trị credential.

<Callout type="warn" title="Credential ID không phải bí mật, nhưng vẫn cần review">
  ID có thể tiết lộ hệ thống hoặc môi trường đang được chạm tới, ví dụ `production-deploy`. Đừng che ID bằng tên mơ hồ; hãy dùng tên rõ trách nhiệm và review mỗi thay đổi thêm/sửa credential ID như một thay đổi quyền truy cập.
</Callout>

### Phạm vi credential và quyền truy cập

Credential thường được tổ chức ở **System**, **Global** hoặc trong **Folder**. System scope dành cho Jenkins và plugin dùng nội bộ; Pipeline thông thường không nên dựa vào nó. Global scope có thể được nhiều job dùng theo authorization hiện hành. Credential đặt trong Folder được các item con kế thừa, nên phù hợp để tách nhóm, sản phẩm hoặc môi trường mà không cấp credential đó cho mọi job trên controller.

Folder scope không thay thế permission. Quyền như tạo/cập nhật credential, xem metadata hoặc sử dụng credential phải được cấp cho đúng nhóm người và job; cấu hình authorization cụ thể có thể khác theo security realm và plugin của tổ chức. **Domain** của credential (ví dụ hostname) là gợi ý chọn credential trong UI, không phải security boundary đáng tin cậy. Kết luận thực hành: giới hạn bằng folder/job permission và token quyền tối thiểu, không dựa vào domain hay masking.

## Chọn cơ chế nạp credential

Hai cơ chế thường gặp có mục đích khác nhau. `credentials('id')` là helper của Declarative Pipeline trong directive `environment`; `withCredentials` là step của Credentials Binding để cấp biến/file trong một block ngắn. Không dùng chúng như hai cách hoán đổi tùy ý.

| Cơ chế | Nên dùng khi | Phạm vi | Điểm cần nhớ |
| --- | --- | --- | --- |
| `credentials('id')` | Declarative Pipeline có một stage cần biến môi trường theo cú pháp gọn | `environment` ở pipeline hoặc stage | Đặt ở stage để không cấp secret cho các stage khác. |
| `withCredentials(...)` | Cần chọn biến rõ ràng, binding file/SSH hoặc thu hẹp đoạn nạp secret | Closure bao quanh lệnh cần credential | Lựa chọn mặc định cho thao tác nhạy cảm vì scope dễ thấy trong diff. |

### credentials helper trong Declarative environment

Helper này chỉ hợp lệ trong `environment` của Declarative Pipeline. Với **Secret text**, biến nhận giá trị secret. Với **username/password**, biến chính nhận chuỗi `username:password` và Jenkins tạo thêm biến hậu tố `_USR` và `_PSW`. Không dùng biến ghép này để dựng URL hoặc in debug; dùng hai biến hậu tố chỉ khi công cụ cần chúng qua environment.

```groovy
pipeline {
  agent { label 'trusted-linux' }

  stages {
    stage('Publish release') {
      environment {
        RELEASE_TOKEN = credentials('release-api-token')
        REGISTRY_AUTH = credentials('registry-publish')
      }
      steps {
        sh '''
          set +x
          # Script đọc RELEASE_TOKEN, REGISTRY_AUTH_USR và REGISTRY_AUTH_PSW từ environment.
          # Nó không được in, ghi report hay truyền giá trị đó lên command line.
          ./scripts/publish-release
        '''
      }
    }
  }
}
```

Không đưa `RELEASE_TOKEN` vào `environment` cấp pipeline nếu chỉ `Publish release` cần nó. Cũng không giả định helper phù hợp mọi loại credential hoặc mọi version plugin; khi cần file tạm, SSH key hoặc mapping tên biến chính xác, dùng `withCredentials` và Snippet Generator của controller.

### withCredentials cho phạm vi hẹp

`withCredentials` chỉ nạp binding khi đi vào closure và thu hồi binding khi closure kết thúc. Đặt ngay trước `sh`, `bat` hoặc step thực sự cần credential. Dùng dấu nháy đơn/triple single quote cho shell script để shell mở rộng biến môi trường; tránh Groovy interpolation như `"${API_TOKEN}"`, vì giá trị có thể đi qua xử lý Pipeline trước khi shell chạy.

```groovy
withCredentials([
  string(credentialsId: 'release-api-token', variable: 'API_TOKEN')
]) {
  sh '''
    set +x
    # Công cụ được thiết kế để lấy API_TOKEN từ environment.
    ./scripts/publish-release
  '''
}
```

Đoạn trên không gửi token trong URL hoặc argument của command. Công cụ con vẫn phải được review: một script gọi `curl` với `$API_TOKEN` trong URL, header command-line, log hay report sẽ làm hỏng biện pháp bảo vệ ở Pipeline.

## Các Credential Binding thường dùng

Tên biến trong ví dụ là hợp đồng tạm thời giữa Pipeline và công cụ. Chọn tên mô tả loại dữ liệu, tránh dùng `SECRET` cho nhiều giá trị khác nhau, và chỉ truyền environment này vào process thực sự cần nó.

### Secret text

Secret text phù hợp cho token API, password một giá trị hoặc key ngắn. Binding `string` đưa nó vào biến môi trường trong closure.

```groovy
withCredentials([
  string(credentialsId: 'release-api-token', variable: 'API_TOKEN')
]) {
  sh '''
    set +x
    ./scripts/publish-release
  '''
}
```

`./scripts/publish-release` phải biết đọc `API_TOKEN` từ environment mà không log nó. Nếu công cụ chỉ hỗ trợ token trong URL hoặc command-line, hãy xem lại cách tích hợp hoặc dùng cơ chế cấu hình an toàn hơn; đừng chấp nhận lộ token chỉ để command chạy được.

### Username và password

Dùng `usernamePassword` khi dịch vụ cần hai trường riêng. Binding tách username và password, tránh phải tự parse chuỗi ghép hoặc đặt thông tin xác thực trong URL.

```groovy
withCredentials([
  usernamePassword(
    credentialsId: 'registry-publish',
    usernameVariable: 'REGISTRY_USER',
    passwordVariable: 'REGISTRY_PASSWORD'
  )
]) {
  sh '''
    set +x
    # Client nội bộ đọc REGISTRY_USER và REGISTRY_PASSWORD từ environment.
    ./scripts/publish-package
  '''
}
```

Username đôi khi không được xem là secret, nhưng nó vẫn có thể là dữ liệu nhạy cảm hoặc giúp kẻ tấn công đoán mô hình tài khoản. Vì vậy, cũng không in nó khi không cần thiết. Không tạo `https://user:password@host/...`, không đặt password trong `--password` và không lưu file cấu hình sinh ra nếu file đó chứa password.

### SSH private key

Binding `sshUserPrivateKey` tạo đường dẫn tới private key tạm thời. Nó cũng có thể nạp username và passphrase khi credential có các trường đó. Đường dẫn không phải giá trị private key, nhưng cũng không nên in ra log hay lưu vào artifact.

```groovy
withCredentials([
  sshUserPrivateKey(
    credentialsId: 'deploy-ssh-key',
    keyFileVariable: 'SSH_KEY',
    usernameVariable: 'SSH_USER',
    passphraseVariable: 'SSH_PASSPHRASE'
  )
]) {
  sh '''
    set +x
    chmod 600 "$SSH_KEY"
    # Script dùng SSH_KEY và SSH_USER từ environment; không ghi passphrase ra disk/log.
    ./scripts/deploy-over-ssh
  '''
}
```

Chỉ cấp SSH key cho agent và branch được tin cậy, giới hạn key ở đúng host/command nếu hạ tầng hỗ trợ, và xác minh host key theo policy. Không dùng `StrictHostKeyChecking=no` để né cấu hình known hosts; cách đó làm mất một kiểm soát quan trọng trước máy chủ giả mạo.

### Secret file

Binding `file` dùng cho certificate, license file, cấu hình ký hoặc cấu hình client mà công cụ bắt buộc đọc từ file. Biến chứa **path tạm**, không phải nội dung file.

```groovy
withCredentials([
  file(credentialsId: 'release-signing-config', variable: 'SIGNING_CONFIG')
]) {
  sh '''
    set +x
    # Công cụ đọc file ở path SIGNING_CONFIG; không copy hay archive file này.
    ./scripts/sign-release
  '''
}
```

Không dùng `cat "$SIGNING_CONFIG"`, `base64 "$SIGNING_CONFIG"` hoặc đưa path/nội dung này vào diagnostic bundle. Nếu tool tạo output chứa phần của cấu hình bí mật, loại output đó khỏi `archiveArtifacts`, report test và cache.

## Masking giảm lộ lọt, không phải ranh giới bảo mật

Credentials Binding cố gắng mask giá trị credential đã biết và một số biến thể bị shell escape trong console log. Điều này hữu ích khi một lệnh vô tình in token, nhưng không đảm bảo bắt được mọi biến đổi, encoding, công cụ bên thứ ba hay nơi log khác. Masking không ngăn code đã nhận secret gửi nó ra network, ghi nó vào file hoặc đọc nó từ environment/file tạm.

<Callout type="error" title="Không coi masking là quyền truy cập">
  Bất kỳ Pipeline hoặc dependency nào chạy với credential đều cần được coi là có thể sử dụng credential đó. Masking chỉ giảm xác suất secret hiện rõ trên Console Output; nó không phải sandbox, firewall hay cơ chế ngăn exfiltration.
</Callout>

Áp dụng các quy tắc sau trong mọi binding:

- không `echo`, `printenv`, `env`, `set`, `cat` hay debug dump biến/file credential;
- không bật `set -x`/shell tracing quanh lệnh nhạy cảm; `set +x` chỉ tắt tracing đã được bật từ môi trường;
- không ghép secret vào URL, command-line, build parameter, commit message, artifact, test report, cache hoặc notification;
- không dùng Groovy interpolation của biến secret trong `sh`, `bat`, `powershell` hay URL;
- giả định user hoặc process khác cùng quyền trên agent có thể quan sát process/environment tùy hệ điều hành, nên không chạy workload không tin cậy cạnh job có secret.

Nếu nghi ngờ secret đã lộ, dừng dùng credential theo quy trình incident response, thu hồi hoặc rotate ở hệ thống phát hành secret, đánh giá log/artifact/report đã bị phát tán và sửa Pipeline. Xóa một dòng console không làm token đã bị sao chép trở nên an toàn.

## Temporary files và workspace

File binding và SSH key binding cần một file có thể đọc được bởi process build. Plugin tạo file tạm trên agent cho scope của `withCredentials`; path được đặt trong biến như `SIGNING_CONFIG` hoặc `SSH_KEY`. Workspace là storage của agent, có thể tái sử dụng giữa build và có thể bị người có quyền workspace truy cập. Vì vậy file tạm không được xem là dữ liệu đã cô lập tuyệt đối.

### Vòng đời file binding

Trong điều kiện bình thường, Credentials Binding tạo file lúc vào closure và xóa binding lúc closure kết thúc, kể cả khi command trong closure thất bại. Vì vậy giữ closure ngắn và để `withCredentials` quản lý file thay vì tự copy file ra vị trí khác. Nếu agent bị crash, mất kết nối hoặc process bị giết đột ngột, cleanup có thể bị trì hoãn; workspace/temporary directory còn lại phải được dọn theo chính sách agent.

`post { always { ... } }` là lớp cleanup bổ sung cho dữ liệu build do Pipeline tạo, không phải lý do để copy secret file. Với agent ephemeral, hủy pod/VM sau build giảm thời gian dữ liệu tạm tồn tại. Với agent cố định, dùng workspace cleanup có kiểm soát, quyền filesystem tối thiểu và không chia cùng user/host cho workload không tin cậy.

```groovy
post {
  always {
    // Chỉ dọn output của build sau khi các binding đã rời scope.
    deleteDir()
  }
}
```

Không cho `archiveArtifacts`, `junit`, `stash` hoặc công cụ upload quét toàn bộ workspace một cách mù quáng. Những hành động đó có thể lấy cả file tạm, file cấu hình sinh ra hoặc cache có secret trước khi cleanup kịp chạy.

### Tránh làm file bí mật lộ trong workspace

Thứ tự lồng block ảnh hưởng nơi Jenkins tạo temporary directory. Tránh tạo file binding **bên trong** `dir('subdir')`, vì path tạm có thể nằm gần workspace có thể duyệt/browse. Ưu tiên nạp credential trước rồi mới đổi thư mục làm việc:

```groovy
withCredentials([
  file(credentialsId: 'release-signing-config', variable: 'SIGNING_CONFIG')
]) {
  dir('build-output') {
    sh '''
      set +x
      ./scripts/sign-release
    '''
  }
}
```

Khi rủi ro đọc workspace vẫn không chấp nhận được, cấp một workspace riêng bằng `ws { ... }` ngoài `withCredentials`, hoặc dùng agent ephemeral đã được cô lập. Đây là giảm bề mặt lộ path/file trên agent, không thay thế quyền folder/job và trust policy.

<Callout type="warn" title="Không archive file tạm">
  Path của file credential có thể không nằm ngay trong thư mục source, nhưng glob quá rộng như `**/*` hoặc một script copy toàn workspace vẫn có thể làm lộ nó. Chỉ archive danh sách output đã biết, ví dụ `dist/*.tgz`, và review report/cache được upload.
</Callout>

## Ranh giới tin cậy và vận hành

Credential được nạp vào nơi Pipeline thực thi, nên quyết định cấp secret đồng thời là quyết định tin cậy source code, Shared Library, plugin, agent image và process con của stage đó. Bảo vệ Jenkins controller là cần thiết, nhưng không đủ nếu agent chạy lệnh của repository không tin cậy với token phát hành.

### PR không tin cậy và agent isolation

Một pull request từ fork, hoặc branch mà người đóng góp chưa được tin cậy có thể sửa `Jenkinsfile`, script build và dependency để tìm cách đọc secret. Không cấp credential deploy/production, quyền cloud rộng, SSH key hay agent có dữ liệu nhạy cảm cho build đó. Chạy CI không tin cậy trên agent/pod riêng, quyền mạng tối thiểu và image có thể tái tạo; chạy release chỉ sau merge vào branch được bảo vệ hoặc sau approval có chủ đích.

Ngay cả PR nội bộ cũng không tự động đáng tin nếu mọi developer có thể sửa pipeline. Tách pool agent theo mức tin cậy và không dùng chung executor/user filesystem giữa build PR và build phát hành. Built-in node của controller không phải nơi chạy workload này. Xem mô hình controller–agent tại [Kiến trúc Jenkins](/docs/getting-started/architecture).

### Least privilege và rotation

Mỗi credential nên có owner, mục đích, scope, hệ thống đích, quyền tối thiểu và ngày/điều kiện rotation rõ ràng. Tách token đọc source, token publish artifact và quyền deploy production. Một token chỉ được upload vào một repository không cần quyền xóa repository hay quản trị organization.

Khi rotate, tạo phiên bản mới trong secret system/Jenkins theo quy trình được kiểm soát, thử trên stage sandbox hoặc branch tin cậy, cập nhật consumer theo ID/policy và thu hồi phiên bản cũ sau thời gian chuyển đổi. Không đăng token cũ/new trong ticket, log hay Jenkinsfile để “so sánh”. Hãy audit credential không còn consumer và xóa theo quy trình tổ chức sau khi xác nhận, thay vì giữ vĩnh viễn.

## Lab sandbox không in secret

Lab này kiểm tra **phạm vi binding và cleanup**, không kiểm tra giá trị secret. Nó không hướng dẫn tạo credential. Chỉ thực hiện khi administrator đã chuẩn bị sẵn một credential sandbox không có quyền production với ID `sandbox-api-token`, trên folder/job lab và agent `sandbox-linux` tách biệt. Nếu ID đó không tồn tại, dừng lab và nhờ administrator theo quy trình của tổ chức.

### Điều kiện và Jenkinsfile

Tạo một Pipeline job sandbox hoặc dùng branch tin cậy của repository lab. Đoạn script dưới đây không checkout code, không in biến `SANDBOX_TOKEN` và không tạo artifact. `false` mô phỏng command thất bại để quan sát cleanup `post` mà không tiết lộ token.

```groovy
pipeline {
  agent { label 'sandbox-linux' }

  stages {
    stage('Kiểm tra scope binding') {
      steps {
        withCredentials([
          string(credentialsId: 'sandbox-api-token', variable: 'SANDBOX_TOKEN')
        ]) {
          sh '''
            set +x
            test -n "$SANDBOX_TOKEN"
            false
          '''
        }
      }
    }
  }

  post {
    always {
      deleteDir()
      echo 'Sandbox cleanup đã được yêu cầu; không có giá trị credential nào được in.'
    }
  }
}
```

`test -n` chỉ trả mã thành công/thất bại, không xuất giá trị biến. `false` làm stage và build có trạng thái `FAILURE` theo thiết kế. Không thay `false` bằng `echo "$SANDBOX_TOKEN"` khi debug.

### Kết quả mong đợi

- Jenkins phân bổ agent có label `sandbox-linux`; không dùng built-in node/controller.
- Stage `Kiểm tra scope binding` thất bại tại `false`, và build kết thúc `FAILURE`.
- Console Output có thông báo cleanup nhưng không có giá trị token, URL có token, dump environment hoặc artifact/report.
- Sau khi closure kết thúc, Credentials Binding thực hiện cleanup binding; `post { always }` chạy dọn workspace dù stage thất bại. Nếu agent bị ngắt đột ngột, ghi nhận việc cleanup chưa được xác minh và để chính sách dọn agent xử lý.

<Callout type="idea" title="Bài học của lab">
  Kết quả đúng không phải là nhìn thấy secret đã được mask. Kết quả đúng là Pipeline chứng minh được credential tồn tại bằng exit status, đồng thời không tạo đường nào để secret đi vào console, artifact hay report.
</Callout>

## Debug an toàn

Bắt đầu từ metadata không nhạy cảm: credential ID, loại binding, folder/job scope, tên agent, label, stage, revision và thời điểm lỗi. Xác nhận plugin Credentials Binding/Pipeline tương thích, credential chưa hết hạn/thu hồi và job có quyền dùng credential theo policy. Với file binding, chỉ kiểm tra file có tồn tại trong closure bằng lệnh không in path hoặc nội dung, ví dụ `test -r "$SIGNING_CONFIG"`; xóa lệnh sau khi chẩn đoán.

Không yêu cầu ai gửi secret qua chat, screenshot, ticket hay Console Output. Không dùng `printenv`, `env`, `set -x`, `curl -v`, `ssh -vvv` hoặc diagnostic archive toàn workspace trong stage có binding. Nếu endpoint từ chối xác thực, kiểm tra log audit phía hệ thống đích bằng request ID/thời điểm, chứ không xác nhận bằng cách in token.

Khi lỗi chỉ xảy ra ở PR, kiểm tra trust policy trước khi nới quyền. Việc thêm credential vào PR để “debug nhanh” biến lỗi cấu hình thành sự cố security. Hãy tái hiện trên job sandbox được tin cậy với credential sandbox có quyền nhỏ nhất.

## Checklist trước khi dùng credential

- [ ] Credentials Binding và plugin cung cấp credential type đã được cài/cập nhật theo policy; snippet được kiểm tra trong **Pipeline Syntax** của controller.
- [ ] Credential ID có owner, mục đích, hệ thống đích, quyền tối thiểu và kế hoạch rotation/thu hồi.
- [ ] Credential nằm ở folder/job scope hẹp nhất; permission quản lý và sử dụng không cấp rộng hơn cần thiết.
- [ ] `credentials('id')` chỉ nằm trong `environment` của stage cần nó, hoặc `withCredentials` bao đúng closure ngắn nhất.
- [ ] Jenkinsfile, Groovy interpolation, URL, command-line, build parameter, artifact, report, cache và notification không chứa secret.
- [ ] Không có `echo` secret, `printenv`, `set -x` hay debug dump khi binding còn hiệu lực.
- [ ] File/SSH binding không bị copy, archive, stash hoặc upload; `post { always }` dọn output build và agent có chính sách cleanup khi failure/crash.
- [ ] PR/branch không tin cậy không nhận release credential và không chạy chung agent/user filesystem với build tin cậy.
- [ ] Agent production được cô lập, có quyền mạng/filesystem tối thiểu và không phải built-in node của controller.
- [ ] Khi nghi ngờ lộ lọt, credential được rotate/thu hồi theo incident process thay vì chỉ tin vào masking hoặc xóa log.

## Nguồn Jenkins chính thức

- [Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — quản lý credential và permission.
- [Using a Jenkinsfile: handling credentials](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#handling-credentials) — `credentials()` trong Declarative `environment`.
- [Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — cú pháp Pipeline và Snippet Generator.
- [Credentials Binding plugin](https://plugins.jenkins.io/credentials-binding/) — `withCredentials`, masking và cảnh báo secret file/workspace.
- [Using Jenkins agents](https://www.jenkins.io/doc/book/using/using-agents/) — agent, executor và workspace.
- [Controller isolation](https://www.jenkins.io/doc/book/security/controller-isolation/) — cô lập controller khỏi workload build.
- [Securing Jenkins](https://www.jenkins.io/doc/book/security/) — authorization, hardening và vận hành bảo mật.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Jenkins" href="/docs/getting-started/overview" description="Ôn lại job, Pipeline, agent và credential store." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu controller, agent, workspace và ranh giới tin cậy." />
  <Card title="Yêu cầu hệ thống" href="/docs/getting-started/requirements" description="Chuẩn bị agent, storage và network trước khi chạy Pipeline." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Dựng controller lab có persistent storage một cách an toàn." />
</Cards>
