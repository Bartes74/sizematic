import type { Category, GarmentType } from '@/lib/types';

export type QuickCategoryId =
  | 'outerwear'
  | 'tops'
  | 'bottoms'
  | 'lingerie'
  | 'jewelry'
  | 'accessories'
  | 'footwear';

export type ProductFieldType = 'text' | 'number' | 'select' | 'measurement' | 'radio';

export type ProductFieldDefinition = {
  id: string;
  storageKey: string;
  label: string;
  type: ProductFieldType;
  placeholder?: string;
  options?: string[];
  unit?: string;
  required?: boolean;
  measurementId?: string;
  helpText?: string;
  step?: number;
};

export type ProductTypeDefinition = {
  id: string;
  category: QuickCategoryId;
  label: string;
  description?: string;
  garmentTypes: GarmentType[];
  supabaseCategories: Category[];
  fields: ProductFieldDefinition[];
};

const FIT_OPTIONS = ['Dopasowany', 'Regularny', 'Luźny / Oversize'];
const RISE_OPTIONS = ['Niski stan', 'Średni stan', 'Wysoki stan'];
const ZIP_OPTIONS = ['Nierozpinana', 'Rozpinana'];
const CUP_OPTIONS = ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G', 'H'];
const FINGER_OPTIONS = ['Kciuk', 'Wskazujący', 'Środkowy', 'Serdeczny', 'Mały'];
const HAND_ORIENTATION_OPTIONS = ['Lewa', 'Prawa'];
const BODY_PART_OPTIONS = ['Dłoń', 'Stopa'];

const FOOTWEAR_SIZE_FIELDS: ProductFieldDefinition[] = [
  {
    id: 'size_label',
    storageKey: 'size_label',
    label: 'Etykieta rozmiaru',
    type: 'text',
    placeholder: 'np. 41, 42.5',
  },
  {
    id: 'size_eu',
    storageKey: 'size_eu',
    label: 'Rozmiar EU',
    type: 'number',
    step: 0.5,
  },
  {
    id: 'size_us',
    storageKey: 'size_us',
    label: 'Rozmiar US',
    type: 'number',
    step: 0.5,
  },
  {
    id: 'size_uk',
    storageKey: 'size_uk',
    label: 'Rozmiar UK',
    type: 'number',
    step: 0.5,
  },
  {
    id: 'foot_length',
    storageKey: 'foot_length_cm',
    label: 'Długość stopy',
    type: 'measurement',
    unit: 'cm',
    measurementId: 'foot_length',
    helpText: 'Mierz od pięty do najdłuższego palca.',
  },
  {
    id: 'foot_width',
    storageKey: 'foot_width_cm',
    label: 'Szerokość / tęgość stopy',
    type: 'measurement',
    unit: 'cm',
    measurementId: 'foot_width',
  },
];

const OUTERWEAR_TYPES: ProductTypeDefinition[] = [
  {
    id: 'outerwear_kurtka_puchowka',
    category: 'outerwear',
    label: 'Kurtka / puchówka',
    garmentTypes: ['jacket'],
    supabaseCategories: ['outerwear'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. M, L, 42',
      },
      {
        id: 'length_total',
        storageKey: 'length_total_cm',
        label: 'Długość całkowita',
        type: 'number',
        unit: 'cm',
        step: 0.5,
      },
      {
        id: 'fit_preference',
        storageKey: 'fit_preference',
        label: 'Preferencja dopasowania',
        type: 'select',
        options: FIT_OPTIONS,
      },
    ],
  },
  {
    id: 'outerwear_plaszcz_parka_trencz',
    category: 'outerwear',
    label: 'Płaszcz / parka / trencz',
    garmentTypes: ['coat'],
    supabaseCategories: ['outerwear'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. M, L, 42',
      },
      {
        id: 'sleeve_length',
        storageKey: 'sleeve_cm',
        label: 'Długość rękawa',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'sleeve',
        helpText: 'Mierz od szwu na barku do nadgarstka z lekko ugiętym łokciem.',
      },
      {
        id: 'length_total',
        storageKey: 'length_total_cm',
        label: 'Długość całkowita',
        type: 'number',
        unit: 'cm',
        step: 0.5,
      },
      {
        id: 'fit_preference',
        storageKey: 'fit_preference',
        label: 'Preferencja dopasowania',
        type: 'select',
        options: FIT_OPTIONS,
      },
    ],
  },
  {
    id: 'outerwear_kurtka_skorzana',
    category: 'outerwear',
    label: 'Kurtka skórzana / ramoneska',
    garmentTypes: ['jacket'],
    supabaseCategories: ['outerwear'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. M, L, 42',
      },
      {
        id: 'length_total',
        storageKey: 'length_total_cm',
        label: 'Długość całkowita',
        type: 'number',
        unit: 'cm',
        step: 0.5,
      },
    ],
  },
];

