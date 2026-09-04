---
title: "Phát triển Jenkins Plugin"
description: "Thiết kế, kiểm thử và phát hành Jenkins plugin an toàn, từ Maven skeleton đến compatibility review."
---

Jenkins plugin là mã Java chạy cùng Jenkins và mở rộng controller, Pipeline hoặc giao diện. Vì plugin có thể chạm đến cấu hình, dữ liệu build và ranh giới controller–agent, một plugin hữu ích phải đồng thời có API ổn định, test tái lập và thiết kế giảm đặc quyền.

<Callout type="warn" title="Giả định và phạm vi">
  Trang này dành cho maintainer phát triển plugin riêng. Lab dùng một baseline đã pin: Java 17, Apache Maven 3.9.6, Maven Archetype Plugin 3.3.1, `empty-plugin` 1.37, Jenkins Plugin Parent 6.2138.v03274d462c13, Jenkins core 2.528.3 và BOM 2.528.x 6237.v4da_61a_4a_19e5. Đây là tổ hợp minh họa đã đối chiếu artifact nguồn, không phải lời hứa hỗ trợ mọi Jenkins LTS. Thử nghiệm trên controller local hoặc staging cô lập; không dùng lab để cài artifact chưa review, gọi production, hoặc đưa secret vào source, fixture hay log.
</Callout>

## Mục lục

