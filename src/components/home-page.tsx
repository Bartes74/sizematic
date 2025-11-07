'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type SVGProps,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { GlobalHeader } from '@/components/global-header';
import { TrustedCircle } from '@/components/trusted-circle';
import { UpsellModal, type UpsellReason } from '@/components/upsell-modal';
import {
  QUICK_CATEGORY_CONFIGS,
  PRODUCT_TYPE_MAP,
  QUICK_CATEGORY_PRIMARY_SUPABASE,
} from '@/data/product-tree';
import type { QuickCategoryId } from '@/data/product-tree';
import { QuickSizePreferencesModal } from '@/components/quick-size-modals';
import type {
  Measurement,
  Garment,
  SizeLabel,
  UserRole,
  BrandingSettings,
  DashboardSizePreference,
  BodyMeasurements,
  DashboardEvent,
  DashboardEventParticipant,
  DashboardVariant,
  PlanType,
} from '@/lib/types';
import {
  BODY_MEASUREMENT_DEFINITIONS,
  type BodyMeasurementDefinition,
  createBodyMeasurementUpdate,
  getBodyMeasurementDefinition,
  getBodyMeasurementValue,
  isBodyMeasurementComplete,
  isDefinitionRequired,
} from '@/data/body-measurements';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

type SectionKey = 'events' | 'trusted-circle' | 'wishlist';

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
  profileId: string;
  events?: DashboardEvent[];
  wishlistItems?: DashboardWishlistItem[];
  trustedCircleInitial?: {
    plan: string | null;
    plan_type: string | null;
    limit: number | null;
    pending_invitations: Array<{ id: string; invitee_email: string; status: string; created_at: string; circle_id: string | null }>;
    circles: Array<{
      id: string;
      name: string;
      allow_wishlist_access: boolean;
      allow_size_access: boolean;
      member_count: number;
    }>;
    members: Array<{
      profile: {
        id: string;
        display_name: string | null;
        email: string | null;
        avatar_url: string | null;
      };
      circle_id: string;
      circle_name: string;
      connected_at: string;
      outgoing_permissions: { category: string; product_type: string | null }[];
      incoming_permissions: { category: string; product_type: string | null }[];
    }>;
  };
  bodyMeasurements?: BodyMeasurements | null;
  dashboardVariant: DashboardVariant;
  upsellReason?: string | null;
  initialSection?: SectionKey | null;
};

const ALLOWED_UPSELL_REASONS: UpsellReason[] = ['wishlist', 'max_circles', 'max_members', 'no_sg_pool', 'general'];

function normalizeUpsellReason(value: string | null | undefined): UpsellReason | null {
  if (!value) {
    return null;
  }

  return ALLOWED_UPSELL_REASONS.includes(value as UpsellReason)
    ? (value as UpsellReason)
    : 'general';
}

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  context: string;
  kind: 'user' | 'default';
  eventDateISO: string;
  userEvent?: DashboardEvent;
  seedEvent?: GiftCalendarSeedEvent;
};

type DashboardWishlistItem = {
  id: string;
  productName: string | null;
  productBrand: string | null;
  imageUrl: string | null;
  url: string | null;
  wishlistTitle: string;
  status: string | null;
  priceSnapshot: { amount?: string | number | null; currency?: string | null } | null;
};

type EventParticipant = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

type TrustedMemberContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

function formatWishlistPrice(
  snapshot: { amount?: string | number | null; currency?: string | null } | null,
  locale: string
) {
  if (!snapshot || snapshot.amount == null) {
    return null;
  }

  const normalizedAmount =
    typeof snapshot.amount === 'number'
      ? snapshot.amount
      : Number.parseFloat(String(snapshot.amount).replace(',', '.'));

  if (!Number.isFinite(normalizedAmount)) {
    return null;
  }

  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: snapshot.currency ? 'currency' : 'decimal',
      currency: snapshot.currency ?? undefined,
      maximumFractionDigits: 2,
    }).format(normalizedAmount);
  } catch {
    return normalizedAmount.toFixed(2);
  }
}

type NormalizedGarmentSize = {
  values: Record<string, number | string | null | undefined>;
  labels: Record<string, string>;
  units: Record<string, string>;
};

type GiftCalendarSeedEvent = {
  id: string;
  translationKey: string;
  month: number;
  day: number;
};

const DEFAULT_GIFTING_EVENTS: GiftCalendarSeedEvent[] = [
  { id: 'mikolajki', translationKey: 'mikolajki', month: 12, day: 6 },
  { id: 'wigilia', translationKey: 'wigilia', month: 12, day: 24 },
  { id: 'boze-narodzenie', translationKey: 'bozeNarodzenie', month: 12, day: 25 },
  { id: 'walentynki', translationKey: 'walentynki', month: 2, day: 14 },
  { id: 'dzien-kobiet', translationKey: 'dzienKobiet', month: 3, day: 8 },
  { id: 'dzien-matki', translationKey: 'dzienMatki', month: 5, day: 26 },
  { id: 'dzien-dziecka', translationKey: 'dzienDziecka', month: 6, day: 1 },
  { id: 'dzien-ojca', translationKey: 'dzienOjca', month: 6, day: 23 },
  { id: 'dzien-chlopaka', translationKey: 'dzienChlopaka', month: 9, day: 30 },
  { id: 'dzien-babci', translationKey: 'dzienBabci', month: 1, day: 21 },
  { id: 'dzien-dziadka', translationKey: 'dzienDziadka', month: 1, day: 22 },
];

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

function formatLegacyGarmentValue(garment: Garment): string {
  const legacySize = garment.size as Record<string, unknown> | null;
  if (!legacySize) {
    return '--';
  }

  if (legacySize.size) {
    return String(legacySize.size);
  }
  if (legacySize.collar_cm) {
    return `${legacySize.collar_cm}cm ${legacySize.fit_type ?? ''}`.trim();
  }
  if (legacySize.waist_inch) {
    const length = legacySize.length_inch ? `/${legacySize.length_inch}` : '';
    return `${legacySize.waist_inch}${length}`;
  }
  if (legacySize.size_eu) {
    return `EU ${legacySize.size_eu}`;
  }
  if (legacySize.size_mm) {
    const sideLabel = legacySize.side === 'left' ? 'L' : 'P';
    const partLabel = legacySize.body_part === 'hand' ? 'dłoń' : 'stopa';
    return `${legacySize.size_mm} mm (${sideLabel} ${partLabel})`;
  }

  return '--';
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
      const preferredOrder = [
        'ring_size',
        'size_label',
        'finger_circumference_mm',
        'waist_pants_cm',
        'waist_cm',
        'hips_cm',
      ];
      const firstKey = preferredOrder.find((key) => orderedKeys.includes(key)) ?? orderedKeys[0];
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

  const fallback = formatLegacyGarmentValue(garment);
  return { value: fallback || '--', unit: null };
}

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
  closeLabel?: string;
};

