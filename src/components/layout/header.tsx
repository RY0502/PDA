'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function Header() {
  const pathname = usePathname();
  const [stocksHref, setStocksHref] = useState('/stocks/PVRINOX');

  useEffect(() => {
    const lastStockCode = localStorage.getItem('lastStockCode');
    if (pathname.startsWith('/stocks/')) {
      setStocksHref(pathname);
      // Also update localStorage in case the user landed here directly
      const currentCode = pathname.split('/').pop();
      if (currentCode) {
        localStorage.setItem('lastStockCode', currentCode);
      }
    } else if (lastStockCode) {
      setStocksHref(`/stocks/${lastStockCode}`);
    } else {
      setStocksHref('/stocks/PVRINOX');
    }
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/football', label: 'Football' },
    { href: stocksHref, label: 'Stocks' },
    { href: '/trends', label: 'Trends' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center">
          <Link href="/" className="mr-10 flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">
              YourDailyBrief
            </span>
          </Link>
          <nav className="flex items-center space-x-8 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  pathname.startsWith('/stocks') && link.label === 'Stocks'
                    ? 'font-bold text-foreground'
                    : pathname === link.href
                    ? 'font-bold text-foreground'
                    : 'font-medium text-foreground/60'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
