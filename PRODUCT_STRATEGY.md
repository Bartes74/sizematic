# SizeSync: Product Strategy & Design System
## Comprehensive Build Plan

**Version**: 1.0
**Date**: October 2025
**Status**: Foundation Phase

---

## 🎯 Executive Summary

SizeSync to premium, offline-first PWA dla zarządzania garderobą z filozofią **"Concierge Intelligence"** - aplikacja która nigdy nie pyta dwukrotnie, obserwuje wzorce, przewiduje potrzeby i działa jak osobisty asystent premium.

---

## 👥 Target Audience Analysis

### Primary User Persona: "Conscious Professional"

**Demographics:**
- **Age**: 28-45 lat
- **Gender**: 60% kobiety, 40% mężczyźni (rosnący segment)
- **Income**: Powyżej średniej krajowej (gotowość płacenia za premium)
- **Tech Savviness**: Wysoka - early adopters, użytkownicy iPhone/flagship Android

**Psychographics:**
- **Values**: Jakość > ilość, zrównoważony rozwój, minimalizm
- **Lifestyle**: Busy professionals, remote workers, digital nomads
- **Pain Points**:
  - Zmarnowany czas na zakupy online (zwroty, niewłaściwe rozmiary)
  - Brak systemu do śledzenia rozmiaru dzieci (szybki wzrost)
  - Trudność z prezentami dla bliskich (nieznane rozmiary)
  - Chaos w szafie - nie wiedzą co mają

**Goals:**
- Minimalizacja fricji przy zakupach
- Zero marnotrawstwa (ekologia + budżet)
- Perfekcyjne dopasowanie zawsze
- Prezenty które pasują za pierwszym razem

### Secondary Personas:

**"Eco-Conscious Minimalist"** (25-35)
- Capsule wardrobe enthusiast
- Sustainability driven
- Prefers quality over quantity

**"Busy Parent"** (30-45)
- Managing sizes for whole family
- Kids growth tracking critical
- Time is most valuable resource

**"Style Enthusiast"** (25-40)
- Fashion-forward but strategic
- Multi-brand shopper
- Values perfect fit and style alignment

---

## 🎨 Design System & Visual Identity

### Color Palette Strategy

Based on 2025 premium minimalist trends and target audience preferences:

#### **Primary Palette: "Sophisticated Neutrals"**

```css
/* Light Mode - Default */
--primary-50:  #FAFAF9;  /* Warm Sand - backgrounds */
--primary-100: #F5F5F4;  /* Soft Stone - secondary bg */
--primary-200: #E7E5E4;  /* Light Taupe - borders */
--primary-300: #D6D3D1;  /* Medium Taupe - disabled */
--primary-700: #44403C;  /* Charcoal - primary text */
--primary-800: #292524;  /* Deep Charcoal - headings */
--primary-900: #1C1917;  /* Midnight - emphasis */

/* Accent Colors - Subtle Premium */
--accent-coral: #FF6B6B;    /* Coral Sunset - CTAs, important */
--accent-sage:  #A8DADC;    /* Soft Sage - success, calm */
--accent-clay:  #E76F51;    /* Terracotta - warnings, warmth */
--accent-slate: #457B9D;    /* Slate Blue - info, trust */

/* Dark Mode */
--dark-bg:      #0A0A0A;    /* True Black - base */
--dark-surface: #1A1A1A;    /* Midnight Charcoal - cards */
--dark-border:  #2A2A2A;    /* Dark Gray - separators */
--dark-text:    #F5F5F4;    /* Warm White - primary text */
--dark-muted:   #A8A8A8;    /* Soft Gray - secondary text */

/* Electric accent for dark mode */
--dark-accent:  #8A4AF3;    /* Electric Violet - premium feel */
```

#### **Rationale:**
- **Muted neutrals** - premium, timeless, nie męczą oczu
- **Nature-inspired accents** - wellness, zrównoważony rozwój
- **High contrast** - accessibility (WCAG AAA)
- **Dark mode native** - battery saving, modern aesthetic

### Typography System

