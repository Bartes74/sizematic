import { createClient } from "@/lib/supabase/server";
import { BodyMeasurementsForm } from "@/components/body-measurements-form";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MeasurementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!profile) {
    redirect('/');
  }

  // Get existing body measurements
  const { data: bodyMeasurements } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('profile_id', profile.id)
    .single();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium text-muted-foreground">Powrót do dashboardu</span>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Moje Wymiary</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Twój uniwersalny paszport rozmiarowy. Wprowadź swoje wymiary ciała w centymetrach -
            są one podstawą do sugerowania rozmiarów w różnych markach.
          </p>
        </div>

        <BodyMeasurementsForm
          profileId={profile.id}
          initialData={bodyMeasurements}
        />
      </main>
    </div>
  );
}
