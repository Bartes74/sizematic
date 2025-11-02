import { notFound } from 'next/navigation';

import { PublicWishlistItemView } from '@/components/wishlists/public-wishlist-item-view';
import { getPublicWishlistItemPayload, resolvePublicWishlistLink } from '@/server/wishlists-public';

export const dynamic = 'force-dynamic';

type PublicWishlistItemPageProps = {
  params: {
    token: string;
  };
};

export default async function PublicWishlistItemPage({ params }: PublicWishlistItemPageProps) {
  const { token } = params;
  const item = await getPublicWishlistItemPayload(token);

  if (!item) {
    notFound();
  }
  const link = await resolvePublicWishlistLink(token);

  if (!link) {
    notFound();
  }

  return (
    <PublicWishlistItemView
      token={token}
      wishlistId={link.wishlist_id}
      item={{
        id: item.id,
        product_name: item.product_name,
        product_brand: item.product_brand,
        image_url: item.image_url,
        category: item.category,
        url: item.url,
        price_snapshot: item.price_snapshot as Record<string, unknown> | null,
        notes: item.notes,
        parsed_at: item.parsed_at,
      }}
    />
  );
}

