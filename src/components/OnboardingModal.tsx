// Single first-run onboarding — mobile-first, premium walkthrough
import { useState, useEffect } from 'react';
import { ListChecks, Utensils, Bot, Share2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ONBOARDING_KEY = 'reptile-ai-onboarding-complete';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: <ListChecks className="w-8 h-8 text-primary" />,
    title: 'Add your reptiles',
    description: 'Create profiles with species, morph, and diet. We\'ll help you stay on schedule.',
  },
  {
    icon: <Utensils className="w-8 h-8 text-primary" />,
    title: 'Log care events',
    description: 'Record feedings, sheds, and health checks. Track weights and supplements in one place.',
  },
  {
    icon: <Bot className="w-8 h-8 text-primary" />,
    title: 'AI assistant',
    description: 'Add your API key in Settings for personalized care advice and quick answers.',
  },
  {
    icon: <Share2 className="w-8 h-8 text-primary" />,
    title: 'Share care cards',
    description: 'From any profile, tap Share Care Card to generate a QR-linked summary for sitters or vets.',
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setOpen(true);
  }, []);

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOpen(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-page-title">Welcome to Reptile AI</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-6 space-y-6">
          {/* Progress */}
          <div className="flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              {current.icon}
            </div>
            <div className="space-y-2">
              <h3 className="text-card-title text-foreground">{current.title}</h3>
              <p className="text-secondary leading-relaxed max-w-[280px] mx-auto">
                {current.description}
              </p>
            </div>
          </div>

          {/* Single CTA */}
          <div className="flex flex-col gap-3">
            <Button onClick={handleNext} className="w-full min-h-[48px]" size="lg">
              {isLast ? 'Get started' : 'Next'}
              {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
            {!isLast && (
              <button
                type="button"
                onClick={handleClose}
                className="text-caption hover:text-foreground transition-colors py-1"
              >
                Skip intro
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
