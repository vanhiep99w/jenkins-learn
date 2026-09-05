---
title: "Tự động hóa kiểm thử"
description: "Tổ chức unit, integration và end-to-end test trong Jenkins Pipeline, xuất report và xử lý flaky test bằng bằng chứng."
---

<Callout type="info" title="Phạm vi và giả định">
  Hướng dẫn này minh họa ứng dụng Java dùng Maven, cùng một bộ end-to-end dùng Playwright. Jenkins chạy Declarative Pipeline trên Linux agent tách biệt; controller không chạy workload build. Thay command và đường dẫn report để khớp repository của bạn.
</Callout>

## Mục lục

- [Phạm vi và giả định](#phạm-vi-và-giả-định)
  - [Công cụ, plugin và định dạng report](#công-cụ-plugin-và-định-dạng-report)
- [Thiết kế chiến lược kiểm thử](#thiết-kế-chiến-lược-kiểm-thử)
  - [Test pyramid](#test-pyramid)
  - [Chọn test theo thời gian phản hồi](#chọn-test-theo-thời-gian-phản-hồi)
  - [Ranh giới giữa build, test và quality gate](#ranh-giới-giữa-build-test-và-quality-gate)
- [Jenkinsfile mẫu: chạy test và thu thập kết quả](#jenkinsfile-mẫu-chạy-test-và-thu-thập-kết-quả)
  - [Đọc luồng pass/fail](#đọc-luồng-passfail)
  - [Report không thay thế việc chạy test](#report-không-thay-thế-việc-chạy-test)
- [Chạy test song song có kiểm soát](#chạy-test-song-song-có-kiểm-soát)
  - [Chiến lược chia nhánh](#chiến-lược-chia-nhánh)
  - [Tranh chấp tài nguyên và cô lập](#tranh-chấp-tài-nguyên-và-cô-lập)
- [Quản lý flaky test bằng bằng chứng](#quản-lý-flaky-test-bằng-bằng-chứng)
  - [Quy trình điều tra và ownership](#quy-trình-điều-tra-và-ownership)
  - [Retry có giới hạn, không tạo xanh giả](#retry-có-giới-hạn-không-tạo-xanh-giả)
- [Dữ liệu, secret, network và cleanup](#dữ-liệu-secret-network-và-cleanup)
  - [Dữ liệu và secret](#dữ-liệu-và-secret)
  - [Network và dọn dẹp an toàn](#network-và-dọn-dẹp-an-toàn)
- [Lab: đưa ba tầng test vào Pipeline](#lab-đưa-ba-tầng-test-vào-pipeline)
  - [Bước 1: chuẩn bị dự án và agent](#bước-1-chuẩn-bị-dự-án-và-agent)
  - [Bước 2: xác nhận command trên agent](#bước-2-xác-nhận-command-trên-agent)
  - [Bước 3: thêm Jenkinsfile và tạo job](#bước-3-thêm-jenkinsfile-và-tạo-job)
  - [Bước 4: đọc report và tạo một failure có chủ đích](#bước-4-đọc-report-và-tạo-một-failure-có-chủ-đích)
  - [Bước 5: xử lý một dấu hiệu flaky](#bước-5-xử-lý-một-dấu-hiệu-flaky)
  - [Kết quả mong đợi](#kết-quả-mong-đợi)
- [Bảng quyết định](#bảng-quyết-định)
- [Checklist áp dụng](#checklist-áp-dụng)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Phạm vi và giả định

Mục tiêu của CI là biến mỗi thay đổi thành một tín hiệu sớm, có thể hành động. Jenkins điều phối agent và lưu kết quả; chính command của dự án mới biên dịch và thực thi test. Để đặt bài này trong bức tranh lớn hơn, xem [Nền tảng CI/CD](/docs/getting-started/ci-cd-fundamentals) và [kiến trúc controller–agent](/docs/getting-started/architecture).

### Công cụ, plugin và định dạng report

Ví dụ dưới đây giả định:

| Hạng mục | Giả định | Vì sao cần nêu rõ |
| --- | --- | --- |
| Jenkins | Jenkins LTS có Pipeline và **JUnit Plugin** | Step `junit` đọc XML theo định dạng JUnit để hiển thị test trend và failed tests. |
| Agent | Linux agent mang label `linux && test-tools`, có JDK 21, Maven 3.9, Node.js LTS và browser/dependencies Playwright | `agent` chỉ chọn nơi chạy; Jenkins không tự cài toolchain. |
| Unit test | Maven Surefire ghi `target/surefire-reports/*.xml` | Đây là XML JUnit mà Jenkins có thể parse. |
| Integration test | Maven Failsafe, được bật bởi profile `integration`, ghi `target/failsafe-reports/*.xml` | Test cần service phụ thuộc đã được provision riêng. |
| End-to-end | Playwright xuất JUnit XML vào `test-results/e2e-junit.xml` | Screenshot, trace và video là artifact chẩn đoán, không phải kết quả pass/fail. |

<Callout type="warn" title="Kiểm tra plugin trước khi dùng Pipeline">
  `junit` là step do JUnit Plugin cung cấp; `archiveArtifacts` là Pipeline step để lưu file build. Xác nhận phiên bản Jenkins LTS, JUnit Plugin và toolchain agent tương thích trong môi trường thử nghiệm trước khi áp dụng production. Không cài plugin chỉ vì một Jenkinsfile mẫu yêu cầu nó.
</Callout>

## Thiết kế chiến lược kiểm thử

### Test pyramid

**Test pyramid** ưu tiên nhiều test nhỏ, rẻ và xác định ở đáy; số test chậm, phụ thuộc nhiều thành phần giảm dần ở đỉnh. Nó không yêu cầu tỷ lệ cứng. Mục đích là nhận phần lớn feedback trong vài phút mà vẫn giữ một số test xác minh luồng tích hợp thật.

```text
                    E2E
          ít, chậm, sát hành vi người dùng
                 /            \
          Integration tests
       kiểm tra ranh giới service, DB, queue
               /                    \
              Unit tests
   nhiều, nhanh, cô lập hàm hoặc module
```

- **Unit test** kiểm tra một đơn vị nhỏ, như hàm tính tổng tiền hoặc validation. Mock hoặc fake dependency khi điều đó giúp kiểm tra logic quyết định. Unit test không chứng minh cấu hình database hay browser hoạt động.
- **Integration test** kiểm tra ranh giới thật: repository nói chuyện với database tạm, service gọi mock server theo hợp đồng, hoặc message được publish rồi consume. Nó cần ownership rõ cho dependency và dữ liệu.
- **End-to-end (E2E) test** điều khiển ứng dụng qua giao diện hoặc API công khai như người dùng. Chỉ giữ các journey có rủi ro cao, ví dụ đăng nhập và thanh toán; đừng lặp mọi nhánh unit ở tầng này.

Ví dụ, quy tắc “mã giảm giá hết hạn bị từ chối” nên có unit test. Kết nối ORM với schema có migration nên có integration test. Luồng người dùng nhập mã rồi checkout thành công chỉ cần một số E2E test đại diện.

### Chọn test theo thời gian phản hồi

Đặt test trên luồng chạy theo chi phí phản hồi, không chỉ theo tên framework. Một pull request cần tín hiệu nhanh; test cần hạ tầng hiếm hoặc thời gian dài có thể chạy ở nhánh chính, trước release hoặc theo lịch, miễn là owner biết độ trễ đó.

| Khi nào | Test nên chạy | Mục tiêu thời gian phản hồi | Ví dụ |
| --- | --- | --- | --- |
| Mỗi commit/pull request | Format, lint, unit test và integration test ngắn, xác định | Vài phút | Xác minh validation và repository với database tạm. |
| Merge vào `main` | Bộ integration rộng hơn, E2E smoke | Trong thời gian CI của đội | Mở ứng dụng, đăng nhập và gọi một API quan trọng. |
| Trước release hoặc theo lịch | E2E đầy đủ, compatibility, tải hoặc test phụ thuộc đắt | Có thể dài hơn, nhưng có SLA và owner | Kiểm tra journey trên nhiều browser hoặc với dịch vụ sandbox. |

Một test E2E 40 phút không nên chặn mọi commit nếu nó có thể chuyển thành smoke 5 phút và bộ đầy đủ chạy theo lịch. Ngược lại, không dùng lịch chạy để né một integration test phát hiện lỗi merge thường xuyên. Đo thời lượng, tỷ lệ lỗi và giá trị bắt lỗi để quyết định lại.

### Ranh giới giữa build, test và quality gate

Ba khái niệm này liên quan nhưng không đồng nghĩa:

- **Build** biên dịch, đóng gói hoặc tạo output. Ví dụ `mvn package` tạo JAR.
- **Test execution** chạy command kiểm thử và tạo exit code cùng dữ liệu thô, như XML JUnit, trace hoặc log.
- **Quality gate** là chính sách quyết định Pipeline có được đi tiếp hay không, dựa trên các tín hiệu đã chọn: test không lỗi, coverage tối thiểu, scan đạt ngưỡng hoặc approval.

`junit` chỉ **publish/parse** XML sau khi command đã chạy; nó không chạy Surefire, Failsafe hay Playwright. Tương tự, artifact screenshot giúp điều tra nhưng không biến một test thất bại thành đạt. Hãy định nghĩa gate bằng điều kiện, ngưỡng, ngoại lệ có thời hạn và owner thay vì đặt tên một stage là `Quality` rồi mặc định nó có ý nghĩa.

## Jenkinsfile mẫu: chạy test và thu thập kết quả

Jenkinsfile này dùng các profile Maven đã được dự án cấu hình: mặc định chạy unit test; `-Pintegration` chạy integration test qua Failsafe. Lệnh Playwright đặt biến xuất XML JUnit. Agent phải có browser Playwright đã cài sẵn hoặc được tạo từ image đã kiểm thử; Pipeline không tải browser ngầm trong mỗi build.

```groovy
pipeline {
  agent { label 'linux && test-tools' }

  options {
    timestamps()
    skipDefaultCheckout(true)
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Unit test') {
      steps {
        sh 'mvn -B -ntp test'
      }
      post {
        always {
          junit allowEmptyResults: false, testResults: 'target/surefire-reports/*.xml'
          archiveArtifacts allowEmptyArchive: true,
            artifacts: 'target/surefire-reports/**', fingerprint: true
        }
      }
    }

    stage('Integration test') {
      steps {
        sh 'mvn -B -ntp -Pintegration verify'
      }
      post {
        always {
          junit allowEmptyResults: false, testResults: 'target/failsafe-reports/*.xml'
          archiveArtifacts allowEmptyArchive: true,
            artifacts: 'target/failsafe-reports/**,target/*-integration.log', fingerprint: true
        }
      }
    }

    stage('E2E smoke') {
      environment {
        PLAYWRIGHT_JUNIT_OUTPUT_NAME = 'test-results/e2e-junit.xml'
      }
      steps {
        sh 'npm ci'
        sh 'npx playwright test --project=chromium --grep @smoke --reporter=junit'
      }
      post {
        always {
          junit allowEmptyResults: false, testResults: 'test-results/e2e-junit.xml'
          archiveArtifacts allowEmptyArchive: true,
            artifacts: 'test-results/**,playwright-report/**', fingerprint: true
        }
      }
    }
  }
}
```

### Đọc luồng pass/fail

- Mỗi `sh` trả exit code khác `0` khi test runner phát hiện failure, nên stage và build thất bại. Khối `post { always { ... } }` vẫn publish XML và artifact để failure có thể điều tra.
- `allowEmptyResults: false` khiến cấu hình report sai hoặc test không sinh XML trở thành tín hiệu phải sửa, thay vì im lặng bỏ qua. Chỉ dùng `true` cho nhánh thật sự không có loại test đó, kèm điều kiện và lý do rõ ràng.
- `archiveArtifacts` giữ XML thô, trace, screenshot và log theo retention của Jenkins. Với artifact cần giữ lâu hoặc phân phối, dùng kho artifact chuyên dụng và chính sách retention riêng.
- `agent` ở cấp Pipeline giữ các stage tuần tự trên một agent/workspace đã checkout. Nếu chuyển sang agent khác hoặc song song hóa stage, checkout lại trên nhánh đó hoặc dùng `stash`/`unstash` hay artifact có chủ đích; không dựa vào file tạm của workspace khác.

### Report không thay thế việc chạy test

Một file XML tồn tại không chứng minh command test chạy trên revision hiện tại. XML có thể cũ trong workspace tái sử dụng, rỗng hoặc bị tạo bởi script khác. Luôn để test command là source of truth cho exit code; report là bằng chứng bổ sung cho người đọc Jenkins.

<Callout type="idea" title="Giữ bằng chứng gần failure">
  Với E2E, lưu trace/screenshot chỉ khi runner hỗ trợ và theo retention ngắn. Chúng giúp tái hiện lỗi UI, nhưng cần rà soát để không chứa thông tin cá nhân, token hoặc nội dung production.
</Callout>

## Chạy test song song có kiểm soát

### Chiến lược chia nhánh

Sau khi unit test đã đủ nhanh, có thể chạy integration và E2E smoke song song để rút ngắn critical path. Mỗi nhánh cần command, report path và hạ tầng riêng; đừng để hai nhánh cùng ghi một `target/` hay một file XML.

```groovy
stage('Xác minh song song') {
  parallel {
    stage('Integration') {
      steps {
        sh 'mvn -B -ntp -Pintegration verify'
      }
    }
    stage('E2E smoke') {
      steps {
        sh 'npx playwright test --project=chromium --grep @smoke --reporter=junit'
      }
    }
  }
}
```

Trong Jenkinsfile thật, đặt `agent` cho từng stage song song và khai báo `post { always { junit ... } }` như mẫu trước. Unit test thường chạy trước để trả lỗi rẻ nhất; chỉ song song hóa các nhánh mà tổng thời gian giảm đáng kể sau khi đã đo.

### Tranh chấp tài nguyên và cô lập

Song song không tự tạo CPU, RAM, port hoặc database. Hai browser chạy trên một agent nhỏ có thể timeout vì hết RAM; hai integration test dùng cùng schema có thể xóa dữ liệu của nhau. Tình trạng đó tạo flaky test, không phải bằng chứng sản phẩm lỗi.

Trước khi tăng concurrency, kiểm tra các điểm cô lập sau:

- dùng database/schema/namespace và user riêng cho từng build; thêm `BUILD_TAG` hoặc một ID ngẫu nhiên vào tên tài nguyên;
- cấp port động hoặc network namespace riêng, không hard-code `localhost:5432` cho mọi build;
- giới hạn một executor cho agent E2E nặng, hoặc tách pool agent bằng label;
- khóa tài nguyên hiếm như thiết bị vật lý hay sandbox dùng chung thay vì để build đè lên nhau;
- đặt timeout hợp lý và thu thập CPU, RAM, disk, network để phân biệt contention với lỗi ứng dụng.

<Callout type="warn" title="Tốc độ không quan trọng hơn tính lặp lại">
  Đừng tăng số executor chỉ vì nhiều stage đang chờ. Nếu test chia sẻ dữ liệu hoặc tài nguyên, hãy sửa isolation hoặc thêm capacity đã được đo. Một pipeline nhanh nhưng không tái lập kết quả làm mất giá trị của CI.
</Callout>

## Quản lý flaky test bằng bằng chứng

Flaky test là test cho kết quả khác nhau khi source, môi trường và input đáng lẽ tương đương. Nhãn “flaky” là giả thuyết, không phải lý do để bỏ qua failure. Lưu build URL, commit, tên test, XML, console log, thời lượng, ảnh/trace và tình trạng dependency trước khi kết luận.

### Quy trình điều tra và ownership

1. **Xác nhận dấu hiệu.** Chạy lại cùng commit trên agent hoặc môi trường cô lập. So sánh timestamp, version dependency, dữ liệu, request log và mức tải; không chỉ đếm số lần đỏ/xanh.
2. **Phân loại nguyên nhân.** Tìm race condition, assertion phụ thuộc thời gian, thứ tự test, dữ liệu rò, network timeout, quota hay contention. Một test “pass khi chạy riêng” thường gợi ý shared state hoặc thứ tự thực thi.
3. **Tạo issue có owner.** Gắn tên test, phạm vi ảnh hưởng, build evidence, giả thuyết, người chịu trách nhiệm và hạn xử lý. Owner có thể là đội sở hữu test hoặc service phụ thuộc, không phải “đội CI” một cách mơ hồ.
4. **Sửa và chứng minh.** Thêm tính quyết định, fake clock, fixture độc lập, wait theo điều kiện có timeout hoặc cải thiện test environment. Chạy lặp trên commit sửa và theo dõi tỷ lệ failure sau đó.
5. **Quarantine có thời hạn nếu cần.** Tách test đã được xác nhận flaky khỏi gate chính bằng tag/profile riêng, vẫn chạy và publish report ở job/quarantine lane. Ticket, owner, lý do, ngày hết hạn và tiêu chí đưa lại gate là bắt buộc.

Quarantine giảm nhiễu cho luồng chính trong khi vẫn giữ tín hiệu. Nó không được dùng để che một failure chưa điều tra, và không phải nơi lưu test vĩnh viễn.

### Retry có giới hạn, không tạo xanh giả

Không bọc lệnh test gate bằng `retry { sh '...' }`: nếu lần đầu thất bại nhưng lần sau pass, cách đó có thể biến failure thật thành build xanh và làm mất dữ liệu lần chạy đầu. `retry` vô hạn còn làm tắc executor và che lỗi hạ tầng.

Chỉ retry khi đã có bằng chứng về lỗi tạm thời nằm ngoài hành vi sản phẩm, ví dụ một API sandbox trả `429` có log xác nhận. Giới hạn cố định, chẳng hạn **tối đa 2 lần bổ sung**; mỗi attempt phải có log/ID riêng. Kết quả retry dùng để điều tra, không xóa failure gốc khỏi gate. Với test runner hỗ trợ rerun, cấu hình report để giữ attempt và để chính sách build đánh dấu test flaky là `UNSTABLE` hoặc `FAILURE` theo quy ước đội, không báo `SUCCESS` giả.

Một retry phù hợp hơn cho bước chuẩn bị idempotent, không phải assertion sản phẩm, có thể trông như sau:

```groovy
retry(2) {
  sh './scripts/wait-for-test-sandbox.sh'
}
```

Script này phải có timeout ngắn, log endpoint đã kiểm tra và không tạo/xóa dữ liệu production. Nếu sandbox vẫn không sẵn sàng sau giới hạn, build phải thất bại để owner hạ tầng xử lý. Không đặt retry quanh `mvn test`, `mvn verify` hay `playwright test` chỉ để giảm build đỏ.

## Dữ liệu, secret, network và cleanup

### Dữ liệu và secret

Dữ liệu test cần tối thiểu, tổng hợp hoặc đã được che giấu theo policy. Không sao chép database production, PII, số thẻ, access token hoặc session cookie vào fixture, artifact, report hay screenshot. Mỗi build tạo tenant/schema/namespace riêng và ghi ID đó vào log để có thể truy vết rồi dọn đúng phạm vi.

Secret cho sandbox nằm trong Jenkins Credentials với quyền tối thiểu và chỉ được cấp cho stage cần thiết. Không hard-code secret trong `Jenkinsfile`, `package.json`, URL command hoặc biến môi trường được in ra. Tránh `set -x`, không echo biến secret, và kiểm tra trace/screenshot trước khi archive. Tham khảo mô hình Jenkins trước khi cấp quyền tại [Tổng quan về Jenkins](/docs/getting-started/overview).

### Network và dọn dẹp an toàn

Integration/E2E test nên gọi endpoint sandbox đã được allowlist. Dùng fake server hoặc stub cho dependency không cần kiểm tra ở lần chạy đó; không để test mặc định gọi production qua hostname mơ hồ. Đặt connect/read timeout, ghi hostname không nhạy cảm và phân biệt DNS, TLS, `429`, `5xx` với assertion ứng dụng.

Cleanup phải chạy cả khi test fail nhưng không được “quét rộng”:

- tạo tài nguyên dưới prefix/namespace chỉ của build, sau đó xóa đúng ID đã tạo;
- dùng `post { always { ... } }` hoặc fixture teardown để cleanup dù stage đỏ;
- đặt TTL cho namespace/bucket test để thu gom tài nguyên bị bỏ lại khi agent chết;
- trước lệnh xóa, xác minh biến scope không rỗng và khớp prefix test; không chạy `rm -rf "$WORKSPACE"/*` khi biến path chưa được kiểm tra;
- không dùng credential production cho cleanup test.

<Callout type="error" title="Cleanup sai phạm vi có thể là sự cố dữ liệu">
  Một script teardown dùng tên database chung hoặc biến rỗng có thể xóa dữ liệu của build khác. Thiết kế tên tài nguyên cô lập ngay từ đầu và thử cleanup trên sandbox riêng trước khi chạy song song.
</Callout>

## Lab: đưa ba tầng test vào Pipeline

Lab này tạo một luồng có thể quan sát, không cần dữ liệu nhạy cảm. Bạn cần Jenkins LTS, JUnit Plugin, quyền tạo Pipeline job và một Linux agent theo giả định đầu bài. Nếu chưa có controller local, bắt đầu bằng [chạy Jenkins với Docker](/docs/installation/docker).

<Steps>
<Step>

### Bước 1: chuẩn bị dự án và agent

Trong repository, xác nhận `pom.xml` cấu hình Surefire sinh XML tại `target/surefire-reports/` và profile `integration` gọi Failsafe sinh XML tại `target/failsafe-reports/`. Thêm Playwright config để output JUnit đi tới `test-results/e2e-junit.xml`; chỉ dùng tài khoản sandbox và fixture tổng hợp.

Trên agent, kiểm tra toolchain thật sự có mặt. Không chạy browser workload trên controller.

```bash
java -version
mvn -version
node --version
npx playwright --version
```

</Step>
<Step>

### Bước 2: xác nhận command trên agent

Chạy từng lệnh trong workspace clone sạch của agent trước khi đưa vào Jenkins. Các đường dẫn XML phải tồn tại sau mỗi lệnh; nếu command thất bại, giữ log để sửa test trước, không thêm `|| true` để lách failure.

```bash
mvn -B -ntp test
find target/surefire-reports -name '*.xml' -print

mvn -B -ntp -Pintegration verify
find target/failsafe-reports -name '*.xml' -print

PLAYWRIGHT_JUNIT_OUTPUT_NAME=test-results/e2e-junit.xml \
  npx playwright test --project=chromium --grep @smoke --reporter=junit
test -f test-results/e2e-junit.xml
```

</Step>
<Step>

### Bước 3: thêm Jenkinsfile và tạo job

Lưu Jenkinsfile ở phần [Jenkinsfile mẫu](#jenkinsfile-mẫu-chạy-test-và-thu-thập-kết-quả), commit cùng cấu hình test rồi tạo **Pipeline script from SCM** trỏ đúng branch. Gán job tới agent có label `linux && test-tools`. Trigger một build và mở Console Output để xác nhận revision, command và agent đã chọn.

</Step>
<Step>

### Bước 4: đọc report và tạo một failure có chủ đích

Sau build xanh, mở trang build để xem kết quả JUnit của từng stage và tải XML/artifact E2E. Sau đó tạo một assertion unit chắc chắn thất bại, ví dụ đổi expected value của một test fixture không nhạy cảm. Commit, trigger lại và xác nhận:

1. `Unit test` thất bại do exit code của Maven.
2. XML Surefire vẫn hiện test thất bại trong Jenkins nhờ `post { always }`.
3. Các stage sau không chạy; build không được coi là đạt chỉ vì report đã publish.

Khôi phục assertion đúng trong commit tiếp theo. Không sửa Jenkinsfile bằng `|| true`, `catchError` hoặc retry để làm xanh lab.

</Step>
<Step>

### Bước 5: xử lý một dấu hiệu flaky

Chọn một test có failure không lặp lại, hoặc mô phỏng sandbox trả `429` trong môi trường lab. Tạo issue với build URL, commit, XML/log, test data ID và owner. Chạy lại **cùng commit** tối đa hai lần để thu thập evidence; không gộp kết quả để đổi build đỏ thành xanh. Nếu xác nhận flaky, tag test vào quarantine lane có ticket và ngày hết hạn, sau đó sửa nguyên nhân rồi đưa lại gate.

</Step>
</Steps>

### Kết quả mong đợi

- Unit, integration và E2E smoke có command riêng cùng XML JUnit đúng đường dẫn.
- Mỗi test failure giữ được console log và report để chẩn đoán.
- Artifact E2E chỉ chứa trace/screenshot sandbox đã được rà soát.
- Một failure có chủ đích làm build đỏ; publishing report không đổi trạng thái đó.
- Mọi quarantine đều có owner, bằng chứng và ngày xem xét lại.

## Bảng quyết định

| Tình huống | Quyết định | Lý do và hành động |
| --- | --- | --- |
| Logic thuần, chạy dưới vài giây | Unit test ở PR | Feedback nhanh nhất; mock dependency khi không phải đối tượng kiểm tra. |
| Mapping DB hoặc hợp đồng service có rủi ro | Integration test ở PR hoặc `main` | Chạy với dependency tạm, schema/tenant riêng; publish Failsafe XML. |
| Journey đăng nhập/thanh toán | E2E smoke ở `main`, bộ đầy đủ trước release/lịch | Giữ số lượng thấp; archive trace sandbox ngắn hạn. |
| XML JUnit không xuất hiện | Fail pipeline và sửa cấu hình | Không dùng `allowEmptyResults: true` để im lặng che report thiếu. |
| Hai E2E timeout khi chạy cùng lúc | Giảm concurrency hoặc cô lập agent/tài nguyên | Đo RAM/CPU, port và browser profile trước khi tăng executor. |
| Test đỏ rồi xanh trên cùng commit | Điều tra flaky, lưu evidence | Rerun tối đa hai lần để phân loại; không retry gate thành xanh. |
| Flaky đã xác nhận chặn luồng chính | Quarantine lane có hạn | Giữ test và report, ticket/owner/ngày hết hạn; ưu tiên sửa để trả lại gate. |
| Cần gọi hệ thống ngoài | Dùng sandbox allowlist hoặc fake | Không dùng credential/data production; timeout và cleanup theo build scope. |

## Checklist áp dụng

- [ ] Test pyramid phản ánh rủi ro và thời gian phản hồi của dự án, không chỉ số lượng test.
- [ ] Mỗi loại test có command, agent/toolchain, report path và owner được ghi rõ.
- [ ] JUnit Plugin và định dạng XML đã được kiểm tra trên Jenkins LTS đang dùng.
- [ ] Test command quyết định pass/fail; `junit` và `archiveArtifacts` chỉ publish bằng chứng.
- [ ] Unit test chạy trước các test đắt; integration/E2E chỉ song song khi có isolation và capacity đã đo.
- [ ] Database, namespace, port, user và fixture test được cô lập theo build.
- [ ] Secret dùng Jenkins Credentials quyền tối thiểu; report/artifact không chứa dữ liệu nhạy cảm.
- [ ] Cleanup chạy khi failure, xác minh scope trước khi xóa và có TTL cho tài nguyên bỏ lại.
- [ ] Flaky test có build evidence, ticket, owner, hạn xử lý và không dùng retry vô hạn.
- [ ] Quarantine vẫn chạy và publish kết quả; test chỉ rời quarantine sau khi có bằng chứng sửa lỗi.

## Nguồn Jenkins chính thức

- [Jenkins Pipeline](https://www.jenkins.io/doc/book/pipeline/) — khái niệm Pipeline, stage, agent và Jenkinsfile.
- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/) — cú pháp Declarative Pipeline, `post` và thực thi shell.
- [Testing and artifacts](https://www.jenkins.io/doc/pipeline/tour/tests-and-artifacts/) — publish JUnit result và archive artifact.
- [JUnit Plugin](https://plugins.jenkins.io/junit/) — step `junit`, kết quả test và yêu cầu plugin.
- [Pipeline: Basic Steps](https://plugins.jenkins.io/workflow-basic-steps/) — các step Pipeline cơ bản, gồm `retry`.
- [Using Jenkins agents](https://www.jenkins.io/doc/book/using/using-agents/) — chọn và vận hành agent cho workload build/test.
- [Pipeline syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — tra cứu `parallel`, `agent`, `environment` và `post`.

## Đọc tiếp

<Cards>
  <Card title="Tổng quan về Jenkins" href="/docs/getting-started/overview" description="Ôn lại vai trò controller, agent, Pipeline và credential." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu executor, queue và workspace trước khi tăng test song song." />
  <Card title="Yêu cầu hệ thống" href="/docs/getting-started/requirements" description="Chuẩn bị toolchain, capacity, storage và network cho agent." />
  <Card title="Nền tảng CI/CD" href="/docs/getting-started/ci-cd-fundamentals" description="Đặt test automation trong feedback loop và điều kiện phát hành." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Tạo Jenkins LTS local để thực hành Pipeline." />
</Cards>
