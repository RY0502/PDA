import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Paperclip,
  Mic,
  ArrowUp,
  Users,
  Scale,
  GraduationCap,
  HeartPulse,
  ClipboardCheck,
  ImageIcon,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">perplexity</h1>
        </div>
        <div className="relative mb-4">
           <div className="flex h-16 items-center rounded-2xl border-2 border-border bg-card px-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Ask anything..."
                className="h-full flex-1 border-0 bg-transparent pl-2 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center">
                <Button variant="ghost" size="icon">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Mic className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button size="icon" className="ml-2 rounded-lg bg-primary/90 hover:bg-primary">
                  <ArrowUp className="h-5 w-5" />
                </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" className="rounded-lg bg-card">
            <Users className="mr-2 h-4 w-4" />
            Parenting
          </Button>
          <Button variant="outline" className="rounded-lg bg-card">
            <Scale className="mr-2 h-4 w-4" />
            Compare
          </Button>
          <Button variant="outline" className="rounded-lg bg-card">
            <GraduationCap className="mr-2 h-4 w-4" />
            Perplexity 101
          </Button>
          <Button variant="outline" className="rounded-lg bg-card">
            <HeartPulse className="mr-2 h-4 w-4" />
            Health
          </Button>
          <Button variant="outline" className="rounded-lg bg-card">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Fact Check
          </Button>
        </div>
      </div>
    </div>
  );
}
