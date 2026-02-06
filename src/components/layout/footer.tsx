import React from 'react';
import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/30 backdrop-blur-sm mt-auto">
      <div className="container py-10">
        <div className="flex flex-col items-center justify-center gap-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">Crafted with</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />
            <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              by RYaxn
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground/70 font-medium">
              &copy; {new Date().getFullYear()} Personal Digital Assistant. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
