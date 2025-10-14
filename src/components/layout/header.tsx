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
  // const [userName, setUserName] = useState<string | null>(null);
  // const [userEmail, setUserEmail] = useState<string | null>(null);

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

  // // Load Supabase user session
  // useEffect(() => {
  //   let isMounted = true;
  //   (async () => {
  //     const { data } = await supabase.auth.getUser();
  //     if (!isMounted) return;
  //     setUserName(data.user?.user_metadata?.name ?? null);
  //     setUserEmail(data.user?.email ?? null);
  //   })();
  //   const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
  //     setUserName(session?.user?.user_metadata?.name ?? null);
  //     setUserEmail(session?.user?.email ?? null);
  //   });
  //   return () => {
  //     isMounted = false;
  //     sub.subscription.unsubscribe();
  //   };
  // }, []);

  const isSupabaseReferrer = () => {
    if (typeof document === 'undefined') return false;
    const ref = document.referrer || '';
    return /supabase\.(co|com)/i.test(ref);
  };

  const handleNavClick = async (e: React.MouseEvent, targetHref: string) => {
    // Skip checks for Supabase referrer (e.g., right after OAuth redirect)
    // if (isSupabaseReferrer()) return;
    // // If not logged in, initiate Google OAuth and redirect back to desired page
    // const { data } = await supabase.auth.getUser();
    // if (!data.user) {
    //   e.preventDefault();
    //   const redirectTo = `${window.location.origin}${targetHref}`;
    //   await supabase.auth.signInWithOAuth({
    //     provider: 'google',
    //     options: { redirectTo },
    //   });
    // }
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/football', label: 'Football' },
    { href: stocksHref, label: 'Stocks' },
    { href: '/trends', label: 'Trends' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-effect">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center w-full gap-2">
          <Link href="/" className="mr-4 sm:mr-10 md:mr-12 flex items-center space-x-3 group flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:blur-lg transition-all"></div>
              <Bot className="h-8 w-8 text-primary relative" />
            </div>
            <span className="hidden font-bold text-lg sm:inline-block font-headline">
              PDA
            </span>
          </Link>
          <nav className="flex items-center space-x-1 sm:space-x-2 text-sm font-medium flex-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={cn(
                  'px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all duration-200',
                  pathname.startsWith('/stocks') && link.label === 'Stocks'
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : pathname === link.href
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-foreground/70 hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {/* <div className="ml-auto flex items-center flex-shrink-0">
            {userName || userEmail ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="User menu"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 select-none shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                  >
                    <span className="text-sm sm:text-base font-semibold">
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
          </div> */}
        </div>
      </div>
    </header>
  );
}
