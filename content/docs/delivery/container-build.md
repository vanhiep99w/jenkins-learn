---
title: "Build container an toàn với Jenkins"
description: "Xây dựng OCI image tái lập, quét và ký theo digest, rồi chỉ publish từ lane Jenkins được tin cậy."
---

<Callout type="info" title="Phạm vi và điều kiện">
  Hướng dẫn dùng Dockerfile/BuildKit, Jenkins Declarative Pipeline, Trivy, Syft và Cosign trên agent Linux do đội platform quản trị. Ví dụ không tạo registry, credential hay môi trường triển khai thật. Hãy kiểm tra version tool, plugin và policy registry trên sandbox trước khi áp dụng cho release.
</Callout>

Một container release đáng tin không chỉ là image build được. Nó cần liên kết được source revision, base image, dependency lock, kết quả test/scan, SBOM và chữ ký với **digest** bất biến mà registry đã xác nhận. Jenkins điều phối các gate đó; agent build, registry và identity ký mới là các ranh giới cần kiểm soát.

## Mục lục

- [Mục tiêu và ranh giới](#mục-tiêu-và-ranh-giới)
  - [Build context và identity image](#build-context-và-identity-image)
  - [Pull request và release build](#pull-request-và-release-build)
- [Dockerfile tái lập và hardening runtime](#dockerfile-tái-lập-và-hardening-runtime)
  - [Multi-stage Dockerfile](#multi-stage-dockerfile)
  - [Lockfile base image và cache](#lockfile-base-image-và-cache)
  - [Build context và secret](#build-context-và-secret)
- [Jenkins Pipeline có gate tin cậy](#jenkins-pipeline-có-gate-tin-cậy)
  - [Giả định tool plugin và agent](#giả-định-tool-plugin-và-agent)
  - [Jenkinsfile tham chiếu](#jenkinsfile-tham-chiếu)
  - [Giải thích thứ tự gate](#giải-thích-thứ-tự-gate)
- [SBOM scan ký và registry promotion](#sbom-scan-ký-và-registry-promotion)
  - [Evidence và policy](#evidence-và-policy)
  - [Digest promotion và retention](#digest-promotion-và-retention)
- [Lab local tái lập không publish](#lab-local-tái-lập-không-publish)
  - [Tạo fixture có guard](#tạo-fixture-có-guard)
  - [Kiểm tra tĩnh và runtime tùy chọn](#kiểm-tra-tĩnh-và-runtime-tùy-chọn)
  - [Cleanup có guard](#cleanup-có-guard)
- [Troubleshooting](#troubleshooting)
- [Trade-offs](#trade-offs)
- [Checklist và evidence mong đợi](#checklist-và-evidence-mong-đợi)
- [Nguồn chính thức và đọc tiếp](#nguồn-chính-thức-và-đọc-tiếp)

## Mục tiêu và ranh giới

Sau bài này, bạn có thể tạo một image OCI từ input đã khóa, đánh giá nó trên Jenkins và publish đúng bytes đã kiểm tra. Mục tiêu không phải biến Docker daemon thành quyền mặc định của CI, cũng không phải dùng tag dễ đọc thay cho identity phát hành.

### Build context và identity image

**Build context** là tập file client gửi cho builder khi chạy `docker buildx build .`. Context rộng làm chậm cache và có thể đưa `.git`, token, report hoặc khóa riêng vào layer/cache dù Dockerfile không chủ ý dùng chúng. `.dockerignore` là allowlist loại trừ quan trọng, nhưng không thay thế secret manager.

Tag như `registry.example.invalid/training/web-api:git-4f2a9c8e1b7d-build-17` thuận tiện để tìm build. Tag vẫn có thể bị ghi đè. Sau push, registry trả về manifest digest `sha256:...`; release, deploy và promotion phải dùng dạng `repository@sha256:...`. Lưu tag **và** digest trong evidence, nhưng chỉ dùng digest làm identity bất biến.

### Pull request và release build

| Đặc tính | Pull request hoặc fork không tin cậy | Release từ `main` được bảo vệ |
| --- | --- | --- |
| Agent | Pool ephemeral `untrusted-pr`, không Docker socket hoặc mount đặc quyền | Pool `trusted-release` tách biệt, toolchain đã review |
| Credential | Không registry-write, không key ký, không kubeconfig | Token chỉ ghi đúng repository; identity ký ngắn hạn |
| Cache | Cache đọc hoặc cache riêng theo trust tier | Cache có owner, quota và integrity policy riêng |
| Kết quả | Test, build cục bộ, scan và SBOM | Push digest, ký/attest, promotion metadata |
| Điều cấm | Publish, đổi tag release, deploy | Build lại source khi promotion hoặc dùng tag di động |

Label chỉ route scheduler, không phải ACL. Branch protection của SCM, quyền sửa Jenkinsfile/job, pool agent, egress, filesystem và credential scope phải cùng chặn đường đi từ code không tin cậy đến capability release. Không chạy workload này trên built-in node của controller.

<Callout type="warn" title="Docker daemon là ranh giới đặc quyền">
  Không mount `/var/run/docker.sock` vào Jenkins controller, và không dùng `docker:dind --privileged` cho pull request chỉ để build chạy. Nếu Docker daemon là lựa chọn bắt buộc, đặt nó trên VM hoặc pool builder tách biệt; coi quyền gọi daemon gần tương đương quyền quản trị host.
</Callout>

## Dockerfile tái lập và hardening runtime

### Multi-stage Dockerfile

Multi-stage build tách compiler, test dependency và cache khỏi image runtime. Dockerfile dưới dùng lockfile của Node, chỉ copy output cần chạy vào runtime, chạy user không phải root và khai báo filesystem runtime chỉ đọc ở tầng orchestration khi có thể.

```dockerfile
# syntax=docker/dockerfile:1.7.0
FROM node:22.14.0-alpine3.21 AS build
WORKDIR /app

# Hai file này là input dependency; sửa chúng sẽ làm cache layer mất hiệu lực.
COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./
RUN npm test && npm run build

FROM node:22.14.0-alpine3.21 AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

`npm ci` fail khi `package.json` và `package-lock.json` không khớp. Đó là signal bảo vệ tái lập; không thay nó bằng `npm install` trong CI. Nếu ứng dụng cần native module, kiểm tra ABI, architecture và shared library của runtime thay vì copy toàn bộ filesystem build.

Version tag trong ví dụ là input đọc được của con người. Với release, đội platform cần resolve tag đó thành `RepoDigest` từ registry được phê duyệt, review thay đổi và lưu reference `node:22.14.0-alpine3.21@sha256:…` trong catalog base image của tổ chức. Dockerfile, catalog digest và image agent phải đổi cùng change record; không pull lại một tag rồi giả định bytes chưa đổi.

### Lockfile base image và cache

Tái lập là kiểm soát input, không phải lời hứa hai lần build luôn có byte giống nhau. Ghi lại ít nhất source SHA, Dockerfile, base-image digest, architecture, BuildKit version, tool version và dependency lock hash. Để giảm chênh lệch, cố định timezone/locale khi build sinh output và tránh nhúng thời gian build ngẫu nhiên vào artifact nếu ứng dụng không cần.

BuildKit tăng tốc nhờ cache layer và mount cache. Cache là tối ưu hiệu năng, không phải source of truth:

```dockerfile
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci
```

Chỉ dùng mount này khi builder đã bật BuildKit và cache được phân vùng theo repository, lockfile, OS/architecture và trust tier. Pull request không được ghi vào cache release. Cache poisoning, base image cache cũ hoặc cache có quyền owner sai phải dẫn đến build sạch hoặc failure rõ ràng; không copy `node_modules` từ workspace cũ để cứu build.

### Build context và secret

Đặt `.dockerignore` cạnh Dockerfile và review nó như policy dữ liệu:

```gitignore
.git
node_modules
coverage
reports
.env
.env.*
*.pem
*.key
*.p12
npm-debug.log
image-*.txt
```

Secret đã từng đi qua `COPY`, `ARG`, `ENV` hoặc build log có thể còn trong layer, history hay remote cache. Với package registry riêng, dùng BuildKit secret mount trên builder được kiểm soát, scope ngắn và kiểm tra output/cache sau build. Không truyền token qua `--build-arg`, Dockerfile `ARG`, Dockerfile `ENV`, command line hay file nằm trong context.

Hardening runtime còn cần ở nơi chạy container: `runAsNonRoot`, `allowPrivilegeEscalation: false`, capability drop, `readOnlyRootFilesystem`, seccomp mặc định, resource limit và network policy theo workload. `USER node` trong image là một lớp; nó không thay thế cấu hình runtime, egress policy hay review quyền ghi volume.

## Jenkins Pipeline có gate tin cậy

### Giả định tool plugin và agent

Mẫu dưới cần Jenkins LTS với Pipeline: Declarative, Git, Credentials Binding, JUnit và Artifact Manager mặc định hoặc backend đã được phê duyệt. Directive `timestamps()` cần Timestamper. Xác nhận syntax/khả năng của plugin trong **Pipeline Syntax** trên controller đang chạy.

Agent `linux && container-builder` có Docker CLI với Buildx/BuildKit, Trivy `0.58.1`, Syft `1.20.0`, Cosign `2.4.1`, Git, shell POSIX và Python 3 đã được đội platform cài/pin. Agent `trusted-release` còn có identity keyless OIDC đã policy kiểm soát; registry phải hỗ trợ OCI referrers để giữ signature/attestation. `COSIGN_CERTIFICATE_IDENTITY` và `COSIGN_CERTIFICATE_OIDC_ISSUER` trong mẫu là policy allowlist, phải khớp chính xác certificate identity và issuer OIDC do platform phê duyệt. Dùng image agent hoặc catalog tool đã pin theo digest, không tải binary trong lúc release.

Mẫu dùng Docker CLI để dễ đọc. Rootless BuildKit hoặc remote builder có TLS/authorization là lựa chọn tốt hơn khi hạ tầng hỗ trợ. Không thêm socket host hay chế độ đặc quyền vào agent chỉ để khớp snippet.

### Jenkinsfile tham chiếu

Jenkinsfile tạo OCI archive và evidence trên lane build, sau đó chỉ lane release mới nhận credential push. Nó dùng tag duy nhất để push, đọc digest từ registry, rồi ký và attest **digest đó**. `build-metadata.json` là predicate riêng của Jenkins cho traceability; nó **không phải** SLSA Provenance v1 và không được diễn giải như chứng nhận SLSA. Các lệnh Cosign giả định keyless identity được cấp cho release agent; nếu registry không hỗ trợ referrers hoặc verification policy chưa sẵn sàng, stage release phải fail-closed.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 35, unit: 'MINUTES')
    buildDiscarder(logRotator(
      daysToKeepStr: '30', numToKeepStr: '30',
      artifactDaysToKeepStr: '14', artifactNumToKeepStr: '10'
    ))
  }

  environment {
    REGISTRY = 'registry.example.invalid'
    IMAGE_REPOSITORY = 'training/web-api'
    COSIGN_CERTIFICATE_IDENTITY = 'https://jenkins.example.invalid/oidc/trusted-release'
    COSIGN_CERTIFICATE_OIDC_ISSUER = 'https://issuer.example.invalid'
  }

  stages {
    stage('Checkout') {
      agent { label 'linux && container-builder' }
      steps {
        checkout scm
        sh '''#!/usr/bin/env sh
          set -eu
          git rev-parse --verify HEAD
          test -f Dockerfile
          test -f .dockerignore
          test -f package-lock.json
        '''
      }
    }

    stage('Build test scan') {
      agent { label 'linux && container-builder' }
      steps {
        checkout scm
        sh '''#!/usr/bin/env sh
          set -eu
          SHORT_SHA="$(git rev-parse --short=12 HEAD)"
          IMAGE_TAG="${REGISTRY}/${IMAGE_REPOSITORY}:git-${SHORT_SHA}-build-${BUILD_NUMBER}"
          printf '%s\n' "$IMAGE_TAG" > image-tag.txt

          docker buildx version
          docker buildx build --load --pull=false --tag "$IMAGE_TAG" .
          mkdir -p reports evidence
          trivy image --version
          trivy image --exit-code 1 --severity HIGH,CRITICAL \
            --ignore-unfixed --format json --output reports/trivy.json "$IMAGE_TAG"
          syft "$IMAGE_TAG" --output cyclonedx-json > reports/sbom.cdx.json
          python3 - <<'PY'
import json, os, subprocess
revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
metadata = {
  'schema': 'https://jenkins.io/attestations/container-build/v1',
  'sourceRevision': revision,
  'buildInvocationId': os.environ['BUILD_TAG'],
}
with open('evidence/build-metadata.json', 'w', encoding='utf-8') as output:
    json.dump(metadata, output, sort_keys=True)
PY
          docker image save "$IMAGE_TAG" --output image.tar
          sha256sum image.tar > evidence/image.tar.sha256
        '''
        stash includes: 'image-tag.txt,image.tar,reports/*.json,evidence/*.json,evidence/*.sha256',
          name: 'scanned-image', useDefaultExcludes: true
      }
      post {
        always {
          archiveArtifacts artifacts: 'reports/*.json,evidence/*.json,evidence/*.sha256',
            allowEmptyArchive: true, fingerprint: true
          deleteDir()
        }
      }
    }

    stage('Push digest') {
      when {
        beforeAgent true
        allOf {
          branch 'main'
          not { changeRequest() }
        }
      }
      agent { label 'linux && container-builder && trusted-release' }
      steps {
        unstash 'scanned-image'
        withCredentials([
          usernamePassword(
            credentialsId: 'registry-publish-training-web-api',
            usernameVariable: 'REGISTRY_USER',
            passwordVariable: 'REGISTRY_PASSWORD'
          )
        ]) {
          sh '''#!/usr/bin/env sh
            set -eu
            set +x
            IMAGE_TAG="$(cat image-tag.txt)"
            docker image load --input image.tar
            printf '%s' "$REGISTRY_PASSWORD" | docker login "$REGISTRY" \
              --username "$REGISTRY_USER" --password-stdin
            docker push "$IMAGE_TAG"
            DIGEST="$(docker buildx imagetools inspect "$IMAGE_TAG" --format '{{.Digest}}')"
            test -n "$DIGEST"
            printf '%s@%s\n' "${REGISTRY}/${IMAGE_REPOSITORY}" "$DIGEST" > image-digest.txt
            docker logout "$REGISTRY"
          '''
        }
        archiveArtifacts artifacts: 'image-tag.txt,image-digest.txt',
          allowEmptyArchive: false, fingerprint: true
        stash includes: 'image-digest.txt,reports/sbom.cdx.json,evidence/build-metadata.json',
          name: 'registry-digest'
      }
      post {
        cleanup { deleteDir() }
      }
    }

    stage('Sign and attest digest') {
      when {
        beforeAgent true
        allOf {
          branch 'main'
          not { changeRequest() }
        }
      }
      agent { label 'linux && cosign && trusted-release' }
      steps {
        unstash 'registry-digest'
        sh '''#!/usr/bin/env sh
          set -eu
          set +x
          IMAGE_REF="$(cat image-digest.txt)"
          cosign version
          cosign sign --yes "$IMAGE_REF"
          cosign attest --yes --type cyclonedx \
            --predicate reports/sbom.cdx.json "$IMAGE_REF"
          cosign attest --yes --type https://jenkins.io/attestations/container-build/v1 \
            --predicate evidence/build-metadata.json "$IMAGE_REF"
          cosign verify \
            --certificate-identity "$COSIGN_CERTIFICATE_IDENTITY" \
            --certificate-oidc-issuer "$COSIGN_CERTIFICATE_OIDC_ISSUER" \
            "$IMAGE_REF" > cosign-signature-verify.txt
          cosign verify-attestation --type cyclonedx \
            --certificate-identity "$COSIGN_CERTIFICATE_IDENTITY" \
            --certificate-oidc-issuer "$COSIGN_CERTIFICATE_OIDC_ISSUER" \
            "$IMAGE_REF" > cosign-sbom-attestation-verify.txt
          cosign verify-attestation --type https://jenkins.io/attestations/container-build/v1 \
            --certificate-identity "$COSIGN_CERTIFICATE_IDENTITY" \
            --certificate-oidc-issuer "$COSIGN_CERTIFICATE_OIDC_ISSUER" \
            "$IMAGE_REF" > cosign-build-metadata-attestation-verify.txt
        '''
        archiveArtifacts artifacts: 'image-digest.txt,cosign-*-verify.txt',
          allowEmptyArchive: false, fingerprint: true
      }
      post {
        cleanup { deleteDir() }
      }
    }
  }
}
```

### Giải thích thứ tự gate

`checkout scm` xuất hiện ở các stage có agent khác vì workspace không được giả định chia sẻ. Stage build không bind credential publish, nên có thể chạy cho pull request. Trivy chặn severity theo policy; Syft tạo SBOM; OCI archive giúp stage release nhận đúng image local đã scan. Với image lớn, thay `stash` bằng Artifact Manager hoặc kho tạm đã review, đồng thời kiểm checksum sau khi nhận.

`when { branch 'main'; not { changeRequest() } }` phải được dùng trong Multibranch Pipeline và đi cùng branch protection. Push xảy ra sau gate trust này. Ký và attestation phải chạy **sau** push vì digest registry là subject cần ký; stage đó chỉ chấp nhận digest vừa ghi, không tính lại từ tag. Nếu signing/attestation fail, release không được promotion dù bytes đã ở repository candidate; policy registry cần giữ candidate không được triển khai cho tới khi verification pass.

Credential registry chỉ sống trong closure push, dùng `--password-stdin`, không được đưa vào argv, URL hoặc console. Không thêm `set -x`, dump environment hay archive toàn workspace. Cosign keyless cần issuer/subject, Fulcio/Rekor và verification policy do tổ chức phê duyệt. `cosign verify` và từng `cosign verify-attestation` đều ràng buộc certificate identity/issuer; thay hai giá trị allowlist bằng policy runtime đã review, không dùng key file trong Git hay biến môi trường dài hạn.

## SBOM scan ký và registry promotion

### Evidence và policy

SBOM là inventory component/layer, không phải kết luận không có lỗ hổng. Vulnerability scan cũng là ảnh chụp database ở thời điểm scan. Một policy thực dụng có owner, severity threshold, exception có lý do/ngày hết hạn và hành động khi CVE mới xuất hiện:

1. scan dependency và Dockerfile trước build khi dự án có tool phù hợp;
2. scan image local để chặn sớm;
3. scan lại digest registry vì đó là artifact sẽ phân phối;
4. verify Cosign signature, issuer/subject và attestation trước deploy;
5. theo dõi CVE sau release, rebuild và revoke/promotion block khi cần.

Evidence tối thiểu gồm source revision, base digest, tag, registry digest, Trivy report, CycloneDX SBOM, predicate build metadata riêng của Jenkins, kết quả verify signature và từng attestation, tool/image-agent version và policy decision. Predicate riêng chỉ tạo traceability; nó không phải SLSA Provenance v1. Archive Jenkins chỉ phục vụ điều tra ngắn hạn; không archive credential, Docker config, cache hay toàn bộ workspace.

### Digest promotion và retention

Promotion không rebuild source và không retag rồi deploy. Copy hoặc promote cùng manifest digest từ repository candidate sang release theo API/registry policy được phê duyệt, sau đó xác minh digest đích không đổi. Environment manifest phải ghi `repository@sha256:...`, cùng revision, SBOM/attestation reference và approval record.

Tách lifecycle cho từng loại dữ liệu:

| Dữ liệu | Nơi giữ chính | Quy tắc retention |
| --- | --- | --- |
| OCI manifest/layer release | Registry | Version bất biến; giữ theo rollback và compliance policy |
| Candidate không được promote | Registry | TTL ngắn, chỉ xóa khi không còn evidence/consumer |
| SBOM, build metadata, signature | Registry referrer hoặc store evidence | Giữ ít nhất bằng artifact mà chúng chứng minh |
| Jenkins report/archive | Jenkins hoặc Artifact Manager | Ngắn hơn release; quota và backup có owner |
| Cache BuildKit/dependency | Builder cache phân tier | TTL/quota, không là evidence hay source phát hành |

Không để cleanup registry xóa digest vẫn được manifest môi trường, attestation hoặc rollback plan tham chiếu. Không xóa build record để che lỗ hổng; dùng retention có owner, legal/compliance policy và thử khôi phục evidence trên sandbox.

## Lab local tái lập không publish

Lab chỉ tạo fixture dưới thư mục tạm, kiểm tra cấu trúc và tùy chọn build vào Docker daemon local. Nó không login, không push registry, không ký, không deploy và không dùng credential. Docker/Jenkins runtime là tùy chọn: static check pass không chứng minh daemon, plugin, registry, OIDC hay policy production hoạt động.

### Tạo fixture có guard

Chạy các khối trong **cùng một shell**. Prefix, parent và marker liên kết cleanup với directory vừa tạo; không thay `LAB_ROOT` bằng path tự gõ.

```bash
set -eu
umask 077

LAB_PARENT="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
LAB_PREFIX='jenkins-container-build-lab.'
LAB_ROOT="$(mktemp -d "${LAB_PARENT}/${LAB_PREFIX}XXXXXX")"
LAB_MARKER="${LAB_ROOT}/.lab-owned-marker"

case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf '%s\n' 'Refuse: unexpected lab prefix.' >&2; exit 1 ;;
esac
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
printf '%s\n' 'jenkins-container-build-lab-v1' > "$LAB_MARKER"

mkdir -p "$LAB_ROOT/app/src"
cat > "$LAB_ROOT/app/package.json" <<'EOF'
{"name":"container-lab","version":"1.0.0","scripts":{"test":"node --test","build":"mkdir -p dist && cp src/server.js dist/server.js"}}
EOF
cat > "$LAB_ROOT/app/package-lock.json" <<'EOF'
{"name":"container-lab","version":"1.0.0","lockfileVersion":3,"requires":true,"packages":{"":{"name":"container-lab","version":"1.0.0"}}}
EOF
printf 'console.log("container lab")\n' > "$LAB_ROOT/app/src/server.js"
cat > "$LAB_ROOT/app/Dockerfile" <<'EOF'
FROM node:22.14.0-alpine3.21
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
USER node
CMD ["node", "src/server.js"]
EOF
cat > "$LAB_ROOT/app/.dockerignore" <<'EOF'
.git
node_modules
.env
.env.*
*.pem
*.key
EOF
printf 'LAB_ROOT=%s\n' "$LAB_ROOT"
```

### Kiểm tra tĩnh và runtime tùy chọn

Static check không cần Docker, network hay Jenkins. Nó chứng minh fixture có các guard và file policy mong đợi, không chứng minh image sẽ chạy.

```bash
set -eu
: "${LAB_ROOT:?Run the fixture block in this shell first}"
: "${LAB_MARKER:?Run the fixture block in this shell first}"
case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf '%s\n' 'Refuse: invalid lab prefix.' >&2; exit 1 ;;
esac
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
test "$(cat "$LAB_MARKER")" = 'jenkins-container-build-lab-v1'
test -f "$LAB_ROOT/app/Dockerfile"
grep -Fqx '.env' "$LAB_ROOT/app/.dockerignore"
grep -Fqx 'USER node' "$LAB_ROOT/app/Dockerfile"
python3 - <<'PY' "$LAB_ROOT/app/package-lock.json"
import json
import sys
with open(sys.argv[1], encoding='utf-8') as source:
    assert json.load(source)['lockfileVersion'] == 3
print('static container fixture validation: PASS')
PY
```

Nếu Docker daemon local đã được owner sandbox cho phép, block dưới chỉ build image với tag local. Nó không push. Docker build chứng minh daemon và Dockerfile cụ thể hoạt động; nó không chứng minh Jenkins, scan database, registry digest, signing hay runtime hardening trên orchestration.

```bash
if command -v docker >/dev/null 2>&1; then
  docker version
  DOCKER_BUILDKIT=1 docker build --pull=false \
    --tag container-build-lab:1.0.0 "$LAB_ROOT/app"
  docker image inspect container-build-lab:1.0.0 --format '{{.Id}}'
else
  printf '%s\n' 'Docker không có; chỉ static validation đã chạy.'
fi
```

### Cleanup có guard

Chỉ cleanup sau khi đã lưu output cần điều tra. Hàm từ chối xóa nếu parent, prefix hoặc marker không khớp; nó không nhận path từ người dùng và không động đến image, volume, registry hay workspace Jenkins.

```bash
cleanup_lab() {
  test -n "${LAB_ROOT:-}"
  test -n "${LAB_PARENT:-}"
  case "$LAB_ROOT" in
    "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
    *) printf '%s\n' 'Refuse: unexpected cleanup path.' >&2; return 1 ;;
  esac
  test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
  test -f "$LAB_MARKER"
  test "$(cat "$LAB_MARKER")" = 'jenkins-container-build-lab-v1'
  find "$LAB_ROOT" -depth -delete
}
cleanup_lab
test ! -e "$LAB_ROOT"
```

## Troubleshooting

| Triệu chứng | Evidence cần xem | Hướng xử lý an toàn |
| --- | --- | --- |
| Context lớn bất thường | Docker transfer size, `.dockerignore`, file thực sự cần | Thu nhỏ context và kiểm secret/cache; không bỏ `.dockerignore`. |
| `npm ci` fail | Diff `package.json`/lockfile, Node/npm version | Sửa lockfile bằng đúng manager rồi review; không đổi CI sang install tự do. |
| Cache cho output khác clone sạch | Cache key, owner, trust tier, base digest | Invalidate cache theo key và build sạch; không chia cache ghi giữa PR/release. |
| Build chờ agent | Queue reason, label, executor, agent toolchain | Sửa hoặc provision đúng pool; không chuyển thành `agent any` hay controller. |
| Scan fail | Trivy JSON, base digest, policy/exception expiry | Vá hoặc rebuild; exception cần owner và hạn, không tắt exit code. |
| Registry `denied` | Repository path, TLS, scope token, branch gate | Giới hạn token đúng repository và dùng lane release; không in token hoặc cấp admin. |
| Digest không đọc được | `docker push` output, Buildx version, registry manifest API | Kiểm version/registry sandbox; không deploy tag có thể đổi. |
| Cosign verify fail | Digest, registry referrer support, issuer/subject policy, clock | Dừng promotion, đối chiếu policy và trust root; không bỏ qua verify. |
| Image chạy root hoặc ghi filesystem | `docker image inspect`, runtime security context, log permission | Sửa Dockerfile/runtime context, chỉ mount writable path tối thiểu khi bắt buộc. |

## Trade-offs

- **Docker daemon riêng và rootless BuildKit:** daemon quen thuộc nhưng mở boundary đặc quyền lớn. Rootless/remote builder giảm quyền host, đổi lại cần provisioning, storage và observability riêng.
- **Cache nhanh và clone sạch:** cache giảm chi phí nhưng tăng nguy cơ poisoning, drift và quota. Lockfile, digest và cache partition là control correctness; clean build định kỳ là control phát hiện drift.
- **Scan trước và sau push:** scan local chặn sớm; scan digest registry phản ánh artifact phân phối. Môi trường rủi ro cao cần cả hai cùng admission verification.
- **Tag và digest:** tag dễ vận hành; digest bất biến. Giữ mapping cả hai cho con người, nhưng promotion/deploy chỉ nhận digest.
- **Jenkins archive và registry:** archive tốt cho report theo build; registry là nguồn image distribution. Retention hai nơi phải được thiết kế riêng để controller không thành kho artifact dài hạn.

## Checklist và evidence mong đợi

### Checklist trước release

- [ ] Dockerfile dùng multi-stage khi phù hợp, dependency lock và base image version/digest đã review.
- [ ] Build context hẹp; `.dockerignore` chặn secret, cache, report và source không cần thiết.
- [ ] Agent/image/toolchain được pin; BuildKit cache có key, quota và trust boundary.
- [ ] Runtime không root, không privileged, không Docker socket trên controller; capability/filesystem/network được harden ở runtime.
- [ ] Test, scan threshold, exception expiry, SBOM và build metadata có policy/owner rõ; metadata riêng không bị gọi là SLSA Provenance v1.
- [ ] Pull request/fork không có registry write, key ký, kubeconfig, cache release ghi được hoặc agent release.
- [ ] Registry credential có quyền tối thiểu, binding ngắn, stdin login; secret không đi vào argv/log/artifact.
- [ ] Release chỉ sau branch/trust gate, registry digest đã archive; Cosign signature và từng attestation đã verify với certificate identity/issuer policy.
- [ ] Promotion chuyển cùng digest, không rebuild; manifest môi trường không dùng tag di động.
- [ ] Registry, evidence và Jenkins archive có retention, quota, rollback và restore policy.

### Evidence mong đợi

Một release pass cung cấp source SHA, `image-tag.txt`, `image-digest.txt`, JSON scan, CycloneDX SBOM, `build-metadata.json`, output verify chữ ký và hai attestation Cosign, tool/version manifest cùng policy decision đã redact. Build metadata này không phải SLSA Provenance v1. Một pull request pass chỉ có evidence build/test/scan không nhạy cảm; không có registry push, signature hay deploy record.

Lab static phải in `static container fixture validation: PASS`. Nếu Docker runtime không có hoặc chưa được sandbox cho phép, bằng chứng đúng là static pass và trạng thái Docker chưa chạy. Tương tự, linter Jenkins, registry push, OIDC signing và runtime orchestration chỉ được khẳng định sau khi lane sandbox có plugin, agent, credential vô hại và policy tương ứng.

## Nguồn chính thức và đọc tiếp

- [Docker Build context](https://docs.docker.com/build/concepts/context/)
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/)
- [Docker build secrets](https://docs.docker.com/build/building/secrets/)
- [Docker Build cache](https://docs.docker.com/build/cache/)
- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Jenkins Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/)
- [Jenkins Controller isolation](https://www.jenkins.io/doc/book/security/controller-isolation/)
- [Trivy image scanning](https://trivy.dev/v0.58/docs/target/container_image/)
- [Syft documentation](https://github.com/anchore/syft)
- [Sigstore Cosign attestations](https://docs.sigstore.dev/cosign/verifying/attestations/)

<Cards>
  <Card title="Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Kiểm tra syntax, agent và Pipeline as Code trước runtime." />
  <Card title="Kiểm thử Jenkinsfile" href="/docs/pipelines/testing" description="Phân biệt lint, mock và controller sandbox." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Bind credential release trong scope ngắn và không lộ secret." />
  <Card title="Build Artifacts" href="/docs/jobs/artifacts" description="Thiết kế archive, fingerprint, retention và artifact storage." />
  <Card title="Bảo mật Agent và Plugin" href="/docs/security/agent-plugin-security" description="Tách pool pull request, CI và release theo trust boundary." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Dựng controller lab mà không đưa Docker socket vào controller." />
</Cards>
