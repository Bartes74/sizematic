'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GlobalHeader } from '@/components/global-header';
import { createClient } from '@/lib/supabase/client';
import { QUICK_CATEGORY_CONFIGS, PRODUCT_TYPE_MAP, getQuickCategoryConfig } from '@/data/product-tree';
import type { QuickCategoryId } from '@/data/product-tree';
import { DashboardMissions } from '@/components/missions/dashboard-missions';
import { TrustedCircle } from '@/components/trusted-circle';
import type {
  Measurement,
  Category,
  Garment,
  SizeLabel,
  UserRole,
  BrandingSettings,
  DashboardSizePreference,
  Brand,
  BrandTypeMapping,
  GarmentType,
} from '@/lib/types';

type HomePageProps = {
  measurements: Measurement[];
  userName?: string | null;
  userRole?: UserRole;
  avatarUrl?: string | null;
  garments?: (Garment & {
    brands?: {
      name: string | null;
    } | null;
  })[];
  sizeLabels?: SizeLabel[];
  branding?: BrandingSettings;
  sizePreferences?: DashboardSizePreference[];
  brands?: Brand[];
  brandMappings?: BrandTypeMapping[];
  profileId: string;
};

type DataGapCard = {
  id: string;
  title: string;
  description: string;
};

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  context: string;
};

type WishlistItem = {
  id: string;
  title: string;
  subtitle: string;
  image?: string | null;
};

type ActivityItem = {
  id: string;
  icon: ReactNode;
  description: string;
};

function SectionCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`section-card transition ${className}`}>
      {children}
    </div>
  );
}

function formatMeasurementKey(key: string) {
  if (!key) {
    return '';
  }
  return key
    .split('_')
    .map((part) => (part ? part.slice(0, 1).toUpperCase() + part.slice(1) : ''))
    .filter(Boolean)
    .join(' ');
}

