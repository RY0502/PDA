import { getLatestFootballNews } from '@/ai/flows/get-latest-football-news';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Newspaper, Dot } from 'lucide-react';
import Image from 'next/image';
import { DEFAULT_FOOTBALL_LOGO_URI } from '@/lib/constants';

export const revalidate = 5400; // Revalidate the page every 1.5 hours

// Define the types for our structured data
interface NewsItem {
  text: string;
}

interface NewsSection {
  title: string;
  items: NewsItem[];
}

interface ClubWithLogo {
  name: string;
  logoUrl?: string;
}

// A component to render a single news item, handling team name highlighting
function NewsListItem({ item }: { item: NewsItem }) {
  const parts = item.text.split(/(\*\*.*?\*\*)/g).filter((part) => part);
  return (
    <li className="flex items-start gap-2">
      <Dot className="h-5 w-5 flex-shrink-0 text-primary" />
      <span className="flex-1 text-base text-muted-foreground">
        {parts.map((part, i) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={i} className="font-semibold text-primary">
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

// A component to display club logos
function ClubLogos({ clubs, totalClubs }: { clubs: ClubWithLogo[], totalClubs: number }) {
  if (!clubs || clubs.length === 0) {
    return null;
  }
  
  const remainingClubs = totalClubs - clubs.length;

  return (
    <div className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-center gap-4">
      <TooltipProvider>
        {clubs.map((club) => (
          <Tooltip key={club.name}>
            <TooltipTrigger asChild>
              <Avatar key={club.name} className="h-12 w-12 bg-muted">
                <AvatarImage src={club.logoUrl || DEFAULT_FOOTBALL_LOGO_URI} alt={`${club.name} logo`} />
                <AvatarFallback>
                  <Image src={DEFAULT_FOOTBALL_LOGO_URI} alt="Football logo" width={48} height={48} />
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{club.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingClubs > 0 && (
           <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-12 w-12 bg-muted">
                <AvatarFallback>+{remainingClubs}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{remainingClubs} more clubs mentioned</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}


export default async function FootballPage() {
  const { summary, clubsWithLogos, totalClubs } = await getLatestFootballNews();
  const lines = summary.split('\n').filter((item) => item.trim().length > 0);

  const newsSections: NewsSection[] = [];
  let currentSection: NewsSection | null = null;

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      if (currentSection) {
        newsSections.push(currentSection);
      }
      currentSection = {
        title: trimmedLine.slice(2, -2),
        items: [],
      };
    } else if (
      currentSection &&
      (trimmedLine.startsWith('*') || trimmedLine.startsWith('-'))
    ) {
      currentSection.items.push({ text: trimmedLine.slice(1).trim() });
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
          The latest headlines and transfer talk from the world of football,
          powered by AI.
        </p>
      </section>

      <div className="py-10">
        <ClubLogos clubs={clubsWithLogos} totalClubs={totalClubs} />
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>Today's Top Stories</CardTitle>
          </CardHeader>
          <CardContent>
            {newsSections.length > 0 ? (
              <div className="space-y-6">
                {newsSections.map((section, index) => (
                  <div key={index}>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {section.title}
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {section.items.map((item, itemIndex) => (
                        <NewsListItem key={itemIndex} item={item} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No news to display at the moment.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
