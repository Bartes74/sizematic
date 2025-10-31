import type { Mission } from '@/lib/types';

export type MissionLocaleContent = {
  title: string;
  summary: string;
  rewardShort: string;
  ctaLabel?: string;
};

export type MissionDefinition = {
  code: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'seasonal' | 'team' | 'referral' | 'streak';
  repeatable: boolean;
  cooldownDays: number;
  season?: {
    startMonth: number;
    endMonth: number;
  } | null;
  triggers: string[];
  rules: {
    criterion: string;
    progress: string;
    validation: string[];
    timeframe?: string;
    notes?: string[];
  };
  rewards: {
    xp: number;
    badges?: string[];
    unlocks?: string[];
    premiumDays?: number;
    freezeTokens?: number;
    boosters?: Array<{ type: string; value: string }>;
    extras?: string[];
  };
  repeatability?: string;
  antiCheat: string[];
  translations: Record<'pl' | 'en', MissionLocaleContent>;
  display: {
    rewardSummary: string;
    requirementsSummary: string;
  };
};

export const MISSION_DEFINITIONS: MissionDefinition[] = [
  {
    code: 'ROZRUCH_7_7',
    category: 'core',
    difficulty: 'medium',
    repeatable: false,
    cooldownDays: 0,
    season: null,
    triggers: ['ITEM_CREATED'],
    rules: {
      criterion: 'Dodawaj co najmniej 1 nowy element dziennie przez 7 kolejnych dni.',
      progress: 'Licznik dni streaku (0-7), reset przy dniu bez aktywności.',
      validation: ['Każdy element musi mieć wypełnione ≥3 kluczowe pola lub 1 pole krytyczne dla typu.'],
      timeframe: '7 kolejnych dni.',
    },
    rewards: {
      xp: 100,
      badges: ['ROZGRZANY'],
    },
    repeatability: 'Jednorazowa na konto.',
    antiCheat: ['Deduplikacja wpisów w oknie 24h.', 'Filtrowanie „dummy” wartości bez realnych danych.'],
    translations: {
      pl: {
        title: 'Rozruch 7/7',
        summary: 'Dodawaj nowe elementy codziennie przez tydzień, aby rozgrzać swoją garderobę.',
        rewardShort: '+100 XP • Odznaka „Rozgrzany”',
        ctaLabel: 'Rozpocznij serię',
      },
      en: {
        title: 'Kick-off 7/7',
        summary: 'Add at least one new item every day for seven days to build the habit.',
        rewardShort: '+100 XP • “Warmed Up” badge',
        ctaLabel: 'Start streak',
      },
    },
    display: {
      rewardSummary: '100 XP + odznaka „Rozgrzany”',
      requirementsSummary: 'Dodawaj min. 1 element dziennie przez 7 dni z pełnymi danymi.',
    },
  },
  {
    code: 'SIX_PILLARS',
    category: 'core',
    difficulty: 'hard',
    repeatable: true,
    cooldownDays: 90,
    season: null,
    triggers: ['ITEM_CREATED'],
    rules: {
      criterion: 'Dodaj co najmniej po jednym wpisie w każdej z 6 kluczowych kategorii.',
      progress: 'Checklist per kategoria: Odzież wierzchnia, Góra, Dół, Bielizna, Biżuteria, Akcesoria.',
      validation: ['Każdy wpis zgodny ze schematem obowiązkowych pól dla danej kategorii.'],
    },
    rewards: {
      xp: 150,
      unlocks: ['theme_unlock'],
    },
    repeatability: 'Powtarzalna co 90 dni.',
    antiCheat: ['Weryfikacja kompletności pól względem schematu kategorii.'],
    translations: {
      pl: {
        title: 'Sześć Filarów',
        summary: 'Uzupełnij wszystkie kategorie, by odblokować pełen obraz garderoby.',
        rewardShort: '+150 XP • Nowy motyw',
        ctaLabel: 'Wypełnij kategorie',
      },
      en: {
        title: 'Six Pillars',
        summary: 'Log at least one item in each of the six wardrobe pillars.',
        rewardShort: '+150 XP • Theme unlock',
        ctaLabel: 'Complete pillars',
      },
    },
    display: {
      rewardSummary: '150 XP + odblokowanie motywu',
      requirementsSummary: '1 wpis w każdej z 6 kategorii z kompletnymi polami.',
    },
  },
  {
    code: 'CLOSET_100',
    category: 'core',
    difficulty: 'hard',
    repeatable: true,
    cooldownDays: 365,
    season: null,
    triggers: ['ITEM_CREATED', 'PROFILE_UPDATED'],
    rules: {
      criterion: 'Wypełnij wszystkie typy oznaczone w profilu jako „Noszę”.',
      progress: 'Licznik „zrobione / wymagane” na podstawie listy typów aktywnych przy starcie misji.',
      validation: ['Zablokuj zmiany listy „Noszę” po starcie (snapshot).'],
      notes: ['Dopuszczalna zmiana listy „Noszę” maksymalnie raz na miesiąc.'],
    },
    rewards: {
      xp: 200,
      premiumDays: 7,
    },
    repeatability: 'Możliwe raz w roku.',
    antiCheat: ['Snapshot listy typów przy rozpoczęciu.', 'Monitorowanie zmian listy „Noszę”.'],
    translations: {
      pl: {
        title: 'Szafa 100%',
        summary: 'Uzupełnij wszystkie typy, które deklarujesz, że nosisz.',
        rewardShort: '+200 XP • 7 dni Premium',
        ctaLabel: 'Dokończ profil',
      },
      en: {
        title: 'Closet 100%',
        summary: 'Complete every garment type you marked as “I wear”.',
        rewardShort: '+200 XP • 7 days Premium',
        ctaLabel: 'Complete profile',
      },
    },
    display: {
      rewardSummary: '200 XP + 7 dni Premium',
      requirementsSummary: 'Uzupełnij wszystkie aktywne typy „Noszę”.',
    },
  },
  {
    code: 'GOLDEN_WAIST',
    category: 'core',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 90,
    season: null,
    triggers: ['ITEM_CREATED', 'ITEM_UPDATED'],
    rules: {
      criterion: 'Uzupełnij pomiary talii dla wszystkich typów „Dół”.',
      progress: 'Checklist dla typów: jeansy, materiałowe, spodnie garniturowe itd.',
      validation: ['Brak wartości „0/—/n/a”.'],
    },
    rewards: {
      xp: 75,
      badges: ['TAILORED_FRAME'],
    },
    repeatability: 'Co kwartał.',
    antiCheat: ['Odrzucaj wartości zerowe i symbole zastępcze.'],
    translations: {
      pl: {
        title: 'Złota Talia',
        summary: 'Uzbrój każdy typ spodni w dokładny wymiar talii.',
        rewardShort: '+75 XP • Ramka „Tailored”',
      },
      en: {
        title: 'Golden Waistline',
        summary: 'Record the waist measurement for every bottoms type.',
        rewardShort: '+75 XP • “Tailored” frame',
      },
    },
    display: {
      rewardSummary: '75 XP + ramka „Tailored”',
      requirementsSummary: 'Komplet talii dla wszystkich typów „Dół”.',
    },
  },
  {
    code: 'CHEST_MASTER',
    category: 'core',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 90,
    season: null,
    triggers: ['ITEM_CREATED', 'ITEM_UPDATED'],
    rules: {
      criterion: 'Podaj klatkę piersiową w ≥5 różnych podtypach kategorii „Góra”.',
      progress: 'Zbiór unikalnych podtypów spełniających wymóg.',
      validation: ['Każdy wpis musi pochodzić z innego podtypu.'],
    },
    rewards: {
      xp: 75,
    },
    repeatability: 'Co kwartał.',
    antiCheat: ['Wymóg różnych podtypów – brak duplikatów.'],
    translations: {
      pl: {
        title: 'Mistrz Klatki',
        summary: 'Zmierz klatkę w pięciu różnych typach ubrań górnych.',
        rewardShort: '+75 XP',
      },
      en: {
        title: 'Chest Master',
        summary: 'Log chest measurements for five distinct tops subtypes.',
        rewardShort: '+75 XP',
      },
    },
    display: {
      rewardSummary: '75 XP',
      requirementsSummary: 'Klatka w 5 różnych podtypach kategorii „Góra”.',
    },
  },
  {
    code: 'STEP_INTO_BOOTS',
    category: 'seasonal',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 365,
    season: { startMonth: 11, endMonth: 2 },
    triggers: ['ITEM_CREATED', 'ITEM_UPDATED'],
    rules: {
      criterion: 'Dla kozaków: rozmiar buta + wkładka + obwód łydki.',
      progress: 'Checklist kompletności pól dla typu obuwia „kozak”.',
      validation: ['Zakresy: wkładka 20-35 cm, łydka 28-50 cm.'],
    },
    rewards: {
      xp: 80,
    },
    repeatability: 'Sezonowo (listopad-luty).',
    antiCheat: ['Walidacja zakresów cm.', 'Sprawdzaj datę w sezonie.'],
    translations: {
      pl: {
        title: 'Krok w Kozaki',
        summary: 'Przygotuj kozakową metryczkę: rozmiar, wkładka i obwód łydki.',
        rewardShort: '+80 XP',
      },
      en: {
        title: 'Step into Boots',
        summary: 'Capture size, insole and calf circumference for your boots.',
        rewardShort: '+80 XP',
      },
    },
    display: {
      rewardSummary: '80 XP',
      requirementsSummary: 'Rozmiar + wkładka + łydka dla kozaków (XI–II).',
    },
  },
  {
    code: 'RING_SNIPER',
    category: 'core',
    difficulty: 'easy',
    repeatable: true,
    cooldownDays: 180,
    season: null,
    triggers: ['ITEM_CREATED', 'ITEM_UPDATED'],
    rules: {
      criterion: 'Zanotuj rozmiar pierścionka dla trzech różnych palców.',
      progress: 'Licznik palców.',
      validation: ['Każdy palec unikalny.'],
    },
    rewards: {
      xp: 60,
      badges: ['RING_STICKER'],
    },
    repeatability: 'Co 6 miesięcy.',
    antiCheat: ['Wymóg różnych palców.'],
    translations: {
      pl: {
        title: 'Palec w Punkt',
        summary: 'Zabezpiecz rozmiar pierścionka dla trzech palców.',
        rewardShort: '+60 XP • Naklejka',
      },
      en: {
        title: 'Ring Precision',
        summary: 'Store the ring size for three different fingers.',
        rewardShort: '+60 XP • Sticker',
      },
    },
    display: {
      rewardSummary: '60 XP + sticker',
      requirementsSummary: '3 unikalne palce z rozmiarem pierścionka.',
    },
  },
  {
    code: 'WRIST_PRO',
    category: 'core',
    difficulty: 'easy',
    repeatable: true,
    cooldownDays: 90,
    season: null,
    triggers: ['ITEM_CREATED', 'ITEM_UPDATED'],
    rules: {
      criterion: 'Podaj obwód nadgarstka + (długość bransoletki lub szerokość paska zegarka).',
      progress: 'Sprawdzenie kompletności pól.',
      validation: ['Jednostki w cm/mm.'],
    },
    rewards: {
      xp: 70,
    },
    repeatability: 'Co kwartał.',
    antiCheat: ['Normalizacja jednostek do cm/mm.'],
    translations: {
      pl: {
        title: 'Nadgarstek Pro',
        summary: 'Dokładnie zmierz nadgarstek oraz ulubioną biżuterię.',
        rewardShort: '+70 XP',
      },
      en: {
        title: 'Wrist Pro',
        summary: 'Measure wrist circumference plus a watch or bracelet spec.',
        rewardShort: '+70 XP',
      },
    },
    display: {
      rewardSummary: '70 XP',
      requirementsSummary: 'Obwód + długość/szerokość akcesorium (cm/mm).',
    },
  },
  {
    code: 'BIKINI_BALANCE',
    category: 'seasonal',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 365,
    season: { startMonth: 4, endMonth: 8 },
    triggers: ['ITEM_CREATED'],
    rules: {
      criterion: 'Dodaj bikini (góra + dół) wraz z preferencją kroju.',
      progress: 'Komplet pary + preferencja.',
      validation: ['Góra i dół dodane w ciągu 7 dni.'],
    },
    rewards: {
      xp: 80,
      extras: ['summer_card'],
    },
    repeatability: 'Raz w roku.',
    antiCheat: ['Wymóg dodania obu części w 7 dni.', 'Sprawdzaj okno sezonowe.'],
    translations: {
      pl: {
        title: 'Bikini Balance',
        summary: 'Zadbaj o dopasowanie bikini z pełnymi preferencjami kroju.',
        rewardShort: '+80 XP • Karta „Lato”',
      },
      en: {
        title: 'Bikini Balance',
        summary: 'Log top & bottom sizes plus cut preference.',
        rewardShort: '+80 XP • “Summer” card',
      },
    },
    display: {
      rewardSummary: '80 XP + karta „Lato”',
      requirementsSummary: 'Komplet bikini + preferencja kroju (IV–VIII).',
    },
  },
  {
    code: 'SUIT_UP',
    category: 'core',
    difficulty: 'hard',
    repeatable: true,
    cooldownDays: 365,
    season: null,
    triggers: ['ITEM_CREATED', 'ITEM_UPDATED'],
    rules: {
      criterion: 'Marynarka: ramiona, klatka, rękaw + spodnie: talia, biodra, inseam.',
      progress: '2 części kompletu garniturowego.',
      validation: ['Wszystkie pola obu części muszą być kompletne.'],
    },
    rewards: {
      xp: 120,
      unlocks: ['sets_feature'],
    },
    repeatability: 'Raz na rok.',
    antiCheat: ['Sprawdź kompletność zestawu (marynarka + spodnie).'],
    translations: {
      pl: {
        title: 'Suit-Up!',
        summary: 'Skrojony garnitur wymaga pełnych danych marynarki i spodni.',
        rewardShort: '+120 XP • Odblokowanie „Zestawy”',
      },
      en: {
        title: 'Suit Up!',
        summary: 'Record the full suit measurements to unlock outfit sets.',
        rewardShort: '+120 XP • Unlock “Sets”',
      },
    },
    display: {
      rewardSummary: '120 XP + odblokowanie „Zestawy”',
      requirementsSummary: 'Pełne pomiary marynarki i spodni garniturowych.',
    },
  },
  {
    code: 'TRACKSUIT_DUO',
    category: 'core',
    difficulty: 'easy',
    repeatable: true,
    cooldownDays: 180,
    season: null,
    triggers: ['ITEM_CREATED'],
    rules: {
      criterion: 'Dodaj zestaw dresowy (góra + dół) w jednym wpisie zestawu.',
      progress: '1 komplet.',
      validation: ['Nie liczyć dwóch osobnych wpisów bez powiązania.'],
    },
    rewards: {
      xp: 60,
    },
    repeatability: 'Dwa razy w roku.',
    antiCheat: ['Wymóg wpisu typu „zestaw”.'],
    translations: {
      pl: {
        title: 'Dresowy Duet',
        summary: 'Zaloguj kompletny zestaw dresowy jako jedną pozycję.',
        rewardShort: '+60 XP',
      },
      en: {
        title: 'Tracksuit Duo',
        summary: 'Capture a tracksuit as a linked set.',
        rewardShort: '+60 XP',
      },
    },
    display: {
      rewardSummary: '60 XP',
      requirementsSummary: 'Komplet dres (góra + dół) jako zestaw.',
    },
  },
  {
    code: 'PAJAMA_PRIME',
    category: 'core',
    difficulty: 'easy',
    repeatable: true,
    cooldownDays: 180,
    season: null,
    triggers: ['ITEM_CREATED'],
    rules: {
      criterion: 'Dodaj komplet piżamy z pełnymi wymiarami.',
      progress: 'Checklist: góra + dół.',
      validation: ['Uzupełnij w ciągu 72 godzin od rozpoczęcia.'],
    },
    rewards: {
      xp: 50,
    },
    repeatability: 'Dwa razy do roku.',
    antiCheat: ['Termin 72h na dokończenie pól.'],
    translations: {
      pl: {
        title: 'Piżama Prime',
        summary: 'Uzupełnij ulubioną piżamę o wszystkie potrzebne dane.',
        rewardShort: '+50 XP',
      },
      en: {
        title: 'Pajama Prime',
        summary: 'Log a complete pajama set with all key attributes.',
        rewardShort: '+50 XP',
      },
    },
    display: {
      rewardSummary: '50 XP',
      requirementsSummary: 'Komplet piżamy z pełnymi polami w 72h.',
    },
  },
  {
    code: 'QUICK_SIZE',
    category: 'core',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 14,
    season: null,
    triggers: ['ITEM_UPDATED', 'MEASUREMENT_UPDATED'],
    rules: {
      criterion: 'Uzupełnij 5 braków w mniej niż 5 minut od wejścia w misję.',
      progress: 'Timer + licznik braków.',
      validation: ['Zablokuj edycję pól spoza wymaganych podczas trwania okna.'],
    },
    rewards: {
      xp: 40,
    },
    repeatability: 'Co 14 dni.',
    antiCheat: ['Blokada edycji poza wymaganymi polami.', 'Monitorowanie czasu realizacji.'],
    translations: {
      pl: {
        title: 'Szybki Rozmiar',
        summary: 'Uzupełnij pięć braków zanim upłynie pięć minut.',
        rewardShort: '+40 XP',
      },
      en: {
        title: 'Quick Size',
        summary: 'Fill five missing fields within five minutes.',
        rewardShort: '+40 XP',
      },
    },
    display: {
      rewardSummary: '40 XP',
      requirementsSummary: '5 braków < 5 minut od startu misji.',
    },
  },
  {
    code: 'SPRING_REFRESH',
    category: 'seasonal',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 365,
    season: { startMonth: 3, endMonth: 4 },
    triggers: ['ITEM_UPDATED'],
    rules: {
      criterion: 'Zaktualizuj 10 istniejących wpisów w marcu/kwietniu.',
      progress: 'Licznik aktualizacji.',
      validation: ['Każda aktualizacja musi zmienić realne wartości.'],
    },
    rewards: {
      xp: 90,
      badges: ['SPRING_BADGE'],
    },
    repeatability: 'Raz w roku (marzec/kwiecień).',
    antiCheat: ['Wymagaj zmiany wartości pól.', 'Sprawdzaj okno sezonowe.'],
    translations: {
      pl: {
        title: 'Wiosenne Przeglądy',
        summary: 'Odśwież swoje wpisy na wiosnę – 10 aktualizacji w marcu lub kwietniu.',
        rewardShort: '+90 XP • Odznaka sezonowa',
      },
      en: {
        title: 'Spring Refresh',
        summary: 'Update ten existing items during March or April.',
        rewardShort: '+90 XP • Seasonal badge',
      },
    },
    display: {
      rewardSummary: '90 XP + odznaka sezonowa',
      requirementsSummary: '10 aktualizacji w marcu/kwietniu z realną zmianą.',
    },
  },
  {
    code: 'FALL_FIT',
    category: 'seasonal',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 365,
    season: { startMonth: 8, endMonth: 11 },
    triggers: ['ITEM_CREATED'],
    rules: {
      criterion: 'Dodaj dwie okrycia wierzchnie z pełnymi polami przed 1 listopada.',
      progress: '0/2 okrycia.',
      validation: ['Dwa różne wpisy.'],
    },
    rewards: {
      xp: 90,
    },
    repeatability: 'Raz w roku.',
    antiCheat: ['Wymóg dwóch unikalnych wpisów okryć.', 'Termin do 1 listopada.'],
    translations: {
      pl: {
        title: 'Jesienny Fit',
        summary: 'Przygotuj się na chłód – dwa okrycia wierzchnie z kompletnymi danymi.',
        rewardShort: '+90 XP',
      },
      en: {
        title: 'Autumn Fit',
        summary: 'Log two outerwear pieces with full measurements before November.',
        rewardShort: '+90 XP',
      },
    },
    display: {
      rewardSummary: '90 XP',
      requirementsSummary: '2 okrycia z kompletem pól przed 1 listopada.',
    },
  },
  {
    code: 'BRA_MATTERS',
    category: 'core',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 180,
    season: null,
    triggers: ['ITEM_CREATED'],
    rules: {
      criterion: 'Obwód pod biustem + miseczka + preferowany krój.',
      progress: 'Komplet pól.',
      validation: ['Walidacja formatu np. 75C.'],
    },
    rewards: {
      xp: 80,
    },
    repeatability: 'Co 6 miesięcy.',
    antiCheat: ['Walidacja formatu miseczki.', 'Sprawdź czy wszystkie pola uzupełnione.'],
    translations: {
      pl: {
        title: 'Miseczka ma znaczenie',
        summary: 'Zadbaj o dokładny pomiar biustonoszy i preferencji kroju.',
        rewardShort: '+80 XP',
      },
      en: {
        title: 'Cup Matters',
        summary: 'Record underbust, cup and preferred cut for your bras.',
        rewardShort: '+80 XP',
      },
    },
    display: {
      rewardSummary: '80 XP',
      requirementsSummary: 'Obwód + miseczka + preferencja kroju.',
    },
  },
  {
    code: 'WISHLIST_PRO',
    category: 'core',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 90,
    season: null,
    triggers: ['WISHLIST_ITEM_CREATED'],
    rules: {
      criterion: 'Dodaj 5 pozycji na Wishliście powiązanych z rozmiarami.',
      progress: '0/5 unikalnych pozycji.',
      validation: ['Każda pozycja powiązana z konkretnym rozmiarem / metką.'],
    },
    rewards: {
      xp: 70,
      extras: ['shareable_card'],
    },
    repeatability: 'Co kwartał.',
    antiCheat: ['Wymagaj unikalnych pozycji.', 'Weryfikacja powiązania z rozmiarem.'],
    translations: {
      pl: {
        title: 'Prezentownik PRO',
        summary: 'Rozbuduj wishlistę o pięć pozycji z przypisanymi rozmiarami.',
        rewardShort: '+70 XP • Udostępnialna karta',
      },
      en: {
        title: 'Giftlist Pro',
        summary: 'Add five wishlist items linked with size data.',
        rewardShort: '+70 XP • Shareable card',
      },
    },
    display: {
      rewardSummary: '70 XP + karta udostępnialna',
      requirementsSummary: '5 pozycji na wishliście z przypisanymi rozmiarami.',
    },
  },
  {
    code: 'SECRET_HELPER',
    category: 'core',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 60,
    season: null,
    triggers: ['PROFILE_SHARED'],
    rules: {
      criterion: 'Udostępnij profil rozmiarów jednej osobie (unikalny odbiorca).',
      progress: 'Share event + potwierdzenie otwarcia.',
      validation: ['Odbiorca potwierdzony (ping).'],
    },
    rewards: {
      xp: 100,
    },
    repeatability: 'Co 60 dni.',
    antiCheat: ['Wymagaj unikalnego odbiorcy (hash).'],
    translations: {
      pl: {
        title: 'Sekretny Pomocnik',
        summary: 'Wyślij swój profil rozmiarów zaufanej osobie.',
        rewardShort: '+100 XP',
      },
      en: {
        title: 'Secret Helper',
        summary: 'Share your size profile with a trusted contact.',
        rewardShort: '+100 XP',
      },
    },
    display: {
      rewardSummary: '100 XP',
      requirementsSummary: 'Udostępnij profil 1 osobie (unikalny odbiorca).',
    },
  },
  {
    code: 'INVITE_AND_MEASURE',
    category: 'referral',
    difficulty: 'hard',
    repeatable: true,
    cooldownDays: 0,
    season: null,
    triggers: ['INVITE_SENT', 'INVITE_ACCEPTED', 'INVITED_USER_PROGRESS'],
    rules: {
      criterion: 'Zaproś osobę, która w 14 dni doda 10 wpisów.',
      progress: 'Workflow: zaproszenie → akceptacja → milestone 10 wpisów.',
      validation: ['Monitorowanie progresu zaproszonego.'],
    },
    rewards: {
      xp: 150,
      extras: ['invitee_xp:50'],
    },
    repeatability: 'Do 5 razy w roku.',
    antiCheat: ['Kontrola device/IP/kyc-lite.', 'Sprawdź aktywność zaproszonej osoby.'],
    translations: {
      pl: {
        title: 'Zaproś i Zmierz',
        summary: 'Zaproszony znajomy ma 14 dni na dodanie 10 wpisów.',
        rewardShort: '+150 XP (Ty) • +50 XP (On/Ona)',
      },
      en: {
        title: 'Invite & Measure',
        summary: 'Invite someone who logs ten items within 14 days.',
        rewardShort: '+150 XP (you) • +50 XP (invitee)',
      },
    },
    display: {
      rewardSummary: '150 XP dla Ciebie + 50 XP dla zaproszonego',
      requirementsSummary: 'Invitee: 10 wpisów w 14 dni.',
    },
  },
  {
    code: 'TEAM_SIZES',
    category: 'team',
    difficulty: 'hard',
    repeatable: true,
    cooldownDays: 90,
    season: null,
    triggers: ['CIRCLE_PROGRESS'],
    rules: {
      criterion: 'Krąg (do 5 osób) dodaje łącznie 100 pól w 7 dni, każdy min. 10 pól.',
      progress: 'Licznik zespołowy + indywidualny.',
      validation: ['Monitoruj wkład każdego członka.', 'Wymóg <=5 osób.'],
    },
    rewards: {
      xp: 200,
      badges: ['TEAM_BADGE'],
    },
    repeatability: 'Co kwartał.',
    antiCheat: ['Monitorowanie udziału jednostek.', 'Ograniczenie liczby osób.'],
    translations: {
      pl: {
        title: 'Drużyna Rozmiarów',
        summary: 'Razem z kręgiem uzupełnijcie 100 pól w tydzień.',
        rewardShort: '+200 XP/os • Odznaka zespołowa',
      },
      en: {
        title: 'Size Squad',
        summary: 'As a circle, fill 100 fields in seven days.',
        rewardShort: '+200 XP per member • Team badge',
      },
    },
    display: {
      rewardSummary: '200 XP/os + wspólna odznaka',
      requirementsSummary: 'Krąg ≤5 osób, razem 100 pól w 7 dni (min. 10/os).',
    },
  },
  {
    code: 'JEWEL_MAP',
    category: 'core',
    difficulty: 'easy',
    repeatable: true,
    cooldownDays: 90,
    season: null,
    triggers: ['ITEM_CREATED'],
    rules: {
      criterion: 'Dodaj 3 wpisy biżuterii z wartościami w mm/cm.',
      progress: '0/3 wpisy.',
      validation: ['Pola liczbowe w mm/cm.'],
    },
    rewards: {
      xp: 60,
    },
    repeatability: 'Co kwartał.',
    antiCheat: ['Waliduj, że wartości liczbowe w mm/cm.'],
    translations: {
      pl: {
        title: 'Mapa Milimetra',
        summary: 'Dokładnie zmierz trzy elementy biżuterii.',
        rewardShort: '+60 XP',
      },
      en: {
        title: 'Millimeter Map',
        summary: 'Log three jewellery items with exact mm/cm values.',
        rewardShort: '+60 XP',
      },
    },
    display: {
      rewardSummary: '60 XP',
      requirementsSummary: '3 wpisy biżuterii z wartościami w mm/cm.',
    },
  },
  {
    code: 'HAT_MEASURE',
    category: 'core',
    difficulty: 'easy',
    repeatable: true,
    cooldownDays: 365,
    season: null,
    triggers: ['ITEM_CREATED', 'MEASUREMENT_UPDATED'],
    rules: {
      criterion: 'Obwód głowy + jedna czapka + jeden kapelusz.',
      progress: '0/2 akcesoria + metryka głowy.',
      validation: ['Różne podtypy.'],
    },
    rewards: {
      xp: 50,
    },
    repeatability: 'Raz w roku.',
    antiCheat: ['Wymagaj różnych podtypów akcesoriów.'],
    translations: {
      pl: {
        title: 'Kapelusz Miarą',
        summary: 'Zadbaj o dokładne dane dla czapki i kapelusza.',
        rewardShort: '+50 XP',
      },
      en: {
        title: 'Hat Measure',
        summary: 'Measure your head and add one beanie plus one hat.',
        rewardShort: '+50 XP',
      },
    },
    display: {
      rewardSummary: '50 XP',
      requirementsSummary: 'Obwód głowy + 1 czapka + 1 kapelusz.',
    },
  },
  {
    code: 'GLOVE_STANDARD',
    category: 'core',
    difficulty: 'easy',
    repeatable: true,
    cooldownDays: 365,
    season: null,
    triggers: ['ITEM_CREATED'],
    rules: {
      criterion: 'Obwód dłoni + rozmiar rękawic.',
      progress: 'Komplet pól.',
      validation: ['Zakresy sensowne.'],
    },
    rewards: {
      xp: 50,
    },
    repeatability: 'Raz w roku.',
    antiCheat: ['Walidacja zakresów.'],
    translations: {
      pl: {
        title: 'Rękawiczny Standard',
        summary: 'Zmierz dokładnie dłoń i ulubione rękawice.',
        rewardShort: '+50 XP',
      },
      en: {
        title: 'Glove Standard',
        summary: 'Log hand circumference and glove size.',
        rewardShort: '+50 XP',
      },
    },
    display: {
      rewardSummary: '50 XP',
      requirementsSummary: 'Obwód dłoni + rozmiar rękawic.',
    },
  },
  {
    code: 'BELT_PERFECT',
    category: 'core',
    difficulty: 'easy',
    repeatable: true,
    cooldownDays: 180,
    season: null,
    triggers: ['ITEM_CREATED'],
    rules: {
      criterion: 'Rozmiar paska + długość do ulubionej dziurki.',
      progress: 'Komplet pól.',
      validation: ['Jednostki cm/cale.'],
    },
    rewards: {
      xp: 40,
    },
    repeatability: 'Dwa razy w roku.',
    antiCheat: ['Walidacja jednostek, brak pustych wartości.'],
    translations: {
      pl: {
        title: 'Pasek Idealny',
        summary: 'Zanotuj dokładną długość swojego ulubionego paska.',
        rewardShort: '+40 XP',
      },
      en: {
        title: 'Perfect Belt',
        summary: 'Capture belt size and hole distance.',
        rewardShort: '+40 XP',
      },
    },
    display: {
      rewardSummary: '40 XP',
      requirementsSummary: 'Rozmiar paska + długość do dziurki.',
    },
  },
  {
    code: 'FIT_PHOTO',
    category: 'core',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 90,
    season: null,
    triggers: ['PHOTO_ADDED'],
    rules: {
      criterion: 'Dodaj 3 zdjęcia referencyjne do różnych wpisów.',
      progress: '0/3 zdjęcia.',
      validation: ['EXIF/dowód wielkości pliku (opcjonalnie).'],
    },
    rewards: {
      xp: 80,
    },
    repeatability: 'Co kwartał.',
    antiCheat: ['Sprawdzanie metadanych zdjęć.', 'Odrzucanie duplikatów.'],
    translations: {
      pl: {
        title: 'Fit Foto',
        summary: 'Dodaj zdjęcia referencyjne, aby ułatwić wybór rozmiarów.',
        rewardShort: '+80 XP',
      },
      en: {
        title: 'Fit Photo',
        summary: 'Upload three reference photos for different items.',
        rewardShort: '+80 XP',
      },
    },
    display: {
      rewardSummary: '80 XP',
      requirementsSummary: '3 zdjęcia referencyjne do różnych wpisów.',
    },
  },
  {
    code: 'ACCURACY_PLUS_MINUS_ONE',
    category: 'core',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 30,
    season: null,
    triggers: ['PURCHASE_LOGGED'],
    rules: {
      criterion: 'Dodaj 3 porównania zakupów z feedbackiem dopasowania.',
      progress: '0/3 porównania.',
      validation: ['Wymagaj feedbacku „idealnie/za małe/za duże”.'],
    },
    rewards: {
      xp: 70,
      extras: ['fit_accuracy'],
    },
    repeatability: 'Co 30 dni.',
    antiCheat: ['Opcjonalny upload paragonu/ID zamówienia.', 'Walidacja realnego zakupu.'],
    translations: {
      pl: {
        title: 'Dokładność +/-1',
        summary: 'Analizuj zakupy, aby poprawić precyzję rekomendacji.',
        rewardShort: '+70 XP • wskaźnik precyzji',
      },
      en: {
        title: 'Accuracy +/-1',
        summary: 'Log purchase feedback to fine tune your fit accuracy.',
        rewardShort: '+70 XP • Fit accuracy boost',
      },
    },
    display: {
      rewardSummary: '70 XP + wskaźnik precyzji profilu',
      requirementsSummary: '3 porównania zakupów z feedbackiem.',
    },
  },
  {
    code: 'STREAK_RESCUER',
    category: 'streak',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 30,
    season: null,
    triggers: ['STREAK_UPDATED'],
    rules: {
      criterion: 'Utrzymaj streak 14 dni, aby zdobyć Freeze.',
      progress: 'Licznik streaku.',
      validation: ['Freeze działa tylko z wyprzedzeniem, max 2 posiadane.'],
    },
    rewards: {
      xp: 0,
      freezeTokens: 1,
    },
    repeatability: 'Raz w miesiącu.',
    antiCheat: ['Freeze aktywowany jedynie przed końcem dnia.', 'Monitoruj prawdziwą aktywność dzienną.'],
    translations: {
      pl: {
        title: 'Streak Ratownik',
        summary: 'Utrzymaj serię 14 dni, zdobądź Freeze i uratuj streak w trudnym dniu.',
        rewardShort: '+1 Freeze',
      },
      en: {
        title: 'Streak Saver',
        summary: 'Keep a 14-day streak to earn a Freeze token.',
        rewardShort: '+1 Freeze token',
      },
    },
    display: {
      rewardSummary: '1 Freeze (max 2 na koncie)',
      requirementsSummary: '14-dniowa seria aktywności.',
    },
  },
  {
    code: 'SIZE_ON_THE_WAY',
    category: 'core',
    difficulty: 'medium',
    repeatable: true,
    cooldownDays: 60,
    season: null,
    triggers: ['ITEM_CREATED', 'ITEM_UPDATED'],
    rules: {
      criterion: 'Po 20 wpisach uzupełnij 10 pól z podpowiedzi systemu.',
      progress: '0/10 pól (tylko suggested=true).',
      validation: ['Liczone wyłącznie pola oznaczone jako sugerowane.'],
    },
    rewards: {
      xp: 90,
    },
    repeatability: 'Co 60 dni.',
    antiCheat: ['Wymóg flagged „suggested=true”.'],
    translations: {
      pl: {
        title: 'Rozmiar w Drodze',
        summary: 'Skorzystaj z podpowiedzi systemu, aby dodać brakujące dane.',
        rewardShort: '+90 XP',
      },
      en: {
        title: 'Size on the Way',
        summary: 'Complete ten system-suggested fields after logging 20 items.',
        rewardShort: '+90 XP',
      },
    },
    display: {
      rewardSummary: '90 XP',
      requirementsSummary: '10 sugerowanych pól po 20 wyjściowych wpisach.',
    },
  },
  {
    code: 'CLOSET_SCANNER',
    category: 'core',
    difficulty: 'hard',
    repeatable: true,
    cooldownDays: 90,
    season: null,
    triggers: ['ITEM_CREATED', 'ITEM_UPDATED'],
    rules: {
      criterion: '10 szybkich wpisów (tytuł + kluczowe pole), potem uzupełnienie braków w 72h.',
      progress: 'Etap 1/2.',
      validation: ['Okno 72h na uzupełnienie.', 'Tylko jedno pole podczas szybkiego logowania.'],
    },
    rewards: {
      xp: 100,
    },
    repeatability: 'Co kwartał.',
    antiCheat: ['Monitoruj okno 72h.', 'Wymuszaj uzupełnienie braków.'],
    translations: {
      pl: {
        title: 'Skaner Szafy',
        summary: 'Szybko wprowadź 10 pozycji, a następnie uzupełnij szczegóły.',
        rewardShort: '+100 XP',
      },
      en: {
        title: 'Closet Scanner',
        summary: 'Rapid log ten items and fill missing details within 72h.',
        rewardShort: '+100 XP',
      },
    },
    display: {
      rewardSummary: '100 XP',
      requirementsSummary: '10 szybkich wpisów + uzupełnienie w 72h.',
    },
  },
  {
    code: 'SIZE_AMBASSADOR',
    category: 'referral',
    difficulty: 'hard',
    repeatable: true,
    cooldownDays: 90,
    season: null,
    triggers: ['INVITE_SENT', 'INVITE_ACCEPTED', 'INVITED_USER_PROGRESS'],
    rules: {
      criterion: 'Zaproś 3 osoby w 7 dni, każda doda 10 wpisów.',
      progress: 'Licznik osób + milestone wpisów.',
      validation: ['Anty-fraud, unikalne urządzenia.'],
    },
    rewards: {
      xp: 300,
      premiumDays: 30,
    },
    repeatability: 'Co kwartał.',
    antiCheat: ['Kontrola fraudowa (device fingerprint).', 'Monitoruj aktywność invitee.'],
    translations: {
      pl: {
        title: 'Ambasador Rozmiarów',
        summary: 'Sprowadź trzech aktywnych znajomych w tydzień.',
        rewardShort: '+300 XP • 30 dni Premium',
      },
      en: {
        title: 'Size Ambassador',
        summary: 'Invite three friends in a week; each must add ten items.',
        rewardShort: '+300 XP • 30 days Premium',
      },
    },
    display: {
      rewardSummary: '300 XP + 30 dni Premium',
      requirementsSummary: '3 zaproszonych w 7 dni, każdy 10 wpisów.',
    },
  },
];

