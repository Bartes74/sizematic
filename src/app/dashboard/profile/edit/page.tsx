import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, email')
    .eq('owner_id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium text-muted-foreground">Powrót do dashboardu</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Edytuj profil</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Zarządzaj swoimi danymi osobowymi i ustawieniami konta
          </p>
        </div>

        <ProfileEditForm
          initialData={{
            displayName: profile?.display_name || '',
            email: profile?.email || user.email || '',
            avatarUrl: profile?.avatar_url || null
          }}
        />
      </main>
    </div>
  );
}
