import React from 'react';
import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/50 backdrop-blur-sm mt-auto">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Made with</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />
            <span>by RYaxn</span>
          </div>
          <p className="text-xs text-muted-foreground/70">
            &copy; {new Date().getFullYear()} Personal Digital Assistant. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}