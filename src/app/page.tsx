import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Mock function to simulate fetching Medium articles.
// In a real app, this would involve a backend service to parse emails or an RSS feed.
async function getMediumArticles() {
  return [
    {
      id: '1',
      title: 'The Generative AI Revolution Is Just Getting Started',
      url: 'https://medium.com/towards-data-science/the-generative-ai-revolution-is-just-getting-started-b16f2434411def',
      source: 'Towards Data Science',
    },
    {
      id: '2',
      title: 'How to Build a Design System in 2024',
      url: 'https://medium.com/ux-design-weekly/how-to-build-a-design-system-in-2024-b0a3c20c0a9e',
      source: 'UX Design Weekly',
    },
    {
      id: '3',
      title: 'The Art of Clean Code',
      url: 'https://medium.com/swlh/the-art-of-clean-code-8b67548239c5',
      source: 'The Startup',
    },
    {
      id: '4',
      title: 'Mastering React Hooks: A Deep Dive into useEffect',
      url: 'https://medium.com/javascript-in-plain-english/mastering-react-hooks-a-deep-dive-into-useeffect-3453b3424692',
      source: 'JavaScript in Plain English',
    },
  ];
}

export default async function Home() {
  const articles = await getMediumArticles();

  return (
    <div className="container max-w-screen-2xl py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 text-center md:pb-8">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Your Daily Briefing
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Latest articles curated for you from Medium.
        </p>
      </section>

      <div className="grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {articles.map((article) => (
          <Card key={article.id} className="flex flex-col">
            <CardHeader className="flex-grow">
              <CardTitle className="text-lg leading-snug">{article.title}</CardTitle>
              <CardDescription>From: {article.source}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/view?url=${encodeURIComponent(article.url)}`}>
                  Read Article
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
