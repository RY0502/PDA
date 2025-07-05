import type { Metadata } from 'next';
import './globals.css';
import '@fontsource/inter';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Sidebar } from '@/components/layout/sidebar';
import '@/lib/scheduler'; // Initialize schedulers

export const metadata: Metadata = {
  title: 'YourDailyBrief',
  description: 'Your daily digest of news and trends.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn('min-h-screen bg-background font-body antialiased')}>
        <Sidebar />
        <main className="transition-all duration-300 ml-16 md:ml-60">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
