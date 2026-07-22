# Jenkins Learn

Tài liệu học Jenkins bằng tiếng Việt, được xây dựng bằng **Next.js 16**, **React 19**, **Fumadocs 16** và xuất static để deploy lên **Cloudflare Pages**.

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

- Node.js 22 LTS (tối thiểu `20.9.0`)
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
