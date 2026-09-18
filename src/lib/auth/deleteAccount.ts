import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { resolveSupabaseUrl } from '@/integrations/supabase/env';

const FUNCTIONS_PATH = '/functions/v1/delete-account';

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; message: string; statusCode?: number };

export async function deleteAccountOnServer(confirmEmail: string): Promise<DeleteAccountResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Account features are unavailable until Supabase is configured.' };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, message: 'You must be signed in to delete your account.' };
  }

  const baseUrl = resolveSupabaseUrl().replace(/\/$/, '');
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!baseUrl || !key) {
    return { ok: false, message: 'Missing Supabase configuration.' };
  }

  try {
    const response = await fetch(`${baseUrl}${FUNCTIONS_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmEmail: confirmEmail.trim() }),
    });

    const detail = await response.text().catch(() => '');
    if (!response.ok) {
      let message = 'Could not delete account. Please try again.';
      try {
        const j = JSON.parse(detail) as { error?: string };
        if (typeof j.error === 'string' && j.error.trim()) message = j.error.trim();
      } catch {
        /* not JSON */
      }
      return { ok: false, message, statusCode: response.status };
    }

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error while deleting account.';
    return { ok: false, message };
  }
}
