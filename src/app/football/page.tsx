import { getLatestFootballNews } from '@/ai/flows/get-latest-football-news';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Newspaper } from 'lucide-react';
import Image from 'next/image';
import { DEFAULT_FOOTBALL_LOGO_URI } from '@/lib/constants';
import { SummaryDisplay } from '@/components/summary-display';

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

// A component to display club logos
function ClubLogos({ clubs, totalClubs }: { clubs: ClubWithLogo[], totalClubs: number }) {
  if (!clubs || clubs.length === 0) {
    return null;
  }
  
  const remainingClubs = totalClubs - clubs.length;

  return (
    <div className="mx-auto mb-10 flex max-w-4xl flex-wrap items-center justify-center gap-3 sm:gap-4">
      <TooltipProvider>
        {clubs.map((club) => (
          <Tooltip key={club.name}>
            <TooltipTrigger asChild>
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br from-muted to-muted/50 border-2 border-border/50 hover:border-primary/50 transition-all hover:scale-110 cursor-pointer shadow-sm flex-shrink-0">
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
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-dashed border-primary/30 hover:border-primary/60 transition-all hover:scale-110 cursor-pointer flex-shrink-0">
                <AvatarFallback className="text-primary font-bold text-sm">+{remainingClubs}</AvatarFallback>
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

function NewsSummary({ newsSections }: { newsSections: NewsSection[] }) {
  return (
    <>
      {newsSections.length > 0 ? (
        <div className="space-y-6">
          {newsSections.map((section, index) => (
            <div key={index} className="pb-6 last:pb-0">
              <h3 className="text-xl font-bold tracking-tight text-foreground mb-4 font-headline">
                {section.title}
              </h3>
              <ul className="space-y-3">
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
    </>
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
    } else if (currentSection) {
      // Treat any line that is not a title as a news item.
      const text = trimmedLine.startsWith('*') || trimmedLine.startsWith('-') 
        ? trimmedLine.slice(1).trim() 
        : trimmedLine;
      currentSection.items.push({ text });
    }
  });

  if (currentSection) {
    newsSections.push(currentSection);
  }

  return (
    <div className="container py-12 md:py-16">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 text-center mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-2xl"></div>
          <Newspaper className="h-20 w-20 text-primary relative" />
        </div>
        <h1 className="font-headline gradient-text">
          Football News
        </h1>
        <p className="max-w-2xl text-xl text-muted-foreground leading-relaxed text-balance">
          The latest headlines and transfer talk from the world of football,
          powered by AI.
        </p>
      </section>

      <div className="py-8">
        <ClubLogos clubs={clubsWithLogos} totalClubs={totalClubs} />
        <Card className="mx-auto max-w-4xl card-hover border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <SummaryDisplay
              title="Today's Top Stories"
              initialContent={<NewsSummary newsSections={newsSections} />}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