```typescript
// Font Stack
const fonts = {
  display: 'Inter Variable, system-ui, sans-serif',  // Headings - geometric, modern
  body: 'Inter Variable, system-ui, sans-serif',     // Body - same for consistency
  mono: 'JetBrains Mono, Consolas, monospace'       // Data, measurements
}

// Type Scale (modular scale 1.250 - Major Third)
const typeScale = {
  xs:   '0.64rem',   // 10.24px - captions, metadata
  sm:   '0.80rem',   // 12.80px - secondary text
  base: '1.00rem',   // 16px - body
  lg:   '1.25rem',   // 20px - subheadings
  xl:   '1.563rem',  // 25px - headings
  '2xl': '1.953rem', // 31.25px - page titles
  '3xl': '2.441rem'  // 39px - hero
}
```

**Philosophy:** Single font family (Inter Variable) for cleanliness, weight variations for hierarchy.

### Spacing & Layout

```typescript
// 8px base unit system
const spacing = {
  0: '0',
  1: '0.25rem',  // 4px  - tight spacing
  2: '0.5rem',   // 8px  - base unit
  3: '0.75rem',  // 12px - comfortable
  4: '1rem',     // 16px - standard gap
  6: '1.5rem',   // 24px - section spacing
  8: '2rem',     // 32px - large gaps
  12: '3rem',    // 48px - page margins
  16: '4rem'     // 64px - hero spacing
}

// Container widths
const containers = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop (max for content)
}
```

### Component Principles

**Micro-interactions:**
- Subtle hover states (opacity, transform)
- Smooth transitions (200-300ms cubic-bezier)
- Haptic feedback on mobile (vibration API)
- Loading skeletons > spinners

**Glassmorphism touches:**
```css
.premium-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

---

## 🏗️ Technical Architecture

### Core Stack

```
Frontend (PWA):
├─ Next.js 15 (App Router, RSC)
├─ React 19 (Server Components priority)
├─ TypeScript (strict mode)
├─ Tailwind CSS 4 (CSS variables, container queries)
├─ next-intl (i18n - PL/EN)
└─ Framer Motion (animations)

State Management:
├─ React Server Components (server state)
├─ Zustand (client UI state - theme, locale)
└─ TanStack Query (data fetching, caching)

Backend:
├─ Supabase (PostgreSQL + Auth + RLS + Edge Functions)
├─ Stripe (payments, subscriptions)
└─ Resend (transactional emails)

Offline-First:
├─ Service Worker (Workbox)
├─ IndexedDB (Dexie.js)
└─ Background Sync API
```

### Database Schema (Extended from BUILD_PLAN.md)

**New Tables for Intelligence Layer:**

```sql
-- User Behavior Tracking
create table user_interactions (
  id uuid primary key,
  user_id uuid references auth.users,
  interaction_type text, -- 'measurement_added', 'brand_searched', etc.
  context jsonb,          -- flexible metadata
  occurred_at timestamptz,

  -- Indexes for analytics
  index idx_interactions_user_type on (user_id, interaction_type),
  index idx_interactions_occurred on (occurred_at)
);

-- Smart Predictions
create table predictions (
  id uuid primary key,
  user_id uuid references auth.users,
  prediction_type text,  -- 'size_change', 'purchase_intent', etc.
  target_entity_id uuid, -- profile_id, category, etc.
  confidence_score decimal(3,2),
  predicted_at timestamptz,
  expires_at timestamptz,
  metadata jsonb
);

-- Memory System (Never Ask Twice)
create table user_preferences (
  id uuid primary key,
  user_id uuid references auth.users,
  preference_key text,    -- 'preferred_brands', 'size_stability', etc.
  preference_value jsonb,
  learned_from text,      -- how we discovered this
  confidence decimal(3,2),
  last_updated timestamptz,

  unique(user_id, preference_key)
);

