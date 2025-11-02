'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { BodyMeasurements, Brand, Category, GarmentType } from '@/lib/types';
import {
  PRODUCT_TYPES,
  PRODUCT_TYPE_CATEGORY_MAP,
  type ProductFieldDefinition,
  type ProductTypeDefinition,
  type QuickCategoryId,
} from '@/data/product-tree';
import {
  createBodyMeasurementUpdate,
  getBodyMeasurementDefinition,
  getBodyMeasurementValue,
} from '@/data/body-measurements';

type BrandMapping = {
  brand_id: string;
  garment_type: GarmentType;
};

type GarmentFormProps = {
  profileId: string;
  category: Category;
  brands: Brand[];
  brandMappings: BrandMapping[];
  bodyMeasurements: BodyMeasurements | null;
  initialProductTypeId?: string | null;
  extraQuickCategories?: QuickCategoryId[];
};

const CATEGORY_TO_QUICK: Record<Category, QuickCategoryId[]> = {
  tops: ['tops'],
  bottoms: ['bottoms'],
  footwear: ['footwear'],
  outerwear: ['outerwear'],
  headwear: ['lingerie'],
  accessories: ['accessories'],
  kids: ['tops'],
};

const QUICK_CATEGORY_LABEL: Record<QuickCategoryId, string> = {
  outerwear: 'Odzież wierzchnia',
  tops: 'Góra',
  bottoms: 'Dół',
  lingerie: 'Bielizna',
  jewelry: 'Biżuteria',
  accessories: 'Akcesoria',
  footwear: 'Buty',
};

function filterBrandsForGarmentType(
  brands: Brand[],
  garmentType: GarmentType | null,
  brandMappings: BrandMapping[]
): Brand[] {
  if (!garmentType) {
    return brands;
  }

  const mappedBrandIds = new Set(
    brandMappings
      .filter((mapping) => mapping.garment_type === garmentType)
      .map((mapping) => mapping.brand_id)
  );

  if (mappedBrandIds.size === 0) {
    return brands;
  }

  const filtered = brands.filter((brand) => mappedBrandIds.has(brand.id));
  return filtered.length > 0 ? filtered : brands;
}

function normalizeNumericValue(value: string): number {
  return parseFloat(value.replace(',', '.'));
}

