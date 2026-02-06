import { getLatestFootballNews } from '@/ai/flows/get-latest-football-news';
import { Card, CardContent} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Newspaper, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { DEFAULT_FOOTBALL_LOGO_URI } from '@/lib/constants';
import { SummaryDisplay } from '@/components/summary-display';
import { unstable_cache } from 'next/cache';
import { slugify, parseSectionsFromSummary } from '@/lib/utils';

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

function NewsListItem({ item }: { item: NewsItem }) {
  const parts = item.text.split(/(\*\*.*?\*\*)/g).filter((part) => part);
  const slug = slugify(item.text);
  const href = `/football/news/${slug}?title=${encodeURIComponent(item.text)}`;
  return (
    <li id={`item-${slug}`} className="scroll-mt-16">
      <Link
        href={href}
        className="group block rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm p-5 transition-all duration-300 hover:bg-card/90 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5"
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/20">
            <Newspaper className="h-5 w-5" />
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

// A component to display club logos
function ClubLogos({ clubs, totalClubs }: { clubs: ClubWithLogo[], totalClubs: number }) {
  if (!clubs || clubs.length === 0) {
    return null;
  }

  const remainingClubs = totalClubs - clubs.length;

  return (
    <div className="mx-auto mb-12 flex max-w-4xl flex-wrap items-center justify-center gap-3 sm:gap-5 md:gap-6">
      <TooltipProvider>
        {clubs.map((club) => (
          <Tooltip key={club.name}>
            <TooltipTrigger asChild>
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16 md:h-18 md:w-18 bg-gradient-to-br from-muted to-muted/50 border-2 border-border/50 hover:border-primary/50 transition-all hover:scale-110 cursor-pointer shadow-md hover:shadow-lg flex-shrink-0 ring-2 ring-primary/10">
                <AvatarImage src={club.logoUrl || DEFAULT_FOOTBALL_LOGO_URI} alt={`${club.name} logo`} />
                <AvatarFallback>
                  <Image src={DEFAULT_FOOTBALL_LOGO_URI} alt="Football logo" width={64} height={64} className="object-contain" />
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent className="rounded-xl shadow-lg border-border/50">
              <p className="font-semibold">{club.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingClubs > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16 md:h-18 md:w-18 bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-dashed border-primary/40 hover:border-primary/70 transition-all hover:scale-110 cursor-pointer flex-shrink-0 shadow-md">
                <AvatarFallback className="text-primary font-bold text-sm sm:text-base">+{remainingClubs}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent className="rounded-xl shadow-lg border-border/50">
              <p className="font-semibold">{remainingClubs} more clubs mentioned</p>
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
        <div className="space-y-7">
          {newsSections.map((section, index) => (
            <div key={index} className="pb-7 last:pb-0 border-b border-border/30 last:border-0">
              <h3 className="text-xl font-bold tracking-tight text-foreground mb-5 font-headline">
                {section.title}
              </h3>
              <ul className="space-y-3.5">
                {section.items.map((item, itemIndex) => (
                  item.text.toLowerCase().includes("today's top stories") ? null : <NewsListItem key={itemIndex} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">No news to display at the moment.</p>
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
  const newsSections: NewsSection[] = parseSectionsFromSummary(summary, "Today's Top Stories");

  return (
    <div className="container py-8 sm:py-10 md:py-16">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 text-center mb-6 sm:mb-8 md:mb-10">
        <div className="relative mt-1">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 p-5 rounded-2xl shadow-lg ring-1 ring-primary/20">
            <Newspaper className="h-16 w-16 text-primary" />
          </div>
        </div>
        <h1 className="font-headline gradient-text text-5xl md:text-6xl font-bold">
          Football News
        </h1>
        <p className="max-w-2xl text-xl text-muted-foreground leading-relaxed text-balance">
          The latest headlines and transfer talk from the world of football,
          powered by AI.
        </p>
      </section>

      <div className="pt-2 pb-6">
        <ClubLogos clubs={clubsWithLogos} totalClubs={totalClubs} />
        <Card className="mx-auto max-w-4xl card-hover border-border/50 bg-card/90 backdrop-blur-sm shadow-xl">
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
