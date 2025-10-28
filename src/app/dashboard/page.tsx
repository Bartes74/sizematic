import { HomePage } from "@/components/home-page";
import { getMeasurementSummary, listMeasurements } from "@/server/measurements";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const measurements = await listMeasurements();
  const summary = await getMeasurementSummary();

  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user profile for role and display name
  let userName = user?.email?.split('@')[0] || null;
  let userRole: 'free' | 'premium' | 'premium_plus' = 'free';
  let avatarUrl: string | null = null;
  let garments: any[] = [];
  let sizeLabels: any[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, role, avatar_url')
      .eq('owner_id', user.id)
      .single();

    if (profile) {
      userName = profile.display_name || userName;
      userRole = profile.role === 'admin' ? 'premium_plus' : (profile.role as any);
      avatarUrl = profile.avatar_url || null;

      // Get garments (wardrobe items) with brand names
      const { data: garmentsData } = await supabase
        .from('garments')
        .select(`
          *,
          brands (
            name
          )
        `)
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      // Get size labels
      const { data: sizeLabelsData } = await supabase
        .from('size_labels')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      garments = garmentsData || [];
      sizeLabels = sizeLabelsData || [];
    }
  }

  return (
    <HomePage
      measurements={measurements}
      summary={summary}
      userName={userName}
      userRole={userRole}
      avatarUrl={avatarUrl}
      garments={garments}
      sizeLabels={sizeLabels}
    />
  );
}
