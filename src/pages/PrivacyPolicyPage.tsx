import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { REPTILITA_SUPPORT_EMAIL } from '@/lib/reptilitaSupport';

export default function PrivacyPolicyPage() {
  return (
    <PageMotion className="page-container">
      <PageHeader
        title="Privacy Policy"
        subtitle={`Effective May 4, 2026 · Contact: ${REPTILITA_SUPPORT_EMAIL}`}
        rightContent={
          <Link to="/settings" className="text-sm font-medium text-primary hover:underline">
            Settings
          </Link>
        }
      />
      <div className="page-content page-content-top max-w-prose mx-auto space-y-5 pb-12 text-sm text-muted-foreground leading-relaxed">
        <p className="text-foreground font-medium">
          Reptilita (&quot;we&quot;, &quot;the app&quot;) helps you care for reptiles and amphibians. This policy describes how we
          handle information when you use our web app, PWA, and native (Capacitor) builds.
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">What you store locally</h2>
          <p>
            Animal profiles, journal entries, schedules, genetics inputs, backups, and similar data are stored primarily on
            your device (for example in the browser&apos;s IndexedDB or equivalent native storage). This local data stays on
            the device unless you export it, enable cloud sync, or use features that intentionally send data to our servers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Account and cloud sync (Supabase)</h2>
          <p>
            If you sign in, we use Supabase (hosted database and authentication) under project infrastructure we operate.
            Cloud sync may store copies of animals and related care schedules you choose to sync, associated with your
            account identifier. We use industry-standard transport encryption (HTTPS) between the app and Supabase.
          </p>
          <p>
            Authentication identifiers (such as email) and profile fields you provide are processed to run the service.
            Pro entitlement may be stored on your profile (for example an &quot;is Pro&quot; flag) to unlock paid-tier
            features.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">AI assistant (Pro) and OpenAI processing</h2>
          <p>
            Reptilita Pro can send parts of your question, optional structured context you select from the app (such as
            animal summaries, tasks, or journal excerpts), and optional conversation history to our Supabase Edge
            Function, which may call OpenAI or similar model providers to generate a reply. Server-side API credentials are
            never embedded in the app binary for that path.
          </p>
          <p>
            The free tier may use a simple on-device assistant that does not send your message to cloud AI. Do not paste
            secrets or passwords into any assistant.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Photos and vision (Pro)</h2>
          <p>
            If you attach a photo for analysis, a compressed image may be sent with your request to the Edge Function and
            model provider for that session only, to produce guidance. Profile or journal photos otherwise stay local
            unless you use a separate export or share feature.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Public sharing</h2>
          <p>
            Features that create a public link only transmit the data you explicitly publish. Revoking or not creating a
            link limits further exposure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Analytics and logging</h2>
          <p>
            We may collect limited technical logs (for example errors or sync status) needed to operate and secure the
            service. We do not sell your personal information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Your choices</h2>
          <p>
            You can stop cloud processing by signing out, disabling sync where applicable, or not using Pro AI features.
            Clearing local data in Settings removes on-device records but does not automatically erase cloud copies tied to
            your account; use the account deletion path described in Settings or email {REPTILITA_SUPPORT_EMAIL}.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Changes</h2>
          <p>
            We may update this policy as the product evolves. Material changes will be reflected by updating this page and
            the effective date above.
          </p>
        </section>

        <p className="text-xs pt-2 border-t border-border/70">
          This summary is for transparency and is not legal advice. For jurisdictional rights (access, correction, erasure),
          contact {REPTILITA_SUPPORT_EMAIL}.
        </p>
      </div>
    </PageMotion>
  );
}
