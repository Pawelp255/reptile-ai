import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dna, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { applyAuthSessionFromCurrentUrl } from '@/lib/auth/authDeepLink';
import { toast } from 'sonner';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function AuthResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(!!session);
        setCheckingSession(false);
      }
    });

    void (async () => {
      await applyAuthSessionFromCurrentUrl(supabase);
      const { data: { session } } = await supabase.auth.getSession();
      setSessionReady(!!session);
      setCheckingSession(false);
    })();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast.error('Account features are unavailable until Supabase is configured.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated. You are signed in.');
      navigate('/today', { replace: true });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Could not update password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Dna className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a new password for your Reptilita account.
          </p>
        </div>

        {checkingSession ? (
          <p className="text-center text-sm text-muted-foreground animate-pulse">Loading…</p>
        ) : !sessionReady ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Open the reset link from your email while this app is installed, or request a new link from Sign In.
            </p>
            <Button asChild variant="default" className="w-full">
              <Link to="/auth">Back to Sign In</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={!isSupabaseConfigured || loading}>
              {loading ? 'Saving…' : 'Update password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
