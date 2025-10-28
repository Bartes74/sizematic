'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Garment, SizeLabel, Category, GarmentType } from '@/lib/types';

type SizesManagerProps = {
  garments: any[];
  sizeLabels: SizeLabel[];
};

type DisplayItem = {
  id: string;
  type: 'garment' | 'size_label';
  category: Category;
  garmentType?: GarmentType;
  displayText: string;
  garmentTypeName?: string;
  isFavorite: boolean;
};

const CATEGORY_NAMES: Record<Category, string> = {
  tops: 'Góra',
  bottoms: 'Dół',
  footwear: 'Buty',
  outerwear: 'Odzież wierzchnia',
  headwear: 'Bielizna',
  accessories: 'Akcesoria',
  kids: 'Dzieci',
};

// Mapping of garment types to Polish names
const GARMENT_TYPE_NAMES: Record<GarmentType, string> = {
  // Tops
  tshirt: 'Koszulka',
  shirt_casual: 'Koszula casualowa',
  shirt_formal: 'Koszula formalna',
  sweater: 'Sweter',
  hoodie: 'Bluza',
  blazer: 'Marynarka',
  jacket: 'Kurtka',
  coat: 'Płaszcz/Parka',
  // Bottoms
  jeans: 'Jeansy',
  pants_casual: 'Spodnie casualowe',
  pants_formal: 'Spodnie garniturowe',
  shorts: 'Szorty',
  skirt: 'Spódnica',
  // Footwear
  sneakers: 'Sneakersy',
  dress_shoes: 'Buty wizytowe',
  boots: 'Kozaki/Botki',
  sandals: 'Sandały',
  slippers: 'Kapcie',
  // Underwear (headwear category)
  bra: 'Biustonosz',
  underwear: 'Majtki',
  socks: 'Skarpety',
  // Accessories
  belt: 'Pasek',
  scarf: 'Szalik',
  gloves: 'Rękawiczki',
  cap: 'Czapka z daszkiem',
  hat: 'Kapelusz/Czapka',
  jewelry: 'Biżuteria (ogólna)',
  necklace: 'Naszyjnik',
  bracelet: 'Bransoletka',
  ring: 'Pierścionek',
  earrings: 'Kolczyki',
  // Other
  other: 'Inne',
};

function formatGarmentSize(garment: any): string {
  const size = garment.size as any;

  if (size.size) {
    return size.size;
  } else if (size.collar_cm) {
    return `${size.collar_cm}cm ${size.fit_type}`;
  } else if (size.waist_inch) {
    return `${size.waist_inch}/${size.length_inch}`;
  } else if (size.size_eu) {
    return `EU ${size.size_eu}`;
  } else if (size.size_mm) {
    // Ring
    const sideLabel = size.side === 'left' ? 'L' : 'P';
    const partLabel = size.body_part === 'hand' ? 'dł' : 'st';
    const fingerLabels: Record<string, string> = {
      thumb: 'kciuk',
      index: 'wskazuj.',
      middle: 'środ.',
      ring: 'serdecz.',
      pinky: 'mały'
    };
    const fingerLabel = fingerLabels[size.finger] || size.finger;
    return `${size.size_mm}mm (${sideLabel} ${partLabel}, ${fingerLabel})`;
  }

  return 'N/A';
}

export function SizesManager({ garments, sizeLabels }: SizesManagerProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert garments and size labels to display items
  const allItems: DisplayItem[] = [
    ...garments.map((g) => ({
      id: g.id,
      type: 'garment' as const,
      category: g.category,
      garmentType: g.type,
      displayText: `${formatGarmentSize(g)}${g.brands?.name || g.brand_name ? ` (${g.brands?.name || g.brand_name})` : ''}`,
      garmentTypeName: g.type ? GARMENT_TYPE_NAMES[g.type as GarmentType] : undefined,
      isFavorite: g.is_favorite || false,
    })),
    ...sizeLabels.map((sl) => ({
      id: sl.id,
      type: 'size_label' as const,
      category: sl.category,
      displayText: `${sl.label}${sl.brand_name ? ` (${sl.brand_name})` : ''}`,
      isFavorite: false, // Size labels don't have favorites yet
    })),
  ];

  // Group by category
  const itemsByCategory = allItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<Category, DisplayItem[]>);

  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(allItems.filter((item) => item.isFavorite).map((item) => item.id))
  );

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        if (newFavorites.size >= 6) {
          setError('Możesz wybrać maksymalnie 6 ulubionych rozmiarów');
          return prev;
        }
        newFavorites.add(id);
      }
      setError(null);
      return newFavorites;
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Update garments
      const garmentIds = allItems
        .filter((item) => item.type === 'garment')
        .map((item) => item.id);

      for (const id of garmentIds) {
        const isFavorite = favorites.has(id);
        const { error: updateError } = await supabase
          .from('garments')
          .update({ is_favorite: isFavorite })
          .eq('id', id);

        if (updateError) throw updateError;
      }

      // Redirect back to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas zapisywania');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info box */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">
              Wybrane rozmiary: {favorites.size}/6
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Zaznacz rozmiary, które chcesz mieć w szybkim podglądzie na stronie głównej
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* List by category */}
      <div className="space-y-6">
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <div key={category} className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {CATEGORY_NAMES[category as Category]}
            </h3>

            <div className="space-y-3">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak rozmiarów w tej kategorii</p>
              ) : (
                items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={favorites.has(item.id)}
                      onChange={() => toggleFavorite(item.id)}
                      disabled={item.type === 'size_label'} // Size labels can't be favorited yet
                      className="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.displayText}</p>
                      {item.type === 'size_label' ? (
                        <p className="text-xs text-muted-foreground">Szybki rozmiar z metki</p>
                      ) : item.garmentTypeName ? (
                        <p className="text-xs text-muted-foreground">{item.garmentTypeName}</p>
                      ) : null}
                    </div>
                    {favorites.has(item.id) && (
                      <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </button>
      </div>
    </div>
  );
}
