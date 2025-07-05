'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Newspaper, TrendingUp, LogIn, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const mainNav = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Football', href: '/football', icon: Newspaper },
  { name: 'Trends', href: '/trends', icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-background transition-all duration-300 w-16 md:w-60">
      <div className="flex h-full flex-col p-2 md:p-4">
        <div className="mb-8 flex h-[40px] items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>

        <TooltipProvider>
          <nav className="flex flex-col gap-2">
            {mainNav.map((item) => (
              <Tooltip key={item.name} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-lg p-2 text-sm font-medium transition-colors justify-center md:justify-start md:px-3 md:gap-3',
                      pathname === item.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="hidden md:inline">{item.name}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="md:hidden">
                  <p>{item.name}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>

          <div className="mt-auto">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href="#"
                  className="flex items-center rounded-lg p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground justify-center md:justify-start md:px-3 md:gap-3"
                >
                  <LogIn className="h-5 w-5" />
                  <span className="hidden md:inline">Sign In</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="md:hidden">
                <p>Sign In</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

      </div>
    </aside>
  );
}