const KNOWN_SIZE_UNITS = new Set([
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

    if (KNOWN_SIZE_UNITS.has(first)) {
      return {
        value: parts.slice(1).join(' '),
        unit: parts[0].toUpperCase(),
      };
    }

    if (KNOWN_SIZE_UNITS.has(last)) {
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

  const prefixMatch = normalized.match(/^(eu|us|uk|it|fr|de|jp|cn|br|au|ru|mx|pl)[-_/]?(.+)$/i);
  if (prefixMatch) {
    return {
      value: prefixMatch[2].trim(),
      unit: prefixMatch[1].toUpperCase(),
    };
  }

  return { value: normalized, unit: null };
}

function HorizontalScroller<T>({
  title,
  subtitle,
  items,
  renderItem,
}: {
  title: string;
  subtitle?: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const update = () => {
      setCanScrollLeft(element.scrollLeft > 0);
      setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 4);
    };

    update();
    element.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      element.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    const element = scrollRef.current;
    if (!element) return;
    const amount = element.clientWidth * 0.8;
    element.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <SectionCard className="group relative overflow-hidden">
      <div className="flex items-center justify-between gap-2 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="no-scrollbar flex gap-4 overflow-x-auto pb-1 pr-3"
        >
          {items.map((item) => renderItem(item))}
        </div>

        {canScrollLeft && (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => handleScroll('left')}
            className="arrow-button absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-2xl p-2 transition group-hover:flex"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => handleScroll('right')}
            className="arrow-button absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-2xl p-2 transition group-hover:flex"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </SectionCard>
  );
}

export function HomePage({
  measurements,
  userName,
  userRole = 'free',
  avatarUrl,
  garments = [],
  sizeLabels = [],
  branding,
  sizePreferences = [],
  brands = [],
  brandMappings = [],
  profileId,
}: HomePageProps) {
  const router = useRouter();
  const displayName = userName || 'Twoja garderoba';
  const [activeQuickTile, setActiveQuickTile] = useState<{ categoryId: QuickCategoryId; productTypeId?: string | null } | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const sizeLabelsById = useMemo(() => {
    const map = new Map<string, SizeLabel>();
    sizeLabels.forEach((label) => {
      map.set(label.id, label);
    });
    return map;
  }, [sizeLabels]);

  const labelsByCategory = useMemo(() => {
    const map = new Map<Category, SizeLabel[]>();
    sizeLabels.forEach((label) => {
      const category = label.category as Category;
      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category)!.push(label);
    });
    map.forEach((list) => {
      list.sort(
        (a, b) =>
          new Date(b.created_at || b.recorded_at).getTime() -
          new Date(a.created_at || a.recorded_at).getTime()
      );
    });
    return map;
  }, [sizeLabels]);

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

  const brandIdsByGarmentType = useMemo(() => {
    const map = new Map<GarmentType, Set<string>>();
    brandMappings.forEach(({ brand_id, garment_type }) => {
      if (!map.has(garment_type)) {
        map.set(garment_type, new Set());
      }
      map.get(garment_type)!.add(brand_id);
    });
    return map;
  }, [brandMappings]);

  const preferenceMap = useMemo(() => {
    const map = new Map<QuickCategoryId, { sizeLabelId: string | null; productType: string | null }>();
    sizePreferences.forEach((pref) => {
      const categoryId = pref.quick_category as QuickCategoryId;
      map.set(categoryId, {
        sizeLabelId: pref.size_label_id ?? null,
        productType: pref.product_type ?? null,
      });
    });
    return map;
  }, [sizePreferences]);

  const quickSizeTiles = useMemo(() => {
    return QUICK_CATEGORY_CONFIGS.map((config) => {
      const preference = preferenceMap.get(config.id);
      const labelsForCategory = config.supabaseCategories.flatMap(
        (supCategory) => labelsByCategory.get(supCategory) ?? []
      );

      let selectedLabel: SizeLabel | null = null;
      if (preference?.sizeLabelId) {
        selectedLabel = sizeLabelsById.get(preference.sizeLabelId) ?? null;
      }
      if (!selectedLabel && preference?.productType) {
        selectedLabel =
          labelsForCategory.find((label) => label.product_type === preference.productType) ?? null;
      }
      if (!selectedLabel) {
        selectedLabel = labelsForCategory[0] ?? null;
      }

      let sizeValue = '--';
      let sizeUnit: string | null = null;
      let productTypeLabel = 'Dodaj rozmiar';
      let productTypeId: string | null = null;
      let sizeLabelId: string | null = null;

      if (selectedLabel) {
        const { value, unit } = parseSizeLabelParts(selectedLabel.label || '');
        sizeValue = value || '--';
        sizeUnit = unit;
        productTypeId = selectedLabel.product_type ?? null;
        const typeConfig = productTypeId ? PRODUCT_TYPE_MAP[productTypeId] : null;
        productTypeLabel = typeConfig?.label ?? (productTypeId ?? 'Brak typu');
        sizeLabelId = selectedLabel.id;
      } else {
        const measurement = config.supabaseCategories
          .map((supCategory) => measurementByCategory.get(supCategory))
          .find(Boolean);
        if (measurement) {
          const entries = Object.entries(measurement.values || {}).filter(
            ([, value]) => value !== undefined && value !== null
          );
          if (entries.length > 0) {
            const [key, rawValue] = entries[0] as [string, number];
            const formattedValue = Number.isFinite(rawValue)
              ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(rawValue)
              : String(rawValue ?? '');
            sizeValue = formattedValue || '--';
            sizeUnit = 'CM';
            productTypeLabel = formatMeasurementKey(key);
          }
        }
      }

      const hasData = sizeValue !== '--';

      return {
        categoryId: config.id,
        label: config.label,
        sizeValue,
        sizeUnit,
        productTypeLabel,
        productTypeId,
        sizeLabelId,
        hasData,
      };
    });
  }, [labelsByCategory, measurementByCategory, preferenceMap, sizeLabelsById]);

  const dataGaps: DataGapCard[] = useMemo(() => {
    const gaps: DataGapCard[] = [
      {
        id: 'waist',
        title: "What's your waist?",
        description: 'Dodaj obwód talii, aby dopasować spodnie lepiej.',
      },
      {
        id: 'blazer',
        title: 'Missing Blazer Size',
        description: 'Pomóż nam dobrać idealny rozmiar marynarki.',
      },
      {
        id: 'brands',
        title: 'Ulubione marki?',
        description: 'Dodaj marki, które lubisz, by otrzymać lepsze sugestie.',
      },
    ];

    const hasFootwear = garments.some((g) => g.category === 'footwear');
    if (!hasFootwear) {
      gaps.push({
        id: 'foot_length',
        title: 'Pomiar stopy',
        description: 'Uzupełnij długość stopy, by dobrać sportowe modele.',
      });
    }

    return gaps;
  }, [garments]);

  const calendarItems: CalendarEvent[] = useMemo(() => {
    return [
      { id: 'event-1', date: 'Oct 28', title: "Friend's Wedding", context: 'Uroczysty' },
      { id: 'event-2', date: 'Nov 12', title: 'Weekend Getaway', context: 'Casual & comfy' },
      { id: 'event-3', date: 'Dec 01', title: 'Holiday Party', context: 'Festive' },
    ];
  }, []);

  const wishlistItems: WishlistItem[] = useMemo(() => {
    if (!garments.length && !sizeLabels.length) {
      return [
        { id: 'demo-shoe', title: 'Nike Air Force 1', subtitle: 'Rozmiar: 42' },
        { id: 'demo-jeans', title: "Levi's 501 Jeans", subtitle: 'Rozmiar: 32x32' },
      ];
    }

    const garmentsMapped = garments.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: item.brand_name ? `Rozmiar: ${item.brand_name}` : 'Dodaj notatkę',
      image: item.photo_url,
    }));

    const labelsMapped = sizeLabels.slice(0, 2).map((item) => ({
      id: item.id,
      title: item.brand_name ? `${item.brand_name}` : 'Metka',
      subtitle: `Rozmiar: ${item.label}`,
    }));

    return [...garmentsMapped, ...labelsMapped].slice(0, 5);
  }, [garments, sizeLabels]);

  const activityItems: ActivityItem[] = useMemo(() => {
    const list: ActivityItem[] = [];

    if (measurements.length) {
      const latest = measurements[0];
      list.push({
        id: `measurement-${latest.id}`,
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10m-6 5h10" />
          </svg>
        ),
        description: `Zaktualizowano pomiar dla kategorii ${latest.category}.`,
      });
    }

    if (garments.length) {
      const garment = garments[0];
      list.push({
        id: `garment-${garment.id}`,
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12l2 7h-4l-2 11-3-6-3 6-2-11H4l2-7z" />
          </svg>
        ),
        description: `Dodano ${garment.name} do garderoby.`,
      });
    }

    list.push({
      id: 'share',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a4 4 0 118 0 4 4 0 11-8 0zm8 0l7.5-4.33M12 12l7.5 4.33" />
        </svg>
      ),
      description: 'Udostępnij swój profil, by ułatwić zakupy innym.',
    });

    return list.slice(0, 4);
  }, [measurements, garments]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-surface-elevated via-background to-background dark:from-[#08142a] dark:via-[#071225] dark:to-[#071225]" />
      <GlobalHeader
        userName={displayName}
        role={userRole}
        avatarUrl={avatarUrl}
        branding={branding}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-12 lg:px-6">

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">Zapisz swoje rozmiary</h2>
            <button
              type="button"
              onClick={() => setPreferencesOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-[var(--surface-muted)] text-muted-foreground shadow-sm transition hover:border-[#48A9A6] hover:text-[#48A9A6]"
              aria-label="Konfiguruj skróty rozmiarów"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h5m11 0h-6m-4 0v10m2 0h9m-13 0H4M9 7a2 2 0 114 0 2 2 0 11-4 0zm6 10a2 2 0 114 0 2 2 0 11-4 0z" />
              </svg>
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
            {quickSizeTiles.map((tile) => (
              <button
                key={tile.categoryId}
                type="button"
                onClick={() => setActiveQuickTile({ categoryId: tile.categoryId, productTypeId: tile.productTypeId })}
                className="group flex h-full flex-col items-center gap-4 rounded-[28px] border border-border/60 bg-[var(--surface-muted)] p-5 text-center shadow-[0_20px_45px_-30px_rgba(6,134,239,0.55)] transition hover:border-[#48A9A6] hover:shadow-[#48A9A6]/30"
              >
                <p className="text-sm font-semibold text-foreground">{tile.label}</p>
                {tile.hasData ? (
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-semibold text-foreground">{tile.sizeValue}</p>
                    {tile.sizeUnit ? (
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {tile.sizeUnit}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-3xl font-semibold text-foreground">--</span>
                )}
                <p className="text-xs text-muted-foreground">{tile.productTypeLabel}</p>
              </button>
            ))}
          </div>
        </div>

        <DashboardMissions />

        <SectionCard>
          <h2 className="pb-4 text-lg font-semibold text-foreground sm:text-xl">Fill in Your Data Gaps</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {dataGaps.map((gap) => (
              <div
                key={gap.id}
                className="data-gap-card rounded-[26px] border-dashed border-border/60 px-6 py-5 text-sm transition"
              >
                <h3 className="font-semibold">{gap.title}</h3>
                <p className="mt-2 text-muted-foreground">{gap.description}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="flex flex-col gap-6">
            <HorizontalScroller
              title="Event Calendar"
              subtitle="Bądź gotowy na nadchodzące okazje"
              items={calendarItems}
          renderItem={(event) => (
            <div
              key={event.id}
              className="scroller-card event-card min-w-[220px] px-6 text-sm transition"
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                {event.date}
              </div>
              <h3 className="mt-2 text-base font-semibold">{event.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{event.context}</p>
                </div>
              )}
            />

            <SectionCard>
              <h2 className="pb-4 text-lg font-semibold text-foreground sm:text-xl">Last Activity</h2>
              <div className="space-y-3">
                {activityItems.map((item) => (
                <div key={item.id} className="list-chip flex items-center gap-3 rounded-2xl p-3">
                  <span className="chip-icon h-8 w-8">
                    {item.icon}
                  </span>
                  <p className="text-sm text-foreground">{item.description}</p>
                </div>
              ))}
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6">
            <SectionCard className="wishlist-card">
              <h2 className="pb-4 text-lg font-semibold text-foreground sm:text-xl">Wishlist</h2>
              <div className="space-y-4">
                {wishlistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-[var(--surface-muted)] px-4 py-3 transition hover:border-primary/40">
                    <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-border/40 bg-[var(--surface-elevated)]">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          {item.title ? item.title.slice(0, 1) : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full p-2 text-muted-foreground transition hover:text-primary"
                      aria-label="More actions"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v.01M12 12v.01M12 18v.01" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard>
              <TrustedCircle />
            </SectionCard>
          </div>
        </section>
      </main>

      {activeQuickTile && (
        <ModalShell onClose={() => setActiveQuickTile(null)}>
          <QuickSizeModal
            categoryId={activeQuickTile.categoryId}
            initialProductTypeId={activeQuickTile.productTypeId ?? null}
            profileId={profileId}
            brands={brands}
            brandIdsByGarmentType={brandIdsByGarmentType}
            onClose={() => setActiveQuickTile(null)}
            onSaved={() => {
              setActiveQuickTile(null);
              router.refresh();
            }}
          />
        </ModalShell>
      )}

      {preferencesOpen && (
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
      )}
    </div>
  );
}

type QuickSizeModalProps = {
  categoryId: QuickCategoryId;
  initialProductTypeId: string | null;
  profileId: string;
  brands: Brand[];
  brandIdsByGarmentType: Map<GarmentType, Set<string>>;
  onClose: () => void;
  onSaved: () => void;
};

function QuickSizeModal({ categoryId, initialProductTypeId, profileId, brands, brandIdsByGarmentType, onClose, onSaved }: QuickSizeModalProps) {
  const supabase = createClient();
  const categoryConfig = getQuickCategoryConfig(categoryId);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [customBrandName, setCustomBrandName] = useState('');
  const [sizeLabel, setSizeLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultTypeId = categoryConfig.productTypes[0]?.id ?? null;
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<string | null>(initialProductTypeId ?? defaultTypeId);

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

      try {
        await fetch('/api/v1/missions/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
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
        });
      } catch (eventError) {
        console.error('Failed to emit mission event for size label:', eventError);
      }

      onSaved();
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
          className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-[#48A9A6] px-5 py-2.5 text-sm font-semibold text-white shadow shadow-[#48A9A6]/30 transition hover:bg-[#3c8f8c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Zapisywanie...' : 'Zapisz rozmiar'}
        </button>
      </div>
    </form>
  );
}

type PreferenceSelection = {
  productTypeId: string | null;
  sizeLabelId: string | null;
};

type QuickSizePreferencesModalProps = {
  profileId: string;
  sizeLabels: SizeLabel[];
  sizePreferences: DashboardSizePreference[];
  onClose: () => void;
  onSaved: () => void;
};

function QuickSizePreferencesModal({ profileId, sizeLabels, sizePreferences, onClose, onSaved }: QuickSizePreferencesModalProps) {
  const supabase = createClient();

  const labelsByQuickCategory = useMemo(() => {
    const result = new Map<QuickCategoryId, SizeLabel[]>();
    QUICK_CATEGORY_CONFIGS.forEach((config) => {
      const aggregated = config.supabaseCategories.flatMap((supCategory) =>
        sizeLabels.filter((label) => label.category === supCategory)
      );
      aggregated.sort(
        (a, b) =>
          new Date(b.created_at || b.recorded_at).getTime() -
          new Date(a.created_at || a.recorded_at).getTime()
      );
      result.set(config.id, aggregated);
    });
    return result;
  }, [sizeLabels]);

  const initialSelections = useMemo(() => {
    const map: Record<QuickCategoryId, PreferenceSelection> = {} as Record<QuickCategoryId, PreferenceSelection>;
    QUICK_CATEGORY_CONFIGS.forEach((config) => {
      const pref = sizePreferences.find((p) => p.quick_category === config.id);
      const productTypeValid = pref?.product_type && config.productTypes.some((type) => type.id === pref.product_type)
        ? pref.product_type
        : null;
      map[config.id] = {
        productTypeId: productTypeValid,
        sizeLabelId: pref?.size_label_id ?? null,
      };
    });
    return map;
  }, [sizePreferences]);

  const [selections, setSelections] = useState<Record<QuickCategoryId, PreferenceSelection>>(initialSelections);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelections(initialSelections);
  }, [initialSelections]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const updates: Array<{ profile_id: string; quick_category: string; product_type: string | null; size_label_id: string | null }> = [];
      const removals: QuickCategoryId[] = [];

      QUICK_CATEGORY_CONFIGS.forEach((config) => {
        const initial = initialSelections[config.id];
        const current = selections[config.id];

        const normalizedCurrent: PreferenceSelection = {
          productTypeId: current.productTypeId,
          sizeLabelId: current.sizeLabelId,
        };

        const normalizedInitial: PreferenceSelection = {
          productTypeId: initial.productTypeId,
          sizeLabelId: initial.sizeLabelId,
        };

        const hasSelection = normalizedCurrent.productTypeId || normalizedCurrent.sizeLabelId;
        const hadSelection = normalizedInitial.productTypeId || normalizedInitial.sizeLabelId;

        if (hasSelection) {
          if (
            normalizedCurrent.productTypeId !== normalizedInitial.productTypeId ||
            normalizedCurrent.sizeLabelId !== normalizedInitial.sizeLabelId
          ) {
            updates.push({
              profile_id: profileId,
              quick_category: config.id,
              product_type: normalizedCurrent.productTypeId,
              size_label_id: normalizedCurrent.sizeLabelId,
            });
          }
        } else if (hadSelection) {
          removals.push(config.id);
        }
      });

      if (updates.length) {
        const { error: upsertError } = await supabase
          .from('dashboard_size_preferences')
          .upsert(updates, { onConflict: 'profile_id,quick_category' });
        if (upsertError) throw upsertError;
      }

      if (removals.length) {
        const { error: deleteError } = await supabase
          .from('dashboard_size_preferences')
          .delete()
          .eq('profile_id', profileId)
          .in('quick_category', removals);
        if (deleteError) throw deleteError;
      }

      onSaved();
    } catch (err: any) {
      setError(err.message ?? 'Nie udało się zapisać ustawień');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-foreground">Wybierz rozmiary do szybkiego podglądu</h3>
        <p className="text-sm text-muted-foreground">
          Wskaż typ produktu oraz konkretną metkę, która ma się pojawiać na głównym ekranie. Pozostaw puste, jeśli wolisz ostatni zapis.
        </p>
      </div>

      <div className="space-y-4">
        {QUICK_CATEGORY_CONFIGS.map((config) => {
          const selection = selections[config.id];
          const labels = labelsByQuickCategory.get(config.id) ?? [];
          const selectedType = selection.productTypeId || config.productTypes[0]?.id || null;
          const labelsForType = selectedType
            ? labels.filter((label) => label.product_type === selectedType)
            : [];

          return (
            <div key={config.id} className="space-y-3 rounded-2xl border border-border/60 bg-background/80 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-foreground">{config.label}</p>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Typ produktu</label>
                  <select
                    value={selection.productTypeId ?? ''}
                    onChange={(event) => {
                      const nextType = event.target.value || null;
                      setSelections((prev) => ({
                        ...prev,
                        [config.id]: {
                          productTypeId: nextType,
                          sizeLabelId: null,
                        },
                      }));
                    }}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-[#48A9A6] focus:outline-none focus:ring-2 focus:ring-[#48A9A6]/20"
                  >
                    <option value="">Ostatni zapis</option>
                    {config.productTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selection.productTypeId ? (
                labelsForType.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Brak zapisanych metek dla tego typu produktu.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {labelsForType.map((label) => (
                      <label
                        key={label.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                          selection.sizeLabelId === label.id ? 'border-[#48A9A6] bg-[#48A9A6]/10' : 'border-border/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`preference-${config.id}`}
                          value={label.id}
                          checked={selection.sizeLabelId === label.id}
                          onChange={() =>
                            setSelections((prev) => ({
                              ...prev,
                              [config.id]: {
                                productTypeId: selection.productTypeId,
                                sizeLabelId: label.id,
                              },
                            }))
                          }
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium text-foreground">{label.label}</p>
                          <p className="text-xs text-muted-foreground">{label.brand_name || 'Metka bez marki'}</p>
                        </div>
                      </label>
                    ))}
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                        selection.sizeLabelId === null ? 'border-[#48A9A6] bg-[#48A9A6]/10' : 'border-border/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`preference-${config.id}`}
                        value=""
                        checked={selection.sizeLabelId === null}
                        onChange={() =>
                          setSelections((prev) => ({
                            ...prev,
                            [config.id]: {
                              productTypeId: selection.productTypeId,
                              sizeLabelId: null,
                            },
                          }))
                        }
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-foreground">Pokaż ostatnią metkę</p>
                        <p className="text-xs text-muted-foreground">Automatycznie wybierz najnowszy rozmiar w tej kategorii</p>
                      </div>
                    </label>
                  </div>
                )
              ) : (
                <p className="text-xs text-muted-foreground">
                  Kategoria będzie pokazywać najnowszy zapis (bez przypisania do konkretnego typu).
                </p>
              )}
            </div>
          );
        })}
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
          className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-xl bg-[#48A9A6] px-5 py-2.5 text-sm font-semibold text-white shadow shadow-[#48A9A6]/30 transition hover:bg-[#3c8f8c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
        </button>
      </div>
    </div>
  );
}

type ModalShellProps = {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
};

function ModalShell({ children, onClose, maxWidth = 'max-w-2xl' }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className={`relative z-10 w-full ${maxWidth}`}>
        <div className="relative max-h-[calc(100vh-6rem)] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-border/60 p-2 text-muted-foreground transition hover:border-[#48A9A6] hover:text-[#48A9A6]"
            aria-label="Zamknij"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-6 pb-6 pt-12">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
