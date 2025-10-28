'use client';

import Link from 'next/link';
import type { Category, GarmentType } from '@/lib/types';

type Garment = {
  id: string;
  type: GarmentType;
  category: Category;
  size: any;
  brand_name?: string;
  brands?: { name: string };
  created_at: string;
};

type AllSizesViewProps = {
  garments: Garment[];
};

type GarmentTypeOption = {
  id: GarmentType;
  name: string;
  description: string;
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

const GARMENT_TYPES: Record<Category, GarmentTypeOption[]> = {
  tops: [
    { id: 'tshirt', name: 'Koszulka', description: 'T-shirt, koszulka polo' },
    { id: 'shirt_casual', name: 'Koszula casualowa', description: 'Koszula nieformalna' },
    { id: 'shirt_formal', name: 'Koszula formalna', description: 'Koszula biznesowa z kołnierzykiem' },
    { id: 'sweater', name: 'Sweter', description: 'Sweter, pulower' },
    { id: 'hoodie', name: 'Bluza', description: 'Bluza z kapturem lub bez' },
  ],
  bottoms: [
    { id: 'jeans', name: 'Jeansy', description: 'Dżinsy, spodnie jeansowe' },
    { id: 'pants_casual', name: 'Spodnie casualowe', description: 'Spodnie codzienne, chinosy' },
    { id: 'pants_formal', name: 'Spodnie garniturowe', description: 'Spodnie wizytowe' },
    { id: 'shorts', name: 'Szorty', description: 'Krótkie spodenki' },
    { id: 'skirt', name: 'Spódnica', description: 'Różne rodzaje spódnic' },
  ],
  footwear: [
    { id: 'sneakers', name: 'Sneakersy', description: 'Buty sportowe, tenisówki' },
    { id: 'dress_shoes', name: 'Buty wizytowe', description: 'Eleganckie obuwie' },
    { id: 'boots', name: 'Kozaki/Botki', description: 'Wysokie buty' },
    { id: 'sandals', name: 'Sandały', description: 'Otwarte obuwie' },
  ],
  outerwear: [
    { id: 'jacket', name: 'Kurtka', description: 'Kurtka przejściowa' },
    { id: 'coat', name: 'Płaszcz/Parka', description: 'Płaszcz zimowy, jesienny lub parka' },
    { id: 'blazer', name: 'Marynarka', description: 'Żakiet, marynarka garniturowa' },
  ],
  headwear: [
    { id: 'bra', name: 'Biustonosz', description: 'Stanik, biustonosz' },
    { id: 'underwear', name: 'Majtki', description: 'Bielizna dolna' },
    { id: 'socks', name: 'Skarpety', description: 'Skarpetki, podkolanówki' },
  ],
  accessories: [
    { id: 'belt', name: 'Pasek', description: 'Pasek do spodni' },
    { id: 'scarf', name: 'Szalik', description: 'Szal, szalik' },
    { id: 'gloves', name: 'Rękawiczki', description: 'Rękawice' },
    { id: 'cap', name: 'Czapka z daszkiem', description: 'Baseball cap' },
    { id: 'hat', name: 'Kapelusz/Czapka', description: 'Kapelusz, czapka zimowa, dziana' },
    { id: 'jewelry', name: 'Biżuteria (ogólna)', description: 'Różne rodzaje biżuterii' },
    { id: 'necklace', name: 'Naszyjnik', description: 'Naszyjniki, łańcuszki' },
    { id: 'bracelet', name: 'Bransoletka', description: 'Bransoletki na rękę' },
    { id: 'ring', name: 'Pierścionek', description: 'Pierścionki, obrączki' },
    { id: 'earrings', name: 'Kolczyki', description: 'Kolczyki, nausznice' },
  ],
  kids: [
    { id: 'tshirt', name: 'Koszulka dziecięca', description: 'T-shirt dla dzieci' },
    { id: 'pants_casual', name: 'Spodnie dziecięce', description: 'Spodnie dla dzieci' },
  ],
};

function formatGarmentSize(garment: Garment): string {
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

export function AllSizesView({ garments }: AllSizesViewProps) {
  // Group garments by category and type
  const garmentsByType = garments.reduce((acc, garment) => {
    const key = `${garment.category}:${garment.type}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(garment);
    return acc;
  }, {} as Record<string, Garment[]>);

  const categories: Category[] = ['tops', 'bottoms', 'footwear', 'outerwear', 'headwear', 'accessories', 'kids'];

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const types = GARMENT_TYPES[category];
        if (!types || types.length === 0) return null;

        return (
          <section key={category} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {CATEGORY_NAMES[category]}
              </h2>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {types.length} {types.length === 1 ? 'typ' : 'typów'}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {types.map((type) => {
                const key = `${category}:${type.id}`;
                const typeGarments = garmentsByType[key] || [];
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
                      {/* Type header */}
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{type.name}</h3>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>

                      {/* Garments list or empty state */}
                      {hasGarments ? (
                        <div className="space-y-2">
                          {typeGarments.map((garment) => {
                            const sizeStr = formatGarmentSize(garment);
                            const brandName = garment.brands?.name || garment.brand_name;

                            return (
                              <div
                                key={garment.id}
                                className="rounded-lg border border-border bg-background p-3"
                              >
                                <p className="text-sm font-medium text-primary">
                                  {sizeStr}
                                </p>
                                {brandName && (
                                  <p className="text-xs text-muted-foreground">{brandName}</p>
                                )}
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
