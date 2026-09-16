import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BellRing,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  PawPrint,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Watch,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { isSampleDatasetEnabled, seedExpoDemo, updateSettings } from '@/lib/storage';
import {
  APP_STORE_BADGE_ALT,
  APP_STORE_BADGE_SRC,
  APP_STORE_URL,
} from '@/lib/appStore';
import { REPTILITA_SUPPORT_EMAIL, reptilitaMailto } from '@/lib/reptilitaSupport';

const valueBlocks = [
  {
    title: 'Feeding, cleaning, and health journal',
    description:
      'Log feeds, enclosure cleanings, sheds, weights, and health notes in one timeline per animal — not scattered chats and notebooks.',
    icon: BookOpen,
  },
  {
    title: 'Schedules that stay in front of you',
    description:
      'Today shows what is due, overdue, or done so every snake, lizard, frog, or gecko gets care on time.',
    icon: BellRing,
  },
  {
    title: 'Apple Watch: Feed, Clean, Mist',
    description:
      'Mark feeding, cleaning, and misting from your wrist with the Reptilita Watch app while you are at the enclosure.',
    icon: Watch,
  },
  {
    title: 'A collection, not a single pet profile',
    description:
      'Photos, species, morphs, and care history for as many reptiles and amphibians as you keep.',
    icon: PawPrint,
  },
];

const mockTasks = [
  { label: 'Health check', animal: 'Luna', status: 'Due today', tone: 'text-amber-700 dark:text-amber-300' },
  { label: 'Feed', animal: 'Spike', status: 'Due today', tone: 'text-amber-700 dark:text-amber-300' },
  { label: 'Clean', animal: 'Atlas', status: 'In 4 days', tone: 'text-emerald-700 dark:text-emerald-300' },
];

const androidTestingMailto = reptilitaMailto(
  'Android testing',
  'Hi — I would like to join Reptilita Android testing.',
);

