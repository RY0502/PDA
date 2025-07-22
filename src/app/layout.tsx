import type { Metadata } from 'next';
import './globals.css';
import '@fontsource/inter';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/header';

export const metadata: Metadata = {
  title: 'PersonalDigitalAssistant',
  description: 'Your personal digital assistant.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn('min-h-screen bg-background font-body antialiased')}>
        <Header />
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
