'use client';

import { type ReactNode, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  QUICK_CATEGORY_CONFIGS,
  CATEGORY_LABEL_MAP,
  PRODUCT_TYPE_MAP,
} from '@/data/product-tree';
import type {
  Measurement,
  SizeLabel,
  DashboardSizePreference,
  Category,
  Garment,
} from '@/lib/types';
import { QuickSizePreferencesModal } from '@/components/quick-size-modals';

function parseSizeLabelParts(label: string): { value: string; unit: string | null } {
  const trimmed = label.trim();
  if (!trimmed) {
    return { value: '--', unit: null };
  }

  const normalized = trimmed.replace(/\s+/g, ' ');
  const parts = normalized.split(' ');

  if (parts.length >= 2) {
    const first = parts[0].toLowerCase();
    const last = parts[parts.length - 1].toLowerCase();

    const KNOWN_UNITS = new Set([
      'cm',
      'mm',
      'in',
      'eu',
      'us',
      'uk',
      'it',
      'fr',
      'de',
      'jp',
      'cn',
      'br',
      'au',
      'ru',
      'mx',
      'pl',
    ]);

    if (KNOWN_UNITS.has(first)) {
      return {
        value: parts.slice(1).join(' '),
        unit: parts[0].toUpperCase(),
      };
    }

    if (KNOWN_UNITS.has(last)) {
      return {
        value: parts.slice(0, -1).join(' '),
        unit: parts[parts.length - 1].toUpperCase(),
      };
    }
  }

  const suffixMatch = normalized.match(/^(.*?)(cm|mm|in)$/i);
  if (suffixMatch) {
    return {
      value: suffixMatch[1].trim(),
      unit: suffixMatch[2].toUpperCase(),
    };
  }

  return { value: normalized, unit: null };
}

type NormalizedGarmentSize = {
  values: Record<string, number | string | null | undefined>;
  labels: Record<string, string>;
  units: Record<string, string>;
};

function normalizeGarmentSize(size: unknown): NormalizedGarmentSize | null {
  if (!size || typeof size !== 'object' || Array.isArray(size)) {
    return null;
  }

  const record = size as Record<string, unknown>;
  if (!('values' in record)) {
    return null;
  }

  return {
    values: (record.values ?? {}) as Record<string, number | string | null | undefined>,
    labels: (record.labels ?? {}) as Record<string, string>,
    units: (record.units ?? {}) as Record<string, string>,
  };
}

function resolveGarmentProductTypeId(garment: Garment): string | null {
  const size = garment.size as Record<string, unknown> | null;
  const idFromSize = typeof size?.product_type_id === 'string' ? (size.product_type_id as string) : null;
  if (idFromSize) {
    return idFromSize;
  }

  const fallback = Object.values(PRODUCT_TYPE_MAP).find(
    (definition) =>
      definition.garmentTypes.includes(garment.type) &&
      definition.supabaseCategories.includes(garment.category)
  );

  return fallback?.id ?? null;
}

function formatGarmentQuickValue(garment: Garment): { value: string; unit: string | null } {
  const normalized = normalizeGarmentSize(garment.size);

  if (normalized) {
    const { values, units } = normalized;

    if (values.size_label) {
      return { value: String(values.size_label), unit: null };
    }

    const orderedKeys = Object.keys(values).filter((key) => {
      const entry = values[key];
      return entry !== null && entry !== undefined && entry !== '';
    });

    if (orderedKeys.length > 0) {
      const firstKey = orderedKeys[0];
      const rawValue = values[firstKey];
      let displayValue = '';

      if (typeof rawValue === 'number') {
        displayValue = new Intl.NumberFormat(undefined, {
          maximumFractionDigits: Math.abs(rawValue) % 1 === 0 ? 0 : 1,
        }).format(rawValue);
      } else {
        displayValue = String(rawValue);
      }

      const unit = units[firstKey];
      return { value: displayValue || '--', unit: unit ? unit.toUpperCase() : null };
    }
  }

  const legacySize = garment.size as Record<string, unknown> | null;
  if (!legacySize) {
    return { value: '--', unit: null };
  }

  if (legacySize.size) {
    return { value: String(legacySize.size), unit: null };
  }
  if (legacySize.collar_cm) {
    return {
      value: `${legacySize.collar_cm}`,
      unit: 'CM',
    };
  }
  if (legacySize.waist_inch) {
    const length = legacySize.length_inch ? `/${legacySize.length_inch}` : '';
    return { value: `${legacySize.waist_inch}${length}`, unit: null };
  }
  if (legacySize.size_eu) {
    return { value: `EU ${legacySize.size_eu}`, unit: null };
  }

  return { value: '--', unit: null };
}

type SizesDirectoryProps = {
  measurements: Measurement[];
  garments: (Garment & {
    brands?: {
      name: string | null;
    } | null;
  })[];
  sizeLabels: SizeLabel[];
  sizePreferences: DashboardSizePreference[];
  profileId: string;
};

