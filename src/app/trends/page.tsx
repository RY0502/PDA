'use client';

import { useEffect, useState } from 'react';
import { fetchTrendingSearches } from '@/ai/flows/fetch-trending-searches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

interface TrendSection {
  title: string;
  items: string[];
}

function TrendListItem({ text }: { text: string }) {
  const cleanedText = text.replace(/^\*+\s*/, '').trim();
  return <li className="py-2">{cleanedText}</li>;
}

export default function TrendsPage() {
  const [sections, setSections] = useState<TrendSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getTrends() {
      try {
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
        setSections(trendSections);
      } catch (error) {
        console.error('Failed to fetch trends', error);
      } finally {
        setLoading(false);
      }
    }

    getTrends();
  }, []);

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
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Today's Top Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {sections.length > 0 ? (
                <div className="flex flex-col gap-8">
                  {sections.map((section, sectionIndex) => (
                    <div key={sectionIndex}>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        {section.title}
                      </h2>
                      <Separator className="my-4" />
                      <ul className="divide-y divide-border">
                        {section.items.map((item, itemIndex) => (
                          <TrendListItem key={itemIndex} text={item} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Could not fetch trending topics at this time.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
