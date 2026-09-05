---
title: "Java Maven Pipeline"
description: "Case study xây dựng, kiểm thử, kiểm soát chất lượng và phát hành ứng dụng Java/Maven bằng Jenkins Declarative Pipeline."
---

<Callout type="info" title="Phạm vi và giả định">
  Case study dùng repository Java có Maven Wrapper, Jenkins LTS và agent Linux tách khỏi controller. Ví dụ giả định agent có JDK 21, Git và shell; Maven được Wrapper tải/xác minh theo cấu hình repository. Nếu dự án không commit Wrapper, agent phải được quản trị sẵn Maven đúng phiên bản đã phê duyệt. Các tên label, credential ID, URL repository và profile Maven chỉ là hợp đồng minh họa cần thay bằng cấu hình đã được review.
</Callout>

Một Pipeline Java đáng tin cậy không chỉ gọi `mvn package`. Nó biến cùng một revision thành chuỗi bằng chứng: source đã checkout, toolchain được xác định, dependency được resolve có kiểm soát, test có report, artifact có checksum/SBOM, rồi mới đi qua quality gate và phát hành. Jenkins điều phối các bước này; Maven và cấu hình trong repository mới quyết định cách ứng dụng được biên dịch, kiểm thử và đóng gói.

## Mục lục

