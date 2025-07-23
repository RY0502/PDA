import { fetchTrendingSearches } from '@/ai/flows/fetch-trending-searches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TrendingUp } from 'lucide-react';

// Revalidate the page every hour
export const revalidate = 3600;

interface TrendSection {
  title: string;
  items: string[];
}

function TrendListItem({ text }: { text: string }) {
  const cleanedText = text.replace(/^\*+\s*/, '').trim();
  return <li className="py-2">{cleanedText}</li>;
}

export default async function TrendsPage() {
  const { summary } = await fetchTrendingSearches();
  const lines = summary.split('\n').filter(item => item.trim().length > 0);

  const trendSections: TrendSection[] = [];
  let currentSection: TrendSection | null = null;

  lines.forEach(line => {
    if (line.startsWith('**') && line.endsWith('**')) {
      if (currentSection) {
        trendSections.push(currentSection);
      }
      currentSection = {
        title: line.replace(/\*\*/g, ''),
        items: [],
      };
    } else if (line.startsWith('*') && currentSection) {
      currentSection.items.push(line);
    }
  });

  if (currentSection) {
    trendSections.push(currentSection);
  }

  return (
    <div className="container py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 text-center md:pb-8">
        <TrendingUp className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Daily Trends
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Today's top Google search trends, powered by AI.
        </p>
      </section>

      <div className="mx-auto max-w-3xl py-10">
        {trendSections.length > 0 ? (
          <div className="flex flex-col gap-8">
            {trendSections.map((section, sectionIndex) => (
              <Card key={sectionIndex}>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {section.items.map((item, itemIndex) => (
                      <TrendListItem key={itemIndex} text={item} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Today's Top Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Could not fetch trending topics at this time.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
