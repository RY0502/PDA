import { getLatestFootballNews } from '@/ai/flows/get-latest-football-news';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Newspaper } from 'lucide-react';

// Revalidate the page every hour
export const revalidate = 3600;

interface NewsSection {
  title: string;
  items: string[];
}

function NewsListItem({ text }: { text: string }) {
  // Remove leading asterisks and trim whitespace
  const cleanedText = text.replace(/^\*+\s*/, '').trim();

  // Make the first part bold (e.g., team name)
  const parts = cleanedText.split('**');
  
  return (
    <li className="py-2">
      {parts.length > 2 ? (
        <p>
          <span className="font-semibold text-primary">{parts[1]}</span>
          {parts[2]}
        </p>
      ) : (
        <p>{cleanedText}</p>
      )}
    </li>
  );
}

export default async function FootballPage() {
  const { summary } = await getLatestFootballNews({});
  const lines = summary.split('\n').filter(item => item.trim().length > 0);

  const newsSections: NewsSection[] = [];
  let currentSection: NewsSection | null = null;

  lines.forEach(line => {
    if (line.startsWith('**') && line.endsWith('**')) {
      if (currentSection) {
        newsSections.push(currentSection);
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
    newsSections.push(currentSection);
  }

  return (
    <div className="container py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 text-center md:pb-8">
        <Newspaper className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Football News
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          The latest headlines and transfer talk from the world of football, powered by AI.
        </p>
      </section>

      <div className="mx-auto max-w-3xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>Today's Top Stories</CardTitle>
          </CardHeader>
          <CardContent>
            {newsSections.length > 0 ? (
              <div className="flex flex-col gap-8">
                {newsSections.map((section, sectionIndex) => (
                  <div key={sectionIndex}>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      {section.title}
                    </h2>
                    <Separator className="my-4" />
                    <ul className="divide-y divide-border">
                      {section.items.map((item, itemIndex) => (
                        <NewsListItem key={itemIndex} text={item} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No news to display at the moment.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
