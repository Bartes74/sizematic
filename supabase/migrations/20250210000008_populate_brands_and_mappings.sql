-- Migration: Populate brands and brand-garment type mappings
-- Adds all brands and maps them to appropriate garment types

-- First, insert all unique brands (sorted alphabetically)
insert into public.brands (name, slug) values
  ('&Other Stories', 'other-stories'),
  ('4F', '4f'),
  ('Acne Studios', 'acne-studios'),
  ('Adidas', 'adidas'),
  ('Apart', 'apart'),
  ('Apple', 'apple'),
  ('Arena', 'arena'),
  ('Armani Exchange', 'armani-exchange'),
  ('Banana Moon', 'banana-moon'),
  ('BAPE', 'bape'),
  ('Benetton', 'benetton'),
  ('Billabong', 'billabong'),
  ('Boux Avenue', 'boux-avenue'),
  ('Burberry', 'burberry'),
  ('Bytom', 'bytom'),
  ('Calzedonia', 'calzedonia'),
  ('Calvin Klein', 'calvin-klein'),
  ('Canada Goose', 'canada-goose'),
  ('Carhartt WIP', 'carhartt-wip'),
  ('Cartier', 'cartier'),
  ('Casio', 'casio'),
  ('Champion', 'champion'),
  ('Chantelle', 'chantelle'),
  ('Claire''s', 'claires'),
  ('Columbia', 'columbia'),
  ('COS', 'cos'),
  ('Diesel', 'diesel'),
  ('Dockers', 'dockers'),
  ('Emporio Armani', 'emporio-armani'),
  ('Etam', 'etam'),
  ('Eton', 'eton'),
  ('Falke', 'falke'),
  ('Fear of God Essentials', 'fear-of-god-essentials'),
  ('Fiore', 'fiore'),
  ('Fossil', 'fossil'),
  ('Gabriella', 'gabriella'),
  ('Gant', 'gant'),
  ('Garmin', 'garmin'),
  ('Gatta', 'gatta'),
  ('Golden Lady', 'golden-lady'),
  ('G-Star RAW', 'g-star-raw'),
  ('Guess', 'guess'),
  ('Gucci', 'gucci'),
  ('Gymshark', 'gymshark'),
  ('H&M', 'hm'),
  ('Hestra', 'hestra'),
  ('Hugo Boss', 'hugo-boss'),
  ('Hunkemöller', 'hunkemoller'),
  ('Intimissimi', 'intimissimi'),
  ('Kangol', 'kangol'),
  ('La Perla', 'la-perla'),
  ('Lacoste', 'lacoste'),
  ('Lee', 'lee'),
  ('Levi''s', 'levis'),
  ('Lilou', 'lilou'),
  ('Lululemon', 'lululemon'),
  ('Mango', 'mango'),
  ('Massimo Dutti', 'massimo-dutti'),
  ('Michael Kors', 'michael-kors'),
  ('Mohito', 'mohito'),
  ('Moncler', 'moncler'),
  ('New Balance', 'new-balance'),
  ('New Era', 'new-era'),
  ('Nike', 'nike'),
  ('Olymp', 'olymp'),
  ('Oroblu', 'oroblu'),
  ('Oysho', 'oysho'),
  ('Pandora', 'pandora'),
  ('Patagonia', 'patagonia'),
  ('Pepe Jeans', 'pepe-jeans'),
  ('Polo Ralph Lauren', 'polo-ralph-lauren'),
  ('Primark', 'primark'),
  ('Puma', 'puma'),
  ('Ralph Lauren', 'ralph-lauren'),
  ('Reebok', 'reebok'),
  ('Reserved', 'reserved'),
  ('Rolex', 'rolex'),
  ('Roxy', 'roxy'),
  ('Samsung', 'samsung'),
  ('Savage X Fenty', 'savage-x-fenty'),
  ('Seafolly', 'seafolly'),
  ('Seiko', 'seiko'),
  ('Sinsay', 'sinsay'),
  ('Speedo', 'speedo'),
  ('Stradivarius', 'stradivarius'),
  ('Stüssy', 'stussy'),
  ('SuitSupply', 'suitsupply'),
  ('Supreme', 'supreme'),
  ('Swatch', 'swatch'),
  ('Swarovski', 'swarovski'),
  ('Tezenis', 'tezenis'),
  ('The North Face', 'the-north-face'),
  ('Thomas Sabo', 'thomas-sabo'),
  ('Tiffany & Co.', 'tiffany-co'),
  ('Tissot', 'tissot'),
  ('Tommy Hilfiger', 'tommy-hilfiger'),
  ('Tous', 'tous'),
  ('Triangl', 'triangl'),
  ('Triumph', 'triumph'),
  ('Under Armour', 'under-armour'),
  ('Uniqlo', 'uniqlo'),
  ('Veneziana', 'veneziana'),
  ('Victoria''s Secret', 'victorias-secret'),
  ('Vistula', 'vistula'),
  ('W.KRUK', 'w-kruk'),
  ('Wolford', 'wolford'),
  ('Wrangler', 'wrangler'),
  ('YES', 'yes'),
  ('Zara', 'zara')