function ModalShell({ onClose, children, maxWidth = 'max-w-2xl', closeLabel = 'Close' }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
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

type BodyMeasurementQuickModalProps = {
  definition: BodyMeasurementDefinition;
  profileId: string;
  bodyMeasurements: BodyMeasurements | null;
  hasExistingRecord: boolean;
  onSuccess: () => void;
  onCancel: () => void;
};

function BodyMeasurementQuickModal({
  definition,
  profileId,
  bodyMeasurements,
  hasExistingRecord,
  onSuccess,
  onCancel,
}: BodyMeasurementQuickModalProps) {
  const [value, setValue] = useState(() => {
    const stored = getBodyMeasurementValue(definition, bodyMeasurements);
    return stored != null ? stored.toString() : '';
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tMeasurementsForm = useTranslations('measurementsForm');
  const tMeasurementDefinitions = useTranslations('measurements.definitions');
  const tCommon = useTranslations('common');

  const measurementCopy = useMemo(() => {
    const translationKey = definition.translationKey ?? definition.id;
    let label = definition.label;
    let purpose = definition.purpose;
    let how = definition.how;

    try {
      label = tMeasurementDefinitions(`${translationKey}.label`);
    } catch {}
    try {
      purpose = tMeasurementDefinitions(`${translationKey}.purpose`);
    } catch {}
    try {
      const raw = tMeasurementDefinitions.raw(`${translationKey}.how`) as unknown;
      if (Array.isArray(raw)) {
        how = raw as string[];
      }
    } catch {}

    return { label, purpose, how };
  }, [definition, tMeasurementDefinitions]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const raw = value.trim();
      if (!raw) {
        throw new Error('Podaj wartość dla tego pomiaru.');
      }

      const numeric = Number(raw.replace(',', '.'));
      if (Number.isNaN(numeric) || numeric <= 0) {
        throw new Error('Wprowadź dodatnią liczbę (możesz użyć przecinka lub kropki).');
      }

      const updates = createBodyMeasurementUpdate(definition, numeric);
      const supabase = createSupabaseClient();

      if (hasExistingRecord) {
        const { error: updateError } = await supabase
          .from('body_measurements')
          .update(updates)
          .eq('profile_id', profileId);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('body_measurements')
          .insert({ profile_id: profileId, ...updates });

        if (insertError) {
          throw insertError;
        }
      }

      onSuccess();
    } catch (submissionError: unknown) {
      if (submissionError && typeof submissionError === 'object' && 'message' in submissionError) {
        setError(String((submissionError as { message?: unknown }).message) || 'Nie udało się zapisać pomiaru.');
      } else {
        setError('Nie udało się zapisać pomiaru.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">{measurementCopy.label}</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{tMeasurementsForm('instructions.purposeLabel')}</span>
          <br />
          {measurementCopy.purpose}
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-[var(--surface-interactive)] p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tMeasurementsForm('instructions.title')}
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {measurementCopy.how.map((step, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {tMeasurementsForm('valueLabel', { unit: definition.unit })}
        </label>
        <div className="relative">
          <input
            type="number"
            step={definition.unit === 'mm' ? 1 : 0.1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={definition.unit === 'mm'
              ? tMeasurementsForm('formatHint.mm')
              : tMeasurementsForm('formatHint.cm')}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm font-medium text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {definition.unit}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-border/60 px-6 py-3 text-sm font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/10 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? tMeasurementsForm('submit.saving') : tMeasurementsForm('submit.save')}
        </button>
      </div>
    </form>
  );
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

export function HomePage({
  measurements: _measurements,
  userName,
  userRole = 'free',
  avatarUrl,
  garments = [],
  sizeLabels = [],
  branding,
  sizePreferences = [],
  profileId,
  events: eventsProp = [],
  wishlistItems: wishlistItemsProp = [],
  trustedCircleInitial,
  bodyMeasurements: bodyMeasurementsProp = null,
  dashboardVariant,
  upsellReason,
  initialSection = null,
}: HomePageProps) {
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const tEventsModal = useTranslations('dashboard.events.modal');
  const tEventsDetails = useTranslations('dashboard.events.details');
  const tEvents = useTranslations('dashboard.events');
  const tEventsCard = useTranslations('dashboard.events.card');
  const tEventsDefaultTitles = useTranslations('dashboard.events.defaultTitles');
  const tWishlist = useTranslations('wishlist');
  const tQuickCategories = useTranslations('dashboard.quickCategories');
  const tProductTypes = useTranslations('dashboard.productTypes');
  const tSizesSection = useTranslations('dashboard.sizesSection');
  const tDataGaps = useTranslations('dashboard.dataGaps');
  const tMeasurementsForm = useTranslations('measurementsForm');
  const tMeasurementDefinitions = useTranslations('measurements.definitions');
  const tWishlistSection = useTranslations('dashboard.wishlistSection');
  const tSecretGiver = useTranslations('secretGiver');
  const tCircle = useTranslations('circle');
  void _measurements;
  const router = useRouter();
  const displayName = userName || 'Twoja garderoba';
  const showFullDashboard = dashboardVariant !== 'simple';
  const isSimpleVariant = !showFullDashboard;
  const planType = (trustedCircleInitial?.plan_type ?? 'free') as PlanType;
  const isFreePlan = planType === 'free';
  const initialUpsellReason = normalizeUpsellReason(upsellReason);
  const [activeUpsellReason, setActiveUpsellReason] = useState<UpsellReason | null>(initialUpsellReason);
  const [isUpsellOpen, setIsUpsellOpen] = useState(Boolean(initialUpsellReason));

  useEffect(() => {
    const normalized = normalizeUpsellReason(upsellReason);
    setActiveUpsellReason(normalized);
    setIsUpsellOpen(Boolean(normalized));
  }, [upsellReason]);

  const handleCloseUpsell = useCallback(() => {
    setIsUpsellOpen(false);
    setActiveUpsellReason(null);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.delete('upsell');
      const query = params.toString();
      router.replace(`${window.location.pathname}${query ? `?${query}` : ''}`, { scroll: false });
    }
  }, [router]);
  const openUpsell = useCallback(
    (reason: UpsellReason) => {
      setActiveUpsellReason(reason);
      setIsUpsellOpen(true);
    },
    []
  );
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const updateSectionParam = useCallback(
    (section: SectionKey | null) => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      if (section) {
        params.set('section', section);
      } else {
        params.delete('section');
      }
      const query = params.toString();
      const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: Boolean(section) });
      }
    },
    [router]
  );

  useEffect(() => {
    if (!isSimpleVariant) {
      setActiveSection(null);
      return;
    }

    if (!initialSection) {
      setActiveSection(null);
      updateSectionParam(null);
      return;
    }

    if (initialSection === 'wishlist' && isFreePlan) {
      openUpsell('wishlist');
      updateSectionParam(null);
      return;
    }

    setActiveSection(initialSection);
  }, [initialSection, isFreePlan, isSimpleVariant, openUpsell, updateSectionParam]);

  useEffect(() => {
    if (!isSimpleVariant || !activeSection) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const target = document.getElementById(`dashboard-${activeSection}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeSection, isSimpleVariant]);

  const handleSectionNavigate = useCallback(
    (section: SectionKey) => {
      if (section === 'wishlist' && isFreePlan) {
        openUpsell('wishlist');
        return;
      }
      setActiveSection(section);
      updateSectionParam(section);
    },
    [isFreePlan, openUpsell, updateSectionParam]
  );

  const handleBackToOverview = useCallback(() => {
    setActiveSection(null);
    updateSectionParam(null);
  }, [updateSectionParam]);

  const CalendarIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-12 9h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z" />
    </svg>
  );

  const UsersIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2m18 0v-2a4 4 0 00-3-3.87M15 3a3 3 0 11-6 0 3 3 0 016 0zm6 9a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const HeartIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.347-1.903-4.25-4.25-4.25-1.5 0-2.819.779-3.5 1.95-.681-1.171-2-1.95-3.5-1.95C6.403 4 4.5 5.903 4.5 8.25c0 6.167 7.25 9.5 7.25 9.5s7.25-3.333 7.25-9.5z" />
    </svg>
  );

  const LockIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 10-8 0v4m-2 0h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z" />
    </svg>
  );

  const ArrowLeftIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l6-6m-6 6l6 6" />
    </svg>
  );

  const simpleActions = useMemo(
    () => [
      {
        key: 'events' as SectionKey,
        label: tEvents('title'),
        description: tEvents('subtitle'),
        icon: <CalendarIcon className="h-5 w-5" />,
        locked: false,
      },
      {
        key: 'trusted-circle' as SectionKey,
        label: tCircle('title'),
        description: tCircle('subtitle'),
        icon: <UsersIcon className="h-5 w-5" />,
        locked: false,
      },
      {
        key: 'wishlist' as SectionKey,
        label: tWishlistSection('title'),
        description: tWishlistSection('helper'),
        icon: <HeartIcon className="h-5 w-5" />,
        locked: isFreePlan,
      },
    ],
    [tCircle, tEvents, tWishlistSection, isFreePlan]
  );

  const sizeLabelsById = useMemo(() => {
    const map = new Map<string, SizeLabel>();
    sizeLabels.forEach((label) => {
      map.set(label.id, label);
    });
    return map;
  }, [sizeLabels]);

  const labelsByProductType = useMemo(() => {
    const map = new Map<string, SizeLabel[]>();
    sizeLabels.forEach((label) => {
      if (!label.product_type) {
        return;
      }
      if (!map.has(label.product_type)) {
        map.set(label.product_type, []);
      }
      map.get(label.product_type)!.push(label);
    });
    map.forEach((list) => {
      list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
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

  const latestTimestampByProductType = useMemo(() => {
    const map = new Map<string, number>();

    sizeLabels.forEach((label) => {
      if (!label.product_type) {
        return;
      }
      const ts = Date.parse(label.created_at ?? label.recorded_at);
      if (!Number.isNaN(ts)) {
        map.set(label.product_type, Math.max(map.get(label.product_type) ?? 0, ts));
      }
    });

    garments.forEach((garment) => {
      const productTypeId = resolveGarmentProductTypeId(garment);
      if (!productTypeId) {
        return;
      }
      const ts = garment.created_at ? Date.parse(garment.created_at) : NaN;
      if (!Number.isNaN(ts)) {
        map.set(productTypeId, Math.max(map.get(productTypeId) ?? 0, ts));
      }
    });

    return map;
  }, [garments, sizeLabels]);

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

      const baseProductTypes = config.productTypes.map((productType) => productType.id);

      const sortedByRecency = [...baseProductTypes].sort((a, b) => {
        const tsA = latestTimestampByProductType.get(a) ?? 0;
        const tsB = latestTimestampByProductType.get(b) ?? 0;
        if (tsA === tsB) {
          return baseProductTypes.indexOf(a) - baseProductTypes.indexOf(b);
        }
        return tsB - tsA;
      });

      let productTypeOrder: string[] = sortedByRecency;
      if (
        preference?.productType &&
        sortedByRecency.includes(preference.productType)
      ) {
        productTypeOrder = [
          preference.productType,
          ...sortedByRecency.filter((id) => id !== preference.productType),
        ];
      }

      let sizeValue = '--';
      let sizeUnit: string | null = null;
      let productTypeLabel = 'Dodaj rozmiar';
      let productTypeId: string | null = null;
      let sizeLabelId: string | null = null;

      const applyLabel = (label: SizeLabel | null | undefined) => {
        if (!label || !label.product_type || !productTypeOrder.includes(label.product_type)) {
          return false;
        }
        const { value, unit } = parseSizeLabelParts(label.label || '');
        sizeValue = value || '--';
        sizeUnit = unit ? unit.toUpperCase() : null;
        productTypeId = label.product_type;
        productTypeLabel = PRODUCT_TYPE_MAP[label.product_type]?.label ?? productTypeLabel;
        sizeLabelId = label.id;
        return sizeValue !== '--';
      };

      if (preference?.sizeLabelId) {
        const preferredLabel = sizeLabelsById.get(preference.sizeLabelId);
        if (applyLabel(preferredLabel)) {
          return finalizeTile();
        }
      }

      for (const productTypeKey of productTypeOrder) {
        const labelList = labelsByProductType.get(productTypeKey) ?? [];
        if (applyLabel(labelList[0])) {
          return finalizeTile();
        }
      }

      const applyGarment = (productTypeKey: string) => {
        const garmentList = garmentsByProductType.get(productTypeKey);
        if (!garmentList?.length) {
          return false;
        }
        const garment = garmentList[0];
        const quickValue = formatGarmentQuickValue(garment);
        sizeValue = quickValue.value || '--';
        sizeUnit = quickValue.unit;
        productTypeId = productTypeKey;
        productTypeLabel = PRODUCT_TYPE_MAP[productTypeKey]?.label ?? productTypeLabel;
        return sizeValue !== '--';
      };

      for (const productTypeKey of productTypeOrder) {
        if (applyGarment(productTypeKey)) {
          return finalizeTile();
        }
      }

      const applyMeasurement = (productTypeKey: string) => {
        const typeDefinition = PRODUCT_TYPE_MAP[productTypeKey];
        if (!typeDefinition || !bodyMeasurements) {
          return false;
        }
        for (const field of typeDefinition.fields) {
          if (field.type === 'measurement' && field.measurementId) {
            const definition = getBodyMeasurementDefinition(field.measurementId);
            if (!definition) {
              continue;
            }
            const measurementValue = getBodyMeasurementValue(definition, bodyMeasurements);
            if (typeof measurementValue === 'number' && !Number.isNaN(measurementValue)) {
              const formatter = new Intl.NumberFormat(undefined, {
                maximumFractionDigits: field.unit === 'mm' ? 0 : 1,
              });
              sizeValue = formatter.format(measurementValue) || '--';
              sizeUnit = field.unit ? field.unit.toUpperCase() : null;
              productTypeId = productTypeKey;
              productTypeLabel = typeDefinition.label ?? productTypeLabel;
              return true;
            }
          }
        }
        return false;
      };

      for (const productTypeKey of productTypeOrder) {
        if (applyMeasurement(productTypeKey)) {
          return finalizeTile();
        }
      }

      if (!productTypeId) {
        productTypeId = productTypeOrder[0] ?? null;
        if (productTypeId) {
          productTypeLabel = PRODUCT_TYPE_MAP[productTypeId]?.label ?? productTypeLabel;
        }
      }

      return finalizeTile();

      function finalizeTile() {
        const hasData = sizeValue !== '--';
        const primaryCategory = QUICK_CATEGORY_PRIMARY_SUPABASE[config.id] ?? 'tops';
        return {
          categoryId: config.id,
          primaryCategory,
          label: config.label,
          sizeValue,
          sizeUnit,
          productTypeLabel,
          productTypeId,
          sizeLabelId,
          quickCategoryId: config.id,
          hasData,
        };
      }
    });
  }, [
    bodyMeasurements,
    garmentsByProductType,
    labelsByProductType,
    preferenceMap,
    sizeLabelsById,
    latestTimestampByProductType,
  ]);

  const quickSizeTilesGrid = useCallback(
    (variant: 'full' | 'simple') => {
      const gridClass =
        variant === 'full'
          ? 'grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7'
          : 'grid gap-3 sm:grid-cols-2';
      return (
        <div className={gridClass}>
          {quickSizeTiles.map((tile) => {
            let categoryLabel: string;
            try {
              categoryLabel = tQuickCategories(tile.categoryId as any);
            } catch {
              categoryLabel = tile.label;
            }

            let translatedProductType = tile.productTypeLabel;
            if (tile.productTypeId) {
              try {
                translatedProductType = tProductTypes(tile.productTypeId as any);
              } catch {}
            }

            const buttonClass =
              variant === 'full'
                ? 'group flex min-h-[170px] flex-col items-center justify-between rounded-[26px] border border-border/60 bg-[var(--surface-interactive)] p-5 text-center shadow-[0_20px_45px_-32px_rgba(6,134,239,0.45)] transition hover:border-[#48A9A6] hover:shadow-[#48A9A6]/25'
                : 'group flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-[var(--surface-interactive)] p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10';

            return (
              <button
                key={`${variant}-${tile.categoryId}`}
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (tile.productTypeId) {
                    params.set('productType', tile.productTypeId);
                  }
                  if (tile.quickCategoryId) {
                    params.set('quickCategory', tile.quickCategoryId);
                  }
                  const query = params.toString();
                  router.push(`/dashboard/garments/add/${tile.primaryCategory}${query ? `?${query}` : ''}`);
                }}
                className={buttonClass}
              >
                <p className="text-sm font-semibold text-foreground">
                  {categoryLabel}
                </p>
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
                <p
                  className={
                    variant === 'full'
                      ? 'text-xs text-muted-foreground'
                      : 'text-xs font-medium text-muted-foreground'
                  }
                >
                  {tile.hasData ? translatedProductType : tSizesSection('emptyProductType')}
                </p>
              </button>
            );
          })}
        </div>
      );
    },
    [quickSizeTiles, router, tProductTypes, tQuickCategories, tSizesSection]
  );

  const renderSimpleSizesSection = () => (
    <section id="dashboard-sizes" className="mt-6">
      <SectionCard>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">{tSizesSection('title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tSizesSection('helper')}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/sizes')}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            {tSizesSection('cta')}
          </button>
        </div>
        <div className="mt-4">
          {quickSizeTilesGrid('simple')}
        </div>
      </SectionCard>
    </section>
  );

  const renderFullSizesSection = () => (
    <section id="dashboard-sizes" className="mt-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground sm:text-xl">{tSizesSection('title')}</h2>
          <button
            type="button"
            onClick={() => setPreferencesOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-[var(--surface-muted)] text-muted-foreground shadow-sm transition hover:border-[#48A9A6] hover:text-[#48A9A6]"
            aria-label={tSizesSection('configure')}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h5m11 0h-6m-4 0v10m2 0h9m-13 0H4M9 7a2 2 0 114 0 2 2 0 11-4 0zm6 10a2 2 0 114 0 2 2 0 11-4 0z" />
            </svg>
          </button>
        </div>
        <Link
          href="/dashboard/sizes"
          className="text-sm font-semibold text-primary transition hover:text-primary/80"
        >
          {tSizesSection('cta')}
        </Link>
      </div>
      {quickSizeTilesGrid('full')}
    </section>
  );

  const renderSimpleShortcuts = () => (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {simpleActions.map((action) => {
        const isActionActive = activeSection === action.key;
        const baseClass = 'relative flex flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60';
        const lockedClass = action.locked
          ? 'border-dashed border-primary/50 text-muted-foreground hover:border-primary/50 hover:shadow-none'
          : '';
        const activeClass = isActionActive ? 'ring-2 ring-primary/40' : '';

        return (
          <button
            key={action.key}
            type="button"
            onClick={() =>
              action.locked ? openUpsell('wishlist') : handleSectionNavigate(action.key)
            }
            className={`${baseClass} ${lockedClass} ${activeClass}`.trim()}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {action.icon}
              {action.label}
              {action.locked ? <LockIcon className="h-4 w-4" /> : null}
            </span>
            <span className="text-xs text-muted-foreground">{action.description}</span>
          </button>
        );
      })}
    </div>
  );

  const renderDataGapsSection = () => (
    <section id="dashboard-body" className="mt-6">
      <SectionCard>
        <div className="flex items-center justify-between gap-3 pb-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">{tDataGaps('title')}</h2>
            <p className="text-sm text-muted-foreground">{tDataGaps('subtitle')}</p>
          </div>
          <span
            className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
            aria-label={tDataGaps('progressLabel', {
              remaining: missingMeasurements.length,
              total: totalRequiredDefinitions,
            })}
          >
            {missingMeasurements.length} / {totalRequiredDefinitions}
          </span>
        </div>
        <div className="grid gap-3 pt-2 md:grid-cols-3">
          {missingMeasurements.map((definition) => {
            const translationKey = definition.translationKey ?? definition.id;
            let localizedLabel = definition.label;
            let localizedPurpose = definition.purpose;
            try {
              localizedLabel = tMeasurementDefinitions(`${translationKey}.label`);
            } catch {}
            try {
              localizedPurpose = tMeasurementDefinitions(`${translationKey}.purpose`);
            } catch {}

            return (
              <button
                type="button"
                key={definition.id}
                onClick={() => setActiveBodyMeasurementDefinition(definition)}
                className="data-gap-card flex h-full flex-col rounded-[26px] border border-dashed border-border/60 bg-[var(--surface-interactive)] px-6 py-5 text-left text-sm transition hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
              >
                <h3 className="text-base font-semibold text-foreground">{localizedLabel}</h3>
                <p className="mt-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{tMeasurementsForm('instructions.purposeLabel')}</span>
                  <br />
                  {localizedPurpose}
                </p>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </section>
  );

  const renderEventsSection = (variant: 'full' | 'simple') => (
    <section id="dashboard-events" className={variant === 'simple' ? 'mt-6' : 'mt-6'}>
      <SectionCard>
        <div className="flex items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-3">
          {variant === 'simple' && (
            <button
              type="button"
              onClick={handleBackToOverview}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {tCommon('back')}
            </button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">{tEvents('title')}</h2>
            <p className="text-sm text-muted-foreground">{tEvents('subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openEventForm()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
          </svg>
          {tEvents('add')}
        </button>
      </div>
      {calendarItems.length ? (
        <div className="relative">
          <div
            className="group relative"
            onMouseEnter={updateEventScrollState}
            onFocus={updateEventScrollState}
          >
            <div
              ref={eventsScrollRef}
              className="no-scrollbar flex gap-4 overflow-x-auto pb-2"
            >
              {calendarItems.map((event) => (
                <div
                  key={event.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedCalendarEvent(event)}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                      keyboardEvent.preventDefault();
                      setSelectedCalendarEvent(event);
                    }
                  }}
                  className="flex w-[calc(25%-0.75rem)] min-w-[260px] flex-col rounded-[26px] border border-border/70 bg-[var(--surface-interactive)] px-6 py-5 text-left transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                    {event.date}
                  </p>
                  <h3 className="mt-3 text-base font-semibold text-foreground">{event.title}</h3>
                  <p className="text-sm font-semibold text-primary">{event.context}</p>
                </div>
              ))}
            </div>

            {eventsCanScrollLeft ? (
              <button
                type="button"
                aria-label={tEvents('ariaLeft')}
                onClick={() => handleEventScroll('left')}
                className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-2xl bg-background/90 p-2 text-foreground shadow-lg shadow-primary/10 transition hover:bg-background group-hover:flex"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : null}

            {eventsCanScrollRight ? (
              <button
                type="button"
                aria-label={tEvents('ariaRight')}
                onClick={() => handleEventScroll('right')}
                className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-2xl bg-background/90 p-2 text-foreground shadow-lg shadow-primary/10 transition hover:bg-background group-hover:flex"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[26px] border border-dashed border-border/70 bg-[var(--surface-interactive)] px-6 py-10 text-center">
          <h3 className="text-base font-semibold text-foreground">{tEvents('emptyTitle')}</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {tEvents('emptyBody')}
          </p>
        </div>
      )}
      </SectionCard>
    </section>
  );

  const renderTrustedCircleSection = (variant: 'full' | 'simple') => (
    <section
      id="dashboard-trusted-circle"
      className={variant === 'simple' ? 'mt-6 space-y-4' : 'mt-6'}
    >
      {variant === 'simple' && (
        <button
          type="button"
          onClick={handleBackToOverview}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {tCommon('back')}
        </button>
      )}
      <TrustedCircle initialData={trustedCircleInitial ?? undefined} />
    </section>
  );

  const renderWishlistSection = (variant: 'full' | 'simple') => {
    const locked = isFreePlan;
    return (
      <section id="dashboard-wishlist" className={variant === 'simple' ? 'mt-6' : 'mt-6'}>
        <SectionCard className="relative">
          <div className="flex items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-3">
            {variant === 'simple' && (
              <button
                type="button"
                onClick={handleBackToOverview}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                {tCommon('back')}
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">{tWishlistSection('title')}</h2>
              <p className="text-sm text-muted-foreground">
                {tWishlistSection('subtitle')}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/wishlists"
            onClick={(event) => {
              if (locked) {
                event.preventDefault();
                openUpsell('wishlist');
              }
            }}
            className={`inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 ${locked ? 'opacity-60' : ''}`}
          >
            {tWishlistSection('addButton')}
          </Link>
        </div>

        {wishlistError ? (
          <div className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {wishlistError}
          </div>
        ) : null}

        {wishlistItems.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {wishlistItems.map((item) => {
              const productName = item.productName?.trim() || tWishlistSection('fallbackName');
              const productBrand = item.productBrand?.trim();
              const priceLabel = formatWishlistPrice(item.priceSnapshot, locale);
              const href = item.url ?? '#';

              return (
                <div
                  key={item.id}
                  data-testid="wishlist-card"
                  data-item-id={item.id}
                  className="group flex flex-col rounded-[24px] border border-border/70 bg-[var(--surface-interactive)] px-4 py-4 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                >
                  <a
                    href={href}
                    target={item.url ? '_blank' : undefined}
                    rel={item.url ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-4"
                  >
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-muted)]">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={productName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          {tWishlist('cards.noImage')}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{productName}</p>
                      {productBrand ? (
                        <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">
                          {productBrand}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {tWishlistSection('priceLabel', { value: priceLabel ?? '—' })}
                      </p>
                    </div>
                  </a>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      data-testid="wishlist-card-edit"
                      className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
                      onClick={() => handleWishlistEdit(item)}
                    >
                      {tCommon('edit')}
                    </button>
                    <button
                      type="button"
                      data-testid="wishlist-card-delete"
                      className="rounded-full border border-destructive/30 px-4 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
                      onClick={() => handleOpenWishlistDelete(item)}
                    >
                      {tCommon('delete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[26px] border border-dashed border-border/70 bg-[var(--surface-interactive)] px-6 py-10 text-center">
            <h3 className="text-base font-semibold text-foreground">{tWishlistSection('emptyTitle')}</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {tWishlistSection('emptyBody')}
            </p>
            <Link
              href="/dashboard/wishlists"
              onClick={(event) => {
                if (locked) {
                  event.preventDefault();
                  openUpsell('wishlist');
                }
              }}
              className={`mt-4 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 ${locked ? 'opacity-60' : ''}`}
            >
              {tWishlistSection('addFirst')}
            </Link>
          </div>
        )}

        {locked ? (
          <div className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[26px] bg-background/85 backdrop-blur-sm text-center p-6">
            <LockIcon className="h-6 w-6 text-primary" />
            <p className="text-sm text-muted-foreground">
              {tWishlistSection('lockedDescription')}
            </p>
            <button
              type="button"
              onClick={() => openUpsell('wishlist')}
              className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              {tWishlistSection('unlockButton')}
            </button>
          </div>
        ) : null}
        </SectionCard>
      </section>
    );
  };
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [activeBodyMeasurementDefinition, setActiveBodyMeasurementDefinition] = useState<BodyMeasurementDefinition | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventRecords, setEventRecords] = useState<DashboardEvent[]>(eventsProp);
  const createEmptyParticipant = useCallback((): EventParticipant => ({
    id: Math.random().toString(36).slice(2),
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  }), []);
  const [participants, setParticipants] = useState<EventParticipant[]>(() => [
    createEmptyParticipant(),
  ]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const buildParticipantState = useCallback(
    (list?: DashboardEventParticipant[]) => {
      if (!list || list.length === 0) {
        return [createEmptyParticipant()];
      }

      return list.map((participant) => ({
        id: Math.random().toString(36).slice(2),
        firstName: participant.firstName ?? '',
        lastName: participant.lastName ?? '',
        phone: participant.phone ?? '',
        email: participant.email ?? '',
      }));
    },
    [createEmptyParticipant]
  );
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const handleCloseEventDetails = useCallback(() => {
    setSelectedCalendarEvent(null);
  }, []);
  const openEventForm = useCallback(
    (options?: { event?: DashboardEvent; seed?: { title: string; dateISO: string } }) => {
      setEventError(null);
      setEventSubmitting(false);

      if (options?.event) {
        const existingEvent = options.event;
        setEditingEventId(existingEvent.id);
        setEventTitle(existingEvent.title ?? '');
        setEventDate(existingEvent.event_date ?? '');
        setEventNotes(existingEvent.notes ?? '');
        setIsRecurring(Boolean(existingEvent.is_recurring));
        setParticipants(buildParticipantState(existingEvent.participants as DashboardEventParticipant[]));
      } else {
        const seedDateISO = options?.seed?.dateISO ?? '';
        let formattedSeedDate = '';
        if (seedDateISO) {
          const seedDate = new Date(seedDateISO);
          if (!Number.isNaN(seedDate.getTime())) {
            formattedSeedDate = seedDate.toISOString().slice(0, 10);
          }
        }

        setEditingEventId(null);
        setEventTitle(options?.seed?.title ?? '');
        setEventDate(formattedSeedDate);
        setEventNotes('');
        setIsRecurring(false);
        setParticipants([createEmptyParticipant()]);
      }

      setIsAddEventOpen(true);
    },
    [buildParticipantState, createEmptyParticipant]
  );
  useEffect(() => {
    setEventRecords(eventsProp);
  }, [eventsProp]);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const [eventsCanScrollLeft, setEventsCanScrollLeft] = useState(false);
  const [eventsCanScrollRight, setEventsCanScrollRight] = useState(false);
  const updateEventScrollState = useCallback(() => {
    const container = eventsScrollRef.current;
    if (!container) {
      setEventsCanScrollLeft(false);
      setEventsCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const tolerance = 4;
    setEventsCanScrollLeft(scrollLeft > tolerance);
    setEventsCanScrollRight(scrollLeft + clientWidth < scrollWidth - tolerance);
  }, []);

  const handleEventScroll = useCallback((direction: 'left' | 'right') => {
    const container = eventsScrollRef.current;
    if (!container) {
      return;
    }
 
     const offset = container.clientWidth * 0.8;
     container.scrollBy({
       left: direction === 'left' ? -offset : offset,
       behavior: 'smooth',
     });
    requestAnimationFrame(() => {
      updateEventScrollState();
    });
  }, [updateEventScrollState]);
  const resetEventForm = useCallback(() => {
    setEventTitle('');
    setEventDate('');
    setEventNotes('');
    setIsRecurring(false);
    setParticipants([createEmptyParticipant()]);
    setEventError(null);
    setEventSubmitting(false);
    setEditingEventId(null);
  }, [createEmptyParticipant]);

  const bodyMeasurements = bodyMeasurementsProp ?? null;
  const [wishlistItems, setWishlistItems] = useState(wishlistItemsProp);
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<DashboardWishlistItem | null>(null);
  const [isDeletingWishlistItem, setIsDeletingWishlistItem] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setWishlistItems(wishlistItemsProp);
    setWishlistError(null);
    setPendingDeleteItem(null);
    setDeleteError(null);
    setIsDeletingWishlistItem(false);
  }, [wishlistItemsProp]);

  const handleWishlistEdit = useCallback(
    (item: DashboardWishlistItem) => {
      router.push(`/dashboard/wishlists?edit=${item.id}`);
    },
    [router]
  );

  const handleOpenWishlistDelete = useCallback((item: DashboardWishlistItem) => {
    setDeleteError(null);
    setWishlistError(null);
    setPendingDeleteItem(item);
  }, []);

  const handleCancelWishlistDelete = useCallback(() => {
    if (isDeletingWishlistItem) {
      return;
    }
    setPendingDeleteItem(null);
    setDeleteError(null);
  }, [isDeletingWishlistItem]);

  const handleConfirmWishlistDelete = useCallback(async () => {
    if (!pendingDeleteItem) {
      return;
    }

    setIsDeletingWishlistItem(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/v1/wishlist-items/${pendingDeleteItem.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? tWishlist('errors.deleteFailed'));
      }

      setWishlistItems((previous) => previous.filter((entry) => entry.id !== pendingDeleteItem.id));
      setWishlistError(null);
      setDeleteError(null);
      setPendingDeleteItem(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete wishlist item", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : tWishlist('errors.deleteFailed');
      setDeleteError(message);
      setWishlistError(message);
    } finally {
      setIsDeletingWishlistItem(false);
    }
  }, [pendingDeleteItem, router]);

  const measurementDefinitions = useMemo(
    () => BODY_MEASUREMENT_DEFINITIONS ?? [],
    []
  );

  const requiredDefinitions = useMemo(
    () => measurementDefinitions.filter((definition) => isDefinitionRequired(definition)),
    [measurementDefinitions]
  );

  const totalRequiredDefinitions = requiredDefinitions.length;

  const missingMeasurements = useMemo(
    () =>
      requiredDefinitions.filter(
        (definition) => !isBodyMeasurementComplete(definition, bodyMeasurements)
      ),
    [requiredDefinitions, bodyMeasurements]
  );

  const shouldShowDataGaps = showFullDashboard && missingMeasurements.length > 0;
  const hasBodyMeasurementsRecord = Boolean(bodyMeasurements);

  const calendarItems: CalendarEvent[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateFormatter = new Intl.DateTimeFormat(locale || undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const buildCountdown = (diffDays: number) =>
      diffDays === 0
        ? tEventsCard('today')
        : tEventsCard('daysRemaining', { count: diffDays });

    const userEventTitlesByDate = new Map<string, Set<string>>();

    const entries: Array<{ sortKey: number; item: CalendarEvent }> = [];

    eventRecords.forEach((event) => {
      let eventDate = new Date(event.event_date + 'T00:00:00');
      if (Number.isNaN(eventDate.getTime())) {
        return;
      }

      if (event.is_recurring) {
        const adjusted = new Date(eventDate);
        adjusted.setFullYear(today.getFullYear());
        if (adjusted < today) {
          adjusted.setFullYear(today.getFullYear() + 1);
        }
        eventDate = adjusted;
      }

      if (eventDate < today) {
        return;
      }

      const dateKey = eventDate.toISOString().slice(0, 10);
      const eventTitle = (event.title ?? '').trim() || tEventsCard('untitled');
      const normalizedTitle = eventTitle.toLowerCase();
      if (normalizedTitle) {
        if (!userEventTitlesByDate.has(dateKey)) {
          userEventTitlesByDate.set(dateKey, new Set());
        }
        userEventTitlesByDate.get(dateKey)!.add(normalizedTitle);
      }

      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const formattedDate = dateFormatter.format(eventDate);
      const contextLabel = buildCountdown(diffDays);

      entries.push({
        sortKey: eventDate.getTime(),
        item: {
          id: event.id,
          date: formattedDate,
          title: eventTitle,
          context: contextLabel,
          kind: 'user',
          eventDateISO: eventDate.toISOString(),
          userEvent: event,
        },
      });
    });

    DEFAULT_GIFTING_EVENTS.forEach((event) => {
      const baseDate = new Date(today.getFullYear(), event.month - 1, event.day);
      if (Number.isNaN(baseDate.getTime())) {
        return;
      }

      if (baseDate < today) {
        baseDate.setFullYear(today.getFullYear() + 1);
      }

      const dateKey = baseDate.toISOString().slice(0, 10);
      const seedTitle = tEventsDefaultTitles(event.translationKey);
      const normalizedSeedTitle = seedTitle.toLowerCase().trim();
      if (normalizedSeedTitle && userEventTitlesByDate.get(dateKey)?.has(normalizedSeedTitle)) {
        return;
      }

      const diffTime = baseDate.getTime() - today.getTime();
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const formattedDate = dateFormatter.format(baseDate);
      const contextLabel = buildCountdown(diffDays);

      entries.push({
        sortKey: baseDate.getTime(),
        item: {
          id: `default-${event.id}-${baseDate.getFullYear()}`,
          date: formattedDate,
          title: seedTitle,
          context: contextLabel,
          kind: 'default',
          eventDateISO: baseDate.toISOString(),
          seedEvent: event,
        },
      });
    });

    return entries
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((entry) => entry.item);
  }, [eventRecords, locale, tEventsCard, tEventsDefaultTitles]);

  useEffect(() => {
    const container = eventsScrollRef.current;
    if (!container) {
      return;
    }
 
     updateEventScrollState();
     container.addEventListener('scroll', updateEventScrollState);
 
     return () => {
       container.removeEventListener('scroll', updateEventScrollState);
     };
  }, [calendarItems.length, updateEventScrollState]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      updateEventScrollState();
    });
    return () => cancelAnimationFrame(frame);
  }, [calendarItems, updateEventScrollState]);

  const trustedMembers = useMemo(() => {
    return (trustedCircleInitial?.members ?? []).map((member) => {
      const profile = member.profile;
      const rawDisplayName = profile.display_name?.trim() ?? '';
      const [firstNameRaw, ...rest] = rawDisplayName.split(/\s+/);
      const computedFirstName = firstNameRaw?.trim() || rawDisplayName || 'Kontakt';
      const computedLastName = rest.join(' ').trim();

      return {
        id: profile.id,
        firstName: computedFirstName,
        lastName: computedLastName,
        email: profile.email ?? '',
      } as TrustedMemberContact;
    });
  }, [trustedCircleInitial]);

  const handleParticipantChange = useCallback(
    (id: string, field: keyof EventParticipant, value: string) => {
      setParticipants((prev) =>
        prev.map((participant) =>
          participant.id === id ? { ...participant, [field]: value } : participant
        )
      );
    },
    []
  );

  const handleAddParticipant = useCallback(() => {
    setParticipants((prev) => [...prev, createEmptyParticipant()]);
  }, [createEmptyParticipant]);

  const handleRemoveParticipant = useCallback((id: string) => {
    setParticipants((prev) => (prev.length <= 1 ? prev : prev.filter((participant) => participant.id !== id)));
  }, []);

  const handleAddTrustedMember = useCallback((member: TrustedMemberContact) => {
    setParticipants((prev) => {
      if (member.email && prev.some((participant) => participant.email === member.email)) {
        return prev;
      }

      return [
        ...prev,
        {
          id: Math.random().toString(36).slice(2),
          firstName: member.firstName,
          lastName: member.lastName,
          phone: '',
          email: member.email,
        },
      ];
    });
  }, []);

  const handleCloseEventModal = useCallback(() => {
    setIsAddEventOpen(false);
    resetEventForm();
  }, [resetEventForm]);

  const handleEventSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!eventTitle.trim() || !eventDate) {
        setEventError(tEventsModal('errors.missingRequired'));
        return;
      }

      const trimmedParticipants = participants
        .map((participant) => ({
          ...participant,
          firstName: participant.firstName.trim(),
          lastName: participant.lastName.trim(),
          phone: participant.phone.trim(),
          email: participant.email.trim(),
        }))
        .filter((participant) =>
          participant.firstName ||
          participant.lastName ||
          participant.email ||
          participant.phone
        );

      const participantPayload: DashboardEventParticipant[] = trimmedParticipants.map(
        ({ firstName, lastName, phone, email }) => ({
          firstName,
          lastName,
          phone,
          email,
        })
      );

      const trimmedNotes = eventNotes.trim();

      setEventSubmitting(true);
      setEventError(null);

      try {
        const supabase = createSupabaseClient();
        let persistedEvent: DashboardEvent | null = null;

        if (editingEventId) {
          const { data, error } = await supabase
            .from('dashboard_events')
            .update({
              title: eventTitle.trim(),
              event_date: eventDate,
              is_recurring: isRecurring,
              participants: participantPayload,
              notes: trimmedNotes || null,
            })
            .eq('id', editingEventId)
            .eq('profile_id', profileId)
            .select()
            .single();

          if (error) {
            throw error;
          }

          persistedEvent = {
            ...data,
            participants: (data.participants ?? []) as DashboardEventParticipant[],
            notes: typeof data.notes === 'string' ? data.notes : null,
          } as DashboardEvent;

          setEventRecords((prev) =>
            prev.map((existing) => (existing.id === editingEventId ? persistedEvent! : existing))
          );
        } else {
          const { data, error } = await supabase
            .from('dashboard_events')
            .insert({
              profile_id: profileId,
              title: eventTitle.trim(),
              event_date: eventDate,
              is_recurring: isRecurring,
              participants: participantPayload,
              notes: trimmedNotes || null,
            })
            .select()
            .single();

          if (error) {
            throw error;
          }

          persistedEvent = {
            ...data,
            participants: (data.participants ?? []) as DashboardEventParticipant[],
            notes: typeof data.notes === 'string' ? data.notes : null,
          } as DashboardEvent;

          setEventRecords((prev) => [...prev, persistedEvent!]);
        }

        setIsAddEventOpen(false);
        resetEventForm();
        void router.refresh();
      } catch (insertionError) {
        console.error('Failed to save event', insertionError);
        setEventError(tEventsModal('errors.saveFailed'));
      } finally {
        setEventSubmitting(false);
      }
    },
    [
      editingEventId,
      eventDate,
      eventNotes,
      eventTitle,
      isRecurring,
      participants,
      profileId,
      resetEventForm,
      router,
      tEventsModal,
    ]
  );

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

        {/* Secret Giver - Prominentny CTA Box */}
        <Link
          href="/dashboard/secret-giver"
          className="group relative overflow-hidden rounded-3xl border-2 border-purple-400 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 p-8 shadow-xl shadow-purple-400/50 transition-all hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/60 dark:border-purple-800 dark:from-purple-950/40 dark:via-pink-950/30 dark:to-blue-950/40 dark:shadow-purple-900/30"
        >
          <div className="absolute right-0 top-0 h-full w-1/3 opacity-30 dark:opacity-10">
            <svg className="h-full w-full" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 10 L90 90 L10 90 Z" className="text-purple-600 dark:text-purple-400" />
              <circle cx="50" cy="35" r="8" className="text-pink-600 dark:text-pink-400" />
            </svg>
          </div>
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-1.5 text-xs font-bold text-white shadow-md">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>{tSecretGiver('badge')}</span>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-white drop-shadow-lg md:text-3xl">
                {tSecretGiver('title')}
              </h2>
              <p className="text-sm text-white drop-shadow-md md:text-base font-semibold">
                {tSecretGiver('description')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg border border-purple-300 bg-white/80 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-sm dark:border-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {tSecretGiver('features.anonymous')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-pink-300 bg-white/80 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-pink-700 shadow-sm dark:border-pink-700 dark:bg-pink-900/40 dark:text-pink-200">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {tSecretGiver('features.access48h')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-white/80 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {tSecretGiver('features.emailNotifications')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 font-bold text-white shadow-lg shadow-purple-400/40 transition group-hover:shadow-xl group-hover:shadow-purple-500/50 group-hover:scale-105">
                {tSecretGiver('cta')}
              </div>
            </div>
          </div>
        </Link>

        {isSimpleVariant ? (
          <>
            {renderSimpleSizesSection()}
            {renderSimpleShortcuts()}
            {activeSection === 'events' ? renderEventsSection('simple') : null}
            {activeSection === 'trusted-circle' ? renderTrustedCircleSection('simple') : null}
            {activeSection === 'wishlist' ? renderWishlistSection('simple') : null}
          </>
        ) : (
          <>
            {renderFullSizesSection()}
            {shouldShowDataGaps ? renderDataGapsSection() : null}
            {renderEventsSection('full')}
            {renderTrustedCircleSection('full')}
            {renderWishlistSection('full')}
          </>
        )}

      </main>

      {pendingDeleteItem ? (
        <ModalShell onClose={handleCancelWishlistDelete} maxWidth="max-w-md" closeLabel={tCommon('close')}>
          <div className="space-y-5">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {tWishlist('deleteModal.title')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {tWishlist('deleteModal.body', {
                  name: pendingDeleteItem.productName ?? tWishlist('deleteModal.fallbackName'),
                })}
              </p>
            </div>

            {deleteError ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {deleteError}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleCancelWishlistDelete}
                disabled={isDeletingWishlistItem}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                className="rounded-full bg-destructive px-5 py-2 text-sm font-semibold text-destructive-foreground shadow transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleConfirmWishlistDelete}
                disabled={isDeletingWishlistItem}
              >
                {isDeletingWishlistItem ? tWishlist('deleteModal.deleting') : tCommon('delete')}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      <UpsellModal
        isOpen={isUpsellOpen && !!activeUpsellReason}
        reason={activeUpsellReason ?? 'general'}
        onClose={handleCloseUpsell}
      />

      {isAddEventOpen ? (
        <ModalShell onClose={handleCloseEventModal} maxWidth="max-w-2xl" closeLabel={tCommon('close')}>
          <form onSubmit={handleEventSubmit} className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                {editingEventId ? tEventsModal('titleEdit') : tEventsModal('titleCreate')}
              </h3>
              <p className="text-sm text-muted-foreground">{tEventsModal('subtitle')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {tEventsModal('dateLabel')} <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {tEventsModal('nameLabel')} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder={tEventsModal('namePlaceholder')}
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{tEventsModal('notesLabel')}</label>
              <textarea
                value={eventNotes}
                onChange={(event) => setEventNotes(event.target.value)}
                rows={3}
                placeholder={tEventsModal('notesPlaceholder')}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-border/60 bg-[var(--surface-interactive)] px-4 py-3 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(event) => setIsRecurring(event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
              />
              {tEventsModal('recurringLabel')}
            </label>

            {eventError ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {eventError}
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">{tEventsModal('participants.title')}</h4>
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                  </svg>
                  {tEventsModal('participants.add')}
                </button>
              </div>

              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="rounded-2xl border border-border/60 bg-[var(--surface-interactive)] p-4"
                  >
                    <div className="flex items-center justify-between pb-2">
                      <p className="text-sm font-semibold text-foreground">
                        {tEventsModal('participants.personLabel', { index: index + 1 })}
                      </p>
                      {participants.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="text-xs font-medium text-destructive transition hover:text-destructive/80"
                        >
                          {tCommon('delete')}
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">
                          {tEventsModal('participants.fields.firstName.label')}
                        </label>
                        <input
                          type="text"
                          value={participant.firstName}
                          onChange={(event) =>
                            handleParticipantChange(participant.id, 'firstName', event.target.value)
                          }
                          placeholder={tEventsModal('participants.fields.firstName.placeholder')}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">
                          {tEventsModal('participants.fields.lastName.label')}
                        </label>
                        <input
                          type="text"
                          value={participant.lastName}
                          onChange={(event) =>
                            handleParticipantChange(participant.id, 'lastName', event.target.value)
                          }
                          placeholder={tEventsModal('participants.fields.lastName.placeholder')}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">
                          {tEventsModal('participants.fields.phone.label')}
                        </label>
                        <input
                          type="tel"
                          value={participant.phone}
                          onChange={(event) =>
                            handleParticipantChange(participant.id, 'phone', event.target.value)
                          }
                          placeholder={tEventsModal('participants.fields.phone.placeholder')}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">
                          {tEventsModal('participants.fields.email.label')}
                        </label>
                        <input
                          type="email"
                          value={participant.email}
                          onChange={(event) =>
                            handleParticipantChange(participant.id, 'email', event.target.value)
                          }
                          placeholder={tEventsModal('participants.fields.email.placeholder')}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {trustedMembers.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">{tEventsModal('participants.trustedLabel')}</h4>
                <div className="flex flex-wrap gap-2">
                  {trustedMembers.map((member) => (
                    <button
                      type="button"
                      key={member.id}
                      onClick={() => handleAddTrustedMember(member)}
                      className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                    >
                      {member.firstName} {member.lastName}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseEventModal}
                className="rounded-full border border-border/60 px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={eventSubmitting || !eventDate || !eventTitle.trim()}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {eventSubmitting
                  ? tEventsModal('saving')
                  : editingEventId
                    ? tEventsModal('submitUpdate')
                    : tEventsModal('submitCreate')}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {selectedCalendarEvent ? (() => {
        const eventDate = new Date(selectedCalendarEvent.eventDateISO);
        const formattedDate = eventDate.toLocaleDateString(locale || undefined, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const diffDays = Math.max(0, Math.ceil((eventDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)));
        const countdownText = tEventsDetails('countdown', { count: diffDays });
        const userEvent = selectedCalendarEvent.userEvent;
        const participants = (userEvent?.participants ?? []) as DashboardEventParticipant[];
        const visibleParticipants = participants.filter((participant) =>
          participant.firstName || participant.lastName || participant.email || participant.phone
        );

        return (
          <ModalShell onClose={handleCloseEventDetails} maxWidth="max-w-xl" closeLabel={tCommon('close')}>
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">{selectedCalendarEvent.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formattedDate} · {selectedCalendarEvent.context}
                </p>
                <p className="text-sm font-medium text-primary">{countdownText}</p>
                {selectedCalendarEvent.kind === 'user' && userEvent?.is_recurring ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {tEventsDetails('recurringBadge')}
                  </span>
                ) : null}
              </div>

              {selectedCalendarEvent.kind === 'user' ? (
                <div className="space-y-6">
                  {userEvent?.notes ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                        {tEventsDetails('notesLabel')}
                      </p>
                      <p>{userEvent.notes}</p>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">{tEventsModal('participants.title')}</h4>
                      <span className="text-xs text-muted-foreground">
                        {visibleParticipants.length} / {participants.length}
                      </span>
                    </div>
                    {visibleParticipants.length ? (
                      <ul className="space-y-2">
                        {visibleParticipants.map((participant, index) => {
                          const name = [participant.firstName, participant.lastName]
                            .filter(Boolean)
                            .join(' ')
                            .trim();
                          const fallbackName =
                            name || participant.email || tEventsDetails('participantFallback', { index: index + 1 });
                          return (
                            <li key={`${participant.email ?? participant.phone ?? index}`} className="rounded-xl border border-border/50 bg-[var(--surface-interactive)] px-4 py-3 text-sm text-foreground">
                              <p className="font-semibold">{fallbackName}</p>
                              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                                {participant.email ? (
                                  <p>
                                    {tEventsDetails('contact.email')}: {participant.email}
                                  </p>
                                ) : null}
                                {participant.phone ? (
                                  <p>
                                    {tEventsDetails('contact.phone')}: {participant.phone}
                                  </p>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="rounded-xl border border-dashed border-border/60 bg-[var(--surface-interactive)] px-4 py-3 text-sm text-muted-foreground">
                        {tEventsDetails('participantsEmpty')}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-[var(--surface-interactive)] px-4 py-4 text-sm text-muted-foreground">
                  {tEventsDetails('autoSeedInfo')}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseEventDetails}
                  className="rounded-full border border-border/60 px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {tCommon('close')}
                </button>
                {selectedCalendarEvent.kind === 'user' && userEvent ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseEventDetails();
                      openEventForm({ event: userEvent });
                    }}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    {tEventsDetails('edit')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseEventDetails();
                      openEventForm({
                        seed: {
                          title: selectedCalendarEvent.title,
                          dateISO: selectedCalendarEvent.eventDateISO,
                        },
                      });
                    }}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    {tEventsDetails('personalize')}
                  </button>
                )}
              </div>
            </div>
          </ModalShell>
        );
      })()
        : null}

      {activeBodyMeasurementDefinition && (
        <ModalShell
          onClose={() => setActiveBodyMeasurementDefinition(null)}
          maxWidth="max-w-xl"
          closeLabel={tCommon('close')}
        >
          <BodyMeasurementQuickModal
            definition={activeBodyMeasurementDefinition}
            profileId={profileId}
            bodyMeasurements={bodyMeasurements}
            hasExistingRecord={hasBodyMeasurementsRecord}
            onSuccess={() => {
              setActiveBodyMeasurementDefinition(null);
              router.refresh();
            }}
            onCancel={() => setActiveBodyMeasurementDefinition(null)}
          />
        </ModalShell>
      )}

      {preferencesOpen && (
        <ModalShell onClose={() => setPreferencesOpen(false)} maxWidth="max-w-3xl" closeLabel={tCommon('close')}>
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
      )}
    </div>
  );
}