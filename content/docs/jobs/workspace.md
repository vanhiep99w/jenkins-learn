---
title: "Workspace Management"
description: "Hiểu vòng đời workspace và chiến lược cleanup."
---

Workspace là thư mục làm việc tạm thời trên **agent** nơi Jenkins checkout source và chạy build. Nó rất tiện cho dữ liệu ngắn hạn, nhưng không phải artifact store, cache dùng chung mặc định hay nơi an toàn để giữ secret. Bài này dùng ví dụ Pipeline trên agent Linux; tên label, đường dẫn và plugin phải được đối chiếu với controller của bạn trước khi áp dụng ngoài sandbox.

## Mục lục

- [Mục tiêu](#mục-tiêu)
- [Vòng đời workspace](#vòng-đời-workspace)
  - [Từ queue đến cleanup](#từ-queue-đến-cleanup)
  - [Điều gì không được workspace bảo đảm](#điều-gì-không-được-workspace-bảo-đảm)
- [Custom workspace: lợi ích và đánh đổi](#custom-workspace-lợi-ích-và-đánh-đổi)
  - [Khi nào dùng](#khi-nào-dùng)
  - [Khi nào không dùng](#khi-nào-không-dùng)
- [Cleanup policy](#cleanup-policy)
  - [`deleteDir()`: lựa chọn mặc định trong Pipeline](#deletedir-lựa-chọn-mặc-định-trong-pipeline)
  - [Workspace Cleanup Plugin và `cleanWs`](#workspace-cleanup-plugin-và-cleanws)
  - [Retention không phải cleanup](#retention-không-phải-cleanup)
- [Concurrent builds và cô lập với `ws`](#concurrent-builds-và-cô-lập-với-ws)
- [Credential, secret và filesystem hygiene](#credential-secret-và-filesystem-hygiene)
- [Lab sandbox: quan sát cấp phát, cô lập và dọn workspace](#lab-sandbox-quan-sát-cấp-phát-cô-lập-và-dọn-workspace)
  - [Điều kiện](#điều-kiện)
  - [Jenkinsfile lab](#jenkinsfile-lab)
  - [Kết quả mong đợi](#kết-quả-mong-đợi)
- [Troubleshooting](#troubleshooting)
- [Checklist xác minh](#checklist-xác-minh)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mục tiêu

Sau bài này, bạn có thể xác định workspace nào một build thực sự được cấp, chọn giữa workspace mặc định, custom workspace và `ws`, rồi dọn đúng dữ liệu mà build sở hữu. Bạn cũng biết cách tách **cleanup filesystem** khỏi **retention build**, tránh để hai build cùng ghi một đường dẫn, và không biến workspace thành nơi lưu credential hoặc output phát hành.

## Vòng đời workspace

### Từ queue đến cleanup

Workspace chỉ tồn tại trong ngữ cảnh agent/executor. Khi Pipeline hoặc stage yêu cầu `agent`, Jenkins xếp build vào queue, chọn node khớp label và có executor trống, rồi cấp một thư mục làm việc trên filesystem của agent. Biến `WORKSPACE` và lệnh `pwd` cho biết đường dẫn mà step hiện tại đang dùng; chúng là bằng chứng tốt hơn việc đoán path từ tên job.

Một vòng đời điển hình là:

1. **Cấp agent và workspace.** Jenkins chọn agent, executor và workspace cho allocation hiện tại. Với Pipeline có `agent none`, mỗi stage có agent riêng có thể nhận node và workspace khác nhau.
2. **Tạo dữ liệu tạm.** Checkout, dependency đã tải, file build, report test và log cục bộ được tạo dưới workspace. Một build trước trên agent cố định có thể đã để lại file nếu không có policy dọn phù hợp.
3. **Xuất dữ liệu cần giữ.** Archive output theo allowlist, publish vào artifact repository, hoặc `stash` lượng file nhỏ cho stage sau trước khi dọn. Workspace không phải nguồn lưu trữ bền vững.
4. **Cleanup.** `deleteDir()` hoặc policy plugin xóa dữ liệu do build sở hữu sau khi evidence cần thiết đã được lưu. Với agent ephemeral, pod/VM có thể bị hủy sau build; đây là lớp dọn bổ sung, không thay thế việc thiết kế output và secret an toàn.
5. **Tái sử dụng hoặc mất workspace.** Agent cố định có thể tái sử dụng thư mục cho run sau. Agent ephemeral, disk cleanup của hệ điều hành, node offline hoặc agent bị thay thế có thể làm workspace biến mất bất kỳ lúc nào.

```text
Queue → agent/executor → workspace → checkout/build/test
                                      │
                                      ├─ archive/publish output cần giữ
                                      └─ cleanup dữ liệu tạm do build sở hữu
```

`WORKSPACE` không phải một path toàn cục. Nó thay đổi theo node, job, folder, stage agent, container/pod và cấu hình node. Đừng truyền path của nó sang một agent khác rồi giả định filesystem được mount chung. Khi stage sau cần file từ stage trước trên agent khác, dùng artifact, repository, hoặc `stash`/`unstash` cho dữ liệu nhỏ trong cùng Pipeline theo thiết kế rõ ràng.

### Điều gì không được workspace bảo đảm

Workspace không tự cung cấp các tính chất sau:

| Điều tưởng như đúng | Thực tế | Cách làm đúng |
| --- | --- | --- |
| File còn ở đó cho build sau | Agent có thể bị dọn, thay thế hoặc dùng path khác. | Archive/publish output cần giữ; cache cần policy, owner và quota riêng. |
| Hai stage luôn thấy cùng file | Stage-level agent có thể chạy trên node khác. | Truyền file bằng cơ chế được thiết kế, không dựa vào disk ngầm. |
| Cleanup luôn chạy | Abort, agent mất kết nối hoặc process/host chết có thể ngăn cleanup Pipeline hoàn tất. | Giữ agent cleanup/ephemeral lifecycle, quota và kiểm tra orphan theo policy. |
| Workspace chỉ có một build | Executor, custom path hoặc cấu hình sai có thể tạo chia sẻ ngoài ý muốn. | Để Jenkins cấp path mặc định, dùng `ws` khi cần isolation, hoặc tắt concurrency có chủ đích. |
| Xóa workspace xóa mọi bản sao dữ liệu | Artifact, cache, log, report, backup và process ngoài workspace có vòng đời riêng. | Xác định từng nơi dữ liệu đi qua; xử lý secret theo incident/rotation khi cần. |

Kết luận thực hành: coi workspace là vùng scratch của một allocation. Chỉ đặt ở đó dữ liệu có thể tái tạo hoặc có policy xử lý rõ ràng.

## Custom workspace: lợi ích và đánh đổi

**Custom workspace** là đường dẫn do cấu hình job hoặc Pipeline yêu cầu thay vì vị trí mặc định Jenkins chọn. Trong Declarative Pipeline, `customWorkspace` là thuộc tính của `agent { node { ... } }`; Freestyle job có trường cấu hình workspace riêng. Cú pháp và đường dẫn thực tế phải được xác nhận trong Pipeline Syntax/UI trên controller đích.

```groovy
pipeline {
  agent {
    node {
      label 'trusted-linux'
      customWorkspace '/srv/jenkins-workspaces/release-ci'
    }
  }

  stages {
    stage('Build') {
      steps {
        sh 'pwd'
      }
    }
  }
}
```

Ví dụ chỉ minh họa cấu trúc. Không sao chép `/srv/jenkins-workspaces/release-ci` vào production khi chưa có owner filesystem, quyền truy cập, quota, backup/exclusion và policy concurrent build. Đường dẫn tuyệt đối có thể thuộc filesystem dùng chung, mount ngoài dự kiến hoặc chứa dữ liệu của job khác.

### Khi nào dùng

Custom workspace có thể hợp lý khi có một lý do vận hành cụ thể, chẳng hạn:

- build cần filesystem/node-local có dung lượng hoặc hiệu năng được quản trị riêng;
- tool legacy yêu cầu một vị trí làm việc cố định và không thể cấu hình lại;
- đội vận hành đã provision một mount riêng cho **một** workload, có ownership và cleanup policy rõ;
- cần tách workspace khỏi remote root mặc định của agent vì giới hạn path hoặc filesystem.

Trước khi dùng, kiểm tra path nằm trên đúng agent pool, service user Jenkins có quyền tối thiểu cần thiết, không đi qua symlink bất ngờ, không chia với source không tin cậy và có đủ dung lượng/inode. Ghi rõ owner, quota, backup policy và điều gì được phép tồn tại sau build.

### Khi nào không dùng

Không đặt custom workspace chỉ để "dễ nhớ" hoặc để nhiều job nhìn thấy cùng file. Nó thường làm mất cơ chế cấp phát workspace của Jenkins và tăng nguy cơ hai run ghi đè, cleanup nhầm hoặc lưu dữ liệu lâu hơn dự kiến.

| Nhu cầu thật | Không nên dùng custom workspace vì | Lựa chọn tốt hơn |
| --- | --- | --- |
| Chuyển output giữa stage/agent | Disk local không phải transport liên agent. | `stash` nhỏ trong cùng run, archive/publish artifact khi cần giữ. |
| Tăng tốc dependency | Workspace cache dễ lẫn trust/owner và bị cleanup. | Cache service hoặc mount cache có key, ACL, quota và policy riêng. |
| Chạy hai build cùng lúc | Một path cố định là điểm va chạm. | `ws` để cấp workspace riêng, hoặc `disableConcurrentBuilds()` nếu resource không thể song song. |
| Giữ release lâu dài | Workspace có thể biến mất hoặc bị dọn. | Artifact repository/object store có version, checksum và retention. |
| Sửa lỗi permission | Đổi path che nguyên nhân và có thể mở quyền rộng. | Sửa ownership/mode/ACL của agent service user theo change process. |

`customWorkspace` cũng không phải security boundary. Một path khác không cô lập process cùng user, Docker socket, network, cache mount, credential scope hay code không tin cậy. Tách agent/pool, identity filesystem và quyền credential theo trust boundary vẫn là yêu cầu riêng.

## Cleanup policy

Cleanup là việc trả lại dữ liệu tạm của build hiện tại. Policy tốt phải nói rõ **path nào**, **ai sở hữu**, **khi nào xóa**, **evidence nào phải được xuất trước**, và **ai xử lý nếu cleanup không hoàn thành**. Không dùng lệnh xóa đệ quy tự viết với path từ parameter, branch name hay biến không được kiểm soát.

### `deleteDir()`: lựa chọn mặc định trong Pipeline

`deleteDir()` là Pipeline: Basic Steps để xóa đệ quy thư mục làm việc hiện hành, gồm file và thư mục con. Nó không cần shell, nên tránh khác biệt quoting giữa hệ điều hành. Gọi step này tại workspace Jenkins đã cấp; không `dir()` sang một path dùng chung rồi xóa, không thay bằng `rm -rf`, `rmdir /s` hay wildcard.

Mẫu sau archive output hẹp trước, sau đó dọn workspace trong `post { cleanup }`. Điều kiện `cleanup` của Declarative chạy sau các post condition khác; vì vậy evidence đã được publish trước khi xóa.

```groovy
pipeline {
  agent { label 'sandbox-linux' }

  options {
    skipDefaultCheckout(true)
  }

  stages {
    stage('Tạo output vô hại') {
      steps {
        sh '''#!/bin/sh
          set -eu
          mkdir -p dist
          printf 'workspace cleanup demo\n' > dist/result.txt
        '''
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'dist/result.txt', allowEmptyArchive: false
    }
    cleanup {
      deleteDir()
    }
  }
}
```

`deleteDir()` không phải bằng chứng rằng file đã bị xóa trong mọi tình huống. Nếu agent bị mất, controller dừng, permission không đủ, process còn mở file hoặc workspace nằm trên filesystem lỗi, step có thể không chạy hoặc fail. Giữ Console Output/build result làm evidence, theo dõi disk agent và để owner agent xử lý orphan bằng quy trình có kiểm soát. Không chạy lại cleanup với một path tự chọn để "chắc chắn".

### Workspace Cleanup Plugin và `cleanWs`

[Workspace Cleanup Plugin](https://plugins.jenkins.io/ws-cleanup/) cung cấp step `cleanWs` và các tùy chọn cleanup cho job. Đây là plugin, không phải Jenkins core; cài đặt, version, permission và tham số phải được review theo policy. Dùng **Pipeline Syntax → Snippet Generator** của controller đang chạy để lấy câu lệnh chính xác thay vì sao chép một danh sách option từ Internet.

Ví dụ tối thiểu dưới đây chỉ minh họa vị trí step. Nó cần plugin đã được phê duyệt.

```groovy
post {
  cleanup {
    cleanWs()
  }
}
```

Các caveat quan trọng:

- Với pattern include/exclude, plugin có ngữ nghĩa riêng: kiểm tra kỹ pattern và thư mục được chọn trong sandbox. Pattern rộng có thể giữ hoặc xóa nhiều hơn người viết Jenkinsfile dự tính. Bắt đầu bằng workspace dành riêng, không dùng pattern để bảo vệ dữ liệu nhạy cảm.
- Plugin có thể dùng **deferred wipeout** để giao việc xóa một workspace lớn cho Async Resource Disposer. Điều này cải thiện thời gian kết thúc build nhưng cleanup vật lý có thể diễn ra sau; theo dõi disposer/disk và đừng coi build `SUCCESS` là xác nhận directory đã biến mất ngay lập tức.
- Khi policy yêu cầu wipeout đồng bộ hoặc filesystem không phù hợp deferred wipeout, chỉ thay đổi option/node property sau khi thử trên sandbox và có owner vận hành. Đừng vô hiệu hóa cơ chế chỉ vì một lần cleanup chậm.
- Nếu muốn dọn **trước checkout** trong Declarative Pipeline, cần `skipDefaultCheckout(true)` rồi gọi cleanup ở bước đầu; nếu không Jenkins có thể checkout trước lúc step cleanup chạy. Việc này chỉ phù hợp khi job thật sự sở hữu toàn workspace và source cần được checkout lại.
- `cleanWs` hay `deleteDir()` không sửa được secret đã bị archive, upload, in log hoặc process khác đọc. Với nghi ngờ lộ credential, thu hồi/rotate theo quy trình incident thay vì chỉ dọn disk.

Chọn một cơ chế chính cho một job. `deleteDir()` thường đủ cho Pipeline nhỏ với workspace được cấp riêng. Dùng `cleanWs` khi plugin đã được phê duyệt và bạn cần hành vi/policy của plugin đã được kiểm chứng; không thêm cả hai chỉ để cảm thấy an tâm.

### Retention không phải cleanup

`buildDiscarder(logRotator(...))` quản lý build record, log và artifact theo thời gian/số lượng. Nó không dọn ngay filesystem của agent. Ngược lại, `deleteDir()`/`cleanWs` dọn data tạm trong workspace nhưng không xóa artifact đã archive, build record, cache ngoài workspace hay object ở artifact repository.

| Câu hỏi | Cleanup workspace | Retention build/artifact |
| --- | --- | --- |
| Đối tượng | File tạm trên agent cho một allocation/run | Build record, Console Output và artifact đã lưu |
| Thời điểm | Kết thúc stage/Pipeline hoặc policy agent | Theo số build/ngày và policy controller/backend |
| Owner | Job/Pipeline và owner agent | Owner Jenkins/controller, artifact store và compliance |
| Rủi ro nếu làm sai | Xóa file run khác hoặc mất evidence chưa publish | Mất khả năng điều tra hoặc làm đầy storage/backup |

Thiết kế hai policy riêng, rồi xác minh cả workspace disk lẫn controller/artifact storage. Artifact cần điều tra hoặc phát hành phải được archive/publish theo allowlist trước cleanup, không giữ lại trong workspace chỉ vì retention của job đang dài.

## Concurrent builds và cô lập với `ws`

Một job có thể có nhiều build đồng thời nếu có executor và cấu hình job cho phép. Jenkins thường cấp workspace thay thế với hậu tố như `@2` khi path cơ sở đang bận, nhưng đây không phải lý do để build dựa vào một tên directory cố định. Chỉ `pwd`/`WORKSPACE` của run hiện tại cho biết path đã được cấp.

Step `ws` yêu cầu Jenkins cấp một workspace cho block. Khi path yêu cầu đang được dùng, Jenkins có thể chọn một path thay thế, thường có hậu tố `@2`; do đó code không được giả định chính xác suffix hay tự tạo path `@2`. Hãy để Jenkins trả lời path nào thuộc về build, và luôn thao tác qua context `ws` đó.

```groovy
node('sandbox-linux') {
  // WORKSPACE đã có sau khi node được cấp. Base giống nhau để Jenkins
  // minh họa việc cấp path riêng khi hai run overlap.
  ws("${env.WORKSPACE}-isolated") {
    sh '''#!/bin/sh
      set -eu
      printf 'build=%s\n' "$BUILD_TAG" > ownership.txt
      pwd
      cat ownership.txt
    '''
    deleteDir()
  }
}
```

Trong Declarative Pipeline, đặt `ws { ... }` trong `script { ... }` ở một `steps` block như lab bên dưới. `ws` chỉ cô lập **workspace filesystem**; nó không cô lập port TCP, Docker daemon, database, bucket, cache mount, license server hay resource ngoài Jenkins. Nếu hai build cùng thay đổi một resource external, hãy tạo resource theo build ID/namespace có owner hoặc dùng lock/serialization được phê duyệt cho resource đó.

Khi workload không thể chạy song song an toàn, biểu đạt điều đó rõ ràng thay vì hy vọng workspace suffix giải quyết mọi va chạm:

```groovy
options {
  disableConcurrentBuilds()
}
```

`disableConcurrentBuilds()` đánh đổi throughput để tránh nhiều run của **cùng job** cùng chạy; nó không khóa job khác, không bảo vệ custom workspace dùng chung giữa nhiều job, và không thay thế isolation cho hạ tầng ngoài. Chọn serialization khi tool hoặc resource không hỗ trợ nhiều writer; chọn `ws` khi file tạm của các run cần tách riêng.

## Credential, secret và filesystem hygiene

Workspace có thể bị tái sử dụng, được browse bởi người có quyền job/agent, đưa vào backup hoặc bị glob quá rộng bởi archive/report/cache tool. Vì vậy secret không thuộc về workspace. Jenkins Credentials chỉ giảm việc đặt giá trị bí mật trong Git; khi bind credential, Pipeline, agent, process con và source code trong scope đó đều là một phần trust boundary.

Áp dụng các quy tắc sau:

- Chỉ bind credential trong closure/stage ngắn nhất cần nó. Không đặt token, password, private key, `.env`, kubeconfig hay secret bootstrap trong Jenkinsfile, parameter, custom workspace hoặc artifact.
- Không `echo`, `printenv`, `env`, `set`, `cat` file binding, bật `set -x`, hoặc Groovy-interpolate secret vào `sh`, `bat`, URL hay command line. Masking Console Output không ngăn exfiltration, encoding hay file/report chứa secret.
- Với credential file, tránh đặt `dir('subdir')` **bên ngoài** `withCredentials` theo cách làm file tạm nằm gần directory có thể browse. Nếu cần tách workspace, đặt `ws { ... }` bên ngoài binding rồi giữ binding bên trong scope ngắn nhất.
- Archive, `stash`, test report và upload chỉ dùng allowlist output đã biết, ví dụ `dist/release/**`; không dùng `**/*` hoặc copy cả workspace. Cleanup sau đó không cứu được file đã archive.
- Không chạy pull request/fork hoặc source không tin cậy cùng agent user/filesystem với release build có credential. Tách pool, identity, network và credential scope; built-in node/controller không phải build worker cho workload này.
- Nếu nghi ngờ secret đã lộ, dừng capability, thu hồi/rotate tại hệ thống phát hành secret và đánh giá log, artifact, cache, workspace, backup và bên nhận theo quy trình incident. Xóa workspace chỉ là một hành động containment có phạm vi hẹp.

## Lab sandbox: quan sát cấp phát, cô lập và dọn workspace

Lab này không checkout SCM, không cần credential, không gọi network và chỉ tạo một marker vô hại trong workspace do Jenkins cấp. Nó chứng minh path được cấp và cleanup trong luồng bình thường; nó **không** chứng minh cleanup khi agent/host bị mất đột ngột.

### Điều kiện

- Một Jenkins sandbox bạn kiểm soát, với agent Linux online mang label `sandbox-linux`, shell POSIX và quyền tạo Pipeline job.
- Không dùng built-in node/controller cho lab. Nếu agent có một executor, lab vẫn kiểm tra lifecycle; để quan sát hai path đồng thời, cần hai executor sandbox phù hợp hoặc hai agent cùng label.
- Không thêm SCM, credential, Docker socket, mount dùng chung hay plugin ngoài Pipeline cơ bản. Xác minh `ws`, `deleteDir` và Declarative Pipeline trong Pipeline Syntax/Steps Reference của controller.

### Jenkinsfile lab

Tạo Pipeline job tên `workspace-lifecycle-lab`, chọn **Pipeline script**, dán Jenkinsfile sau và chạy **Build Now**. `skipDefaultCheckout(true)` bảo đảm lab không checkout repository. `ws` dùng base sinh từ workspace hiện tại; Jenkins quản lý path thực tế nếu có run khác đang dùng cùng base. `try/finally` chỉ cleanup context `ws` vừa được cấp.

```groovy
pipeline {
  agent { label 'sandbox-linux' }

  options {
    skipDefaultCheckout(true)
  }

  stages {
    stage('Cấp workspace cô lập') {
      steps {
        script {
          ws("${env.WORKSPACE}-workspace-lab") {
            try {
              sh '''#!/bin/sh
                set -eu
                printf 'BUILD_TAG=%s\n' "$BUILD_TAG" > ownership.txt
                printf 'NODE_NAME=%s\n' "$NODE_NAME" >> ownership.txt
                printf 'WORKSPACE=%s\n' "$WORKSPACE" >> ownership.txt
                printf 'allocated_path=%s\n' "$(pwd)"
                cat ownership.txt
                sleep 20
              '''
            } finally {
              deleteDir()
              echo 'Đã yêu cầu dọn workspace cô lập của lab.'
            }
          }
        }
      }
    }
  }
}
```

Để quan sát concurrency, bấm **Build Now** lần thứ hai trong lúc build đầu còn ngủ. Chỉ làm điều này trên sandbox có đủ hai executor; nếu build thứ hai chờ queue vì chỉ có một executor, đó là quan sát capacity hợp lệ chứ không phải lỗi của `ws`.

### Kết quả mong đợi

| Quan sát | Kết quả đúng |
| --- | --- |
| Console Output của mỗi build | Có `allocated_path=...`, `BUILD_TAG`, `NODE_NAME` và `WORKSPACE`; không có secret hay network output. |
| Một build đơn | Build kết thúc `SUCCESS`; log có `Đã yêu cầu dọn workspace cô lập của lab.` sau marker. |
| Hai build overlap với hai executor | Mỗi build in path riêng. Một path có thể dùng hậu tố Jenkins như `@2`, nhưng không hard-code hoặc yêu cầu đúng tên suffix đó. |
| File marker | `ownership.txt` chỉ tồn tại trong context `ws` khi build chạy; `deleteDir()` được gọi trước khi block kết thúc. |
| Agent disconnect/abort | Không khẳng định cleanup đã xong chỉ vì build dừng. Đọc Console Output, trạng thái node và để owner agent xử lý path còn lại theo policy. |

Sau lab, xóa job sandbox hoặc giữ history theo policy đội ngũ. Không dọn thủ công một path suy đoán, không xóa workspace của job khác, và không áp dụng custom workspace vào production chỉ vì lab đã thành công.

## Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý an toàn |
| --- | --- | --- |
| `WORKSPACE` rỗng hoặc sai kỳ vọng | Step chạy ngoài agent allocation, ở stage khác agent, hoặc code dựa vào path run trước. | In `NODE_NAME`, `WORKSPACE` và `pwd` trong đúng stage; thêm agent đúng scope, không hard-code path agent khác. |
| File biến mất ở stage sau | Stage sau nhận agent/workspace khác hoặc cleanup đã chạy. | Archive/publish/stash file có chủ đích trước cleanup; không tắt cleanup vô thời hạn để chữa lỗi transport. |
| Hai build ghi đè output | Custom workspace/path cache dùng chung, hoặc external resource không được cô lập. | Dùng `ws`, build-specific directory hoặc serialize resource; kiểm tra toàn bộ writer, không chỉ Jenkins workspace. |
| Disk agent đầy | Workspace/caches cũ, cleanup fail, artifact bị giữ nhầm trong agent. | Đo usage theo node/job, xác minh cleanup log và agent policy; archive/publish đúng dữ liệu rồi đặt quota/retention có owner. |
| `deleteDir()` hoặc `cleanWs` thất bại | Permission/mount lỗi, process giữ file, agent disconnect hoặc path không thuộc build. | Giữ bằng chứng lỗi, kiểm owner/mode/mount với owner agent; không chạy lệnh xóa rộng bằng tài khoản đặc quyền. |
| `cleanWs` không xóa ngay | Deferred wipeout/Async Resource Disposer đang xử lý hoặc filesystem chậm. | Kiểm cấu hình plugin/disposer và disk sau một khoảng phù hợp; chỉ đổi deferred-wipeout policy sau sandbox test. |
| `cleanWs` xóa source trước build | Cleanup đặt trước checkout không có `skipDefaultCheckout(true)`, hoặc pattern sai. | Đặt `skipDefaultCheckout(true)`, cleanup ở bước đầu rồi checkout rõ ràng; thử trên job sandbox. |
| Artifact/report chứa file lạ | Glob archive quá rộng, output/secret file nằm chung workspace. | Thu hẹp allowlist, tách `dist/` hoặc `reports/`, review file trước publish; xử lý exposure đã xảy ra theo incident policy. |
| Credential file còn dấu vết | Binding bị copy, archive/cache quét rộng, hoặc agent crash trước cleanup. | Không copy/browse/archive binding; cô lập agent, dọn theo policy, rotate/revoke nếu có khả năng đọc trái phép. |

## Checklist xác minh

- [ ] Tôi phân biệt workspace tạm trên agent với artifact, `stash`, cache và build retention.
- [ ] Mỗi Pipeline/stage in hoặc kiểm tra `WORKSPACE`/`pwd` ở sandbox thay vì giả định path hoặc node dùng chung.
- [ ] Artifact/report cần giữ được archive hoặc publish bằng allowlist trước cleanup; không có `**/*` quét toàn workspace.
- [ ] `deleteDir()` hoặc `cleanWs` chỉ chạy trong workspace/context do build vừa được cấp và không nhận path từ parameter, branch hay input tự do.
- [ ] Cleanup failure, abort và agent disconnect được coi là trạng thái cần xác minh; có owner/quy trình xử lý orphan disk.
- [ ] Nếu dùng Workspace Cleanup Plugin, version/plugin approval, generated snippet, pattern, deferred wipeout và pre-build cleanup đã được thử trên sandbox.
- [ ] Custom workspace chỉ tồn tại khi có lý do vận hành, owner filesystem, quyền tối thiểu, quota, backup/exclusion và concurrency policy đã review.
- [ ] Concurrent build được tách bằng `ws` hoặc bị serialize có chủ đích; external resource, cache, port và database có isolation/lock riêng.
- [ ] Credential/secret không nằm trong Jenkinsfile, parameter, workspace, cache, log, report, artifact hoặc URL; binding có scope ngắn và source không tin cậy không dùng chung agent với release.
- [ ] Lab sandbox đã cho thấy path được cấp, marker vô hại, cleanup request và hành vi queue/concurrency đúng với số executor thực tế.

## Nguồn Jenkins chính thức

- [Using Jenkins agents](https://www.jenkins.io/doc/book/using/using-agents/) — agent, executor và workspace.
- [Pipeline Syntax — agent](https://www.jenkins.io/doc/book/pipeline/syntax/#agent) — `agent`, `customWorkspace` và cấu trúc Declarative Pipeline.
- [Pipeline: Basic Steps](https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/) — `ws`, `deleteDir`, `stash` và các step cơ bản.
- [Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — `options`, `post`, `disableConcurrentBuilds` và Snippet Generator.
- [Workspace Cleanup Plugin](https://plugins.jenkins.io/ws-cleanup/) — `cleanWs`, cleanup trước/sau build và deferred wipeout.
- [Credentials Binding Plugin](https://plugins.jenkins.io/credentials-binding/) — binding, masking và cảnh báo credential file/workspace.
- [Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — credential store, scope và permission.
- [Controller isolation](https://www.jenkins.io/doc/book/security/controller-isolation/) — tách controller khỏi build workload.

## Đọc tiếp

- [Chọn agent cho Pipeline](/docs/pipelines/agents) — agent, executor, queue và workspace theo stage.
- [Credentials trong Pipeline](/docs/pipelines/credentials) — bind secret theo scope hẹp và tránh leak qua workspace.
- [Build Artifacts](/docs/jobs/artifacts) — phân biệt workspace, stash, archive và artifact repository.
- [Hành động hậu xử lý Pipeline](/docs/pipelines/post-actions) — publish evidence trước cleanup và thiết kế post action theo kết quả build.
- [Chạy Pipeline song song](/docs/pipelines/parallel) — cô lập filesystem, artifact và tài nguyên ngoài khi fan-out.
