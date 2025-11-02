import { redirect } from "next/navigation";

import WishlistDashboard from "@/components/wishlists/wishlist-dashboard";
import { createClient } from "@/lib/supabase/server";
import type { Wishlist, WishlistItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardWishlistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/dashboard/wishlists");
  }

  const { data: wishlistsData, error: wishlistsError } = await supabase
    .from("wishlists")
    .select("id, title, description, status, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  if (wishlistsError) {
    console.error("Failed to fetch wishlists:", wishlistsError.message);
  }

const wishlists = (wishlistsData ?? []) as Wishlist[];
const activeWishlist = wishlists.length > 0 ? wishlists[0] : null;

const PAGE_SIZE = 12;

let items: WishlistItem[] = [];
let totalItems = 0;
let hasMore = false;
let categories: string[] = [];

if (activeWishlist) {
  const { data: itemsData, count, error: itemsError } = await supabase
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

  const { data: categoryRows, error: categoriesError } = await supabase
    .from("wishlist_items")
    .select("category")
    .eq("wishlist_id", activeWishlist.id)
    .not("category", "is", null);

  if (categoriesError) {
    console.error("Failed to fetch wishlist categories:", categoriesError.message);
  }

  categories = Array.from(
    new Set(
      (categoryRows ?? [])
        .map((row) => (typeof row.category === "string" ? row.category : null))
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b, "pl"));
}

return (
  <WishlistDashboard
    initialWishlist={activeWishlist}
    allWishlists={wishlists}
    initialItems={items}
    initialTotal={totalItems}
    initialHasMore={hasMore}
    initialCategories={categories}
    pageSize={PAGE_SIZE}
  />
);
}

