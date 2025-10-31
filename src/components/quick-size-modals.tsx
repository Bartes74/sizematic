'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PRODUCT_TYPE_MAP, QUICK_CATEGORY_CONFIGS, getQuickCategoryConfig } from '@/data/product-tree';
import type { QuickCategoryId } from '@/data/product-tree';
import type { Category } from '@/lib/types';
import type {
  Brand,
  DashboardSizePreference,
  SizeLabel,
} from '@/lib/types';

type QuickSizeModalProps = {
  categoryId: QuickCategoryId;
  initialProductTypeId: string | null;
  profileId: string;
  brands: Brand[];
  brandIdsByGarmentType: Map<string, Set<string>>;
  onClose: () => void;
  onSaved: () => void;
};

export function QuickSizeModal({
  categoryId,
  initialProductTypeId,
  profileId,
  brands,
  brandIdsByGarmentType,
  onClose,
  onSaved,
}: QuickSizeModalProps) {
  const supabase = createClient();
  const categoryConfig = getQuickCategoryConfig(categoryId);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [customBrandName, setCustomBrandName] = useState('');
  const [sizeLabel, setSizeLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultTypeId = categoryConfig.productTypes[0]?.id ?? null;
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<string | null>(
    initialProductTypeId ?? defaultTypeId
  );

  useEffect(() => {
    if (!selectedProductTypeId && categoryConfig.productTypes.length) {
      setSelectedProductTypeId(categoryConfig.productTypes[0].id);
    }
  }, [selectedProductTypeId, categoryConfig.productTypes]);

  const allowedBrandIds = useMemo(() => {
    if (!selectedProductTypeId) return null;
    const typeConfig = PRODUCT_TYPE_MAP[selectedProductTypeId];
    if (!typeConfig) return null;
    const union = new Set<string>();
    typeConfig.garmentTypes.forEach((garmentType) => {
      const ids = brandIdsByGarmentType.get(garmentType);
      if (ids) {
        ids.forEach((id) => union.add(id));
      }
    });
    return union.size ? union : null;
  }, [selectedProductTypeId, brandIdsByGarmentType]);

  const filteredBrands = useMemo(() => {
    if (!allowedBrandIds) return brands;
    return brands.filter((brand) => allowedBrandIds.has(brand.id));
  }, [allowedBrandIds, brands]);

  useEffect(() => {
    if (selectedBrandId && allowedBrandIds && !allowedBrandIds.has(selectedBrandId)) {
      setSelectedBrandId('');
    }
  }, [allowedBrandIds, selectedBrandId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!sizeLabel.trim()) {
      setError('Proszę wpisać rozmiar');
      return;
    }

    if (!selectedProductTypeId) {
      setError('Proszę wybrać typ produktu');
      return;
    }

    if (!selectedBrandId && !customBrandName.trim()) {
      setError('Proszę wybrać markę lub wpisać jej nazwę');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        profile_id: profileId,
        category: categoryConfig.supabaseCategories[0],
        label: sizeLabel.trim(),
        brand_id: selectedBrandId || null,
        brand_name: selectedBrandId ? null : customBrandName.trim() || null,
        notes: notes.trim() || null,
        source: 'label' as const,
        product_type: selectedProductTypeId,
      };

      const { error: insertError } = await supabase.from('size_labels').insert(payload);
      if (insertError) throw insertError;

      void fetch('/api/v1/missions/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'ITEM_CREATED',
          payload: {
            source: 'size_label',
            category: payload.category,
            subtype: payload.product_type ?? null,
            createdAt: new Date().toISOString(),
            fieldCount: 1,
            criticalFieldCompleted: true,
          },
        }),
      }).catch((eventError) => {
        console.error('Failed to emit mission event for size label:', eventError);
      });

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Nie udało się zapisać rozmiaru');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-foreground">Dodaj rozmiar — {categoryConfig.label}</h3>
        <p className="text-sm text-muted-foreground">
          Uzupełnij metkę, aby szybciej odnajdywać najważniejsze rozmiary w dashboardzie.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Typ produktu</label>
          <select
            value={selectedProductTypeId ?? ''}
            onChange={(event) => {
              const next = event.target.value || null;
              setSelectedProductTypeId(next);
              setSelectedBrandId('');
              setCustomBrandName('');
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#48A9A6] focus:outline-none focus:ring-2 focus:ring-[#48A9A6]/20"
          >
            {categoryConfig.productTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Marka</label>
          <select
            value={selectedBrandId}
            onChange={(event) => {
              setSelectedBrandId(event.target.value);
              if (event.target.value) {
                setCustomBrandName('');
              }
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#48A9A6] focus:outline-none focus:ring-2 focus:ring-[#48A9A6]/20"
          >
            <option value="">Wybierz markę lub wpisz poniżej...</option>
            {filteredBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          {!selectedBrandId && (
            <input
              type="text"
              value={customBrandName}
              onChange={(event) => setCustomBrandName(event.target.value)}
              placeholder="np. Zara, Reserved, Mango..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#48A9A6] focus:outline-none focus:ring-2 focus:ring-[#48A9A6]/20"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Rozmiar</label>
          <input
            type="text"
            value={sizeLabel}
            onChange={(event) => setSizeLabel(event.target.value)}
            placeholder="np. M, L, 42, 38/32, 42.5"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#48A9A6] focus:outline-none focus:ring-2 focus:ring-[#48A9A6]/20"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Notatki (opcjonalnie)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="np. 'Idealne dopasowanie', 'Luźniejsze w ramionach'..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#48A9A6] focus:outline-none focus:ring-2 focus:ring-[#48A9A6]/20"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-[#48A9A6]"
          disabled={isLoading}
        >
          Anuluj
        </button>
        <button
          type="submit"
          className="inline-flex items-center rounded-lg bg-[#48A9A6] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#3f9792]"
          disabled={isLoading}
        >
          {isLoading ? 'Zapisywanie...' : 'Zapisz rozmiar'}
        </button>
      </div>
    </form>
  );
}

type QuickSizePreferencesModalProps = {
  profileId: string;
  sizeLabels: SizeLabel[];
  sizePreferences: DashboardSizePreference[];
  onClose: () => void;
  onSaved: () => void;
};

export function QuickSizePreferencesModal({
  profileId,
  sizeLabels,
  sizePreferences,
  onClose,
  onSaved,
}: QuickSizePreferencesModalProps) {
  const supabase = createClient();
  const [selectedCategory, setSelectedCategory] = useState<QuickCategoryId>('outerwear');
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = QUICK_CATEGORY_CONFIGS;

  const sizeOptionsByCategory = useMemo(() => {
    const map = new Map<string, SizeLabel[]>();
    categories.forEach((category) => {
      const labels = sizeLabels.filter((label) =>
        category.supabaseCategories.includes(label.category as Category)
      );
      map.set(category.id, labels);
    });
    return map;
  }, [categories, sizeLabels]);

  useEffect(() => {
    const preference = sizePreferences.find(
      (pref) => pref.quick_category === selectedCategory
    );

    setSelectedProductType(preference?.product_type ?? null);
    setSelectedSize(preference?.size_label_id ?? null);
  }, [selectedCategory, sizePreferences]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const updatePayload = {
        profile_id: profileId,
        quick_category: selectedCategory,
        product_type: selectedProductType,
        size_label_id: selectedSize,
      };

      const { error: upsertError } = await supabase
        .from('dashboard_size_preferences')
        .upsert(updatePayload, { onConflict: 'profile_id,quick_category' });

      if (upsertError) throw upsertError;

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Nie udało się zapisać ustawień');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCategoryConfig = categories.find((c) => c.id === selectedCategory)!;
  const labelsForCategory = sizeOptionsByCategory.get(selectedCategory) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground">Konfiguruj skróty rozmiarów</h3>
        <p className="text-sm text-muted-foreground">
          Wybierz produkt i metkę, która ma pojawiać się na kafelku na dashboardzie.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Kategoria</h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-2xl border px-4 py-2 text-left text-sm transition ${
                  category.id === selectedCategory
                    ? 'border-[#48A9A6] bg-[#48A9A6]/10 text-[#256c69]'
                    : 'border-border bg-background hover:border-[#48A9A6]/40'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Typ produktu</h4>
          <div className="space-y-2">
            {selectedCategoryConfig.productTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedProductType(type.id)}
                className={`block w-full rounded-xl border px-4 py-2 text-left text-sm transition ${
                  selectedProductType === type.id
                    ? 'border-[#48A9A6] bg-[#48A9A6]/10 text-[#256c69]'
                    : 'border-border bg-background hover:border-[#48A9A6]/40'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Metka rozmiaru</h4>
          <div className="space-y-2">
            {labelsForCategory.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Dodaj najpierw metkę w tej kategorii, aby przypisać skrót.
              </p>
            ) : (
              labelsForCategory.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => setSelectedSize(label.id)}
                  className={`flex w-full items-start justify-between rounded-xl border px-4 py-2 text-left text-sm transition ${
                    selectedSize === label.id
                      ? 'border-[#48A9A6] bg-[#48A9A6]/10 text-[#256c69]'
                      : 'border-border bg-background hover:border-[#48A9A6]/40'
                  }`}
                >
                  <span>
                    <span className="block font-semibold text-foreground">{label.label}</span>
                    {label.brand_name ? (
                      <span className="block text-xs text-muted-foreground">{label.brand_name}</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {label.product_type ? PRODUCT_TYPE_MAP[label.product_type]?.label : 'Ogólny'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-[#48A9A6]"
          disabled={isSaving}
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center rounded-lg bg-[#48A9A6] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#3f9792]"
          disabled={isSaving}
        >
          {isSaving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
        </button>
      </div>
    </div>
  );
}
