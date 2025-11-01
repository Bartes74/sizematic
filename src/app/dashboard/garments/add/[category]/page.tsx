import { createClient } from "@/lib/supabase/server";
import { GarmentForm } from "@/components/garment-form";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { BodyMeasurements, Category } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORY_NAMES: Record<Category, string> = {
  tops: 'Góra',
  bottoms: 'Dół',
  footwear: 'Buty',
  outerwear: 'Odzież wierzchnia',
  headwear: 'Bielizna',
  accessories: 'Akcesoria',
  kids: 'Dzieci',
};

export default async function AddGarmentByCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Validate category
  if (!Object.keys(CATEGORY_NAMES).includes(category)) {
    redirect('/dashboard/garments/add');
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

  // Get available brands
  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .order('name');

  // Get brand-garment-type mappings
  const { data: brandMappings } = await supabase
    .from('brand_garment_types')
    .select('brand_id, garment_type');

  const { data: bodyMeasurements } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/garments/add" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium text-muted-foreground">Powrót do kategorii</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {CATEGORY_NAMES[category as Category]}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dodaj przedmiot do swojej garderoby
          </p>
        </div>

        <GarmentForm
          profileId={profile.id}
          category={category as Category}
          brands={brands || []}
          brandMappings={brandMappings || []}
          bodyMeasurements={(bodyMeasurements as BodyMeasurements) || null}
        />
      </main>
    </div>
  );
}