const TOPS_TYPES: ProductTypeDefinition[] = [
  {
    id: 'tops_tshirt_longsleeve',
    category: 'tops',
    label: 'T-shirt / longsleeve',
    garmentTypes: ['tshirt'],
    supabaseCategories: ['tops'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. XS, S, M, L, XL',
      },
      {
        id: 'fit_preference',
        storageKey: 'fit_preference',
        label: 'Preferencja dopasowania',
        type: 'select',
        options: FIT_OPTIONS,
      },
    ],
  },
  {
    id: 'tops_koszulka_polo',
    category: 'tops',
    label: 'Koszulka polo',
    garmentTypes: ['tshirt'],
    supabaseCategories: ['tops'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. XS, S, M, L, XL',
      },
    ],
  },
  {
    id: 'tops_bluza',
    category: 'tops',
    label: 'Bluza',
    garmentTypes: ['hoodie'],
    supabaseCategories: ['tops'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. XS, S, M, L, XL',
      },
      {
        id: 'zip_style',
        storageKey: 'zip_style',
        label: 'Rodzaj bluzy',
        type: 'select',
        options: ZIP_OPTIONS,
      },
    ],
  },
  {
    id: 'tops_sweter_kardigan',
    category: 'tops',
    label: 'Sweter / kardigan',
    garmentTypes: ['sweater'],
    supabaseCategories: ['tops'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. XS, S, M, L, XL',
      },
      {
        id: 'fit_preference',
        storageKey: 'fit_preference',
        label: 'Preferencja dopasowania',
        type: 'select',
        options: FIT_OPTIONS,
      },
    ],
  },
  {
    id: 'tops_koszula',
    category: 'tops',
    label: 'Koszula',
    garmentTypes: ['shirt_formal', 'shirt_casual'],
    supabaseCategories: ['tops'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. S, M, 39',
      },
      {
        id: 'chest',
        storageKey: 'chest_cm',
        label: 'Obwód klatki piersiowej',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'chest',
      },
      {
        id: 'sleeve',
        storageKey: 'sleeve_cm',
        label: 'Długość rękawa',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'sleeve',
      },
      {
        id: 'neck',
        storageKey: 'neck_cm',
        label: 'Obwód kołnierzyka',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'neck',
      },
    ],
  },
  {
    id: 'tops_marynarka_garniturowa',
    category: 'tops',
    label: 'Marynarka garniturowa',
    garmentTypes: ['blazer'],
    supabaseCategories: ['tops', 'outerwear'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. 48, 50, M',
      },
      {
        id: 'chest',
        storageKey: 'chest_cm',
        label: 'Obwód klatki piersiowej',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'chest',
      },
      {
        id: 'shoulder',
        storageKey: 'shoulder_cm',
        label: 'Szerokość ramion',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'shoulder',
      },
      {
        id: 'sleeve',
        storageKey: 'sleeve_cm',
        label: 'Długość rękawa',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'sleeve',
      },
      {
        id: 'fit_preference',
        storageKey: 'fit_preference',
        label: 'Preferencja dopasowania',
        type: 'select',
        options: FIT_OPTIONS,
      },
    ],
  },
  {
    id: 'tops_zakiet_biurowy',
    category: 'tops',
    label: 'Żakiet biurowy',
    garmentTypes: ['blazer'],
    supabaseCategories: ['tops', 'outerwear'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. 36, 38, M',
      },
      {
        id: 'chest',
        storageKey: 'chest_cm',
        label: 'Obwód klatki piersiowej',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'chest',
      },
      {
        id: 'waist',
        storageKey: 'waist_cm',
        label: 'Obwód talii',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'waist',
      },
      {
        id: 'shoulder',
        storageKey: 'shoulder_cm',
        label: 'Szerokość ramion',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'shoulder',
      },
      {
        id: 'fit_preference',
        storageKey: 'fit_preference',
        label: 'Preferencja dopasowania',
        type: 'select',
        options: FIT_OPTIONS,
      },
    ],
  },
];

