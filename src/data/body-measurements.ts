import type { BodyMeasurements } from '@/lib/types';

export type BodyMeasurementUnit = 'cm' | 'mm';

export type BodyMeasurementDefinition = {
  id: string;
  label: string;
  purpose: string;
  how: string[];
  unit: BodyMeasurementUnit;
  fields: Array<keyof BodyMeasurements>;
  required?: boolean;
  femaleOnly?: boolean;
  deriveValue?: (data: BodyMeasurements | null) => number | null;
  mapValue?: (value: number) => Partial<BodyMeasurements>;
};

const DEFAULT_REQUIRED = true;

export const BODY_MEASUREMENT_DEFINITIONS: BodyMeasurementDefinition[] = [
  {
    id: 'height',
    label: 'Wzrost',
    purpose: 'Dobór długości ubrań, tabele wzrostowe, rajstopy.',
    how: [
      'Stań boso plecami do ściany, pięty/pośladki/łopatki przy ścianie.',
      'Ustaw głowę prosto (płaszczyzna frankfurcka).',
      'Połóż książkę na czubku głowy, zaznacz punkt na ścianie i zmierz do podłogi.',
    ],
    unit: 'cm',
    fields: ['height_cm'],
  },
  {
    id: 'chest',
    label: 'Obwód klatki piersiowej',
    purpose: 'T-shirty, bluzy, swetry, kurtki, marynarki.',
    how: [
      'Stań luźno, wypuść powietrze.',
      'Owiń taśmę przez najszerszą część klatki, pod pachami, poziomo.',
      'Złącz końce bez ściskania i odczytaj.',
    ],
    unit: 'cm',
    fields: ['chest_cm'],
  },
  {
    id: 'waist',
    label: 'Obwód talii',
    purpose: 'Spodnie, spódnice, taliowanie sukienek/płaszczy.',
    how: [
      'Znajdź najwęższy punkt tułowia (zwykle nad pępkiem).',
      'Owiń taśmę poziomo, przylegająco, bez wciągania brzucha.',
      'Odczytaj przy naturalnym oddechu.',
    ],
    unit: 'cm',
    fields: ['waist_natural_cm'],
  },
  {
    id: 'waist_pants',
    label: 'Obwód pasa (do spodni)',
    purpose: 'Jeansy, chinosy, spodnie garniturowe – dopasowanie w miejscu, w którym faktycznie je nosisz.',
    how: [
      'Stań swobodnie i zlokalizuj linię, na której zwykle nosisz spodnie.',
      'Owiń taśmę poziomo wokół ciała, pilnując by nie opadała z tyłu.',
      'Nie wciągaj brzucha; pozostaw niewielki luz odpowiadający Twoim preferencjom komfortu.',
    ],
    unit: 'cm',
    fields: ['waist_pants_cm'],
  },
  {
    id: 'hips',
    label: 'Obwód bioder',
    purpose: 'Jeansy/spodnie, spódnice, sukienki, stroje kąpielowe.',
    how: [
      'Stań ze złączonymi stopami.',
      'Owiń taśmę przez najszerszą część pośladków, poziomo.',
      'Upewnij się, że taśma nie opada z tyłu; odczytaj.',
    ],
    unit: 'cm',
    fields: ['hips_cm'],
  },
  {
    id: 'shoulder',
    label: 'Szerokość barków',
    purpose: 'Koszule, marynarki, okrycia wierzchnie.',
    how: [
      'Stań prosto; poproś kogoś o pomoc.',
      'Przyłóż taśmę do końca jednego barku (wyrostek barkowy).',
      'Poprowadź w linii prostej do końca drugiego barku i odczytaj.',
    ],
    unit: 'cm',
    fields: ['shoulder_cm'],
  },
  {
    id: 'sleeve',
    label: 'Długość rękawa',
    purpose: 'Koszule, marynarki, kurtki, swetry/bluzy.',
    how: [
      'Lekko ugnij łokieć (~15°).',
      'Zmierz od krawędzi barku do nadgarstka po zewnętrznej stronie ręki.',
      'Opcjonalnie: bark → szczyt łokcia → nadgarstek (dwa odcinki).',
    ],
    unit: 'cm',
    fields: ['sleeve_cm'],
  },
  {
    id: 'neck',
    label: 'Obwód szyi / kołnierzyka',
    purpose: 'Rozmiar kołnierzyka koszul.',
    how: [
      'Owiń taśmę u podstawy szyi, gdzie leży kołnierzyk.',
      'Wsuń palec pod taśmę (1–2 cm luzu).',
      'Odczytaj wynik.',
    ],
    unit: 'cm',
    fields: ['neck_cm'],
  },
  {
    id: 'bust',
    label: 'Obwód w biuście',
    purpose: 'Sukienki, bluzki/top-y, swetry, stroje kąpielowe.',
    how: [
      'Stań prosto, oddychaj swobodnie.',
      'Owiń taśmę przez pełnię biustu, poziomo.',
      'Zadbaj, by taśma nie opadała z tyłu; odczytaj bez ścisku.',
    ],
    unit: 'cm',
    fields: ['bust_cm'],
    femaleOnly: true,
    required: false,
  },
  {
    id: 'underbust',
    label: 'Obwód pod biustem',
    purpose: 'Biustonosze (obwód), topy sportowe, stroje jednoczęściowe.',
    how: [
      'Owiń taśmę ciasno tuż pod biustem, poziomo.',
      'Zrób wydech i dociągnij taśmę (bez bólu).',
      'Odczytaj w cm.',
    ],
    unit: 'cm',
    fields: ['underbust_cm'],
    femaleOnly: true,
    required: false,
  },
  {
    id: 'torso_girth',
    label: 'Długość tułowia (torso girth)',
    purpose: 'Jumpsuity/kombinezony, stroje jednoczęściowe.',
    how: [
      'Przyłóż początek taśmy w dołku szyi (przód).',
      'Poprowadź taśmę między nogami do punktu na karku (zamknij pętlę).',
      'Utrzymaj taśmę przy ciele; odczytaj całkowitą długość pętli.',
    ],
    unit: 'cm',
    fields: ['torso_girth_cm'],
  },
  {
    id: 'inseam',
    label: 'Długość wewnętrzna nogawki (inseam)',
    purpose: 'Wszystkie spodnie/jeansy (długość).',
    how: [
      'Stań prosto, boso.',
      'Przyłóż taśmę w kroku (szew) i prowadź po wewnętrznej stronie do kostki.',
      'Odczytaj do punktu, gdzie chcesz, by kończyła się nogawka.',
    ],
    unit: 'cm',
    fields: ['inseam_cm'],
  },
  {
    id: 'thigh',
    label: 'Obwód uda',
    purpose: 'Krój spodni i komfort w udzie.',
    how: [
      'Stań swobodnie.',
      'Owiń taśmę wokół najszerszego miejsca uda, poziomo.',
      'Nie ściskaj; odczytaj.',
    ],
    unit: 'cm',
    fields: ['thigh_cm'],
  },
  {
    id: 'foot_length',
    label: 'Długość stopy',
    purpose: 'Rozmiary obuwia i wkładek.',
    how: [
      'Ustaw piętę przy ścianie, stopa na kartce.',
      'Zaznacz czubek najdłuższego palca.',
      'Zmierz od ściany do zaznaczenia i zapisz w centymetrach (powtórz dla obu stóp, weź większą wartość).',
    ],
    unit: 'cm',
    fields: ['foot_left_cm', 'foot_right_cm'],
    deriveValue: (data) => {
      if (!data) return null;
      return data.foot_left_cm ?? data.foot_right_cm ?? null;
    },
    mapValue: (value) => ({
      foot_left_cm: value,
      foot_right_cm: value,
    }),
  },
  {
    id: 'foot_width',
    label: 'Szerokość / tęgość stopy',
    purpose: 'Dobór butów do szerokości przodostopia.',
    how: [
      'Stań, obciąż równomiernie stopy.',
      'Owiń taśmę przez najszerszą część śródstopia lub zmierz szerokość „na płasko”.',
      'Zapisz obwód albo szerokość w cm.',
    ],
    unit: 'cm',
    fields: ['foot_width_cm'],
  },
  {
    id: 'finger',
    label: 'Obwód palca',
    purpose: 'Rozmiary pierścionków (mapowanie EU/US/UK).',
    how: [
      'Owiń pasek papieru/taśmę u podstawy palca.',
      'Zaznacz punkt styku, rozwiń i zmierz długość.',
      'Mierz wieczorem i przy ciepłych dłoniach; weź większą z dwóch prób.',
    ],
    unit: 'mm',
    fields: ['finger_circumference_mm'],
  },
  {
    id: 'wrist',
    label: 'Obwód nadgarstka',
    purpose: 'Bransoletki, zegarki/smartwatche (długość paska).',
    how: [
      'Owiń taśmę nad kością nadgarstka (promieniową).',
      'Dodaj preferowany luz (0–2 cm).',
      'Zapisz wynik i preferencję dopasowania.',
    ],
    unit: 'cm',
    fields: ['wrist_cm'],
  },
  {
    id: 'hand_circumference',
    label: 'Obwód dłoni (bez kciuka)',
    purpose: 'Główny parametr rękawiczek.',
    how: [
      'Rozluźnij dłoń, palce razem.',
      'Owiń taśmę wokół kostek (knuckles), nie obejmując kciuka.',
      'Zaciśnij lekko pięść, sprawdź, czy nie uciska; odczytaj.',
    ],
    unit: 'cm',
    fields: ['hand_cm'],
  },
  {
    id: 'hand_length',
    label: 'Długość dłoni',
    purpose: 'Dodatkowa kalibracja rękawic (sport/robocze).',
    how: [
      'Oprzyj początek taśmy na linii nadgarstka (wewnętrzna strona).',
      'Prowadź do czubka środkowego palca po prostej.',
      'Odczytaj w cm.',
    ],
    unit: 'cm',
    fields: ['hand_length_cm'],
  },
  {
    id: 'head',
    label: 'Obwód głowy',
    purpose: 'Czapki, kapelusze, czapki „fitted”.',
    how: [
      'Ułóż taśmę 1–2 cm nad brwiami, nad uszami.',
      'Poprowadź poziomo wokół największego obwodu głowy.',
      'Złącz końcówki bez ucisku i odczytaj.',
    ],
    unit: 'cm',
    fields: ['head_cm'],
  },
];

export function getBodyMeasurementValue(
  definition: BodyMeasurementDefinition,
  data: BodyMeasurements | null
): number | null {
  if (!data) {
    return null;
  }

  if (definition.deriveValue) {
    return definition.deriveValue(data);
  }

  for (const field of definition.fields) {
    const value = data[field];
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
  }

  return null;
}

export function createBodyMeasurementUpdate(
  definition: BodyMeasurementDefinition,
  value: number
): Partial<BodyMeasurements> {
  if (definition.mapValue) {
    return definition.mapValue(value);
  }

  const updates = definition.fields.reduce<Record<string, number | null>>((acc, field) => {
    acc[field as string] = value;
    return acc;
  }, {});

  return updates as Partial<BodyMeasurements>;
}

export function isBodyMeasurementComplete(
  definition: BodyMeasurementDefinition,
  data: BodyMeasurements | null
): boolean {
  if (!data) {
    return false;
  }

  return definition.fields.every((field) => {
    const value = data[field];
    return typeof value === 'number' && !Number.isNaN(value);
  });
}

export function isDefinitionRequired(definition: BodyMeasurementDefinition): boolean {
  if (definition.required === undefined) {
    return DEFAULT_REQUIRED && !definition.femaleOnly;
  }
  return definition.required;
}

