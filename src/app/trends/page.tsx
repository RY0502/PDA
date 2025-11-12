import { fetchTrendingSearches } from '@/ai/flows/fetch-trending-searches';
import { Card, CardContent } from '@/components/ui/card';
import { SummaryDisplay } from '@/components/summary-display';
import { TrendingUp } from 'lucide-react';
import Link from 'next/link';

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
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function TrendListItem({ item }: { item: TrendItem }) {
  const parts = item.text.split(/(\*\*.*?\*\*)/g).filter((part) => part);
  const href = `/trends/news/${slugify(item.text)}?title=${encodeURIComponent(item.text)}`;
  return (
    <li className="flex items-center gap-3 group">
      <div className="flex-shrink-0">
        <div className="h-2 w-2 rounded-full bg-primary group-hover:scale-125 group-hover:shadow-lg group-hover:shadow-primary/50 transition-all duration-300"></div>
      </div>
      <Link 
        href={href} 
        className="flex-1 text-base text-foreground/80 leading-relaxed cursor-pointer px-3 -mx-3 py-2 rounded-md transition-all duration-300 ease-out hover:text-foreground hover:bg-primary/5 hover:px-4"
      >
        {parts.map((part, i) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={i} className="font-bold text-primary">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </Link>
    </li>
  );
}

function TrendsSummary({ trendSections, fallbackMessage }: { trendSections: TrendSection[], fallbackMessage?: string }) {
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
          {fallbackMessage ?? 'No trends to display at the moment.'}
        </p>
      )}
    </>
  );
}

export default async function TrendsPage() {
  let summary = '';
  let fallbackMessage: string | undefined;

  try {
    const res = await fetchTrendingSearches();
    summary = res.summary;
  } catch (_err) {
    // When upstream Gemini is unavailable (e.g., 503), show a friendly message
    fallbackMessage = 'Trends will be available shortly. Please check back later.';
  }
  const lines = summary
    .split('\n')
    .map((l) => l.trim())
    .filter((item) => item.length > 0 && !item.startsWith('```') && !item.endsWith('```'));

  const trendSections: TrendSection[] = [];
  let currentSection: TrendSection | null = null;

  const hasSectionHeaders = lines.some(
    (line) => line.startsWith('**') && line.endsWith('**')
  );

  if (hasSectionHeaders) {
    lines.forEach((line) => {
      const trimmedLine = line;
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
  } else {
    // Fallback: treat all lines as items under a default section
    currentSection = {
      title: "Today's Top Trends",
      items: lines.map((line) => {
        const text = line.startsWith('*') || line.startsWith('-')
          ? line.slice(1).trim()
          : line;
        return { text };
      }),
    };
  }

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
              initialContent={<TrendsSummary trendSections={trendSections} fallbackMessage={fallbackMessage} />}
              hideConvertButton
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}