const BOTTOMS_TYPES: ProductTypeDefinition[] = [
  {
    id: 'bottoms_jeans',
    category: 'bottoms',
    label: 'Jeansy',
    garmentTypes: ['jeans'],
    supabaseCategories: ['bottoms'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. 32/34, M',
      },
      {
        id: 'waist',
        storageKey: 'waist_pants_cm',
        label: 'Obwód pasa',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'waist_pants',
      },
      {
        id: 'inseam',
        storageKey: 'inseam_cm',
        label: 'Długość nogawki (inseam)',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'inseam',
      },
      {
        id: 'fit_preference',
        storageKey: 'fit_preference',
        label: 'Preferencja dopasowania',
        type: 'select',
        options: FIT_OPTIONS,
      },
    ],
  },
  {
    id: 'bottoms_spodnie_materialowe',
    category: 'bottoms',
    label: 'Spodnie materiałowe / garniturowe / chinosy',
    garmentTypes: ['pants_casual', 'pants_formal'],
    supabaseCategories: ['bottoms'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. 48, 32/32',
      },
      {
        id: 'waist',
        storageKey: 'waist_pants_cm',
        label: 'Obwód pasa',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'waist_pants',
      },
      {
        id: 'inseam',
        storageKey: 'inseam_cm',
        label: 'Długość nogawki (inseam)',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'inseam',
      },
      {
        id: 'rise',
        storageKey: 'rise',
        label: 'Wysokość stanu',
        type: 'select',
        options: RISE_OPTIONS,
      },
      {
        id: 'fit_preference',
        storageKey: 'fit_preference',
        label: 'Preferencja dopasowania',
        type: 'select',
        options: FIT_OPTIONS,
      },
    ],
  },
  {
    id: 'bottoms_spodnie_dresowe',
    category: 'bottoms',
    label: 'Spodnie dresowe / joggery',
    garmentTypes: ['pants_casual'],
    supabaseCategories: ['bottoms'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. S, M, L',
      },
    ],
  },
  {
    id: 'bottoms_legginsy',
    category: 'bottoms',
    label: 'Legginsy',
    garmentTypes: ['pants_casual'],
    supabaseCategories: ['bottoms'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. XS, S, M, L',
      },
    ],
  },
  {
    id: 'bottoms_kombinezon',
    category: 'bottoms',
    label: 'Kombinezon / jumpsuit / pantsuit',
    garmentTypes: ['other'],
    supabaseCategories: ['bottoms'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. 36, 38, S',
      },
      {
        id: 'torso_girth',
        storageKey: 'torso_girth_cm',
        label: 'Długość tułowia',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'torso_girth',
      },
    ],
  },
  {
    id: 'bottoms_shorty',
    category: 'bottoms',
    label: 'Shorty / krótkie spodenki',
    garmentTypes: ['shorts'],
    supabaseCategories: ['bottoms'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. S, M, 32',
      },
      {
        id: 'waist',
        storageKey: 'waist_pants_cm',
        label: 'Obwód pasa',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'waist_pants',
      },
      {
        id: 'inseam',
        storageKey: 'inseam_cm',
        label: 'Długość nogawki',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'inseam',
      },
    ],
  },
  {
    id: 'bottoms_spodnica',
    category: 'bottoms',
    label: 'Spódnica',
    garmentTypes: ['skirt'],
    supabaseCategories: ['bottoms'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. 36, 38, S',
      },
      {
        id: 'fit_preference',
        storageKey: 'fit_preference',
        label: 'Preferencja dopasowania',
        type: 'select',
        options: FIT_OPTIONS,
      },
    ],
  },
  {
    id: 'bottoms_sukienka',
    category: 'bottoms',
    label: 'Sukienka',
    garmentTypes: ['other'],
    supabaseCategories: ['bottoms'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. 36, 38, S',
      },
      {
        id: 'waist',
        storageKey: 'waist_cm',
        label: 'Obwód talii',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'waist',
      },
      {
        id: 'waist_pants',
        storageKey: 'waist_pants_cm',
        label: 'Obwód pasa',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'waist_pants',
      },
      {
        id: 'hips',
        storageKey: 'hips_cm',
        label: 'Obwód bioder',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'hips',
      },
      {
        id: 'chest',
        storageKey: 'chest_cm',
        label: 'Obwód klatki piersiowej',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'chest',
      },
      {
        id: 'length_total',
        storageKey: 'length_total_cm',
        label: 'Długość całkowita',
        type: 'number',
        unit: 'cm',
        step: 0.5,
      },
      {
        id: 'fit_preference',
        storageKey: 'fit_preference',
        label: 'Preferencja dopasowania',
        type: 'select',
        options: ['Dopasowana', 'Rozkloszowana', 'Luźna / Oversize'],
      },
    ],
  },
];