function hasFilledValue(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

function getPrimaryGarmentType(definition: ProductTypeDefinition | null): GarmentType | null {
  return definition?.garmentTypes[0] ?? null;
}

export function GarmentForm({
  profileId,
  category,
  brands,
  brandMappings,
  bodyMeasurements,
  initialProductTypeId,
  extraQuickCategories = [],
}: GarmentFormProps) {
  const router = useRouter();
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<string>(
    () => initialProductTypeId ?? ''
  );
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [customBrandName, setCustomBrandName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const baseQuickCategories = useMemo<QuickCategoryId[]>(
    () => (extraQuickCategories.length > 0 ? extraQuickCategories : CATEGORY_TO_QUICK[category] ?? ['tops']),
    [category, extraQuickCategories]
  );

  const allowedQuickCategories = useMemo(() => {
    const categories = new Set<QuickCategoryId>(baseQuickCategories);
    extraQuickCategories.forEach((quickCategory) => {
      categories.add(quickCategory);
    });

    if (initialProductTypeId) {
      const initialCategory = PRODUCT_TYPE_CATEGORY_MAP[initialProductTypeId];
      if (initialCategory) {
        categories.add(initialCategory);
      }
    }

    if (selectedProductTypeId) {
      const selectedCategory = PRODUCT_TYPE_CATEGORY_MAP[selectedProductTypeId];
      if (selectedCategory) {
        categories.add(selectedCategory);
      }
    }

    return Array.from(categories);
  }, [baseQuickCategories, extraQuickCategories, initialProductTypeId, selectedProductTypeId]);

  const productTypeOptions = useMemo(() => {
    return PRODUCT_TYPES.filter((definition) => {
      if (!definition.supabaseCategories.includes(category)) {
        return false;
      }

      return allowedQuickCategories.includes(definition.category as QuickCategoryId);
    });
  }, [category, allowedQuickCategories]);

  useEffect(() => {
    if (productTypeOptions.length === 0) {
      setSelectedProductTypeId('');
      return;
    }

    const isSelectedValid =
      selectedProductTypeId &&
      productTypeOptions.some((type) => type.id === selectedProductTypeId);

    if (isSelectedValid) {
      return;
    }

    if (
      initialProductTypeId &&
      productTypeOptions.some((type) => type.id === initialProductTypeId)
    ) {
      setSelectedProductTypeId(initialProductTypeId);
      return;
    }

    setSelectedProductTypeId(productTypeOptions[0].id);
  }, [productTypeOptions, initialProductTypeId, selectedProductTypeId]);

  const selectedProductType = useMemo<ProductTypeDefinition | null>(() => {
    return productTypeOptions.find((type) => type.id === selectedProductTypeId) ?? null;
  }, [productTypeOptions, selectedProductTypeId]);

  useEffect(() => {
    if (!selectedProductType) {
      setFieldValues({});
      setSelectedBrandId('');
      setCustomBrandName('');
      return;
    }

    const initialValues: Record<string, string> = {};

    selectedProductType.fields.forEach((field) => {
      if (field.type === 'measurement' && field.measurementId) {
        const definition = getBodyMeasurementDefinition(field.measurementId);
        if (definition) {
          const existingValue = getBodyMeasurementValue(definition, bodyMeasurements);
          if (existingValue !== null) {
            initialValues[field.id] = existingValue.toString();
          }
        }
      } else if (field.type === 'select' && field.options?.length) {
        initialValues[field.id] = field.options[0];
      }
    });

    setFieldValues(initialValues);
    setSelectedBrandId('');
    setCustomBrandName('');
  }, [selectedProductType, bodyMeasurements]);

  const primaryGarmentType = getPrimaryGarmentType(selectedProductType);

  const filteredBrands = useMemo(
    () => filterBrandsForGarmentType(brands, primaryGarmentType, brandMappings),
    [brands, brandMappings, primaryGarmentType]
  );

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!selectedProductType) {
      setError('Proszę wybrać typ produktu.');
      return;
    }

    try {
      setIsLoading(true);

      selectedProductType.fields.forEach((field) => {
        const value = fieldValues[field.id];
        if (field.required && !hasFilledValue(value)) {
          throw new Error(`Proszę uzupełnić pole: ${field.label}`);
        }
      });

      const sizeValues: Record<string, number | string> = {};
      const sizeLabels: Record<string, string> = {};
      const sizeUnits: Record<string, string> = {};
      const measurementUpdates: Record<string, number> = {};

      let hasAnyValue = false;

      selectedProductType.fields.forEach((field) => {
        const rawValue = fieldValues[field.id];
        if (!hasFilledValue(rawValue)) {
          return;
        }

        hasAnyValue = true;
        const trimmed = rawValue!.trim();
        sizeLabels[field.storageKey] = field.label;
        if (field.unit) {
          sizeUnits[field.storageKey] = field.unit;
        }

        if (field.type === 'measurement' || field.type === 'number') {
          const numericValue = normalizeNumericValue(trimmed);
          if (Number.isNaN(numericValue)) {
            throw new Error(`Niepoprawna wartość w polu: ${field.label}`);
          }

          sizeValues[field.storageKey] = numericValue;

          if (field.type === 'measurement' && field.measurementId) {
            const definition = getBodyMeasurementDefinition(field.measurementId);
            if (definition) {
              const updateFragment = createBodyMeasurementUpdate(definition, numericValue);
              Object.entries(updateFragment).forEach(([key, value]) => {
                if (typeof value === 'number') {
                  const typedKey = key as keyof BodyMeasurements;
                  const current = bodyMeasurements?.[typedKey];
                  if (typeof current !== 'number' || Math.abs(current - value) > 0.001) {
                    measurementUpdates[typedKey as string] = value;
                  }
                }
              });
            }
          }
        } else if (field.type === 'select' || field.type === 'text') {
          sizeValues[field.storageKey] = trimmed;
        }
      });

      if (!hasAnyValue) {
        throw new Error('Podaj przynajmniej jeden parametr rozmiaru.');
      }

      const sizePayload = {
        product_type_id: selectedProductType.id,
        product_type_label: selectedProductType.label,
        values: sizeValues,
        labels: sizeLabels,
        units: sizeUnits,
      };

      const supabase = createClient();

      if (Object.keys(measurementUpdates).length > 0) {
        if (bodyMeasurements) {
          const { error: measurementError } = await supabase
            .from('body_measurements')
            .update(measurementUpdates)
            .eq('profile_id', profileId);

          if (measurementError) {
            throw measurementError;
          }
        } else {
          const { error: measurementError } = await supabase
            .from('body_measurements')
            .insert({ profile_id: profileId, ...measurementUpdates });

          if (measurementError) {
            throw measurementError;
          }
        }
      }

      const garmentTypeForInsert = (primaryGarmentType ?? 'other') as GarmentType;

      const garmentData = {
        profile_id: profileId,
        type: garmentTypeForInsert,
        category,
        size: sizePayload,
        brand_id: selectedBrandId || null,
        brand_name: selectedBrandId ? null : (customBrandName.trim() || null),
        notes: notes.trim() || null,
      };

      const { error: insertError } = await supabase.from('garments').insert(garmentData);

      if (insertError) {
        throw insertError;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (submitError: any) {
      setError(submitError.message ?? 'Wystąpił błąd podczas zapisywania rozmiaru.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: ProductFieldDefinition) => {
    const value = fieldValues[field.id] ?? '';
    const isRequired = Boolean(field.required);

    const labelContent = (
      <label className="flex items-center justify-between text-sm font-medium text-foreground">
        <span>
          {field.label}
          {isRequired ? <span className="ml-1 text-destructive">*</span> : null}
        </span>
        {field.unit ? <span className="text-xs text-muted-foreground">{field.unit}</span> : null}
      </label>
    );

    if (field.type === 'radio') {
      return (
        <div className="space-y-2">
          {labelContent}
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((option) => {
              const id = `${field.id}-${option}`;
              return (
                <label
                  key={option}
                  htmlFor={id}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                    value === option
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-primary/40'
                  }`}
                >
                  <input
                    id={id}
                    type="radio"
                    name={field.id}
                    value={option}
                    checked={value === option}
                    onChange={(event) => handleFieldChange(field.id, event.target.value)}
                    className="hidden"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div className="space-y-2">
          {labelContent}
          <select
            value={value}
            onChange={(event) => handleFieldChange(field.id, event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {field.helpText ? (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === 'measurement' || field.type === 'number') {
      const step = field.step ?? (field.unit === 'mm' ? 1 : 0.1);
      return (
        <div className="space-y-2">
          {labelContent}
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              step={step}
              value={value}
              onChange={(event) => handleFieldChange(field.id, event.target.value)}
              placeholder={field.unit === 'mm' ? 'np. 55' : 'np. 92.5'}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {field.unit ? (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {field.unit}
              </span>
            ) : null}
          </div>
          {field.helpText ? (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {labelContent}
        <input
          type="text"
          value={value}
          onChange={(event) => handleFieldChange(field.id, event.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {field.helpText ? (
          <p className="text-xs text-muted-foreground">{field.helpText}</p>
        ) : null}
      </div>
    );
  };

  const productTypeCards = (
    <div className="grid gap-3 sm:grid-cols-2">
      {productTypeOptions.map((type) => {
        const isSelected = type.id === selectedProductTypeId;
        return (
          <button
            key={type.id}
            type="button"
            onClick={() => setSelectedProductTypeId(type.id)}
            className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5'
            }`}
          >
            <span className="text-sm font-semibold text-foreground">{type.label}</span>
            <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {QUICK_CATEGORY_LABEL[type.category]}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">
                Typ produktu <span className="text-destructive">*</span>
              </label>
              {selectedProductType ? (
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {QUICK_CATEGORY_LABEL[selectedProductType.category]}
                </span>
              ) : null}
            </div>
            {productTypeOptions.length > 0 ? (
              productTypeCards
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                W tej kategorii nie zdefiniowano jeszcze produktów. Wróć i wybierz inną kategorię.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Marka (opcjonalnie)</label>
            <select
              value={selectedBrandId}
              onChange={(event) => {
                setSelectedBrandId(event.target.value);
                if (event.target.value) {
                  setCustomBrandName('');
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={!selectedProductType}
            >
              <option value="">
                {!selectedProductType ? 'Najpierw wybierz typ produktu' : 'Nie wybrano marki'}
              </option>
              {filteredBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            {selectedProductType && filteredBrands.length < brands.length ? (
              <p className="text-xs text-muted-foreground">
                Pokazano marki popularne dla tego typu produktu ({filteredBrands.length} z {brands.length})
              </p>
            ) : null}
            {!selectedBrandId ? (
              <input
                type="text"
                value={customBrandName}
                onChange={(event) => setCustomBrandName(event.target.value)}
                placeholder="Lub wpisz nazwę marki (np. Zara, Reserved, Mango...)"
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : null}
          </div>

          {selectedProductType ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Parametry rozmiaru</h2>
                <span className="text-xs text-muted-foreground">
                  Wypełnij dowolną liczbę pól — potrzebny jest co najmniej jeden parametr.
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedProductType.fields.map((field) => (
                  <div key={field.id}>{renderField(field)}</div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notatki (opcjonalnie)</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="np. 'Idealnie dopasowany', 'Lekko luźny', 'Do skrócenia'"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={isLoading || !selectedProductType}
          className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Zapisywanie…' : 'Zapisz rozmiar'}
        </button>
      </div>
    </form>
  );
}

