---
title: "Node.js & npm"
description: "Thiết kế Jenkins Pipeline cho Node.js với toolchain đã pin, cài dependency tái lập, cache an toàn và test evidence trung thực."
---

<Callout type="info" title="Phạm vi và giả định">
  Repository này chạy Node.js 22; ví dụ CI pin Node.js `22.14.0` khi môi trường đã cung cấp version đó. Jenkins cần agent Linux có toolchain hoặc NodeJS Plugin đã được quản trị. `junit`, coverage publisher và package manager behavior đều phụ thuộc plugin/CLI/version runtime; kiểm tra trong sandbox trước khi áp dụng.
</Callout>

Node.js CI đáng tin cậy bắt đầu từ toolchain và lockfile, không phải từ một lệnh `npm install` chạy được hôm nay. Jenkins nên chọn agent phù hợp, kiểm Node/package-manager version, cài dependency tái lập, chạy test để exit code quyết định kết quả, rồi chỉ lưu report/output được chọn. Registry, cache và lifecycle script đều là ranh giới thực thi cần kiểm soát.

## Mục lục

- [Mục tiêu và toolchain](#mục-tiêu-và-toolchain)
  - [NodeJS Plugin và Node trên agent](#nodejs-plugin-và-node-trên-agent)
  - [Pin Node Corepack và packageManager](#pin-node-corepack-và-packagemanager)
- [Dependency tái lập và registry](#dependency-tái-lập-và-registry)
  - [Chọn lệnh theo lockfile](#chọn-lệnh-theo-lockfile)
  - [Lifecycle script registry và credential](#lifecycle-script-registry-và-credential)
- [Cache dependency theo trust tier](#cache-dependency-theo-trust-tier)
- [Test coverage và evidence Jenkins](#test-coverage-và-evidence-jenkins)
  - [JUnit và coverage không phải Jenkins core](#junit-và-coverage-không-phải-jenkins-core)
  - [Jenkinsfile tham khảo](#jenkinsfile-tham-khảo)
- [Lab local không dùng registry](#lab-local-không-dùng-registry)
  - [Tạo fixture có guard](#tạo-fixture-có-guard)
  - [Static validation và runtime tùy chọn](#static-validation-và-runtime-tùy-chọn)
  - [Cleanup và evidence](#cleanup-và-evidence)
- [Troubleshooting](#troubleshooting)
- [Checklist trước merge](#checklist-trước-merge)
- [Nguồn chính thức](#nguồn-chính-thức)
- [Đọc tiếp](#đọc-tiếp)

## Mục tiêu và toolchain

Sau bài này, bạn có thể phân biệt tool installation do Jenkins quản lý với Node đã có trong image agent, chọn đúng installer theo lockfile, cô lập cache PR/release và thiết kế test report không tạo build xanh giả. Mục tiêu không phải cấp registry token cho mọi build hay biến workspace Jenkins thành cache dùng chung không kiểm soát.

### NodeJS Plugin và Node trên agent

Có hai mô hình hợp lệ; chọn một và ghi rõ owner/version evidence:

| Mô hình | Jenkins cấp Node ở đâu? | Ưu điểm | Điều phải xác minh |
| --- | --- | --- | --- |
| NodeJS Plugin | Global Tool Configuration tải/cài Node vào tool installation, Pipeline gọi wrapper `nodejs('Node 22.14.0')` | Tool name tập trung, phù hợp agent không có sẵn Node | Plugin, installer source/mirror, exact tool name, cache setting, OS/architecture và quyền ghi tool home |
| Agent-installed Node | Image VM/container agent đã có Node/npm/Corepack | Image digest/toolchain được review cùng agent; không tải runtime trong build | `node --version`, `npm --version`, Corepack, image provenance và agent lifecycle |

NodeJS Plugin là dependency riêng, không phải Jenkins core. Nếu dùng wrapper của plugin, tên `Node 22.14.0` phải đúng với tool đã cấu hình trên controller. Nếu agent image đã chứa Node, không cần wrapper; Pipeline vẫn cần kiểm version fail-closed. Không chạy Node workload không tin cậy trên built-in node/controller.

```groovy
// Chỉ khi NodeJS Plugin và tool installation này đã được xác minh.
nodejs('Node 22.14.0') {
  sh 'node --version && npm --version'
}
```

### Pin Node Corepack và packageManager

`engines` trong `package.json` thông báo compatibility, nhưng không tự chọn binary cho Jenkins. CI release nên assert exact Node version, ví dụ `v22.14.0`, hoặc policy version range được owner chấp thuận. `.nvmrc` của repository hiện là `22`, thuận tiện cho local developer nhưng không đủ chính xác để làm release evidence một mình.

`packageManager` ghi package manager và version mong muốn, ví dụ `"packageManager": "pnpm@9.15.4"`. Corepack đi cùng một số bản Node để quản lý shim pnpm/Yarn; availability/enabled state thay đổi theo Node distribution. Trên agent đã pin, kiểm `corepack --version`, enable/configure theo policy image và xác minh `pnpm --version` hoặc `yarn --version` trước install. Không tải package-manager mới trong Pipeline release bằng lệnh không pin.

```json title="package.json"
{
  "engines": { "node": "22.14.0" },
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "test:ci": "node --test --test-reporter=junit --test-reporter-destination=reports/junit.xml",
    "coverage": "node ./scripts/write-coverage-fixture.mjs"
  }
}
```

Tên script và reporter flag là project contract, không phải npm default. Validate chúng với Node/test runner đã chọn trên clean agent trước khi đưa vào Jenkins check bắt buộc.

## Dependency tái lập và registry

### Chọn lệnh theo lockfile

Commit exactly one lockfile family for an application package manager and make CI reject missing or conflicting files. The installer below resolves declared dependency versions and integrity data; it does not prove a package is harmless.

| Lockfile được commit | Lệnh CI | Behavior khi lock không khớp |
| --- | --- | --- |
| `package-lock.json` | `npm ci` | Xóa `node_modules`, fail nếu lock và `package.json` không khớp |
| `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` | Fail thay vì sửa lockfile |
| `yarn.lock` với Yarn Berry | `yarn install --immutable` | Fail nếu install cần đổi lockfile/cache state |

Không thay `npm ci` bằng `npm install`, `pnpm install` thường hay Yarn command có thể sửa lockfile trong CI bắt buộc chỉ để chữa lockfile cũ. Update dependency và lockfile cùng reviewed change, chạy test rồi commit cả hai. Package manager selection là repository contract: không chạy cả ba installer trong một workspace.

`.npmrc` được commit có thể chứa non-secret setting như `registry`, `always-auth` policy hoặc scoped package mapping. Nó không được chứa access token, password hay base64 credential. Không archive `.npmrc`, user home config, npm debug log hay toàn workspace. Private registry access phải nằm trong Jenkins Credentials Binding scope ngắn, và token chỉ có read access cho scope/package path cần thiết.

### Lifecycle script registry và credential

`preinstall`, `install`, `postinstall`, `prepare` and package binary hooks run code supplied by the dependency graph. That is why dependency installation in a PR is execution of untrusted input, not merely a download. Keep PR on an isolated agent/cache/network tier and never bind publish, deploy or broad registry credentials there.

For a trusted lane that truly needs a private read registry, use a credential-aware helper or an `.npmrc` temporary file managed in a narrow closure. Do not pass token in `npm config set ...`, command-line argument, URL or log. The tool and registry must be reviewed to ensure it reads the secret without exposing it. If install does not need private packages, do not bind a registry credential at all.

<Callout type="warn" title="Không dùng ignore-scripts như một chứng nhận an toàn">
  `--ignore-scripts` có thể phù hợp cho một inspection lane, nhưng nhiều project cần lifecycle scripts để build native dependency. Nó không thay source review, lockfile, agent isolation, registry policy hay malware scanning. Chọn behavior theo project contract và ghi rõ evidence.
</Callout>

## Cache dependency theo trust tier

npm, pnpm and Yarn cache downloaded tarballs and metadata. Cache can improve duration but it is not a source of truth or a security boundary. A poisoned/stale cache, changed registry artifact, wrong file ownership or shared writable cache can change what a build executes.

| Tier | Cache policy | Không được làm |
| --- | --- | --- |
| PR/fork | Ephemeral cache, read-only verified seed, or cache key scoped to PR/project | Ghi vào cache consumed by trusted/release builds |
| Trusted CI | Cache key includes lockfile hash, Node/package-manager version, OS and architecture | Reuse cache after lockfile/toolchain change without invalidation |
| Release | Dedicated controlled cache or clean install according to risk | Treat cache hit as proof of provenance or skip integrity checks |

Đặt package-manager cache directory rõ ràng khi cần, ví dụ `npm_config_cache="$WORKSPACE/.npm-cache"`, rồi xóa theo workspace lifecycle hoặc ephemeral agent disposal. Cách này giới hạn cache trong một build nhưng có thể giảm hit rate. Shared cache cần owner, filesystem permission, quota, TTL, checksum/integrity policy và writable path riêng theo trust tier. Không cache `node_modules` qua các commit tùy ý theo mặc định; native binary và lifecycle output có thể phụ thuộc platform/version.

## Test coverage và evidence Jenkins

### JUnit và coverage không phải Jenkins core

Test command exit status decides the stage result. JUnit XML lets Jenkins display test cases only when the **JUnit Plugin** is installed and the reporter writes valid XML. Node's test runner, Jest, Vitest and Mocha use different reporter configuration; do not expect `junit` to create XML for them.

Coverage có cùng sự phân tách: LCOV/Cobertura XML do coverage tool như c8, Istanbul/nyc hoặc test framework tạo. Publish lên Jenkins trend/dashboard cần plugin, thường là Coverage hoặc Cobertura, với step/configuration phụ thuộc version. Generic `archiveArtifacts` step có thể giữ coverage file hẹp để inspection nhưng không tính quality gate. Confirm reporter, publisher, threshold và branch behavior trên controller sandbox; không bịa Pipeline step từ blog chưa xác minh.

### Jenkinsfile tham khảo

Declarative Pipeline này giả định protected `main` branch, agent image có Node `22.14.0`, npm và JUnit Plugin. Project implement script `test:ci` và `coverage` theo package contract của nó. `coverage` phải exit nonzero khi required coverage failure; ví dụ không âm thầm đổi lỗi thành success. Nó tách hai stage cùng contract test theo trust boundary thay vì chạy mọi revision trên trusted agent.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timeout(time: 25, unit: 'MINUTES')
  }

  stages {
    stage('PR: install and test untrusted source') {
      when {
        beforeAgent true
        changeRequest()
      }
      agent { label 'linux && node22-untrusted-pr' }
      steps {
        checkout scm
        sh '''#!/bin/sh
          set -eu
          test "$(node --version)" = 'v22.14.0'
          test -f package.json
          test -f package-lock.json
          test ! -f pnpm-lock.yaml
          test ! -f yarn.lock
          export npm_config_cache="$WORKSPACE/.npm-cache"
          npm ci
          mkdir -p reports coverage
          npm run test:ci
          test -s reports/junit.xml
          npm run coverage
          test -s coverage/lcov.info
        '''
      }
      post {
        always {
          junit allowEmptyResults: false, testResults: 'reports/junit.xml'
          archiveArtifacts artifacts: 'reports/junit.xml,coverage/lcov.info',
            allowEmptyArchive: false, fingerprint: true
        }
        cleanup {
          deleteDir()
        }
      }
    }

    stage('Protected revision: install and test trusted source') {
      when {
        beforeAgent true
        allOf {
          not { changeRequest() }
          anyOf {
            branch 'main'
            buildingTag()
          }
        }
      }
      agent { label 'linux && node22-trusted-ci' }
      steps {
        checkout scm
        sh '''#!/bin/sh
          set -eu
          test "$(node --version)" = 'v22.14.0'
          test -f package.json
          test -f package-lock.json
          test ! -f pnpm-lock.yaml
          test ! -f yarn.lock
          export npm_config_cache="$WORKSPACE/.npm-cache"
          npm ci
          mkdir -p reports coverage
          npm run test:ci
          test -s reports/junit.xml
          npm run coverage
          test -s coverage/lcov.info
        '''
      }
      post {
        always {
          junit allowEmptyResults: false, testResults: 'reports/junit.xml'
          archiveArtifacts artifacts: 'reports/junit.xml,coverage/lcov.info',
            allowEmptyArchive: false, fingerprint: true
        }
        cleanup {
          deleteDir()
        }
      }
    }
  }
}
```

`beforeAgent true` makes Jenkins evaluate `changeRequest()`, `branch` and `buildingTag()` before allocating the corresponding agent. PR code and its lifecycle scripts therefore never reach `node22-trusted-ci`; the PR cache is under that stage workspace and is removed in the stage `cleanup`. The trusted stage only checks out a non-PR `main` revision or tag. If SCM uses a merge queue with synthetic refs, configure an explicit trusted condition only after SCM policy verifies the queue revision is based on protected merges; do not grant it the trusted label merely because its name resembles `main`.

`agent none` means stages may use different workspaces. Each source-using stage performs its own `checkout scm` and `npm ci`; it does not assume `node_modules` survives from another agent. `post { cleanup { deleteDir() } }` belongs to each stage that allocated a workspace, runs after its `always` report publication, and only clears that stage workspace. Do not use a pipeline-level `deleteDir()` with `agent none`, and do not replace this with a path cleanup outside the workspace. `cleanWs()` is an alternative only when Workspace Cleanup Plugin is installed and its behavior is validated.

Mẫu này chủ ý dừng sau test. Package publish/release stage chỉ được chạy sau protected-revision gate, trên `node22-trusted-release` agent/cache boundary riêng, với registry credential least-privilege scope ngắn; nó không được chạy source hay lifecycle script từ untrusted PR. Branch protection, merge queue discovery, agent label, cache mount và credential scope là runtime policy: test chúng bằng harmless job trước release. Xem [Kiểm thử Jenkinsfile](/docs/pipelines/testing) về static evidence so với controller runtime evidence.

## Lab local không dùng registry

Lab này chỉ tạo empty-dependency fixture dưới temporary directory. Nó không gửi registry request, không gọi `npm install`, không tạo credential và không cần Node/npm cho static path. Local runtime check tùy chọn chỉ chạy checked-in script bằng Node; nó không tải package.

### Tạo fixture có guard

Chạy các block trong cùng một shell. `mktemp`, direct-parent check và marker giới hạn cleanup vào directory do lần chạy này tạo.

```bash
set -eu
umask 077

LAB_PARENT="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
LAB_PREFIX='jenkins-nodejs-lab.'
LAB_ROOT="$(mktemp -d "${LAB_PARENT}/${LAB_PREFIX}XXXXXX")"
LAB_MARKER="$LAB_ROOT/.lab-owned"

case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf '%s\n' 'Refuse unexpected lab path.' >&2; exit 1 ;;
esac
[ "$(dirname -- "$LAB_ROOT")" = "$LAB_PARENT" ] || {
  printf '%s\n' 'Refuse non-direct lab child.' >&2; exit 1;
}
printf '%s\n' 'jenkins-nodejs-lab-v1' > "$LAB_MARKER"
mkdir -p "$LAB_ROOT/src"
cat > "$LAB_ROOT/package.json" <<'EOF'
{"name":"node-ci-lab","version":"1.0.0","private":true,"engines":{"node":"22.14.0"},"scripts":{"test:ci":"node src/check.mjs"}}
EOF
cat > "$LAB_ROOT/package-lock.json" <<'EOF'
{"name":"node-ci-lab","version":"1.0.0","lockfileVersion":3,"requires":true,"packages":{"":{"name":"node-ci-lab","version":"1.0.0"}}}
EOF
cat > "$LAB_ROOT/.npmrc" <<'EOF'
registry=http://127.0.0.1:9/
offline=true
EOF
cat > "$LAB_ROOT/src/check.mjs" <<'EOF'
if (process.argv.includes('--check')) console.log('node fixture check: PASS');
else process.exitCode = 1;
EOF
printf 'Lab root: %s\n' "$LAB_ROOT"
```

### Static validation và runtime tùy chọn

Static validation kiểm tra fixture schema, lockfile và non-secret registry setting. Nó không chứng minh Node/npm/Corepack/Jenkins/plugin compatibility.

```bash
set -eu
: "${LAB_ROOT:?Run setup in the same shell}"
test -f "$LAB_ROOT/.lab-owned"
test "$(cat "$LAB_ROOT/.lab-owned")" = 'jenkins-nodejs-lab-v1'
grep -Fqx 'offline=true' "$LAB_ROOT/.npmrc"
! grep -Eqi '(_auth|token|password|password=)' "$LAB_ROOT/.npmrc"
python3 - <<'PY' "$LAB_ROOT/package.json" "$LAB_ROOT/package-lock.json"
import json
import sys
package = json.load(open(sys.argv[1], encoding='utf-8'))
lock = json.load(open(sys.argv[2], encoding='utf-8'))
assert package['engines']['node'] == '22.14.0'
assert lock['lockfileVersion'] == 3
assert lock['packages']['']['name'] == package['name']
print('static node fixture validation: PASS')
PY
```

Nếu Node `22.14.0` đã có local, command tùy chọn chỉ chạy local source; nó không gọi npm hay network.

```bash
if command -v node >/dev/null 2>&1 && [ "$(node --version)" = 'v22.14.0' ]; then
  node "$LAB_ROOT/src/check.mjs" --check
else
  printf '%s\n' 'Node 22.14.0 unavailable; static validation remains the only evidence.'
fi
```

### Cleanup và evidence

Static evidence mong đợi là `static node fixture validation: PASS`; optional evidence là `node fixture check: PASS`. Cả hai không chứng minh Jenkins, NodeJS Plugin, Corepack, npm registry authentication, dependency install, test reporter hay coverage publisher. Cleanup kiểm parent, prefix, marker và direct child trước khi chỉ xóa fixture.

```bash
set -eu
: "${LAB_ROOT:?LAB_ROOT is required}"
case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf '%s\n' 'Refuse cleanup outside lab prefix.' >&2; exit 1 ;;
esac
[ "$(dirname -- "$LAB_ROOT")" = "$LAB_PARENT" ] || exit 1
test -f "$LAB_MARKER"
test "$(cat "$LAB_MARKER")" = 'jenkins-nodejs-lab-v1'
cd / || exit 1
rm -rf -- "$LAB_ROOT"
printf '%s\n' 'Removed only guarded nodejs-lab fixture.'
```

## Troubleshooting

| Symptom | Evidence to check | Safe action |
| --- | --- | --- |
| Node mismatch | `node --version`, agent image/tool name, `.nvmrc`, `engines` and job log | Pin/provision the approved version; do not loosen a release check without compatibility review. |
| `npm ci` rejects lockfile | Diff `package.json`/`package-lock.json`, npm version and lockfile schema | Regenerate lockfile using the approved toolchain, review and commit it with manifest. |
| pnpm/Yarn changes lockfile | `packageManager`, Corepack version, exact lockfile and install output | Enable the approved manager and use frozen/immutable mode; do not let CI rewrite lock. |
| Cache changes result | Cache key, owner, Node/OS/architecture, lock hash and trust tier | Invalidate scoped cache and run clean install; never share writable PR cache with release. |
| Native module fails | Node ABI, CPU architecture, libc, compiler/Python toolchain and prebuild source | Rebuild in matching agent image; do not copy `node_modules` from another platform. |
| JUnit appears empty | Test reporter config, XML path, JUnit Plugin/version and command exit code | Fix project reporter/path and keep `allowEmptyResults: false` for required tests. |
| Coverage file exists but no trend | Coverage tool output, LCOV/Cobertura format and approved publisher plugin | Archive narrow output for evidence, then configure/validate the specific publisher on sandbox. |
| Private registry returns `401` | Credential ID, scope, expiry, registry audit and agent trust | Bind a read-only token only in trusted stage; never print or pass it by argv. |

## Checklist trước merge

- [ ] Node version, agent image/tool installation and package-manager version are pinned and have an owner.
- [ ] Exactly one package-manager lockfile is committed; CI uses `npm ci`, frozen pnpm or immutable Yarn matching that lockfile.
- [ ] Package install lifecycle scripts are treated as code execution; PR/fork has isolated agent, egress and cache without release credential.
- [ ] Registry config contains no secret; private read token has minimum scope, narrow binding and never appears in `.npmrc`, argv, log, report or artifact.
- [ ] Cache key includes project, lockfile, Node/package-manager version and platform; writable caches are split by trust tier.
- [ ] Test command fails on test failure and writes reporter output at a verified path; report publish does not mask command failure.
- [ ] JUnit Plugin and coverage publisher/tool are documented as runtime dependencies, with reporter/format/threshold confirmed on sandbox.
- [ ] Archive patterns name only intended report/coverage files; workspace/cache cleanup and retention have been reviewed.
- [ ] Lab uses only temporary fixture/local Node source, guards cleanup and records static versus runtime limitations honestly.

## Nguồn chính thức

- [Node.js releases](https://nodejs.org/en/about/previous-releases) — release line and support policy.
- [Node.js test runner](https://nodejs.org/api/test.html) — reporters and test behavior by Node version.
- [Node.js Corepack](https://nodejs.org/api/corepack.html) — package manager shims and version-specific behavior.
- [npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci) — clean immutable install semantics.
- [npm scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts) — lifecycle script execution.
- [pnpm install](https://pnpm.io/cli/install) — frozen lockfile behavior.
- [Yarn install](https://yarnpkg.com/cli/install) — immutable install behavior.
- [Jenkins NodeJS Plugin](https://plugins.jenkins.io/nodejs/) — tool installation and Pipeline wrapper assumptions.
- [Jenkins JUnit Plugin](https://plugins.jenkins.io/junit/) — XML test result publisher.
- [Jenkins Coverage Plugin](https://plugins.jenkins.io/coverage/) — coverage publisher requiring runtime validation.
- [Jenkins Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/) — credential scope and management.

## Đọc tiếp

<Cards>
  <Card title="Kiểm thử Jenkinsfile" href="/docs/pipelines/testing" description="Phân biệt syntax, mock và controller runtime verification." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Nạp registry credential đúng scope mà không lộ secret." />
  <Card title="Bảo mật Agent và Plugin" href="/docs/security/agent-plugin-security" description="Tách pool, cache và credential theo trust tier." />
  <Card title="Tự động hóa kiểm thử" href="/docs/delivery/test-automation" description="Thiết kế test gate, artifact evidence và flaky-test handling." />
  <Card title="Build Artifacts" href="/docs/jobs/artifacts" description="Archive output hẹp và quản lý retention an toàn." />
  <Card title="Docker Registry" href="/docs/integrations/docker-registry" description="Kết nối Node build với OCI digest và registry promotion." />
</Cards>
