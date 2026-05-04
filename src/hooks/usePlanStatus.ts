import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { resolveSupabaseUrl } from '@/integrations/supabase/env';

export type PlanSource =
  | 'profile'
  | 'dev_override'
  | 'unsigned'
  | 'no_supabase'
  | 'profile_missing'
  | 'profile_error';

/**
 * Loads Pro entitlement from `profiles.is_pro` for the signed-in user.
 * `VITE_MOCK_PRO_USER=true` forces Pro UI locally (never reads backend).
 * `PRO_TEST_USER_IDS` is Edge-only — not used here.
 */
export function usePlanStatus(): {
  isPro: boolean;
  isLoadingPlan: boolean;
  source: PlanSource;
} {
  const { user, loading: authLoading } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [source, setSource] = useState<PlanSource>('profile_missing');
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  /** Bumps to refetch profile after login/token refresh / tab focus (see below). */
  const [fetchEpoch, setFetchEpoch] = useState(0);

  // Refetch plan when auth session changes (login, refresh) — user?.id alone may not change on TOKEN_REFRESHED.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED' ||
        event === 'SIGNED_OUT'
      ) {
        setFetchEpoch((e) => e + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Refetch when tab becomes visible again (e.g. user toggled is_pro in SQL while app backgrounded).
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const bump = () => {
      if (document.visibilityState === 'visible') {
        setFetchEpoch((e) => e + 1);
      }
    };
    document.addEventListener('visibilitychange', bump);
    return () => document.removeEventListener('visibilitychange', bump);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (import.meta.env.VITE_MOCK_PRO_USER === 'true') {
      setIsPro(true);
      setSource('dev_override');
      setIsLoadingPlan(false);
      if (import.meta.env.DEV) {
        console.warn('[usePlanStatus][debug]', {
          userId: user?.id ?? null,
          email: user?.email ?? null,
          profileRow: null,
          queryError: null,
          source: 'dev_override' as PlanSource,
          isPro: true,
          note: 'VITE_MOCK_PRO_USER forces Pro UI',
        });
      }
      return () => {
        cancelled = true;
      };
    }

    if (!isSupabaseConfigured || !supabase) {
      setIsPro(false);
      setSource('no_supabase');
      setIsLoadingPlan(false);
      if (import.meta.env.DEV) {
        console.warn('[usePlanStatus][debug]', {
          userId: user?.id ?? null,
          email: user?.email ?? null,
          profileRow: null,
          queryError: null,
          source: 'no_supabase' as PlanSource,
          isPro: false,
          note: 'Supabase env not configured in this build',
        });
      }
      return () => {
        cancelled = true;
      };
    }

    if (authLoading) {
      setIsLoadingPlan(true);
      return () => {
        cancelled = true;
      };
    }

    const uid = user?.id;
    if (!uid) {
      setIsPro(false);
      setSource('unsigned');
      setIsLoadingPlan(false);
      if (import.meta.env.DEV) {
        console.warn('[usePlanStatus][debug]', {
          userId: null,
          email: null,
          profileRow: null,
          queryError: null,
          source: 'unsigned' as PlanSource,
          isPro: false,
          note: 'No signed-in user',
        });
      }
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingPlan(true);

    void supabase
      .from('profiles')
      .select('is_pro')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;

        let nextSource: PlanSource;
        let nextPro = false;

        if (error) {
          console.warn('[usePlanStatus] profiles.is_pro query failed', error.message);
          nextSource = 'profile_error';
          nextPro = false;
        } else if (!data) {
          nextSource = 'profile_missing';
          nextPro = false;
        } else {
          nextSource = 'profile';
          nextPro = Boolean(data.is_pro);
        }

        if (import.meta.env.DEV) {
          console.warn('[usePlanStatus][debug]', {
            userId: uid,
            email: user?.email ?? null,
            profileRow: data ?? null,
            queryError: error?.message ?? null,
            fetchEpoch,
            source: nextSource,
            isPro: nextPro,
            supabaseHost: (() => {
              try {
                return new URL(resolveSupabaseUrl()).host;
              } catch {
                return '(invalid-url)';
              }
            })(),
          });
        }

        setIsPro(nextPro);
        setSource(nextSource);
        setIsLoadingPlan(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, authLoading, fetchEpoch]);

  return { isPro, isLoadingPlan, source };
}
