import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminUsersTable } from "@/components/admin-users-table";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Get current user's profile to check if they're admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('owner_id', user.id)
    .single();

  // Only admins can access this page
  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  // Get all users with their profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, email, role, created_at, owner_id')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Panel Administratora</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Zarządzaj użytkownikami i ich rolami w systemie
          </p>
        </div>

        <AdminUsersTable users={profiles || []} />
      </main>
    </div>
  );
}