- [Mô hình plugin và các giả định tương thích](#mô-hình-plugin-và-các-giả-định-tương-thích)
  - [Kiến trúc và vòng đời](#kiến-trúc-và-vòng-đời)
  - [Core, plugin và API compatibility](#core-plugin-và-api-compatibility)
- [Tạo skeleton Maven có kiểm soát](#tạo-skeleton-maven-có-kiểm-soát)
  - [Cấu trúc source, test và release](#cấu-trúc-source-test-và-release)
  - [Maven HPI, plugin parent và BOM](#maven-hpi-plugin-parent-và-bom)
- [Mở rộng Jenkins đúng extension point](#mở-rộng-jenkins-đúng-extension-point)
  - [Descriptor, databinding và cấu hình](#descriptor-databinding-và-cấu-hình)
  - [Stapler, Jelly và UI](#stapler-jelly-và-ui)
  - [Pipeline step và vòng đời thực thi](#pipeline-step-và-vòng-đời-thực-thi)
- [Thiết kế bảo mật từ đầu](#thiết-kế-bảo-mật-từ-đầu)
  - [Quyền, CSRF và đầu vào HTTP](#quyền-csrf-và-đầu-vào-http)
  - [XSS, path và command injection](#xss-path-và-command-injection)
  - [Credentials, secret và log](#credentials-secret-và-log)
  - [Controller, agent, Remoting và sandbox](#controller-agent-remoting-và-sandbox)
- [Chiến lược kiểm thử và compatibility](#chiến-lược-kiểm-thử-và-compatibility)
  - [Tầng test và Jenkins Test Harness](#tầng-test-và-jenkins-test-harness)
  - [UI, integration và Plugin Compatibility Tester](#ui-integration-và-plugin-compatibility-tester)
- [Build, kiểm tra và phát hành](#build-kiểm-tra-và-phát-hành)
  - [Luồng build–test–release](#luồng-buildtestrelease)
  - [Supply chain và review phát hành](#supply-chain-và-review-phát-hành)
- [Lab local: compile và test plugin mẫu](#lab-local-compile-và-test-plugin-mẫu)
  - [Điều kiện trước khi chạy](#điều-kiện-trước-khi-chạy)
  - [Tạo, kiểm tra và dọn dẹp](#tạo-kiểm-tra-và-dọn-dẹp)
  - [Kết quả mong đợi](#kết-quả-mong-đợi)
- [Troubleshooting](#troubleshooting)
- [Checklist trước release](#checklist-trước-release)
- [Đọc tiếp](#đọc-tiếp)
- [Nguồn Jenkins chính thức](#nguồn-jenkins-chính-thức)

## Mô hình plugin và các giả định tương thích

Plugin đóng gói thành `.hpi` (hoặc `.jpi` khi đã cài) và được Jenkins nạp vào controller. Nó có thể đăng ký một **extension point**: một điểm móc do Jenkins core hoặc plugin khác định nghĩa. Ví dụ, `Builder` thêm build step kiểu Freestyle, `Step` thêm Pipeline step, còn `RootAction` thêm endpoint/UI. Core tìm các lớp được đánh dấu `@Extension`, tạo chúng và gọi chúng trong vòng đời phù hợp.

Plugin không nên là nơi đặt logic nghiệp vụ độc lập duy nhất. Tách validation, xử lý dữ liệu và adapter Jenkins thành các lớp nhỏ để unit test không cần khởi động Jenkins. Phần adapter chỉ làm ba việc: nhận input đã có schema, kiểm tra quyền/ngữ cảnh, rồi gọi service có giới hạn capability.

### Kiến trúc và vòng đời

```text
Source / test / POM
        │  Maven đóng gói HPI
        ▼
Jenkins controller ── nạp plugin ──► extension registry
        │                                  │
        │                           Descriptor / UI / Step
        │                                  │
        ▼                                  ▼
config.xml, request, Pipeline ──► validation + permission check
                                           │
                                           ▼
                               API Jenkins hoặc Remoting đã giới hạn
                                           │
                                           ▼
                                  agent thực thi workload (nếu cần)
```

Lúc khởi động, Jenkins đọc metadata và dependency plugin, nạp classloader, rồi phát hiện extension. `Plugin#start()` chỉ nên thực hiện khởi tạo nhỏ, có thể đảo ngược; không chạy migration lớn, I/O mạng không giới hạn hay workload build trong lúc boot. Nếu cần tài nguyên nền, phải có shutdown rõ ràng và giới hạn retry để không kéo chậm controller.

Khi người dùng lưu cấu hình, Stapler chuyển request vào `Descriptor` hoặc handler, Jenkins databind dữ liệu rồi gọi validation. Khi build/Pipeline chạy, extension tạo execution và, nếu cần, gửi một tác vụ đã định nghĩa sang agent qua Remoting. Khi plugin bị disable hoặc Jenkins dừng, code phải giải phóng thread, listener và resource của mình. Việc controller có thể restart, agent có thể mất kết nối và build có thể bị hủy là các trạng thái bình thường cần được test.

### Core, plugin và API compatibility

**Jenkins core compatibility** là core tối thiểu mà plugin khai báo và đã test. Nó phụ thuộc cả Java runtime của core. **Plugin compatibility** là tập version của dependency plugin mà plugin của bạn hỗ trợ. **API compatibility** là cam kết chỉ gọi API public/được hỗ trợ, không dựa vào class nội bộ, reflection hoặc hành vi UI ngầm định.

Ghi rõ giả định cho mỗi release, ví dụ: Jenkins LTS/core tối thiểu, Java tối thiểu, plugin dependency trực tiếp và Pipeline plugin cần có. Khóa tập version đó trong POM và trong ma trận CI. Không suy ra rằng plugin mới nhất chạy được trên mọi LTS, hoặc core mới nhất giữ nguyên mọi API. Khi thay core hay một dependency chung, đọc release notes, kiểm tra `requiredCore` và chạy test trên đúng tổ hợp trước khi publish.

Baseline tái lập của bài này là **Java 17 + Apache Maven 3.9.6 + Maven Archetype Plugin 3.3.1 + `io.jenkins.archetypes:empty-plugin:1.37` + Plugin Parent `6.2138.v03274d462c13` + Jenkins core `2.528.3` + `bom-2.528.x:6237.v4da_61a_4a_19e5`**. Parent đã pin yêu cầu Maven tối thiểu 3.9.6 và compile release 17; core 2.528.3 thuộc dòng hỗ trợ Java 17 hoặc 21. HPI Maven Plugin `3.1802.v14f4709445a_b_` được parent này quản lý. Giữ nguyên cả tập, kể cả BOM, khi chạy lab. Khi nâng bất kỳ phần nào, lập một matrix mới thay vì trộn version.

Bảng sau giúp biến giả định thành evidence thay vì lời hứa:

| Bề mặt | Câu hỏi phải trả lời | Evidence trước release |
| --- | --- | --- |
| Jenkins core và Java | Core/JDK đích có thỏa điều kiện của plugin và dependency không? | POM đã review, CI chạy với core/JDK đã pin. |
| Plugin dependency | Version nào được compile và test; version nào bị loại? | BOM/dependency tree, test matrix, release note. |
| Cấu hình đã lưu | Field đổi tên/xóa có làm mất config cũ không? | Fixture config cũ, test restart/upgrade. |
| Pipeline | Tên step, symbol, parameter và serialisation có còn tương thích không? | Jenkinsfile smoke test, test resume/restart khi phù hợp. |
| Agent | Plugin có đòi hỏi tool, OS, Remoting hoặc quyền agent riêng không? | Agent sandbox và failure mode đã test. |

Đặt compatibility trong release note bằng câu cụ thể, chẳng hạn “đã test với Jenkins LTS X và Java Y”, thay vì “hỗ trợ Jenkins hiện hành”. Kế hoạch nâng cấp controller nằm ở [hướng dẫn nâng cấp](/docs/installation/upgrade); inventory và rollout dependency nằm ở [quản lý plugins](/docs/administration/plugin-management).

## Tạo skeleton Maven có kiểm soát

Archetype Jenkins tạo bố cục khởi đầu, nhưng output vẫn là source code cần review. Tạo repository mới, đặt `groupId`, `artifactId`, `displayName`, license và SCM URL theo chuẩn tổ chức; không copy `target/`, `.hpi`, token, file `JENKINS_HOME` hay config từ controller thật vào repository.

```bash
# Chạy trong thư mục lab trống. Tất cả version của lệnh này đã pin.
mvn -B org.apache.maven.plugins:maven-archetype-plugin:3.3.1:generate \
  -DarchetypeGroupId=io.jenkins.archetypes \
  -DarchetypeArtifactId=empty-plugin \
  -DarchetypeVersion=1.37 \
  -DgroupId=io.example.jenkins \
  -DartifactId=safe-greeting \
  -Dversion=0.1.0-SNAPSHOT \
  -Dpackage=io.example.jenkins.greeting \
  -DhostOnJenkinsGitHub=false \
  -DinteractiveMode=false
```

Lệnh dùng Maven Archetype Plugin 3.3.1 và `empty-plugin` 1.37 từ Maven Central. Archetype 1.37 sinh Plugin Parent `6.2138.v03274d462c13`, Jenkins baseline `2.528`/core `2.528.3` và BOM `bom-2.528.x:6237.v4da_61a_4a_19e5`; POM hoàn chỉnh ở phần kế tiếp cố ý ghi lại cùng tập này. Review source và metadata dự án sinh ra trước release, nhưng không sửa version set trong lúc chạy lab. Nếu môi trường dùng mirror, dùng mirror đã phê duyệt và có khả năng truy vết artifact, không tắt TLS hay thêm repository tùy tiện.

### Cấu trúc source, test và release

```text
safe-greeting/
├── pom.xml                         # parent, BOM, core/JDK và plugin metadata
├── src/main/java/                  # extension, descriptor, service thuần Java
├── src/main/resources/
│   └── io/example/.../             # Jelly/help files cạnh lớp liên quan
├── src/test/java/                  # unit test và JenkinsRule test
├── src/test/resources/             # fixture config nhỏ, đã loại secret
├── docs/                           # changelog, threat model, release note nếu đội dùng
└── target/                         # output cục bộ; không commit
```

Giữ test fixture nhỏ và tổng hợp. Một `config.xml` fixture phải chứa ID giả như `test-credential-id`, không có `credentials.xml`, private key, cookie, URL nội bộ hay output build. Chỉ publish source, test, thông tin license và metadata release cần thiết; `.hpi`/SBOM được CI lưu theo retention policy, không được xem như config backup.

### Maven HPI, plugin parent và BOM

Maven HPI Plugin là phần Maven đóng gói metadata và classes thành HPI, đồng thời tích hợp chạy/test plugin. Jenkins Plugin Parent POM cung cấp convention, plugin management và cấu hình test phổ biến. **BOM** (Bill of Materials) là danh sách version tương thích được import vào `dependencyManagement`; nó giúp những dependency Jenkins không trôi version độc lập.

POM hoàn chỉnh sau là baseline chạy được cho lab. Nó dùng đúng version do archetype 1.37 sinh ra, đồng thời pin rõ Java/Maven release cho người đọc kiểm tra. Đừng thay từng version riêng lẻ; nâng version là một thay đổi compatibility phải có matrix và review mới.

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.jenkins-ci.plugins</groupId>
    <artifactId>plugin</artifactId>
    <version>6.2138.v03274d462c13</version>
    <relativePath />
  </parent>

  <groupId>io.example.jenkins</groupId>
  <artifactId>safe-greeting</artifactId>
  <version>0.1.0-SNAPSHOT</version>
  <packaging>hpi</packaging>
  <name>Safe Greeting Plugin</name>

  <properties>
    <jenkins.baseline>2.528</jenkins.baseline>
    <jenkins.version>2.528.3</jenkins.version>
    <maven.compiler.release>17</maven.compiler.release>
  </properties>

  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>io.jenkins.tools.bom</groupId>
        <artifactId>bom-2.528.x</artifactId>
        <version>6237.v4da_61a_4a_19e5</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>

  <repositories>
    <repository>
      <id>repo.jenkins-ci.org</id>
      <url>https://repo.jenkins-ci.org/public/</url>
    </repository>
  </repositories>
  <pluginRepositories>
    <pluginRepository>
      <id>repo.jenkins-ci.org</id>
      <url>https://repo.jenkins-ci.org/public/</url>
    </pluginRepository>
  </pluginRepositories>

  <dependencies>
    <dependency>
      <groupId>org.jenkins-ci.main</groupId>
      <artifactId>jenkins-core</artifactId>
      <scope>provided</scope>
    </dependency>
  </dependencies>
</project>
```

Không tự thêm cả BOM lẫn version rời cho cùng dependency trừ khi có lý do đã review. Plugin parent/BOM có thể thay đổi theo Jenkins line; lấy mẫu POM hiện hành từ tài liệu phát triển Jenkins rồi điều chỉnh theo baseline của tổ chức. `provided` biểu thị core cung cấp API lúc runtime; nó không cho phép gọi API mới hơn core tối thiểu. Chạy `mvn -B -ntp dependency:tree` trong CI và review thay đổi graph như thay đổi code.

## Mở rộng Jenkins đúng extension point

Chọn extension point hẹp nhất mô tả đúng hành vi. Một `Builder` hợp với Freestyle build step; `Publisher` xử lý sau build; `SCMSource` là tích hợp source; `GlobalConfiguration` phục vụ cấu hình toàn cục; `Step` cung cấp DSL Pipeline. Đừng dùng `RootAction` hoặc endpoint tùy ý khi extension point sẵn có đã cung cấp permission, lifecycle và UI chuẩn.

### Descriptor, databinding và cấu hình

`Descriptor` mô tả UI, validation và cách Jenkins tạo/cất cấu hình extension. `@DataBoundConstructor` cho phép Stapler map field form hoặc Pipeline DSL vào constructor. Chỉ nhận input tối thiểu, validate cả ở UI lẫn server-side, và giữ constructor không thực hiện I/O hay command.

Ví dụ một cấu hình toàn cục với endpoint validation được bảo vệ. Nó chỉ cho phép một tên hiển thị ngắn; nó không thực thi dữ liệu người dùng.

```java
@Extension
public final class GreetingConfiguration extends GlobalConfiguration {
    private String greeting = "Hello";

    public GreetingConfiguration() {
        load();
    }

    public String getGreeting() {
        return greeting;
    }

    @DataBoundSetter
    public void setGreeting(String greeting) {
        this.greeting = normalizeGreeting(greeting);
        save();
    }

    public FormValidation doCheckGreeting(@QueryParameter String value) {
        Jenkins.get().checkPermission(Jenkins.ADMINISTER);
        try {
            normalizeGreeting(value);
            return FormValidation.ok();
        } catch (IllegalArgumentException ex) {
            return FormValidation.error("Dùng tối đa 80 ký tự in được trên một dòng.");
        }
    }

    private static String normalizeGreeting(String value) {
        String candidate = value == null ? "" : value.trim();
        if (candidate.isEmpty() || candidate.length() > 80 || candidate.matches(".*[\\r\\n].*")) {
            throw new IllegalArgumentException("invalid greeting");
        }
        return candidate;
    }
}
```

Trong code thật, chọn permission theo đối tượng: `Jenkins.ADMINISTER` phù hợp cho global configuration, nhưng có thể quá rộng cho resource theo job/folder. Gọi `checkPermission` tại method thao tác nhạy cảm, không chỉ ẩn nút trong Jelly. UI là trải nghiệm; server-side authorization mới là enforcement.

### Stapler, Jelly và UI

Stapler route HTTP và databind request vào các method/đối tượng Jenkins. Jelly là view XML cho form và trang Jenkins. `doCheck...` chỉ trả `FormValidation`, không được ghi state hay tạo side effect; form UI thường gọi validation này bằng GET. Vì request có thể do client tự tạo, validation read-only không chứng minh `configure` hoặc handler `do...` an toàn. Kiểm tra kiểu, độ dài, format, authorization và trạng thái server ở mọi điểm ghi dữ liệu.

Một `config.jelly` nên dùng tag form chuẩn để Jenkins liên kết field với descriptor:

```xml
<j:jelly xmlns:j="jelly:core" xmlns:f="/lib/form">
  <f:entry title="Greeting" field="greeting">
    <f:textbox />
  </f:entry>
</j:jelly>
```

Không dựng HTML/JavaScript bằng chuỗi chứa input từ người dùng. Khi hiển thị dữ liệu động, dùng helper/tag API escape đúng context của Jenkins: HTML text, HTML attribute, URL và JavaScript là các context khác nhau. Không đánh dấu dữ liệu là “safe HTML” chỉ vì nó đã được validation trước đó. Nếu cần rich text, dùng renderer đã được Jenkins hỗ trợ với allowlist hẹp và test payload XSS.

Không gắn `@RequirePOST` vào `doCheck...` read-only: Jelly gọi validation form bằng GET và method này không được có side effect. Ngược lại, `configure` và handler `do...` sửa state phải kiểm tra authorization server-side, dùng `@RequirePOST` để Stapler từ chối GET, rồi đi qua cơ chế crumb/CSRF của Jenkins. Không tắt CSRF globally để endpoint hoạt động. Client UI nên lấy crumb theo cơ chế Jenkins; REST client phải dùng cách xác thực/crumb phù hợp cấu hình controller. Đối chiếu policy chung tại [cấu hình hệ thống](/docs/administration/system-configuration).

### Pipeline step và vòng đời thực thi

Một `Step` là API mà Jenkinsfile gọi, thường được `StepDescriptor` đăng ký tên DSL. Chỉ expose tham số mà maintainer sẵn sàng hỗ trợ lâu dài. Lệnh shell tự do, Groovy tự do hoặc đường dẫn tùy ý làm step trở thành một capability broker nguy hiểm; tránh chúng nếu có thể.

Skeleton sau ghi thông điệp đã chuẩn hóa. Nó minh họa step không cần agent, command hay credential. Production code cần bổ sung Javadoc, test và thông báo lỗi theo chuẩn plugin.

```java
public final class SafeEchoStep extends Step {
    private final String message;

    @DataBoundConstructor
    public SafeEchoStep(String message) {
        this.message = normalize(message);
    }

    public String getMessage() {
        return message;
    }

    @Override
    public StepExecution start(StepContext context) {
        return new Execution(message, context);
    }

    @Extension
    public static final class DescriptorImpl extends StepDescriptor {
        @Override public String getFunctionName() { return "safeEcho"; }
        @Override public Set<? extends Class<?>> getRequiredContext() {
            return Set.of(TaskListener.class);
        }
    }

    private static final class Execution extends SynchronousNonBlockingStepExecution<Void> {
        private final String message;

        private Execution(String message, StepContext context) {
            super(context);
            this.message = message;
        }

        @Override protected Void run() throws Exception {
            getContext().get(TaskListener.class).getLogger().println("safeEcho: " + message);
            return null;
        }
    }

    private static String normalize(String value) {
        String candidate = value == null ? "" : value.trim().replaceAll("[\\r\\n]", " ");
        if (candidate.isEmpty() || candidate.length() > 200) {
            throw new IllegalArgumentException("message must be 1..200 characters");
        }
        return candidate;
    }
}
```

Vòng đời step gồm construction từ Jenkinsfile, `start`, execution, completion/failure và có thể resume sau restart tùy loại execution. Nếu step làm việc dài hoặc bất đồng bộ, thiết kế cancel, timeout, persistence và resume rõ ràng; đừng giữ object không serializable, socket hoặc secret lâu sống trong execution state. Test cả hủy build và controller restart nếu step tuyên bố hỗ trợ chúng. Đặt step trong bối cảnh [tổng quan Pipeline](/docs/pipelines/overview).

## Thiết kế bảo mật từ đầu

Threat model trước khi code: ai gọi endpoint/step, input đến từ đâu, code chạy trên controller hay agent, dữ liệu nào là nhạy cảm và capability nào được cấp? Câu trả lời phải dẫn đến permission, validation, trust boundary và test cụ thể. Security scan không thể bù cho thiết kế cấp quá nhiều quyền.

### Quyền, CSRF và đầu vào HTTP

- Dùng permission Jenkins có scope hẹp nhất và gọi `checkPermission` ở server-side trước read/modify/export thao tác nhạy cảm. Đừng quyết định quyền từ một field gửi bởi browser.
- Áp dụng `@RequirePOST` cho endpoint làm thay đổi trạng thái. Giữ crumb/CSRF protection bật; không chấp nhận bypass bằng query parameter tự đặt.
- `doCheck...` chỉ validate read-only, thường được form gọi bằng GET và không dùng `@RequirePOST`. Nó vẫn cần authorization phù hợp nếu kết quả validation tiết lộ capability hoặc metadata nhạy cảm.
- Coi mọi `@QueryParameter`, JSON, form field, tên job, URL callback và metadata SCM là dữ liệu không tin cậy. Parse theo schema, đặt giới hạn kích thước, allowlist enum/host khi cần và báo lỗi không lộ thông tin nội bộ.
- Không biến endpoint GET “preview” hay `doCheck...` thành nơi có side effect, không dùng GET để rotate credential, trigger build hoặc sửa cấu hình.

### XSS, path và command injection

XSS xảy ra khi input được render như markup/script. Escape output theo đúng context và ưu tiên tag UI Jenkins. Test input có thẻ HTML, quote, URL đặc biệt và chuỗi Unicode. Form validation chỉ là trợ giúp UX; render và handler khác vẫn phải escape/validate.

Path traversal và command injection xuất hiện khi plugin ghép input vào file path hoặc shell command. Không dùng `new File(base, userValue)` rồi tin rằng nó ở dưới `base`; canonicalize/normalize path và kiểm tra nó còn nằm trong base đã allowlist. Tốt hơn, nhận một ID lựa chọn rồi map ID sang path server-side. Không truyền dữ liệu vào `sh -c`, `cmd.exe /c`, `Runtime.exec(String)` hay chuỗi command. Nếu phải gọi process, dùng API nhận mảng argument cố định, allowlist executable/option và chạy trên agent có quyền tối thiểu.

<Callout type="error" title="Không biến plugin thành shell từ xa">
  Một Pipeline parameter, request Stapler hoặc cấu hình job không phải là nguồn an toàn để ghép command. “Đã được admin cấu hình” cũng không xóa rủi ro khi cấu hình có thể bị sửa, import hoặc dùng lại. Thiết kế API bằng operation cụ thể thay vì nhận command/path tổng quát.
</Callout>

### Credentials, secret và log

Plugin nên nhận **credential ID** và dùng Jenkins Credentials API ở scope/ngữ cảnh tối thiểu; nó không nên nhận secret text, password hay private key qua form, Pipeline argument hoặc system property. Chỉ lookup credential lúc operation cần thiết, kiểm tra loại credential và quyền sử dụng, rồi giảm thời gian secret tồn tại trong memory/file. Không cache secret, serialize nó vào config/build state, gửi qua exception hay trả về UI.

Masking Console Output hữu ích nhưng không phải ranh giới bảo mật: tool có thể encode, biến đổi hoặc ghi secret ra artifact. Không log request header, environment, command line hoàn chỉnh, object credential, `toString()` exception chưa review hay debug dump. Redact theo policy, đặt retention/access control cho log, và điều tra tại [logs và diagnostics](/docs/administration/logs). Cách scope credential trong Jenkinsfile được trình bày ở [credentials trong Pipeline](/docs/pipelines/credentials).

### Controller, agent, Remoting và sandbox

Controller là trust boundary cao: nó giữ config, plugin và nhiều policy. Agent chạy source/build tool nên phải được coi là môi trường có thể bị code build tác động. Plugin chỉ gửi qua Remoting dữ liệu đã validate, tác vụ có kiểu rõ ràng và capability tối thiểu. Không gửi closure tùy ý, credential production hay đường dẫn controller để agent tự xử lý. Xác thực kết quả agent trả về, xử lý disconnect/retry/idempotency và không tin agent chỉ vì nó kết nối được.

Đừng chạy workload thông thường hoặc repository không tin cậy trên built-in node. Chọn agent/pool tách biệt, credential scope theo job/folder và quyền OS/network nhỏ nhất; xem [tổng quan agent](/docs/agents/overview) và [kiến trúc Jenkins](/docs/getting-started/architecture).

Script Security sandbox hạn chế một số thao tác của Pipeline Groovy không tin cậy. Nó **không** biến code Java của plugin thành sandboxed, cũng không làm command thực thi trên agent an toàn. Không hướng người dùng approve signature Groovy hoặc tắt sandbox chỉ để plugin hoạt động. Plugin phải tự thiết kế API hẹp, tôn trọng authorization và tránh expose primitive nguy hiểm.

## Chiến lược kiểm thử và compatibility

Mục tiêu test không chỉ là branch coverage. Test cần chứng minh plugin được nạp, extension được tìm thấy, config được lưu/đọc, permission bị từ chối đúng cách, input độc hại không tạo side effect và failure qua agent/restart được xử lý có chủ đích.

### Tầng test và Jenkins Test Harness

| Tầng | Công cụ/cách chạy | Điều cần chứng minh |
| --- | --- | --- |
| Unit | JUnit cho service thuần Java, mock nhỏ | Parse/validation/allowlist hoạt động, không cần Jenkins. |
| Harness | `JenkinsRule` trong Jenkins Test Harness | Plugin load, extension/descriptor/UI/permission hoạt động trong controller test. |
| Persistence | `JenkinsSessionRule` hoặc test restart phù hợp | Config/state tương thích qua restart hoặc upgrade giả lập. |
| Integration | Maven `verify` chạy test harness với dependency đã pin | Luồng plugin với Jenkins runtime, không phải production controller. |
| Manual smoke | `mvn hpi:run` trong local isolated home | UI/step cơ bản quan sát được trước review, không thay CI. |

`JenkinsRule` khởi động Jenkins test trong JVM cho mỗi test hoặc class tùy cấu hình. Nó phù hợp để tạo job, lưu config, gọi form/endpoint theo quyền test và kiểm tra extension list. Dùng `@LocalData` cho fixture cấu hình tối thiểu; fixture phải đại diện version cũ khi test migration. `JenkinsSessionRule` hữu ích khi cần các phiên Jenkins liên tiếp để kiểm tra state sống qua restart. Không gọi `Jenkins.get()` từ unit test thuần chỉ để giả lập harness.

Ví dụ hướng kiểm thử permission và validation:

```java
@Rule public JenkinsRule j = new JenkinsRule();

@Test public void rejects_line_breaks_and_requires_admin() throws Exception {
    GreetingConfiguration config = GlobalConfiguration.all().get(GreetingConfiguration.class);

    assertThat(config.doCheckGreeting("hello\nworld").kind, is(FormValidation.Kind.ERROR));
    // Test HTTP riêng gọi doCheck... bằng GET và xác nhận không có side effect.
    // Test configure/handler ghi state phải gọi POST có crumb bằng user không có ADMINISTER,
    // rồi xác nhận bị từ chối thay vì chỉ kiểm tra nút UI bị ẩn.
}
```

Đây là khung minh họa, không phải bộ test hoàn chỉnh: dự án phải tạo user/authorization strategy test phù hợp. Kiểm tra `doCheck...` qua GET để xác nhận validation read-only; kiểm tra riêng handler ghi qua POST có crumb/CSRF behavior. Thêm case boundary (rỗng, 80/81 ký tự), payload XSS, ID path sai và request không có quyền.

### UI, integration và Plugin Compatibility Tester

**Acceptance Test Harness (ATH)** tự động hóa trình duyệt để kiểm tra hành vi UI xuyên browser/Jenkins khi UI là bề mặt quan trọng. ATH chậm và tốn môi trường hơn `JenkinsRule`; dùng cho journey có rủi ro như form lưu config hoặc page action, không thay toàn bộ unit/harness test bằng UI test.

**Plugin Compatibility Tester (PCT)** chạy test của plugin trước tập Jenkins core/plugin dependency mục tiêu để phát hiện regression compatibility. PCT là tín hiệu cho maintainer khi nâng core hoặc plugin dependency, không phải chứng nhận plugin an toàn hay đảm bảo mọi controller tổ chức sẽ pass. Ghi rõ baseline, plugin set, JDK và failure triage; lỗi PCT có thể là bug plugin, thay đổi API, test flaky hoặc vấn đề môi trường.

CI nên chạy nhanh: format/lint, unit và harness test trên pull request; chạy matrix/PCT, ATH hoặc integration rộng hơn theo thay đổi core, dependency, UI hay release candidate. Đừng coi test xanh trên một JDK hoặc một controller là ma trận tương thích. Xem cách tổ chức evidence test nói chung tại [tự động hóa kiểm thử](/docs/delivery/test-automation).

## Build, kiểm tra và phát hành

### Luồng build–test–release

```text
Pull request
    │
    ▼
format + static analysis ── fail ──► sửa source, không publish
    │ pass
    ▼
compile + unit + JenkinsRule ── fail ──► triage fixture/API/security
    │ pass
    ▼
dependency/license/SBOM diff + advisory review
    │ pass
    ▼
integration / ATH / PCT khi thay đổi yêu cầu
    │ pass
    ▼
release review ──► tag + artifact từ CI đã phê duyệt ──► staging rollout
                                                        │
                                                        └── rollback plan/evidence
```

Build tái lập bắt đầu bằng source revision, JDK, Maven wrapper hoặc Maven version, repository/mirror và dependency versions đã pin. Chạy CI ở môi trường sạch khi có thể; không dựa vào artifact còn sót trong local repository để chứng minh build hợp lệ. Những lệnh tham khảo ở local CI là:

```bash
mvn -B -ntp clean verify
mvn -B -ntp dependency:tree
mvn -B -ntp help:effective-pom
```

Chỉ dùng goal/plugin static-analysis đã được pin trong POM hoặc CI, ví dụ compiler warnings, SpotBugs, Error Prone, Checkstyle hoặc Enforcer theo policy đội. Đừng thêm scan bằng một version tải động trong release job. Static analysis tìm pattern; review vẫn phải xem permission, serialization, concurrency, Jelly rendering và Remoting.

### Supply chain và review phát hành

Trước release, tạo danh sách dependency và license từ build đã kiểm thử; sinh **SBOM** theo format/chính sách tổ chức (như CycloneDX hoặc SPDX) từ chính dependency graph đó. Kiểm tra dependency mới, license không phù hợp, checksum/provenance của repository/mirror và vulnerability/advisory liên quan. SBOM là inventory để đối chiếu, không phải kết luận “an toàn”.

Theo dõi [Jenkins Security Advisories](https://www.jenkins.io/security/advisories/) cho Jenkins core và plugin dependency. Với advisory ảnh hưởng plugin của bạn, xác định version bị ảnh hưởng/sửa, điều kiện khai thác, workaround, owner, deadline và thông báo người dùng. Nếu phát hiện lỗ hổng mới trong plugin, dùng quy trình báo cáo security riêng tư của Jenkins; không đăng proof-of-concept có secret hoặc chi tiết khai thác chưa được điều phối lên issue công khai.

Release review tối thiểu cần: diff đã duyệt, changelog/migration note, core/JDK/plugin assumptions, kết quả test matrix, PCT/ATH khi áp dụng, dependency & license/SBOM diff, advisory result, source/artifact provenance, người phê duyệt và rollback path. Artifact chỉ được publish từ CI revision đã review. Sau rollout staging, kiểm tra startup, extension load, UI/Pipeline smoke và log đã redact trước khi lên production qua quy trình [quản lý plugins](/docs/administration/plugin-management). Backup/restore của controller theo [backup và khôi phục](/docs/administration/backup-restore).

## Lab local: compile và test plugin mẫu

Lab này chỉ tạo một project local và chạy compile/test. Nó không chạy plugin production, không upload HPI, không dùng credential, không kết nối controller/agent tổ chức.

### Điều kiện trước khi chạy

- JDK 17, với `JAVA_HOME` trỏ tới JDK đó và `java -version` báo 17.
- Apache Maven 3.9.6. Plugin Parent `6.2138.v03274d462c13` yêu cầu Maven từ 3.9.6 và compile release 17.
- Maven phải truy cập Maven Central và `https://repo.jenkins-ci.org/public/`, hoặc mirror đã phê duyệt có cùng artifact đã pin.
- Máy có đủ disk/RAM để Maven tải dependency và Jenkins Test Harness khởi động runtime test.
- Nếu dùng `mvn hpi:run`, đây là Jenkins runtime local cô lập: `JENKINS_HOME` được tạo dưới `/tmp/jenkins-plugin-lab.*`, port loopback `8085` phải đang trống, và không được import plugin/config/credential production.

### Tạo, kiểm tra và dọn dẹp

1. Tạo một parent sandbox có prefix cố định và marker trước khi chạy **nguyên văn** lệnh archetype đã pin ở phần trên. `readonly` ngăn shell vô tình gán lại đường dẫn cleanup trong cùng session:

   ```bash
   LAB_PARENT="$(mktemp -d /tmp/jenkins-plugin-lab.XXXXXX)"
   readonly LAB_PARENT
   LAB_HOME=''
   printf 'jenkins-plugin-lab\n' > "$LAB_PARENT/.jenkins-plugin-lab"
   cd "$LAB_PARENT"
   ```

   Lệnh archetype tạo `$LAB_PARENT/safe-greeting` với `empty-plugin` 1.37, Parent `6.2138.v03274d462c13`, core `2.528.3` và BOM `6237.v4da_61a_4a_19e5`.

2. Đi vào project, đối chiếu POM với baseline ở trên, rồi compile/test. `-ntp` chỉ giảm progress transfer; nó không thay đổi version resolution:

   ```bash
   cd "$LAB_PARENT/safe-greeting"
   mvn -B -ntp clean verify
   mvn -B -ntp dependency:tree
   ```

3. Chỉ khi muốn kiểm tra UI local, tạo `JENKINS_HOME` là **con trực tiếp** của sandbox có marker riêng, rồi khởi động runtime cô lập. Không đăng nhập bằng tài khoản thật và không cài plugin ngoài danh sách test:

   ```bash
   LAB_HOME="$(mktemp -d "$LAB_PARENT/jenkins-home.XXXXXX")"
   printf 'jenkins-plugin-lab-home\n' > "$LAB_HOME/.jenkins-plugin-lab-home"
   export JENKINS_HOME="$LAB_HOME"
   mvn -B -ntp hpi:run -Djetty.port=8085
   ```

   Mở `http://127.0.0.1:8085/`, quan sát plugin mẫu load, rồi dừng process bằng `Ctrl+C`. Không dùng endpoint này để thử quyền admin hoặc upload artifact.

4. Sau compile/test-only **hoặc** sau khi process `hpi:run` đã dừng, cleanup luôn xác nhận prefix và marker của parent. `LAB_HOME=''` đã được khai báo từ bước 1 nên vẫn an toàn khi shell dùng `set -u`. Chỉ khi runtime tùy chọn đã tạo `LAB_HOME` thì script mới kiểm tra prefix child, marker child và quan hệ parent–child. Bất kỳ guard nào fail đều `exit 1` trước lệnh xóa và không đụng đường dẫn khác:

   ```bash
   case "$LAB_PARENT" in
     /tmp/jenkins-plugin-lab.*) ;;
     *) printf '%s\n' 'Refuse cleanup: unexpected lab parent' >&2; exit 1 ;;
   esac
   if [ ! -f "$LAB_PARENT/.jenkins-plugin-lab" ]; then
     printf '%s\n' 'Refuse cleanup: lab parent marker missing' >&2
     exit 1
   fi
   if [ -n "$LAB_HOME" ]; then
     case "$LAB_HOME" in
       "$LAB_PARENT"/jenkins-home.*) ;;
       *) printf '%s\n' 'Refuse cleanup: unexpected lab home' >&2; exit 1 ;;
     esac
     if [ ! -f "$LAB_HOME/.jenkins-plugin-lab-home" ] \
       || [ "$(dirname -- "$LAB_HOME")" != "$LAB_PARENT" ]; then
       printf '%s\n' 'Refuse cleanup: lab home guards failed' >&2
       exit 1
     fi
   fi
   cd / || exit 1
   rm -rf --one-file-system -- "$LAB_PARENT"
   unset JENKINS_HOME
   ```

### Kết quả mong đợi

Với Java 17, Maven 3.9.6 và version set đã pin, `mvn clean verify` kết thúc `BUILD SUCCESS`, tạo report test trong `target/` và không cần secret. Nhánh compile/test-only cleanup parent sandbox mà không cần `LAB_HOME`. Nếu chạy runtime tùy chọn, `hpi:run` chỉ bind loopback port `8085` và Console Output không chứa token/password; cleanup kiểm tra thêm marker child. Sau cleanup hợp lệ, toàn bộ `$LAB_PARENT` không còn; nếu bất kỳ guard nào fail, script dừng và không xóa gì.

<Callout type="idea" title="Giữ lab có thể lặp lại">
  Ghi JDK, Maven, archetype/parent/BOM/core versions, command, commit SHA và kết quả test vào pull request hoặc release evidence. Không đính kèm `.m2` cache, `target/`, home runtime hay log chưa redact để “chứng minh” lab.
</Callout>

## Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý an toàn |
| --- | --- | --- |
| Maven không resolve được parent/BOM | Mirror, TLS, repository policy hoặc version sai | Kiểm tra URL/mirror và version pin; không tắt TLS hay chuyển sang repository không kiểm soát. |
| Plugin load fail lúc test/runtime | `requiredCore`, Java hoặc dependency graph không khớp | Đọc stack trace đã redact, đối chiếu effective POM và baseline matrix. |
| Extension/step không xuất hiện | Thiếu `@Extension`, descriptor/symbol sai hoặc package/resource không khớp | Viết `JenkinsRule` xác nhận extension registry; kiểm tra class/resource path. |
| Form validate được nhưng lưu lỗi | `doCheck...` chỉ validate; `configure`/databinding ghi state có kỳ vọng khác | Test `doCheck...` bằng GET không side effect; test `configure` bằng POST có crumb, quyền phù hợp và dữ liệu sau reload. |
| Test harness flaky | Port, thread, thời gian hoặc fixture dùng state toàn cục | Cô lập fixture, đóng resource, tránh sleep cố định và tái tạo bằng command/commit/JDK đã ghi. |
| Agent operation treo | Remoting disconnect, retry không giới hạn hoặc step không xử lý cancel | Đặt timeout/cancel/idempotency, log metadata đã redact và xem [logs và diagnostics](/docs/administration/logs). |

Không paste toàn bộ `JENKINS_HOME`, thread dump, HTTP header hay Console Output vào issue. Trích phần lỗi tối thiểu đã redact, kèm core/JDK/plugin versions, command và bước tái tạo.

## Checklist trước release

- [ ] Chọn extension point hẹp nhất; public Pipeline/UI contract, deprecation và migration note đã review.
- [ ] Core, Java, plugin dependency và BOM assumptions được pin, có evidence test cho matrix áp dụng.
- [ ] Endpoint/configuration thực hiện authorization server-side; thay đổi dùng POST và không bypass crumb/CSRF.
- [ ] Input được schema/allowlist/giới hạn; UI escape đúng context; không ghép command hoặc path từ input.
- [ ] Credential chỉ được lookup khi cần theo scope tối thiểu; không có secret trong source, fixture, artifact hay log.
- [ ] Controller–agent capability, Remoting payload, timeout/cancel và sandbox boundary đã threat-model/test.
- [ ] Unit, `JenkinsRule`, persistence/restart và integration test cần thiết pass; ATH/PCT được chạy hoặc có lý do phạm vi rõ ràng.
- [ ] Format/static analysis, reproducible build, dependency tree, license và SBOM diff đã review.
- [ ] Security advisory đã triage; disclosure, version fix và communication plan có owner nếu phát hiện issue.
- [ ] Release artifact đến từ CI revision đã duyệt; staging smoke, rollback và backup/restore evidence đã có.

## Đọc tiếp

<Cards>
  <Card title="Quản lý Jenkins plugins" href="/docs/administration/plugin-management" description="Đánh giá dependency, advisory, staging và rollout plugin." />
  <Card title="Cấu hình hệ thống" href="/docs/administration/system-configuration" description="Đối chiếu policy controller, HTTP và vận hành chung." />
  <Card title="Kiến trúc Jenkins" href="/docs/getting-started/architecture" description="Hiểu controller, agent, executor và trust boundary." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Scope credential và tránh lộ secret trong build." />
</Cards>

## Nguồn Jenkins chính thức

- [Jenkins Developer Documentation](https://www.jenkins.io/doc/developer/)
- [Plugin development](https://www.jenkins.io/doc/developer/plugin-development/)
- [Extension points](https://www.jenkins.io/doc/developer/extensions/)
- [Plugin parent POM](https://www.jenkins.io/doc/developer/plugin-development/plugin-development-environment/)
- [Testing Jenkins plugins](https://www.jenkins.io/doc/developer/testing/)
- [Publishing plugins](https://www.jenkins.io/doc/developer/publishing/)
- [Jenkins Security](https://www.jenkins.io/security/)
- [Jenkins Security Advisories](https://www.jenkins.io/security/advisories/)
- [Plugin Compatibility Tester](https://github.com/jenkinsci/plugin-compat-tester)
- [Java support policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/)
- [Empty Plugin Archetype 1.37 trên Maven Central](https://repo.maven.apache.org/maven2/io/jenkins/archetypes/empty-plugin/1.37/empty-plugin-1.37.jar)
- [Maven Archetype Plugin 3.3.1 trên Maven Central](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-archetype-plugin/3.3.1/maven-archetype-plugin-3.3.1.pom)
- [Plugin Parent 6.2138.v03274d462c13](https://repo.jenkins-ci.org/public/org/jenkins-ci/plugins/plugin/6.2138.v03274d462c13/plugin-6.2138.v03274d462c13.pom)
- [BOM 2.528.x 6237.v4da_61a_4a_19e5](https://repo.jenkins-ci.org/public/io/jenkins/tools/bom/bom-2.528.x/6237.v4da_61a_4a_19e5/bom-2.528.x-6237.v4da_61a_4a_19e5.pom)
- [Jenkins core 2.528.3](https://repo.jenkins-ci.org/public/org/jenkins-ci/main/jenkins-core/2.528.3/jenkins-core-2.528.3.pom)
