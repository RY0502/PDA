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
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const nav = (performance.getEntriesByType('navigation') as any)[0];
      const isReload = nav?.type === 'reload' || (performance as any).navigation?.type === 1;
      if (isReload && typeof window !== 'undefined' && window.location.hash) {
        const nextUrl = `${window.location.pathname}${window.location.search}`;
        history.replaceState(window.history.state, '', nextUrl);
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    } catch {}
  }, []);

  // Load Supabase user session
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        setUserName(data.session?.user?.user_metadata?.name ?? null);
        setUserEmail(data.session?.user?.email ?? null);
      } catch {}
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUserName(session?.user?.user_metadata?.name ?? null);
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetHref: string) => {
    // If clicking on current route, scroll smoothly to top
    if (pathname === targetHref) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Safety fallback for Next.js 15 stale-tab / router-freeze issue:
    // If a tab sits idle for some time, Next.js client-side router transitions
    // can stall or fail to commit silently. If pathname doesn't update within 1200ms,
    // force a clean hard navigation so the user is never stranded.
    const startPath = window.location.pathname;
    setTimeout(() => {
      if (window.location.pathname === startPath && targetHref !== startPath) {
        window.location.href = targetHref;
      }
    }, 1200);
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/football', label: 'Football' },
    { href: '/stocks', label: 'Stocks' },
    { href: '/trends', label: 'Trends' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-effect">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center w-full gap-2">
          <Link
            href="/"
            prefetch={false}
            onClick={(e) => handleNavClick(e, '/')}
            className="mr-4 sm:mr-10 md:mr-12 flex items-center space-x-3 group flex-shrink-0"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
              <div className="relative bg-gradient-to-br from-primary to-accent p-2 rounded-xl shadow-md group-hover:shadow-lg transition-all">
                <Bot className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-lg font-headline leading-none bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                PDA
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                AI Assistant
              </span>
            </div>
          </Link>
          <nav className="flex items-center space-x-1 sm:space-x-2 text-sm font-medium flex-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                prefetch={false}
                onClick={(e) => handleNavClick(e, link.href)}
                className={cn(
                  'px-3 py-2 sm:px-4 sm:py-2 rounded-xl transition-all duration-200',
                  (pathname.startsWith('/stocks') && link.label === 'Stocks') ||
                  (pathname.startsWith('/football') && link.label === 'Football') ||
                  (pathname.startsWith('/trends') && link.label === 'Trends') ||
                  pathname === link.href
                    ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground font-semibold shadow-md'
                    : 'text-foreground/70 hover:text-foreground hover:bg-primary/5'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center flex-shrink-0 pr-1">
            {userName || userEmail ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="User menu"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground h-10 w-10 sm:h-11 sm:w-11 select-none shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ring-2 ring-primary/20"
                  >
                    <span className="text-sm sm:text-base font-bold">
                      {(userName ?? userEmail ?? 'U')
                        .split(' ')
                        .slice(0, 2)
                        .map((s) => s[0]?.toUpperCase())
                        .join('')}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-border/50">
                  <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b border-border/50 mb-1">
                    {userName ?? userEmail}
                  </div>
                {userEmail === 'ravi.y0102@gmail.com' ? (
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/maintenance">Maintenance</Link>
                  </DropdownMenuItem>
                ) : null}
                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.auth.signOut();
                    }}
                    className="rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
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
