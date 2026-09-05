---
title: "Artifact repositories với Jenkins"
description: "Publish package bất biến từ Jenkins với credential tối thiểu, checksum, retention và promotion có thể truy vết."
---

<Callout type="info" title="Phạm vi và điều kiện">
  Bài này mô tả contract giữa Jenkins và một artifact repository. Ví dụ HTTP cần HTTP Request Plugin được phê duyệt; Maven, npm và OCI dùng client/protocol riêng. Không có snippet nào tạo repository, credential hay thao tác lên dịch vụ production.
</Callout>

Artifact repository là nơi phân phối output đã được kiểm tra, không phải workspace hay cache của agent. Một release đáng tin phải có version hoặc digest bất biến, checksum, metadata nguồn và policy ngăn ghi đè. Jenkins chỉ publish sau gate tin cậy; repository vẫn phải tự enforce quyền và immutability.

## Mục lục

- [Mục tiêu và điều kiện trước](#mục-tiêu-và-điều-kiện-trước)
- [Chọn repository và giao thức](#chọn-repository-và-giao-thức)
  - [Ma trận quyết định](#ma-trận-quyết-định)
  - [Repository không thay thế archive Jenkins](#repository-không-thay-thế-archive-jenkins)
- [Credential và ranh giới tin cậy](#credential-và-ranh-giới-tin-cậy)
  - [Quyền tối thiểu và TLS](#quyền-tối-thiểu-và-tls)
  - [Pull request và release](#pull-request-và-release)
- [Artifact bất biến và version strategy](#artifact-bất-biến-và-version-strategy)
  - [Checksum digest và provenance](#checksum-digest-và-provenance)
  - [Version snapshot promotion và rollback](#version-snapshot-promotion-và-rollback)
- [Jenkins Pipeline publish an toàn](#jenkins-pipeline-publish-an-toàn)
  - [Giả định plugin và contract](#giả-định-plugin-và-contract)
  - [Jenkinsfile dùng credential-aware step](#jenkinsfile-dùng-credential-aware-step)
  - [Idempotency và failure](#idempotency-và-failure)
- [Retention lifecycle và khôi phục](#retention-lifecycle-và-khôi-phục)
- [Lab local tái lập không cần repository](#lab-local-tái-lập-không-cần-repository)
  - [Tạo và publish fixture](#tạo-và-publish-fixture)
  - [Kiểm tra và cleanup có guard](#kiểm-tra-và-cleanup-có-guard)
  - [Giới hạn của lab](#giới-hạn-của-lab)
- [Troubleshooting](#troubleshooting)
- [Checklist tự kiểm tra](#checklist-tự-kiểm-tra)
- [Nguồn chính thức và đọc tiếp](#nguồn-chính-thức-và-đọc-tiếp)

## Mục tiêu và điều kiện trước

Sau bài này, bạn có thể chọn nơi publish phù hợp, liên kết một package với revision đã build, và tránh cấp token release cho code chưa tin cậy. Trước khi cấu hình Pipeline, chốt các thông tin sau với owner repository:

- format distribution: generic HTTP, Maven, npm, OCI hay object storage;
- namespace/repository đích, naming convention và version bất biến;
- service identity nào chỉ được ghi, identity nào chỉ được đọc, cùng ngày rotation;
- CA/TLS, proxy/egress allowlist, quota, audit log và thời hạn retention;
- policy xử lý package đã tồn tại, timeout upload, promotion và rollback.

<Callout type="warn" title="Không dùng repository để che failure">
  Một upload thành công không chứng minh artifact an toàn. Test, scan, checksum và policy phải đạt trước publish. Ngược lại, archive Jenkins không thay thế repository phát hành; nó chỉ là evidence theo từng build.
</Callout>

## Chọn repository và giao thức

### Ma trận quyết định

Nexus Repository và JFrog Artifactory là các sản phẩm quản lý nhiều format. Object storage là lớp object/key cần policy naming, conditional write và lifecycle do đội vận hành thiết kế. Không có lựa chọn nào tự biến mọi bytes thành package an toàn.

| Nhu cầu | Giao thức và identity artifact | Repository phù hợp | Kiểm soát cần xác minh |
| --- | --- | --- | --- |
| File generic, ví dụ `.tgz` hoặc report đã ký | HTTPS `PUT` vào path version cố định; SHA-256 đi kèm | Generic repository của Nexus/Artifactory hoặc object storage | Không ghi đè key release, conditional write, checksum metadata, ACL path và lifecycle |
| Java | Maven coordinate `groupId:artifactId:version` | Maven hosted repository | `deploy` chỉ vào namespace cần thiết, release không redeploy, checksum và mirror TLS |
| Node.js | Package name và version trong `package.json` | npm hosted registry | Version package không publish lại, dist-tag có owner, token publish tách token install |
| Container | OCI manifest digest | OCI registry | Deploy/promotion theo `repository@sha256:...`, tag không là identity release, signature/referrer policy |
| Lưu archive Jenkins ra ngoài | Artifact Manager backend, không phải package registry | Object storage qua plugin đã phê duyệt | IAM bucket, encryption, lifecycle, plugin/core compatibility và restore |

Maven, npm và OCI có client cùng metadata riêng. Không dùng generic HTTP upload để giả lập `mvn deploy`, `npm publish` hay OCI push; những client này còn thực hiện validation, layout và authentication theo protocol. Chọn plugin hoặc client chính thức của format đang phát hành, pin version của nó trong image agent/catalog tool và kiểm tra trên sandbox.

### Repository không thay thế archive Jenkins

| Nơi lưu | Dùng đúng cho | Không dùng cho |
| --- | --- | --- |
| Workspace agent | Checkout, build và file tạm | Truyền release giữa build hoặc giữ lâu dài |
| `stash` | Di chuyển file nhỏ đã biết giữa stage cùng một run | Repository phát hành hay cache dùng chung |
| `archiveArtifacts` | Report, checksum và evidence của một Jenkins build | Kho distribution dài hạn cho consumer |
| Artifact repository | Consumer resolve package/version bất biến, promotion và rollback | Thay thế build log, quyền Jenkins hoặc test gate |

Khi consumer tải artifact, nó phải xác minh SHA-256 hoặc digest từ kênh tin cậy trước khi chạy/deploy. Jenkins fingerprint hỗ trợ truy vết nội bộ nhưng dùng MD5 lịch sử, nên không thay checksum mật mã hoặc signature. Xem [Build Artifacts](/docs/jobs/artifacts) để tách bốn vòng đời này.

## Credential và ranh giới tin cậy

### Quyền tối thiểu và TLS

Credential ID có thể ở Jenkinsfile; giá trị secret phải ở Jenkins Credentials hoặc secret manager đã phê duyệt. Cấp một publisher identity chỉ có quyền ghi vào repository/path của sản phẩm và không có quyền xóa, cấu hình repository hay quản trị tổ chức. Consumer dùng identity read-only tách biệt. Domain hiển thị credential trong UI không phải security boundary; scope folder/job, permission Jenkins, token scope và egress mới là boundary thực.

Dùng TLS với hostname và CA do tổ chức tin cậy. Không đặt `ignoreSslErrors: true`, không dùng curl với bỏ qua certificate verification, và không chữa lỗi CA bằng cách chuyển endpoint sang HTTP. Khi token/CA/endpoint đổi, thử publish package vô hại trên sandbox, cập nhật consumer theo change record, rồi revoke phiên bản credential cũ sau overlap window đã định.

Có hai cách nạp quyền thường gặp:

- **Credential-aware step:** HTTP Request Plugin nhận `authentication: 'artifact-release-publisher'`; secret không đi qua Groovy, shell hay argv. Đây là lựa chọn của ví dụ generic HTTP bên dưới.
- **Client đã hỗ trợ credential store/config an toàn:** Maven `settings.xml`, npm configuration hoặc OCI client phải nhận secret qua binding ngắn do plugin/tool hỗ trợ. Không đưa token vào URL query, header do shell ghép, source, log, report, cache hay artifact.

Masking console chỉ giảm lộ vô tình. Code, dependency hoặc process đã nhận secret vẫn có thể gửi nó ra ngoài. Vì vậy credential release chỉ được bind trong stage release ngắn nhất trên agent tách biệt.

### Pull request và release

| Luồng | Agent và quyền | Kết quả được phép |
| --- | --- | --- |
| Pull request/fork | Pool `untrusted-pr`, không credential publish, cache không ghi vào tier release | Build, test, tạo checksum/SBOM local và archive evidence không nhạy cảm |
| Branch nội bộ đã review | Pool CI có quyền read cần thiết | Candidate có thể được kiểm tra theo policy riêng |
| `main` hoặc tag release được bảo vệ | Pool `trusted-release`, credential write scope hẹp | Publish artifact đã kiểm tra, đọc lại metadata/digest, tạo record promotion |

Label chỉ điều phối agent; nó không tự ngăn người sửa Jenkinsfile dùng credential. Multibranch trust policy, branch protection, authorization, network, workspace/cache isolation và scope credential phải cùng bảo vệ stage release. Chi tiết binding nằm tại [Credentials trong Pipeline](/docs/pipelines/credentials) và ranh giới agent tại [Bảo mật Agent và Plugin](/docs/security/agent-plugin-security).

## Artifact bất biến và version strategy

### Checksum digest và provenance

Mỗi release cần có một identity bất biến và evidence đi kèm:

| Evidence | Mục đích | Không phải |
| --- | --- | --- |
| SHA-256 hoặc SHA-512 | Xác nhận bytes package khi upload/download | Jenkins fingerprint MD5 |
| Version hoặc OCI digest | Chỉ đúng artifact để consumer/promotion dùng | Một tag hay alias có thể bị đổi |
| SBOM | Inventory dependency và thành phần | Kết luận không có mọi vulnerability |
| Provenance/attestation theo policy | Liên kết source, builder và artifact | Một JSON tự tạo được gọi là chứng nhận chuẩn |
| Repository audit event | Ai publish path/version nào, lúc nào | Thay thế checksum hoặc review release |

Tạo checksum sau package và archive cùng package, SBOM/metadata theo allowlist hẹp. Repository phải từ chối overwrite version release. Nếu upload trả `409` hoặc lỗi “already exists”, dừng và đọc metadata/checksum: chỉ coi thao tác idempotent khi server xác nhận bytes giống hệt. Không xóa hoặc overwrite release để thử lại.

### Version snapshot promotion và rollback

Release version như `1.4.0` là immutable. Candidate như `1.4.1-rc.2` cần namespace/retention riêng. Snapshot là artifact thay đổi theo policy hoặc timestamp nên không phải identity rollback cuối cùng; Maven snapshot, npm dist-tag và OCI tag có semantics khác nhau, cần owner của format đó phê duyệt.

Promotion chuyển **cùng bytes** từ candidate sang release hoặc thay trạng thái repository theo capability của provider. Nó không build lại từ checkout mới. Record promotion cần gồm version/digest, SHA-256, source revision, build URL, policy/approval và artifact rollback trước. Rollback chọn version/digest tốt đã biết, xác minh checksum rồi để consumer/deployer nhận đúng identity đó.

Không dùng alias hoặc tag di động làm release input. Retention cũng không được xóa artifact còn trong manifest môi trường, rollback window, legal hold hoặc consumer support policy.

## Jenkins Pipeline publish an toàn

### Giả định plugin và contract

Ví dụ dùng Jenkins LTS, Pipeline: Declarative, Git, JUnit, Pipeline: Basic Steps và **HTTP Request Plugin** đã được đội platform pin/review. HTTP Request Plugin phải hỗ trợ `authentication`, `uploadFile`, `validResponseCodes` và TLS verification trên version đang chạy; kiểm tra lại bằng **Pipeline Syntax → Snippet Generator**. `timestamps()` cần Timestamper.

Pipeline giả định stage package đã tạo đúng ba file trong `dist/release/`: `widget-1.4.0.tgz`, `widget-1.4.0.tgz.sha256` và `build-metadata.json`. Đây là contract output của dự án, không phải lệnh build chung cho mọi ngôn ngữ. Agent release đã có CA/network route tới repository; URL `.invalid` trong mẫu chỉ biểu diễn endpoint sandbox và không phải destination để chạy.

### Jenkinsfile dùng credential-aware step

Snippet archive evidence trước cleanup và chỉ publish khi Multibranch đang build `main`, không phải change request. `httpRequest(authentication: ...)` để plugin lấy credential trực tiếp từ Jenkins store; Jenkinsfile không mở secret vào shell/Groovy.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timestamps()
    timeout(time: 25, unit: 'MINUTES')
    buildDiscarder(logRotator(
      daysToKeepStr: '30', numToKeepStr: '30',
      artifactDaysToKeepStr: '14', artifactNumToKeepStr: '10'
    ))
  }

  environment {
    ARTIFACT_FILE = 'dist/release/widget-1.4.0.tgz'
    ARTIFACT_SHA256 = 'dist/release/widget-1.4.0.tgz.sha256'
    REPOSITORY_URL = 'https://repository.example.invalid/generic-releases/acme/widget/1.4.0/widget-1.4.0.tgz'
  }

  stages {
    stage('Checkout test package') {
      agent { label 'linux && artifact-builder' }
      steps {
        checkout scm
        sh '''#!/usr/bin/env sh
          set -eu
          # Contract dự án: test/package đã review tạo đúng output release.
          ./ci/test-and-package
          test -s "$ARTIFACT_FILE"
          test -s "$ARTIFACT_SHA256"
          test -s dist/release/build-metadata.json
          (cd dist/release && sha256sum -c widget-1.4.0.tgz.sha256)
        '''
        stash includes: 'dist/release/widget-1.4.0.tgz,dist/release/widget-1.4.0.tgz.sha256,dist/release/build-metadata.json',
          name: 'verified-release'
      }
      post {
        always {
          archiveArtifacts artifacts: 'dist/release/widget-1.4.0.tgz,dist/release/widget-1.4.0.tgz.sha256,dist/release/build-metadata.json',
            allowEmptyArchive: true, fingerprint: true
          deleteDir()
        }
      }
    }

    stage('Publish immutable release') {
      when {
        beforeAgent true
        allOf {
          branch 'main'
          not { changeRequest() }
        }
      }
      agent { label 'linux && trusted-release' }
      steps {
        unstash 'verified-release'
        sh '''#!/usr/bin/env sh
          set -eu
          (cd dist/release && sha256sum -c widget-1.4.0.tgz.sha256)
        '''
        script {
          def response = httpRequest(
            authentication: 'artifact-release-publisher',
            consoleLogResponseBody: false,
            contentType: 'APPLICATION_OCTETSTREAM',
            httpMode: 'PUT',
            ignoreSslErrors: false,
            timeout: 30,
            uploadFile: env.ARTIFACT_FILE,
            url: env.REPOSITORY_URL,
            validResponseCodes: '200:201,204'
          )
          echo "Đã nhận HTTP status ${response.status} cho path release bất biến."
        }
        archiveArtifacts artifacts: 'dist/release/widget-1.4.0.tgz.sha256,dist/release/build-metadata.json',
          allowEmptyArchive: false, fingerprint: true
      }
      post {
        cleanup { deleteDir() }
      }
    }
  }
}
```

`authentication` là credential ID, không phải token. `consoleLogResponseBody: false` giảm nguy cơ response nhạy cảm đi vào console. Step không thay policy repository: phải cấu hình server để từ chối ghi đè release, giới hạn service identity ở path release và ghi audit event. Với Maven/npm/OCI, thay stage publish bằng client/protocol tương ứng, giữ nguyên branch gate, identity least privilege, checksum/digest verification và evidence.

### Idempotency và failure

Không bọc `httpRequest` trong `retry` mặc định. Nếu timeout xảy ra sau khi server nhận bytes, retry mù có thể tạo conflict hoặc overwrite tùy backend. Quy trình an toàn là:

1. dùng API/client do repository hỗ trợ để đọc metadata của version/path;
2. đối chiếu size và SHA-256 với artifact của build;
3. chỉ đánh dấu idempotent khi metadata chứng minh cùng bytes;
4. nếu khác hoặc không đọc được, fail release và điều tra audit event.

`PUT` không tự mang nghĩa immutable trên mọi server. Object storage có thể cần conditional request/versioning/object lock; Nexus/Artifactory cần policy chặn redeploy; Maven/npm/OCI có rule format riêng. Không suy diễn một response HTTP xanh là policy release đã đúng.

## Retention lifecycle và khôi phục

Retention phải tách candidate, release, evidence và cache. Mỗi loại có owner, quota, legal/compliance hold và restore path riêng.

| Dữ liệu | Gợi ý lifecycle | Guard bắt buộc |
| --- | --- | --- |
| Candidate/RC | TTL ngắn sau khi hết review window | Không xóa candidate còn đang được promotion/job tham chiếu |
| Release immutable | Theo support, rollback và compliance policy | Không overwrite hoặc xóa khi manifest/consumer còn dùng |
| Checksum, SBOM, provenance/attestation | Ít nhất bằng release mà chúng mô tả | Giữ link/version/digest có thể truy vết |
| Jenkins archive/report | Ngắn hơn repository release, theo nhu cầu điều tra | Quota controller/Artifact Manager và ACL download |
| Build/dependency cache | TTL/quota theo trust tier | Không dùng làm nguồn phát hành hoặc dùng chung ghi với PR |

Trước cleanup repository, tạo inventory artifact đang được environment manifest, release train, legal hold và consumer pin tham chiếu. Kiểm thử restore/download trong sandbox: fetch đúng version, verify checksum, đọc metadata và xác nhận ACL. Xóa package production không phải cách giảm quota khẩn cấp; dừng promotion, mở change record và để owner repository quyết định.

## Lab local tái lập không cần repository

Lab tạo generic package, checksum và metadata dưới một directory `mktemp`. Thư mục `repository/` bên trong fixture chỉ mô phỏng namespace và retention local; không có HTTP, Nexus, Artifactory, cloud bucket, Jenkins controller hay credential. Chạy toàn bộ block trong một Bash shell, không chạy bằng `sudo`.

### Tạo và publish fixture

```bash
set -eu
umask 077

LAB_PARENT="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
LAB_PREFIX='jenkins-artifact-repository-lab.'
LAB_ROOT="$(mktemp -d "${LAB_PARENT}/${LAB_PREFIX}XXXXXX")"
LAB_MARKER="${LAB_ROOT}/.lab-owned-marker"

case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf '%s\n' 'Refuse: unexpected lab prefix.' >&2; exit 1 ;;
esac
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
printf '%s\n' 'jenkins-artifact-repository-lab-v1' > "$LAB_MARKER"

WORKSPACE="$LAB_ROOT/workspace"
REPOSITORY="$LAB_ROOT/repository"
RELEASE_DIR="$REPOSITORY/releases/acme/widget/1.4.0"
CANDIDATE_DIR="$REPOSITORY/candidates"
mkdir -p "$WORKSPACE/dist/release" "$RELEASE_DIR" "$CANDIDATE_DIR"

printf 'widget release built from synthetic local fixture\n' > "$WORKSPACE/dist/release/widget-1.4.0.tgz"
sha256sum "$WORKSPACE/dist/release/widget-1.4.0.tgz" \
  > "$WORKSPACE/dist/release/widget-1.4.0.tgz.sha256"
printf '%s\n' '{"source":"local-fixture","version":"1.4.0"}' \
  > "$WORKSPACE/dist/release/build-metadata.json"

publish_immutable() {
  source_file="$1"
  destination_file="$2"
  if test -e "$destination_file"; then
    printf '%s\n' 'Refuse: immutable destination already exists.' >&2
    return 1
  fi
  install -m 0644 "$source_file" "$destination_file"
}

publish_immutable \
  "$WORKSPACE/dist/release/widget-1.4.0.tgz" \
  "$RELEASE_DIR/widget-1.4.0.tgz"
install -m 0644 "$WORKSPACE/dist/release/widget-1.4.0.tgz.sha256" \
  "$RELEASE_DIR/widget-1.4.0.tgz.sha256"
install -m 0644 "$WORKSPACE/dist/release/build-metadata.json" \
  "$RELEASE_DIR/build-metadata.json"

# Candidate này mô phỏng artifact hết TTL; release không nằm dưới CANDIDATE_DIR.
printf 'expired candidate\n' > "$CANDIDATE_DIR/widget-1.4.1-rc.2.tgz"
touch -t 202001010000 "$CANDIDATE_DIR/widget-1.4.1-rc.2.tgz"
find "$CANDIDATE_DIR" -type f -name '*.tgz' -mtime +7 -delete

printf 'LAB_ROOT=%s\n' "$LAB_ROOT"
printf 'immutable local publish: PASS\n'
```

### Kiểm tra và cleanup có guard

Checksum file dùng path tuyệt đối của workspace lúc được tạo. Khi kiểm package ở repository, tính lại SHA-256 và so sánh digest thay vì gọi `sha256sum -c` từ directory khác.

```bash
set -eu
: "${LAB_ROOT:?Run the fixture block in this shell first}"
: "${LAB_MARKER:?Run the fixture block in this shell first}"
case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf '%s\n' 'Refuse: invalid lab prefix.' >&2; exit 1 ;;
esac
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
test "$(cat "$LAB_MARKER")" = 'jenkins-artifact-repository-lab-v1'

SOURCE_SHA="$(awk '{print $1}' "$WORKSPACE/dist/release/widget-1.4.0.tgz.sha256")"
REPOSITORY_SHA="$(sha256sum "$RELEASE_DIR/widget-1.4.0.tgz" | awk '{print $1}')"
test "$SOURCE_SHA" = "$REPOSITORY_SHA"
test -f "$RELEASE_DIR/build-metadata.json"
test ! -e "$CANDIDATE_DIR/widget-1.4.1-rc.2.tgz"
printf 'checksum and retention simulation: PASS\n'

cleanup_lab() {
  test -n "${LAB_ROOT:-}"
  test -n "${LAB_PARENT:-}"
  case "$LAB_ROOT" in
    "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
    *) printf '%s\n' 'Refuse: unexpected cleanup path.' >&2; return 1 ;;
  esac
  test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
  test -f "$LAB_MARKER"
  test "$(cat "$LAB_MARKER")" = 'jenkins-artifact-repository-lab-v1'
  cd / || return 1
  rm -rf -- "$LAB_ROOT"
}

cleanup_lab
test ! -e "$LAB_ROOT"
printf 'guarded cleanup: PASS\n'
```

Expected output có `immutable local publish: PASS`, `checksum and retention simulation: PASS` và `guarded cleanup: PASS`. Gọi `publish_immutable` lần hai với cùng destination phải fail; đó là mô phỏng policy release không ghi đè.

### Giới hạn của lab

Lab chỉ chứng minh shell tạo bytes, checksum, guard và lifecycle local. Nó không kiểm tra Jenkins Declarative syntax, HTTP Request Plugin, credential binding, TLS/CA, Nexus, Artifactory, S3-compatible API, object lock, repository audit, permission hay network. Các điều kiện runtime này cần controller/agent và repository sandbox riêng; không dùng token, namespace hoặc bucket production để xác minh ví dụ.

## Troubleshooting

| Triệu chứng | Evidence cần xem | Hướng xử lý an toàn |
| --- | --- | --- |
| Upload trả `401` hoặc `403` | Credential ID, folder/job scope, repository path permission, audit timestamp | Sửa đúng scope/quyền path; không in token hoặc cấp admin. |
| TLS/CA fail | Hostname, CA chain, proxy policy và agent truststore | Cài CA qua image/config đã review; không tắt TLS verification. |
| `409` hoặc package đã tồn tại | Version/path, size, checksum và repository metadata | Nếu bytes giống nhau, ghi idempotency evidence; nếu khác, fail và điều tra. |
| Timeout upload | Request ID, upload size, server audit và checksum | Đọc metadata trước retry; không retry mù thao tác không idempotent. |
| Consumer nhận bytes sai | Version/digest, SHA-256, mirror/cache metadata | Download lại từ version bất biến, verify checksum và dọn cache theo policy. |
| Jenkins disk đầy | Kích thước archive/stash, retention build và Artifact Manager backend | Thu hẹp archive, đặt quota/lifecycle; không xóa release repository để sửa disk controller. |
| Candidate bị dọn khi còn dùng | Promotion record, manifest reference, lifecycle rule và owner | Dừng cleanup, restore theo version/checksum, sửa guard và retention policy. |
| PR có thể publish | Branch policy, `when`, credential scope, agent/cache isolation | Gỡ credential khỏi lane PR, tách pool và review Multibranch trust policy. |

## Checklist tự kiểm tra

- [ ] Đã chọn đúng format/giao thức; generic HTTP không bị dùng thay Maven, npm hoặc OCI client.
- [ ] Publisher chỉ ghi namespace cần thiết; consumer read-only; credential có owner, expiry và rotation plan.
- [ ] TLS hostname/CA, proxy/egress, repository audit và quota đã được kiểm tra trên sandbox.
- [ ] Jenkinsfile không chứa token/password, URL query có secret, Groovy interpolation nhạy cảm, `set -x` hay archive workspace rộng.
- [ ] Pull request/fork không nhận credential publish, pool release, cache release ghi được hoặc quyền promotion.
- [ ] Release version/digest bất biến; server chặn overwrite; SHA-256, SBOM và metadata có thể truy vết.
- [ ] Promotion/rollback dùng cùng bytes/version/digest; không build lại hoặc dùng alias/tag di động.
- [ ] Retention tách candidate, release, evidence và cache; không xóa artifact còn được manifest, rollback hoặc hold tham chiếu.
- [ ] Upload timeout có runbook metadata/checksum/idempotency trước retry.
- [ ] Lab local đã in ba dòng pass; Jenkins/repository runtime chỉ được ghi nhận sau sandbox riêng.

## Nguồn chính thức và đọc tiếp

- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Jenkins Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/)
- [Credentials Binding Plugin](https://plugins.jenkins.io/credentials-binding/)
- [HTTP Request Plugin](https://plugins.jenkins.io/http_request/)
- [Jenkins Managing build records](https://www.jenkins.io/doc/book/managing/builds/)
- [Apache Maven deployment](https://maven.apache.org/guides/mini/guide-deployment-security-settings.html)
- [npm publish](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [OCI Image Format](https://github.com/opencontainers/image-spec)
- [Nexus Repository documentation](https://help.sonatype.com/en/repository-manager.html)
- [JFrog Artifactory documentation](https://jfrog.com/help/r/jfrog-artifactory-documentation)

<Cards>
  <Card title="Build Artifacts" href="/docs/jobs/artifacts" description="Phân biệt workspace, stash, archive và repository phát hành." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Thu hẹp scope credential và tránh lộ secret." />
  <Card title="Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Review Pipeline as Code, agent và branch trust." />
  <Card title="Kiểm thử Jenkinsfile" href="/docs/pipelines/testing" description="Phân biệt static check với controller sandbox runtime." />
  <Card title="Build container an toàn" href="/docs/delivery/container-build" description="Publish OCI digest, SBOM và attestation theo lane release." />
  <Card title="Bảo mật Agent và Plugin" href="/docs/security/agent-plugin-security" description="Tách pool pull request và release theo trust boundary." />
</Cards>
