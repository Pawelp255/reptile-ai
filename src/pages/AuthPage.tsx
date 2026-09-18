import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Dna, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { getAuthCallbackUrl, getPasswordResetRedirectUrl } from '@/lib/auth/authRedirectUrl';
import { toast } from 'sonner';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function parseAuthMode(value: string | null): AuthMode {
  if (value === 'sign-up' || value === 'forgot-password') return value;
  return 'sign-in';
}

const MODE_COPY: Record<AuthMode, { title: string; subtitle: string; submit: string }> = {
  'sign-in': {
    title: 'Sign in',
    subtitle: 'Welcome back to Reptilita',
    submit: 'Sign In',
  },
  'sign-up': {
    title: 'Create account',
    subtitle: 'Start syncing your collection across devices',
    submit: 'Create Account',
  },
  'forgot-password': {
    title: 'Forgot password',
    subtitle: 'We will email you a link to reset your password',
    submit: 'Send reset link',
  },
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = parseAuthMode(searchParams.get('mode'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/reset-password', { replace: true });
        return;
      }
      if (session) {
        navigate('/today', { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      // Recovery links can establish a session before PASSWORD_RECOVERY fires.
      const urlBlob = `${window.location.hash}${window.location.search}`;
      if (/type=recovery/i.test(urlBlob)) {
        navigate('/auth/reset-password', { replace: true });
        return;
      }
      navigate('/today', { replace: true });
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const setMode = (next: AuthMode) => {
    if (next === 'sign-in') {
      setSearchParams({});
    } else {
      setSearchParams({ mode: next });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast.error('Account features are unavailable until Supabase is configured.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: getPasswordResetRedirectUrl(),
        });
        if (error) throw error;
        toast.success('Check your email for a password reset link.');
        setMode('sign-in');
        return;
      }

      if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: getAuthCallbackUrl() },
        });
        if (error) throw error;
        if (data.session) {
          toast.success('Account created!');
          navigate('/today', { replace: true });
        } else {
          toast.success('Check your email to confirm your account, then sign in here.');
          setMode('sign-in');
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success('Welcome back!');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    if (!supabase) {
      toast.error('Account features are unavailable until Supabase is configured.');
      return;
    }
    setSocialLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthCallbackUrl(),
        },
      });

      if (error) toast.error(error.message || `Sign in with ${provider} failed`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, `Sign in with ${provider} failed`));
    } finally {
      setSocialLoading(null);
    }
  };

  const copy = MODE_COPY[mode];
  const showPasswordField = mode !== 'forgot-password';
  const showSocial = mode === 'sign-in' || mode === 'sign-up';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Dna className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
          {!isSupabaseConfigured && (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Account sign-in is unavailable in this build. Local animal tracking still works on this device.
            </p>
          )}
        </div>

        {mode !== 'sign-in' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-mt-2 text-muted-foreground"
            onClick={() => setMode('sign-in')}
          >
            <ArrowLeft className="w-4 h-4 mr-1" aria-hidden />
            Back to sign in
          </Button>
        )}

        {showSocial && (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 text-sm font-medium"
              onClick={() => handleSocialLogin('google')}
              disabled={!isSupabaseConfigured || !!socialLoading}
            >
              {socialLoading === 'google' ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 text-sm font-medium"
              onClick={() => handleSocialLogin('apple')}
              disabled={!isSupabaseConfigured || !!socialLoading}
            >
              {socialLoading === 'apple' ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </>
              )}
            </Button>
          </div>
        )}

        {showSocial && (
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
              or
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {showPasswordField && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Password</Label>
                {mode === 'sign-in' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  required
                  minLength={6}
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full h-11" disabled={!isSupabaseConfigured || loading}>
            {loading ? 'Please wait…' : copy.submit}
          </Button>
        </form>

        {mode === 'sign-in' && (
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('sign-up')}
              className="text-primary font-medium hover:underline"
            >
              Create account
            </button>
          </p>
        )}

        {mode === 'sign-up' && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </button>
          </p>
        )}

        <nav
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 pt-4 border-t border-border/60 text-center"
          aria-label="Legal"
        >
          <Link
            to="/privacy"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline py-3 px-2 -mx-2 min-h-[44px] inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline py-3 px-2 -mx-2 min-h-[44px] inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Terms of Service
          </Link>
        </nav>
      </div>
    </div>
  );
}
