import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MissionDirectory from "@/components/missions/mission-directory";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, locale")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/");
  }

  return <MissionDirectory locale={(profile.locale ?? "pl") as "pl" | "en"} />;
}
