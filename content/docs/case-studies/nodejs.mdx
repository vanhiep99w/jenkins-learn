---
title: "Jenkins + Node.js: CI/CD có thể tái lập"
description: "Xây dựng Pipeline Jenkins cho ứng dụng Node.js với lockfile, kiểm thử, đóng gói, audit và promotion an toàn."
---

<Callout type="info" title="Phạm vi lab và giả định">
  Case study dùng **npm** cho một fixture Node.js không có dependency ngoài. Jenkins cần Pipeline: Declarative, JUnit Plugin và một Linux agent có Git, Node.js `22.14.0` cùng npm đi kèm. Container là tùy chọn: chỉ bật khi có agent `trusted-container-builder` với Docker Engine được quản trị. Lab không publish registry, không gọi môi trường thật và không cần credential.
</Callout>

CI cho Node.js không chỉ là chạy `npm test`. Một commit đáng tin cần chạy cùng Node runtime, cài đúng cây dependency từ lockfile, tạo evidence cho test/audit/build, rồi chỉ quảng bá **cùng một artifact bất biến** qua các gate. Jenkins điều phối các bước đó; các command npm và toolchain của agent mới quyết định ứng dụng pass hay fail.

## Mục lục

- [Kết quả cần đạt](#kết-quả-cần-đạt)
- [Mô hình luồng và ranh giới](#mô-hình-luồng-và-ranh-giới)
  - [Static check, runtime và promotion không đồng nghĩa](#static-check-runtime-và-promotion-không-đồng-nghĩa)
  - [Bằng chứng cần giữ](#bằng-chứng-cần-giữ)
- [Chuẩn hóa Node.js và dependency](#chuẩn-hóa-nodejs-và-dependency)
  - [Quản lý phiên bản Node.js](#quản-lý-phiên-bản-nodejs)
  - [Chọn đúng package manager](#chọn-đúng-package-manager)
  - [`npm ci`, lockfile và cache](#npm-ci-lockfile-và-cache)
- [Thiết kế các gate ứng dụng](#thiết-kế-các-gate-ứng-dụng)
  - [Lint, unit và integration test](#lint-unit-và-integration-test)
  - [Build, package, container và audit](#build-package-container-và-audit)
  - [Promotion và observability](#promotion-và-observability)
- [Jenkinsfile Declarative mẫu](#jenkinsfile-declarative-mẫu)
  - [Điều kiện chạy và hành vi mẫu](#điều-kiện-chạy-và-hành-vi-mẫu)
  - [Jenkinsfile](#jenkinsfile)
  - [Cache và secret](#cache-và-secret)
- [Lab local có thể tái lập](#lab-local-có-thể-tái-lập)
  - [Tạo fixture không có dependency ngoài](#tạo-fixture-không-có-dependency-ngoài)
  - [Chạy gate trên máy local](#chạy-gate-trên-máy-local)
  - [Chạy qua Jenkins hoặc Docker tùy chọn](#chạy-qua-jenkins-hoặc-docker-tùy-chọn)
- [Khắc phục sự cố](#khắc-phục-sự-cố)
- [Checklist, evidence và bài tập](#checklist-evidence-và-bài-tập)
- [Nguồn chính thức](#nguồn-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Kết quả cần đạt

Sau case study này, bạn có thể:

- khóa Node.js, base image và dependency để một revision có thể chạy lại;
- chọn **một** package manager từ lockfile thay vì trộn lệnh npm, pnpm và Yarn;
- tách lint, unit test, integration test, audit, build và đóng gói thành các tín hiệu có thể hành động;
- publish XML JUnit, artifact có checksum và log tối thiểu để điều tra failure;
- chỉ cho promotion đi qua sau các gate, với artifact đã tạo sẵn và secret ở Jenkins Credentials;
- phân biệt kết quả static với bằng chứng runtime của Jenkins, npm và Docker.

## Mô hình luồng và ranh giới

```text
commit đã review
      │
      ▼
Node version + lockfile ──► npm ci ──► lint ──► unit ──► integration
                                                     │
                                                     ▼
                                  npm audit ──► build ──► .tgz / image cục bộ
                                                                        │
                                                                        ▼
                               checksum + JUnit + log ──► approval ──► promotion
```

Artifact đi qua promotion phải là output đã kiểm tra, ví dụ `dist/node-jenkins-fixture-1.0.0.tgz` có SHA-256. Không build lại từ source khi đổi môi trường, vì dependency, Node runtime hoặc source checkout có thể đã đổi. Nếu dùng image container, identity đáng tin là image digest đã được registry tổ chức cho phép, không chỉ là một tag có thể di chuyển.

### Static check, runtime và promotion không đồng nghĩa

| Lớp | Ví dụ trong case study | Có thể kết luận | Không thể kết luận |
| --- | --- | --- | --- |
| **Static check** | `node --check`, kiểm tra `package-lock.json`, Declarative linter | File JavaScript và cấu trúc Jenkinsfile hợp lệ theo công cụ đang chạy | Agent có Node đúng, test pass, registry truy cập được hay deploy an toàn |
| **npm runtime** | `npm ci`, `npm test`, `npm audit`, `npm run build` | Dependency, script và Node trên agent đã thực thi cho revision đó | Jenkins plugin, Docker daemon, credential hoặc môi trường đích hoạt động |
| **Jenkins runtime** | cấp agent, `junit`, archive artifact, `input` | Controller, plugin, agent và workspace lab phối hợp cho build đó | Hệ thống production khỏe hoặc secret có quyền phù hợp |
| **Container runtime** | `docker build` tùy chọn trên agent tin cậy | Docker daemon và Dockerfile đã tạo image trong pool đó | Image đã được publish, scan bởi registry hay chạy an toàn ở mọi cluster |
| **Promotion** | approval, kiểm tra checksum, adapter triển khai sandbox | Một người/nhóm có quyền đã cho phép artifact đã xác định đi tiếp | Chất lượng artifact nếu các gate trước bị bỏ qua |

<Callout type="warn" title="Linter xanh không phải build xanh">
  Declarative linter không chạy `npm ci`; `node --check` không thực thi test; `junit` chỉ đọc report do test runner đã tạo. Mỗi command phải trả exit code thất bại khi gate của nó không đạt. Không thêm `|| true`, `catchError` hay retry bao quanh assertion để đổi failure thành thành công.
</Callout>

### Bằng chứng cần giữ

Giữ evidence có thời hạn theo policy Jenkins và chỉ archive danh sách file đã biết:

| Evidence | Nguồn | Dùng để làm gì | Không được chứa |
| --- | --- | --- | --- |
| Node/npm version, Git revision, thời gian stage | Console Output | tái hiện toolchain và xác định commit | token, dump environment, URL có credential |
| `reports/*.xml` | Node test runner | xem test thất bại và trend JUnit | dữ liệu người dùng hoặc response nhạy cảm |
| `dist/*.tgz`, `dist/*.sha256` | `npm pack`, `sha256sum` | xác nhận package bất biến được promotion | `.npmrc` có token, source map nhạy cảm |
| `evidence/promotion.txt` | stage promotion mô phỏng | liên kết build với checksum và gate | secret, endpoint production |
| `evidence/container-image.txt` | Docker inspect | ghi image ID cục bộ khi đã bật container | Docker config hoặc credential registry |

Theo dõi queue time của label `linux && node22`, thời lượng từng gate, tỷ lệ failure, kích thước workspace/cache và tuổi artifact. Đây là observability vận hành: một build chậm vì cache hỏng khác với test bị lỗi; một build nằm queue khác với `npm ci` không tải được package.

## Chuẩn hóa Node.js và dependency

### Quản lý phiên bản Node.js

Chọn một version Node chính xác cho repository. Trong lab này là `22.14.0`; kiểm tra `node --version` trước mọi gate. Khi đội dùng công cụ quản lý version như Volta, `.nvmrc`, asdf hoặc một image CI, file/cấu hình đó phải trỏ cùng version đã review. Jenkins **không** tự cài Node chỉ vì Jenkinsfile gọi `npm`.

Đặt version ở các ranh giới sau:

- agent label `node22` là capability; image/agent manifest phải ghi Node `22.14.0` thực tế;
- Dockerfile pin `FROM node:22.14.0-alpine3.21`; với release, resolve tag này thành digest đã duyệt trong registry nội bộ;
- `package.json` khai báo `engines.node` để báo contract cho developer;
- `package-lock.json` thuộc cùng commit với `package.json` và được review như source;
- plugin Jenkins, JUnit Plugin và Docker Pipeline Plugin (nếu dùng) được quản trị qua support matrix, không phải qua Jenkinsfile.

<Callout type="idea" title="Nâng Node như một thay đổi có kiểm soát">
  Tạo PR nâng một version Node, chạy lại toàn bộ gate, lưu version trước/sau và cập nhật image/agent manifest cùng lúc. Không để laptop chạy một major version còn agent chạy major version khác rồi coi kết quả là tương đương.
</Callout>

### Chọn đúng package manager

Package manager được chọn bởi lockfile đã commit. Một workspace chỉ chạy một họ lệnh trong một build để tránh hai resolver tạo cây dependency khác nhau.

| Dấu hiệu trong repository | Manager dùng cho CI | Cài dependency tái lập | Lưu ý |
| --- | --- | --- | --- |
| `package-lock.json` | npm | `npm ci` | Case study và fixture này dùng lựa chọn này. |
| `pnpm-lock.yaml` | pnpm đã pin qua Corepack/toolchain | `pnpm install --frozen-lockfile` | Đặt store/cache riêng theo version pnpm và trust boundary. |
| `yarn.lock` | Yarn đã pin qua Corepack/toolchain | Yarn immutable theo version Yarn đã chọn | Xác minh mode/lockfile của chính dự án trước khi dùng. |

Không chạy `npm ci` trong repository chỉ có `pnpm-lock.yaml`, cũng không “thử cả ba” để command nào pass. Nếu có nhiều lockfile do di trú, quyết định một manager trong PR riêng rồi xóa lockfile còn lại sau khi kiểm tra consumer; trong lúc đó CI phải fail rõ ràng thay vì chọn ngẫu nhiên.

### `npm ci`, lockfile và cache

`npm ci` xóa `node_modules` hiện có và cài đúng tree từ `package-lock.json`; nó fail khi lockfile không khớp `package.json`. Đây là hành vi mong muốn của CI. `npm install` phù hợp lúc tác giả chủ động thay dependency và muốn cập nhật lockfile, không phải default command để xác minh commit.

Cache npm thường là tarball cache, mặc định gần `~/.npm`; nó **không** nên là `node_modules`. Cache có thể giảm thời gian tải nhưng làm tăng bề mặt ownership, quota, corruption và nhiễm chéo giữa build không cùng mức tin cậy.

- cache key nên bao gồm OS/architecture, Node major, npm version và hash của `package-lock.json`;
- chỉ cho agent cùng trust tier ghi cache; PR/fork không dùng cache ghi được của release;
- giới hạn dung lượng/tuổi cache và xóa entry theo key khi checksum hoặc permission bất thường;
- `npm ci` vẫn là source of truth: cache miss hoặc cache hỏng phải dẫn đến download sạch hoặc failure rõ ràng, không copy `node_modules` cũ;
- `.npmrc` chứa registry token không được đưa vào cache, archive hay Docker build context.

## Thiết kế các gate ứng dụng

### Lint, unit và integration test

**Lint** kiểm tra quy ước hoặc lỗi tĩnh. Nó không khởi động dependency ngoài. Với fixture, `node --check` kiểm tra cú pháp JavaScript. Trong ứng dụng thật, `npm run lint` có thể gọi ESLint đã được khóa trong lockfile.

**Unit test** kiểm tra module nhỏ, nhanh và xác định. **Integration test** kiểm tra ranh giới như database, queue hoặc HTTP contract qua fake server/sandbox allowlist. Tách hai script và hai report để người điều tra biết failure ở lớp nào. Integration test không dùng hostname production, dữ liệu thật hoặc credential phát hành.

```json title="scripts nên diễn đạt rõ từng gate"
{
  "scripts": {
    "lint": "node --check src/index.js",
    "test:unit": "node --test --test-reporter=junit --test-reporter-destination=reports/unit.xml test/unit.test.js",
    "test:integration": "node --test --test-reporter=junit --test-reporter-destination=reports/integration.xml test/integration.test.js",
    "build": "node scripts/build.js"
  }
}
```

Tạo thư mục `reports/` trước khi gọi runner nếu runner không tự tạo. JUnit XML là evidence bổ sung; exit code của command test vẫn quyết định stage. Nếu report bắt buộc mà không xuất hiện, để `junit allowEmptyResults: false` làm build fail để sửa đường dẫn/reporting.

### Build, package, container và audit

`npm run build` tạo output chạy được, ví dụ `dist/`. `npm pack --pack-destination dist` tạo tarball `.tgz` từ package manifest. Archive tarball cùng checksum; không archive toàn bộ workspace vì có thể vô tình gồm `.npmrc`, cache hoặc report nhạy cảm.

```bash
set -eu
npm run build
npm pack --pack-destination dist
sha256sum dist/*.tgz > dist/package.sha256
```

`npm audit --omit=dev --audit-level=high` hỏi registry về advisory của dependency production. Nó cần network, registry/proxy và policy severity rõ ràng; không phải static lint. Audit không thay thế review license, SCA của tổ chức hay scan image. Với fixture không có package ngoài, expected result là không có vulnerability được báo; với ứng dụng thật, failure phải dẫn tới triage: dependency có nằm trên runtime path, advisory có fix, có exception hết hạn/owner hay không.

Container chỉ cần khi cách phân phối là image. Dockerfile dưới dùng base image version cụ thể và multi-stage tối thiểu; image chỉ được build cục bộ trong lab, không push registry:

```dockerfile title="Dockerfile"
FROM node:22.14.0-alpine3.21 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22.14.0-alpine3.21 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
USER node
CMD ["node", "src/index.js"]
```

Pin tag version là baseline dễ đọc. Trước release, registry phải resolve và allowlist digest của tag đó; ghi digest vào release metadata. Không mount Docker socket vào Jenkins controller. Nếu build image cần daemon, dùng agent riêng `trusted-container-builder`, không nhận pull request không tin cậy, có disk quota và quyền registry tối thiểu.

### Promotion và observability

Promotion là quyết định chuyển **artifact đã tồn tại** từ một trạng thái sang trạng thái khác, ví dụ `candidate` sang sandbox/staging. Nó không phải lệnh build lại. Flow tối thiểu:

1. CI tạo tarball/image và checksum/digest.
2. Gate tự động xác nhận lint, test, audit và policy artifact.
3. Release manager duyệt artifact identity, changelog, scan và rollback plan.
4. Adapter deploy sandbox nhận đúng identity; credential chỉ được bind trong adapter đó.
5. Health/smoke check và metric sandbox xác nhận rollout; nếu không đạt, dừng promotion tiếp theo và chọn identity rollback đã biết.

Jenkinsfile mẫu chỉ mô phỏng bước 3 bằng `input` và ghi checksum vào `evidence/`. Nó không gọi môi trường thật. Khi thêm adapter triển khai, adapter phải nhận artifact SHA-256 hoặc image digest, dùng target allowlist và có `timeout`. Không truyền token qua argv, URL, console, artifact hay report.

<Callout type="warn" title="Approval không thay thế controls kỹ thuật">
  Approval chỉ chứng minh người có quyền đã cho phép bước tiếp theo. Nó không bù cho test bị bỏ qua, image chưa scan, registry mutable hoặc secret quyền quá rộng. Tách credential sandbox và production; build PR không được nhìn thấy credential release.
</Callout>

## Jenkinsfile Declarative mẫu

### Điều kiện chạy và hành vi mẫu

Mẫu dùng một Pipeline agent `linux && node22` đã cài chính xác Node `22.14.0`, Git và shell POSIX. Nó cần **Pipeline: Declarative** và **JUnit Plugin**. Stage container chỉ được chọn khi parameter `BUILD_CONTAINER=true`; khi đó nó tự checkout trên agent `linux && trusted-container-builder`, nên không giả định workspace của agent Node được chia sẻ.

`PROMOTE_TO_SANDBOX` mặc định `false`. Khi bật trên branch `main`, Pipeline dừng ở approval rồi tạo evidence local; không deploy, không publish package/image và không dùng credential. Xác minh `submitter` khớp group thực tế trước khi áp dụng. `input` có timeout để executor không chờ vô hạn.

### Jenkinsfile

```groovy
pipeline {
  agent { label 'linux && node22' }

  options {
    skipDefaultCheckout(true)
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  parameters {
    booleanParam(name: 'BUILD_CONTAINER', defaultValue: false,
      description: 'Chỉ build image cục bộ trên trusted-container-builder; không push.')
    booleanParam(name: 'PROMOTE_TO_SANDBOX', defaultValue: false,
      description: 'Chỉ tạo evidence promotion sau approval; không deploy.')
  }

  stages {
    stage('Checkout và runtime') {
      steps {
        checkout scm
        sh '''
          set -eu
          test "$(node --version)" = 'v22.14.0'
          npm --version
          test -f package-lock.json
        '''
      }
    }

    stage('Cài dependency') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Static checks') {
      steps {
        sh 'npm run lint'
      }
    }

    stage('Unit test') {
      steps {
        sh 'mkdir -p reports && npm run test:unit'
      }
      post {
        always {
          junit allowEmptyResults: false, testResults: 'reports/unit.xml'
        }
      }
    }

    stage('Integration test') {
      steps {
        sh 'mkdir -p reports && npm run test:integration'
      }
      post {
        always {
          junit allowEmptyResults: false, testResults: 'reports/integration.xml'
        }
      }
    }

    stage('Dependency audit') {
      steps {
        sh 'npm audit --omit=dev --audit-level=high'
      }
    }

    stage('Build và package') {
      steps {
        sh '''
          set -eu
          rm -rf dist
          mkdir -p dist
          npm run build
          npm pack --pack-destination dist
          sha256sum dist/*.tgz > dist/package.sha256
          test -s dist/package.sha256
        '''
      }
      post {
        success {
          archiveArtifacts artifacts: 'dist/*.tgz,dist/package.sha256', fingerprint: true
        }
      }
    }

    stage('Container cục bộ') {
      when {
        beforeAgent true
        expression { params.BUILD_CONTAINER }
      }
      agent { label 'linux && trusted-container-builder' }
      steps {
        checkout scm
        sh '''
          set -eu
          test -f Dockerfile
          docker build --pull=false --tag "node-jenkins-fixture:${GIT_COMMIT}" .
          mkdir -p evidence
          docker image inspect "node-jenkins-fixture:${GIT_COMMIT}" \
            --format 'id={{.Id}}' > evidence/container-image.txt
          test -s evidence/container-image.txt
        '''
      }
      post {
        success {
          archiveArtifacts artifacts: 'evidence/container-image.txt', fingerprint: true
        }
      }
    }

    stage('Gate promotion sandbox') {
      when {
        beforeInput true
        allOf {
          branch 'main'
          expression { params.PROMOTE_TO_SANDBOX }
        }
      }
      options {
        timeout(time: 10, unit: 'MINUTES')
      }
      input {
        message 'Xác nhận artifact đã kiểm tra được phép đi tới adapter sandbox?'
        ok 'Tạo evidence'
        submitter 'release-managers'
      }
      steps {
        sh '''
          set -eu
          test -s dist/package.sha256
          mkdir -p evidence
          awk '{print "artifact-sha256=" $1}' dist/package.sha256 > evidence/promotion.txt
          printf '%s\n' 'target=sandbox-simulated' >> evidence/promotion.txt
          test -s evidence/promotion.txt
        '''
      }
      post {
        success {
          archiveArtifacts artifacts: 'evidence/promotion.txt', fingerprint: true
        }
      }
    }
  }

  post {
    always {
      echo "Build ${env.BUILD_NUMBER} kết thúc: ${currentBuild.currentResult}"
    }
    failure {
      echo 'Đọc stage lỗi đầu tiên, report JUnit và artifact trước khi chạy lại.'
    }
  }
}
```

### Cache và secret

Ví dụ cố ý không mount cache để lab dễ tái lập. Với CI thật, dùng cache npm do platform/agent quản trị, key theo lockfile và trust tier như phần [`npm ci`, lockfile và cache](#npm-ci-lockfile-và-cache). Đừng đặt `node_modules` trong cache chia sẻ và đừng archive nó như artifact phát hành.

Một adapter deploy thật chỉ bind credential trong scope ngắn nhất. Credential ID là metadata; giá trị secret nằm ngoài Git. Đoạn dưới là pattern để adapter đọc secret từ environment, không phải lệnh publish:

```groovy
withCredentials([
  string(credentialsId: 'sandbox-deploy-token', variable: 'SANDBOX_DEPLOY_TOKEN')
]) {
  sh '''
    set +x
    # Adapter đã review đọc SANDBOX_DEPLOY_TOKEN từ environment.
    # Không echo token, không đưa token vào argv, URL, artifact hay report.
    ./scripts/promote-sandbox-artifact
  '''
}
```

Chỉ thêm block đó trên agent sandbox được tin cậy, sau promotion gate và sau merge vào branch bảo vệ. Không dùng Groovy interpolation để ghép secret vào command. Đọc thêm về scope, masking và file credential tại [Credentials trong Pipeline](/docs/pipelines/credentials).

## Lab local có thể tái lập

### Tạo fixture không có dependency ngoài

Prerequisite: Git và Node.js `22.14.0` có npm đi kèm. Dán **khối tạo fixture và khối chạy gate kế tiếp vào cùng một Bash shell**. Lab chỉ tạo một thư mục con ngẫu nhiên trực tiếp dưới `TMPDIR` (mặc định `/tmp`), đặt marker riêng và chỉ cleanup sau khi mọi guard khớp; không chạy trong repository hay workspace cần giữ. Fixture không có network dependency, registry credential, Docker daemon hay thao tác deploy.

```bash
set -eu
umask 077

LAB_PARENT="${TMPDIR:-/tmp}"
LAB_PARENT="${LAB_PARENT%/}"
[ -n "$LAB_PARENT" ] || LAB_PARENT='/tmp'
readonly LAB_PARENT
readonly LAB_PREFIX='node-jenkins-fixture.'
readonly LAB_MARKER_NAME='.node-jenkins-fixture-marker'
readonly LAB_MARKER_VALUE='node-jenkins-fixture-v1'

case "$LAB_PARENT" in
  /*) ;;
  *) printf >&2 'Refuse lab: TMPDIR must be an absolute path.\n'; exit 1 ;;
esac

LAB_ROOT="$(mktemp -d "${LAB_PARENT}/${LAB_PREFIX}XXXXXX")"
readonly LAB_ROOT
readonly LAB_MARKER="${LAB_ROOT}/${LAB_MARKER_NAME}"
LAB_CLEANED=0

case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf >&2 'Refuse lab: unexpected temporary prefix.\n'; exit 1 ;;
esac
[ "$(dirname "$LAB_ROOT")" = "$LAB_PARENT" ] || {
  printf >&2 'Refuse lab: temporary directory is not a direct child.\n'; exit 1;
}

cleanup_lab() {
  if [ "$LAB_CLEANED" -eq 1 ]; then
    return 0
  fi

  if [ -z "${LAB_PARENT:-}" ] || [ -z "${LAB_PREFIX:-}" ] || \
     [ -z "${LAB_ROOT:-}" ] || [ -z "${LAB_MARKER:-}" ]; then
    printf >&2 'Refuse cleanup: missing lab variables.\n'
    return 1
  fi

  case "$LAB_ROOT" in
    "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
    *) printf >&2 'Refuse cleanup: invalid prefix.\n'; return 1 ;;
  esac

  if [ "$(dirname "$LAB_ROOT")" != "$LAB_PARENT" ] || \
     [ "$LAB_MARKER" != "$LAB_ROOT/$LAB_MARKER_NAME" ] || \
     [ ! -d "$LAB_ROOT" ] || [ ! -f "$LAB_MARKER" ] || \
     [ "$(cat "$LAB_MARKER")" != "$LAB_MARKER_VALUE" ]; then
    printf >&2 'Refuse cleanup: parent, marker, or fixture guard failed.\n'
    return 1
  fi

  cd / || return 1
  rm -rf -- "$LAB_ROOT"
  LAB_CLEANED=1
}

printf '%s\n' "$LAB_MARKER_VALUE" > "$LAB_MARKER"
trap 'cleanup_lab' EXIT
trap 'cleanup_lab' ERR
trap 'exit 130' HUP INT TERM

cd "$LAB_ROOT"
mkdir -p src scripts test reports

cat > package.json <<'EOF'
{
  "name": "node-jenkins-fixture",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "files": ["src"],
  "engines": { "node": "22.14.0" },
  "scripts": {
    "lint": "node --check src/index.js",
    "test:unit": "node --test --test-reporter=junit --test-reporter-destination=reports/unit.xml test/unit.test.js",
    "test:integration": "node --test --test-reporter=junit --test-reporter-destination=reports/integration.xml test/integration.test.js",
    "build": "node scripts/build.js"
  }
}
EOF

cat > package-lock.json <<'EOF'
{
  "name": "node-jenkins-fixture",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "node-jenkins-fixture",
      "version": "1.0.0",
      "engines": { "node": "22.14.0" }
    }
  }
}
EOF

cat > src/index.js <<'EOF'
export function add(left, right) {
  return left + right;
}

if (process.env.RUN_FIXTURE_SERVER === '1') {
  console.log('Fixture server mode is intentionally local only.');
}
EOF

cat > test/unit.test.js <<'EOF'
import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../src/index.js';

test('add returns a deterministic sum', () => {
  assert.equal(add(2, 3), 5);
});
EOF

cat > test/integration.test.js <<'EOF'
import test from 'node:test';
import assert from 'node:assert/strict';

test('integration fixture uses only process-local data', () => {
  assert.deepEqual({ service: 'fixture', status: 'ok' }, { service: 'fixture', status: 'ok' });
});
EOF

cat > scripts/build.js <<'EOF'
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
writeFileSync('dist/build.txt', 'node-jenkins-fixture build\n', 'utf8');
EOF

cat > Dockerfile <<'EOF'
FROM node:22.14.0-alpine3.21 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22.14.0-alpine3.21 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
USER node
CMD ["node", "src/index.js"]
EOF

printf 'Fixture created at guarded temporary path: %s\n' "$LAB_ROOT"
```

`type: module` trong `package.json` làm contract ES module của fixture tường minh. Trường `files` giới hạn tarball ở source runtime, tránh đóng gói report và output lab. Biến, marker và trap ở trên chỉ sống trong Bash shell đang mở; không đoán lại `LAB_ROOT` trong một terminal khác. Khi paste các khối liên tiếp, trap sẽ cleanup cả khi command lỗi, shell thoát hoặc shell nhận tín hiệu. Nếu muốn giữ fixture để điều tra, copy **file không nhạy cảm** ra một thư mục do bạn sở hữu trước khi thoát shell; không tắt các guard cleanup.

### Chạy gate trên máy local

Chạy khối này **ngay trong cùng Bash shell** với khối tạo fixture. Nó xác minh lại parent/prefix/marker trước khi vào thư mục tạm, rồi gọi cleanup guard sau khi thu evidence. Các lệnh không publish package/image và không gọi deploy. `npm audit` có thể cần truy cập registry dù fixture không có dependency; nếu môi trường offline, ghi trạng thái audit chưa chạy thay vì kết luận audit pass.

```bash
set -eu
: "${LAB_ROOT:?Run the fixture-creation block in this shell first}"
: "${LAB_MARKER:?Run the fixture-creation block in this shell first}"
case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf >&2 'Refuse gate: invalid fixture prefix.\n'; exit 1 ;;
esac
[ "$(dirname "$LAB_ROOT")" = "$LAB_PARENT" ] || {
  printf >&2 'Refuse gate: fixture is not a direct child.\n'; exit 1;
}
[ "$LAB_MARKER" = "$LAB_ROOT/$LAB_MARKER_NAME" ] && \
  [ "$(cat "$LAB_MARKER")" = "$LAB_MARKER_VALUE" ] || {
  printf >&2 'Refuse gate: fixture marker guard failed.\n'; exit 1;
}
cd "$LAB_ROOT"

[ "$(node --version)" = 'v22.14.0' ]
npm ci
npm run lint
mkdir -p reports
npm run test:unit
npm run test:integration
npm audit --omit=dev --audit-level=high
npm run build
npm pack --pack-destination dist
sha256sum dist/*.tgz > dist/package.sha256

test -s reports/unit.xml
test -s reports/integration.xml
test -s dist/build.txt
test -s dist/package.sha256

cleanup_lab
```

Expected evidence là hai XML JUnit, `dist/build.txt`, một file `.tgz` và `dist/package.sha256`. Thử tạo failure có chủ đích bằng cách đổi expected `5` thành `4` trong `test/unit.test.js`; `npm run test:unit` phải trả mã khác `0` nhưng vẫn tạo report. Khôi phục assertion đúng trước khi commit.

### Chạy qua Jenkins hoặc Docker tùy chọn

1. Lưu Jenkinsfile mẫu ở root fixture, tạo Pipeline từ SCM và gán agent `linux && node22`. Trước build, xác nhận chính agent có Node `22.14.0`, Git, shell và JUnit Plugin trên controller.
2. Để `BUILD_CONTAINER=false` cho lần đầu. Build thành công phải archive JUnit XML, tarball và checksum. `PROMOTE_TO_SANDBOX=false` làm stage promotion bị bỏ qua.
3. Chỉ khi có Docker Engine trên **agent riêng** `linux && trusted-container-builder`, bật `BUILD_CONTAINER=true`. Stage chỉ chạy `docker build` cục bộ và archive một image ID; nó không login/push registry. Không mount Docker socket vào controller để làm stage này hoạt động.
4. Để tự dựng controller lab, cần Docker Engine, dung lượng persistent volume và image Jenkins đã pin; xem [Chạy Jenkins với Docker](/docs/installation/docker). Đây là runtime tùy chọn, không phải điều kiện để chạy fixture local.

## Khắc phục sự cố

| Dấu hiệu | Nguyên nhân thường gặp | Cách xử lý có bằng chứng |
| --- | --- | --- |
| `npm ci` báo lockfile/package không đồng bộ | `package.json` đổi nhưng không cập nhật lockfile, hoặc dùng sai manager | Trên máy dev, cập nhật lockfile bằng đúng manager rồi review cả hai file; CI vẫn dùng `npm ci`. Không xóa lockfile để lách lỗi. |
| `EBADENGINE` hoặc test khác laptop | Node/npm agent khác version contract | Ghi `node --version`, `npm --version`, image/agent revision; sửa toolchain về version đã pin trước khi đổi test. |
| `npm audit`/`npm ci` lỗi `EAI_AGAIN`, `407`, certificate | DNS, proxy, CA nội bộ hoặc registry policy | Kiểm tra URL registry không nhạy cảm, `npm config get registry`, CA/proxy do platform cấp và log proxy; không tắt TLS verification hay in `.npmrc` có token. |
| JUnit báo không tìm thấy XML | Script không tạo report, sai path hoặc `reports/` chưa tồn tại | Chạy đúng command trên cùng agent, kiểm tra file bằng `test -s reports/unit.xml`; giữ `allowEmptyResults: false` khi report là gate bắt buộc. |
| Build dùng kết quả cũ | Workspace tái sử dụng hoặc cache `node_modules` | Dùng `npm ci`, xóa output build có guard như `rm -rf dist` trong workspace đã biết, key cache theo lockfile và không chuyển `node_modules` giữa trust tier. |
| `npm ci` chậm hoặc cache permission denied | Cache chung owner/UID khác, disk/quota đầy | Đo cache path, owner, dung lượng và key; dùng cache được quản trị cho đúng agent/user, hoặc chạy không cache để phân biệt vấn đề performance với correctness. |
| Build chờ agent | Không có node online khớp `linux && node22` hoặc `trusted-container-builder` | Xem Build Queue, label, executor, Node version và capacity; không đổi thành `agent any` để che thiếu toolchain. |
| Docker build fail | Docker daemon/permission/base image không có trên agent container | Xác minh chỉ trên pool tin cậy: `docker version`, image tag/digest và disk; không cấp Docker socket cho controller hoặc build PR. |
| Credential bị từ chối ở adapter deploy | scope/permission sai, token hết hạn hoặc branch chưa tin cậy | Kiểm tra credential ID, folder/job scope, trust policy và audit log; không echo token, dùng `set -x` hay truyền token qua URL. |

## Checklist, evidence và bài tập

### Checklist trước khi merge

- [ ] Repository có đúng một lockfile và CI dùng package manager tương ứng.
- [ ] Node `22.14.0`, base image version và dependency lockfile được pin/review cùng thay đổi.
- [ ] `npm ci` chạy trên agent sạch; cache chỉ là tăng tốc và có trust boundary, key, quota.
- [ ] Lint, unit, integration, audit, build và package có command/exit code riêng.
- [ ] Test runner tạo XML JUnit; Jenkins publish XML sau command test, không dùng report để che test chưa chạy.
- [ ] Artifact archive là allowlist gồm `.tgz`, checksum và evidence cần thiết; không archive workspace, `.npmrc`, cache hoặc secret.
- [ ] Audit threshold, triage owner và exception có hạn được thống nhất; audit không bị diễn giải như scan image toàn diện.
- [ ] Container chỉ build trên agent Docker tin cậy với image version/digest đã duyệt; không push trong CI lab và không mount socket vào controller.
- [ ] Promotion dùng cùng artifact identity, có approval/rollback/observability; PR không nhận credential release.
- [ ] Jenkinsfile đã được kiểm tra bằng Declarative linter trên controller phù hợp, hoặc việc chưa kiểm tra runtime được ghi rõ.

### Evidence mong đợi

Một build fixture pass có thể cung cấp:

```text
Console Output: node v22.14.0, npm version, revision SCM, stage duration
JUnit: reports/unit.xml và reports/integration.xml
Package: dist/node-jenkins-fixture-1.0.0.tgz
Integrity: dist/package.sha256
Promotion simulation: evidence/promotion.txt (chỉ khi gate được bật và duyệt)
Container simulation: evidence/container-image.txt (chỉ khi Docker stage được bật)
```

Runtime limit của lab: fixture không chứng minh registry production, secret thật, Docker registry, deployment, rollback hay health check môi trường. Những chứng minh đó cần sandbox tách biệt, credential tối thiểu và policy release của tổ chức.

### Bài tập tự kiểm tra

1. Thêm một dependency development nhỏ trong PR riêng, chạy `npm install --save-dev <package>` trên máy dev để tạo lockfile, rồi xác nhận CI vẫn chỉ dùng `npm ci`. Review diff lockfile trước khi merge.
2. Đổi Node contract sang một version đã được đội phê duyệt, cập nhật agent/image cùng PR và so sánh JUnit, audit, artifact checksum giữa hai build.
3. Thêm fake HTTP server chạy trong process cho integration test. Không gọi mạng ngoài; publish report riêng và chứng minh unit test vẫn nhanh hơn integration test.
4. Bật `BUILD_CONTAINER` trên agent lab tin cậy, ghi image digest do registry nội bộ resolve vào release metadata, nhưng không push image trong fixture.
5. Thiết kế adapter sandbox nhận `package.sha256`. Thêm timeout, target allowlist, smoke check và rollback identity; review credential scope trước khi cho adapter chạy.

## Nguồn chính thức

- [Node.js releases](https://nodejs.org/en/about/previous-releases) — chọn dòng Node được hỗ trợ và lập kế hoạch nâng version.
- [npm CLI: npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci) — cài dependency từ lockfile cho CI.
- [npm CLI: npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit) — advisory, registry và giới hạn của audit.
- [npm CLI: npm pack](https://docs.npmjs.com/cli/v10/commands/npm-pack) — tạo tarball package để kiểm tra/phân phối.
- [Jenkins: Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/) — Declarative Pipeline, `post`, parameter và credential.
- [Jenkins: Testing and artifacts](https://www.jenkins.io/doc/pipeline/tour/tests-and-artifacts/) — JUnit và archive artifact.
- [Jenkins: Using agents](https://www.jenkins.io/doc/book/using/using-agents/) — agent, executor và workspace.
- [Credentials Binding plugin](https://plugins.jenkins.io/credentials-binding/) — scope binding và cảnh báo về secret/workspace.
- [Docker: Build best practices](https://docs.docker.com/build/building/best-practices/) — base image, multi-stage build và image hygiene.

## Đọc tiếp

<Cards>
  <Card title="Node.js & npm" href="/docs/integrations/nodejs" description="Ôn toolchain, package manager và cache cho ứng dụng Node.js." />
  <Card title="Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Đặt Pipeline as Code trong SCM và xác minh Declarative syntax." />
  <Card title="Kiểm thử Jenkinsfile" href="/docs/pipelines/testing" description="Phân biệt lint, unit, contract và runtime test của Pipeline." />
  <Card title="Tự động hóa kiểm thử" href="/docs/delivery/test-automation" description="Thiết kế test pyramid, report, isolation và flaky-test evidence." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Bind secret trong scope hẹp mà không đưa nó vào log hay artifact." />
  <Card title="Chạy Jenkins với Docker" href="/docs/installation/docker" description="Dựng controller lab với image và volume được quản trị." />
</Cards>
