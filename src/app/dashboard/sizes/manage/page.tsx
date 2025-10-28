import { createClient } from "@/lib/supabase/server";
import { SizesManager } from "@/components/sizes-manager";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ManageSizesPage() {
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

  // Get garments with brand names
  const { data: garments } = await supabase
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
  const { data: sizeLabels } = await supabase
    .from('size_labels')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });

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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Zarządzaj rozmiarami</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Wybierz maksymalnie 6 rozmiarów, które będą wyświetlane w szybkim podglądzie na stronie głównej
          </p>
        </div>

        <SizesManager
          garments={garments || []}
          sizeLabels={sizeLabels || []}
        />
      </main>
    </div>
  );
}