-- Family/Circle Management
create table family_members (
  id uuid primary key,
  owner_id uuid references auth.users,
  name text,
  relationship text,      -- 'child', 'partner', 'parent'
  birth_date date,        -- for growth predictions
  profile_id uuid references profiles,
  created_at timestamptz
);
```

### Internationalization Strategy

```typescript
// Middleware setup
// middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['pl', 'en'],
  defaultLocale: 'pl',
  localeDetection: true,  // Auto-detect from browser
  localePrefix: 'as-needed' // /en/... only when not default
});

// Messages structure
// messages/pl.json
{
  "onboarding": {
    "welcome": "Witaj w SizeSync",
    "subtitle": "Twój osobisty asystent rozmiarów",
    "cta": "Zacznij za darmo"
  },
  "measurements": {
    "addFirst": "Dodaj pierwszy pomiar",
    "suggestion": "Na podstawie Twojej klatki piersiowej ({chest}cm), sugerujemy rozmiar {size}",
    "neverAskAgain": "Zapisaliśmy Twoją preferencję. Nie zapytamy ponownie."
  }
}
```

### Dark Mode Implementation

```typescript
// Tailwind config with CSS variables
// tailwind.config.ts
export default {
  darkMode: 'class', // Manual toggle
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... rest from color palette above
      }
    }
  }
}

// Theme provider
// providers/theme-provider.tsx
'use client';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.Node }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
```

---

## 🎭 "Concierge Intelligence" - UX Patterns

### Pattern 1: Progressive Profiling

**Bad (Traditional):**
```
❌ Form z 20 polami na start
❌ "Required fields" everywhere
❌ Pytanie o to samo wielokrotnie
```

**Good (Concierge):**
```
✅ Pierwszy ekran: Email + Hasło. Koniec.
✅ Drugi ekran: "Dodaj swój pierwszy pomiar" (opcjonalnie)
   → Podajesz obwód klatki: 96cm
   → System: "To typowo rozmiar L. Zapisujemy?"
✅ Trzeci ekran: "Widzimy że masz iOS. Chcesz notyfikacje?"
   → Zgoda = setup iOS notifications
   → Odmowa = nigdy więcej nie pytamy
```

**Implementation:**
```typescript
// Smart onboarding state machine
const onboardingSteps = [
  {
    id: 'auth',
    required: true,
    fields: ['email', 'password'],
    next: (data) => data.hasChildren ? 'family_setup' : 'first_measurement'
  },
  {
    id: 'first_measurement',
    required: false,
    skipable: true,
    intelligence: (measurement) => {
      const size = inferSizeFromMeasurement(measurement);
      return {
        suggestion: `Based on ${measurement.value}cm chest, we suggest size ${size}`,
        autoSave: ['preferred_measurement_unit', 'likely_size_range']
      };
    }
  }
];
```

### Pattern 2: Contextual Intelligence

**Scenario: Dziecko szybko rośnie**

```typescript
// Background job (Edge Function)
async function detectGrowthSpurt(childId: string) {
  const measurements = await getMeasurements(childId, { last: 3 });

  if (isGrowthAccelerating(measurements)) {
    // DON'T just send notification
    // PREPARE intelligent context

    const lastPurchase = await getLastClothingPurchase(childId);
    const daysElapsed = daysSince(lastPurchase);

    if (daysElapsed > 90) {
      return {
        action: 'suggest_refresh',
        message: {
          pl: `{childName} urósł/a 4cm w ostatnich 2 miesiącach. Sprawdziliśmy - ostatnie zakupy były {daysElapsed} dni temu. Może czas na aktualizację garderoby?`,
          en: `{childName} grew 4cm in the last 2 months. We checked - last purchases were {daysElapsed} days ago. Time for wardrobe refresh?`
        },
        cta: 'See size recommendations',
        metadata: {
          affectedCategories: ['pants', 'shirts'],
          estimatedBudget: calculateOptimalBudget(childId)
        }
      };
    }
  }
}
```

### Pattern 3: Memory System

```typescript
// Every interaction teaches the system
interface UserMemory {
  never_ask_again: string[];  // Questions user declined
  implicit_preferences: {
    brands: { id: string; confidence: number; }[];
    categories: string[];
    shopping_frequency: 'weekly' | 'monthly' | 'seasonal';
  };
  explicit_preferences: {
    notification_hours: [number, number]; // e.g. [9, 21]
    language: 'pl' | 'en';
    units: 'metric' | 'imperial';
  };
  contextual_data: {
    has_children: boolean;
    children_ages?: number[];
    gift_giving_occasions: Array<{
      person: string;
      dates: Date[];
    }>;
  };
}

