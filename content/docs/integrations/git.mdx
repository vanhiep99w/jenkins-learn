---
title: "Git với Jenkins"
description: "Checkout source tái lập bằng Jenkins Git plugin, ref/credential có kiểm soát, submodule, Git LFS và fixture local an toàn."
---

<Callout type="info" title="Phạm vi và điều kiện">
  Hướng dẫn áp dụng cho Jenkins LTS có Git plugin, Git Client Plugin và agent Linux có Git. Tên extension, credential type và hành vi SCM là dữ liệu runtime; xác nhận bằng Pipeline Syntax, plugin inventory và sandbox của controller trước khi áp dụng cho repository thật.
</Callout>

Git là transport và lịch sử source; Jenkins dùng SCM integration để chọn revision, cấp workspace và chạy Jenkinsfile. Một checkout đáng tin phải trả lời rõ Jenkins đang dùng commit nào, credential nào được phép đọc source, history có bị cắt không và source đó thuộc trust tier nào.

## Mục lục

- [Mục tiêu và mô hình SCM](#mục-tiêu-và-mô-hình-scm)
  - [Git plugin Git Client và SCM API](#git-plugin-git-client-và-scm-api)
  - [`checkout scm` và cấu hình GitSCM](#checkout-scm-và-cấu-hình-gitscm)
- [Ref commit và ranh giới tin cậy](#ref-commit-và-ranh-giới-tin-cậy)
  - [Branch pull request và commit pin](#branch-pull-request-và-commit-pin)
  - [Credential transport và host key](#credential-transport-và-host-key)
- [Checkout options và workspace](#checkout-options-và-workspace)
  - [Clean checkout changelog polling timeout](#clean-checkout-changelog-polling-timeout)
  - [Shallow clone và lịch sử thiếu](#shallow-clone-và-lịch-sử-thiếu)
- [Submodule và Git LFS](#submodule-và-git-lfs)
  - [Submodule commit credentials và URL](#submodule-commit-credentials-và-url)
  - [Git LFS trên agent](#git-lfs-trên-agent)
- [Jenkinsfile tham chiếu](#jenkinsfile-tham-chiếu)
  - [Checkout theo SCM context](#checkout-theo-scm-context)
  - [Khi cần GitSCM extension](#khi-cần-gitscm-extension)
- [Lab local tái lập](#lab-local-tái-lập)
  - [Tạo fixture Git bare submodule và shallow clone](#tạo-fixture-git-bare-submodule-và-shallow-clone)
  - [Xác minh và cleanup có guard](#xác-minh-và-cleanup-có-guard)
  - [Giới hạn runtime](#giới-hạn-runtime)
- [Troubleshooting](#troubleshooting)
- [Checklist tự kiểm tra](#checklist-tự-kiểm-tra)
- [Nguồn chính thức và đọc tiếp](#nguồn-chính-thức-và-đọc-tiếp)

## Mục tiêu và mô hình SCM

Sau bài này, bạn có thể checkout đúng revision mà Jenkins đã chọn, chọn lịch sử clone đủ cho task và giới hạn khả năng đọc Git theo job/trust tier. Bạn cũng biết khi nào submodule hoặc LFS biến một clone nhỏ thành thêm dependency, credential và network flow.

### Git plugin Git Client và SCM API

| Thành phần | Vai trò | Không tự bảo đảm |
| --- | --- | --- |
| **Git plugin** | SCM implementation cho Git, source configuration, checkout behaviors và Pipeline integration | Git binary tồn tại trên agent, credential đúng scope hay source được tin cậy |
| **Git Client Plugin** | Lớp client Git mà Git plugin dùng; có thể gọi command-line Git hoặc implementation khác theo runtime | Submodule/LFS/SSH behavior giống nhau ở mọi client/version |
| **SCM API** | Hợp đồng chung để source plugin và Multibranch biểu diễn head, revision, change request | Git transport, clone depth hay Jenkinsfile step riêng |
| **Branch Source plugin** | Discovery branch/change request của provider như GitHub/GitLab | Git checkout tự động an toàn cho fork hoặc credential release |
| **Git CLI trên agent** | Thực thi `git`, và `git-lfs` khi repository dùng LFS | Plugin/controller có đủ extension hoặc host-key policy |

Git plugin, Git Client Plugin và SCM API là dependency/plugin phải pin, review advisory và test compatibility với Jenkins LTS. Đừng gọi `GitSCM` là một Pipeline step độc lập. `checkout` là step Pipeline; `GitSCM` là cấu hình SCM được đưa vào step đó theo plugin/runtime.

### `checkout scm` và cấu hình GitSCM

`checkout scm` dùng **SCM context của job hiện tại**. Với Pipeline from SCM hoặc Multibranch, controller/source plugin đã chọn repository, ref/revision, credential và behaviors trước khi Jenkinsfile chạy. Đây là default an toàn nhất khi mục tiêu là checkout đúng source của run.

Dùng `checkout([$class: 'GitSCM', ...])` chỉ khi job cần behavior Git khác đã được review, như depth, clean checkout hoặc submodule. Cấu hình explicit không kế thừa mọi discovery/merge behavior ngầm định của source plugin. Lấy snippet chính xác từ **Pipeline Syntax → Snippet Generator** trên controller có Git plugin đang dùng; không ghép `$class` từ blog vào Jenkinsfile production.

## Ref commit và ranh giới tin cậy

### Branch pull request và commit pin

Branch là ref di động; commit SHA xác định object bất biến trong repository. Console/evidence phải ghi `git rev-parse HEAD`, ref Jenkins chọn và, với change request, strategy source/merge mà plugin đã cấu hình. Không suy diễn một build mang tên branch là build đúng tip branch tại thời điểm bạn đang đọc log.

| Trường hợp | Điều cần kiểm | Quyết định an toàn |
| --- | --- | --- |
| Branch bảo vệ | Revision SHA, Jenkinsfile của revision, branch protection và source policy | Release chỉ sau merge/gate mà tổ chức phê duyệt |
| Pull request nội bộ | Head SHA hoặc merge result theo behavior plugin | Ghi rõ strategy; base branch tiến lên có thể làm merge result đổi |
| Fork/untrusted PR | Jenkinsfile, scripts và dependency là input không tin cậy | Chỉ pool `untrusted-pr`, không credential publish/release |
| Tag release | Tag name và commit/tag object theo policy | Xác minh tag/signature nếu policy yêu cầu; không tin tên tag đơn lẻ |

`checkout scm` không làm code từ fork an toàn. GitHub/GitLab discovery policy, Jenkins authorization, agent isolation, workspace/cache và credential scope phải cùng ngăn source không tin cậy dùng capability release. Xem [Tích hợp GitHub](/docs/integrations/github), [Tích hợp GitLab](/docs/integrations/gitlab) và [Bảo mật Agent và Plugin](/docs/security/agent-plugin-security).

### Credential transport và host key

Không đặt password, token hay private key vào clone URL, query string, Jenkinsfile, shell argv, Git config commit vào workspace hoặc log. Dùng credential ID đã được job/folder cấp quyền:

| Transport | Credential phù hợp | Quy tắc tối thiểu |
| --- | --- | --- |
| HTTPS clone/fetch | Username/password hoặc token type mà Git server hỗ trợ, do Git plugin dùng | Read-only cho repository/namespace cần checkout; tách khỏi token API/release |
| SSH clone/fetch | SSH private key dành cho Git transport | Read-only deploy key khi có thể; host key được xác minh, không bỏ qua checking |
| Provider API discovery | Credential do Branch Source plugin yêu cầu | Permission đọc metadata/source nhỏ nhất; không dùng làm clone URL |

Với SSH, host key verification thuộc cấu hình Git/Jenkins/agent đã review. Không dùng `StrictHostKeyChecking=no` hoặc strategy nhận mọi host key để sửa failure. Với HTTPS, agent phải trust CA và hostname hợp lệ; không tắt TLS verification. Rotation tạo credential mới, thử checkout sandbox, chuyển consumer rồi revoke bản cũ theo overlap window. [Credentials trong Pipeline](/docs/pipelines/credentials) giải thích scope/binding và giới hạn masking.

## Checkout options và workspace

### Clean checkout changelog polling timeout

Workspace có thể còn `.git`, file build, cache hoặc submodule từ run trước. Clean checkout giảm drift workspace, nhưng có thể tốn bandwidth/time và không thay isolation filesystem giữa trust tier.

| Tùy chọn | Khi hữu ích | Giới hạn cần nêu rõ |
| --- | --- | --- |
| Clean before checkout | Build tạo file không thuộc source hoặc agent cố định tái sử dụng workspace | Không xóa cache/home ngoài workspace; chỉ dùng behavior/plugin đã xác minh |
| Clean after checkout | Muốn kết thúc run không còn output source | Có thể xóa evidence cần archive nếu đặt sai thứ tự |
| Changelog | Cần liên kết build với commit range | Lịch sử shallow hoặc revision bị thiếu làm range không đầy đủ |
| Polling | Git plugin so sánh ref để trigger khi có thay đổi | Webhook thường nhanh hơn; polling cần interval/rate/capacity có owner |
| Timeout clone/fetch | Tránh executor chờ network vô hạn | Timeout không sửa DNS, TLS, credential, repository outage hay object lớn |
| Retry có giới hạn | Lỗi mạng nhất thời được phân loại | Không retry xác thực/host key/policy failure hay biến checkout sai thành pass |

Archive report/artifact trước `deleteDir()` hoặc clean behavior cuối stage. Không chạy cleanup path tự ghép từ branch/user input. Mỗi stage agent có thể có workspace khác; checkout lại hoặc chuyển artifact được kiểm soát thay vì giả định cùng filesystem.

### Shallow clone và lịch sử thiếu

Shallow clone với `depth: 1` giảm bytes và thời gian cho một checkout chỉ cần tip commit. Nó không luôn đủ: changelog từ build trước, `merge-base`, tag/version derivation, `git describe`, blame, submodule history, merge result hoặc tooling scan history có thể cần commit/tag không có trong clone.

Chọn depth theo task và chứng minh bằng sandbox:

- build/test chỉ đọc source tại một SHA có thể dùng depth nhỏ;
- changelog hoặc so sánh base cần đủ history/ref liên quan, hoặc phải fetch bổ sung có chủ đích;
- release lấy version từ tag cần `noTags: false` và tag/history đủ để tool tìm object;
- khi checkout change request/submodule, kiểm strategy/revision thực tế vì shallow ref có thể không chứa parent cần thiết.

Không kết luận depth `1` luôn nhanh hơn hay luôn đúng. Lưu clone depth, ref và SHA trong evidence nếu decision này ảnh hưởng changelog/release.

## Submodule và Git LFS

### Submodule commit credentials và URL

Superproject lưu **gitlink commit** cho từng submodule. `git submodule update --init --recursive` phải checkout đúng commit đó, không tự lấy tip branch của submodule trừ khi một workflow chủ đích bật tracking. Recursive update có thể kéo thêm repository, URL, host key, credential và bandwidth ngoài superproject.

- Review `.gitmodules` như source: URL tuyệt đối hoặc relative URL có thể route sang host/namespace khác khi fork/mirror thay remote.
- Pin gitlink commit; tránh `--remote` cho build tái lập trừ khi policy xác định ref/version và evidence.
- Cấp credential đọc cho từng host/repository cần thiết. `parentCredentials` chỉ phù hợp khi URL/permission thực sự thuộc cùng trust boundary; không dùng nó để đẩy credential parent sang URL submodule không review.
- Clone submodule recursive chỉ trên agent/trust tier được phép đọc chúng. Fork PR không nhận credential có thể đọc private submodule/release source.

Nếu Git plugin UI có SubmoduleOption, recursive update, depth/reference hoặc parent credential options, xác minh exact field/semantics trên version plugin hiện hành. Không giả định Git CLI config và plugin behavior giống nhau mọi runtime.

### Git LFS trên agent

Git LFS lưu pointer nhỏ trong Git object và tải content lớn từ LFS endpoint khi `git lfs pull` hoặc checkout cần smudge. Git plugin clone thành công không chứng minh LFS object đã có: agent cần binary `git-lfs`, network/bandwidth/cache phù hợp và credential behavior được kiểm chứng cho endpoint LFS.

Trước khi chạy build cần LFS content:

1. pin `git-lfs` trong agent image/tool catalog và ghi version;
2. phát hiện `.gitattributes` có `filter=lfs`, rồi fail rõ nếu agent thiếu `git-lfs`;
3. xác minh LFS download dùng capability read-only đúng repository/host và không đưa token vào URL/log;
4. đặt quota/cache theo trust tier vì object LFS có thể lớn; không dùng cache ghi chung với fork/release;
5. archive evidence về LFS/version/bytes đã tải, không archive credential config.

LFS pointer không phải binary thật. Test chỉ parse source có thể không cần pull; test/package dùng asset phải xác minh object content tồn tại trước khi chạy.

## Jenkinsfile tham chiếu

### Checkout theo SCM context

Jenkinsfile dưới dùng `checkout scm` để lấy revision do job/Multibranch đã chọn. Nó cần Pipeline: Declarative, Git plugin/Git Client Plugin, Git CLI trên agent và JUnit nếu dự án tạo XML. `git lfs` chỉ là điều kiện khi repository khai báo `filter=lfs`; stage fail rõ thay vì chạy với pointer thiếu content.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timeout(time: 20, unit: 'MINUTES')
  }

  stages {
    stage('Checkout revision') {
      agent { label 'linux && untrusted-pr' }
      steps {
        checkout scm
        sh '''#!/usr/bin/env sh
          set -eu
          git rev-parse HEAD
          git status --porcelain
          if test -f .gitattributes && grep -Eq 'filter=lfs' .gitattributes; then
            command -v git-lfs
            git lfs version
            git lfs pull
          fi
        '''
      }
      post {
        cleanup {
          deleteDir()
        }
      }
    }

    stage('Trusted release checkout') {
      when {
        beforeAgent true
        allOf {
          branch 'main'
          not { changeRequest() }
        }
      }
      agent { label 'linux && trusted-release' }
      steps {
        checkout scm
        sh '''#!/usr/bin/env sh
          set -eu
          git rev-parse HEAD > checked-out-revision.txt
          test -s checked-out-revision.txt
        '''
        archiveArtifacts artifacts: 'checked-out-revision.txt',
          allowEmptyArchive: false, fingerprint: true
      }
      post {
        cleanup {
          deleteDir()
        }
      }
    }
  }
}
```

Pull request chỉ dùng stage đầu và không bind credential publish/release. Release checkout chạy sau branch/trust gate trên pool riêng. `git lfs pull` dùng credential behavior đã được Git plugin/agent configured; không thêm `withCredentials` hoặc token shell chỉ để LFS chạy.

### Khi cần GitSCM extension

Mẫu dưới là cấu hình **tham khảo** khi một job cần shallow clone, clean workspace và submodule. Nó chỉ hợp lệ khi controller có Git plugin hỗ trợ các extension/class này; lấy snippet từ Snippet Generator và kiểm tra field trên sandbox trước. URL dùng SSH không chứa secret; `credentialsId` chỉ là metadata của Jenkins credential read-only.

```groovy
checkout([
  $class: 'GitSCM',
  branches: [[name: 'refs/heads/main']],
  doGenerateSubmoduleConfigurations: false,
  extensions: [
    [$class: 'CleanBeforeCheckout'],
    [$class: 'CloneOption', depth: 20, noTags: false, shallow: true, timeout: 10],
    [$class: 'SubmoduleOption',
      disableSubmodules: false,
      parentCredentials: false,
      recursiveSubmodules: true,
      trackingSubmodules: false,
      timeout: 10]
  ],
  userRemoteConfigs: [[
    credentialsId: 'scm-readonly-ssh',
    url: 'ssh://git@scm.example.invalid/team/widget.git'
  ]]
])
```

Đoạn này checkout branch `main` từ GitSCM explicit, không phải cách thay thế PR/Merge discovery của Multibranch. Nếu job cần revision provider chọn cho change request, ưu tiên `checkout scm`; dùng explicit GitSCM chỉ sau khi biết chính xác ref/revision nào cần. `CleanBeforeCheckout` và shallow history phải được đánh giá cùng changelog/tag/submodule use case, không bật như default chung.

## Lab local tái lập

Lab dùng bare repository và `file://` local dưới một directory `mktemp`. Nó không kết nối remote, không tạo credential, không mở SSH server và không cần Jenkins. Git LFS là capability tùy chọn: fixture chỉ đặt `.gitattributes` để kiểm tra phát hiện LFS, không tải object LFS.

### Tạo fixture Git bare submodule và shallow clone

Chạy hai block trong **cùng Bash shell**. Parent được canonicalize, prefix/marker xác định ownership và cleanup chỉ được phép ở direct child vừa tạo.

```bash
set -eu
umask 077

LAB_PARENT="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
LAB_PREFIX='jenkins-git-integration-lab.'
LAB_ROOT="$(mktemp -d "${LAB_PARENT}/${LAB_PREFIX}XXXXXX")"
LAB_MARKER="${LAB_ROOT}/.lab-owned-marker"

case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf '%s\n' 'Refuse: unexpected lab prefix.' >&2; exit 1 ;;
esac
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
printf '%s\n' 'jenkins-git-integration-lab-v1' > "$LAB_MARKER"

SUB_WORK="$LAB_ROOT/submodule-work"
SUB_BARE="$LAB_ROOT/submodule.git"
APP_WORK="$LAB_ROOT/app-work"
APP_BARE="$LAB_ROOT/app.git"
FULL_CLONE="$LAB_ROOT/full-clone"
SHALLOW_CLONE="$LAB_ROOT/shallow-clone"

git init "$SUB_WORK" >/dev/null
git -C "$SUB_WORK" config user.name 'Jenkins Training'
git -C "$SUB_WORK" config user.email 'jenkins-training@example.invalid'
printf 'submodule fixture\n' > "$SUB_WORK/library.txt"
git -C "$SUB_WORK" add library.txt
git -C "$SUB_WORK" commit -m 'add submodule fixture' >/dev/null
git clone --bare "$SUB_WORK" "$SUB_BARE" >/dev/null

git init "$APP_WORK" >/dev/null
git -C "$APP_WORK" config user.name 'Jenkins Training'
git -C "$APP_WORK" config user.email 'jenkins-training@example.invalid'
printf 'first revision\n' > "$APP_WORK/app.txt"
printf 'assets/demo.bin filter=lfs -text\n' > "$APP_WORK/.gitattributes"
git -C "$APP_WORK" add app.txt .gitattributes
git -C "$APP_WORK" commit -m 'first revision' >/dev/null
git -C "$APP_WORK" tag v1.0.0
git -C "$APP_WORK" -c protocol.file.allow=always submodule add "$SUB_BARE" vendor/library >/dev/null
git -C "$APP_WORK" add .gitmodules vendor/library
git -C "$APP_WORK" commit -m 'pin submodule commit' >/dev/null
printf 'second revision\n' >> "$APP_WORK/app.txt"
git -C "$APP_WORK" add app.txt
git -C "$APP_WORK" commit -m 'second revision' >/dev/null
git clone --bare "$APP_WORK" "$APP_BARE" >/dev/null

git -c protocol.file.allow=always clone "$APP_BARE" "$FULL_CLONE" >/dev/null
git -C "$FULL_CLONE" -c protocol.file.allow=always submodule update --init --recursive >/dev/null
git clone --depth 1 --no-tags "file://$APP_BARE" "$SHALLOW_CLONE" >/dev/null

printf 'LAB_ROOT=%s\n' "$LAB_ROOT"
printf 'fixture Git bare/submodule/shallow clone: PASS\n'
```

### Xác minh và cleanup có guard

```bash
set -eu
: "${LAB_ROOT:?Run the fixture block in this shell first}"
: "${LAB_MARKER:?Run the fixture block in this shell first}"
case "$LAB_ROOT" in
  "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
  *) printf '%s\n' 'Refuse: invalid lab prefix.' >&2; exit 1 ;;
esac
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
test "$(cat "$LAB_MARKER")" = 'jenkins-git-integration-lab-v1'

git -C "$FULL_CLONE" rev-parse --verify HEAD >/dev/null
git -C "$FULL_CLONE" submodule status --recursive | grep -q 'vendor/library'
test "$(git -C "$SHALLOW_CLONE" rev-parse --is-shallow-repository)" = 'true'
test -z "$(git -C "$SHALLOW_CLONE" tag --list)"
grep -Fqx 'assets/demo.bin filter=lfs -text' "$FULL_CLONE/.gitattributes"
if command -v git-lfs >/dev/null 2>&1; then
  git -C "$FULL_CLONE" lfs version
  printf 'git-lfs capability: installed; fixture has no LFS object to download.\n'
else
  printf 'git-lfs capability: unavailable; LFS detection simulated only.\n'
fi
printf 'ref=%s shallow=true submodule=PASS\n' "$(git -C "$FULL_CLONE" rev-parse --short=12 HEAD)"

cleanup_lab() {
  test -n "${LAB_ROOT:-}"
  test -n "${LAB_PARENT:-}"
  case "$LAB_ROOT" in
    "$LAB_PARENT"/"$LAB_PREFIX"*) ;;
    *) printf '%s\n' 'Refuse: unexpected cleanup path.' >&2; return 1 ;;
  esac
  test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
  test -f "$LAB_MARKER"
  test "$(cat "$LAB_MARKER")" = 'jenkins-git-integration-lab-v1'
  cd / || return 1
  rm -rf -- "$LAB_ROOT"
}
cleanup_lab
test ! -e "$LAB_ROOT"
printf 'guarded Git fixture cleanup: PASS\n'
```

Expected output gồm `fixture Git bare/submodule/shallow clone: PASS`, một dòng `ref=... shallow=true submodule=PASS` và `guarded Git fixture cleanup: PASS`. Shallow clone cố ý không có tag để minh họa rằng task cần tag/history không được dùng depth đó mà chưa đánh giá.

### Giới hạn runtime

Fixture chỉ chứng minh Git CLI local, bare repository, gitlink submodule, shallow flag và guard cleanup. Nó không chứng minh Jenkins Git/Git Client/SCM API plugin, Multibranch revision selection, provider PR merge behavior, HTTPS/SSH credential, host key, remote LFS endpoint, bandwidth/cache hoặc Jenkins workspace. Khi có Git LFS binary, fixture chỉ in version; nó không có object LFS để tải.

## Troubleshooting

| Triệu chứng | Evidence cần xem | Hướng xử lý an toàn |
| --- | --- | --- |
| `checkout scm` dùng revision không mong đợi | Build SCM revision, `git rev-parse HEAD`, branch/change request strategy và indexing log | Sửa source behavior/job policy rồi test sandbox; không hard-code branch để che lỗi discovery. |
| Clone HTTPS/SSH bị từ chối | Credential ID/scope, repository permission, token expiry, host key hoặc CA/TLS | Cấp read-only đúng repo, rotate theo policy, xác minh host/CA; không in token hay tắt verification. |
| Shallow build thiếu changelog/tag | `git log`, `git tag`, `merge-base`, depth/no-tags và tool requirement | Tăng depth/fetch ref/tag có chủ đích hoặc dùng full clone cho stage cần history. |
| Submodule update fail | `.gitmodules`, gitlink SHA, URL host, recursive setting, credential/host key | Review URL/commit và cấp read đúng submodule; không bật parent credential không giới hạn. |
| LFS pointer xuất hiện trong test | `.gitattributes`, `git-lfs` version, LFS endpoint/credential, quota | Cài/pin Git LFS trên agent, verify read capability và chạy pull trong sandbox. |
| Workspace còn file lạ | Agent lifecycle, clean behavior, workspace ownership/cache và concurrent run | Dùng clean extension đã review, cleanup đúng workspace và tách trust tier. |
| Polling/webhook tạo build trùng | Poll interval, webhook delivery, indexing history, revision SHA và queue | Deduplicate publish theo version/digest; không tắt mọi trigger để che symptom. |

## Checklist tự kiểm tra

- [ ] Jenkins LTS, Git plugin, Git Client Plugin, SCM API và source plugin có version/owner/advisory review; agent có Git version phù hợp.
- [ ] `checkout scm` được ưu tiên khi cần revision do job/Multibranch chọn; GitSCM extension chỉ dùng snippet đã kiểm chứng runtime.
- [ ] Evidence ghi ref/revision SHA, strategy change request, clone depth/no-tags và toolchain khi chúng ảnh hưởng kết quả.
- [ ] Clone URL không chứa secret; HTTPS/SSH credential read-only có owner, scope, rotation/revoke; SSH host key và HTTPS CA/TLS được xác minh.
- [ ] PR/fork chỉ chạy pool untrusted, không credential release/publish/private submodule, cache release ghi được hay network đặc quyền.
- [ ] Clean checkout/cleanup chỉ nhắm workspace đã biết, archive evidence trước cleanup và không bị nhầm với security boundary.
- [ ] Shallow clone được đánh giá với changelog, tag, merge-base, release và submodule requirement; không dùng depth tối thiểu theo thói quen.
- [ ] `.gitmodules`, gitlink commit, recursive behavior, relative URL và submodule credential đã được review theo từng host/repository.
- [ ] Git LFS binary/version, endpoint read permission, quota/cache trust tier và pointer/content validation đã được kiểm thử khi dự án dùng LFS.
- [ ] Polling, webhook, timeout và retry có owner/idempotency; runtime Jenkins/Git provider chỉ được khẳng định sau sandbox.

## Nguồn chính thức và đọc tiếp

- [Jenkins Git plugin](https://plugins.jenkins.io/git/)
- [Jenkins Git Client Plugin](https://plugins.jenkins.io/git-client/)
- [Jenkins SCM API Plugin](https://plugins.jenkins.io/scm-api/)
- [Jenkins Pipeline SCM step](https://www.jenkins.io/doc/pipeline/steps/workflow-scm-step/)
- [Jenkins Git Pipeline steps](https://www.jenkins.io/doc/pipeline/steps/git/)
- [Git clone documentation](https://git-scm.com/docs/git-clone)
- [Git submodule documentation](https://git-scm.com/docs/git-submodule)
- [Git LFS documentation](https://git-lfs.com/)
- [Jenkins Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/)

<Cards>
  <Card title="Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Kiểm tra Pipeline as Code, revision và runtime plugin trước khi chạy." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Giữ credential Git/release ngoài URL, argv, log và workspace." />
  <Card title="Tích hợp GitHub" href="/docs/integrations/github" description="Thiết kế Multibranch, pull request và GitHub App theo trust tier." />
  <Card title="Tích hợp GitLab" href="/docs/integrations/gitlab" description="Quản lý branch/MR, webhook và GitLab credential tối thiểu." />
  <Card title="Tổng quan Jenkins Agent" href="/docs/agents/overview" description="Chọn pool, workspace và ranh giới thực thi cho checkout." />
  <Card title="Kiểm thử Jenkinsfile" href="/docs/pipelines/testing" description="Phân biệt static validation với controller/plugin runtime." />
</Cards>
