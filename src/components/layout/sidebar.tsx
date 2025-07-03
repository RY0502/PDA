'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Home, Compass, Library, Plus, LogIn, Sparkles } from 'lucide-react';

const mainNav = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Discover', href: '/football', icon: Compass },
  { name: 'Spaces', href: '/trends', icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r bg-sidebar">
      <div className="flex h-full flex-col p-4">
        <div className="mb-8 flex items-center gap-2 px-3 py-2">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>

        <Button variant="outline" className="mb-8 w-full justify-start">
          <Plus className="mr-2" /> New
        </Button>

        <nav className="flex flex-col gap-2">
          {mainNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <Link
            href="#"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <LogIn className="h-5 w-5" />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