const definitions: ProductTypeDefinition[] = [];

definitions.push(...OUTERWEAR_TYPES, ...TOPS_TYPES, ...BOTTOMS_TYPES);

const LINGERIE_TYPES: ProductTypeDefinition[] = [
  {
    id: 'lingerie_biustonosz',
    category: 'lingerie',
    label: 'Biustonosz',
    garmentTypes: ['bra'],
    supabaseCategories: ['headwear'],
    fields: [
      {
        id: 'underbust',
        storageKey: 'underbust_cm',
        label: 'Obwód pod biustem',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'underbust',
        required: true,
      },
      {
        id: 'bust',
        storageKey: 'bust_cm',
        label: 'Obwód w biuście',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'bust',
        required: true,
      },
      {
        id: 'cup_size',
        storageKey: 'cup_size',
        label: 'Rozmiar miseczki',
        type: 'select',
        options: CUP_OPTIONS,
        required: true,
      },
    ],
  },
  {
    id: 'lingerie_majtki',
    category: 'lingerie',
    label: 'Majtki / bokserki / slipy',
    garmentTypes: ['underwear'],
    supabaseCategories: ['headwear'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. S, M, L',
      },
      {
        id: 'hips',
        storageKey: 'hips_cm',
        label: 'Obwód bioder',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'hips',
      },
    ],
  },
  {
    id: 'lingerie_rajstopy',
    category: 'lingerie',
    label: 'Rajstopy / pończochy',
    garmentTypes: ['socks'],
    supabaseCategories: ['headwear'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. S, M, L',
      },
    ],
  },
  {
    id: 'lingerie_pizama',
    category: 'lingerie',
    label: 'Piżama',
    garmentTypes: ['other'],
    supabaseCategories: ['headwear'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. S, M, L',
      },
    ],
  },
  {
    id: 'lingerie_stroj_jednoczesciowy',
    category: 'lingerie',
    label: 'Strój kąpielowy jednoczęściowy',
    garmentTypes: ['other'],
    supabaseCategories: ['headwear'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. S, M, L',
      },
      {
        id: 'hips',
        storageKey: 'hips_cm',
        label: 'Obwód bioder',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'hips',
      },
    ],
  },
  {
    id: 'lingerie_stroj_dwuczesciowy',
    category: 'lingerie',
    label: 'Strój kąpielowy dwuczęściowy',
    garmentTypes: ['other'],
    supabaseCategories: ['headwear'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Etykieta rozmiaru',
        type: 'text',
        required: true,
        placeholder: 'np. S, M, L',
      },
      {
        id: 'hips',
        storageKey: 'hips_cm',
        label: 'Obwód bioder (dół)',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'hips',
      },
      {
        id: 'bust',
        storageKey: 'bust_cm',
        label: 'Obwód w biuście (góra)',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'bust',
      },
    ],
  },
];

definitions.push(...LINGERIE_TYPES);

