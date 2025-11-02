'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GlobalHeader } from '@/components/global-header';
import {
  QUICK_CATEGORY_CONFIGS,
  PRODUCT_TYPE_MAP,
  QUICK_CATEGORY_PRIMARY_SUPABASE,
} from '@/data/product-tree';
import type { QuickCategoryId } from '@/data/product-tree';
import { QuickSizePreferencesModal } from '@/components/quick-size-modals';
import { RecentActivity } from '@/components/recent-activity';
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
  bodyMeasurements?: BodyMeasurements | null;
};

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

type NormalizedGarmentSize = {
  values: Record<string, number | string | null | undefined>;
  labels: Record<string, string>;
  units: Record<string, string>;
};

type GiftCalendarSeedEvent = {
  id: string;
  title: string;
  month: number;
  day: number;
};

const DEFAULT_GIFTING_EVENTS: GiftCalendarSeedEvent[] = [
  { id: 'mikolajki', title: 'Mikołajki', month: 12, day: 6 },
  { id: 'wigilia', title: 'Wigilia Bożego Narodzenia', month: 12, day: 24 },
  { id: 'boze-narodzenie', title: 'Boże Narodzenie', month: 12, day: 25 },
  { id: 'walentynki', title: 'Walentynki', month: 2, day: 14 },
  { id: 'dzien-kobiet', title: 'Dzień Kobiet', month: 3, day: 8 },
  { id: 'dzien-matki', title: 'Dzień Matki', month: 5, day: 26 },
  { id: 'dzien-dziecka', title: 'Dzień Dziecka', month: 6, day: 1 },
  { id: 'dzien-ojca', title: 'Dzień Ojca', month: 6, day: 23 },
  { id: 'dzien-chlopaka', title: 'Dzień Chłopaka', month: 9, day: 30 },
  { id: 'dzien-babci', title: 'Dzień Babci', month: 1, day: 21 },
  { id: 'dzien-dziadka', title: 'Dzień Dziadka', month: 1, day: 22 },
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
        <h2 className="text-2xl font-semibold text-foreground">{definition.label}</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Po co?</span>
          <br />
          {definition.purpose}
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-[var(--surface-interactive)] p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Jak mierzyć?</p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {definition.how.map((step, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Wprowadź wartość ({definition.unit})
        </label>
        <div className="relative">
          <input
            type="number"
            step={definition.unit === 'mm' ? 1 : 0.1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={definition.unit === 'mm' ? 'np. 55' : 'np. 92.5'}
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
          Anuluj
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/10 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Zapisywanie...' : 'Zapisz pomiar'}
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
  measurements,
  userName,
  userRole = 'free',
  avatarUrl,
  garments = [],
  sizeLabels = [],
  branding,
  sizePreferences = [],
  profileId,
  events: eventsProp = [],
  trustedCircleInitial,
  bodyMeasurements: bodyMeasurementsProp = null,
}: HomePageProps) {
  const router = useRouter();
  const displayName = userName || 'Twoja garderoba';
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
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const handleCloseEventDetails = useCallback(() => {
    setSelectedCalendarEvent(null);
  }, []);
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
  const resetEventForm = useCallback(() => {
    setEventTitle('');
    setEventDate('');
    setEventNotes('');
    setIsRecurring(false);
    setParticipants([createEmptyParticipant()]);
    setEventError(null);
    setEventSubmitting(false);
  }, [createEmptyParticipant]);

  const bodyMeasurements = bodyMeasurementsProp ?? null;

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

  const shouldShowDataGaps = missingMeasurements.length > 0;
  const hasBodyMeasurementsRecord = Boolean(bodyMeasurements);

  const calendarItems: CalendarEvent[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const formattedDate = eventDate.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const contextLabel = diffDays === 0 ? 'Dziś' : `Za ${diffDays} dni`;

      entries.push({
        sortKey: eventDate.getTime(),
        item: {
          id: event.id,
          date: formattedDate,
          title: event.title,
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

      const diffTime = baseDate.getTime() - today.getTime();
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const formattedDate = baseDate.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const contextLabel = diffDays === 0 ? 'Dziś' : `Za ${diffDays} dni`;

      entries.push({
        sortKey: baseDate.getTime(),
        item: {
          id: `default-${event.id}-${baseDate.getFullYear()}`,
          date: formattedDate,
          title: event.title,
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
  }, [eventRecords]);

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
        setEventError('Uzupełnij nazwę i datę wydarzenia.');
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

        const insertedEvent = {
          ...data,
          participants: (data.participants ?? []) as DashboardEventParticipant[],
          notes: typeof data.notes === 'string' ? data.notes : null,
        } as DashboardEvent;

        setEventRecords((prev) => [...prev, insertedEvent]);
        setIsAddEventOpen(false);
        resetEventForm();
        void router.refresh();
      } catch (insertionError) {
        console.error('Nie udało się zapisać wydarzenia', insertionError);
        setEventError('Nie udało się zapisać wydarzenia. Spróbuj ponownie.');
      } finally {
        setEventSubmitting(false);
      }
    },
    [eventDate, eventNotes, eventTitle, isRecurring, participants, profileId, resetEventForm, router]
  );

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
          <div className="flex items-center justify-between gap-3">
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
            <Link
              href="/dashboard/sizes"
              className="text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              Zobacz wszystkie
            </Link>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {quickSizeTiles.map((tile) => (
              <button
                key={tile.categoryId}
                type="button"
                onClick={() => {
                  const targetCategory = tile.primaryCategory;
                  const params = new URLSearchParams();
                  if (tile.productTypeId) {
                    params.set('productType', tile.productTypeId);
                  }
                  if (tile.quickCategoryId) {
                    params.set('quickCategory', tile.quickCategoryId);
                  }
                  const query = params.toString();
                  router.push(`/dashboard/garments/add/${targetCategory}${query ? `?${query}` : ''}`);
                }}
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
        {shouldShowDataGaps ? (
          <SectionCard>
            <div className="flex items-center justify-between gap-3 pb-2">
              <div>
                <h2 className="text-lg font-semibold text-foreground sm:text-xl">Uzupełnij wymiary ciała</h2>
                <p className="text-sm text-muted-foreground">
                  Zacznij od najważniejszych pomiarów, aby dopasowania i rekomendacje były jeszcze trafniejsze.
                </p>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {missingMeasurements.length} / {totalRequiredDefinitions}
              </span>
            </div>
            <div className="grid gap-3 pt-2 md:grid-cols-3">
              {missingMeasurements.map((definition) => (
                <button
                  type="button"
                  key={definition.id}
                  onClick={() => setActiveBodyMeasurementDefinition(definition)}
                  className="data-gap-card flex h-full flex-col rounded-[26px] border border-dashed border-border/60 bg-[var(--surface-interactive)] px-6 py-5 text-left text-sm transition hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                >
                  <h3 className="text-base font-semibold text-foreground">{definition.label}</h3>
                <p className="mt-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Po co?</span>
                  <br />
                  {definition.purpose}
                </p>
                </button>
              ))}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard>
          <div className="flex items-center justify-between gap-3 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">Nadchodzące wydarzenia</h2>
              <p className="text-sm text-muted-foreground">
                Przygotuj się z wyprzedzeniem – zobacz, ile dni zostało do ważnych okazji.
              </p>
            </div>
          <button
            type="button"
            onClick={() => setIsAddEventOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
            </svg>
            Dodaj wydarzenie
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
                    aria-label="Przewiń wydarzenia w lewo"
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
                    aria-label="Przewiń wydarzenia w prawo"
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
              <h3 className="text-base font-semibold text-foreground">Brak zaplanowanych wydarzeń</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Dodaj pierwsze wydarzenie, aby zawsze mieć wgląd w nadchodzące okazje.
              </p>
            </div>
          )}
        </SectionCard>

        <section className="grid gap-6">
          <div className="flex flex-col gap-6">
            <SectionCard>
              <h2 className="pb-4 text-lg font-semibold text-foreground sm:text-xl">Ostatnia aktywność</h2>
              <div className="space-y-3">
                {activityItems.map((item) => (
                  <div key={item.id} className="list-chip flex items-center gap-3 rounded-2xl p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      {item.icon}
                    </div>
                    <p className="text-sm text-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <RecentActivity />
          </div>
        </section>

      {isAddEventOpen ? (
        <ModalShell onClose={handleCloseEventModal} maxWidth="max-w-2xl">
          <form onSubmit={handleEventSubmit} className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">Dodaj wydarzenie</h3>
              <p className="text-sm text-muted-foreground">
                Zapisz nadchodzącą okazję i zaproś osoby, którym chcesz sprawić idealny prezent.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Data wydarzenia <span className="text-destructive">*</span>
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
                  Nazwa wydarzenia <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="np. Urodziny Kasi"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notatki (opcjonalnie)</label>
              <textarea
                value={eventNotes}
                onChange={(event) => setEventNotes(event.target.value)}
                rows={3}
                placeholder="Co warto pamiętać przy przygotowaniach, preferencje obdarowywanej osoby..."
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
              Wydarzenie cykliczne (np. urodziny, imieniny)
            </label>

            {eventError ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {eventError}
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Lista uczestników</h4>
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                  </svg>
                  Dodaj osobę
                </button>
              </div>

              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="rounded-2xl border border-border/60 bg-[var(--surface-interactive)] p-4"
                  >
                    <div className="flex items-center justify-between pb-2">
                      <p className="text-sm font-semibold text-foreground">Osoba {index + 1}</p>
                      {participants.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="text-xs font-medium text-destructive transition hover:text-destructive/80"
                        >
                          Usuń
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">
                          Imię
                        </label>
                        <input
                          type="text"
                          value={participant.firstName}
                          onChange={(event) =>
                            handleParticipantChange(participant.id, 'firstName', event.target.value)
                          }
                          placeholder="np. Anna"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">
                          Nazwisko
                        </label>
                        <input
                          type="text"
                          value={participant.lastName}
                          onChange={(event) =>
                            handleParticipantChange(participant.id, 'lastName', event.target.value)
                          }
                          placeholder="np. Kowalska"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">
                          Telefon
                        </label>
                        <input
                          type="tel"
                          value={participant.phone}
                          onChange={(event) =>
                            handleParticipantChange(participant.id, 'phone', event.target.value)
                          }
                          placeholder="np. +48 600 600 600"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">
                          Email
                        </label>
                        <input
                          type="email"
                          value={participant.email}
                          onChange={(event) =>
                            handleParticipantChange(participant.id, 'email', event.target.value)
                          }
                          placeholder="np. anna@example.com"
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
                <h4 className="text-sm font-semibold text-foreground">Dodaj z Kręgu zaufanych</h4>
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
                Anuluj
              </button>
              <button
                type="submit"
                disabled={eventSubmitting || !eventDate || !eventTitle.trim()}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {eventSubmitting ? 'Zapisywanie...' : 'Zapisz wydarzenie'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {selectedCalendarEvent ? (() => {
        const eventDate = new Date(selectedCalendarEvent.eventDateISO);
        const formattedDate = eventDate.toLocaleDateString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const diffDays = Math.max(0, Math.ceil((eventDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)));
        const countdownText = diffDays === 0 ? 'Wydarzenie zaplanowane na dziś' : diffDays === 1 ? 'Pozostał 1 dzień' : `Pozostało ${diffDays} dni`;
        const userEvent = selectedCalendarEvent.userEvent;
        const participants = (userEvent?.participants ?? []) as DashboardEventParticipant[];
        const visibleParticipants = participants.filter((participant) =>
          participant.firstName || participant.lastName || participant.email || participant.phone
        );

        return (
          <ModalShell onClose={handleCloseEventDetails} maxWidth="max-w-xl">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">{selectedCalendarEvent.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formattedDate} · {selectedCalendarEvent.context}
                </p>
                <p className="text-sm font-medium text-primary">{countdownText}</p>
                {selectedCalendarEvent.kind === 'user' && userEvent?.is_recurring ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Cykliczne wydarzenie
                  </span>
                ) : null}
              </div>

              {selectedCalendarEvent.kind === 'user' ? (
                <div className="space-y-6">
                  {userEvent?.notes ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Notatki</p>
                      <p>{userEvent.notes}</p>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Lista uczestników</h4>
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
                          const fallbackName = name || participant.email || `Uczestnik ${index + 1}`;
                          return (
                            <li key={`${participant.email ?? participant.phone ?? index}`} className="rounded-xl border border-border/50 bg-[var(--surface-interactive)] px-4 py-3 text-sm text-foreground">
                              <p className="font-semibold">{fallbackName}</p>
                              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                                {participant.email ? <p>E-mail: {participant.email}</p> : null}
                                {participant.phone ? <p>Telefon: {participant.phone}</p> : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="rounded-xl border border-dashed border-border/60 bg-[var(--surface-interactive)] px-4 py-3 text-sm text-muted-foreground">
                        Nie dodano jeszcze żadnych uczestników.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-[var(--surface-interactive)] px-4 py-4 text-sm text-muted-foreground">
                  To wydarzenie zostało dodane automatycznie. Możesz zapisać dodatkowe informacje, dodając własne wydarzenie z listą uczestników i notatkami.
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCloseEventDetails}
                  className="rounded-full border border-border/60 px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  Zamknij
                </button>
              </div>
            </div>
          </ModalShell>
        );
      })()
        : null}

      {activeBodyMeasurementDefinition && (
        <ModalShell onClose={() => setActiveBodyMeasurementDefinition(null)} maxWidth="max-w-xl">
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