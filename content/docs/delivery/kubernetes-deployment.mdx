---
title: "Triển khai ứng dụng lên Kubernetes"
description: "Runbook triển khai image bất biến từ Jenkins vào Kubernetes với quyền tối thiểu, kiểm chứng rollout và quay lui có kiểm soát."
---

<Callout type="warn" title="Phạm vi vận hành">
  Runbook này dành cho workload HTTP stateless đã có namespace và baseline platform được phê duyệt. Ví dụ dùng tên, digest và registry giả; không dùng kubeconfig, Secret, namespace hay cluster production cho lab. Một thay đổi database hoặc một rollout chưa rõ trạng thái luôn cần owner chịu trách nhiệm trước khi tiếp tục.
</Callout>

Jenkins có thể điều phối việc phát hành, nhưng không nên trở thành cluster administrator. Luồng an toàn bắt đầu ở CI: build, test, scan và ký một image; CD chỉ chọn đúng image bất biến đó để cập nhật workload được phép. Sau deploy, pipeline giữ lại bằng chứng về digest, revision, rollout và quan sát runtime thay vì chỉ kết luận từ exit code của một lệnh.

## Mục lục

- [Mục tiêu và ranh giới](#mục-tiêu-và-ranh-giới)
  - [Kết quả cần đạt](#kết-quả-cần-đạt)
  - [CI, CD trực tiếp và GitOps](#ci-cd-trực-tiếp-và-gitops)
- [Hợp đồng phát hành](#hợp-đồng-phát-hành)
  - [Artifact, digest và chữ ký](#artifact-digest-và-chữ-ký)
  - [Môi trường, namespace và cấu hình](#môi-trường-namespace-và-cấu-hình)
  - [Quality gate và approval](#quality-gate-và-approval)
- [Baseline Kubernetes](#baseline-kubernetes)
  - [Manifest workload](#manifest-workload)
  - [ServiceAccount và RBAC tối thiểu](#serviceaccount-và-rbac-tối-thiểu)
  - [Network, capacity và quan sát](#network-capacity-và-quan-sát)
- [Pipeline Jenkins tham chiếu](#pipeline-jenkins-tham-chiếu)
  - [Giả định plugin và agent](#giả-định-plugin-và-agent)
  - [Jenkinsfile deploy theo digest](#jenkinsfile-deploy-theo-digest)
  - [Helm và GitOps là lựa chọn khác](#helm-và-gitops-là-lựa-chọn-khác)
- [Thực hiện rollout và xác minh](#thực-hiện-rollout-và-xác-minh)
  - [Ý nghĩa rollout status](#ý-nghĩa-rollout-status)
  - [Evidence sau phát hành](#evidence-sau-phát-hành)
  - [Timeout, readiness failure và approval](#timeout-readiness-failure-và-approval)
- [Migration và rollback](#migration-và-rollback)
  - [Quay lui Deployment hoặc manifest](#quay-lui-deployment-hoặc-manifest)
  - [Cảnh báo database](#cảnh-báo-database)
- [Lab local tái lập](#lab-local-tái-lập)
  - [Tạo fixture có guard](#tạo-fixture-có-guard)
  - [Kiểm tra tĩnh và runtime tùy chọn](#kiểm-tra-tĩnh-và-runtime-tùy-chọn)
  - [Cleanup có guard](#cleanup-có-guard)
- [Troubleshooting](#troubleshooting)
- [Checklist phát hành](#checklist-phát-hành)
- [Trade-offs](#trade-offs)
- [Nguồn chính thức và đọc tiếp](#nguồn-chính-thức-và-đọc-tiếp)

## Mục tiêu và ranh giới

### Kết quả cần đạt

Sau khi hoàn thành runbook, người vận hành có thể:

- deploy một OCI image bằng digest vào `Deployment` namespaced từ Jenkins trusted agent;
- tách CI không đặc quyền khỏi CD có kubeconfig, đồng thời chặn pull request và branch chưa được bảo vệ trước khi credential được bind;
- kiểm tra manifest tĩnh khác với kiểm tra admission, RBAC, image pull và readiness tại cluster;
- thu evidence đủ để trả lời image nào, identity nào, revision nào và rollout có đạt hay không;
- rollback có owner sau khi xem trạng thái thật, đồng thời không suy luận rollback application sẽ đảo database schema;
- chạy lab chỉ tạo fixture vô hại dưới thư mục tạm, có prefix, parent và marker guard.

Sơ đồ dưới là ranh giới trách nhiệm, không phải đường đi duy nhất của mọi byte:

```text
source revision
      │
      ▼
CI trên agent không tin cậy cho PR ── test, scan, SBOM ──► image đã kiểm
      │                                                        │
      │ main đã bảo vệ, gate pass                              ▼
      └────────────────────────────────────────► registry: tag tra cứu + digest
                                                               │
                                              Jenkins trusted deploy agent
                                               kubeconfig namespaced ngắn hạn
                                                               │
                                                               ▼
                                                   Deployment trong namespace
                                                               │
                                                               ▼
                                           rollout, events, logs, metrics, audit
```

### CI, CD trực tiếp và GitOps

**CI** biến source thành artifact: chạy test, SAST/dependency/container scan, tạo SBOM và đẩy image vào registry. CI có thể chạy trên pool pull request không tin cậy nếu pool đó không có quyền push release hay deploy.

**CD trực tiếp** để Jenkins gọi Kubernetes API bằng identity deploy hẹp. Nó đơn giản cho một service nhỏ, nhưng Jenkins phải giữ kubeconfig hoặc dùng workload identity để gọi API. Chỉ một stage release trên agent tin cậy được nhận capability này.

**GitOps** để Jenkins cập nhật pull request/commit trong repository cấu hình đã review; Argo CD hoặc Flux với identity riêng reconcile desired state. Jenkins khi đó không cần quyền `patch` Deployment, nhưng controller GitOps và repository cấu hình trở thành một phần của boundary. Không để Jenkins direct deploy và GitOps cùng ghi một Deployment: hai reconciler sẽ tranh chấp desired state.

| Mô hình | Identity deploy | Audit chính | Khi phù hợp |
| --- | --- | --- | --- |
| Jenkins direct CD | Jenkins credential hoặc federation, namespaced | Jenkins build, Kubernetes audit, release record | Platform nhỏ, target ít và RBAC rõ. |
| GitOps | Controller GitOps trong cluster | Git commit/PR, controller reconciliation, Kubernetes audit | Desired state cần review và reconciliation liên tục. |

## Hợp đồng phát hành

### Artifact, digest và chữ ký

Một tag dễ đọc như `build-481` có thể bị thay đổi; nó không đủ để định danh byte đã chạy. CD nhận tham chiếu đầy đủ theo digest, ví dụ:

```text
registry.example.invalid/training/catalog-api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

CI lưu source revision, image tag, digest registry, SBOM, kết quả scan, policy version và chữ ký/attestation reference. CD kiểm lại cú pháp digest, xác minh chữ ký theo policy rồi chỉ deploy digest đó. Admission policy tại cluster nên độc lập kiểm registry allowlist, digest và chữ ký nếu mức rủi ro yêu cầu; kiểm tra trong Jenkins không thay cho kiểm soát lúc kubelet pull image.

Không truyền registry password, signing key, kubeconfig hoặc token qua argument của command, URL, artifact, report hay console. Dùng `withCredentials` với scope ngắn, `set +x`, stdin cho client hỗ trợ stdin và trusted agent không chạy code từ fork.

### Môi trường, namespace và cấu hình

Mỗi môi trường có namespace, deploy identity, quota, NetworkPolicy, Secret scope và telemetry riêng. Namespace giúp giới hạn object namespaced, nhưng không tự cô lập network, node, registry access hoặc quyền cloud.

| Loại dữ liệu | Nơi phù hợp | Không được làm |
| --- | --- | --- |
| Image và SBOM | Registry/artifact store với retention | Deploy tag có thể đổi hoặc build lại source lúc promote. |
| Config không nhạy cảm | `ConfigMap` hoặc repository cấu hình reviewable | Đặt endpoint bí mật hoặc credential vào ConfigMap. |
| Secret runtime | Secret manager/external secret controller hoặc Kubernetes Secret có ACL hẹp | Commit, archive, `echo`, đưa vào image layer hoặc Helm values trong Git. |
| Credential deploy | Jenkins Credentials file hoặc workload federation | Cấp một kubeconfig `cluster-admin` dùng chung mọi môi trường. |

Secret là dữ liệu runtime khác với credential của Jenkins. Pipeline không cần đọc database password để cập nhật image; runtime pod cũng không cần kubeconfig deploy. Giảm mỗi capability xuống identity và thời điểm thực sự cần nó.

### Quality gate và approval

Gate phải có owner, ngưỡng/version policy và evidence. Ví dụ trước staging: unit/integration test, manifest schema, image scan, SBOM, digest provenance và chữ ký. Ví dụ sau staging: rollout, smoke check, error rate/latency trong cửa sổ quan sát. Một `kubectl apply --dry-run=client` chỉ là gate tĩnh; nó không kiểm quota, admission, RBAC, registry pull hoặc DNS của cluster.

Production cần thêm change record và approval thủ công có timeout. Người duyệt cần biết digest, namespace logic, change ID, kết quả gate, rollback candidate và cửa sổ phát hành. Approval không thay branch protection, Jenkins authorization, Kubernetes RBAC hay separation of duties.

## Baseline Kubernetes

Platform owner bootstrap namespace, `ServiceAccount`, Role/RoleBinding, quota, policy và Secret theo quy trình riêng. Jenkins deploy example bên dưới chỉ đổi image của Deployment đã tồn tại; vì thế không cần quyền tạo namespace, tạo RoleBinding hoặc đọc Secret.

### Manifest workload

Manifest này là baseline staging. Digest là giá trị minh họa hợp lệ về hình dạng, không phải image để pull. `ConfigMap` chỉ chứa cấu hình công khai; `app-runtime` được tạo bởi cơ chế quản lý secret, không do Pipeline in hay commit giá trị bí mật.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: catalog-api-config
  namespace: catalog-staging
data:
  LOG_LEVEL: info
  PORT: "8080"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog-api
  namespace: catalog-staging
  labels:
    app.kubernetes.io/name: catalog-api
spec:
  replicas: 2
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: catalog-api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: catalog-api
    spec:
      serviceAccountName: catalog-api-runtime
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: catalog-api
          image: registry.example.invalid/training/catalog-api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 8080
          envFrom:
            - configMapRef:
                name: catalog-api-config
            - secretRef:
                name: app-runtime
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 6
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: catalog-api
  namespace: catalog-staging
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: catalog-api
  ports:
    - name: http
      port: 80
      targetPort: http
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: catalog-api
  namespace: catalog-staging
spec:
  ingressClassName: platform-ingress
  rules:
    - host: catalog.staging.example.invalid
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: catalog-api
                port:
                  name: http
```

`readinessProbe` chỉ đưa pod sẵn sàng vào traffic; nó không chứng minh database, downstream service hoặc SLO đều khỏe. `livenessProbe` chỉ nên phát hiện process kẹt mà restart có khả năng sửa. Probe sai có thể tạo restart loop, nên kiểm thử endpoint và timeout ở staging.

`maxUnavailable: 0` giảm rủi ro mất capacity khi rollout hai replica, đổi lại cần headroom cho surge. Requests/limits là số khởi đầu cần đo với tải thật; CPU limit có thể throttle và memory vượt limit thường dẫn đến `OOMKilled`.

### ServiceAccount và RBAC tối thiểu

Runtime application không gọi Kubernetes API nên tắt token automount. Identity deploy là một `ServiceAccount` khác; kubeconfig Jenkins đại diện identity này hoặc workload federation được map tương đương.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: catalog-api-runtime
  namespace: catalog-staging
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: jenkins-catalog-deployer
  namespace: catalog-staging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: jenkins-catalog-deployer
  namespace: catalog-staging
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    resourceNames: ["catalog-api"]
    verbs: ["get", "patch", "watch"]
  - apiGroups: ["apps"]
    resources: ["replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: jenkins-catalog-deployer
  namespace: catalog-staging
subjects:
  - kind: ServiceAccount
    name: jenkins-catalog-deployer
    namespace: catalog-staging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: jenkins-catalog-deployer
```

`patch` đủ cho `kubectl set image` và `kubectl rollout undo` với Deployment này. `watch`/`get` cho phép đọc rollout; `pods/log` chỉ cần khi Pipeline thực sự thu log. Xác minh bằng `kubectl auth can-i` với identity thật trong sandbox. Không thêm wildcard, `create`, `delete` hay `cluster-admin` để vượt một lỗi `Forbidden`: xác định verb, resource, subresource và namespace thật sự bị từ chối trước.

### Network, capacity và quan sát

PDB và HPA phù hợp khi service có nhiều replica và platform có metrics pipeline. PDB không thay strategy rollout; HPA không thay resource requests đã đo.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: catalog-api
  namespace: catalog-staging
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: catalog-api
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: catalog-api
  namespace: catalog-staging
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: catalog-api
  minReplicas: 2
  maxReplicas: 6
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: catalog-api
  namespace: catalog-staging
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: catalog-api
  policyTypes: ["Ingress", "Egress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              platform.example.com/role: ingress
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

NetworkPolicy chỉ có hiệu lực khi CNI enforce nó. Egress mẫu chỉ minh họa DNS; phải thêm allowlist cho dependency thật, registry nếu pod cần pull qua path bị policy chặn, và observability collector theo topology. Không mở toàn bộ egress để chữa lỗi DNS hay telemetry.

Tối thiểu quan sát các chỉ số: available replicas, readiness, restart count, image pull error, CPU/memory throttling, request error rate, latency và saturation dependency. Đặt label application nhất quán để dashboard, alert và log correlation tìm đúng revision/digest.

## Pipeline Jenkins tham chiếu

### Giả định plugin và agent

Mẫu dùng Jenkins LTS với **Pipeline: Declarative**, **Git**, **Credentials Binding** và agent Linux. `timestamps()` cần Timestamper plugin nếu được bật. Agent `release-linux` có `kubectl` phiên bản tương thích version skew policy của API server, `cosign` nếu policy yêu cầu verify và không nhận build fork. Agent CI có tool build/scan riêng, không có kubeconfig deploy.

Pin image agent/tool trong catalog platform và review release của Jenkins/plugin/CLI trước khi nâng. `kubectl`, Credentials Binding và stage DSL có semantics theo runtime; một Jenkinsfile parse được không chứng minh label, credential ID, RBAC, TLS, CNI hay admission hoạt động.

Kubeconfig được lưu kiểu **secret file** với ID `kubeconfig-catalog-staging-deployer`, scope folder/job release. Nó chỉ có context staging và identity namespaced. Không bind credential này ở top-level `environment`, không archive workspace khi closure còn mở và không dùng account `cluster-admin` vì Pipeline không provision cluster.

### Jenkinsfile deploy theo digest

Pipeline dưới giả định CI đã publish `release/image-ref.txt`, trong đó chỉ có full reference theo digest. Stage CI tạo/stash file này sau test, scan và ký. Vì pipeline-level dùng `agent none`, workspace của mỗi stage có agent có thể khác nhau. Stage verify checkout lại `scm` ở revision Jenkins đã chọn cho chính run, rồi mới gọi script `./ci/verify-image-signature`; file digest vẫn đi qua stash của cùng run. Mọi release stage bị skip trước khi cấp agent/credential nếu không phải `main` hoặc là change request; branch protection SCM vẫn là điều kiện độc lập.

```groovy
pipeline {
  agent none

  options {
    skipDefaultCheckout(true)
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 35, unit: 'MINUTES')
  }

  environment {
    KUBE_NAMESPACE = 'catalog-staging'
    KUBE_DEPLOYMENT = 'catalog-api'
    EXPECTED_CONTEXT = 'staging-sandbox'
  }

  stages {
    stage('CI gates') {
      agent { label 'linux && ci' }
      steps {
        checkout scm
        sh '''#!/bin/sh
          set -eu
          ./ci/test-required
          ./ci/scan-image-and-manifest
          test -s release/image-ref.txt
          grep -Eq '^registry\.example\.invalid/training/catalog-api@sha256:[0-9a-f]{64}$' release/image-ref.txt
        '''
        stash name: 'release-input', includes: 'release/image-ref.txt'
      }
      post {
        always {
          archiveArtifacts artifacts: 'release/image-ref.txt', allowEmptyArchive: true, fingerprint: true
        }
        cleanup {
          deleteDir()
        }
      }
    }

    stage('Verify signed release input') {
      when {
        beforeAgent true
        allOf {
          branch 'main'
          not { changeRequest() }
        }
      }
      agent { label 'linux && trusted-release' }
      steps {
        // Lấy script từ revision SCM của chính Pipeline run trên trusted agent.
        checkout scm
        unstash 'release-input'
        sh '''#!/bin/sh
          set -eu
          IMAGE_REF="$(cat release/image-ref.txt)"
          case "$IMAGE_REF" in
            registry.example.invalid/training/catalog-api@sha256:????????????????????????????????????????????????????????????????) ;;
            *) printf '%s\n' 'Refuse non-digest image reference.' >&2; exit 1 ;;
          esac
          ./ci/verify-image-signature "$IMAGE_REF"
          printf '%s\n' "$IMAGE_REF" > verified-image-ref.txt
        '''
        stash name: 'verified-release', includes: 'verified-image-ref.txt'
      }
      post {
        cleanup {
          deleteDir()
        }
      }
    }

    stage('Deploy staging') {
      when {
        beforeAgent true
        allOf {
          branch 'main'
          not { changeRequest() }
        }
      }
      agent { label 'linux && kubectl && trusted-release' }
      steps {
        unstash 'verified-release'
        withCredentials([
          file(credentialsId: 'kubeconfig-catalog-staging-deployer', variable: 'KUBECONFIG_FILE')
        ]) {
          sh '''#!/bin/sh
            set -eu
            set +x
            IMAGE_REF="$(cat verified-image-ref.txt)"
            test "$(kubectl --kubeconfig "$KUBECONFIG_FILE" config current-context)" = "$EXPECTED_CONTEXT"
            test "$(kubectl --kubeconfig "$KUBECONFIG_FILE" -n "$KUBE_NAMESPACE" \
              auth can-i patch deployments/"$KUBE_DEPLOYMENT")" = 'yes'
            kubectl --kubeconfig "$KUBECONFIG_FILE" -n "$KUBE_NAMESPACE" \
              set image deployment/"$KUBE_DEPLOYMENT" catalog-api="$IMAGE_REF"
            kubectl --kubeconfig "$KUBECONFIG_FILE" -n "$KUBE_NAMESPACE" \
              annotate deployment/"$KUBE_DEPLOYMENT" \
              release.example.com/image-digest="${IMAGE_REF##*@}" --overwrite
          '''
        }
      }
      post {
        cleanup {
          deleteDir()
        }
      }
    }

    stage('Verify staging rollout') {
      when {
        beforeAgent true
        allOf {
          branch 'main'
          not { changeRequest() }
        }
      }
      agent { label 'linux && kubectl && trusted-release' }
      steps {
        withCredentials([
          file(credentialsId: 'kubeconfig-catalog-staging-deployer', variable: 'KUBECONFIG_FILE')
        ]) {
          sh '''#!/bin/sh
            set -eu
            set +x
            kubectl --kubeconfig "$KUBECONFIG_FILE" -n "$KUBE_NAMESPACE" \
              rollout status deployment/"$KUBE_DEPLOYMENT" --timeout=180s
            kubectl --kubeconfig "$KUBECONFIG_FILE" -n "$KUBE_NAMESPACE" \
              get deployment/"$KUBE_DEPLOYMENT" -o json > rollout-deployment.json
            kubectl --kubeconfig "$KUBECONFIG_FILE" -n "$KUBE_NAMESPACE" \
              get pods -l app.kubernetes.io/name=catalog-api -o wide > rollout-pods.txt
          '''
        }
        archiveArtifacts artifacts: 'rollout-deployment.json,rollout-pods.txt', fingerprint: true
      }
      post {
        cleanup {
          deleteDir()
        }
      }
    }

    stage('Approve production') {
      when {
        beforeInput true
        branch 'main'
      }
      options { timeout(time: 20, unit: 'MINUTES') }
      input {
        message 'Approve the recorded digest, staging evidence, change record, and rollback candidate.'
        ok 'Approve production'
        submitter 'release-managers'
        submitterParameter 'PRODUCTION_APPROVER'
      }
      agent none
      steps {
        echo 'Approval recorded; production must use a separate namespace credential and release policy.'
      }
    }
  }
}
```

`kubectl auth can-i` trả `yes`/`no`; phép so sánh trong script làm stage dừng nếu output không phải `yes`. Lệnh context guard tránh dùng nhầm kubeconfig có context khác, nhưng context name không thay authorization; kubeconfig và RBAC mới là enforcement. Annotation cần `patch` cùng resource Deployment và lưu metadata không nhạy cảm. Nếu policy không cho Jenkins sửa annotation, bỏ annotation hoặc ghi release record ngoài cluster thay vì nới Role mù quáng.

Pipeline không tự retry `set image`, migration hoặc rollout timeout. Một request có thể đã tới API server khi agent mất kết nối; trước retry phải query trạng thái đích bằng identity read-only, xác nhận digest/revision hiện tại và quyết định theo owner.

### Helm và GitOps là lựa chọn khác

Helm phù hợp khi chart là contract đã review. `helm upgrade --install` thường cần quyền đọc/ghi release storage (Secret hoặc ConfigMap tùy driver) ngoài quyền Deployment; vì thế không tái sử dụng Role `set image` ở trên rồi mở quyền đến khi chạy được. Tạo identity/namespace Helm riêng, allowlist chart/repository và review values trước.

```bash
# Chỉ trên trusted agent, kubeconfig sandbox và chart đã review.
helm upgrade --install catalog-api ./deploy/chart \
  --namespace catalog-staging \
  --set-string image.repository=registry.example.invalid/training/catalog-api \
  --set-string image.digest=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  --atomic --timeout 3m
```

`--atomic` có thể quay Helm release về revision trước khi một wait fail, nhưng không thay phân tích database/config compatibility hay evidence sau rollback. Không dùng `--set` để truyền secret; dùng external secret reference hoặc mechanism platform phê duyệt. Với GitOps, thay lệnh này bằng thay đổi reviewable pin `image.digest` trong repository manifest rồi đợi controller reconcile; chỉ một hệ thống được sở hữu desired state.

## Thực hiện rollout và xác minh

### Ý nghĩa rollout status

`kubectl rollout status deployment/catalog-api --timeout=180s` chờ Deployment hoàn thành hoặc timeout theo điều kiện Kubernetes. Nó không xác nhận ingress public, request nghiệp vụ, metric SLO hay database migration thành công. Timeout cũng không có nghĩa Deployment chưa thay đổi: đọc trạng thái thật trước bất kỳ retry hoặc undo nào.

| Mức kiểm tra | Có thể kết luận | Không thể kết luận |
| --- | --- | --- |
| YAML/lint tĩnh | File có cấu trúc và policy cơ bản đúng | API server, RBAC, quota, CNI, image pull. |
| `kubectl --dry-run=client` | Client parse manifest | Admission, namespace, CRD hay runtime workload. |
| Server dry-run sandbox | API admission phản hồi cho object sandbox | Object được persist hoặc application hoạt động. |
| `rollout status` | Deployment đạt điều kiện rollout trong deadline | Traffic ngoài cluster, SLO, dependency business. |
| Smoke/metrics window | Tín hiệu ứng dụng theo check đã định nghĩa | Mọi failure mode hoặc khả năng rollback schema. |

### Evidence sau phát hành

Thu các dữ liệu không nhạy cảm dưới đây, rồi liên kết chúng với Jenkins build, source revision, digest và change record:

```bash
# Chỉ chạy sau khi xác nhận context và namespace được owner cho phép.
kubectl -n catalog-staging rollout status deployment/catalog-api --timeout=180s
kubectl -n catalog-staging get deployment/catalog-api -o wide
kubectl -n catalog-staging get deployment/catalog-api \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
kubectl -n catalog-staging get pods -l app.kubernetes.io/name=catalog-api -o wide
kubectl -n catalog-staging get events --sort-by=.lastTimestamp
kubectl -n catalog-staging logs deployment/catalog-api --all-containers --tail=100
```

Kết quả tốt phải cho thấy image pod khớp digest release, replicas `Available`, readiness pass và smoke check theo user path đã định nghĩa. Alert/dashboard cần cho biết error rate, latency, restart, CPU/memory và dependency saturation trong một cửa sổ quan sát phù hợp. Log có thể chứa dữ liệu nhạy cảm; archive chọn lọc, redact và phân quyền đọc evidence.

### Timeout, readiness failure và approval

Nếu rollout timeout hoặc pod chưa ready:

1. Dừng pipeline release; không tăng timeout vô hạn hoặc chạy lại deploy mù quáng.
2. Xem condition Deployment, ReplicaSet, Pod events, `ImagePullBackOff`, crash, probe, selector/EndpointSlice, NetworkPolicy và quota.
3. Xác nhận current digest, previous known-good digest, rollout revision và blast radius.
4. Owner quyết định forward-fix, giữ trạng thái, feature flag hoặc rollback. Production cần approval/on-call theo change policy.
5. Sau quyết định, thu evidence sau action và cập nhật incident/change record.

Jenkins `post { failure }` chỉ nên lưu evidence và báo owner. Không tự gọi `rollout undo` vì failure có thể xảy ra trước, trong hoặc sau thay đổi và rollback có thể không tương thích config/database.

## Migration và rollback

### Quay lui Deployment hoặc manifest

Khi previous revision đã được kiểm tương thích, ghi lại revision/digest hiện tại rồi undo:

```bash
# Chỉ sau context, namespace, owner và rollback candidate đã được xác nhận.
kubectl -n catalog-staging rollout history deployment/catalog-api
kubectl -n catalog-staging rollout undo deployment/catalog-api
kubectl -n catalog-staging rollout status deployment/catalog-api --timeout=180s
kubectl -n catalog-staging get deployment/catalog-api \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

`rollout undo` quay `PodTemplate` Deployment về revision trước còn trong `revisionHistoryLimit`; nó không nhất thiết hoàn nguyên ConfigMap, Secret reference, Ingress, HPA, NetworkPolicy hoặc object ngoài Deployment. Với manifest/Kustomize/Helm/GitOps, rollback là một thay đổi desired state rõ ràng về digest/chart revision known-good, có review và xác minh sau reconcile.

### Cảnh báo database

Không coi rollback binary là rollback database. Migration xóa cột, đổi kiểu dữ liệu hoặc ghi dữ liệu không tương thích có thể làm image cũ lỗi nặng hơn. Thiết kế **expand/contract**: thêm schema tương thích ngược, triển khai code đọc cả hai dạng, backfill có kiểm soát, chuyển traffic, rồi chỉ xóa schema cũ ở release sau.

Trước rollout có migration, release record cần migration version, backup/restore evidence theo policy, owner database, chiến lược forward-fix hoặc restore, feature flag và rollback decision. Không tự chạy migration trong retry block hay để Jenkins rollback schema khi readiness fail.

## Lab local tái lập

Lab không deploy, không tạo cluster, không gọi registry và không dùng credential. Nó tạo manifest giả dưới `$TMPDIR`, kiểm tĩnh bằng Python 3 và tùy chọn parse client-side bằng `kubectl` nếu CLI đã có. Không dùng `sudo`.

### Tạo fixture có guard

Chạy toàn bộ khối trong **cùng một shell** để giữ `LAB_ROOT` cho cleanup.

```bash
set -eu
LAB_PARENT="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
LAB_ROOT="$(mktemp -d "$LAB_PARENT/jenkins-kubernetes-deploy-lab.XXXXXXXX")"
MARKER="$LAB_ROOT/.jenkins-kubernetes-deploy-lab"
printf '%s\n' 'owned-by-kubernetes-deployment-runbook' > "$MARKER"

case "$LAB_ROOT" in
  "$LAB_PARENT"/jenkins-kubernetes-deploy-lab.*) ;;
  *) printf '%s\n' 'Refuse: path is outside expected prefix.' >&2; exit 1 ;;
esac
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
test "$(cat "$MARKER")" = 'owned-by-kubernetes-deployment-runbook'
mkdir -p "$LAB_ROOT/manifests"

cat > "$LAB_ROOT/manifests/deployment.yaml" <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog-api
  namespace: catalog-lab
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: catalog-api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: catalog-api
    spec:
      automountServiceAccountToken: false
      containers:
        - name: catalog-api
          image: registry.example.invalid/training/catalog-api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
EOF
printf 'LAB_ROOT=%s\n' "$LAB_ROOT"
```

### Kiểm tra tĩnh và runtime tùy chọn

```bash
set -eu
: "${LAB_ROOT:?Run the fixture block in this shell first}"
test -f "$LAB_ROOT/.jenkins-kubernetes-deploy-lab"
test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
grep -q '^  namespace: catalog-lab$' "$LAB_ROOT/manifests/deployment.yaml"
grep -q '@sha256:' "$LAB_ROOT/manifests/deployment.yaml"
grep -q 'automountServiceAccountToken: false' "$LAB_ROOT/manifests/deployment.yaml"
python3 - <<'PY' "$LAB_ROOT/manifests/deployment.yaml"
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text(encoding="utf-8")
assert "kind: Deployment" in text
assert "name: catalog-api" in text
assert "resources:" in text
assert "@sha256:" in text
print("static manifest validation: PASS")
PY

if command -v kubectl >/dev/null 2>&1; then
  kubectl apply --dry-run=client -f "$LAB_ROOT/manifests/deployment.yaml"
else
  printf '%s\n' 'kubectl absent; static validation is the completed lab level.'
fi
```

Kết quả mong đợi là `static manifest validation: PASS`; nếu có `kubectl`, client sẽ báo object dry-run. Để có kiểm chứng server-side, dùng kind hoặc minikube **chỉ khi** owner cho phép một cluster local; xác nhận context có prefix lab và namespace `catalog-lab` tồn tại trước `--dry-run=server`. Không biến lab thành deployment production, không apply Secret thật và không dùng default namespace.

### Cleanup có guard

Chỉ dọn sau khi đã lưu output cần học. Hàm không có wildcard path hoặc thao tác cleanup cluster.

```bash
cleanup_lab() {
  test -n "${LAB_ROOT:-}"
  test -n "${LAB_PARENT:-}"
  case "$LAB_ROOT" in
    "$LAB_PARENT"/jenkins-kubernetes-deploy-lab.*) ;;
    *) printf '%s\n' 'Refuse unexpected cleanup path.' >&2; return 1 ;;
  esac
  test "$(dirname "$LAB_ROOT")" = "$LAB_PARENT"
  test -f "$LAB_ROOT/.jenkins-kubernetes-deploy-lab"
  test "$(cat "$LAB_ROOT/.jenkins-kubernetes-deploy-lab")" = 'owned-by-kubernetes-deployment-runbook'
  find "$LAB_ROOT" -depth -delete
}
cleanup_lab
test ! -e "$LAB_ROOT"
printf '%s\n' 'guarded local cleanup: PASS'
```

Nếu guard fail, dừng và xem path. Không sửa prefix/marker để ép dọn, không dùng cleanup lab cho namespace, Docker host, registry hoặc cluster.

## Troubleshooting

| Triệu chứng | Kiểm tra có evidence | Hướng xử lý an toàn |
| --- | --- | --- |
| Release stage bị skip | Branch, `changeRequest`, multibranch discovery và SCM protection | Sửa policy/source trust; không bỏ `when` hay bind kubeconfig cho PR. |
| `Forbidden` từ Kubernetes | Context, identity, `kubectl auth can-i`, resource/verb/subresource/namespace | Thêm đúng quyền namespaced sau review; không dùng `cluster-admin`. |
| `ImagePullBackOff` | Digest, registry/DNS/TLS, pull credential, NetworkPolicy và pod event | Sửa registry allowlist/access hoặc digest; không deploy tag có thể đổi. |
| Rollout timeout | Deployment condition, ReplicaSet, pod events, image, probe, quota | Query trạng thái rồi forward-fix hoặc rollback có owner; không retry mù quáng. |
| Pod `Running` nhưng không nhận traffic | Readiness, Service selector, EndpointSlice, Ingress, NetworkPolicy | Sửa labels/probe/policy đã kiểm; không mở mọi ingress/egress. |
| `OOMKilled` hoặc throttling | Container status, request/limit, peak metric, HPA behavior | Tối ưu hoặc resize sau đo; không giảm request giả tạo. |
| Helm thiếu quyền | Release storage driver, ServiceAccount, namespace và chart action | Thiết kế Role Helm riêng; không mở Role direct deploy bằng wildcard. |
| Undo không khôi phục | Revision/digest, config/schema compatibility, metrics sau action | Dừng, đánh giá feature flag/database và owner; không lặp undo. |
| Evidence thiếu hoặc lộ dữ liệu | Archive pattern, Jenkins retention, logs/report, ACL | Archive file allowlist đã redact; rotate secret nếu nghi ngờ lộ. |

## Checklist phát hành

- [ ] CI test, scan, SBOM, provenance/chữ ký và policy gate đã pass; exception có owner và expiry.
- [ ] Artifact deploy là full reference theo digest; tag chỉ dùng tra cứu.
- [ ] `main` được bảo vệ; PR/fork không nhận registry write, kubeconfig hay agent release.
- [ ] Jenkins controller không chạy workload; agent build, agent release và pool untrusted tách theo trust boundary.
- [ ] Jenkins LTS, plugin, `kubectl`/Helm/cosign, labels và credential binding đã được kiểm trên sandbox.
- [ ] Namespace, ServiceAccount runtime, deploy identity, Role/RoleBinding và kubeconfig tách riêng từng môi trường.
- [ ] Không có `cluster-admin`, wildcard quyền không cần thiết, secret trong source/log/argv hoặc token automount không cần thiết.
- [ ] Deployment có digest, request/limit, security context, readiness/liveness, strategy và `revisionHistoryLimit` phù hợp.
- [ ] Service/Ingress selector, ConfigMap/Secret boundary, CNI enforcement của NetworkPolicy, PDB/HPA khi phù hợp đã được test staging.
- [ ] Rollout status, current/previous digest, pods/events, smoke check và telemetry window được lưu làm evidence đã redact.
- [ ] Approval production có change record, approver được phép, timeout, rollback candidate và owner database khi có migration.
- [ ] Lab chỉ dùng fixture giả, parent/prefix/marker guard; static pass không bị diễn giải thành proof runtime.

## Trade-offs

- **Direct `kubectl`** ít thành phần và dễ thấy API call, nhưng Jenkins giữ deploy capability. **GitOps** giảm capability của Jenkins và tăng desired-state audit, nhưng cần controller/repository policy riêng.
- **Digest pinning** làm rollback/truy vết chính xác, đổi lại cần hệ thống lưu digest và garbage collection registry không xóa artifact còn được dùng.
- **RBAC theo `resourceNames`** giảm blast radius, đổi lại mỗi workload cần Role rõ ràng. Đây là chi phí chủ đích, không phải lý do gom quyền toàn namespace.
- **PDB/HPA/NetworkPolicy** tăng resilience và boundary khi platform hỗ trợ, nhưng cần capacity, metric pipeline và CNI validation. Object tồn tại không tự chứng minh control được enforce.
- **Automatic Helm rollback** giúp release chart nhỏ nhanh hơn, nhưng có thể che trạng thái một migration/config phức tạp. Với rủi ro dữ liệu, chọn decision có người chịu trách nhiệm.

## Nguồn chính thức và đọc tiếp

- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes PodDisruptionBudget](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- [Kubernetes Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Jenkins: Using credentials](https://www.jenkins.io/doc/book/using/using-credentials/)
- [Credentials Binding plugin](https://plugins.jenkins.io/credentials-binding/)
- [Helm upgrade](https://helm.sh/docs/helm/helm_upgrade/)
- [Sigstore Cosign](https://docs.sigstore.dev/cosign/)

<Cards>
  <Card title="Jenkinsfile" href="/docs/pipelines/jenkinsfile" description="Đặt release policy và Pipeline as Code dưới review." />
  <Card title="Credentials trong Pipeline" href="/docs/pipelines/credentials" description="Thu hẹp scope credential và bảo vệ secret trên agent." />
  <Card title="Kubernetes Ephemeral Agents" href="/docs/agents/kubernetes-agents" description="Tách agent pod, RBAC, workspace và network boundary." />
  <Card title="Xử lý lỗi và Retry" href="/docs/pipelines/error-handling" description="Giữ timeout, interruption và failure propagation trung thực." />
  <Card title="Authorization & RBAC" href="/docs/security/authorization" description="Áp dụng least privilege và separation of duties trong Jenkins." />
  <Card title="Audit & Compliance" href="/docs/security/audit-compliance" description="Giữ evidence release đã redact và có ownership." />
  <Card title="Case study Docker đến Kubernetes" href="/docs/case-studies/docker-kubernetes" description="Xem luồng build, scan, registry và rollout đầy đủ hơn." />
</Cards>
