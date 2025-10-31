import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMissionsWithState } from "@/lib/missions/queries";
import { mapMissionState } from "@/lib/missions/mapper";
import MissionDetail from "@/components/missions/mission-detail";

type MissionDetailPageProps = {
  params: { code: string };
};

export const dynamic = "force-dynamic";

export default async function MissionDetailPage({ params }: MissionDetailPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, locale")
    .eq("owner_id", user!.id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const code = params.code?.toUpperCase() ?? "";
  const locale = (profile.locale ?? "pl") as "pl" | "en";
  const missions = await getMissionsWithState(
    { profileId: profile.id, locale },
    supabase
  );
  const mission = missions.find((item) => item.code === code);

  if (!mission) {
    notFound();
  }

  const mapped = mapMissionState(mission, locale, new Date());

  return <MissionDetail mission={mapped} locale={locale} />;
}
