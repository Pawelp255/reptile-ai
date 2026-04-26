import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BellRing,
  CheckCircle2,
  ChevronRight,
  Dna,
  Layers3,
  PawPrint,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { seedExpoDemo, updateSettings } from '@/lib/storage';

const valueBlocks = [
  {
    title: 'Track everything',
    description: 'Animals, feeding, sheds, weights, notes, photos, pairings, and clutches in one calm workspace.',
    icon: Layers3,
  },
  {
    title: 'Never miss care',
    description: 'See what is due today, what is overdue, and which animal needs attention first.',
    icon: BellRing,
  },
  {
    title: 'Breeding & genetics tools',
    description: 'Plan pairings, record clutches, and keep genetics details connected to every animal.',
    icon: Dna,
  },
];

const mockTasks = [
  { label: 'Health check', animal: 'Luna', status: 'Due today', tone: 'text-amber-700 dark:text-amber-300' },
  { label: 'Feed', animal: 'Spike', status: 'Due today', tone: 'text-amber-700 dark:text-amber-300' },
  { label: 'Clean', animal: 'Atlas', status: 'In 4 days', tone: 'text-emerald-700 dark:text-emerald-300' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [loadingDemo, setLoadingDemo] = useState(false);

  const openDemoApp = async () => {
    setLoadingDemo(true);
    try {
      await seedExpoDemo();
      await updateSettings({ expoDemoMode: true });
      toast.success('Demo collection loaded');
      navigate('/today');
    } catch (error) {
      console.error('Failed to load demo collection:', error);
      toast.error('Could not load demo collection');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="page-content mx-auto flex w-full max-w-6xl flex-col gap-12 pb-10 pt-5 sm:gap-16 sm:pt-8 lg:pb-16">
        <nav className="flex items-center justify-between gap-4" aria-label="Landing">
          <Link to="/" className="flex items-center gap-2 rounded-full focus-visible:outline-none">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <PawPrint className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">Reptilita</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={openDemoApp}
            disabled={loadingDemo}
            className="rounded-full bg-card/70"
          >
            Open app
          </Button>
        </nav>

        <section className="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
          <div className="animate-in-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Local-first care, built for animal keepers
            </div>
            <h1 className="mt-5 max-w-[12ch] text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Know exactly what every animal needs today
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Reptilita keeps care tasks, reminders, records, and breeding notes in one simple daily dashboard
              so nothing gets missed.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button onClick={openDemoApp} disabled={loadingDemo} size="lg" className="rounded-full">
                {loadingDemo ? 'Loading demo...' : 'Start demo now'}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={openDemoApp}
                disabled={loadingDemo}
                className="w-full rounded-full bg-card/70 sm:w-auto"
              >
                Open demo app
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
                No backend required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                Fast mobile workflow
              </span>
            </div>
          </div>

          <TodayMockup />
        </section>

        <section aria-labelledby="value-title" className="space-y-4">
          <div className="max-w-2xl">
            <p className="section-header">Value</p>
            <h2 id="value-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Replace scattered notes with one daily command center.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
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
            <p className="section-header">Today page preview</p>
            <h2 id="screenshot-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Start every day with the right animal and the right task.
            </h2>
            <p className="mt-3 text-secondary">
              The Today view summarizes collection health, highlights a Focus Animal, and turns reminders into
              a short action list.
            </p>
          </div>
          <TodayMockup compact />
        </section>

        <section className="premium-surface-elevated overflow-hidden rounded-[calc(var(--radius-xl)+0.5rem)] p-5 text-center sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Demo CTA</p>
          <h2 className="mx-auto mt-2 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
            See a complete collection in seconds.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-secondary">
            Load realistic animals, care schedules, events, pairings, and clutch data locally on this device.
          </p>
          <Button onClick={openDemoApp} disabled={loadingDemo} size="lg" className="mt-6 rounded-full">
            {loadingDemo ? 'Loading demo...' : 'Load demo collection'}
          </Button>
        </section>

        <footer className="flex flex-col gap-3 border-t border-border/60 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Reptilita - care records, reminders, and breeding tools for animal keepers.</p>
          <div className="flex gap-4">
            <button type="button" onClick={openDemoApp} className="text-foreground hover:text-primary">
              Open demo app
            </button>
            <button type="button" onClick={openDemoApp} className="text-foreground hover:text-primary">
              Start demo
            </button>
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
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Demo</span>
        </div>

        <div className="mt-4 rounded-2xl border border-primary/20 bg-card/80 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Today's Care Score
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
