'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Category, GarmentType, SizeLabel } from '@/lib/types';
import { PRODUCT_TYPES, type ProductTypeDefinition } from '@/data/product-tree';

type GarmentInput = {
  id: string;
  category: Category;
  type: GarmentType;
  size: Record<string, unknown> | null;
  brands?: { name: string | null } | null;
  brand_name?: string | null;
  is_favorite?: boolean;
};

type SizesManagerProps = {
  garments: GarmentInput[];
  sizeLabels: SizeLabel[];
};

type DisplayItem = {
  id: string;
  type: 'garment' | 'size_label';
  category: Category;
  productTypeId?: string;
  productTypeLabel?: string;
  displayText: string;
  subtitle?: string;
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

const CATEGORY_ORDER: Category[] = ['tops', 'bottoms', 'footwear', 'outerwear', 'headwear', 'accessories', 'kids'];

const PRODUCT_TYPE_DEFINITION_MAP = PRODUCT_TYPES.reduce<Record<string, ProductTypeDefinition>>((acc, definition) => {
  acc[definition.id] = definition;
  return acc;
}, {});

function normalizeValues(size: Record<string, unknown> | null) {
  if (!size || typeof size !== 'object') {
    return null;
  }
  if (!('values' in size)) {
    return null;
  }
  return {
    values: (size.values ?? {}) as Record<string, number | string | null | undefined>,
    labels: (size.labels ?? {}) as Record<string, string>,
    units: (size.units ?? {}) as Record<string, string>,
  };
}

function resolveProductTypeId(garment: GarmentInput): string | null {
  const rawSize = garment.size as Record<string, unknown> | null;
  const idFromSize = typeof rawSize?.product_type_id === 'string' ? (rawSize.product_type_id as string) : null;
  if (idFromSize) {
    return idFromSize;
  }

  const fallback = PRODUCT_TYPES.find(
    (definition) =>
      definition.garmentTypes.includes(garment.type) &&
      definition.supabaseCategories.includes(garment.category)
  );

  return fallback?.id ?? null;
}

function formatGarmentSize(garment: GarmentInput): string {
  const normalized = normalizeValues(garment.size);
  if (normalized) {
    const { values, labels, units } = normalized;
    if (values.size_label) {
      return String(values.size_label);
    }
    const entries = Object.entries(values).filter(([, value]) => value !== null && value !== undefined && value !== '');
    if (entries.length > 0) {
      const fragments = entries.slice(0, 2).map(([key, value]) => {
        const label = labels[key] ?? key;
        const unit = units[key];
        return `${label}: ${value}${unit ? ` ${unit}` : ''}`;
      });
      return fragments.join(' · ');
    }
  }

  const legacySize = garment.size as any;
  if (legacySize?.size) {
    return String(legacySize.size);
  }
  if (legacySize?.collar_cm) {
    return `${legacySize.collar_cm}cm ${legacySize.fit_type ?? ''}`.trim();
  }
  if (legacySize?.waist_inch) {
    const length = legacySize.length_inch ? `/${legacySize.length_inch}` : '';
    return `${legacySize.waist_inch}${length}`;
  }
  if (legacySize?.size_eu) {
    return `EU ${legacySize.size_eu}`;
  }
  if (legacySize?.size_mm) {
    const sideLabel = legacySize.side === 'left' ? 'L' : 'P';
    const partLabel = legacySize.body_part === 'hand' ? 'dłoń' : 'stopa';
    return `${legacySize.size_mm} mm (${sideLabel} ${partLabel})`;
  }

  return 'Brak danych';
}

export function SizesManager({ garments, sizeLabels }: SizesManagerProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const garmentItems: DisplayItem[] = garments.map((garment) => {
    const productTypeId = resolveProductTypeId(garment);
    const definition = productTypeId ? PRODUCT_TYPE_DEFINITION_MAP[productTypeId] : undefined;
    const sizeLabel = formatGarmentSize(garment);
    const brandName = garment.brands?.name || garment.brand_name || undefined;

    return {
      id: garment.id,
      type: 'garment',
      category: garment.category,
      productTypeId: productTypeId ?? undefined,
      productTypeLabel: definition?.label,
      displayText: sizeLabel,
      subtitle: brandName ?? undefined,
      isFavorite: garment.is_favorite ?? false,
    };
  });

  const sizeLabelItems: DisplayItem[] = sizeLabels.map((label) => ({
    id: label.id,
    type: 'size_label',
    category: label.category,
    displayText: label.brand_name ? `${label.label} (${label.brand_name})` : label.label,
    isFavorite: false,
  }));

  const allItems = [...garmentItems, ...sizeLabelItems];

  const itemsByCategory = allItems.reduce<Record<Category, DisplayItem[]>>((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<Category, DisplayItem[]>);

  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(garmentItems.filter((item) => item.isFavorite).map((item) => item.id))
  );

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 6) {
          setError('Możesz wybrać maksymalnie 6 ulubionych rozmiarów');
          return prev;
        }
        next.add(id);
      }
      setError(null);
      return next;
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      for (const item of garmentItems) {
        const isFavorite = favorites.has(item.id);
        const { error: updateError } = await supabase
          .from('garments')
          .update({ is_favorite: isFavorite })
          .eq('id', item.id);

        if (updateError) {
          throw updateError;
        }
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Wystąpił błąd podczas zapisywania');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">Zapisz do 6 ulubionych rozmiarów, aby szybciej je znaleźć.</p>
            <p className="mt-1 text-xs text-muted-foreground">Ulubione rozmiary pojawią się jako pierwsze w Twoim dashboardzie.</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-5">
        {CATEGORY_ORDER.map((category: Category) => {
          const items = itemsByCategory[category];
          if (!items || items.length === 0) {
            return null;
          }

          return (
            <section key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{CATEGORY_NAMES[category]}</h2>
                <Link
                  href={`/dashboard/garments/add/${category}`}
                  className="text-xs font-semibold text-primary transition hover:text-primary/80"
                >
                  Dodaj rozmiar
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.displayText}</p>
                      {item.productTypeLabel ? (
                        <p className="text-xs text-muted-foreground">{item.productTypeLabel}</p>
                      ) : null}
                      {item.subtitle ? (
                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      ) : null}
                    </div>

                    {item.type === 'garment' ? (
                      <button
                        type="button"
                        onClick={() => toggleFavorite(item.id)}
                        className={`ml-3 rounded-full p-2 transition ${
                          favorites.has(item.id)
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted/50'
                        }`}
                        aria-label={favorites.has(item.id) ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Zapisywanie…' : 'Zapisz ustawienia'}
        </button>
      </div>
    </div>
  );
}

