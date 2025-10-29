'use client';

import { GlobalHeader } from "@/components/global-header";
import { QuickActions } from "@/components/quick-actions";
import { SizeOverview } from "@/components/size-overview";
import { GiftsAndOccasions } from "@/components/gifts-and-occasions";
import { MissionsReminders } from "@/components/missions-reminders";
import { TrustedCircle } from "@/components/trusted-circle";
import { RecentActivity } from "@/components/recent-activity";
import type { Measurement, MeasurementSummary, Category, Garment, SizeLabel, GarmentType, UserRole } from "@/lib/types";

// Mapping of garment types to Polish names
const GARMENT_TYPE_NAMES: Record<GarmentType, string> = {
  // Tops
  tshirt: 'Koszulka',
  shirt_casual: 'Koszula casualowa',
  shirt_formal: 'Koszula formalna',
  sweater: 'Sweter',
  hoodie: 'Bluza',
  blazer: 'Marynarka',
  jacket: 'Kurtka',
  coat: 'Płaszcz/Parka',
  // Bottoms
  jeans: 'Jeansy',
  pants_casual: 'Spodnie casualowe',
  pants_formal: 'Spodnie garniturowe',
  shorts: 'Szorty',
  skirt: 'Spódnica',
  // Footwear
  sneakers: 'Sneakersy',
  dress_shoes: 'Buty wizytowe',
  boots: 'Kozaki/Botki',
  sandals: 'Sandały',
  slippers: 'Kapcie',
  // Underwear (headwear category)
  bra: 'Biustonosz',
  underwear: 'Majtki',
  socks: 'Skarpety',
  // Accessories
  belt: 'Pasek',
  scarf: 'Szalik',
  gloves: 'Rękawiczki',
  cap: 'Czapka z daszkiem',
  hat: 'Kapelusz/Czapka',
  jewelry: 'Biżuteria (ogólna)',
  necklace: 'Naszyjnik',
  bracelet: 'Bransoletka',
  ring: 'Pierścionek',
  earrings: 'Kolczyki',
  // Other
  other: 'Inne',
};

type HomePageProps = {
  measurements: Measurement[];
  summary: MeasurementSummary | null;
  userName?: string | null;
  userRole?: UserRole;
  avatarUrl?: string | null;
  garments?: Garment[];
  sizeLabels?: SizeLabel[];
};

// Helper to format garment size for display
function formatGarmentSize(garment: Garment): string {
  const size = garment.size as any;

  if (size.size) {
    // Generic size (M, L, XL, etc.)
    return size.size;
  } else if (size.collar_cm) {
    // Formal shirt
    return `${size.collar_cm}cm ${size.fit_type}`;
  } else if (size.waist_inch) {
    // Jeans
    return `${size.waist_inch}/${size.length_inch}`;
  } else if (size.size_eu) {
    // Shoes
    return `EU ${size.size_eu}`;
  } else if (size.size_mm) {
    // Ring
    const sideLabel = size.side === 'left' ? 'L' : 'P';
    const partLabel = size.body_part === 'hand' ? 'dł' : 'st';
    const fingerLabels: Record<string, string> = {
      thumb: 'kciuk',
      index: 'wskazuj.',
      middle: 'środ.',
      ring: 'serdecz.',
      pinky: 'mały'
    };
    const fingerLabel = fingerLabels[size.finger] || size.finger;
    return `${size.size_mm}mm (${sideLabel} ${partLabel}, ${fingerLabel})`;
  }

  return 'N/A';
}

