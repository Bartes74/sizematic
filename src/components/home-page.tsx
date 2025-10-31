'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GlobalHeader } from '@/components/global-header';
import { QUICK_CATEGORY_CONFIGS, PRODUCT_TYPE_MAP } from '@/data/product-tree';
import type { QuickCategoryId } from '@/data/product-tree';
import { DashboardMissions } from '@/components/missions/dashboard-missions';
import { TrustedCircle } from '@/components/trusted-circle';
import { QuickSizeModal, QuickSizePreferencesModal } from '@/components/quick-size-modals';
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
  trustedCircleInitial?: {
    plan: string | null;
    limit: number | null;
    pending_invitations: Array<{ id: string; invitee_email: string; status: string; created_at: string }>;
    members: Array<{
      profile: {
        id: string;
        display_name: string | null;
        email: string | null;
        avatar_url: string | null;
      };
      connected_at: string;
      outgoing_permissions: { category: string; product_type: string | null }[];
      incoming_permissions: { category: string; product_type: string | null }[];
    }>;
  };
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
  trustedCircleInitial,
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
          <Link
            href="/dashboard/sizes"
            className="text-sm font-medium text-primary transition hover:text-primary/80"
          >
            Zobacz wszystkie
          </Link>
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
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {quickSizeTiles.map((tile) => (
              <button
                key={tile.categoryId}
                type="button"
                onClick={() => setActiveQuickTile({ categoryId: tile.categoryId, productTypeId: tile.productTypeId })}
                className="group flex min-h-[170px] flex-col items-center justify-between rounded-[26px] border border-border/60 bg-[var(--surface-interactive)] p-5 text-center shadow-[0_20px_45px_-32px_rgba(6,134,239,0.45)] transition hover:border-[#48A9A6] hover:shadow-[#48A9A6]/25"
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
              <TrustedCircle initialData={trustedCircleInitial} />
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
