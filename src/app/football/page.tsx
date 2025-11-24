import { getLatestFootballNews } from '@/ai/flows/get-latest-football-news';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Newspaper, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { DEFAULT_FOOTBALL_LOGO_URI } from '@/lib/constants';
import { SummaryDisplay } from '@/components/summary-display';
import { unstable_cache } from 'next/cache';

export const revalidate = 3600; // Revalidate the page every 1 hours
export const dynamic = 'force-static';
const getCachedLatestFootballNews = unstable_cache(async () => await getLatestFootballNews(), ['football-news'], { revalidate: 3600 });

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
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function NewsListItem({ item }: { item: NewsItem }) {
  const parts = item.text.split(/(\*\*.*?\*\*)/g).filter((part) => part);
  const slug = slugify(item.text);
  const href = `/football/news/${slug}?title=${encodeURIComponent(item.text)}`;
  return (
    <li id={`item-${slug}`} className="scroll-mt-16">
      <Link
        href={href}
        className="group block rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 transition-all duration-300 hover:bg-card/80 hover:border-primary/40 hover:shadow-md"
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Newspaper className="h-5 w-5" />
          </div>
          <div className="flex-1 text-base leading-relaxed text-foreground/80 group-hover:text-foreground">
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
          <ChevronRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5" />
        </div>
      </Link>
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
              <Avatar className="h-[52px] w-[52px] sm:h-14 sm:w-14 bg-gradient-to-br from-muted to-muted/50 border-2 border-border/50 hover:border-primary/50 transition-all hover:scale-110 cursor-pointer shadow-sm flex-shrink-0">
                <AvatarImage src={club.logoUrl || DEFAULT_FOOTBALL_LOGO_URI} alt={`${club.name} logo`} />
                <AvatarFallback>
                  <Image src={DEFAULT_FOOTBALL_LOGO_URI} alt="Football logo" width={52} height={52} />
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
              <Avatar className="h-[52px] w-[52px] sm:h-14 sm:w-14 bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-dashed border-primary/30 hover:border-primary/60 transition-all hover:scale-110 cursor-pointer flex-shrink-0">
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
                  item.text.toLowerCase().includes("today's top stories") ? null : <NewsListItem key={itemIndex} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No news to display at the moment.</p>
      )}
    </>
  );
}

export default async function FootballPage() {
  let summary = '';
  let clubsWithLogos: ClubWithLogo[] = [];
  let totalClubs = 0;
  const res = await getCachedLatestFootballNews();
  summary = res.summary;
  clubsWithLogos = res.clubsWithLogos;
  totalClubs = res.totalClubs;
  const lines = summary.split('\n').filter((item) => item.trim().length > 0);

  const newsSections: NewsSection[] = [];
  let currentSection: NewsSection | null = null;

  const hasSectionHeaders = lines.some(
    (line) => line.startsWith('**') && line.endsWith('**')
  );

  if (hasSectionHeaders) {
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
        const text = trimmedLine.startsWith('*') || trimmedLine.startsWith('-')
          ? trimmedLine.slice(1).trim()
          : trimmedLine;
        currentSection.items.push({ text });
      }
    });
  } else {
    // Fallback: treat all lines as items under a default section
    currentSection = {
      title: "Today's Top Stories",
      items: lines.map((line) => {
        const trimmedLine = line.trim();
        const text = trimmedLine.startsWith('*') || trimmedLine.startsWith('-')
          ? trimmedLine.slice(1).trim()
          : trimmedLine;
        return { text };
      }),
    };
  }

  if (currentSection) {
    newsSections.push(currentSection);
  }

  return (
    <div className="container py-7 md:py-16">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 text-center mb-7">
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

      <div className="py-5">
        <ClubLogos clubs={clubsWithLogos} totalClubs={totalClubs} />
        <Card className="mx-auto max-w-4xl card-hover border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <SummaryDisplay
              title="Today's Top Stories"
              initialContent={<NewsSummary newsSections={newsSections} />}
              hideConvertButton
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
