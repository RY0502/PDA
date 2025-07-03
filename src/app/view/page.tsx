'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function ArticleViewer() {
  const searchParams = useSearchParams();
  const articleUrl = searchParams.get('url');

  if (!articleUrl) {
    return (
      <div className="container py-8 text-center">
        <p className="text-lg text-muted-foreground">Article URL not found.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back home
          </Link>
        </Button>
      </div>
    );
  }

  // Use freedium.cfd to display the article
  const displayUrl = `https://freedium.cfd/${articleUrl}`;

  return (
    <div className="container max-w-screen-2xl py-6">
      <div className="mb-4">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      <div className="relative w-full overflow-hidden rounded-lg border" style={{ height: 'calc(100vh - 120px)' }}>
        <iframe
          src={displayUrl}
          className="h-full w-full"
          title="Article Content"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}

// Wrap with Suspense because useSearchParams is a client-side hook
// that needs to wait for the client to be ready.
export default function ViewPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-8">
          <Skeleton className="h-[calc(100vh-120px)] w-full" />
        </div>
      }
    >
      <ArticleViewer />
    </Suspense>
  );
}