const JEWELRY_TYPES: ProductTypeDefinition[] = [
  {
    id: 'jewelry_pierscionek',
    category: 'jewelry',
    label: 'Pierścionek',
    garmentTypes: ['ring'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'ring_size',
        storageKey: 'ring_size',
        label: 'Rozmiar pierścionka',
        type: 'text',
        required: true,
        placeholder: 'np. 12, 16.5, 52',
      },
      {
        id: 'finger_circumference',
        storageKey: 'finger_circumference_mm',
        label: 'Obwód palca',
        type: 'measurement',
        unit: 'mm',
        measurementId: 'finger',
        helpText: 'Opcjonalnie – pomoże przeliczyć rozmiar w innych systemach.',
      },
      {
        id: 'hand_orientation',
        storageKey: 'hand_orientation',
        label: 'Ręka',
        type: 'radio',
        options: HAND_ORIENTATION_OPTIONS,
        required: true,
      },
      {
        id: 'body_part',
        storageKey: 'body_part',
        label: 'Część ciała',
        type: 'radio',
        options: BODY_PART_OPTIONS,
        required: true,
      },
      {
        id: 'finger',
        storageKey: 'finger',
        label: 'Palec',
        type: 'radio',
        options: FINGER_OPTIONS,
        required: true,
      },
    ],
  },
  {
    id: 'jewelry_bransoletka',
    category: 'jewelry',
    label: 'Bransoletka',
    garmentTypes: ['bracelet'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'wrist',
        storageKey: 'wrist_cm',
        label: 'Obwód nadgarstka',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'wrist',
        required: true,
      },
      {
        id: 'bracelet_length',
        storageKey: 'bracelet_length_cm',
        label: 'Długość bransoletki',
        type: 'number',
        unit: 'cm',
        step: 0.5,
      },
    ],
  },
  {
    id: 'jewelry_naszyjnik',
    category: 'jewelry',
    label: 'Naszyjnik / łańcuszek',
    garmentTypes: ['necklace'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'neck',
        storageKey: 'neck_cm',
        label: 'Obwód szyi',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'neck',
      },
      {
        id: 'chain_length',
        storageKey: 'chain_length_cm',
        label: 'Długość łańcuszka',
        type: 'number',
        unit: 'cm',
        step: 0.5,
      },
    ],
  },
  {
    id: 'jewelry_kolczyki',
    category: 'jewelry',
    label: 'Kolczyki',
    garmentTypes: ['earrings'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'size_label',
        storageKey: 'size_label',
        label: 'Typ / rozmiar kolczyków',
        type: 'text',
        placeholder: 'np. koła 30 mm, sztyfty',
      },
      {
        id: 'length',
        storageKey: 'length_mm',
        label: 'Długość / średnica',
        type: 'number',
        unit: 'mm',
        step: 1,
      },
    ],
  },
  {
    id: 'jewelry_zegarek',
    category: 'jewelry',
    label: 'Zegarek / smartwatch',
    garmentTypes: ['bracelet', 'other'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'wrist',
        storageKey: 'wrist_cm',
        label: 'Obwód nadgarstka',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'wrist',
      },
      {
        id: 'case_diameter',
        storageKey: 'case_diameter_mm',
        label: 'Średnica koperty',
        type: 'number',
        unit: 'mm',
        step: 1,
      },
      {
        id: 'strap_width',
        storageKey: 'strap_width_mm',
        label: 'Szerokość paska',
        type: 'number',
        unit: 'mm',
        step: 1,
      },
    ],
  },
];

definitions.push(...JEWELRY_TYPES);

