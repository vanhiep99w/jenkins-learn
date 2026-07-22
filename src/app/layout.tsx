import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import type { Metadata } from 'next';
import { Provider } from '@/components/provider';
import './global.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jenkins-learn.pages.dev'),
  title: {
    default: 'Jenkins Learn',
    template: '%s | Jenkins Learn',
  },
  description: 'Tài liệu học Jenkins bằng tiếng Việt từ nền tảng đến vận hành production.',
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
