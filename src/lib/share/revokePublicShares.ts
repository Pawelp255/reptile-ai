import { supabase } from "@/integrations/supabase/client";

export async function revokePublicSharesForAnimal(reptileId: string): Promise<void> {
  if (!supabase) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return;

  const { error } = await supabase
    .from("public_share_records")
    .update({ revoked: true })
    .eq("user_id", user.id)
    .eq("reptile_id", reptileId)
    .eq("revoked", false);

  if (error) throw error;
}