export function SizesDirectory({
  measurements,
  garments,
  sizeLabels,
  sizePreferences,
  profileId,
}: SizesDirectoryProps) {
  const router = useRouter();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const tSizesDirectory = useTranslations('dashboard.sizesDirectory');
  const tQuickCategories = useTranslations('dashboard.quickCategories');
  const tProductTypes = useTranslations('dashboard.productTypes');
  const tCommon = useTranslations('common');

  const measurementByCategory = useMemo(() => {
    const sorted = [...measurements].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    const map = new Map<Category, Measurement>();
    sorted.forEach((measurement) => {
      if (!map.has(measurement.category)) {
        map.set(measurement.category, measurement);
      }
    });
    return map;
  }, [measurements]);

  const sizeLabelsByCategory = useMemo(() => {
    const map = new Map<Category, SizeLabel[]>();
    sizeLabels.forEach((label) => {
      const category = label.category as Category;
      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category)!.push(label);
    });
    return map;
  }, [sizeLabels]);

  const garmentsByProductType = useMemo(() => {
    const map = new Map<string, Garment[]>();
    garments.forEach((garment) => {
      const productTypeId = resolveGarmentProductTypeId(garment);
      if (!productTypeId) {
        return;
      }
      if (!map.has(productTypeId)) {
        map.set(productTypeId, []);
      }
      map.get(productTypeId)!.push(garment);
    });
    return map;
  }, [garments]);

  const categoryTiles = useMemo(() => {
    return QUICK_CATEGORY_CONFIGS.map((category) => {
      const labelsForCategory = category.supabaseCategories.flatMap(
        (supCategory) => sizeLabelsByCategory.get(supCategory) ?? []
      );

      const productTiles = category.productTypes.map((productType) => {
        let sizeValue = '--';
        let sizeUnit: string | null = null;

        const label = labelsForCategory.find((item) => item.product_type === productType.id) ?? null;
        if (label) {
          const parsed = parseSizeLabelParts(label.label || '');
          sizeValue = parsed.value || '--';
          sizeUnit = parsed.unit;
        } else {
          const garmentList = garmentsByProductType.get(productType.id) ?? [];
          if (garmentList.length > 0) {
            const quickValue = formatGarmentQuickValue(garmentList[0]);
            sizeValue = quickValue.value || '--';
            sizeUnit = quickValue.unit;
          } else {
            const measurement = category.supabaseCategories
              .map((supCategory) => measurementByCategory.get(supCategory))
              .find(Boolean);
            if (measurement) {
              const entries = Object.entries(measurement.values || {}).filter(
                ([, value]) => value !== undefined && value !== null
              );
              if (entries.length > 0) {
                const [, rawValue] = entries[0] as [string, number];
                const formattedValue = Number.isFinite(rawValue)
                  ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(rawValue)
                  : String(rawValue ?? '');
                sizeValue = formattedValue || '--';
                sizeUnit = 'CM';
              }
            }
          }
        }

        const hasData = sizeValue !== '--';

        return {
          productTypeId: productType.id,
          label: PRODUCT_TYPE_MAP[productType.id]?.label ?? productType.label,
          sizeValue,
          sizeUnit,
          hasData,
        };
      });

      return { category, productTiles };
    });
  }, [garmentsByProductType, measurementByCategory, sizeLabelsByCategory]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 pt-12 lg:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{tSizesDirectory('title')}</h1>
          <p className="text-sm text-muted-foreground">{tSizesDirectory('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            {tSizesDirectory('back')}
          </Link>
          <button
            type="button"
            onClick={() => setPreferencesOpen(true)}
            className="rounded-full border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
          >
            {tSizesDirectory('configure')}
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {categoryTiles.map(({ category, productTiles }) => (
          <section key={category.id} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {(() => {
                let categoryLabel: string;
                try {
                  categoryLabel = tQuickCategories(category.id as any);
                } catch {
                  categoryLabel = CATEGORY_LABEL_MAP[category.id];
                }
                return tSizesDirectory('categoryHeading', {
                  category: categoryLabel,
                  count: category.productTypes.length,
                });
              })()}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {productTiles.map((tile) => (
                <button
                  key={tile.productTypeId}
                  type="button"
                  onClick={() => {
                    const primaryCategory = category.supabaseCategories[0] ?? 'tops';
                    const params = new URLSearchParams();
                    if (tile.productTypeId) {
                      params.set('productType', tile.productTypeId);
                    }
                    params.set('quickCategory', category.id);
                    const query = params.toString();
                    router.push(`/dashboard/garments/add/${primaryCategory}${query ? `?${query}` : ''}`);
                  }}
                  className={`flex min-h-[160px] flex-col justify-between rounded-[26px] border px-5 py-4 text-left transition ${
                    tile.hasData
                      ? 'border-[#48A9A6]/40 bg-[#48A9A6]/8 text-[#184b49]'
                      : 'border-border/70 bg-[var(--surface-interactive)] hover:border-[#48A9A6]/30'
                  }`}
                >
                  <span className="text-sm font-semibold text-foreground">
                    {(() => {
                      if (!tile.productTypeId) {
                        return tile.label;
                      }
                      try {
                        return tProductTypes(tile.productTypeId as any);
                      } catch {
                        return tile.label;
                      }
                    })()}
                  </span>
                  <span className="text-3xl font-semibold text-foreground">
                    {tile.sizeValue}
                    {tile.sizeUnit ? (
                      <span className="ml-2 text-sm uppercase tracking-wide text-muted-foreground">{tile.sizeUnit}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {preferencesOpen ? (
        <ModalShell
          onClose={() => setPreferencesOpen(false)}
          maxWidth="max-w-3xl"
          closeLabel={tCommon('close')}
        >
          <QuickSizePreferencesModal
            profileId={profileId}
            sizeLabels={sizeLabels}
            garments={garments}
            sizePreferences={sizePreferences}
            onClose={() => setPreferencesOpen(false)}
            onSaved={() => {
              setPreferencesOpen(false);
              router.refresh();
            }}
          />
        </ModalShell>
      ) : null}
    </div>
  );
}

type ModalShellProps = {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  closeLabel?: string;
};

function ModalShell({ onClose, children, maxWidth = 'max-w-2xl', closeLabel = 'Close' }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${maxWidth} rounded-3xl border border-border bg-card p-6 shadow-2xl`}>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/60 p-2 text-muted-foreground transition hover:border-primary hover:text-primary"
            aria-label={closeLabel}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
