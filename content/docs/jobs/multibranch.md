---
title: "Multibranch Pipeline"
description: "Tự động phát hiện branch, tag và Pull Request chứa Jenkinsfile."
---

<Callout type="info" title="Phạm vi và điều kiện">
  Bài này giả định Jenkins LTS có Pipeline plugin và plugin Branch Source tương ứng với Git provider đang dùng, chẳng hạn GitHub, GitLab, Bitbucket hoặc Git. Tên chiến lược, nhãn UI và khả năng webhook có thể khác theo plugin/version; xác nhận trên controller sandbox trước khi áp dụng thành chuẩn.
</Callout>

## Mục lục

- [Mục tiêu](#mục-tiêu)
- [Multibranch Pipeline hoạt động thế nào?](#multibranch-pipeline-hoạt-động-thế-nào)
  - [Job cha, job con và Jenkinsfile](#job-cha-job-con-và-jenkinsfile)
  - [Vòng đời từ sự kiện SCM đến build](#vòng-đời-từ-sự-kiện-scm-đến-build)
- [Branch source](#branch-source)
  - [Chọn nguồn và quyền truy cập](#chọn-nguồn-và-quyền-truy-cập)
  - [Phạm vi repository và Jenkinsfile](#phạm-vi-repository-và-jenkinsfile)
- [Chiến lược discovery](#chiến-lược-discovery)
  - [Branch và tag](#branch-và-tag)
  - [Pull Request từ repository gốc và fork](#pull-request-từ-repository-gốc-và-fork)
- [Ranh giới tin cậy cho Jenkinsfile](#ranh-giới-tin-cậy-cho-jenkinsfile)
  - [Head, merge revision và Jenkinsfile được dùng](#head-merge-revision-và-jenkinsfile-được-dùng)
  - [Credential, agent và dữ liệu dùng chung](#credential-agent-và-dữ-liệu-dùng-chung)
- [Orphaned item strategy](#orphaned-item-strategy)
- [Scan và indexing](#scan-và-indexing)
  - [Khi nào Jenkins quét?](#khi-nào-jenkins-quét)
  - [Kiểm soát tải và nhiễu](#kiểm-soát-tải-và-nhiễu)
- [Lab sandbox an toàn](#lab-sandbox-an-toàn)
  - [Chuẩn bị repository](#chuẩn-bị-repository)
  - [Tạo Multibranch Pipeline](#tạo-multibranch-pipeline)
  - [Quan sát kết quả mong đợi](#quan-sát-kết-quả-mong-đợi)
- [Troubleshooting](#troubleshooting)
- [Checklist xác minh](#checklist-xác-minh)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mục tiêu

Sau bài này, bạn có thể tạo một **Multibranch Pipeline** (job cha) để Jenkins khám phá các branch, tag và Pull Request (PR) của một repository. Bạn sẽ biết mỗi mục được khám phá tạo ra job con riêng, chọn discovery strategy theo mục tiêu CI, và đọc kết quả indexing thay vì đoán vì sao một branch chưa xuất hiện.

Quan trọng hơn, bạn có thể tách source đáng tin cậy khỏi source không tin cậy. Một `Jenkinsfile` là mã có thể yêu cầu Jenkins chạy lệnh, nên PR từ fork không được nhận credential đặc quyền, agent phát hành hoặc quyền ghi chỉ vì pipeline của nó cần kiểm thử.

## Multibranch Pipeline hoạt động thế nào?

### Job cha, job con và Jenkinsfile

Multibranch Pipeline là một job cấp cha gắn với một **Branch Source** — cấu hình kết nối một repository trên SCM. Khi indexing, Jenkins hỏi source đó có những branch, tag hoặc change request nào phù hợp với discovery strategy. Với mỗi mục phù hợp có `Jenkinsfile`, Jenkins tạo hoặc cập nhật một job con.

Ví dụ, job cha `store-ci` có thể tạo các job con `main`, `feature/payment`, `PR-42` và `v1.4.0`. Tên hiển thị chính xác phụ thuộc plugin SCM. Mỗi job con có lịch sử build, trạng thái và revision riêng; chúng không phải bốn cấu hình Pipeline được tạo thủ công giống nhau.

| Thành phần | Trách nhiệm | Không phải là |
| --- | --- | --- |
| Job cha Multibranch | Giữ Branch Source, discovery, trigger scan và orphan strategy. | Một build cho một commit cụ thể. |
| Job con | Đại diện cho một branch, tag hoặc PR đã được khám phá. | Bản sao vĩnh viễn của mọi ref từng tồn tại. |
| `Jenkinsfile` | Định nghĩa stage/step của revision Jenkins được phép dùng. | Cơ chế cấp quyền hoặc nơi chứa secret. |
| Indexing | Đồng bộ inventory SCM với các job con. | Bảo đảm mọi job con sẽ build ngay lập tức. |

### Vòng đời từ sự kiện SCM đến build

```text
Push, tag hoặc Pull Request thay đổi
                │
                ▼
      Webhook hoặc lịch quét của job cha
                │
                ▼
  Jenkins indexing: đọc Branch Source + discovery traits
                │
                ▼
 Tạo/cập nhật/đánh dấu job con theo Jenkinsfile và policy
                │
                ▼
 Job con chọn revision, chạy Pipeline trên agent phù hợp
                │
                ▼
 Build record, status, log, report và artifact của chính job con
```

Indexing là bước quản lý inventory. Một push có thể làm source plugin vừa phát hiện lại branch vừa trigger build, nhưng cách mapping sự kiện sang scan/build là khả năng của plugin và cấu hình instance. Mở log **Scan Repository** hoặc activity của job cha để phân biệt lỗi khám phá với lỗi trong Console Output của một job con.

## Branch source

### Chọn nguồn và quyền truy cập

Trong **New Item → Multibranch Pipeline → Branch Sources**, chọn loại source do controller đã cài và phê duyệt. GitHub Branch Source, GitLab Branch Source và Bitbucket Branch Source thường tích hợp API, webhook và khái niệm PR/Merge Request. Git source chung có thể phù hợp với repository Git thông thường nhưng không tự có đầy đủ metadata PR của một hosting provider.

Cấu hình source gồm URL hoặc owner/repository, credential đọc SCM khi repository private, cùng các behavior/trait discovery. Credential chỉ cần quyền đọc repository và metadata cần thiết. Đặt nó trong scope folder/job hẹp nhất; không dùng personal access token có quyền quản trị tổ chức, quyền ghi repository hoặc token phát hành chỉ để Jenkins liệt kê refs.

Nếu Jenkins dùng webhook, đăng ký endpoint theo hướng dẫn của provider và bảo vệ endpoint theo chính sách instance. Webhook giúp phản hồi nhanh hơn poll định kỳ, nhưng không thay cho việc quan sát log scan hoặc một lịch quét dự phòng hợp lý. Không đưa secret webhook, token SCM hay URL nội bộ vào `Jenkinsfile`, mô tả job hoặc Console Output.

### Phạm vi repository và Jenkinsfile

Một job cha nên đại diện cho một repository và một mục đích CI rõ ràng. Nếu nhiều service nằm trong monorepo, vẫn có thể dùng một job cha, nhưng `Jenkinsfile` và điều kiện trong nó phải xác định service nào cần chạy. Đừng tạo nhiều job cha trùng Branch Source chỉ để “lọc” bằng tên branch; mỗi job cha đều tạo thêm API call, indexing và job con để vận hành.

Mặc định, Multibranch Pipeline tìm `Jenkinsfile` tại đường dẫn mà source/plugin cấu hình hỗ trợ. Giữ đường dẫn và tên file là quy ước đã review. Khi branch không có file đó, Jenkins thường không tạo Pipeline job con cho branch ấy hoặc bỏ qua nó trong scan; hãy xem log indexing của plugin thay vì giả định Jenkinsfile của `main` sẽ được dùng cho mọi branch.

<Callout type="idea" title="Tách quyền theo folder">
  Đặt job cha trong folder theo team/môi trường. Folder credentials, quyền build/cấu hình và agent policy là lớp phòng vệ hữu ích: CI của PR có thể đọc credential repository tối thiểu, trong khi pipeline phát hành nằm ở folder khác với credential và agent riêng.
</Callout>

## Chiến lược discovery

Discovery strategy quyết định ref nào Jenkins coi là ứng viên để tạo job con và ref/revision nào dùng để build. Các lựa chọn cụ thể xuất hiện dưới dạng trait/behavior của Branch Source plugin; không sao chép nhãn UI giữa Git provider nếu chưa đối chiếu plugin đang cài.

### Branch và tag

| Đối tượng | Chiến lược thường dùng | Khi phù hợp | Lưu ý vận hành |
| --- | --- | --- | --- |
| Branch dài hạn như `main`, `release/*` | Discover branches; có thể include/exclude theo naming convention nếu plugin hỗ trợ. | Cần CI liên tục cho nhánh duy trì. | Đừng exclude `main` hoặc release branch chỉ vì chúng cũng có PR nếu còn cần build hậu-merge. |
| Feature branch | Discover tất cả, hoặc chỉ discover branch không có PR tùy workflow. | Muốn feedback trước khi mở PR hoặc cần build branch cá nhân. | Khám phá mọi branch ngắn hạn có thể tạo nhiều job/lịch sử; đặt naming và orphan policy rõ. |
| Tag phát hành | Discover tags. | Tag có `Jenkinsfile` cần kiểm thử provenance, package hoặc xác nhận release. | Tag thường là ref bất biến; pipeline tag vẫn phải bị giới hạn credential/approval theo policy phát hành. |
| PR/Merge Request | Discover change requests từ repository gốc. | Muốn quality gate trước merge. | Chọn rõ build revision là head hay merge result; không coi hai lựa chọn là tương đương. |

Một số plugin Git hosting có tùy chọn chỉ build branch có PR, hoặc loại branch đã có PR để tránh chạy lặp. Đây là trade-off giữa chi phí và coverage. Ví dụ, nếu chọn “exclude branches that are also filed as PR”, `feature/search` có thể không còn job branch khi PR của nó mở; kết quả kiểm thử sẽ nằm ở job PR. Ghi quy ước này trong quy trình review để người dùng không tìm sai job.

### Pull Request từ repository gốc và fork

PR từ cùng repository gốc và PR từ fork là hai mức rủi ro khác nhau. PR nội bộ vẫn cần review, nhưng người có quyền push vào repository gốc thường đã đi qua một ranh giới quyền khác với contributor bên ngoài. Fork cho phép người đóng góp thay `Jenkinsfile`, mã build, dependency manifest và dữ liệu đầu vào của build.

Khi plugin hỗ trợ, cấu hình riêng cho:

- **PR từ repository gốc:** chọn khám phá PR và strategy build phù hợp, thường là head revision hoặc revision merge thử với target branch.
- **PR từ fork:** chỉ bật khi có nhu cầu cộng tác thật. Chọn trust policy hẹp nhất mà plugin cung cấp, chẳng hạn chỉ maintainer/repository collaborator đã được xác định bởi provider. Không chọn trust rộng chỉ để PR tự chạy đầy đủ.
- **PR không tin cậy:** chạy kiểm tra không cần secret trên agent/pool cô lập, hoặc không tự động chạy nếu chưa có workflow phê duyệt an toàn. Khả năng “build sau khi maintainer chấp thuận” phụ thuộc provider/plugin và phải được thử trong sandbox.

Không phải Branch Source plugin nào cũng dùng cùng tên strategy hoặc cùng định nghĩa “contributor”. Xem trang plugin, Pipeline Syntax và log source trên chính controller. Một policy trust trong plugin không thay thế quyền Jenkins, network policy, isolation agent hay review branch protection.

## Ranh giới tin cậy cho Jenkinsfile

### Head, merge revision và Jenkinsfile được dùng

Với PR, **head revision** là commit ở đầu branch PR. **Merge revision** là commit giả lập kết quả ghép branch PR vào target branch tại thời điểm Jenkins kiểm tra. Build head cho biết source người đóng góp vừa push có qua test không. Build merge revision phát hiện sớm xung đột hoặc test chỉ hỏng khi kết hợp với target branch mới.

Chọn một trong hai theo policy CI, hoặc chạy cả hai khi plugin/workflow của bạn hỗ trợ và capacity cho phép. Luôn hiển thị revision, target branch và strategy trong status/log; nếu không, một build xanh có thể bị hiểu nhầm là đã kiểm tra merge result trong khi thực tế chỉ kiểm tra head.

Đối với fork không được trust, các Branch Source plugin có thể áp dụng cơ chế bảo vệ riêng, ví dụ dùng Jenkinsfile đáng tin cậy từ target branch thay vì file do fork sửa. Hành vi chính xác là plugin- và version-specific. Vì vậy, hãy kiểm tra tài liệu plugin cùng log scan/build bằng một fork sandbox trước khi dựa vào nó. Không tự suy luận rằng một build an toàn chỉ vì tên job có chữ PR.

### Credential, agent và dữ liệu dùng chung

`Jenkinsfile` có thể gọi `sh`, tải dependency, đọc file workspace và cố gắng dùng credential mà job được cấp. Vì vậy, đánh giá source trước khi cấp khả năng thực thi:

- Không expose credential deploy, signing key, token ghi SCM, cloud production hoặc secret môi trường cho PR/fork. Credential đọc source cũng phải có scope tối thiểu.
- Không chạy code fork trên controller/built-in node, agent phát hành, agent có Docker socket đặc quyền, workspace dùng chung của build tin cậy, hoặc network có đường tới hệ thống nhạy cảm.
- Tách cache theo trust boundary. Code không tin cậy không được ghi cache mà build release sau đó sẽ tin dùng; không dùng artifact do fork tạo làm input phát hành mà không có kiểm chứng độc lập.
- Dùng branch protection, review bắt buộc và quyền ghi giới hạn cho branch chứa Jenkinsfile đáng tin cậy. Jenkins trust policy không bảo vệ khi attacker đã có quyền sửa target branch.
- Giữ `checkout scm`, credential binding và step có side effect trong scope nhỏ. Lệnh test của PR phải không deploy, không xóa tài nguyên và không gọi API ghi dữ liệu.

<Callout type="warn" title="Không cấp secret để “sửa” lỗi PR">
  Nếu PR từ fork lỗi vì thiếu credential, đó có thể là policy đúng. Tách test công khai không cần secret khỏi stage phát hành tin cậy; không thêm credential đặc quyền, không tắt sandbox/authorization và không chuyển build sang agent production để làm job xanh.
</Callout>

## Orphaned item strategy

Khi branch bị xóa, PR đóng hoặc tag không còn được Branch Source trả về, job con cũ trở thành **orphaned item**. Orphaned Item Strategy chỉ quản lý các job con đó; nó không xóa branch, tag hay repository trên SCM.

Chiến lược phổ biến là giữ job con orphan trong một khoảng thời gian hoặc số lượng nhất định, rồi loại bỏ record cũ theo retention. Việc này cân bằng hai nhu cầu: giữ log/artifact đủ lâu để điều tra và tránh để controller tích lũy hàng nghìn job con không còn giá trị.

Trước khi cấu hình retention, trả lời các câu hỏi sau:

1. Build history, artifact và log của branch/PR đã đóng cần giữ bao lâu cho audit, hỗ trợ và release traceability?
2. Artifact có lifecycle riêng không? Xóa job con có thể làm liên kết UI/history biến mất, nhưng không thay thế chính sách retention của kho artifact bên ngoài.
3. Tên branch có thể bị tái sử dụng không? Nếu có, không dựa vào job con cũ như bằng chứng duy nhất cho revision mới.
4. Ai sở hữu việc khôi phục evidence khi một job con bị dọn? Kiểm tra backup/restore theo runbook trước khi giảm retention.

Bắt đầu bằng retention bảo thủ ở sandbox hoặc một folder canary. Theo dõi số lượng job con, dung lượng build records/artifact và nhu cầu tra cứu thực tế. Không đặt xóa ngay khi branch biến mất trên production chỉ để danh sách job gọn; branch bị mất khỏi scan có thể là lỗi quyền, lỗi API, đổi naming convention hoặc sự cố provider.

## Scan và indexing

### Khi nào Jenkins quét?

**Indexing** là lần job cha đồng bộ với Branch Source. Nó thường chạy khi job được tạo, khi người vận hành chọn quét lại, theo periodic scan nếu đã cấu hình, hoặc khi plugin nhận SCM event/webhook phù hợp. Trong log scan, Jenkins/plugin sẽ liệt kê source được xử lý, ref được phát hiện, Jenkinsfile được đánh giá và các job con được tạo/cập nhật/loại khỏi inventory.

Một lần scan thành công không đồng nghĩa mọi build đều `SUCCESS`. Scan có thể thành công nhưng job con fail ở checkout, syntax Jenkinsfile, agent allocation hoặc test. Ngược lại, một job con đang xanh không chứng minh scan mới nhất đã thấy branch vừa push. Đọc hai evidence riêng: activity/log của job cha cho discovery và Console Output của job con cho execution.

Khi cần kiểm tra ngay, mở job cha và dùng thao tác **Scan Multibranch Pipeline Now** nếu UI/plugin của instance hiển thị thao tác này. Chờ scan kết thúc rồi mở danh sách job con và log indexing. Không spam scan thủ công nhiều lần: các lần quét đồng thời hoặc liên tiếp có thể tạo thêm API load mà không làm provider trả dữ liệu mới nhanh hơn.

### Kiểm soát tải và nhiễu

Một tổ chức có nhiều repository, branch ngắn hạn và PR có thể tạo tải đáng kể lên controller, Git provider API, SCM network, queue và agent. Giảm load ở nguồn thay vì tăng polling:

- Ưu tiên webhook đã xác thực để phản hồi thay đổi; dùng periodic scan thưa như cơ chế bù mất sự kiện, theo giới hạn API và recovery objective của tổ chức.
- Chỉ bật discovery branch/tag/PR thực sự cần. Ví dụ, không discover tag nếu tag không có Pipeline use case; không chạy đồng thời job branch và PR cho cùng workload nếu một kết quả đã đủ.
- Đặt naming convention và filter include/exclude đã review **nếu plugin hỗ trợ**, rồi thử ref mẫu để chắc không loại `main`, release branch hay PR bắt buộc.
- Đo thời lượng scan, số API error/rate-limit, số job con, queue wait và executor/agent usage. Tách controller/API bottleneck khỏi test workload trước khi tăng executor.
- Phân tán thay đổi cấu hình: thử một job cha canary, một repository và một discovery strategy tại một thời điểm. Không re-index toàn bộ catalog giữa giờ cao điểm chỉ để kiểm tra UI.

Nếu SCM trả `429`, rate-limit hoặc timeout, tôn trọng backoff của plugin/provider và giảm tần suất/độ rộng scan. Không thêm token quyền cao hoặc tăng poll frequency để ép qua giới hạn. Xác nhận webhook delivery ở phía provider và log hệ thống theo quyền vận hành trước khi kết luận Jenkins bỏ sót event.

## Lab sandbox an toàn

Lab này dùng repository sandbox do bạn kiểm soát, agent Linux không có secret/phát hành và PR từ **cùng repository**. Nó tạo branch, tag và PR vô hại; không cần credential thật, không deploy và không xóa dữ liệu. Nếu repository private, gắn credential đọc SCM qua UI Jenkins với scope nhỏ nhất thay vì đưa vào Git URL hoặc Jenkinsfile.

### Chuẩn bị repository

Tạo một repository Git sandbox trên provider đã được đội cho phép. Các lệnh dưới tạo history local; thay `<sandbox-repository-url>` bằng URL repository của chính bạn, không kèm token. Agent của Jenkins cần có label `linux && ci-sandbox`; nếu instance dùng label khác, chọn một agent sandbox tương đương thay vì built-in node.

```bash
git init multibranch-lab
cd multibranch-lab
git branch -M main

cat > Jenkinsfile <<'EOF'
pipeline {
  agent { label 'linux && ci-sandbox' }

  options {
    skipDefaultCheckout(true)
    timeout(time: 5, unit: 'MINUTES')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'test -f Jenkinsfile'
      }
    }
    stage('Verify context') {
      steps {
        sh '''#!/usr/bin/env sh
          set -eu
          printf 'branch=%s\n' "${BRANCH_NAME:-unknown}"
          printf 'change-id=%s\n' "${CHANGE_ID:-not-a-change-request}"
          printf 'change-target=%s\n' "${CHANGE_TARGET:-not-a-change-request}"
          printf 'verification=PASS\n'
        '''
      }
    }
  }
}
EOF

git add Jenkinsfile
git commit -m 'Add safe multibranch verification'
git remote add origin <sandbox-repository-url>
git push -u origin main

git switch -c feature/hello
git commit --allow-empty -m 'Add harmless feature branch'
git push -u origin feature/hello
git tag v0.1.0-lab
git push origin v0.1.0-lab
```

Sau đó mở một PR từ `feature/hello` vào `main` **trong cùng repository**, không từ fork. Không sửa Jenkinsfile để thêm secret hoặc thao tác mạng. Nếu provider yêu cầu webhook secret, cấu hình nó qua trang provider/Jenkins theo quy trình quản trị, không theo lệnh hay commit trong lab.

### Tạo Multibranch Pipeline

1. Vào **New Item → Multibranch Pipeline**, đặt tên `multibranch-lab` trong folder sandbox, rồi lưu ban đầu để mở phần cấu hình.
2. Trong **Branch Sources**, chọn plugin source của provider. Chọn repository sandbox và chỉ credential đọc SCM nếu repository private.
3. Bật discovery cho branch, tag và PR từ repository gốc. Với PR, chọn một strategy rõ ràng: merge revision để kiểm tra khả năng ghép với `main`, hoặc head revision để kiểm tra chính commit PR. Ghi lựa chọn vào mô tả job/lab record.
4. Không bật discovery PR từ fork trong lab này. Giữ Orphaned Item Strategy mặc định hoặc dùng retention bảo thủ chỉ cho folder lab; không thử xóa item ngay khi source biến mất.
5. Lưu rồi chờ lần indexing đầu tiên. Nếu không có webhook sandbox, chạy một lần **Scan Multibranch Pipeline Now**. Mở log scan và chỉ trigger build từ job con vừa được tạo.

### Quan sát kết quả mong đợi

Sau indexing, danh sách phải có job con cho `main`, `feature/hello`, tag `v0.1.0-lab` và PR. Tên PR có thể là `PR-<số>`, `MR-<số>` hoặc tên khác do plugin. Nếu strategy loại branch đã có PR được bật, `feature/hello` có thể bị loại sau khi PR mở; đó là kết quả đúng của strategy, không phải mất dữ liệu.

Build `main`, branch và tag phải kết thúc `SUCCESS`, với log có `verification=PASS`. Build PR phải in `change-id` và `change-target=main`; branch/tag thường in `not-a-change-request`. Giá trị môi trường và tên job cụ thể là do plugin cung cấp, vì vậy log có thể khác ngoài các tín hiệu chính này.

Để xác minh indexing, push một empty commit mới lên `feature/hello` rồi kiểm tra webhook/scan activity và build tương ứng. Để kiểm tra orphan handling mà không xóa dữ liệu, đóng PR hoặc xóa branch **chỉ trong repository sandbox**, chạy scan, rồi quan sát job con trở thành orphan/được giữ theo strategy. Dừng trước khi thay retention sang chính sách xóa; khôi phục hoặc bỏ job lab theo quy trình sandbox của đội khi đã thu thập kết quả.

## Troubleshooting

| Triệu chứng | Evidence cần xem | Hướng xử lý an toàn |
| --- | --- | --- |
| Branch hoặc tag không xuất hiện | Log scan job cha, branch/tag discovery trait, đường dẫn Jenkinsfile, quyền đọc refs. | Kiểm tra ref có thật trên provider và strategy có bật; chạy một scan có kiểm soát, không tạo job Pipeline thủ công để che lỗi discovery. |
| PR xuất hiện nhưng không build như mong đợi | Strategy head/merge, target branch, webhook activity và Console Output job PR. | Xác nhận revision Jenkins chọn; chọn lại strategy trong sandbox nếu mục tiêu là test merge result thay vì head. |
| PR fork không chạy hoặc thiếu credential | Trust policy plugin, nguồn PR, folder credential scope, agent/queue log. | Coi đây là boundary bảo mật trước tiên; dùng test không secret/pool cô lập hoặc maintainer workflow đã review, không thêm credential đặc quyền. |
| Scan lỗi 401/403 | Credential ID (không phải giá trị), quyền read repository/API, log provider và expiry policy. | Dùng credential đọc tối thiểu đúng scope; không in token hoặc đổi sang token admin. |
| Scan chậm hoặc bị rate-limit | Thời lượng indexing, webhook deliveries, API response/rate-limit và số refs/job con. | Giảm periodic scan và discovery không cần thiết, sửa webhook, rồi thử canary; không tăng poll frequency. |
| Job con cũ biến mất | Orphaned Item Strategy, thời điểm scan, retention, audit/backup evidence. | Dừng thay đổi retention, xác minh source/API trước; khôi phục theo runbook nếu policy đã dọn evidence cần giữ. |
| Jenkinsfile lỗi trước stage đầu | Log branch indexing/job con, Jenkinsfile ở revision được chọn và plugin/Pipeline version. | Sửa Jenkinsfile qua branch/PR đáng tin cậy, kiểm tra syntax trong sandbox; không tắt sandbox hay Script Security để vượt lỗi. |
| Job chờ queue | Label trong Jenkinsfile, trạng thái agent/executor và trust class của pool. | Route vào agent sandbox đúng label hoặc chờ capacity; không chạy PR không tin cậy trên controller hay agent phát hành. |

## Checklist xác minh

- [ ] Job cha có một Branch Source, repository và owner/mục đích CI rõ ràng; credential đọc SCM có scope tối thiểu và không nằm trong source/log.
- [ ] Tôi biết mỗi job con đại diện cho branch, tag hoặc PR nào và có thể mở log indexing của job cha để xác minh discovery.
- [ ] Discovery branch, tag, PR gốc và PR fork được chọn có chủ đích; tôi hiểu branch có PR có thể bị loại khi chọn strategy tránh build trùng.
- [ ] Strategy PR head hoặc merge revision đã được ghi rõ, và status/log cho biết revision cùng target branch đã kiểm tra.
- [ ] Jenkinsfile từ fork không tin cậy không nhận credential đặc quyền, agent phát hành, workspace/cache tin cậy hoặc đường mạng nhạy cảm.
- [ ] Trust policy của plugin đã được kiểm tra với fork sandbox; tôi không giả định behavior giống nhau giữa provider/plugin/version.
- [ ] Orphaned Item Strategy giữ history/evidence theo retention đã được owner phê duyệt; không có xóa tức thời không qua thử nghiệm.
- [ ] Webhook hoặc periodic scan dự phòng được sizing theo API limit và nhu cầu phản hồi; scan load, rate-limit, job count và queue được quan sát.
- [ ] Lab đã chứng minh `main`, branch, tag và PR được phát hiện theo đúng strategy; build chỉ thực hiện kiểm tra vô hại trên agent sandbox.
- [ ] Lỗi được phân loại là discovery/indexing, SCM authorization, Jenkinsfile, queue/agent hay test trước khi thay đổi policy bảo mật.

## Nguồn Jenkins chính thức

- [Using a Jenkinsfile: Multibranch Pipeline](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#multibranch-pipeline) — mô hình branch, PR và `Jenkinsfile` trong Multibranch Pipeline.
- [Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — cú pháp Pipeline, `checkout scm`, agent, options và environment variables của multibranch.
- [Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — scope và cách giữ credential ngoài Jenkinsfile/log.
- [Managing security](https://www.jenkins.io/doc/book/security/managing-security/) — authentication, authorization và quyền tối thiểu trong Jenkins.
- [GitHub Branch Source plugin](https://plugins.jenkins.io/github-branch-source/) — discovery branch/tag/PR, fork trust và yêu cầu plugin GitHub.
- [GitLab Branch Source plugin](https://plugins.jenkins.io/gitlab-branch-source/) — khả năng Branch Source cho GitLab; đối chiếu trait/version đang cài.
- [Bitbucket Branch Source plugin](https://plugins.jenkins.io/bitbucket-branch-source/) — khả năng Branch Source cho Bitbucket; đối chiếu trait/version đang cài.
- [Git plugin](https://plugins.jenkins.io/git/) — SCM Git và yêu cầu/cấu hình plugin liên quan.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan Pipeline" href="/docs/pipelines/overview" description="Ôn Pipeline as Code, flow execution và cách đọc build." />
  <Card title="Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Viết Jenkinsfile có review, credential boundary và stage rõ ràng." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Giữ secret trong Jenkins Credentials với scope tối thiểu." />
  <Card title="Build Triggers" href="/docs/jobs/triggers" description="Hiểu webhook, poll SCM và lịch trigger bên cạnh scan Multibranch." />
  <Card title="Labels & Executors" href="/docs/agents/labels-executors" description="Route job con vào agent đúng năng lực và trust boundary." />
</Cards>