on conflict (slug) do nothing;

-- Now map brands to garment types
-- Helper function to insert mappings
do $$
declare
  v_brand_id uuid;
begin
  -- Jacket / Coat (kurtka, płaszcz, parka)
  for v_brand_id in
    select id from public.brands where slug in (
      'the-north-face', 'columbia', 'patagonia', 'canada-goose', 'moncler',
      'zara', 'hm', 'reserved', 'massimo-dutti', 'levis'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'jacket'),
      (v_brand_id, 'coat')
    on conflict do nothing;
  end loop;

  -- T-shirts
  for v_brand_id in
    select id from public.brands where slug in (
      'nike', 'adidas', 'hm', 'zara', 'uniqlo', 'levis', 'tommy-hilfiger',
      'ralph-lauren', 'hugo-boss', 'reserved'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'tshirt')
    on conflict do nothing;
  end loop;

  -- Hoodies
  for v_brand_id in
    select id from public.brands where slug in (
      'nike', 'adidas', 'champion', 'carhartt-wip', 'the-north-face', 'supreme',
      'stussy', 'fear-of-god-essentials', 'bape', 'uniqlo'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'hoodie')
    on conflict do nothing;
  end loop;

  -- Sweaters
  for v_brand_id in
    select id from public.brands where slug in (
      'hm', 'zara', 'massimo-dutti', 'uniqlo', 'cos', 'mango', 'ralph-lauren',
      'tommy-hilfiger', 'lacoste', 'benetton'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'sweater')
    on conflict do nothing;
  end loop;

  -- Formal Shirts
  for v_brand_id in
    select id from public.brands where slug in (
      'ralph-lauren', 'tommy-hilfiger', 'hugo-boss', 'massimo-dutti', 'zara',
      'hm', 'reserved', 'gant', 'eton', 'olymp'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'shirt_formal'),
      (v_brand_id, 'shirt_casual')
    on conflict do nothing;
  end loop;

  -- Blazers
  for v_brand_id in
    select id from public.brands where slug in (
      'hugo-boss', 'massimo-dutti', 'zara', 'hm', 'reserved', 'ralph-lauren',
      'tommy-hilfiger', 'mango', 'armani-exchange', 'suitsupply'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'blazer')
    on conflict do nothing;
  end loop;

  -- Jeans
  for v_brand_id in
    select id from public.brands where slug in (
      'levis', 'lee', 'wrangler', 'diesel', 'pepe-jeans', 'zara', 'hm',
      'massimo-dutti', 'dockers', 'g-star-raw'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'jeans')
    on conflict do nothing;
  end loop;

  -- Casual Pants
  for v_brand_id in
    select id from public.brands where slug in (
      'nike', 'adidas', 'puma', 'reebok', 'under-armour', 'gymshark', 'hm',
      'zara', 'uniqlo', 'lululemon', 'levis', 'lee', 'wrangler', 'diesel',
      'pepe-jeans', 'massimo-dutti', 'dockers', 'g-star-raw'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'pants_casual')
    on conflict do nothing;
  end loop;

  -- Formal Pants
  for v_brand_id in
    select id from public.brands where slug in (
      'hugo-boss', 'massimo-dutti', 'zara', 'hm', 'reserved', 'ralph-lauren',
      'tommy-hilfiger', 'armani-exchange', 'suitsupply', 'vistula', 'bytom'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'pants_formal')
    on conflict do nothing;
  end loop;

  -- Shorts
  for v_brand_id in
    select id from public.brands where slug in (
      'nike', 'adidas', 'puma', 'hm', 'zara', 'levis', 'reserved', 'uniqlo',
      'new-balance', 'under-armour'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'shorts')
    on conflict do nothing;
  end loop;

  -- Skirts
  for v_brand_id in
    select id from public.brands where slug in (
      'zara', 'hm', 'mango', 'reserved', 'massimo-dutti', 'other-stories',
      'mohito', 'stradivarius', 'guess', 'tommy-hilfiger'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'skirt')
    on conflict do nothing;
  end loop;

  -- Bras
  for v_brand_id in
    select id from public.brands where slug in (
      'victorias-secret', 'triumph', 'etam', 'intimissimi', 'hunkemoller',
      'calvin-klein', 'chantelle', 'la-perla', 'savage-x-fenty', 'boux-avenue',
      'calzedonia', 'oysho', 'hm', 'tezenis'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'bra')
    on conflict do nothing;
  end loop;

  -- Underwear
  for v_brand_id in
    select id from public.brands where slug in (
      'calvin-klein', 'intimissimi', 'hm', 'etam', 'emporio-armani',
      'tommy-hilfiger', 'reserved', 'uniqlo', 'victorias-secret',
      'polo-ralph-lauren', 'calzedonia', 'speedo', 'arena', 'oysho',
      'triumph', 'nike'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'underwear')
    on conflict do nothing;
  end loop;

  -- Socks (also rajstopy/pończochy)
  for v_brand_id in
    select id from public.brands where slug in (
      'calzedonia', 'gatta', 'fiore', 'wolford', 'veneziana', 'gabriella',
      'golden-lady', 'falke', 'hm', 'oroblu'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'socks')
    on conflict do nothing;
  end loop;

  -- Belts
  for v_brand_id in
    select id from public.brands where slug in (
      'levis', 'tommy-hilfiger', 'calvin-klein', 'hugo-boss', 'massimo-dutti',
      'zara', 'hm', 'reserved', 'ralph-lauren', 'gucci'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'belt')
    on conflict do nothing;
  end loop;

  -- Gloves
  for v_brand_id in
    select id from public.brands where slug in (
      'the-north-face', 'columbia', 'patagonia', 'moncler', 'canada-goose',
      'hestra', '4f', 'hm', 'zara', 'reserved'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'gloves')
    on conflict do nothing;
  end loop;

  -- Caps and Hats
  for v_brand_id in
    select id from public.brands where slug in (
      'new-era', 'the-north-face', 'columbia', 'carhartt-wip', 'kangol',
      'nike', 'adidas', 'hm', 'zara', 'reserved'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'cap'),
      (v_brand_id, 'hat')
    on conflict do nothing;
  end loop;

  -- Scarves
  for v_brand_id in
    select id from public.brands where slug in (
      'burberry', 'acne-studios', 'the-north-face', 'moncler', 'canada-goose',
      'hm', 'zara', 'reserved', 'massimo-dutti', '4f'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'scarf')
    on conflict do nothing;
  end loop;

  -- Rings
  for v_brand_id in
    select id from public.brands where slug in (
      'apart', 'w-kruk', 'yes', 'pandora', 'swarovski', 'tous', 'lilou',
      'tiffany-co', 'cartier', 'michael-kors'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'ring')
    on conflict do nothing;
  end loop;

  -- Bracelets
  for v_brand_id in
    select id from public.brands where slug in (
      'pandora', 'apart', 'w-kruk', 'yes', 'lilou', 'swarovski', 'tous',
      'michael-kors', 'thomas-sabo', 'tiffany-co'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'bracelet')
    on conflict do nothing;
  end loop;

  -- Necklaces
  for v_brand_id in
    select id from public.brands where slug in (
      'apart', 'w-kruk', 'yes', 'tiffany-co', 'swarovski', 'lilou', 'pandora',
      'tous', 'michael-kors', 'cartier'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'necklace')
    on conflict do nothing;
  end loop;

  -- Earrings
  for v_brand_id in
    select id from public.brands where slug in (
      'apart', 'w-kruk', 'yes', 'swarovski', 'pandora', 'tous', 'lilou',
      'guess', 'michael-kors', 'claires'
    )
  loop
    insert into public.brand_garment_types (brand_id, garment_type) values
      (v_brand_id, 'earrings')
    on conflict do nothing;
  end loop;

end $$;
