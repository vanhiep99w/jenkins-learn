---
title: "Docker Registry"
description: "Xây dựng, xác thực và promote OCI image qua registry bằng Jenkins với digest bất biến và quyền tối thiểu."
---

<Callout type="info" title="Phạm vi và giả định">
  Hướng dẫn này dùng Docker CLI/Buildx, Jenkins Declarative Pipeline và Credentials Binding. Registry có thể là Docker Distribution hoặc một OCI registry tương thích, nhưng endpoint, API version, referrer, retention và immutability là capability runtime cần xác minh. Ví dụ không tạo credential thật và không được hiểu là đã chạy trên Jenkins hoặc registry của bạn.
</Callout>

Docker registry là nơi phân phối manifest và layer OCI. Jenkins nên tạo image, kiểm thử, quét và phát hành một reference bất biến; registry áp dụng authorization, retention và audit; hệ thống deploy chỉ tiêu thụ digest đã được xác minh. Tag giúp con người tìm build, nhưng không phải identity release vì nó có thể đổi đích.

## Mục lục

- [Mục tiêu và mô hình định danh](#mục-tiêu-và-mô-hình-định-danh)
  - [Tag là pointer digest là release](#tag-là-pointer-digest-là-release)
  - [Ranh giới pull request và release](#ranh-giới-pull-request-và-release)
- [Registry credential và quyền tối thiểu](#registry-credential-và-quyền-tối-thiểu)
  - [Scope credential và Docker login](#scope-credential-và-docker-login)
  - [Jenkinsfile push tham khảo](#jenkinsfile-push-tham-khảo)
- [BuildKit input cache và supply chain](#buildkit-input-cache-và-supply-chain)
  - [Pin input và giới hạn build context](#pin-input-và-giới-hạn-build-context)
  - [Cache và secret mount](#cache-và-secret-mount)
  - [SBOM provenance chữ ký và verify](#sbom-provenance-chữ-ký-và-verify)
- [Image promotion không rebuild](#image-promotion-không-rebuild)
  - [Copy cùng manifest digest](#copy-cùng-manifest-digest)
  - [Audit retention và rollback](#audit-retention-và-rollback)
- [Lab local disposable](#lab-local-disposable)
  - [Static fixture có guard](#static-fixture-có-guard)
  - [Registry loopback tùy chọn](#registry-loopback-tùy-chọn)
  - [Cleanup và bằng chứng](#cleanup-và-bằng-chứng)
- [Troubleshooting](#troubleshooting)
- [Checklist trước release](#checklist-trước-release)
- [Nguồn chính thức](#nguồn-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mục tiêu và mô hình định danh

Sau bài này, bạn có thể thiết kế lane Jenkins sao cho build không tin cậy không có quyền ghi registry, release chỉ phát hành digest đã qua gate, và promotion chuyển nguyên manifest thay vì build lại source. Bạn cũng có thể nối được source revision, tag, digest, SBOM, chữ ký, attestation và actor của lần promote mà không lưu password trong log hay artifact.

### Tag là pointer digest là release

Một OCI image có dạng `repository:tag` hoặc `repository@sha256:digest`. Tag như `git-4f2a9c8e1b7d-build-42` có ích cho điều tra và có thể là tag push duy nhất của build. Registry trả digest manifest sau push. Mọi deployment, promotion và rollback phải dùng reference dạng `repository@sha256:...`.

| Reference | Dùng cho | Không được dùng làm |
| --- | --- | --- |
| `registry.training.invalid/team/catalog:git-4f2a9c8e1b7d-build-42` | Tìm build, đọc log push và map source revision | Input deploy hoặc rollback duy nhất |
| `registry.training.invalid/team/catalog@sha256:7f83b1657ff1fc53b92dc18148a1d65dfa135014e6e2f9bc4e5f7b7c7a0b42a9` | Release record, manifest môi trường, verify và promotion | Giá trị tự gõ khi chưa lấy từ registry |
| Base image digest | Input Dockerfile/build đã review | Tag di động trong release build |

Digest phải được lấy từ registry response hoặc inspect của exact tag vừa push, rồi ghi cùng source SHA và registry/repository logical name. Digest định danh một manifest; image index đa nền tảng cũng có digest riêng. Nếu policy phát hành nhiều architecture, ghi rõ index digest hay per-platform manifest digest mà runtime sẽ resolve.

### Ranh giới pull request và release

| Lane | Nguồn và agent | Registry capability | Kết quả |
| --- | --- | --- | --- |
| PR/fork không tin cậy | Pool ephemeral riêng, không Docker socket đặc quyền hoặc credential release | Không login, không push, không ký | Test, lint Dockerfile, build local/scan nếu builder an toàn |
| Branch đã review | Pool CI tách biệt | Có thể pull dependency/read cache theo allowlist | Evidence không nhạy cảm, không release write mặc định |
| `main` hoặc release tag được bảo vệ | Agent release có toolchain/identity đã duyệt | Token chỉ ghi repository candidate; quyền ký scope ngắn | Push, lấy digest, SBOM/provenance, ký/verify |

Branch protection, Jenkins job authorization, agent isolation, egress và credential scope phải cùng được kiểm tra. Label `trusted-release` chỉ là scheduler route, không phải security boundary. Xem [Bảo mật Agent và Plugin](/docs/security/agent-plugin-security) để đặt pool và capability theo trust tier.

## Registry credential và quyền tối thiểu

### Scope credential và Docker login

Tách credential đọc base image, credential push candidate và quyền copy/promote release. Token push chỉ cần repository/path cần ghi; không cần xóa repository, quản trị registry hay quyền cluster. Đặt credential trong folder/job release hẹp nhất, có owner, expiry/rotation và audit tại registry.

Dùng `withCredentials` gần lệnh cần quyền. Docker CLI hỗ trợ `--password-stdin`, nên password đi qua stdin thay vì argv. Docker credential helper có thể lưu credential qua OS keychain hoặc secret store do agent quản trị, nhưng không thay Jenkins binding, token scope hay cleanup; xác minh helper/backend trên exact agent image trước khi dựa vào nó. Không bật `set -x`, không dùng URL có `user:password`, không `echo` environment, không archive `$DOCKER_CONFIG` và logout trước khi rời agent. Masking Jenkins giảm lộ tình cờ, không ngăn code đã nhận secret gửi dữ liệu ra network.

```groovy
withCredentials([
  usernamePassword(
    credentialsId: 'registry-push-catalog-candidate',
    usernameVariable: 'REGISTRY_USER',
    passwordVariable: 'REGISTRY_PASSWORD'
  )
]) {
  sh '''#!/bin/sh
    set -eu
    set +x
    printf '%s' "$REGISTRY_PASSWORD" | docker login "$REGISTRY_HOST" \
      --username "$REGISTRY_USER" --password-stdin
    trap 'docker logout "$REGISTRY_HOST" >/dev/null 2>&1 || true' EXIT
    docker push "$IMAGE_TAG"
  '''
}
```

Credential ID chỉ là metadata; nó không phải secret. `REGISTRY_HOST` và `IMAGE_TAG` phải đến từ allowlist/script đã review, không từ parameter tùy ý. Nếu agent crash, Docker config có thể còn trên filesystem; ưu tiên agent ephemeral hoặc `DOCKER_CONFIG` temporary do job tạo trong workspace tin cậy, dọn sau stage và không đưa path/config đó vào archive.

### Jenkinsfile push tham khảo

Pipeline dưới dùng CLI steps chuẩn thay vì bịa một Docker Registry Pipeline step. Nó giả định Jenkins có Pipeline: Declarative, Git, Credentials Binding và agent Linux có Docker CLI/Buildx. Buildx, registry, token scope, artifact store, SBOM/provenance và Cosign là prerequisites runtime, cần test trên sandbox.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    disableConcurrentBuilds()
    timeout(time: 40, unit: 'MINUTES')
  }

  environment {
    REGISTRY_HOST = 'registry.training.invalid'
    IMAGE_REPOSITORY = 'team/catalog'
  }

  stages {
    stage('Build, test, scan, and transfer exact image') {
      agent { label 'linux && untrusted-container-builder' }
      steps {
        checkout scm
        sh '''#!/bin/sh
          set -eu
          SOURCE_REVISION="$(git rev-parse --verify HEAD)"
          SOURCE_SHORT="$(git rev-parse --short=12 HEAD)"
          BUILD_IMAGE="catalog-ci:${BUILD_NUMBER}"
          export BUILD_IMAGE
          test -f Dockerfile
          test -f .dockerignore
          docker buildx version
          docker buildx build --load --pull=false --tag "$BUILD_IMAGE" .
          ./ci/test-container "$BUILD_IMAGE"
          mkdir -p reports transfer release
          ./ci/scan-container "$BUILD_IMAGE" --output reports/scan.json
          ./ci/generate-sbom "$BUILD_IMAGE" --output reports/sbom.cdx.json
          IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$BUILD_IMAGE")"
          case "$IMAGE_ID" in sha256:[0-9a-f][0-9a-f]*) ;; *) exit 1 ;; esac
          export SOURCE_REVISION SOURCE_SHORT BUILD_IMAGE IMAGE_ID
          docker image save --output transfer/catalog-image.tar "$BUILD_IMAGE"
          sha256sum transfer/catalog-image.tar > transfer/catalog-image.tar.sha256
          python3 - <<'PY'
import json
import os
with open('release/tested-image.json', 'w', encoding='utf-8') as output:
    json.dump({
        'sourceRevision': os.environ['SOURCE_REVISION'],
        'sourceShort': os.environ['SOURCE_SHORT'],
        'buildImage': os.environ['BUILD_IMAGE'],
        'imageId': os.environ['IMAGE_ID'],
    }, output, sort_keys=True)
PY
        '''
        stash name: 'tested-oci-image',
          includes: 'transfer/catalog-image.tar,transfer/catalog-image.tar.sha256,release/tested-image.json,reports/scan.json,reports/sbom.cdx.json',
          useDefaultExcludes: true
      }
    }

    stage('Push exact tested image') {
      when {
        beforeAgent true
        allOf {
          branch 'main'
          not { changeRequest() }
        }
      }
      agent { label 'linux && trusted-release-builder' }
      steps {
        unstash 'tested-oci-image'
        sh '''#!/bin/sh
          set -eu
          sha256sum --check transfer/catalog-image.tar.sha256
          docker image load --input transfer/catalog-image.tar
          SOURCE_SHORT="$(python3 - <<'PY'
import json
value = json.load(open('release/tested-image.json', encoding='utf-8'))['sourceShort']
assert len(value) == 12 and all(c in '0123456789abcdef' for c in value)
print(value)
PY
)"
          BUILD_IMAGE="$(python3 - <<'PY'
import json
value = json.load(open('release/tested-image.json', encoding='utf-8'))['buildImage']
assert value.startswith('catalog-ci:')
print(value)
PY
)"
          EXPECTED_IMAGE_ID="$(python3 - <<'PY'
import json
value = json.load(open('release/tested-image.json', encoding='utf-8'))['imageId']
assert value.startswith('sha256:')
print(value)
PY
)"
          ACTUAL_IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$BUILD_IMAGE")"
          test "$ACTUAL_IMAGE_ID" = "$EXPECTED_IMAGE_ID"
          IMAGE_TAG="${REGISTRY_HOST}/${IMAGE_REPOSITORY}:git-${SOURCE_SHORT}-build-${BUILD_NUMBER}"
          docker image tag "$EXPECTED_IMAGE_ID" "$IMAGE_TAG"
          printf '%s\n' "$EXPECTED_IMAGE_ID" > release/expected-image-id.txt
          printf '%s\n' "$IMAGE_TAG" > release/image-tag.txt
        '''
        withCredentials([
          usernamePassword(
            credentialsId: 'registry-push-catalog-candidate',
            usernameVariable: 'REGISTRY_USER',
            passwordVariable: 'REGISTRY_PASSWORD'
          )
        ]) {
          sh '''#!/bin/sh
            set -eu
            set +x
            EXPECTED_IMAGE_ID="$(cat release/expected-image-id.txt)"
            IMAGE_TAG="$(cat release/image-tag.txt)"
            case "$EXPECTED_IMAGE_ID" in sha256:[0-9a-f][0-9a-f]*) ;; *) exit 1 ;; esac
            case "$IMAGE_TAG" in "${REGISTRY_HOST}/${IMAGE_REPOSITORY}":git-*) ;; *) exit 1 ;; esac
            test "$(docker image inspect --format '{{.Id}}' "$IMAGE_TAG")" = "$EXPECTED_IMAGE_ID"
            printf '%s' "$REGISTRY_PASSWORD" | docker login "$REGISTRY_HOST" \
              --username "$REGISTRY_USER" --password-stdin
            trap 'docker logout "$REGISTRY_HOST" >/dev/null 2>&1 || true' EXIT
            docker push "$IMAGE_TAG"
            DIGEST="$(docker buildx imagetools inspect "$IMAGE_TAG" --format '{{.Digest}}')"
            case "$DIGEST" in sha256:[0-9a-f][0-9a-f]*) ;; *) exit 1 ;; esac
            mkdir -p release
            printf '%s@%s\n' "${REGISTRY_HOST}/${IMAGE_REPOSITORY}" "$DIGEST" \
              > release/image-digest.txt
          '''
        }
        archiveArtifacts artifacts: 'release/image-digest.txt,release/tested-image.json,reports/scan.json,reports/sbom.cdx.json',
          allowEmptyArchive: false, fingerprint: true
      }
    }
  }
}
```

Stage đầu build một lần, test/scan chính image đã load và stash tar, checksum, image ID, source revision cùng evidence. Stage release không `checkout scm` và không gọi `docker build`; nó verify checksum, load đúng tar, so image ID với metadata rồi mới tag/push. Digest registry được lấy sau push của image ID đã test. Điều kiện `main` chỉ hữu ích khi đây là Multibranch Pipeline có SCM source và branch protection đã được xác minh. Hành vi PR khác nhau theo SCM integration; không cấp release credential chỉ vì tồn tại biểu thức `when`. `archiveArtifacts` chỉ chứa digest/evidence hẹp, không chứa Docker config, token hay toàn workspace. `stash` phù hợp artifact nhỏ; với tar lớn, thay bằng Artifact Manager hoặc kho transfer đã phê duyệt, luôn verify checksum và image ID trước push. Mẫu `--load` này là single-platform. Multi-platform cần output OCI layout/index từ builder, OCI-aware transfer/copy và verification index/manifest subject tương ứng; không được thay bằng rebuild ở release stage. Đọc [Credentials trong Pipeline](/docs/pipelines/credentials) và [Build Artifacts](/docs/jobs/artifacts) trước khi đổi scope hay retention.

## BuildKit input cache và supply chain

### Pin input và giới hạn build context

BuildKit không tự làm build tái lập. Pin Dockerfile syntax, base image theo digest, package lockfile, builder image/tool version và source revision. Review base image catalog trước khi đổi digest. Tag version có thể tiện đọc, nhưng digest là input không đổi được kiểm chứng.

```dockerfile
# syntax=docker/dockerfile:1.7.0
FROM registry.training.invalid/platform/node@sha256:7f83b1657ff1fc53b92dc18148a1d65dfa135014e6e2f9bc4e5f7b7c7a0b42a9
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
USER node
CMD ["node", "src/server.js"]
```

Reference ở trên chỉ minh họa format; build thật phải dùng digest đã resolve từ base image catalog được phê duyệt. `.dockerignore` loại `.git`, dependency cache, `.env`, private key, report và release evidence sinh ra. Context hẹp giảm rủi ro secret đi vào layer/cache, nhưng không thay secret manager.

### Cache và secret mount

Cache tăng tốc, không tạo trust. Phân vùng cache theo repository, lockfile, platform và trust tier. PR/fork không được ghi cache mà release tiêu thụ; khi cache integrity không chắc chắn, hãy build sạch và điều tra thay vì nhận output cũ.

```dockerfile
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

RUN --mount=type=secret,id=npm_token \
    test -s /run/secrets/npm_token && npm ci
```

BuildKit secret mount chỉ tồn tại tạm cho `RUN` đó; nó không là image layer. Truyền secret qua cơ chế builder hỗ trợ, ví dụ `docker buildx build --secret id=npm_token,env=NPM_TOKEN ...` trong Jenkins credential closure ngắn. Không dùng Dockerfile `ARG`/`ENV`, `--build-arg`, `.npmrc` được copy hay token trên command line. Kiểm tra log, layer history và remote cache policy sau integration vì secret behavior phụ thuộc builder/version.

### SBOM provenance chữ ký và verify

`--sbom=true` and `--provenance=mode=max` depend on Buildx/BuildKit exporter and registry support. They create supply-chain metadata for the pushed subject; they do not automatically meet every organizational provenance standard. Generate/retain SBOM and provenance according to policy, then sign and verify the **digest reference**, not a tag.

Một release gate thường xác minh:

1. digest source matches the manifest/index returned by candidate registry;
2. SBOM and provenance subject refer to that digest;
3. signature issuer, certificate identity and predicate type match policy;
4. vulnerability/license policy passes or has an approved expiring exception;
5. registry retention preserves subject and referrers for rollback.

Cosign, Notary or another signing system can implement this, but command flags, keyless identity, transparency log and OCI referrer support differ by version. Pin tool versions/images and test verification against a sandbox registry. See [Build container an toàn với Jenkins](/docs/delivery/container-build) for a wider build, scan and signing flow.

## Image promotion không rebuild

### Copy cùng manifest digest

Promotion là copy hoặc làm available cùng manifest/layer từ candidate repository sang release repository. Nó **không** checkout source rồi build lại. Docker Registry HTTP API V2 và OCI Distribution behavior khác nhau giữa các sản phẩm: cross-repository blob mount, manifest copy, referrer và retention phải được xác nhận với registry vendor.

Promotion service/tool với least-privilege identity riêng cần:

1. resolve candidate tag to an expected `sha256` digest and reject mismatch;
2. verify signature, provenance and SBOM against source digest;
3. copy the manifest and required blobs through supported registry API/tooling;
4. resolve the target reference and require exactly the same digest;
5. create a protected config PR that pins `release-repository@sha256:...`;
6. record source/target repository, digest, policy result, actor, change ID and time without credentials.

Không giả định `docker pull` rồi `docker push` giữ được multi-platform index, referrer hay server-side audit semantics. Có thể cần registry-native promotion API hoặc OCI-aware copy tool. Test exact version trên sandbox; fail closed nếu không verify được target digest/signature.

### Audit retention và rollback

Registry audit cần trả lời ai đã push, promote, xóa hay đổi retention cho repository/digest nào. Jenkins evidence liên kết build URL/reference, source SHA, digest, SBOM/provenance/signature result và config PR. Console output hoặc tag đơn lẻ không phải audit trail đầy đủ.

Retention must keep release digest, manifest layers and verification material long enough for rollback. Candidate artifacts can have a shorter TTL only after confirming they are not referenced by an active release, evidence record or change window. Rollback creates a reviewed config change to a prior known-good digest; it does not overwrite a tag or rebuild the old source. See [Rollback Strategy](/docs/delivery/rollback) for application/database compatibility decisions.

## Lab local disposable

Lab này có static path chỉ cần shell/Python. Runtime path tùy chọn khởi động registry không authentication bind loopback, build test image `FROM scratch` và chỉ push tới endpoint ephemeral đó. Nó không liên hệ registry bên ngoài, Jenkins, signing service hay cluster.

### Static fixture có guard

Chạy các block trong cùng một shell. Parent, prefix và marker bảo đảm cleanup chỉ chạm directory do lab này tạo.

```bash
set -eu
umask 077

LAB_PARENT="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
LAB_PREFIX='jenkins-registry-lab.'
LAB_ROOT="$(mktemp -d "${LAB_PARENT}/${LAB_PREFIX}XXXXXX")"
LAB_MARKER="$LAB_ROOT/.lab-owned"

case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf '%s\n' 'Refuse unexpected lab path.' >&2; exit 1 ;;
esac
[ "$(dirname -- "$LAB_ROOT")" = "$LAB_PARENT" ] || {
  printf '%s\n' 'Refuse non-direct lab child.' >&2; exit 1;
}
printf '%s\n' 'jenkins-registry-lab-v1' > "$LAB_MARKER"
mkdir -p "$LAB_ROOT/image"
printf 'registry lab payload\n' > "$LAB_ROOT/image/payload.txt"
cat > "$LAB_ROOT/image/Dockerfile" <<'EOF'
FROM scratch
COPY payload.txt /payload.txt
EOF
cat > "$LAB_ROOT/image-reference.txt" <<'EOF'
registry.example.invalid/training/catalog@sha256:7f83b1657ff1fc53b92dc18148a1d65dfa135014e6e2f9bc4e5f7b7c7a0b42a9
EOF
printf 'Lab root: %s\n' "$LAB_ROOT"
```

```bash
set -eu
: "${LAB_ROOT:?Run the setup block in the same shell}"
test -f "$LAB_ROOT/.lab-owned"
grep -Fqx 'FROM scratch' "$LAB_ROOT/image/Dockerfile"
python3 - <<'PY' "$LAB_ROOT/image-reference.txt"
import re
import sys
value = open(sys.argv[1], encoding='utf-8').read().strip()
assert re.fullmatch(r'registry\.example\.invalid/training/catalog@sha256:[0-9a-f]{64}', value)
print('static registry fixture validation: PASS')
PY
```

### Registry loopback tùy chọn

Runtime block cần Docker daemon, `curl` và image version rõ `registry:2.8.3` khả dụng. Trước khi dùng trong managed lab, resolve và ghi `RepoDigest` của nó từ catalog được phê duyệt; static fixture không khẳng định image đã được fetch hoặc verify. Container name, label và endpoint sinh ra được kiểm tra trước mọi cleanup.

```bash
if command -v docker >/dev/null 2>&1 && command -v curl >/dev/null 2>&1; then
  LAB_ID="$(basename "$LAB_ROOT")"
  LAB_REGISTRY="jenkins-registry-${LAB_ID}"
  docker image inspect registry:2.8.3 >/dev/null 2>&1 || docker pull registry:2.8.3
  docker run --detach --name "$LAB_REGISTRY" \
    --label 'training.lab=jenkins-registry-v1' \
    --publish 127.0.0.1::5000 registry:2.8.3 >/dev/null
  LAB_ENDPOINT="$(docker port "$LAB_REGISTRY" 5000/tcp | head -n 1)"
  case "$LAB_ENDPOINT" in
    127.0.0.1:*) ;;
    *) printf '%s\n' 'Refuse non-loopback registry endpoint.' >&2; exit 1 ;;
  esac
  docker build --pull=false --tag "$LAB_ENDPOINT/training/catalog:lab-v1" "$LAB_ROOT/image"
  docker push "$LAB_ENDPOINT/training/catalog:lab-v1"
  DIGEST="$(curl --fail --silent --show-error --head \
    -H 'Accept: application/vnd.oci.image.manifest.v1+json' \
    "http://${LAB_ENDPOINT}/v2/training/catalog/manifests/lab-v1" \
    | awk -F': ' 'tolower($1) == "docker-content-digest" {gsub("\\r", "", $2); print $2}')"
  case "$DIGEST" in sha256:[0-9a-f][0-9a-f]*) ;; *) exit 1 ;; esac
  printf '%s@%s\n' "$LAB_ENDPOINT/training/catalog" "$DIGEST" > "$LAB_ROOT/loopback-digest.txt"
  printf 'Loopback registry evidence: %s\n' "$LAB_ROOT/loopback-digest.txt"
else
  printf '%s\n' 'Docker or curl unavailable; static validation remains the only evidence.'
fi
```

Runtime test này chỉ dùng HTTP endpoint vì nó bind `127.0.0.1` và disposable. Registry traffic thật cần TLS, hostname/CA verification và authenticated identity. Không coi local unauthenticated test là bằng chứng TLS production, token scope, immutability, referrer behavior hay Jenkins integration.

### Cleanup và bằng chứng

Static evidence là validation line và fixture digest. Runtime evidence, khi optional block chạy, là loopback address, response digest và quan sát container/image version. Nó không phải release record. Cleanup chỉ xóa labeled loopback container và guarded temporary directory; không xóa Docker image, volume, network hay external resource.

```bash
set -eu
: "${LAB_ROOT:?LAB_ROOT is required}"
case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf '%s\n' 'Refuse cleanup outside lab prefix.' >&2; exit 1 ;;
esac
[ "$(dirname -- "$LAB_ROOT")" = "$LAB_PARENT" ] || exit 1
test -f "$LAB_MARKER"
test "$(cat "$LAB_MARKER")" = 'jenkins-registry-lab-v1'

if [ -n "${LAB_REGISTRY:-}" ]; then
  test "$(docker inspect --format '{{ index .Config.Labels "training.lab" }}' "$LAB_REGISTRY")" = 'jenkins-registry-v1'
  case "$LAB_REGISTRY" in jenkins-registry-"$(basename "$LAB_ROOT")") ;; *) exit 1 ;; esac
  docker rm --force "$LAB_REGISTRY" >/dev/null
fi
cd / || exit 1
rm -rf -- "$LAB_ROOT"
printf '%s\n' 'Removed only guarded registry-lab resources.'
```

## Troubleshooting

| Symptom | Evidence to inspect | Safe response |
| --- | --- | --- |
| `401 Unauthorized` or `denied` | Registry audit request ID/time, repository path, token scope, Jenkins credential ID and branch gate | Verify scope/expiry and release lane; never print password or expand it in an URL. |
| `manifest unknown` | Exact repository, tag/digest, registry API compatibility and retention event | Resolve source digest again; do not deploy a fallback tag. |
| Source/target digest differs after promote | Both manifest responses, platform/index type, copy tool version and policy result | Stop promotion and investigate; do not rebuild or overwrite target. |
| Cache gives a different result from clean build | Builder/version, cache key, base digest and PR/release cache boundary | Invalidate affected cache and run clean build; do not share writable PR cache with release. |
| TLS or certificate failure | Registry hostname, CA chain, client clock and proxy configuration | Fix trust/CA/DNS; do not disable certificate verification. |
| Docker login succeeds but push fails | Registry quota, upload limits, blob mount/cross-repository support and immutable-tag policy | Inspect registry event/audit data; use a new build tag or supported promotion path. |
| Signature or attestation verify fails | Subject digest, issuer/certificate policy, referrer support and tool version | Block release, verify exact digest and policy; do not suppress verification. |

## Checklist trước release

- [ ] App commit, Dockerfile syntax, base image digest, dependency lock and builder/tool versions are pinned and reviewed.
- [ ] Build context and `.dockerignore` exclude secrets, cache and unrelated output; BuildKit secret uses a mount rather than layer/argument/environment.
- [ ] PR/fork has no registry write, signing identity, release agent or writable release cache.
- [ ] Registry token has the least repository/action scope, short Jenkins binding, stdin login, no tracing/argv exposure and logout cleanup.
- [ ] Candidate tag maps to a registry-observed digest; deployment and config promotion use only `repository@sha256:...`.
- [ ] SBOM, provenance, scan, signature and attestation are verified against the release digest under versioned policy.
- [ ] Promotion copies the same manifest through supported OCI/registry behavior and verifies target digest before config change.
- [ ] Registry immutability, referrer support, audit, retention and deletion behavior are tested on sandbox for the deployed version.
- [ ] Previous known-good digest, compatibility decision and rollback/config-change owner are recorded.
- [ ] Lab cleanup uses parent/prefix/marker/label guards; static and optional runtime evidence are not confused.

## Nguồn chính thức

- [Docker registry authentication](https://docs.docker.com/reference/cli/docker/login/) — `--password-stdin` and credential helpers.
- [Docker Build secrets](https://docs.docker.com/build/building/secrets/) — BuildKit secret mounts.
- [Docker Build cache](https://docs.docker.com/build/cache/) — cache behavior and policy considerations.
- [Docker Build attestations](https://docs.docker.com/build/metadata/attestations/) — SBOM and provenance exporter behavior.
- [Docker Distribution registry API V2](https://distribution.github.io/distribution/spec/api/) — manifest/blob API assumptions.
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec) — distribution interoperability.
- [OCI Image Specification](https://github.com/opencontainers/image-spec) — manifest, index and digest model.
- [Jenkins Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — credential scope and management.
- [Credentials Binding plugin](https://plugins.jenkins.io/credentials-binding/) — short binding and masking limitations.
- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/) — Declarative syntax and runtime validation.
- [Sigstore Cosign](https://docs.sigstore.dev/cosign/) — signing and verifying OCI subjects.

## Đọc tiếp

<Cards>
  <Card title="Build container an toàn" href="/docs/delivery/container-build" description="Thiết kế Dockerfile, scan, SBOM và signing trong Jenkins." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Bind token registry đúng scope, không lộ vào log hoặc argv." />
  <Card title="Bảo mật Agent và Plugin" href="/docs/security/agent-plugin-security" description="Tách pool PR, CI và release khỏi controller." />
  <Card title="Build Artifacts" href="/docs/jobs/artifacts" description="Giữ digest evidence và report theo retention phù hợp." />
  <Card title="Jenkins & GitOps" href="/docs/delivery/gitops" description="Promote digest qua config review và controller reconciliation." />
  <Card title="Rollback Strategy" href="/docs/delivery/rollback" description="Quay về known-good digest với bằng chứng và compatibility." />
</Cards>
