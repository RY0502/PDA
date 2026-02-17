import { fetchTrendingSearches } from '@/ai/flows/fetch-trending-searches';
import { Card, CardContent } from '@/components/ui/card';
import { SummaryDisplay } from '@/components/summary-display';
import { TrendingUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { slugify, parseSectionsFromSummary } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

// Revalidate the page every hour
export const revalidate = 3600;
export const dynamic = 'force-static';
const getCachedTrendingSearches = unstable_cache(async () => await fetchTrendingSearches(), ['trends'], { revalidate: 3600 });

const getLatestAQI = unstable_cache(
  async (): Promise<number | null> => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) return null;
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/read-dashboard-metrics?metric=aqi`, {
        headers: { Authorization: `Bearer ${supabaseAnonKey}` }
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return typeof data?.aqi === 'number' ? data.aqi : null;
    } catch {
      return null;
    }
  },
  ['delhi-aqi-status-latest'],
  { revalidate: 900 }
);

interface TrendItem {
  text: string;
}

interface TrendSection {
  title: string;
  items: TrendItem[];
}

// Component to render a single trend item with bullet point

function TrendListItem({ item }: { item: TrendItem }) {
  const parts = item.text.split(/(\*\*.*?\*\*)/g).filter((part) => part);
  const slug = slugify(item.text);
  const href = `/trends/news/${slug}?title=${encodeURIComponent(item.text)}`;
  return (
    <li id={`item-${slug}`} className="scroll-mt-16">
      <Link
        href={href}
        className="group block rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm p-5 transition-all duration-300 hover:bg-card/90 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5"
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex-1 text-base leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors">
            {parts.map((part, i) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={i} className="font-bold text-primary">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
        </div>
      </Link>
    </li>
  );
}

function TrendsSummary({ trendSections }: { trendSections: TrendSection[] }) {
  return (
    <>
      {trendSections.length > 0 ? (
        <div className="space-y-7">
          {trendSections.map((section, index) => (
            <div key={index} className="pb-7 last:pb-0 border-b border-border/30 last:border-0">
              <ul className="space-y-3.5">
                {section.items.map((item, itemIndex) => (
                  itemIndex === 0 ? null : <TrendListItem key={itemIndex} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">No trends to display at the moment.</p>
      )}
    </>
  );
}

export default async function TrendsPage() {
  let summary = '';
  const res = await getCachedTrendingSearches();
  summary = res.summary;
  const trendSections: TrendSection[] = parseSectionsFromSummary(summary, "Today's Top Trends");
  const aqi = await getLatestAQI();

  return (
    <div className="container py-6 sm:py-10 md:py-16">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 text-center mb-6 sm:mb-8 md:mb-10">
        <div className="relative mt-1">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 p-5 rounded-2xl shadow-lg ring-1 ring-primary/20">
            <TrendingUp className="h-16 w-16 text-primary" />
          </div>
        </div>
        <h1 className="font-headline gradient-text text-5xl md:text-6xl font-bold">
          Daily Trends
        </h1>
        <p className="max-w-2xl text-xl text-muted-foreground leading-relaxed text-balance">
          Today's top Google search trends, powered by AI
        </p>
      </section>

      <div className="py-4">
        <Card className="mx-auto max-w-4xl card-hover border-border/50 bg-card/90 backdrop-blur-sm shadow-xl">
          <CardContent className="p-0">
            <SummaryDisplay
              title="Today's Top Trends"
              rightContent={
                aqi != null ? (
                  <div className="font-normal font-sans text-base tracking-tight px-3 py-1 rounded-lg bg-card/40 shadow-inner ring-1 ring-border/30 text-foreground/70">
                    AQI: {aqi}
                  </div>
                ) : null
              }
              initialContent={<TrendsSummary trendSections={trendSections} />}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