export default function LandingPage() {
  const navigate = useNavigate();
  const [loadingSample, setLoadingSample] = useState(false);
  const sampleOk = isSampleDatasetEnabled();

  const openWithSampleData = async () => {
    setLoadingSample(true);
    try {
      await seedExpoDemo();
      await updateSettings({ expoDemoMode: true });
      toast.success('Starter setup ready');
      navigate('/today');
    } catch (error) {
      console.error('Failed to load sample collection:', error);
      toast.error(error instanceof Error && error.message ? error.message : 'Could not load sample data');
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="page-content mx-auto flex w-full max-w-6xl flex-col gap-12 pb-10 pt-5 sm:gap-16 sm:pt-8 lg:pb-16">
        <nav className="flex items-center justify-between gap-4" aria-label="Marketing">
          <Link to="/" className="flex items-center gap-2 rounded-full focus-visible:outline-none">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <PawPrint className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">Reptilita</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/today')}
              className="rounded-full bg-card/70"
            >
              Open web app
            </Button>
          </div>
        </nav>

        <section className="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
          <div className="animate-in-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              For reptile and amphibian keepers
            </div>
            <h1 className="mt-5 max-w-[14ch] text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Care for every animal, without the spreadsheet
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Reptilita is a local-first companion for snakes, lizards, turtles, frogs, and the rest of your herp
              collection — feeding and health journals, care schedules, and Apple Watch actions in one calm daily
              dashboard.
            </p>
            <div className="mt-7 flex flex-col items-start gap-4">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={APP_STORE_BADGE_ALT}
              >
                <img
                  src={APP_STORE_BADGE_SRC}
                  alt={APP_STORE_BADGE_ALT}
                  width={180}
                  height={60}
                  className="h-10 w-auto sm:h-12"
                />
              </a>
              <p className="text-sm text-muted-foreground">
                Coming soon on Google Play.{' '}
                <a
                  href={androidTestingMailto}
                  className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Join Android testing
                </a>
              </p>
              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/today')}
                  className="w-full rounded-full bg-card/70 sm:w-auto"
                >
                  Open in your browser
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
                {sampleOk && (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={openWithSampleData}
                    disabled={loadingSample}
                    className="w-full rounded-full text-muted-foreground sm:w-auto"
                  >
                    {loadingSample ? 'Loading…' : 'Preview sample collection'}
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
                Local-first records
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                Optional cloud sync when you sign in
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-primary" aria-hidden />
                iPhone, iPad, and PWA
              </span>
            </div>
          </div>

          <TodayMockup />
        </section>

        <section aria-labelledby="value-title" className="space-y-4">
          <div className="max-w-2xl">
            <p className="section-header">Why keepers use Reptilita</p>
            <h2 id="value-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Husbandry tools that match how you actually care for animals.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {valueBlocks.map(({ title, description, icon: Icon }) => (
              <article key={title} className="premium-surface rounded-[var(--radius-xl)] p-4 sm:p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-card-title">{title}</h3>
                <p className="mt-2 text-secondary">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="screenshot-title" className="grid gap-5 lg:grid-cols-[0.82fr_1fr] lg:items-center">
          <div>
            <p className="section-header">Today dashboard</p>
            <h2 id="screenshot-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Start every day with the right animal and the right task.
            </h2>
            <p className="mt-3 text-secondary">
              See collection health, a Focus Animal, and a short action list. Log care in seconds, then pick it up
              later in the journal.
            </p>
          </div>
          <TodayMockup compact />
        </section>

        <section aria-labelledby="faq-title" className="space-y-4">
          <div className="max-w-2xl">
            <p className="section-header">FAQ</p>
            <h2 id="faq-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Privacy, platforms, and getting help.
            </h2>
          </div>
          <Accordion type="single" collapsible className="premium-surface rounded-[var(--radius-xl)] px-4 sm:px-5">
            <AccordionItem value="privacy">
              <AccordionTrigger>Where is my collection stored?</AccordionTrigger>
              <AccordionContent className="text-secondary">
                Animal profiles, journals, and schedules live on your device first. If you create an account, you can
                optionally sync supported records to the cloud. We do not sell your husbandry data.{' '}
                <Link to="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Read the privacy policy
                </Link>
                .
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="android">
              <AccordionTrigger>Is Reptilita on Google Play?</AccordionTrigger>
              <AccordionContent className="text-secondary">
                Not as a public listing yet — Android is in a tester stage. Use{' '}
                <a
                  href={androidTestingMailto}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Join Android testing
                </a>{' '}
                to request access, or use the web app in your browser in the meantime.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="offline">
              <AccordionTrigger>Does it work without an account?</AccordionTrigger>
              <AccordionContent className="text-secondary">
                Yes. You can run Reptilita fully locally. Sign-in is optional and unlocks cloud sync for supported data
                plus Pro features when you choose them.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="support">
              <AccordionTrigger>How do I get support?</AccordionTrigger>
              <AccordionContent className="text-secondary">
                Email{' '}
                <a
                  href={reptilitaMailto('Reptilita support')}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {REPTILITA_SUPPORT_EMAIL}
                </a>
                . Legal pages:{' '}
                <Link to="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Privacy
                </Link>{' '}
                and{' '}
                <Link to="/terms" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Terms
                </Link>
                .
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section className="premium-surface-elevated overflow-hidden rounded-[calc(var(--radius-xl)+0.5rem)] p-5 text-center sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Get the app</p>
          <h2 className="mx-auto mt-2 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Download Reptilita for iPhone and iPad.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-secondary">
            Keep feeding, cleaning, and health records with you at the rack — including Feed, Clean, and Mist on Apple
            Watch.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={APP_STORE_BADGE_ALT}
            >
              <img
                src={APP_STORE_BADGE_SRC}
                alt={APP_STORE_BADGE_ALT}
                width={180}
                height={60}
                className="h-10 w-auto sm:h-12"
              />
            </a>
            <p className="text-xs text-muted-foreground">Coming soon on Google Play</p>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-border/60 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Reptilita — local-first care records for reptiles and amphibians.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/today" className="text-foreground hover:text-primary">
              Web app
            </Link>
            <Link to="/privacy" className="text-foreground hover:text-primary">
              Privacy
            </Link>
            <Link to="/terms" className="text-foreground hover:text-primary">
              Terms
            </Link>
            <a href={reptilitaMailto('Reptilita support')} className="text-foreground hover:text-primary">
              Support
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function TodayMockup({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="premium-surface-elevated relative mx-auto w-full max-w-[26rem] overflow-hidden rounded-[2rem] p-3 shadow-[var(--surface-shadow-deep)]"
      aria-label="Mock Today page showing Care Score and Focus Animal"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(120% 80% at 10% 0%, hsl(var(--primary) / 0.12) 0%, transparent 58%), radial-gradient(100% 70% at 100% 100%, hsl(var(--accent) / 0.08) 0%, transparent 62%)',
        }}
      />
      <div className="relative rounded-[1.55rem] border border-border/60 bg-background/75 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Today</p>
            <p className="text-xl font-semibold tracking-tight">Care plan</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Preview</span>
        </div>

        <div className="mt-4 rounded-2xl border border-primary/20 bg-card/80 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Today&apos;s Care Score
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <p className="text-4xl font-semibold leading-none tracking-tight">
              84<span className="text-base text-muted-foreground">/100</span>
            </p>
            <p className="text-right text-xs text-emerald-700 dark:text-emerald-300">2 due today</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-2">
            <p className="text-muted-foreground">Overdue</p>
            <p className="mt-1 font-semibold text-destructive">0</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
            <p className="text-muted-foreground">Due</p>
            <p className="mt-1 font-semibold text-amber-700 dark:text-amber-300">2</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2">
            <p className="text-muted-foreground">Healthy</p>
            <p className="mt-1 font-semibold text-emerald-700 dark:text-emerald-300">3</p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-border/60 bg-card/80 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Focus Animal
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
              BP
            </div>
            <div>
              <p className="font-semibold leading-tight">Luna</p>
              <p className="text-xs text-muted-foreground">Ball Python - Piebald</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Next task: Health check</p>
        </div>

        {!compact && (
          <div className="mt-3 space-y-2">
            {mockTasks.map((task) => (
              <div key={`${task.label}-${task.animal}`} className="flex items-center justify-between rounded-xl border border-border/50 bg-card/70 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{task.label}</p>
                  <p className="text-xs text-muted-foreground">{task.animal}</p>
                </div>
                <span className={`text-xs font-medium ${task.tone}`}>{task.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
