alter table public.wishlist_items
  add column if not exists category text;

comment on column public.wishlist_items.category is 'User-defined category bucket for wishlist item cards';