// Helper to get latest sizes per category from garments and size labels
function getLatestSizesByCategory(
  measurements: Measurement[],
  garments: Garment[] = [],
  sizeLabels: SizeLabel[] = []
) {
  const sizeMap = new Map<Category, {
    value: string;
    isOutdated: boolean;
    count: number;
    garmentTypeName?: string;
  }>();

  // New logic: For each category, show favorite OR most recent garment
  // Group garments by category
  const garmentsByCategory = garments.reduce((acc: any, g: any) => {
    if (!acc[g.category]) {
      acc[g.category] = [];
    }
    acc[g.category].push(g);
    return acc;
  }, {} as Record<Category, any[]>);

  // For each category, pick the garment to display
  (Object.entries(garmentsByCategory) as [string, any[]][]).forEach(([category, categoryGarments]) => {
    // First, try to find a favorite in this category
    let garmentToShow = categoryGarments.find((g: any) => g.is_favorite);

    // If no favorite, take the most recent one (first in array, since already sorted by created_at desc)
    if (!garmentToShow) {
      garmentToShow = categoryGarments[0];
    }

    if (garmentToShow) {
      const sizeStr = formatGarmentSize(garmentToShow);
      const brandName = garmentToShow.brands?.name || garmentToShow.brand_name;
      const displayValue = brandName
        ? `${sizeStr} (${brandName})`
        : sizeStr;

      const garmentTypeName = garmentToShow.type ? GARMENT_TYPE_NAMES[garmentToShow.type as GarmentType] : undefined;

      sizeMap.set(category as Category, {
        value: displayValue,
        isOutdated: false,
        count: categoryGarments.length,
        garmentTypeName
      });
    }
  });

  // Add size labels (medium priority)
  sizeLabels.forEach((sl) => {
    if (!sizeMap.has(sl.category)) {
      const displayValue = sl.brand_name
        ? `${sl.label} (${sl.brand_name})`
        : sl.label;

      sizeMap.set(sl.category, {
        value: displayValue,
        isOutdated: false,
        count: 1
      });
    }
  });

  // Add measurements (lowest priority - fallback)
  measurements.forEach((m) => {
    if (!sizeMap.has(m.category)) {
      const formattedValues = Object.entries(m.values)
        .filter(([, v]) => v !== undefined)
        .map(([key, value]) => `${key}: ${(value as number).toFixed(1)} cm`)
        .join(", ");

      const recordedDate = new Date(m.recorded_at);
      const monthsAgo = (Date.now() - recordedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const isOutdated = monthsAgo > 6;

      sizeMap.set(m.category, {
        value: formattedValues,
        isOutdated,
        count: 1
      });
    }
  });

  return Array.from(sizeMap.entries()).map(([category, data]) => ({
    category,
    value: data.count > 1 ? `${data.value} +${data.count - 1}` : data.value,
    isOutdated: data.isOutdated,
    garmentTypeName: data.garmentTypeName,
  }));
}

export function HomePage({
  measurements,
  summary,
  userName,
  userRole = 'free',
  avatarUrl,
  garments = [],
  sizeLabels = []
}: HomePageProps) {
  // Prepare data for size overview
  const sizes = getLatestSizesByCategory(measurements, garments, sizeLabels);

  // Map userRole to plan for components that use subscription plans
  // Admin users get all premium_plus features
  const plan: 'free' | 'premium' | 'premium_plus' =
    userRole === 'admin' ? 'premium_plus' : userRole as 'free' | 'premium' | 'premium_plus';

  // Placeholder data for other sections (will be replaced with real data later)
  const circleMembers: Array<{ name: string; categories: string[] }> = [
    // Example: { name: "Anna", categories: ["Koszulki", "Spodnie", "Buty"] }
  ];

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader userName={userName} role={userRole} avatarUrl={avatarUrl} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="space-y-8">
          {/* Quick Actions - Full Width */}
          <QuickActions />

          {/* Size Overview - Full Width */}
          <SizeOverview sizes={sizes} plan={plan} />

          {/* Missions & Gifts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <MissionsReminders />
            <GiftsAndOccasions />
          </div>

          {/* Circle & Activity Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TrustedCircle members={circleMembers} plan={plan} />
            <RecentActivity />
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
        <div className="flex items-center justify-around px-4 py-3">
          {['home', 'sizes', 'gifts', 'circle', 'settings'].map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className="flex flex-col items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="capitalize">{item}</span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