- [Bối cảnh và mục tiêu](#bối-cảnh-và-mục-tiêu)
  - [Mục tiêu học tập](#mục-tiêu-học-tập)
- [Thiết kế luồng Maven có thể tái lập](#thiết-kế-luồng-maven-có-thể-tái-lập)
  - [Hợp đồng repository và toolchain](#hợp-đồng-repository-và-toolchain)
  - [Cache dependency và workspace](#cache-dependency-và-workspace)
  - [Test, package và bằng chứng](#test-package-và-bằng-chứng)
- [Jenkinsfile Declarative tham khảo](#jenkinsfile-declarative-tham-khảo)
  - [Plugin và cấu hình runtime cần có](#plugin-và-cấu-hình-runtime-cần-có)
  - [Đọc luồng thất bại](#đọc-luồng-thất-bại)
- [Cổng chất lượng, publish và release](#cổng-chất-lượng-publish-và-release)
  - [Quality và security gate](#quality-và-security-gate)
  - [Publish không lộ secret](#publish-không-lộ-secret)
  - [Promote và rollback](#promote-và-rollback)
- [Lab local có thể tái lập](#lab-local-có-thể-tái-lập)
  - [Chuẩn bị fixture an toàn](#chuẩn-bị-fixture-an-toàn)
  - [Chạy và kiểm tra tĩnh](#chạy-và-kiểm-tra-tĩnh)
  - [Bằng chứng mong đợi](#bằng-chứng-mong-đợi)
- [Khắc phục sự cố](#khắc-phục-sự-cố)
- [Checklist áp dụng](#checklist-áp-dụng)
- [Nguồn chính thức](#nguồn-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Bối cảnh và mục tiêu

Ứng dụng Java thường có nhiều loại kiểm thử và nhiều đầu ra: JAR/WAR, XML JUnit, checksum, SBOM và metadata release. Nếu từng máy phát triển dùng một JDK hoặc Maven khác nhau, một commit có thể xanh ở laptop nhưng đỏ trên agent. Case study này dùng Maven Wrapper và một agent có label `linux && java21` để biến các điều kiện đó thành một phần nhìn thấy được của Pipeline.

Luồng khuyến nghị là:

```text
Checkout revision
      │
      ▼
Xác nhận JDK và Maven Wrapper ──► resolve dependency qua mirror/cache được quản trị
      │
      ▼
./mvnw -B -ntp verify
      │                 │
      │                 └── Surefire/Failsafe XML được publish cả khi test đỏ
      ▼
Package JAR/WAR + checksum + SBOM
      │
      ▼
Quality/security gate ──► archive artifact của build
      │
      ▼
Publish version bất biến ──► promote ──► deploy ──► rollback artifact đã biết
```

### Mục tiêu học tập

Sau khi hoàn thành, người học có thể:

- mô tả hợp đồng giữa `pom.xml`, Maven Wrapper, JDK của agent và Jenkinsfile;
- chạy unit test bằng Surefire, integration test bằng Failsafe và đọc XML JUnit khi command Maven thất bại;
- phân biệt cache local của Maven, workspace tạm, Jenkins archive và Maven repository phát hành;
- đặt quality/security gate trước publish, giữ artifact có version bất biến, checksum và SBOM;
- dùng credential publish trong scope hẹp, không đưa token hay mật khẩu vào URL, log hoặc command argument;
- promote hoặc rollback bằng cùng một artifact đã kiểm chứng thay vì build lại từ source khác.

## Thiết kế luồng Maven có thể tái lập

### Hợp đồng repository và toolchain

Ưu tiên commit Maven Wrapper (`mvnw`, `mvnw.cmd`, `.mvn/wrapper/`) vào repository. Jenkins chạy `./mvnw`, vì vậy version Maven đến từ Wrapper thay vì từ một Maven ngầm định trên agent. Wrapper vẫn cần network hoặc mirror nội bộ trong lần tải distribution đầu tiên; pin URL distribution, checksum nếu cơ chế Wrapper/version đang dùng hỗ trợ, và review thay đổi trong `.mvn/wrapper/maven-wrapper.properties` như thay đổi toolchain.

Agent vẫn phải có **JDK tương thích**. Ví dụ dưới yêu cầu JDK 21 qua label; Maven Wrapper không cài JDK. Pin release Java, encoding và plugin version trong `pom.xml` hoặc parent BOM đã được pin. Dependency cũng phải có version bất biến qua `dependencyManagement`, BOM có version rõ ràng, hoặc dependency trực tiếp; không để version biến động theo repository metadata.

```xml
<properties>
  <maven.compiler.release>21</maven.compiler.release>
  <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  <maven-surefire-plugin.version>3.5.2</maven-surefire-plugin.version>
  <maven-failsafe-plugin.version>3.5.2</maven-failsafe-plugin.version>
</properties>

<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-compiler-plugin</artifactId>
      <version>3.13.0</version>
      <configuration><release>${maven.compiler.release}</release></configuration>
    </plugin>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>${maven-surefire-plugin.version}</version>
    </plugin>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-failsafe-plugin</artifactId>
      <version>${maven-failsafe-plugin.version}</version>
      <executions>
        <execution><goals><goal>integration-test</goal><goal>verify</goal></goals></execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

Đoạn XML là ví dụ cấu hình dự án, không phải cấu hình Jenkins runtime. Thêm plugin SBOM hoặc dependency scan vào `pom.xml` với version đã pin và goal/profile cụ thể của dự án. Không viết tọa độ plugin không có version vào Jenkinsfile rồi kỳ vọng Maven tự chọn bản phù hợp.

Nếu tổ chức chọn Maven cài trên agent thay vì Wrapper, cần quản trị Maven như một phần image/agent: pin version Maven, kiểm version bằng `mvn --version`, và cập nhật image qua review. Không trộn `mvn` ở máy này với `./mvnw` ở máy khác trong cùng đường phát hành; chọn một hợp đồng và ghi rõ nó.

<Callout type="warn" title="Pin không thay thế kiểm chứng runtime">
  `pom.xml` và Wrapper được pin giúp tái lập input, nhưng không chứng minh agent có JDK, CA, proxy, disk hay plugin Jenkins phù hợp. Xác minh các điều kiện đó trên lane sandbox trước khi coi Pipeline là sẵn sàng phát hành.
</Callout>

### Cache dependency và workspace

Maven local repository thường là `~/.m2/repository`. Nó giảm thời gian resolve, nhưng không phải nguồn sự thật của build: cache cũ, bị hỏng hoặc bị ghi đồng thời có thể làm kết quả khác clone sạch. Với agent ephemeral, dùng cache được cấp theo policy; với agent cố định, tách cache theo trust boundary và đặt quota/cleanup. Cache ghi chung giữa build PR không tin cậy và release là rủi ro cache poisoning.

| Nơi lưu | Mục đích đúng | Quy tắc vận hành |
| --- | --- | --- |
| Workspace Jenkins | checkout, `target/`, report tạm | Có thể mất hoặc tái sử dụng; không dùng để truyền release giữa build. |
| Maven local repository | cache dependency/plugin đã resolve | Key/cache nên gắn với OS, JDK, Wrapper và lock/pom; không archive toàn bộ cache. |
| Jenkins archive | JAR, report, SBOM của đúng build | Giữ ngắn hạn theo retention để điều tra và truy vết. |
| Maven artifact repository | package version bất biến để consumer/release dùng | Là nguồn phân phối; áp checksum, quyền, audit và lifecycle riêng. |

Để giảm va chạm, Pipeline mẫu đặt `-Dmaven.repo.local="$WORKSPACE/.m2/repository"`. Điều này cô lập cache theo workspace, đổi lại mất cache khi workspace bị dọn. Nếu dùng volume cache chung để nhanh hơn, chỉ cho phép một writer hoặc cơ chế cache của nền tảng có ownership rõ ràng; không xóa thư mục cache chung trong `post`.

Song song hóa chỉ sau khi đo capacity. Unit test, integration test và scan có thể tách branch khi mỗi branch có agent/workspace, report path, port, database/schema và cache policy riêng. Hai branch cùng chạy `verify` trong một `target/` hoặc cùng dùng database test sẽ tạo kết quả không xác định. Xem [chạy song song có kiểm soát](/docs/pipelines/parallel) trước khi tăng executor.

### Test, package và bằng chứng

Quy ước Maven thường dùng:

- **Surefire** chạy unit test trong phase `test` và viết XML vào `target/surefire-reports/`.
- **Failsafe** chạy integration test ở `integration-test`, đánh giá kết quả ở `verify`, và viết XML vào `target/failsafe-reports/`. Đừng đổi integration test sang Surefire chỉ để nó chạy sớm; Failsafe cho phép teardown sau test lỗi.
- `./mvnw -B -ntp verify` là command CI chính. `-B` dùng batch mode; `-ntp` giảm log tiến trình tải. Exit code của Maven là tín hiệu pass/fail, còn XML JUnit là bằng chứng để điều tra.
- `package` tạo JAR/WAR theo packaging của dự án. `verify` đã đi qua package trong lifecycle mặc định, nên chỉ archive output sau khi `verify` và các gate bắt buộc đạt.

Report luôn được publish trong `post { always { ... } }`, vì Surefire/Failsafe thường vẫn ghi XML khi assertion fail. Nếu build chết trước khi Maven tạo report, `junit allowEmptyResults: false` phải khiến điều đó lộ rõ thay vì báo xanh giả. Report không chạy lại test và không được phép che exit code thất bại. Hướng dẫn sâu hơn về chiến lược test nằm ở [Tự động hóa kiểm thử](/docs/delivery/test-automation).

## Jenkinsfile Declarative tham khảo

Jenkinsfile sau đủ nhỏ để review nhưng thể hiện checkout, `./mvnw -B verify`, report Surefire/Failsafe, quality/security gate, archive và publish có điều kiện. Branch `main` ở `when` chỉ có ý nghĩa trong Multibranch Pipeline; với job branch cố định, thay điều kiện bằng policy job đã được review.

```groovy
pipeline {
  agent { label 'linux && java21' }

  options {
    skipDefaultCheckout(true)
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(
      daysToKeepStr: '30', numToKeepStr: '30',
      artifactDaysToKeepStr: '14', artifactNumToKeepStr: '10'
    ))
  }

  environment {
    MAVEN_OPTS = '-Djava.awt.headless=true'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Toolchain') {
      steps {
        sh '''#!/usr/bin/env sh
          set -eu
          test -x ./mvnw
          java -version
          ./mvnw --version
        '''
      }
    }

    stage('Verify') {
      steps {
        sh '''#!/usr/bin/env sh
          set -eu
          ./mvnw -B -ntp -Dmaven.repo.local="$WORKSPACE/.m2/repository" verify
        '''
      }
      post {
        always {
          junit allowEmptyResults: false,
            testResults: 'target/surefire-reports/*.xml,target/failsafe-reports/*.xml'
          archiveArtifacts allowEmptyArchive: true,
            artifacts: 'target/surefire-reports/**,target/failsafe-reports/**'
        }
      }
    }

    stage('Quality and SBOM') {
      steps {
        sh '''#!/usr/bin/env sh
          set -eu
          # Profile security và plugin SBOM đã được pin trong pom.xml.
          ./mvnw -B -ntp -Dmaven.repo.local="$WORKSPACE/.m2/repository" -Psecurity verify
          test -f target/bom.json
        '''
      }
    }

    stage('Archive release evidence') {
      steps {
        sh '''#!/usr/bin/env sh
          set -eu
          sha256sum target/*.jar > target/SHA256SUMS
        '''
        archiveArtifacts artifacts: 'target/*.jar,target/SHA256SUMS,target/bom.json',
          allowEmptyArchive: false, fingerprint: true
      }
    }

    stage('Publish immutable version') {
      when {
        beforeAgent true
        branch 'main'
      }
      steps {
        withCredentials([file(credentialsId: 'maven-release-settings', variable: 'MAVEN_SETTINGS')]) {
          sh '''#!/usr/bin/env sh
            set -eu
            set +x
            # settings.xml chỉ được đọc trong scope này; không archive hay in nó.
            ./mvnw -B -ntp -s "$MAVEN_SETTINGS" deploy
          '''
        }
      }
    }
  }

  post {
    failure {
      echo 'Giữ Console Output, JUnit report, SBOM và checksum để điều tra trước khi chạy lại.'
    }
    always {
      deleteDir()
    }
  }
}
```

### Plugin và cấu hình runtime cần có

Ví dụ là **mẫu Pipeline**, không tự cài bất kỳ plugin nào. Trước khi chạy, xác nhận trên controller sandbox:

| Thành phần | Vai trò | Kiểm tra cần làm |
| --- | --- | --- |
| Pipeline: Declarative và Pipeline cơ bản | parse `pipeline {}`, `checkout`, `archiveArtifacts`, `withCredentials`, `deleteDir` | Kiểm version tương thích Jenkins LTS và tra snippet trong Pipeline Syntax. |
| JUnit Plugin | step `junit` đọc XML Surefire/Failsafe | Xác nhận format XML và glob report của dự án. |
| Credentials Binding | file binding `maven-release-settings` | Credential phải là file settings sandbox/release với scope Folder/job hẹp. |
| Agent `linux && java21` | shell, Git, JDK 21, capacity và network | Đối chiếu `java -version`, Wrapper version, disk, CA/proxy và executor. |
| Maven repository/mirror | resolve dependency và đích `distributionManagement` | Kiểm TLS/CA, quyền repository và policy version bất biến. |

Profile `security` là hợp đồng của dự án, chẳng hạn gọi scanner dependency và plugin CycloneDX đã pin để tạo `target/bom.json`. Nó không phải profile mặc định của Maven. Cũng vậy, `distributionManagement` trong `pom.xml`, server ID trong settings và quyền upload là cấu hình runtime cần tồn tại trước publish. Nếu các plugin/profile này chưa được cài đặt trong repository, giữ stage ở trạng thái chưa triển khai thay vì thêm command “thử xem có chạy không”.

Không truyền token vào `mvn deploy` qua `-Dtoken=...`, URL hoặc Groovy interpolation. File settings được bind trong closure ngắn; shell chỉ nhận path file qua biến môi trường. Không dùng `set -x`, không `cat` file, không archive `settings.xml`, `.m2/settings.xml` hay toàn bộ workspace. Tham khảo [Credentials trong Pipeline](/docs/pipelines/credentials) để chọn scope và xử lý sự cố credential.

### Đọc luồng thất bại

- `Verify` đỏ do test assertion: Jenkins vẫn chạy `post { always }`, vì vậy trang build có XML JUnit từ Surefire/Failsafe. Sửa test hoặc code từ failure đầu tiên, không thêm `|| true`.
- `Verify` đỏ trước khi report tồn tại: `junit` cũng báo thiếu report. Đây là dấu hiệu kiểm tra POM, JDK, dependency hoặc đường dẫn report; không chuyển `allowEmptyResults` thành `true` cho gate bắt buộc.
- `Quality and SBOM` đỏ: không archive/publish release. Lưu console, report scan đã redaction và SBOM nếu scanner tạo được; phân loại policy fail, CVE, license hoặc lỗi tool trước khi quyết định ngoại lệ có hạn.
- `Publish immutable version` đỏ sau timeout: không chạy lại mù quáng. Kiểm metadata repository bằng API/client đã được phê duyệt và đối chiếu SHA-256 của version đích. Chỉ retry nếu repository bảo đảm thao tác idempotent và xác nhận bytes giống nhau.

`deleteDir()` chạy sau khi Jenkins đã publish report/archive. Nó chỉ phù hợp cho workspace của build; không thay bằng lệnh xóa path tự chọn và không dùng nó để dọn Maven cache dùng chung.

## Cổng chất lượng, publish và release

### Quality và security gate

Quality gate là policy có điều kiện rõ, không phải chỉ tên stage. Với Java/Maven, điều kiện tối thiểu thường gồm `verify` thành công, report bắt buộc tồn tại, quality/coverage đạt ngưỡng đã công bố, dependency scan không có finding vượt ngưỡng và SBOM được tạo. Scan dependency phải dùng database/feed đã được quản trị, update có kiểm soát và policy có owner; một command scan xanh không bảo đảm không còn mọi lỗ hổng.

Dùng version dependency/plugin đã pin và kiểm tra dependency tree khi điều tra thay đổi transitive:

```bash
./mvnw -B -ntp dependency:tree
./mvnw -B -ntp help:effective-pom
```

Hai lệnh trên chỉ đọc/resolve dự án hiện tại, nhưng vẫn có thể cần network nếu cache/mirror chưa có artifact. Chạy chúng trên fixture hoặc branch sandbox; không coi static review, linter Jenkinsfile hay XML hợp lệ là thay thế cho build runtime. Kiểm thử Jenkinsfile và giới hạn của linter được giải thích tại [Kiểm thử Jenkinsfile](/docs/pipelines/testing).

### Publish không lộ secret

Chỉ publish sau quality gate và chỉ từ revision/branch được bảo vệ. Maven coordinate phải là version bất biến, ví dụ release `1.4.0`; không ghi đè một release đã phát hành. Snapshot, nếu tổ chức dùng, cần repository và retention riêng vì nó không là bằng chứng release cuối cùng.

Artifact cần đi cùng JAR/WAR, SHA-256, SBOM và metadata revision/toolchain. `archiveArtifacts` là bản lưu theo build để điều tra; Maven repository là nơi consumer resolve package. Đặt retention ngắn cho archive CI, còn package release theo policy repository/compliance. Xem [Build Artifacts](/docs/jobs/artifacts) để phân biệt workspace, archive, fingerprint và repository ngoài.

Trước upload, cấp tài khoản publish quyền ghi đúng namespace; không cấp xóa hoặc quản trị repository nếu không cần. Sau upload, dùng client/API đã phê duyệt để xác nhận coordinate, size và SHA-256. Console log chỉ ghi version, repository path, status và checksum; không ghi response có thể chứa token hoặc data nhạy cảm.

### Promote và rollback

**Promote** chuyển chính JAR/WAR đã qua gate từ repository/lane staging sang repository/lane release, hoặc gắn trạng thái release theo khả năng của artifact repository. Không build lại từ một checkout mới để promote, vì byte output có thể khác. Gate promote cần xác minh checksum, SBOM, revision, approval và quyền môi trường.

**Rollback** là chọn lại artifact version đã biết tốt, xác minh checksum rồi deploy theo runbook môi trường. Việc rollback ứng dụng không tự đảo migration database, message hoặc thay đổi schema; chúng cần chiến lược tương thích tiến/lùi và backup riêng. Ghi version, build URL, checksum, thời điểm, người duyệt và trạng thái sau rollback để truy vết. Quy trình rộng hơn nằm tại [Rollback](/docs/delivery/rollback) và [Environment promotion](/docs/delivery/environment-promotion).

## Lab local có thể tái lập

Lab này dùng fixture Java/Maven tối thiểu trong repository sandbox của bạn. Nó không publish artifact thật, không cần credential và không gọi môi trường production. Lệnh Maven có thể tải distribution/dependency từ mirror đã cấu hình; cần network, CA/proxy và JDK phù hợp. Nếu muốn chạy Jenkins, cần controller sandbox, agent Linux `java21`, Pipeline: Declarative và JUnit Plugin; static checks dưới đây không chứng minh Jenkins, plugin hoặc agent runtime hoạt động.

### Chuẩn bị fixture an toàn

Tạo một repository lab riêng chứa Maven Wrapper, `pom.xml`, một class Java đơn giản và một unit test JUnit. Cấu hình Surefire; chỉ thêm Failsafe khi có integration test sandbox. Fixture nên tạo JAR thường, không có `distributionManagement`, settings, token, URL production hay script deploy.

Cấu trúc cần tối thiểu:

```text
java-maven-ci-lab/
├── .mvn/wrapper/
├── mvnw
├── pom.xml
├── src/main/java/example/App.java
└── src/test/java/example/AppTest.java
```

Nếu fixture chưa có Wrapper và máy local có Maven đã pin, tạo Wrapper một lần theo tài liệu Maven, review các file sinh ra, rồi commit chúng. Sau đó các bước CI dùng `./mvnw`; không thay bằng Maven ngầm định của máy người chạy. Trên Windows dùng `mvnw.cmd` tương ứng, còn Jenkinsfile này dành cho agent Linux.

### Chạy và kiểm tra tĩnh

Trong clone sạch của fixture, chạy các lệnh sau. Chúng không xóa file, không upload artifact và không đọc secret.

```bash
set -eu
./mvnw --version
java -version
./mvnw -B -ntp verify
find target/surefire-reports -name '*.xml' -type f -print
find target -maxdepth 1 -name '*.jar' -type f -print
```

Nếu fixture có Failsafe/profile integration dùng dependency sandbox đã chuẩn bị, chạy thêm và xác nhận report riêng:

```bash
set -eu
./mvnw -B -ntp -Pintegration verify
find target/failsafe-reports -name '*.xml' -type f -print
```

Để kiểm tra Jenkinsfile trước khi tạo job, lưu bản mẫu vào fixture rồi review cấu trúc, đường dẫn report và glob archive. Declarative linter chỉ chạy được khi controller sandbox có plugin phù hợp, quyền/CLI đã provision và endpoint được bảo vệ; nếu không có các điều kiện đó, ghi là **chưa chạy runtime**. Không tắt TLS, CSRF hoặc dùng token trên command line để làm linter hoạt động.

Sau khi lệnh local xanh, tạo Pipeline **script from SCM** trỏ tới branch lab, gán agent có label `linux && java21`, rồi chạy một build. Không tạo credential `maven-release-settings` cho lab: stage publish chỉ là policy minh họa và phải bị bỏ qua hoặc thay bằng stage không publish. Không dùng lab để thử upload vào repository tổ chức.

### Bằng chứng mong đợi

- `./mvnw --version` hiển thị JDK và Maven Wrapper đúng version đã pin; `verify` trả mã `0`.
- Có ít nhất một XML trong `target/surefire-reports/`; nếu đã bật integration, có XML trong `target/failsafe-reports/`.
- `target/` có package JAR/WAR phù hợp packaging, và Jenkins build có JUnit report, checksum, SBOM cùng artifact archive khi đã cấu hình profile security.
- Một assertion unit cố ý sai làm `Verify` thất bại nhưng XML Surefire vẫn được publish. Khôi phục assertion trong commit tiếp theo; không dùng retry hoặc `catchError` để biến failure thành xanh.
- Nếu Jenkins sandbox không có agent/plugin/JDK/Maven Wrapper runtime phù hợp, bằng chứng đúng là queue/lỗi có nguyên nhân rõ; không phải thay label thành `agent any` hay bỏ gate.

## Khắc phục sự cố

| Dấu hiệu | Nguyên nhân thường gặp | Hành động có bằng chứng |
| --- | --- | --- |
| `release version ... not supported` hoặc lỗi class bytecode | JDK agent không khớp `maven.compiler.release`, `JAVA_HOME` sai, toolchain Maven chưa cấu hình | Lưu `java -version`, `./mvnw --version`, effective POM; sửa image/label hoặc POM có chủ đích, không hạ Java ngầm định. |
| Không resolve được dependency hoặc plugin | Mirror thiếu artifact, version/plugin chưa pin, cache hỏng, repository trả `401`/`404` | Đọc tọa độ lỗi đầu tiên, `dependency:tree`, mirror URL và audit repository; không xóa cache dùng chung hoặc đổi version mơ hồ. |
| `PKIX`, timeout hoặc `407 Proxy Authentication Required` | CA agent, DNS, proxy `settings.xml`, egress hoặc repository outage | Xác minh hostname, CA, proxy/mirror và thời điểm trên agent; secret proxy phải ở binding/settings được quản lý, không in cấu hình nhạy cảm hay tắt TLS. |
| Jenkins không thấy JUnit report | Sai glob, Surefire/Failsafe không chạy, build hỏng trước test, workspace khác | So khớp `find target/...` trong đúng workspace với cấu hình `junit`; giữ `allowEmptyResults: false` cho test bắt buộc. |
| Test integration flaky khi song song | Cùng port, schema, fixture, cache hoặc agent thiếu CPU/RAM | Tách namespace/port theo build, đặt timeout và đo capacity; lưu XML/log/revision trước khi quarantine có hạn. |
| `401`/`403` khi deploy | Sai server ID, credential scope/expiry, quyền namespace hoặc policy release bất biến | Kiểm credential ID, scope Folder/job, server ID và audit repository; không echo settings/token hoặc đưa password vào `-D`/URL. |
| Publish timeout rồi không rõ đã thành công | Client không nhận response, nhưng repository có thể đã nhận bytes | Query metadata bằng client đã phê duyệt, đối chiếu coordinate và SHA-256; chỉ retry khi idempotency được xác nhận. |

## Checklist áp dụng

- [ ] Repository commit Maven Wrapper; JDK, Maven distribution, compiler release, plugin và dependency quan trọng đều có version đã review.
- [ ] Agent label mô tả OS, JDK, trust boundary và capacity; controller không chạy workload Maven.
- [ ] `./mvnw -B -ntp verify` là gate CI; Surefire/Failsafe XML được publish trong `post { always }` mà không che exit code Maven.
- [ ] Cache Maven có ownership, quota, trust boundary và policy concurrency; workspace không được dùng làm artifact store.
- [ ] Unit/integration test có report path, dữ liệu/port/schema cô lập và bằng chứng để điều tra failure/flaky test.
- [ ] Quality/coverage, dependency scan và SBOM có ngưỡng, owner, plugin/profile pin; scan pass không bị diễn giải quá mức.
- [ ] Artifact gồm package, SHA-256 và SBOM, archive pattern hẹp, fingerprint/retention phù hợp; archive không chứa settings hay secret.
- [ ] Publish chỉ từ branch tin cậy sau gate, dùng version bất biến và credential quyền tối thiểu trong scope ngắn; token không xuất hiện trong argv, URL, log hay artifact.
- [ ] Promote và rollback dùng artifact có checksum/revision đã biết; database và thay đổi không đảo ngược có runbook riêng.
- [ ] Declarative linter và Jenkins runtime đã được xác minh trên controller sandbox, hoặc trạng thái chưa chạy được được ghi rõ.

## Nguồn chính thức

- [Maven Wrapper](https://maven.apache.org/wrapper/) — quản lý Maven Wrapper trong repository.
- [Maven Build Lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) — phase `test`, `package`, `integration-test` và `verify`.
- [Maven Surefire Plugin](https://maven.apache.org/surefire/maven-surefire-plugin/) — unit test và report Surefire.
- [Maven Failsafe Plugin](https://maven.apache.org/surefire/maven-failsafe-plugin/) — integration test và phase `verify`.
- [Maven Settings Reference](https://maven.apache.org/settings.html) — mirror, proxy, server và settings Maven.
- [Jenkins Pipeline](https://www.jenkins.io/doc/book/pipeline/) — Jenkinsfile, stage, agent và Pipeline as Code.
- [Jenkins Testing and Artifacts](https://www.jenkins.io/doc/pipeline/tour/tests-and-artifacts/) — publish JUnit và archive artifact.
- [JUnit Plugin](https://plugins.jenkins.io/junit/) — step `junit` và hiển thị test result.
- [Credentials Binding Plugin](https://plugins.jenkins.io/credentials-binding/) — binding credential theo scope Pipeline.

## Đọc tiếp

<Cards>
  <Card title="Maven và Gradle" href="/docs/integrations/maven-gradle" description="So sánh cách chuẩn bị toolchain, cache, report và artifact cho JVM build." />
  <Card title="Tự động hóa kiểm thử" href="/docs/delivery/test-automation" description="Thiết kế unit, integration và E2E test có report và bằng chứng failure." />
  <Card title="Build Artifacts" href="/docs/jobs/artifacts" description="Quản lý archive, checksum, SBOM, fingerprint và retention." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Giữ credential Maven/repository ngoài Jenkinsfile và command line." />
  <Card title="Quality Gates" href="/docs/delivery/quality-gates" description="Đặt policy chất lượng, security và approval trước khi phát hành." />
  <Card title="Rollback" href="/docs/delivery/rollback" description="Quay lại artifact đã biết tốt cùng runbook và bằng chứng." />
</Cards>
