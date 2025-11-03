import { redirect } from "next/navigation";

import { GlobalHeader } from "@/components/global-header";
import { SiteFooter } from "@/components/site-footer";
import WishlistDashboard from "@/components/wishlists/wishlist-dashboard";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  BrandingSettings,
  UserRole,
  Wishlist,
  WishlistItem,
} from "@/lib/types";
import { slugifyTitle } from "@/server/wishlists";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
const DEFAULT_WISHLIST_TITLE = "Moja lista marzeń";

type PageSearchParams = {
  edit?: string | string[];
};

export default async function DashboardWishlistsPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const supabase = await createClient();
  const adminClient = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/dashboard/wishlists");
  }

  let userName = user.email?.split("@")[0] ?? null;
  let userRole: UserRole = "free";
  let avatarUrl: string | null = null;
  let branding: BrandingSettings = {
    site_name: "SizeHub",
    site_claim: "SizeSync",
    logo_url: null,
    logo_path: null,
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, avatar_url")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!profile) {
    throw new Error("Profil użytkownika nie istnieje dla zalogowanego konta.");
  }

  const profileId = profile.id;
  userName = profile.display_name ?? userName;
  userRole = profile.role as UserRole;
  avatarUrl = profile.avatar_url ?? null;

  const { data: brandingData } = await supabase
    .from("branding_settings")
    .select("site_name, site_claim, logo_url, logo_path")
    .maybeSingle();

  if (brandingData) {
    branding = {
      site_name: brandingData.site_name ?? branding.site_name,
      site_claim: brandingData.site_claim ?? branding.site_claim,
      logo_url: brandingData.logo_url ?? null,
      logo_path: brandingData.logo_path ?? null,
    };
  }

  const { data: wishlistsData, error: wishlistsError } = await supabase
    .from("wishlists")
    .select("id, title, description, status, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  if (wishlistsError) {
    console.error("Failed to fetch wishlists:", wishlistsError.message);
  }

  let wishlists = (wishlistsData ?? []) as Wishlist[];

  if (wishlists.length === 0) {
    const adminClient = createSupabaseAdminClient();
    const slugBase = slugifyTitle(DEFAULT_WISHLIST_TITLE) || "lista-marzen";
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    const { data: createdWishlist, error: createError } = await adminClient
      .from("wishlists")
      .insert({
        owner_id: user.id,
        owner_profile_id: profileId,
        title: DEFAULT_WISHLIST_TITLE,
        description: null,
        slug,
        status: "draft",
      })
      .select("id, title, description, status, created_at, updated_at")
      .single();

    if (createError) {
      console.error("Failed to bootstrap wishlist:", createError.message);
    } else if (createdWishlist) {
      wishlists = [createdWishlist as Wishlist];
    }
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const editParam = resolvedSearchParams?.edit;
  const editItemId = Array.isArray(editParam) ? editParam[0] : editParam ?? null;

  let editItem: WishlistItem | null = null;
  let activeWishlist: Wishlist | null = null;

  if (editItemId) {
    const { data: fetchedItem, error: fetchItemError } = await adminClient
      .from("wishlist_items")
      .select("*")
      .eq("id", editItemId)
      .maybeSingle();

    if (fetchItemError) {
      console.error("Failed to fetch wishlist item for editing:", fetchItemError.message);
    }

    if (fetchedItem) {
      const matchedWishlist = wishlists.find((entry) => entry.id === (fetchedItem as WishlistItem).wishlist_id) ?? null;
      if (matchedWishlist) {
        editItem = fetchedItem as WishlistItem;
        activeWishlist = matchedWishlist;
      }
    }
  }

  if (!activeWishlist) {
    activeWishlist = wishlists.length > 0 ? wishlists[0] : null;
  }

  let items: WishlistItem[] = [];
  let totalItems = 0;
  let hasMore = false;
  if (activeWishlist) {
    const { data: itemsData, count, error: itemsError } = await adminClient
      .from("wishlist_items")
      .select("*", { count: "exact" })
      .eq("wishlist_id", activeWishlist.id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (itemsError) {
      console.error("Failed to fetch wishlist items:", itemsError.message);
    }

    items = (itemsData ?? []) as WishlistItem[];
    totalItems = count ?? items.length;
    hasMore = items.length < totalItems;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-surface-elevated via-background to-background dark:from-[#08142a] dark:via-[#071225] dark:to-[#071225]" />
      <GlobalHeader
        userName={userName}
        role={userRole}
        avatarUrl={avatarUrl}
        branding={branding}
      />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12 sm:px-6">
        <WishlistDashboard
          initialWishlist={activeWishlist}
          allWishlists={wishlists}
          initialItems={items}
          initialTotal={totalItems}
          initialHasMore={hasMore}
          pageSize={PAGE_SIZE}
          editItem={editItem}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

