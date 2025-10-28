-- Add new garment types for underwear (using headwear category) and jewelry (in accessories)
alter type public.garment_type add value 'jewelry' after 'scarf';
alter type public.garment_type add value 'necklace' after 'jewelry';
alter type public.garment_type add value 'bracelet' after 'necklace';
alter type public.garment_type add value 'ring' after 'bracelet';
alter type public.garment_type add value 'earrings' after 'ring';

-- Note: headwear category will now be used for underwear
-- Types bra, underwear, socks already exist and will be mapped to headwear category