const ACCESSORIES_TYPES: ProductTypeDefinition[] = [
  {
    id: 'accessories_pasek',
    category: 'accessories',
    label: 'Pasek',
    garmentTypes: ['belt'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'length',
        storageKey: 'belt_length_cm',
        label: 'Długość do środkowej dziurki',
        type: 'number',
        unit: 'cm',
        step: 0.5,
        required: true,
      },
      {
        id: 'waist',
        storageKey: 'waist_pants_cm',
        label: 'Obwód pasa/bioder',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'waist_pants',
      },
      {
        id: 'width',
        storageKey: 'belt_width_cm',
        label: 'Szerokość paska',
        type: 'number',
        unit: 'cm',
        step: 0.1,
      },
    ],
  },
  {
    id: 'accessories_rekawiczki',
    category: 'accessories',
    label: 'Rękawiczki',
    garmentTypes: ['gloves'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'hand_circumference',
        storageKey: 'hand_cm',
        label: 'Obwód dłoni',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'hand_circumference',
        required: true,
      },
      {
        id: 'hand_length',
        storageKey: 'hand_length_cm',
        label: 'Długość dłoni',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'hand_length',
      },
    ],
  },
  {
    id: 'accessories_czapka_zimowa',
    category: 'accessories',
    label: 'Czapka zimowa',
    garmentTypes: ['hat'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'head',
        storageKey: 'head_cm',
        label: 'Obwód głowy',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'head',
        required: true,
      },
    ],
  },
  {
    id: 'accessories_czapka_daszek',
    category: 'accessories',
    label: 'Czapka z daszkiem',
    garmentTypes: ['cap'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'head',
        storageKey: 'head_cm',
        label: 'Obwód głowy',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'head',
        required: true,
      },
    ],
  },
  {
    id: 'accessories_kapelusz',
    category: 'accessories',
    label: 'Kapelusz',
    garmentTypes: ['hat'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'head',
        storageKey: 'head_cm',
        label: 'Obwód głowy',
        type: 'measurement',
        unit: 'cm',
        measurementId: 'head',
        required: true,
      },
    ],
  },
  {
    id: 'accessories_szalik',
    category: 'accessories',
    label: 'Szalik / komin',
    garmentTypes: ['scarf'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'length',
        storageKey: 'scarf_length_cm',
        label: 'Długość szalika',
        type: 'number',
        unit: 'cm',
        step: 1,
      },
      {
        id: 'width',
        storageKey: 'scarf_width_cm',
        label: 'Szerokość szalika',
        type: 'number',
        unit: 'cm',
        step: 0.5,
      },
    ],
  },
  {
    id: 'accessories_okulary',
    category: 'accessories',
    label: 'Okulary',
    garmentTypes: ['other'],
    supabaseCategories: ['accessories'],
    fields: [
      {
        id: 'frame_width',
        storageKey: 'frame_width_mm',
        label: 'Szerokość frontu',
        type: 'number',
        unit: 'mm',
        step: 1,
      },
      {
        id: 'lens_width',
        storageKey: 'lens_width_mm',
        label: 'Szerokość soczewki',
        type: 'number',
        unit: 'mm',
        step: 1,
      },
      {
        id: 'bridge_width',
        storageKey: 'bridge_width_mm',
        label: 'Szerokość mostka',
        type: 'number',
        unit: 'mm',
        step: 1,
      },
      {
        id: 'temple_length',
        storageKey: 'temple_length_mm',
        label: 'Długość zausznika',
        type: 'number',
        unit: 'mm',
        step: 1,
      },
    ],
  },
];

definitions.push(...ACCESSORIES_TYPES);

const FOOTWEAR_TYPES: ProductTypeDefinition[] = [
  {
    id: 'footwear_szpilki',
    category: 'footwear',
    label: 'Szpilki',
    garmentTypes: ['dress_shoes'],
    supabaseCategories: ['footwear'],
    fields: [...FOOTWEAR_SIZE_FIELDS],
  },
  {
    id: 'footwear_botki',
    category: 'footwear',
    label: 'Botki',
    garmentTypes: ['boots'],
    supabaseCategories: ['footwear'],
    fields: [...FOOTWEAR_SIZE_FIELDS],
  },
  {
    id: 'footwear_baleriny',
    category: 'footwear',
    label: 'Baleriny',
    garmentTypes: ['dress_shoes'],
    supabaseCategories: ['footwear'],
    fields: [...FOOTWEAR_SIZE_FIELDS],
  },
  {
    id: 'footwear_sneakersy',
    category: 'footwear',
    label: 'Sneakersy',
    garmentTypes: ['sneakers'],
    supabaseCategories: ['footwear'],
    fields: [...FOOTWEAR_SIZE_FIELDS],
  },
  {
    id: 'footwear_oksfordy',
    category: 'footwear',
    label: 'Oksfordy',
    garmentTypes: ['dress_shoes'],
    supabaseCategories: ['footwear'],
    fields: [...FOOTWEAR_SIZE_FIELDS],
  },
  {
    id: 'footwear_derby',
    category: 'footwear',
    label: 'Derby',
    garmentTypes: ['dress_shoes'],
    supabaseCategories: ['footwear'],
    fields: [...FOOTWEAR_SIZE_FIELDS],
  },
  {
    id: 'footwear_loafers',
    category: 'footwear',
    label: 'Loafersy / mokasyny',
    garmentTypes: ['dress_shoes'],
    supabaseCategories: ['footwear'],
    fields: [...FOOTWEAR_SIZE_FIELDS],
  },
];

definitions.push(...FOOTWEAR_TYPES);

export const PRODUCT_TYPES = definitions;


