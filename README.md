# Jenkins Learn

Tài liệu học Jenkins bằng tiếng Việt, được xây dựng bằng **Next.js 16**, **React 19**, **Fumadocs 16** và xuất static để deploy lên **Cloudflare Pages**.

## Mục lục

- [Phạm vi nội dung](#phạm-vi-nội-dung)
- [Yêu cầu](#yêu-cầu)
- [Chạy local](#chạy-local)
- [Kiểm tra project](#kiểm-tra-project)
- [Deploy Cloudflare Pages](#deploy-cloudflare-pages)
  - [Deploy thủ công](#deploy-thủ-công)
  - [Deploy qua Cloudflare Dashboard](#deploy-qua-cloudflare-dashboard)
- [Thêm hoặc cập nhật tài liệu](#thêm-hoặc-cập-nhật-tài-liệu)
- [Sơ đồ và component docs-kit](#sơ-đồ-và-component-docs-kit)

## Phạm vi nội dung

Project hiện có **89 trang placeholder** thuộc 11 nhóm:

1. Nền tảng
2. Cài đặt & nâng cấp
3. Jobs & cấu hình build
4. Jenkins Pipeline
5. Agents & Distributed Builds
6. Tích hợp công cụ
7. Bảo mật Jenkins
8. Quản trị & vận hành
9. CI/CD thực chiến
10. Chủ đề nâng cao
11. Case Studies

Mỗi trang đã có frontmatter, mục lục, outline nội dung, phần thực hành, checklist và tài liệu tham khảo để tiếp tục hoàn thiện.

## Yêu cầu

- Node.js 22 trở lên (docs-kit render lúc build)
- npm 10+

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Kiểm tra project

```bash
npm run lint
npm run types:check
npm run build
```

Hoặc chạy toàn bộ:

```bash
npm run check
```

Static output được tạo tại thư mục `out/`.

## Deploy Cloudflare Pages

### Deploy thủ công

```bash
npx wrangler login
npm run deploy
```

### Deploy qua Cloudflare Dashboard

- Build command: `npm run build`
- Build output directory: `out`
- Node.js version: `22`
- Environment variable: `NEXT_PUBLIC_SITE_URL=https://<domain-cua-ban>`

Sao chép `.env.example` thành `.env.local` khi cần kiểm tra metadata bằng domain tùy chỉnh.

## Thêm hoặc cập nhật tài liệu

1. Tạo file `.md` hoặc `.mdx` trong `content/docs/{category}/`.
2. Thêm `title` và `description` trong frontmatter.
3. Đăng ký slug vào `pages` của `content/docs/{category}/meta.json`.
4. Nếu tạo category mới, đăng ký category trong `content/docs/meta.json`.
5. Chạy `npm run check` trước khi commit.

> Nếu không thêm page vào `meta.json`, trang sẽ không xuất hiện đúng thứ tự trên sidebar.


## Sơ đồ và component docs-kit

Project dùng `@vanhiep99w/docs-kit@0.12.0`. Plugin build-time nằm ở `source.config.ts`, MDX components ở `src/components/mdx.tsx`, CSS ở `src/app/global.css`. Compiler D2/WASM và highlighter không chạy trong browser; static export vẫn đọc được sơ đồ khi tắt JavaScript.

Dùng fence `d2` thay ASCII flow/architecture hoặc Mermaid. Giữ cây thư mục, log, payload, output terminal ở dạng text khi đó là cách đọc chính xác hơn. Với sơ đồ lớn, thêm `interactive` để người đọc chủ động mở viewer zoom/pan, xem source và tải SVG; viewer chỉ được tải khi bấm **Explore**.

````mdx
```d2 interactive title="Luồng CI"
direction: right
scm: Git {icon: ../../assets/d2/git.svg}
controller: Jenkins controller
agent: Agent
artifact: Artifact đã kiểm tra
scm -> controller: Webhook
controller -> agent: Cấp executor
agent -> artifact: Build + test
```
````

Ví dụ đường dẫn icon trên dành cho file trong `content/docs/<category>/`. Icon từ [D2 Icons](https://icons.d2lang.com/) được lưu tại `content/assets/d2/`, có nguồn trong README của thư mục và được nhúng vào SVG lúc build; không phụ thuộc host icon khi đọc offline. Chỉ thêm icon giúp nhận diện công nghệ, không gắn logo tùy tiện cho mọi node. Đặt `title` ngắn, không dùng dấu backtick trong metadata fence. Nhãn node nhiều dòng dùng `\n`; tránh ID trùng keyword D2 như `steps`, `layers`, `scenarios`.

| Fence | Khi nên dùng | Ví dụ thực tế |
| --- | --- | --- |
| `d2` | Kiến trúc, luồng, sequence, state transition | `content/docs/getting-started/architecture.mdx` |
| `code-walkthrough` | Đọc từng khối code với highlight theo bước | `content/docs/pipelines/jenkinsfile.mdx` |
| `terminal-session` | Chuỗi command, context và kết quả kỳ vọng | `content/docs/installation/docker.mdx` |
| `code-diff` | So sánh code/config trước và sau thay đổi | `content/docs/pipelines/environment-parameters.mdx` |
| `protocol-exchange` | Request/response HTTP tĩnh, các tình huống status | `content/docs/administration/cli-rest-api.mdx` |
| `span-waterfall` | Timeline latency với cùng mốc thời gian | `content/docs/advanced/pipeline-performance.mdx` |

Các fence ngoài D2 chứa YAML descriptor theo [API docs-kit](https://github.com/vanhiep99w/docs-kit#readme). Không thực thi shell/request; ghi rõ dữ liệu minh họa, không đưa credential hay URL nội bộ vào descriptor. Chỉ compile MDX/D2 từ tác giả tin cậy: SVG build được nhúng trực tiếp, không phải sanitizer cho input công khai. Source Explorer chưa được bật vì site chưa có manifest/snapshot source project; không đăng ký provider rỗng.

Cache D2 nằm ở `.next/cache/docs-kit/d2`, cùng đường dẫn build cache của Next.js trên Cloudflare Pages. Bật Build cache trong dashboard; cache không nằm trong output deploy. Sau khi sửa tài liệu, chạy `npm run check` để kiểm tra cả MDX và static export.
