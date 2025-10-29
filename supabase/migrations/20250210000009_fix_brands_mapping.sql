-- Najpierw dodaj kolumnę role jeśli nie istnieje
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role text NOT NULL DEFAULT 'free';
    
    -- Dodaj constraint na wartości
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('free', 'premium', 'premium_plus', 'admin'));
  END IF;
END $$;

-- Wyczyść wszystkie obecne mapowania
DELETE FROM public.brand_garment_types;

-- Teraz dodaj poprawne mapowania zgodnie z marki.md

-- Jackets & Coats (kurtka/płaszcz/parka)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'jacket' FROM public.brands b 
WHERE b.slug IN ('the-north-face', 'columbia', 'patagonia', 'canada-goose', 'moncler', 'zara', 'hm', 'reserved', 'massimo-dutti', 'levis')
ON CONFLICT DO NOTHING;

INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'coat' FROM public.brands b 
WHERE b.slug IN ('the-north-face', 'columbia', 'patagonia', 'canada-goose', 'moncler', 'zara', 'hm', 'reserved', 'massimo-dutti', 'levis')
ON CONFLICT DO NOTHING;

-- T-shirts (t-shirt/koszulka)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'tshirt' FROM public.brands b 
WHERE b.slug IN ('nike', 'adidas', 'hm', 'zara', 'uniqlo', 'levis', 'tommy-hilfiger', 'ralph-lauren', 'hugo-boss', 'reserved')
ON CONFLICT DO NOTHING;

-- Hoodies (bluza/bluza z kapturem)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'hoodie' FROM public.brands b 
WHERE b.slug IN ('nike', 'adidas', 'champion', 'carhartt-wip', 'the-north-face', 'supreme', 'stussy', 'fear-of-god-essentials', 'bape', 'uniqlo')
ON CONFLICT DO NOTHING;

-- Sweaters (sweter/kardigan)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'sweater' FROM public.brands b 
WHERE b.slug IN ('hm', 'zara', 'massimo-dutti', 'uniqlo', 'cos', 'mango', 'ralph-lauren', 'tommy-hilfiger', 'lacoste', 'benetton')
ON CONFLICT DO NOTHING;

-- Shirts (koszula z kołnierzykiem)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'shirt_formal' FROM public.brands b 
WHERE b.slug IN ('ralph-lauren', 'tommy-hilfiger', 'hugo-boss', 'massimo-dutti', 'zara', 'hm', 'reserved', 'gant', 'eton', 'olymp')
ON CONFLICT DO NOTHING;

INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'shirt_casual' FROM public.brands b 
WHERE b.slug IN ('ralph-lauren', 'tommy-hilfiger', 'hugo-boss', 'massimo-dutti', 'zara', 'hm', 'reserved', 'gant', 'eton', 'olymp')
ON CONFLICT DO NOTHING;

-- Blazers (marynarka/żakiet)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'blazer' FROM public.brands b 
WHERE b.slug IN ('hugo-boss', 'massimo-dutti', 'zara', 'hm', 'reserved', 'ralph-lauren', 'tommy-hilfiger', 'mango', 'armani-exchange', 'suitsupply')
ON CONFLICT DO NOTHING;

-- Jeans/Pants (jeansy/spodnie)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'jeans' FROM public.brands b 
WHERE b.slug IN ('levis', 'lee', 'wrangler', 'diesel', 'pepe-jeans', 'zara', 'hm', 'massimo-dutti', 'dockers', 'g-star-raw')
ON CONFLICT DO NOTHING;

INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'pants_casual' FROM public.brands b 
WHERE b.slug IN ('levis', 'lee', 'wrangler', 'diesel', 'pepe-jeans', 'zara', 'hm', 'massimo-dutti', 'dockers', 'g-star-raw')
ON CONFLICT DO NOTHING;

-- Athletic pants (spodnie dresowe/joggery/legginsy)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'pants_casual' FROM public.brands b 
WHERE b.slug IN ('nike', 'adidas', 'puma', 'reebok', 'under-armour', 'gymshark', 'hm', 'zara', 'uniqlo', 'lululemon')
ON CONFLICT DO NOTHING;

-- Shorts (shorty)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'shorts' FROM public.brands b 
WHERE b.slug IN ('nike', 'adidas', 'puma', 'hm', 'zara', 'levis', 'reserved', 'uniqlo', 'new-balance', 'under-armour')
ON CONFLICT DO NOTHING;

-- Skirts (spódnica)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'skirt' FROM public.brands b 
WHERE b.slug IN ('zara', 'hm', 'mango', 'reserved', 'massimo-dutti', 'other-stories', 'mohito', 'stradivarius', 'guess', 'tommy-hilfiger')
ON CONFLICT DO NOTHING;

-- Bras (biustonosz)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'bra' FROM public.brands b 
WHERE b.slug IN ('victorias-secret', 'triumph', 'etam', 'intimissimi', 'hunkemoller', 'calvin-klein', 'chantelle', 'la-perla', 'savage-x-fenty', 'boux-avenue')
ON CONFLICT DO NOTHING;

