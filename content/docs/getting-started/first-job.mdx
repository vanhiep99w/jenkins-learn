---
title: "Job đầu tiên"
description: "Tạo, cấu hình, chạy và đọc kết quả của một Jenkins Freestyle job tối thiểu từ repository Git công khai."
---

<Callout type="info" title="Phạm vi và điều kiện">
  Lab này dành cho Jenkins đã cài xong, bạn có quyền tạo job và có một agent tin cậy đang trực tuyến. Ví dụ checkout một repository Git công khai của Jenkins và chạy lệnh đơn giản trên agent. Không dùng nó để chạy code không tin cậy trên controller; production cần agent tách biệt, toolchain đã kiểm soát và quyền tối thiểu.
</Callout>

Một **Freestyle job** là cách nhanh nhất để làm quen với vòng đời build: Jenkins lấy source code, chạy một hoặc nhiều build step, rồi giữ console log và trạng thái. Trong bài này, kết quả quan sát được là revision đã checkout và file `jenkins-lab-result.txt` được tạo trong workspace.

## Mục lục

- [Bạn sẽ làm gì?](#bạn-sẽ-làm-gì)
- [Trước khi bắt đầu](#trước-khi-bắt-đầu)
  - [Điều kiện của lab](#điều-kiện-của-lab)
  - [Hiểu các mục trên giao diện](#hiểu-các-mục-trên-giao-diện)
- [Lab: chạy Freestyle job đầu tiên](#lab-chạy-freestyle-job-đầu-tiên)
  - [Chuẩn bị source và xác nhận branch](#chuẩn-bị-source-và-xác-nhận-branch)
  - [Tạo job từ New Item](#tạo-job-từ-new-item)
  - [Cấu hình SCM Git và credential](#cấu-hình-scm-git-và-credential)
  - [Thêm build step có kết quả quan sát được](#thêm-build-step-có-kết-quả-quan-sát-được)
  - [Lưu, chạy Build Now và xác nhận kết quả](#lưu-chạy-build-now-và-xác-nhận-kết-quả)
- [Đọc Console Output và trạng thái build](#đọc-console-output-và-trạng-thái-build)
  - [Đọc log theo thứ tự](#đọc-log-theo-thứ-tự)
  - [Ý nghĩa các trạng thái](#ý-nghĩa-các-trạng-thái)
- [Tạo failure có chủ đích và khắc phục](#tạo-failure-có-chủ-đích-và-khắc-phục)
- [Từ lab đến production](#từ-lab-đến-production)
  - [Bảo vệ source, credential và agent](#bảo-vệ-source-credential-và-agent)
  - [Khi nào chuyển sang Pipeline as Code](#khi-nào-chuyển-sang-pipeline-as-code)
- [Checklist hoàn thành](#checklist-hoàn-thành)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Bạn sẽ làm gì?

Sau lab, bạn có thể:

- tạo một job qua **New Item** và nhận ra vì sao chọn **Freestyle project**;
- cấu hình **Source Code Management → Git** để Jenkins checkout một revision;
- chọn đúng agent, shell và tool Git cho build step;
- khởi chạy job bằng **Build Now**, đối chiếu output với lệnh đã cấu hình, rồi phân biệt kết quả `SUCCESS` và `FAILURE`;
- xử lý một lỗi build có chủ đích mà không cần đoán hoặc thay đổi credential bừa bãi.

## Trước khi bắt đầu

### Điều kiện của lab

Bạn cần các điều kiện sau:

- URL Jenkins có thể truy cập và tài khoản có quyền **Create** cùng **Configure** job.
- Một agent tin cậy có ít nhất một executor `Online`. Agent Linux cần `sh` và Git CLI; agent Windows cần `cmd.exe` và Git CLI trong `PATH`.
- Git plugin đã được cài và bật để mục **Git** xuất hiện trong **Source Code Management**. Đây là plugin, không phải điều được suy ra chỉ từ Jenkins core.
- Agent được chọn có thể truy cập HTTPS tới `github.com`. Repository lab là public nên không cần credential.

Nếu bạn đang học local và chưa có controller, hãy bắt đầu bằng [chạy Jenkins bằng Docker](/docs/installation/docker). Xem [Yêu cầu hệ thống](/docs/getting-started/requirements) để kiểm tra Java, network và dung lượng. Khái niệm controller, agent, executor và workspace được giải thích sâu hơn tại [Kiến trúc Jenkins](/docs/getting-started/architecture).

<Callout type="warn" title="Không biến controller thành máy build">
  Với production, đặt built-in node của controller là `0` executors và chỉ chạy build trên agent riêng. Chỉ có thể dùng built-in node cho lab nhỏ khi source hoàn toàn tin cậy và bạn chấp nhận ranh giới bảo mật kém hơn. Không chạy pull request, dependency hoặc script không tin cậy trên controller.
</Callout>

### Hiểu các mục trên giao diện

| Mục | Vai trò trong bài này | Điều cần nhớ |
| --- | --- | --- |
| **New Item** | Tạo đối tượng job mới trong Jenkins. | Tên job cũng là nơi Jenkins lưu cấu hình và lịch sử build. |
| **Freestyle project** | Loại job cấu hình các phần như SCM và build step qua UI. | Phù hợp để học hoặc tác vụ đơn giản; cấu hình chính nằm trên controller. |
| **Source Code Management → Git** | Khai báo repository, branch và credential Jenkins dùng để checkout. | Cần Git plugin và Git CLI trên agent chạy checkout. |
| **Build Steps** | Các lệnh Jenkins thực thi sau checkout. | `Execute shell` cần shell Unix; `Execute Windows batch command` cần agent Windows. |
| **Console Output** | Nhật ký tuần tự của checkout và build step. | Đây là nơi bắt đầu khi build thất bại. |

Freestyle job không đồng nghĩa với Pipeline. Job là đơn vị Jenkins theo dõi; Freestyle là một kiểu job có cấu hình UI. Pipeline thường lưu quy trình trong `Jenkinsfile` cùng repository. Để đặt lab vào bối cảnh CI/CD, xem [Nền tảng CI/CD](/docs/getting-started/ci-cd-fundamentals).

## Lab: chạy Freestyle job đầu tiên

Luồng lab là: Jenkins checkout một repository công khai → agent chạy lệnh → Console Output in revision và file kết quả → build kết thúc `SUCCESS`.

```text
Repository Git công khai ──checkout──► workspace trên agent
                                           │
                                           ▼
                                  Execute shell / batch
                                           │
                                           ▼
                         Console Output + trạng thái build
```

### Chuẩn bị source và xác nhận branch

Dùng repository công khai `https://github.com/jenkins-docs/simple-java-maven-app.git` của tổ chức Jenkins. Lab chỉ xác nhận checkout và tạo output; **không** chạy Maven, nên agent không cần JDK hay Maven riêng cho ví dụ này.

Trước khi điền branch vào Jenkins, chạy lệnh sau trên máy có Git và internet. Nó in branch mặc định của remote; dùng đúng tên branch sau `refs/heads/` cho bước cấu hình tiếp theo.

```bash
git ls-remote --symref https://github.com/jenkins-docs/simple-java-maven-app.git HEAD
```

Ví dụ output có thể chứa `ref: refs/heads/master HEAD`. Khi đó branch specifier là `*/master`. Nếu remote đổi branch mặc định, không đoán `main` hoặc `master`: dùng tên lệnh vừa trả về.

<Callout type="idea" title="Vì sao dùng repository có sẵn?">
  Source công khai giúp lab lặp lại được mà không yêu cầu token, deploy key hoặc quyền ghi. Khi áp dụng cho repository của bạn, thay URL và branch bằng giá trị đã xác minh tương tự; không nhét token vào URL Git.
</Callout>

### Tạo job từ New Item

<Steps>
<Step>

**Mở trang tạo job.** Từ Jenkins dashboard, chọn **New Item**. Nhập tên `freestyle-first-job`. Tên nên không chứa secret, vì nó xuất hiện trong URL, lịch sử build và log.

</Step>
<Step>

**Chọn loại job.** Chọn **Freestyle project**, rồi chọn **OK**. Jenkins mở trang **Configure** của job mới.

Freestyle project gom SCM, trigger, môi trường và build step trong biểu mẫu. Chưa cần bật trigger cho lab: bạn sẽ chủ động chạy bằng **Build Now**.

</Step>
<Step>

**Chọn nơi chạy.** Trong phần **General**, chỉ bật **Restrict where this project can be run** nếu Jenkins của bạn có agent label cụ thể. Nhập label của agent tin cậy, ví dụ `linux` hoặc `windows`.

Nếu không đặt label, Jenkins có thể chọn bất kỳ executor phù hợp nào. Chỉ để lab chạy trên built-in node khi đó là controller học tập và source hoàn toàn tin cậy; không dùng lựa chọn này cho production.

</Step>
</Steps>

### Cấu hình SCM Git và credential

Trong trang **Configure**, tìm **Source Code Management**, chọn **Git**, rồi điền:

- **Repository URL**: `https://github.com/jenkins-docs/simple-java-maven-app.git`
- **Credentials**: để **- none -**, vì đây là repository public
- **Branches to build**: `*/<branch-vừa-xác-minh>`, ví dụ `*/master`

Sau khi nhập URL, Jenkins có thể hiển thị lỗi validation nếu Git plugin chưa có, agent không có Git CLI, URL/branch sai hoặc agent không tới được Git host. Chưa chuyển sang credential chỉ để chữa mọi lỗi checkout: với repo public, credential không phải điều kiện cần.

#### Khi repository là private

Repository private cần một credential **đọc repository** có quyền tối thiểu. Tạo credential tại **Manage Jenkins → Credentials** theo kiểu URL của repository: token đọc-only với **Username with password** cho HTTPS, hoặc **SSH Username with private key** cho SSH. Lưu private key hoặc token trong Jenkins Credentials, không lưu trong repository, trường URL, shell command hay console log.

Chọn scope hẹp nhất mà job thực sự nhìn thấy:

- Nếu Jenkins có credential provider theo folder, đặt job trong folder và dùng credential scope của folder để không cấp cho job ngoài folder.
- Nếu chỉ có scope mặc định, credential chọn cho SCM checkout phải ở scope job có thể dùng; **System** scope chỉ dành cho Jenkins nội bộ, không dùng cho checkout của build job. **Global** scope cho nhiều job nhìn thấy hơn, nên chỉ dùng khi không có scope hẹp hơn và giới hạn quyền cấu hình job.
- Credential chỉ cần quyền đọc đúng repository/branch. Dùng deploy key hoặc token riêng cho CI, giới hạn read-only, đặt expiry/rotation theo chính sách và thu hồi khi job không còn dùng.

Sau đó chọn credential từ danh sách **Credentials** của chính job. Không gõ token vào `Repository URL` như `https://token@host/org/repo.git`; URL đó có thể lộ trong cấu hình, lịch sử hoặc log.

<Callout type="warn" title="Credential không làm source trở nên đáng tin">
  Credential chỉ cấp quyền truy cập. Code, dependency và build script checkout từ repository vẫn sẽ được thực thi trên agent. Tách agent theo ranh giới tin cậy và không cấp credential phát hành/production cho một job chỉ cần clone source.
</Callout>

### Thêm build step có kết quả quan sát được

Trong **Build Steps**, chọn loại lệnh khớp hệ điều hành của agent. Đây là build step tiêu chuẩn của Freestyle job, nhưng sự có mặt của shell, `cmd.exe` và Git CLI là phụ thuộc của agent. Không chọn một build step/plugin khác nếu bạn chưa cài và hiểu nó.

<Tabs items={['Agent Linux hoặc macOS', 'Agent Windows']}>
<Tab value="Agent Linux hoặc macOS">

Chọn **Add build step → Execute shell**, rồi dán:

```bash
set -eu
printf 'Freestyle build #%s\n' "$BUILD_NUMBER"
printf 'workspace=%s\n' "$WORKSPACE"
printf 'revision='
git rev-parse --short HEAD
printf 'build=%s\n' "$BUILD_NUMBER" > jenkins-lab-result.txt
test -s jenkins-lab-result.txt
cat jenkins-lab-result.txt
```

`set -eu` yêu cầu shell dừng khi một lệnh lỗi hoặc biến bắt buộc không có. `git rev-parse` xác nhận checkout đã tạo một Git work tree. `test -s` biến file rỗng hoặc thiếu thành lỗi rõ ràng.

</Tab>
<Tab value="Agent Windows">

Chọn **Add build step → Execute Windows batch command**, rồi dán:

```bat
@echo off
setlocal EnableExtensions
echo Freestyle build #%BUILD_NUMBER%
echo workspace=%WORKSPACE%
git rev-parse --short HEAD
if errorlevel 1 exit /b 1
>jenkins-lab-result.txt echo build=%BUILD_NUMBER%
for %%I in (jenkins-lab-result.txt) do if %%~zI EQU 0 exit /b 1
type jenkins-lab-result.txt
```

Lệnh kiểm tra `errorlevel` dừng build nếu Git không trả về revision. Vòng `for` kiểm tra file vừa tạo có kích thước khác `0` trước khi in nội dung.

</Tab>
</Tabs>

Bạn có thể tùy chọn thêm **Post-build Actions → Archive the artifacts** với pattern `jenkins-lab-result.txt` để tải file từ trang build. Tính khả dụng, giao diện và report bổ sung tùy phiên bản Jenkins hoặc plugin; lab không phụ thuộc vào artifact/report vì Console Output đã đủ để xác minh lệnh chạy.

### Lưu, chạy Build Now và xác nhận kết quả

<Steps>
<Step>

**Lưu cấu hình.** Chọn **Save**. Trang job hiển thị tên `freestyle-first-job`, build history rỗng và các hành động của job.

</Step>
<Step>

**Khởi chạy thủ công.** Chọn **Build Now**. Jenkins tạo số build mới, chẳng hạn `#1`. Nếu build chưa bắt đầu, mở **Build Queue** để đọc lý do về executor hoặc label thay vì chờ mù quáng.

</Step>
<Step>

**Mở build vừa tạo.** Chọn số build trong **Build History**, rồi chọn **Console Output**. Với build thành công, log cần có các dấu vết sau, dù đường dẫn workspace và revision sẽ khác:

```text
Freestyle build #1
workspace=/.../workspace/freestyle-first-job
revision=abc1234
build=1
Finished: SUCCESS
```

Dòng `revision=` chứng minh Git checkout có revision. Dòng `build=1` chứng minh build step đã tạo và đọc lại file trong workspace. Số build không nhất thiết là `1` nếu job đã chạy trước đó.

</Step>
</Steps>

## Đọc Console Output và trạng thái build

### Đọc log theo thứ tự

Console Output là bản ghi theo thời gian. Đọc từ trên xuống và dừng ở **lỗi có nguyên nhân đầu tiên**, không chỉ ở dòng cuối `Finished: FAILURE`:

1. Tìm phần Jenkins gán executor và workspace. Nếu không có phần này, build có thể vẫn đang chờ trong queue.
2. Tìm checkout Git. Xác nhận URL remote, branch/revision và thông báo lỗi xác thực hoặc `git` không tìm thấy.
3. Tìm dòng `+` trên shell Unix, hoặc lệnh được echo trên Windows. Nó cho biết lệnh nào Jenkins thực sự chạy.
4. Đọc exit code, thông báo ngay trước nó và trạng thái cuối. Sửa nguyên nhân nhỏ nhất, lưu lại rồi chạy build mới để xác minh.

Không in token để “debug”. Nếu cần xác minh credential private repository, kiểm tra ID/tên credential được chọn, quyền đọc repository, host key/TLS và log đã được Jenkins che bớt; không sao chép secret từ Jenkins sang terminal.

### Ý nghĩa các trạng thái

| Trạng thái | Ý nghĩa thực tế | Hành động đầu tiên |
| --- | --- | --- |
| `SUCCESS` | Tất cả bước bắt buộc của job hoàn thành không lỗi. | Kiểm tra output mong đợi, không chỉ màu trạng thái. |
| `FAILURE` | Checkout, build step hoặc điều kiện bắt buộc kết thúc lỗi. | Đọc lỗi đầu tiên trong Console Output và exit code. |
| `UNSTABLE` | Job hoàn tất nhưng có tín hiệu chất lượng không đạt, thường từ test/report hoặc plugin cấu hình riêng. | Mở report liên quan; lab này không tự tạo `UNSTABLE`. |
| `ABORTED` | Build bị người dùng, timeout hoặc hệ thống dừng trước khi hoàn thành. | Kiểm tra ai/cơ chế đã hủy và tình trạng agent. |

Màu và biểu tượng có thể thay đổi theo giao diện hoặc theme; ưu tiên chữ trạng thái, Console Output, thời lượng và revision thay vì chỉ nhìn màu.

## Tạo failure có chủ đích và khắc phục

Một lab tốt phải cho bạn thấy tín hiệu đỏ có nghĩa gì. Trong build step đang dùng, thay dòng tạo file bằng một lệnh chủ động thất bại, sau đó chọn **Save** và **Build Now**.

<Tabs items={['Agent Linux hoặc macOS', 'Agent Windows']}>
<Tab value="Agent Linux hoặc macOS">

Thay:

```bash
printf 'build=%s\n' "$BUILD_NUMBER" > jenkins-lab-result.txt
```

bằng:

```bash
false
```

</Tab>
<Tab value="Agent Windows">

Thay:

```bat
>jenkins-lab-result.txt echo build=%BUILD_NUMBER%
```

bằng:

```bat
exit /b 1
```

</Tab>
</Tabs>

Build mới phải kết thúc `FAILURE`. Trong Console Output, tìm `false` hoặc `exit /b 1`, rồi dòng exit code. Sau khi quan sát, khôi phục đúng lệnh tạo `jenkins-lab-result.txt`, **Save** và chạy lại. Build kế tiếp phải trở về `SUCCESS`.

Các lỗi thường gặp khác và cách khoanh vùng:

| Triệu chứng | Nguyên nhân thường gặp | Kiểm tra trước khi sửa |
| --- | --- | --- |
| `git: not found` hoặc không có Git executable | Git CLI chưa có trên agent được chọn. | Cài/cấu hình Git trên đúng agent, rồi kiểm tra `git --version` với tài khoản agent. |
| `Permission denied (publickey)` hoặc `Authentication failed` | URL và kiểu credential không khớp, token/SSH key thiếu quyền đọc hoặc đã hết hạn. | Kiểm tra URL, credential đã chọn, quyền read-only và host key/TLS; không in secret. |
| `Couldn't find any revision to build` | Branch specifier không khớp remote hoặc repository/credential không truy cập được branch. | Chạy lại `git ls-remote --symref <repository-url> HEAD`, rồi dùng branch thật. |
| Build chờ mãi | Label không có agent online hoặc hết executor. | Mở **Build Queue** và **Manage Jenkins → Nodes**; không tăng executor trên controller để bỏ qua. |
| Lệnh shell lỗi ngay | Agent không phải Unix, thiếu tool hoặc workspace có trạng thái không như mong đợi. | Kiểm tra node đã chạy, loại build step và dòng lỗi đầu tiên. |

## Từ lab đến production

### Bảo vệ source, credential và agent

Lab dùng source công khai và lệnh vô hại; production có ranh giới khác. Áp dụng các nguyên tắc sau trước khi cho job truy cập repository riêng, registry hoặc hạ tầng phát hành:

- Không hard-code password, token, deploy key hay URL chứa token trong job config, repository, command line hoặc log. Dùng Jenkins Credentials với quyền tối thiểu, đúng scope và rotation.
- Để credential đọc repository riêng tách biệt với credential deploy. Job chỉ checkout code không cần token ghi repository, cloud admin hay production.
- Chạy source không tin cậy trên agent cô lập, ngắn hạn khi có thể. Không chạy source từ pull request/fork không tin cậy trên controller hoặc agent có secret giá trị cao.
- Khai báo toolchain của agent rõ ràng: version Git, JDK, Node.js, Maven hoặc tool dự án. `Execute shell` chỉ chạy command; nó không cài tool cho bạn.
- Giữ branch/revision, Console Output, artifact và retention đủ để truy vết. Nếu publish test report hoặc dùng build step đặc biệt, đọc yêu cầu của plugin, khả năng agent và quyền truy cập trước khi thêm.

<Callout type="warn" title="Một job có thể là đường thực thi đặc quyền">
  Người có quyền sửa job có thể đổi URL SCM hoặc lệnh build. Hãy hạn chế quyền Configure/Build, review thay đổi job và tách agent theo mức tin cậy. Đừng cấp credential mạnh chỉ để checkout nhanh hơn.
</Callout>

### Khi nào chuyển sang Pipeline as Code

Freestyle phù hợp để học luồng cơ bản hoặc duy trì một tác vụ nhỏ, ổn định. Hãy chuyển sang **Pipeline as Code** khi quy trình có nhiều stage như test, package và deploy; cần review thay đổi CI cùng pull request; cần điều kiện, retry, input/approval, agent theo stage hoặc tái sử dụng giữa repository.

Pipeline lưu mô tả trong `Jenkinsfile`, nên thay đổi có lịch sử Git và được review cùng source. Việc chuyển không tự giải quyết vấn đề bảo mật: Pipeline vẫn phải dùng credential đúng scope và chạy trên agent phù hợp. Học tiếp mô hình CI/CD tại [Nền tảng CI/CD](/docs/getting-started/ci-cd-fundamentals) và cơ chế controller–agent tại [Kiến trúc Jenkins](/docs/getting-started/architecture).

## Checklist hoàn thành

- [ ] Tôi có agent tin cậy online, có executor, Git CLI và shell/`cmd.exe` phù hợp.
- [ ] Tôi đã tạo `freestyle-first-job` bằng **New Item → Freestyle project**.
- [ ] Job checkout được repository, branch và revision đã xác minh.
- [ ] Tôi để **Credentials** là `- none -` cho repository public và biết không dùng token trong URL.
- [ ] Tôi đã chạy build step, thấy `revision=...`, `build=...` và `Finished: SUCCESS` trong Console Output.
- [ ] Tôi đã tạo một `FAILURE` có chủ đích, đọc lỗi đầu tiên, khôi phục lệnh và chạy xanh lại.
- [ ] Tôi biết build/report bổ sung có thể phụ thuộc plugin, toolchain và khả năng của agent.
- [ ] Tôi không chạy source không tin cậy trên controller và biết lúc nào nên chuyển quy trình sang `Jenkinsfile`.

## Nguồn Jenkins chính thức

- [Using Jenkins](https://www.jenkins.io/doc/book/using/) — tạo và cấu hình các loại project/job.
- [Using Git with Jenkins](https://www.jenkins.io/doc/book/using/using-git/) — checkout Git, Git plugin và Git tool trên agent.
- [Managing Credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — tạo, giới hạn và dùng credential an toàn.
- [Using Jenkins Agents](https://www.jenkins.io/doc/book/using/using-agents/) — chọn nơi thực thi build.
- [Controller Isolation](https://www.jenkins.io/doc/book/security/controller-isolation/) — cô lập controller khỏi workload build.
- [Pipeline](https://www.jenkins.io/doc/book/pipeline/) — khi cần mô tả quy trình bằng `Jenkinsfile`.
- [Repository `jenkins-docs/simple-java-maven-app`](https://github.com/jenkins-docs/simple-java-maven-app) — source công khai dùng trong lab.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan về Jenkins" href="/docs/getting-started/overview" description="Ôn lại vai trò của Jenkins trong vòng lặp CI/CD." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu controller, agent, executor, queue và workspace." />
  <Card title="Nền tảng CI/CD" href="/docs/getting-started/ci-cd-fundamentals" description="Chuyển từ build đơn lẻ sang phản hồi CI có cấu trúc." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Tạo môi trường Jenkins local để thực hành." />
</Cards>
