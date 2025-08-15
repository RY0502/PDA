'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const pathname = usePathname();
  const [stocksHref, setStocksHref] = useState('/stocks/PVRINOX');
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  // Load Supabase user session
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUserName(data.user?.user_metadata?.name ?? null);
      setUserEmail(data.user?.email ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUserName(session?.user?.user_metadata?.name ?? null);
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isSupabaseReferrer = () => {
    if (typeof document === 'undefined') return false;
    const ref = document.referrer || '';
    return /supabase\.(co|com)/i.test(ref);
  };

  const handleNavClick = async (e: React.MouseEvent, targetHref: string) => {
    // Skip checks for Supabase referrer (e.g., right after OAuth redirect)
    if (isSupabaseReferrer()) return;
    // If not logged in, initiate Google OAuth and redirect back to desired page
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      e.preventDefault();
      const redirectTo = `${window.location.origin}${targetHref}`;
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
    }
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/football', label: 'Football' },
    { href: stocksHref, label: 'Stocks' },
    { href: '/trends', label: 'Trends' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center w-full">
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
                onClick={(e) => handleNavClick(e, link.href)}
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
          <div className="ml-auto flex items-center">
            {userName || userEmail ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="User menu"
                    className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 select-none"
                  >
                    <span className="text-xs sm:text-sm font-semibold">
                      {(userName ?? userEmail ?? 'U')
                        .split(' ')
                        .slice(0, 2)
                        .map((s) => s[0]?.toUpperCase())
                        .join('')}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                    {userName ?? userEmail}
                  </div>
                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.auth.signOut();
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
