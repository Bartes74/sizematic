'use client';

import Link from 'next/link';
import type { Category, GarmentType } from '@/lib/types';
import { PRODUCT_TYPES, type ProductTypeDefinition } from '@/data/product-tree';

type Garment = {
  id: string;
  type: GarmentType;
  category: Category;
  size: Record<string, unknown> | null;
  brand_name?: string | null;
  brands?: { name: string | null } | null;
  created_at: string;
};

type AllSizesViewProps = {
  garments: Garment[];
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

const PRODUCT_TYPES_BY_CATEGORY = CATEGORY_ORDER.reduce<Record<Category, ProductTypeDefinition[]>>(
  (acc, category) => {
    acc[category] = PRODUCT_TYPES.filter((type) => type.supabaseCategories.includes(category));
    return acc;
  },
  {} as Record<Category, ProductTypeDefinition[]>
);

const PRODUCT_TYPE_DEFINITION_MAP = PRODUCT_TYPES.reduce<Record<string, ProductTypeDefinition>>((acc, definition) => {
  acc[definition.id] = definition;
  return acc;
}, {});

function resolveProductTypeId(garment: Garment): string | null {
  const size = garment.size as Record<string, unknown> | null;
  const directId = typeof size?.product_type_id === 'string' ? (size.product_type_id as string) : null;
  if (directId) {
    return directId;
  }

  const fallback = PRODUCT_TYPES.find(
    (definition) =>
      definition.garmentTypes.includes(garment.type) &&
      definition.supabaseCategories.includes(garment.category)
  );

  return fallback?.id ?? null;
}

function formatGarmentSize(garment: Garment): string {
  const size = garment.size as Record<string, unknown> | null;

  if (size && typeof size === 'object' && 'values' in size) {
    const values = (size.values ?? {}) as Record<string, number | string | null | undefined>;
    const labels = (size.labels ?? {}) as Record<string, string>;
    const units = (size.units ?? {}) as Record<string, string>;

    if (values.size_label) {
      return String(values.size_label);
    }

    const entries = Object.entries(values).filter(([, value]) => value !== null && value !== '' && value !== undefined);
    if (entries.length > 0) {
      const formatted = entries.slice(0, 2).map(([key, value]) => {
        const label = labels[key] ?? key;
        const unit = units[key];
        return `${label}: ${value}${unit ? ` ${unit}` : ''}`;
      });
      return formatted.join(' · ');
    }
  }

  // Legacy structures fallback
  if (size?.size) {
    return String(size.size);
  }
  if (size?.collar_cm) {
    return `${size.collar_cm}cm ${size.fit_type ?? ''}`.trim();
  }
  if (size?.waist_inch) {
    const length = size.length_inch ? `/${size.length_inch}` : '';
    return `${size.waist_inch}${length}`;
  }
  if (size?.size_eu) {
    return `EU ${size.size_eu}`;
  }
  if (size?.size_mm) {
    const sideLabel = size.side === 'left' ? 'L' : 'P';
    const partLabel = size.body_part === 'hand' ? 'dłoń' : 'stopa';
    const fingerLabels: Record<string, string> = {
      thumb: 'kciuk',
      index: 'wskazujący',
      middle: 'środkowy',
      ring: 'serdeczny',
      pinky: 'mały',
    };
    const fingerLabel = fingerLabels[size.finger as string] ?? size.finger ?? '';
    return `${size.size_mm} mm (${sideLabel} ${partLabel}${fingerLabel ? `, ${fingerLabel}` : ''})`;
  }

  return 'Brak danych';
}

export function AllSizesView({ garments }: AllSizesViewProps) {
  const garmentsByProductType = garments.reduce<Record<string, Garment[]>>((acc, garment) => {
    const productTypeId = resolveProductTypeId(garment);
    if (!productTypeId) {
      return acc;
    }

    if (!acc[productTypeId]) {
      acc[productTypeId] = [];
    }
    acc[productTypeId].push(garment);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map((category) => {
        const productTypes = PRODUCT_TYPES_BY_CATEGORY[category] ?? [];
        if (productTypes.length === 0) {
          return null;
        }

        return (
          <section key={category} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {CATEGORY_NAMES[category]}
              </h2>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {productTypes.length} {productTypes.length === 1 ? 'typ' : 'typów'}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {productTypes.map((type) => {
                const typeGarments = garmentsByProductType[type.id] ?? [];
                const hasGarments = typeGarments.length > 0;

                return (
                  <div
                    key={type.id}
                    className={`rounded-2xl border p-6 transition-all ${
                      hasGarments
                        ? 'border-border bg-card shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10'
                        : 'border-dashed border-border bg-muted/10 hover:bg-muted/20'
                    }`}
                  >
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{type.label}</h3>
                        {type.category ? (
                          <p className="text-xs uppercase text-muted-foreground">{CATEGORY_NAMES[type.supabaseCategories[0] as Category] ?? ''}</p>
                        ) : null}
                      </div>

                      {hasGarments ? (
                        <div className="space-y-2">
                          {typeGarments.map((garment) => {
                            const sizeLabel = formatGarmentSize(garment);
                            const brandName = garment.brands?.name || garment.brand_name || undefined;

                            return (
                              <div key={garment.id} className="rounded-lg border border-border bg-background p-3">
                                <p className="text-sm font-medium text-primary">{sizeLabel}</p>
                                {brandName ? (
                                  <p className="text-xs text-muted-foreground">{brandName}</p>
                                ) : null}
                              </div>
                            );
                          })}
                          <Link
                            href={`/dashboard/garments/add/${category}`}
                            className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Dodaj kolejny
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={`/dashboard/garments/add/${category}`}
                          className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Dodaj rozmiar
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