-- Underwear (majtki/bokserki)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'underwear' FROM public.brands b 
WHERE b.slug IN ('calvin-klein', 'intimissimi', 'hm', 'etam', 'emporio-armani', 'tommy-hilfiger', 'reserved', 'uniqlo', 'victorias-secret', 'polo-ralph-lauren')
ON CONFLICT DO NOTHING;

-- Tights/Stockings (rajstopy/pończochy) - używamy 'socks' jako najbliższy typ
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'socks' FROM public.brands b 
WHERE b.slug IN ('calzedonia', 'gatta', 'fiore', 'wolford', 'veneziana', 'gabriella', 'golden-lady', 'falke', 'hm', 'oroblu')
ON CONFLICT DO NOTHING;

-- Swimwear - bra dla górnych części
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'bra' FROM public.brands b 
WHERE b.slug IN ('calzedonia', 'victorias-secret', 'etam', 'oysho', 'hm', 'tezenis', 'roxy', 'billabong', 'banana-moon', 'triangl')
ON CONFLICT DO NOTHING;

-- Swimwear - underwear dla dolnych części i jednoczęściowych
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'underwear' FROM public.brands b 
WHERE b.slug IN ('calzedonia', 'speedo', 'arena', 'etam', 'hm', 'oysho', 'victorias-secret', 'triumph', 'seafolly', 'nike')
ON CONFLICT DO NOTHING;

-- Belt (pasek)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'belt' FROM public.brands b 
WHERE b.slug IN ('levis', 'tommy-hilfiger', 'calvin-klein', 'hugo-boss', 'massimo-dutti', 'zara', 'hm', 'reserved', 'ralph-lauren', 'gucci')
ON CONFLICT DO NOTHING;

-- Gloves (rękawiczki)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'gloves' FROM public.brands b 
WHERE b.slug IN ('the-north-face', 'columbia', 'patagonia', 'moncler', 'canada-goose', 'hestra', '4f', 'hm', 'zara', 'reserved')
ON CONFLICT DO NOTHING;

-- Hat/Cap (czapka/kapelusz)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'cap' FROM public.brands b 
WHERE b.slug IN ('new-era', 'the-north-face', 'columbia', 'carhartt-wip', 'kangol', 'nike', 'adidas', 'hm', 'zara', 'reserved')
ON CONFLICT DO NOTHING;

INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'hat' FROM public.brands b 
WHERE b.slug IN ('new-era', 'the-north-face', 'columbia', 'carhartt-wip', 'kangol', 'nike', 'adidas', 'hm', 'zara', 'reserved')
ON CONFLICT DO NOTHING;

-- Scarf (szalik)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'scarf' FROM public.brands b 
WHERE b.slug IN ('burberry', 'acne-studios', 'the-north-face', 'moncler', 'canada-goose', 'hm', 'zara', 'reserved', 'massimo-dutti', '4f')
ON CONFLICT DO NOTHING;

-- Ring (pierścionek)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'ring' FROM public.brands b 
WHERE b.slug IN ('apart', 'w-kruk', 'yes', 'pandora', 'swarovski', 'tous', 'lilou', 'tiffany-co', 'cartier', 'michael-kors')
ON CONFLICT DO NOTHING;

-- Bracelet (bransoletka)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'bracelet' FROM public.brands b 
WHERE b.slug IN ('pandora', 'apart', 'w-kruk', 'yes', 'lilou', 'swarovski', 'tous', 'michael-kors', 'thomas-sabo', 'tiffany-co')
ON CONFLICT DO NOTHING;

-- Necklace (naszyjnik)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'necklace' FROM public.brands b 
WHERE b.slug IN ('apart', 'w-kruk', 'yes', 'tiffany-co', 'swarovski', 'lilou', 'pandora', 'tous', 'michael-kors', 'cartier')
ON CONFLICT DO NOTHING;

-- Earrings (kolczyki)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'earrings' FROM public.brands b 
WHERE b.slug IN ('apart', 'w-kruk', 'yes', 'swarovski', 'pandora', 'tous', 'lilou', 'guess', 'michael-kors', 'claires')
ON CONFLICT DO NOTHING;

-- Jewelry general (zegarek/smartwatch) - używamy 'jewelry' jako ogólny typ
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'jewelry' FROM public.brands b 
WHERE b.slug IN ('apple', 'samsung', 'garmin', 'casio', 'fossil', 'michael-kors', 'seiko', 'tissot', 'swatch', 'rolex')
ON CONFLICT DO NOTHING;

-- Dodaj też marki do dress/suit categories jeśli są używane (formal pants dla garniturów)
INSERT INTO public.brand_garment_types (brand_id, garment_type)
SELECT b.id, 'pants_formal' FROM public.brands b 
WHERE b.slug IN ('hugo-boss', 'suitsupply', 'vistula', 'bytom', 'massimo-dutti', 'zara', 'hm', 'reserved', 'armani-exchange', 'tommy-hilfiger')
ON CONFLICT DO NOTHING;

-- Pokaż statystyki
SELECT 
  garment_type,
  COUNT(*) as brands_count
FROM public.brand_garment_types
GROUP BY garment_type
ORDER BY garment_type;
