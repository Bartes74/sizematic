'use client';

import { type ReactNode, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QUICK_CATEGORY_CONFIGS, CATEGORY_LABEL_MAP } from '@/data/product-tree';
import type {
  Measurement,
  SizeLabel,
  DashboardSizePreference,
  Category,
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

type SizesDirectoryProps = {
  measurements: Measurement[];
  sizeLabels: SizeLabel[];
  sizePreferences: DashboardSizePreference[];
  profileId: string;
};

export function SizesDirectory({
  measurements,
  sizeLabels,
  sizePreferences,
  profileId,
}: SizesDirectoryProps) {
  const router = useRouter();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

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

  const brandIdsByGarmentType = useMemo(() => buildBrandMap(brandMappings), [brandMappings]);

  const categoryTiles = useMemo(() => {
    return QUICK_CATEGORY_CONFIGS.map((category) => {
      const labelsForCategory = category.supabaseCategories.flatMap(
        (supCategory) => sizeLabelsByCategory.get(supCategory) ?? []
      );

      const productTiles = category.productTypes.map((productType) => {
        const label = labelsForCategory.find((item) => item.product_type === productType.id) ?? null;

        if (label) {
          const { value, unit } = parseSizeLabelParts(label.label || '');
          return {
            productTypeId: productType.id,
            label: productType.label,
            sizeValue: value,
            sizeUnit: unit,
            hasData: true,
          };
        }

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
            return {
              productTypeId: productType.id,
              label: productType.label,
              sizeValue: formattedValue || '--',
              sizeUnit: 'CM',
              hasData: formattedValue !== '',
            };
          }
        }

        return {
          productTypeId: productType.id,
          label: productType.label,
          sizeValue: '--',
          sizeUnit: null,
          hasData: false,
        };
      });

      return { category, productTiles };
    });
  }, [measurementByCategory, sizeLabelsByCategory]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 pt-12 lg:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Twoje rozmiary</h1>
          <p className="text-sm text-muted-foreground">
            Przeglądaj wszystkie kategorie i aktualizuj metki, aby mieć komplet danych pod ręką.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            Wróć do dashboardu
          </Link>
          <button
            type="button"
            onClick={() => setPreferencesOpen(true)}
            className="rounded-full border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
          >
            Konfiguruj skróty
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {categoryTiles.map(({ category, productTiles }) => (
          <section key={category.id} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {CATEGORY_LABEL_MAP[category.id]} • <span className="text-muted-foreground">{category.productTypes.length} typów</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {productTiles.map((tile) => (
                <button
                  key={tile.productTypeId}
                  type="button"
                  onClick={() => {
                    const primaryCategory = category.supabaseCategories[0] ?? 'tops';
                    const query = tile.productTypeId ? `?productType=${tile.productTypeId}` : '';
                    router.push(`/dashboard/garments/add/${primaryCategory}${query}`);
                  }}
                  className={`flex min-h-[160px] flex-col justify-between rounded-[26px] border px-5 py-4 text-left transition ${
                    tile.hasData
                      ? 'border-[#48A9A6]/40 bg-[#48A9A6]/8 text-[#184b49]'
                      : 'border-border/70 bg-[var(--surface-interactive)] hover:border-[#48A9A6]/30'
                  }`}
                >
                  <span className="text-sm font-semibold text-foreground">{tile.label}</span>
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
        <ModalShell onClose={() => setPreferencesOpen(false)} maxWidth="max-w-3xl">
          <QuickSizePreferencesModal
            profileId={profileId}
            sizeLabels={sizeLabels}
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
};

function ModalShell({ onClose, children, maxWidth = 'max-w-2xl' }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${maxWidth} rounded-3xl border border-border bg-card p-6 shadow-2xl`}>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/60 p-2 text-muted-foreground transition hover:border-primary hover:text-primary"
            aria-label="Zamknij"
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