export type MissionSeedRow = {
  mission: Omit<Mission, 'id' | 'created_at' | 'updated_at'> & { id?: string };
  translations: Array<MissionLocaleContent & { locale: 'pl' | 'en' }>;
};

export function buildMissionSeedRows(): MissionSeedRow[] {
  return MISSION_DEFINITIONS.map((definition, index) => {
    const mission: MissionSeedRow['mission'] = {
      code: definition.code,
      category: definition.category,
      difficulty: definition.difficulty,
      repeatable: definition.repeatable,
      cooldown_days: definition.cooldownDays,
      seasonal_start: definition.season ? `${new Date().getFullYear()}-${String(definition.season.startMonth).padStart(2, '0')}-01` : null,
      seasonal_end: definition.season ? `${new Date().getFullYear()}-${String(definition.season.endMonth).padStart(2, '0')}-28` : null,
      rules: {
        triggers: definition.triggers,
        criterion: definition.rules.criterion,
        progress: definition.rules.progress,
        validation: definition.rules.validation,
        timeframe: definition.rules.timeframe,
        notes: definition.rules.notes,
        antiCheat: definition.antiCheat,
      },
      rewards: definition.rewards,
      metadata: {
        rewardSummary: definition.display.rewardSummary,
        requirementsSummary: definition.display.requirementsSummary,
        repeatability: definition.repeatability,
      },
      display_order: index + 1,
    };

    const translations = (Object.entries(definition.translations) as Array<[ 'pl' | 'en', MissionLocaleContent ]>).map(
      ([locale, value]) => ({
        locale,
        title: value.title,
        summary: value.summary,
        rewardShort: value.rewardShort,
        ctaLabel: value.ctaLabel,
      })
    );

    return { mission, translations };
  });
}
