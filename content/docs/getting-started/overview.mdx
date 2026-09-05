---
title: "Tổng quan về Jenkins"
description: "Jenkins giải quyết bài toán CI/CD nào, cách các thành phần phối hợp và khi nào nên chọn nó."
---

<Callout type="info" title="Phạm vi bài học">
  Trang này xây dựng mô hình nhập môn về Jenkins, phù hợp trước khi cài đặt hoặc tạo job đầu tiên. Giao diện, plugin và cách cấu hình có thể khác giữa các bản Jenkins và môi trường; hãy đối chiếu tài liệu Jenkins chính thức khi vận hành hệ thống thật.
</Callout>

## Mục lục

- [Jenkins giải quyết bài toán gì?](#jenkins-giải-quyết-bài-toán-gì)
  - [Ví dụ: một thay đổi nhỏ vẫn cần được kiểm tra](#ví-dụ-một-thay-đổi-nhỏ-vẫn-cần-được-kiểm-tra)
- [Mô hình hoạt động nhập môn](#mô-hình-hoạt-động-nhập-môn)
  - [Sáu khái niệm cần phân biệt](#sáu-khái-niệm-cần-phân-biệt)
- [Khả năng chính](#khả-năng-chính)
  - [Từ commit đến phản hồi](#từ-commit-đến-phản-hồi)
  - [Ví dụ Jenkinsfile tối thiểu](#ví-dụ-jenkinsfile-tối-thiểu)
- [Hệ sinh thái Jenkins](#hệ-sinh-thái-jenkins)
  - [Thành phần và trách nhiệm](#thành-phần-và-trách-nhiệm)
  - [Plugin cần được quản trị](#plugin-cần-được-quản-trị)
- [Khi nào nên và không nên dùng Jenkins](#khi-nào-nên-và-không-nên-dùng-jenkins)
  - [Dấu hiệu nên dùng](#dấu-hiệu-nên-dùng)
  - [Dấu hiệu nên cân nhắc lựa chọn khác](#dấu-hiệu-nên-cân-nhắc-lựa-chọn-khác)
- [Thực hành: chạy Pipeline đầu tiên](#thực-hành-chạy-pipeline-đầu-tiên)
  - [Kết quả mong đợi và cách đọc](#kết-quả-mong-đợi-và-cách-đọc)
- [Checklist trước khi đi tiếp](#checklist-trước-khi-đi-tiếp)
- [Tài liệu Jenkins chính thức](#tài-liệu-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Jenkins giải quyết bài toán gì?

Khi một nhóm phát triển phần mềm, việc chạy kiểm thử, đóng gói và triển khai bằng tay thường chậm, khó lặp lại và khó biết thay đổi nào làm hỏng sản phẩm. Jenkins là một máy chủ tự động hóa mã nguồn mở. Nó nhận một sự kiện — chẳng hạn commit mới, pull request hoặc lịch chạy — rồi điều phối các bước mà nhóm đã mô tả để tạo phản hồi có thể kiểm tra.

Mục tiêu phổ biến nhất là **Continuous Integration (CI)**: tích hợp thay đổi thường xuyên và kiểm tra chúng sớm. Jenkins cũng có thể hỗ trợ **Continuous Delivery/Deployment (CD)** khi Pipeline tiếp tục phát hành artifact hoặc triển khai sau các kiểm soát cần thiết. Jenkins không tự làm cho phần mềm “an toàn để phát hành”; chất lượng của kết quả vẫn phụ thuộc vào test, review, chính sách và hạ tầng mà Pipeline gọi tới.

### Ví dụ: một thay đổi nhỏ vẫn cần được kiểm tra

Một lập trình viên sửa hàm tính phí vận chuyển trong ứng dụng Node.js. Thay vì nhớ chạy từng lệnh rồi báo kết quả trong chat, Pipeline có thể chạy cùng một chuỗi lệnh cho mỗi thay đổi:

```text
npm ci  →  npm test  →  npm run build  →  lưu log/kết quả
```

Nếu `npm test` thất bại, build được đánh dấu thất bại và người tạo thay đổi nhận phản hồi sớm. Nếu thành công, Jenkins có thể lưu artifact hoặc gửi tín hiệu cho bước phát hành tiếp theo. Nhờ đó, cách kiểm tra trở thành một phần được phiên bản hóa của quy trình thay vì kiến thức nằm trong máy cá nhân.

## Mô hình hoạt động nhập môn

Jenkins tách việc **điều phối** khỏi việc **thực thi**. Một controller nhận yêu cầu, xếp hàng công việc và lưu trạng thái. Agent cung cấp môi trường chạy lệnh, ví dụ máy Linux có JDK hoặc container có Node.js. Với hệ thống nhỏ, controller có thể chạy tác vụ lab; với production, nên ưu tiên đưa build nặng hoặc không tin cậy sang agent được kiểm soát.

```text
Developer / SCM                 Jenkins
commit hoặc webhook             controller                 Agent
       │                            │                         │
       └───────────────────────────►│ nhận job/Pipeline       │
                                    │ xếp vào queue           │
                                    └──────── gửi tác vụ ────►│ checkout, test,
                                                              │ build
                                    ◄──── log, trạng thái ────┘
                                    │
                                    └──── artifact / thông báo ───► nơi lưu trữ / nhóm
```

Sơ đồ là mô hình tinh gọn: cách agent kết nối, nơi lưu artifact và trigger thực tế tùy thuộc cấu hình và plugin. Xem chi tiết về queue, executor và luồng build tại [Kiến trúc Jenkins](/docs/getting-started/architecture).

### Sáu khái niệm cần phân biệt

| Khái niệm | Ý nghĩa nhập môn | Ví dụ |
|---|---|---|
| **Controller** | Dịch vụ Jenkins trung tâm quản lý cấu hình, job, hàng đợi, lịch sử build và điều phối thực thi. | Nhận webhook từ Git và quyết định build nào được chạy. |
| **Agent** | Máy hoặc môi trường thực thi được controller giao việc. Agent có thể là máy cố định, container hoặc pod tùy cách cấu hình. | Agent Linux có JDK chạy `mvn test`. |
| **Job** | Đơn vị công việc mà Jenkins hiển thị, cấu hình trigger và chạy. Một job có thể là Freestyle, Pipeline hoặc Multibranch Pipeline. | Job `shop-api-main` chạy khi nhánh `main` thay đổi. |
| **Pipeline** | Quy trình tự động hóa gồm các stage và step, thường được mô tả trong `Jenkinsfile` đặt cùng mã nguồn. Pipeline là nội dung công việc; job là đối tượng Jenkins khởi tạo và theo dõi lần chạy. | Stage `Test` chạy `npm test`, rồi stage `Build` chạy `npm run build`. |
| **Plugin** | Phần mở rộng bổ sung khả năng tích hợp hoặc loại job/step mới cho Jenkins. | Git plugin cho checkout từ Git; plugin khác có thể tích hợp SCM hoặc thông báo. |
| **Credential** | Bí mật hoặc thông tin xác thực do Jenkins quản lý để Pipeline dùng khi cần. | Token đọc repository riêng hoặc khóa SSH để kết nối máy đích. |

Credential không nên được ghi trực tiếp vào `Jenkinsfile`, log build hay biến môi trường dùng chung. Jenkins có thể che một số giá trị trong log, nhưng đó không thay thế việc giới hạn quyền, không in bí mật và chỉ cấp credential cho job/agent cần thiết.

## Khả năng chính

Jenkins cung cấp một “bộ điều phối” có thể ghép với công cụ hiện có của nhóm. Các khả năng thường được dùng gồm:

- nhận trigger từ webhook, polling hoặc lịch chạy;
- checkout mã nguồn, chạy shell, test, kiểm tra chất lượng và đóng gói artifact;
- mô tả quy trình bằng Pipeline-as-code trong `Jenkinsfile` để review cùng mã nguồn;
- chạy song song, chọn agent theo nhãn và sử dụng môi trường/container phù hợp;
- lưu log, trạng thái build, test report và artifact để truy vết;
- chờ phê duyệt hoặc truyền tham số trước một bước phát hành;
- tích hợp SCM, registry, hệ thống thông báo, công cụ kiểm thử và nền tảng triển khai qua plugin hoặc API.

### Từ commit đến phản hồi

Một Pipeline CI có thể được tổ chức theo stage để người đọc biết bước nào thất bại. Ví dụ: `Checkout` lấy mã nguồn, `Test` xác nhận hành vi, còn `Package` tạo đầu ra để bước sau sử dụng. Không phải mọi dự án đều cần đủ các stage này; hãy bắt đầu bằng lệnh kiểm tra vốn chạy được trên máy phát triển.

Kết quả có ích nhất là phản hồi gần với nguyên nhân: log của lệnh thất bại, test report và liên kết tới commit/build. Một Pipeline dài nhưng không có test đáng tin cậy chỉ tự động hóa thao tác, chưa tạo được vòng phản hồi CI tốt.

### Ví dụ Jenkinsfile tối thiểu

Đây là Declarative Pipeline tối thiểu để minh họa cấu trúc. `agent any` cho phép Jenkins chọn một executor đang rảnh; nó phù hợp cho lab khi đã có executor, không phải cam kết rằng mọi agent đều có công cụ dự án cần dùng.

```groovy
pipeline {
  agent any

  stages {
    stage('Kiểm tra') {
      steps {
        sh 'echo "Xin chào từ Jenkins"'
      }
    }
  }
}
```

Khi chuyển ví dụ này sang dự án thật, thay `echo` bằng các lệnh dự án, khai báo agent có đúng toolchain và lưu `Jenkinsfile` trong repository. Xem cú pháp và các kiểu Pipeline tại [tài liệu Pipeline chính thức](https://www.jenkins.io/doc/book/pipeline/).

## Hệ sinh thái Jenkins

Jenkins Core cung cấp nền tảng để cấu hình và điều phối, nhưng giá trị thực tế thường đến từ hệ sinh thái. Các tích hợp với GitHub, GitLab, Bitbucket, Docker, Kubernetes, Maven, Slack hoặc kho artifact thường dựa vào plugin, webhook, API và credential của từng hệ thống.

Điều này giúp Jenkins thích nghi với hạ tầng cũ lẫn mới. Đổi lại, đội vận hành phải hiểu phụ thuộc giữa Jenkins core, plugin, Java, agent image và dịch vụ tích hợp. Không nên xem plugin như một đoạn mã cài xong là không cần bảo trì.

### Thành phần và trách nhiệm

- **SCM** như Git lưu mã nguồn và thường phát webhook khi có thay đổi.
- **Jenkins controller** điều phối job/Pipeline, áp dụng quyền truy cập và quản lý cấu hình Jenkins.
- **Agent runtime** cung cấp CPU, bộ nhớ, toolchain và workspace cho build. Agent nên được tạo lại hoặc cập nhật theo quy trình rõ ràng để tránh “máy build đặc biệt” không tái lập được.
- **Artifact repository/registry** lưu đầu ra có thể phát hành, chẳng hạn package, image hoặc file build. Jenkins có thể chuyển artifact tới đó, nhưng repository là nơi phù hợp hơn để lưu dài hạn và phân phối.
- **Plugin** kết nối các thành phần trên với Jenkins. Hãy đọc trang plugin để biết yêu cầu, maintainer, phiên bản và cảnh báo bảo mật trước khi cài.
- **Credential store** giữ thông tin xác thực để controller cấp cho đúng tác vụ. Credential nên có quyền tối thiểu và được luân chuyển theo chính sách của tổ chức.

### Plugin cần được quản trị

Trước khi thêm plugin, hãy xác định khả năng nào còn thiếu và liệu Jenkins core hoặc plugin đã cài có đáp ứng được không. Sau đó kiểm tra tính tương thích với Jenkins/Java, quyền mà plugin cần và lịch sử bảo mật. Chỉ cập nhật sau khi thử nghiệm trên môi trường phù hợp, vì một thay đổi plugin có thể ảnh hưởng Pipeline đang chạy.

<Callout type="warn" title="Ít plugin hơn, bề mặt rủi ro nhỏ hơn">
  Plugin chạy trong Jenkins controller nên có ảnh hưởng vận hành và bảo mật. Bỏ plugin không dùng, cập nhật theo advisory và không cấp credential có quyền rộng chỉ để một integration hoạt động nhanh hơn.
</Callout>

## Khi nào nên và không nên dùng Jenkins

Quyết định không chỉ dựa vào Jenkins có “làm được” hay không. Hãy so sánh chi phí vận hành controller, agent, backup, cập nhật và quản trị plugin với mức độ linh hoạt mà quy trình của bạn thật sự cần.

### Dấu hiệu nên dùng

Jenkins thường phù hợp khi một hoặc nhiều điều sau đúng:

- nhóm cần ghép nhiều công cụ, môi trường build hoặc hệ thống nội bộ không có tích hợp sẵn;
- quy trình cần tùy biến cao bằng Pipeline-as-code, Shared Library hoặc Groovy có kiểm soát;
- build phải chạy trong mạng riêng, trên phần cứng chuyên dụng hoặc toolchain đặc thù;
- tổ chức muốn tự chủ cách bố trí controller/agent và có năng lực vận hành, vá lỗi, backup và giám sát;
- cần một lớp điều phối chung cho nhiều repository hay đội ngũ với yêu cầu quyền truy cập riêng.

Ví dụ, một công ty có ứng dụng Java cũ cần license tool trên mạng nội bộ và đồng thời build image cho dịch vụ mới có thể dùng các agent khác nhau dưới cùng một Jenkins controller.

### Dấu hiệu nên cân nhắc lựa chọn khác

Không phải dự án nào cũng cần Jenkins. Hãy cân nhắc CI/CD tích hợp sẵn với nền tảng SCM hoặc dịch vụ managed nếu:

- quy trình chỉ gồm các workflow chuẩn và nền tảng SCM đã đáp ứng trigger, runner, secret, log và quyền truy cập;
- đội ngũ không có người chịu trách nhiệm cập nhật Jenkins core, plugin, Java, backup/restore và xử lý sự cố;
- yêu cầu chính là giảm vận hành máy chủ hơn là tùy biến điều phối;
- chính sách tổ chức không cho phép hoặc không thể bảo vệ một controller tự quản lý và plugin của nó.

Lựa chọn khác không có nghĩa Jenkins kém hơn. Điểm cần chốt là: chọn công cụ có thể vận hành an toàn và ổn định với quy trình thực tế của đội, thay vì chọn công cụ có nhiều tính năng nhất.

## Thực hành: chạy Pipeline đầu tiên

Bài thực hành này dùng Pipeline nội tuyến để bạn quan sát vòng đời một build mà chưa cần repository. Bạn cần một Jenkins đã truy cập được và một executor sẵn sàng. Nếu chưa có môi trường local, hãy bắt đầu với [chạy Jenkins bằng Docker](/docs/installation/docker).

<Steps>
  <Step>

**Tạo job Pipeline.** Tại Jenkins dashboard, chọn **New Item**, đặt tên `hello-jenkins`, chọn **Pipeline**, rồi tạo job. Đây là job chứa cấu hình và lịch sử các lần chạy.

  </Step>
  <Step>

**Thêm Pipeline.** Trong phần cấu hình Pipeline, chọn định nghĩa bằng script, dán đoạn sau rồi lưu:

```groovy
pipeline {
  agent any

  stages {
    stage('Xin chào') {
      steps {
        sh 'echo "Build #${BUILD_NUMBER}: Jenkins đang chạy"'
      }
    }
  }
}
```

Trên agent Windows không có shell Unix, thay bước `sh` bằng `bat 'echo Build #%BUILD_NUMBER%: Jenkins dang chay'`, hoặc dùng agent Linux cho lab này.

  </Step>
  <Step>

**Chạy và quan sát.** Mở job, chọn **Build Now**, rồi mở build vừa tạo. Xem **Console Output** để đối chiếu lệnh và biến `BUILD_NUMBER`; xem giao diện Pipeline/Stage nếu plugin và UI tương ứng có mặt.

  </Step>
</Steps>

<Callout type="idea" title="Nếu build nằm mãi trong queue">
  Jenkins chưa tìm được executor phù hợp. Với lab, xác nhận controller hoặc agent có executor online. Với production, không nên giải quyết bằng cách tùy tiện chạy mọi build trên controller; hãy cấu hình agent và nhãn phù hợp.
</Callout>

### Kết quả mong đợi và cách đọc

Build thành công sẽ có trạng thái `SUCCESS` và console output chứa dòng tương tự `Build #1: Jenkins đang chạy`. Số build có thể khác `1` nếu job đã chạy trước đó. Nếu trạng thái là `FAILURE`, đọc từ dòng lỗi đầu tiên do command hoặc agent báo ra, rồi kiểm tra toolchain và shell của agent trước khi sửa Pipeline.

Sau khi hiểu ví dụ, hãy thử tạo một job từ repository và chuyển script nội tuyến thành `Jenkinsfile` được review cùng mã nguồn.

## Checklist trước khi đi tiếp

- [ ] Tôi có thể giải thích khác nhau giữa controller (điều phối) và agent (thực thi).
- [ ] Tôi hiểu job là đơn vị Jenkins theo dõi, còn Pipeline mô tả các bước công việc.
- [ ] Tôi biết plugin mở rộng Jenkins nhưng cũng tạo phụ thuộc cần cập nhật và đánh giá bảo mật.
- [ ] Tôi không ghi token, mật khẩu hoặc khóa riêng vào `Jenkinsfile` hay log build.
- [ ] Tôi đã chạy được Pipeline mẫu hoặc biết executor nào sẽ chạy nó.
- [ ] Tôi có thể nêu một lý do chọn Jenkins hoặc một lý do chọn giải pháp CI/CD khác cho đội của mình.

## Tài liệu Jenkins chính thức

- [Jenkins User Documentation](https://www.jenkins.io/doc/)
- [Getting started with Pipeline](https://www.jenkins.io/doc/book/pipeline/getting-started/)
- [Pipeline syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Using Jenkins agents](https://www.jenkins.io/doc/book/using/using-agents/)
- [Managing plugins](https://www.jenkins.io/doc/book/managing/plugins/)
- [Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/)
- [Jenkins security advisories](https://www.jenkins.io/security/advisory/)

## Đọc tiếp

<Cards>
  <Card title="Nền tảng CI/CD" href="/docs/getting-started/ci-cd-fundamentals" description="Phân biệt Continuous Integration, Delivery và Deployment." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Tìm hiểu controller, agent, executor và queue sâu hơn." />
  <Card title="Thuật ngữ Jenkins" href="/docs/getting-started/terminology" description="Tra cứu các khái niệm sẽ gặp trong những bài tiếp theo." />
</Cards>
