import { fetchTrendingSearches } from '@/ai/flows/fetch-trending-searches';
import { summarizeTrend } from '@/ai/flows/summarize-trend';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TrendingUp } from 'lucide-react';

type TrendWithSummary = {
  query: string;
  summary: string;
};

export default async function TrendsPage() {
  const trendingQueries = await fetchTrendingSearches();

  const trendsWithSummaries: TrendWithSummary[] = await Promise.all(
    trendingQueries.map(async (query) => {
      try {
        const result = await summarizeTrend({ query });
        return { query, summary: result.summary };
      } catch (error) {
        console.error(`Failed to summarize trend for "${query}":`, error);
        return { query, summary: 'Could not generate summary at this time.' };
      }
    })
  );

  return (
    <div className="container max-w-screen-2xl py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 text-center md:pb-8">
        <TrendingUp className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Daily Trends
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          What the world is searching for today, summarized by AI.
        </p>
      </section>

      <div className="mx-auto max-w-4xl py-10">
        <Accordion type="single" collapsible className="w-full">
          {trendsWithSummaries.map((item, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className="text-left text-lg hover:no-underline">
                {item.query}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">{item.summary}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
