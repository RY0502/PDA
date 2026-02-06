
'use client';

import { type ReactNode } from 'react';

interface SummaryDisplayProps {
  initialContent: ReactNode;
  title: string;
}

export function SummaryDisplay({
  initialContent,
  title,
}: SummaryDisplayProps) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between p-6">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h3>
      </div>
      <div
        className="px-6 pb-6 pt-0 space-y-2"
      >
        {initialContent}
      </div>
    </div>
  );
}
