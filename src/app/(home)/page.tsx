import { ArrowRight, BookOpen, Boxes, GitBranch, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const sections = [
  {
    title: 'Bắt đầu với Jenkins',
    description: 'Nắm kiến trúc, thuật ngữ và tạo job đầu tiên.',
    href: '/docs/getting-started/overview/',
    icon: BookOpen,
  },
  {
    title: 'Jenkins Pipeline',
    description: 'Xây dựng Jenkinsfile từ cơ bản đến Shared Library.',
    href: '/docs/pipelines/overview/',
    icon: GitBranch,
  },
  {
    title: 'Agents & hạ tầng',
    description: 'Tổ chức agent tĩnh, Docker và Kubernetes.',
    href: '/docs/agents/overview/',
    icon: Boxes,
  },
  {
    title: 'Bảo mật & vận hành',
    description: 'Hardening, giám sát, backup và xử lý sự cố.',
    href: '/docs/security/security-model/',
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-16 md:py-24">
      <section className="mx-auto max-w-3xl text-center">
        <div className="mb-5 inline-flex rounded-full border bg-fd-card px-3 py-1 text-sm text-fd-muted-foreground">
          Lộ trình Jenkins bằng tiếng Việt
        </div>
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
          Học Jenkins từ nền tảng đến vận hành production
        </h1>
        <p className="mt-6 text-pretty text-lg text-fd-muted-foreground">
          Bộ khung tài liệu có hệ thống về Jenkins, Pipeline, tích hợp CI/CD, bảo mật và quản trị.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/docs/"
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-5 py-3 font-medium text-fd-primary-foreground"
          >
            Bắt đầu học <ArrowRight className="size-4" />
          </Link>
          <Link
            href="https://github.com/vanhiep99w/jenkins-learn"
            className="rounded-lg border bg-fd-card px-5 py-3 font-medium"
          >
            Xem trên GitHub
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-2">
        {sections.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border bg-fd-card p-6 transition-colors hover:bg-fd-accent"
          >
            <Icon className="mb-4 size-7 text-fd-primary" />
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-fd-muted-foreground">{description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
              Mở tài liệu <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
