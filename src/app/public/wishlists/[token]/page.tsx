import { notFound } from 'next/navigation';

import { PublicWishlistView } from '@/components/wishlists/public-wishlist-view';
import { getPublicWishlistPayload } from '@/server/wishlists-public';

export const dynamic = 'force-dynamic';

type PublicWishlistPageProps = {
  params: {
    token: string;
  };
};

export default async function PublicWishlistPage({ params }: PublicWishlistPageProps) {
  const { token } = params;
  const payload = await getPublicWishlistPayload(token);

  if (!payload) {
    notFound();
  }

  const { wishlist, items } = payload;

  const serializableItems = items.map((item) => ({
    id: item.id,
    product_name: item.product_name,
    product_brand: item.product_brand,
    image_url: item.image_url,
    category: item.category,
    url: item.url,
    price_snapshot: item.price_snapshot as Record<string, unknown> | null,
  }));

  return (
    <PublicWishlistView
      token={token}
      wishlistId={wishlist.id}
      title={wishlist.title}
      description={wishlist.description}
      items={serializableItems}
    />
  );
}