// Usage example
function shouldAskQuestion(userId: string, questionId: string): boolean {
  const memory = getUserMemory(userId);

  // Hard no
  if (memory.never_ask_again.includes(questionId)) {
    return false;
  }

  // Intelligent decision
  if (questionId === 'add_family_member') {
    // If user has children in memory, never ask again
    return !memory.contextual_data.has_children;
  }

  return true;
}
```

---

## 📱 Responsive Strategy

### Mobile-First Breakpoints

```typescript
const breakpoints = {
  // Mobile (320-767px) - PRIORITY
  mobile: {
    layout: 'single-column',
    navigation: 'bottom-tab-bar',
    interactions: 'thumb-friendly',
    spacing: 'compact'
  },

  // Tablet (768-1023px) - ENHANCED
  tablet: {
    layout: 'adaptive-two-column',
    navigation: 'side-drawer-or-tabs',
    interactions: 'mixed',
    spacing: 'comfortable'
  },

  // Desktop (1024px+) - FULL FEATURES
  desktop: {
    layout: 'multi-column-dashboard',
    navigation: 'persistent-sidebar',
    interactions: 'keyboard-shortcuts',
    spacing: 'spacious'
  }
}
```

### Component Adaptation Examples

```tsx
// Measurement Input - Responsive
function MeasurementInput() {
  return (
    <div className="
      /* Mobile: Full width, large touch targets */
      w-full space-y-4

      /* Tablet: Side-by-side where makes sense */
      md:grid md:grid-cols-2 md:gap-6

      /* Desktop: Inline with labels */
      lg:flex lg:items-center lg:gap-4
    ">
      <Label className="
        text-base md:text-sm lg:text-base
        mb-2 md:mb-0
      ">
        Chest circumference
      </Label>

      <Input
        type="number"
        className="
          h-12 text-lg           /* Mobile: Large for thumb */
          md:h-10 md:text-base   /* Tablet: Standard */
          lg:h-11               /* Desktop: Comfortable */
        "
      />

      {/* Unit toggle - adaptive */}
      <SegmentedControl
        options={['cm', 'in']}
        className="
          w-full md:w-auto      /* Mobile: Full width */
          mt-2 md:mt-0          /* Tablet: Inline */
        "
      />
    </div>
  );
}
```

---

## 🔐 Authentication & Security

### Supabase Auth Configuration

```typescript
// Auth requirements per your specs
const authConfig = {
  passwordRequirements: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    commonPasswordCheck: true  // Prevent "Password123!"
  },

  emailVerification: {
    required: true,
    doubleOptIn: true,  // Your requirement
    expiration: '24h',
    customTemplate: true  // Branded emails via Resend
  },

  mfa: {
    available: true,
    required: false,  // Optional but encouraged
    methods: ['totp', 'sms']
  },

  sessions: {
    duration: '7d',
    refreshToken: true,
    rememberMe: '30d'
  }
}
```

### Email Flow (Double Opt-In)

```
1. User submits email + password
   ↓
2. Account created but INACTIVE
   ↓
3. Email #1: "Potwierdź adres email" (24h expiry)
   ↓
4. User clicks link → Email confirmed
   ↓
5. Email #2: "Witamy w SizeSync!" (welcome email)
   ↓
