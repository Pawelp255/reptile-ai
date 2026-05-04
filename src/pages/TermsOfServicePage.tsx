import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { REPTILITA_SUPPORT_EMAIL } from '@/lib/reptilitaSupport';

export default function TermsOfServicePage() {
  return (
    <PageMotion className="page-container">
      <PageHeader
        title="Terms of Service"
        subtitle={`Effective May 4, 2026 · Contact: ${REPTILITA_SUPPORT_EMAIL}`}
        rightContent={
          <Link to="/settings" className="text-sm font-medium text-primary hover:underline">
            Settings
          </Link>
        }
      />
      <div className="page-content page-content-top max-w-prose mx-auto space-y-5 pb-12 text-sm text-muted-foreground leading-relaxed">
        <p className="text-foreground font-medium">
          By using Reptilita you agree to these terms. If you do not agree, do not use the app.
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Not veterinary diagnosis or treatment</h2>
          <p>
            Reptilita, including any AI-assisted answers, genetics calculators, health previews, or care reminders, is for
            informational and record-keeping purposes only. It is{' '}
            <span className="text-foreground font-medium">not</span> a substitute for examination, diagnosis, or treatment
            by a licensed veterinarian. Always consult a qualified reptile-experienced veterinarian for medical decisions,
            emergencies, or medication.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">AI limitations</h2>
          <p>
            AI outputs can be wrong, incomplete, or outdated. You remain responsible for husbandry choices and for
            verifying critical facts against species-appropriate references and professional advice.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Service &quot;as is&quot;</h2>
          <p>
            The app is provided as-is to the maximum extent permitted by law. We do not warrant uninterrupted or error-free
            operation, including cloud sync or third-party AI availability.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Accounts and acceptable use</h2>
          <p>
            You are responsible for your account credentials and for content you enter. Do not misuse the service, attempt
            unauthorized access, or use the app in violation of applicable law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p>
            Questions about these terms: {REPTILITA_SUPPORT_EMAIL}
          </p>
        </section>

        <p className="text-xs pt-2 border-t border-border/70">
          These terms are a concise product notice and are not a substitute for counsel where you need formal legal terms
          for your jurisdiction.
        </p>
      </div>
    </PageMotion>
  );
}
