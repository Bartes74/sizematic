import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileRow = {
  id: string;
  email: string | null;
};

export async function getProfileForUser(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Nie udało się pobrać profilu użytkownika: ${error.message}`);
  }

  if (!data) {
    throw new Error("Profil użytkownika nie istnieje. Upewnij się, że migracje i seedy zostały uruchomione.");
  }

  return data as ProfileRow;
}
