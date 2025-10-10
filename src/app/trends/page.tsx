import { fetchTrendingSearches } from '@/ai/flows/fetch-trending-searches';
import { Card, CardContent } from '@/components/ui/card';
import { SummaryDisplay } from '@/components/summary-display';
import { TrendingUp } from 'lucide-react';

// Revalidate the page every hour
export const revalidate = 3600;

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
  return (
    <li className="flex items-start gap-3 group">
      <div className="mt-[0.4rem] flex-shrink-0">
        <div className="h-2 w-2 rounded-full bg-primary group-hover:scale-125 transition-transform"></div>
      </div>
      <span className="flex-1 text-base text-foreground/80 leading-relaxed">
        {parts.map((part, i) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={i} className="font-bold text-primary">
              {part.slice(2, -2)}
            </strong>
          ) : (
            part
          )
        )}
      </span>
    </li>
  );
}

function TrendsSummary({ trendSections }: { trendSections: TrendSection[] }) {
  return (
    <>
      {trendSections.length > 0 ? (
        <div className="space-y-6">
          {trendSections.map((section, index) => (
            <div key={index} className="pb-6 last:pb-0">
              <h3 className="text-xl font-bold tracking-tight text-foreground mb-4 font-headline">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <TrendListItem key={itemIndex} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No trends to display at the moment.
        </p>
      )}
    </>
  );
}

export default async function TrendsPage() {
  const { summary } = await fetchTrendingSearches();
  const lines = summary.split('\n').filter((item) => item.trim().length > 0);

  const trendSections: TrendSection[] = [];
  let currentSection: TrendSection | null = null;

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      if (currentSection) {
        trendSections.push(currentSection);
      }
      currentSection = {
        title: trimmedLine.slice(2, -2),
        items: [],
      };
    } else if (currentSection) {
      const text = trimmedLine.startsWith('*') || trimmedLine.startsWith('-') 
        ? trimmedLine.slice(1).trim() 
        : trimmedLine;
      currentSection.items.push({ text });
    }
  });

  if (currentSection) {
    trendSections.push(currentSection);
  }

  return (
    <div className="container py-12 md:py-16">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 text-center mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-2xl"></div>
          <TrendingUp className="h-20 w-20 text-primary relative" />
        </div>
        <h1 className="font-headline gradient-text">
          Daily Trends
        </h1>
        <p className="max-w-2xl text-xl text-muted-foreground leading-relaxed text-balance">
          Today's top Google search trends, powered by AI.
        </p>
      </section>

      <div className="py-8">
        <Card className="mx-auto max-w-4xl card-hover border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <SummaryDisplay
              title="Today's Top Trends"
              initialContent={<TrendsSummary trendSections={trendSections} />}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}