6. Account ACTIVE - can use app
```

### Password Strength UI

```tsx
function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = calculateStrength(password);

  return (
    <div className="mt-2 space-y-1">
      {/* Visual bar */}
      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            strength.color  // red/yellow/green based on strength
          )}
          style={{ width: `${strength.score}%` }}
        />
      </div>

      {/* Requirements checklist */}
      <div className="text-xs space-y-1">
        <Check done={password.length >= 12}>Minimum 12 znaków</Check>
        <Check done={/[A-Z]/.test(password)}>Wielka litera</Check>
        <Check done={/[0-9]/.test(password)}>Cyfra</Check>
        <Check done={/[!@#$%^&*]/.test(password)}>Znak specjalny</Check>
        {strength.isCommon && (
          <p className="text-red-600">⚠️ To hasło jest zbyt popularne</p>
        )}
      </div>
    </div>
  );
}
```

---

## 🚀 Development Phases

### Phase 0: Foundation (Week 1-2) ← **WE ARE HERE**

**Goals:**
- [x] Repository setup
- [x] Supabase connected
- [x] Vercel deployment pipeline
- [ ] Next-intl configured
- [ ] Dark mode working
- [ ] Design system implemented
- [ ] Auth with double opt-in

**Deliverables:**
- Working app with theme toggle
- Language switcher (PL/EN)
- Login/Register flow
- First "smart" onboarding screen

---

### Phase 1: Core Intelligence (Week 3-4)

**Goals:**
- Memory system (user_preferences table)
- First measurement with auto-suggestion
- Brand size conversion (basic)
- User interaction tracking

**Deliverables:**
- User can add measurement → system suggests size
- "Never ask again" logic working
- Dashboard showing 1-2 insights

---

### Phase 2: Family & Predictions (Week 5-6)

**Goals:**
- Family member management
- Growth tracking for children
- Predictive notifications
- Timeline view

**Deliverables:**
- Add child → automatic growth monitoring
- First predictive notification ("Time for new pants?")
- Visual timeline of size changes

---

### Phase 3: Gift & Sharing (Week 7-8)

**Goals:**
- Secret Giver implementation
- Gift links with password
- Trust Circle basics
- Wishlist system

**Deliverables:**
- Generate shareable link
- Gift mode (hide sizes, show only wishlist)
- Simple permission system

---

### Phase 4: Premium Features (Week 9-10)

**Goals:**
- Stripe integration
- Subscription tiers
- Advanced analytics
- Micro-missions

**Deliverables:**
- Working payment flow
- Premium features locked behind paywall
- Gamification basics

---

### Phase 5: Polish & Launch (Week 11-12)

**Goals:**
- Performance optimization
- Accessibility audit
- Copy refinement
- Beta testing

**Deliverables:**
- WCAG AAA compliant
- < 2s TTI on 3G
- Onboarding completion rate > 70%
- Ready for App Store submission

---

## 📊 Success Metrics

### Technical KPIs
- **TTI (Time to Interactive)**: < 2.5s on 3G
- **FCP (First Contentful Paint)**: < 1.5s
- **Lighthouse Score**: 95+ all categories
- **Bundle Size**: < 200KB initial JS

### Product KPIs
- **Onboarding Completion**: > 70%
- **D7 Retention**: > 50%
- **Feature Discovery**: Avg 3+ features used in first session
- **Never Ask Twice** success: 0 duplicate questions in user logs

### Business KPIs (Post-Launch)
- **Free → Paid Conversion**: 5-10%
- **Referral Rate**: 20%+
- **Session Duration**: 3-5min average
- **Weekly Active Users**: Track growth

---

## 🎯 Next Steps - Immediate Actions

1. **Configure next-intl** (30 min)
2. **Implement theme provider** (20 min)
3. **Build design system tokens** (1h)
4. **Create auth flow with double opt-in** (2h)
5. **Design first "smart" screen** (Together - 1h)

---

## 📝 Notes

**Philosophy Check:**
- ✅ Never ask twice
- ✅ Mobile-first but desktop-complete
- ✅ Premium feel (colors, animations, copy)
- ✅ Bilingual (PL/EN)
- ✅ Intelligence over complexity
- ✅ Delight in details

**Technical Check:**
- ✅ Offline-first architecture
- ✅ Type-safe end-to-end
- ✅ Accessible (WCAG AAA goal)
- ✅ Performant (web vitals)
- ✅ Scalable (RLS + Edge Functions)

---

**Ready to build?** Start with foundation → iterate fast → measure everything → delight users.
