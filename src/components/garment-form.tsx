'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Brand, Category, GarmentType } from '@/lib/types';

type BrandMapping = {
  brand_id: string;
  garment_type: GarmentType;
};

type GarmentFormProps = {
  profileId: string;
  category: Category;
  brands: Brand[];
  brandMappings: BrandMapping[];
};

type GarmentTypeOption = {
  id: GarmentType;
  name: string;
  description: string;
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

const FIT_TYPES = ['Slim Fit', 'Tapered Fit', 'Regular Fit', 'Classic Fit'];

// Function to filter brands based on garment type using database mappings
function filterBrandsForGarmentType(
  brands: Brand[],
  garmentType: GarmentType | '',
  brandMappings: BrandMapping[]
): Brand[] {
  if (!garmentType) return brands;

  // Get brand IDs that are mapped to this garment type
  const mappedBrandIds = new Set(
    brandMappings
      .filter(mapping => mapping.garment_type === garmentType)
      .map(mapping => mapping.brand_id)
  );

  // Filter brands to only those that are mapped to this garment type
  const filtered = brands.filter(brand => mappedBrandIds.has(brand.id));

  // If no brands match the filter, return all brands to avoid empty dropdown
  return filtered.length > 0 ? filtered : brands;
}

export function GarmentForm({ profileId, category, brands, brandMappings }: GarmentFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [garmentType, setGarmentType] = useState<GarmentType | ''>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [customBrandName, setCustomBrandName] = useState('');
  const [notes, setNotes] = useState('');

  // Filter brands based on selected garment type using database mappings
  const filteredBrands = useMemo(() => {
    return filterBrandsForGarmentType(brands, garmentType, brandMappings);
  }, [brands, garmentType, brandMappings]);

  // Size fields - different for each garment type
  const [genericSize, setGenericSize] = useState('');
  const [collarCm, setCollarCm] = useState('');
  const [fitType, setFitType] = useState('Regular Fit');
  const [waistInch, setWaistInch] = useState('');
  const [lengthInch, setLengthInch] = useState('');
  const [shoeEU, setShoeEU] = useState('');
  const [shoeUS, setShoeUS] = useState('');
  const [shoeUK, setShoeUK] = useState('');
  const [footLengthCm, setFootLengthCm] = useState('');
  // Ring-specific fields
  const [ringSizeMm, setRingSizeMm] = useState('');
  const [ringSide, setRingSide] = useState<'left' | 'right'>('left');
  const [ringBodyPart, setRingBodyPart] = useState<'hand' | 'foot'>('hand');
  const [ringFinger, setRingFinger] = useState<'thumb' | 'index' | 'middle' | 'ring' | 'pinky'>('ring');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!garmentType) {
        throw new Error('Proszę wybrać typ ubrania');
      }

      // Build size object based on garment type
      let size: any = {};

      if (garmentType === 'shirt_formal') {
        if (!collarCm || !fitType) {
          throw new Error('Proszę podać rozmiar kołnierzyka i krój');
        }
        size = {
          collar_cm: parseFloat(collarCm),
          fit_type: fitType,
        };
      } else if (garmentType === 'jeans') {
        if (!waistInch || !lengthInch) {
          throw new Error('Proszę podać rozmiar pasa i długość');
        }
        size = {
          waist_inch: parseFloat(waistInch),
          length_inch: parseFloat(lengthInch),
        };
      } else if (garmentType === 'sneakers' || garmentType === 'dress_shoes' || garmentType === 'boots' || garmentType === 'sandals') {
        if (!shoeEU && !shoeUS && !shoeUK) {
          throw new Error('Proszę podać rozmiar buta (EU, US lub UK)');
        }
        size = {
          size_eu: shoeEU ? parseFloat(shoeEU) : null,
          size_us: shoeUS ? parseFloat(shoeUS) : null,
          size_uk: shoeUK ? parseFloat(shoeUK) : null,
          foot_length_cm: footLengthCm ? parseFloat(footLengthCm) : null,
        };
      } else if (garmentType === 'ring') {
        // Ring with finger specification
        if (!ringSizeMm.trim()) {
          throw new Error('Proszę podać rozmiar pierścionka');
        }
        size = {
          size_mm: parseFloat(ringSizeMm),
          side: ringSide,
          body_part: ringBodyPart,
          finger: ringFinger,
        };
      } else {
        // Generic size (S/M/L/XL or numeric)
        if (!genericSize.trim()) {
          throw new Error('Proszę podać rozmiar');
        }
        size = {
          size: genericSize.trim(),
        };
      }

      const supabase = createClient();

      const garmentData = {
        profile_id: profileId,
        type: garmentType,
        category,
        size,
        brand_id: selectedBrandId || null,
        brand_name: selectedBrandId ? null : (customBrandName.trim() || null),
        notes: notes.trim() || null,
      };

      const { error: insertError } = await supabase
        .from('garments')
        .insert(garmentData);

      if (insertError) throw insertError;

      // Redirect back to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas zapisywania przedmiotu');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSizeFields = () => {
    if (!garmentType) return null;

    switch (garmentType) {
      case 'shirt_formal':
        return (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Rozmiar kołnierzyka (cm) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                value={collarCm}
                onChange={(e) => setCollarCm(e.target.value)}
                placeholder="np. 39, 40, 41"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Zmierz obwód szyi lub sprawdź metkę w koszuli
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Krój <span className="text-destructive">*</span>
              </label>
              <select
                value={fitType}
                onChange={(e) => setFitType(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {FIT_TYPES.map((fit) => (
                  <option key={fit} value={fit}>
                    {fit}
                  </option>
                ))}
              </select>
            </div>
          </>
        );

      case 'jeans':
        return (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Rozmiar pasa (cale) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="1"
                value={waistInch}
                onChange={(e) => setWaistInch(e.target.value)}
                placeholder="np. 30, 32, 34"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Długość (cale) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="1"
                value={lengthInch}
                onChange={(e) => setLengthInch(e.target.value)}
                placeholder="np. 30, 32, 34"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Rozmiar jeansów podawany jako np. 32/34 (pas/długość)
              </p>
            </div>
          </>
        );

      case 'sneakers':
      case 'dress_shoes':
      case 'boots':
      case 'sandals':
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Rozmiar EU
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={shoeEU}
                  onChange={(e) => setShoeEU(e.target.value)}
                  placeholder="np. 42"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Rozmiar US
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={shoeUS}
                  onChange={(e) => setShoeUS(e.target.value)}
                  placeholder="np. 9"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Rozmiar UK
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={shoeUK}
                  onChange={(e) => setShoeUK(e.target.value)}
                  placeholder="np. 8"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Długość stopy (cm) (opcjonalnie)
              </label>
              <input
                type="number"
                step="0.1"
                value={footLengthCm}
                onChange={(e) => setFootLengthCm(e.target.value)}
                placeholder="np. 26.5"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Podaj co najmniej jeden rozmiar (EU, US lub UK)
              </p>
            </div>
          </>
        );

      case 'ring':
        return (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Rozmiar (mm) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                value={ringSizeMm}
                onChange={(e) => setRingSizeMm(e.target.value)}
                placeholder="np. 16.5, 17.0, 18.5"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Średnica wewnętrzna pierścionka w milimetrach
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Strona <span className="text-destructive">*</span>
                </label>
                <select
                  value={ringSide}
                  onChange={(e) => setRingSide(e.target.value as 'left' | 'right')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="left">Lewa</option>
                  <option value="right">Prawa</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Część ciała <span className="text-destructive">*</span>
                </label>
                <select
                  value={ringBodyPart}
                  onChange={(e) => setRingBodyPart(e.target.value as 'hand' | 'foot')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="hand">Dłoń</option>
                  <option value="foot">Stopa</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Palec <span className="text-destructive">*</span>
              </label>
              <select
                value={ringFinger}
                onChange={(e) => setRingFinger(e.target.value as 'thumb' | 'index' | 'middle' | 'ring' | 'pinky')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="thumb">Kciuk</option>
                <option value="index">Wskazujący</option>
                <option value="middle">Środkowy</option>
                <option value="ring">Serdeczny</option>
                <option value="pinky">Mały</option>
              </select>
            </div>
          </>
        );

      default:
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Rozmiar <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={genericSize}
              onChange={(e) => setGenericSize(e.target.value)}
              placeholder="np. M, L, XL, 42, 48"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              Wpisz rozmiar dokładnie tak, jak widnieje na metce
            </p>
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="space-y-6">
          {/* Garment type selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Typ ubrania <span className="text-destructive">*</span>
            </label>
            <select
              value={garmentType}
              onChange={(e) => {
                setGarmentType(e.target.value as GarmentType);
                // Reset size fields when changing type
                setGenericSize('');
                setCollarCm('');
                setWaistInch('');
                setLengthInch('');
                setShoeEU('');
                setShoeUS('');
                setShoeUK('');
                setFootLengthCm('');
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Wybierz typ...</option>
              {GARMENT_TYPES[category].map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Brand selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Marka (opcjonalnie)
            </label>
            <select
              value={selectedBrandId}
              onChange={(e) => {
                setSelectedBrandId(e.target.value);
                if (e.target.value) {
                  setCustomBrandName('');
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={!garmentType}
            >
              <option value="">
                {!garmentType ? 'Najpierw wybierz typ ubrania' : 'Nie wybrano marki'}
              </option>
              {filteredBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            {garmentType && filteredBrands.length < brands.length && (
              <p className="text-xs text-muted-foreground mt-1">
                Pokazano marki popularne dla wybranego typu ubrania ({filteredBrands.length} z {brands.length})
              </p>
            )}

            {!selectedBrandId && (
              <div className="mt-3">
                <input
                  type="text"
                  value={customBrandName}
                  onChange={(e) => setCustomBrandName(e.target.value)}
                  placeholder="Lub wpisz nazwę marki (np. Zara, Reserved, Mango...)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
          </div>

          {/* Size fields - dynamic based on garment type */}
          {renderSizeFields()}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Notatki (opcjonalnie)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="np. 'Dobrze dopasowany', 'Trochę luźny', 'Idealny'..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Submit button */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Zapisywanie...' : 'Zapisz przedmiot'}
        </button>
      </div>
    </form>
  );
}
