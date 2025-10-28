'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Brand, Category } from '@/lib/types';

type SizeLabelFormProps = {
  profileId: string;
  brands: Brand[];
};

const CATEGORIES = [
  { id: 'tops', name: 'Góra' },
  { id: 'bottoms', name: 'Dół' },
  { id: 'footwear', name: 'Buty' },
  { id: 'outerwear', name: 'Odzież wierzchnia' },
  { id: 'headwear', name: 'Bielizna' },
  { id: 'accessories', name: 'Akcesoria' },
  { id: 'kids', name: 'Dzieci' },
];

export function SizeLabelForm({ profileId, brands }: SizeLabelFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<Category>('tops');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [customBrandName, setCustomBrandName] = useState('');
  const [sizeLabel, setSizeLabel] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!sizeLabel.trim()) {
        throw new Error('Proszę wpisać rozmiar');
      }

      if (!selectedBrandId && !customBrandName.trim()) {
        throw new Error('Proszę wybrać markę lub wpisać jej nazwę');
      }

      const supabase = createClient();

      const sizeLabelData = {
        profile_id: profileId,
        category,
        label: sizeLabel.trim(),
        brand_id: selectedBrandId || null,
        brand_name: selectedBrandId ? null : customBrandName.trim(),
        notes: notes.trim() || null,
        source: 'label' as const,
      };

      const { error: insertError } = await supabase
        .from('size_labels')
        .insert(sizeLabelData);

      if (insertError) throw insertError;

      // Redirect back to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas zapisywania rozmiaru');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="space-y-6">
          {/* Category selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Kategoria <span className="text-destructive">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Marka <span className="text-destructive">*</span>
            </label>
            <select
              value={selectedBrandId}
              onChange={(e) => {
                setSelectedBrandId(e.target.value);
                if (e.target.value) {
                  setCustomBrandName(''); // Clear custom brand when selecting from list
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Wybierz markę lub wpisz poniżej...</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>

            {/* Custom brand name */}
            {!selectedBrandId && (
              <div className="mt-3">
                <label className="text-xs text-muted-foreground">
                  Lub wpisz nazwę marki
                </label>
                <input
                  type="text"
                  value={customBrandName}
                  onChange={(e) => setCustomBrandName(e.target.value)}
                  placeholder="np. Zara, Reserved, Mango..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
          </div>

          {/* Size label */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Rozmiar <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={sizeLabel}
              onChange={(e) => setSizeLabel(e.target.value)}
              placeholder="np. M, L, 42, 38/32, 42.5"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              Wpisz dokładnie taki rozmiar, jak widnieje na metce
            </p>
          </div>

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
          {isLoading ? 'Zapisywanie...' : 'Zapisz rozmiar'}
        </button>
      </div>
    </form>
  );
}
