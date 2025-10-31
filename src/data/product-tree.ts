import type { Category, GarmentType } from '@/lib/types';

export type QuickCategoryId =
  | 'outerwear'
  | 'tops'
  | 'bottoms'
  | 'lingerie'
  | 'jewelry'
  | 'accessories'
  | 'footwear';

export type QuickProductTypeConfig = {
  id: string;
  label: string;
  garmentTypes: GarmentType[];
};

export type QuickCategoryConfig = {
  id: QuickCategoryId;
  label: string;
  supabaseCategories: Category[];
  productTypes: QuickProductTypeConfig[];
};

export const QUICK_CATEGORY_CONFIGS: QuickCategoryConfig[] = [
  {
    id: 'outerwear',
    label: 'Odzież wierzchnia',
    supabaseCategories: ['outerwear'],
    productTypes: [
      { id: 'kurtka_puchowa', label: 'Kurtka / puchówka', garmentTypes: ['jacket'] },
      { id: 'plaszcz_parka', label: 'Płaszcz / parka / trencz', garmentTypes: ['coat'] },
      { id: 'ramoneska', label: 'Kurtka skórzana / ramoneska', garmentTypes: ['jacket'] },
      { id: 'narzutka', label: 'Marynarka casual / narzutka', garmentTypes: ['blazer'] },
    ],
  },
  {
    id: 'tops',
    label: 'Góra',
    supabaseCategories: ['tops'],
    productTypes: [
      { id: 'tshirt', label: 'T-shirt / longsleeve', garmentTypes: ['tshirt'] },
      { id: 'polo', label: 'Koszulka polo', garmentTypes: ['tshirt'] },
      { id: 'bluza', label: 'Bluza', garmentTypes: ['hoodie'] },
      { id: 'sweter', label: 'Sweter / kardigan', garmentTypes: ['sweater'] },
      { id: 'koszula', label: 'Koszula', garmentTypes: ['shirt_casual', 'shirt_formal'] },
      { id: 'marynarka_garniturowa', label: 'Marynarka garniturowa', garmentTypes: ['blazer'] },
      { id: 'zakiet', label: 'Żakiet biurowy', garmentTypes: ['blazer'] },
      { id: 'pizama_gora', label: 'Góra od piżamy', garmentTypes: ['other'] },
    ],
  },
  {
    id: 'bottoms',
    label: 'Dół',
    supabaseCategories: ['bottoms'],
    productTypes: [
      { id: 'jeans', label: 'Jeansy', garmentTypes: ['jeans'] },
      { id: 'spodnie_materialowe', label: 'Spodnie materiałowe', garmentTypes: ['pants_casual', 'pants_formal'] },
      { id: 'spodnie_dresowe', label: 'Spodnie dresowe / joggery', garmentTypes: ['pants_casual'] },
      { id: 'legginsy', label: 'Legginsy', garmentTypes: ['pants_casual'] },
      { id: 'kombinezon', label: 'Kombinezon / jumpsuit', garmentTypes: ['other'] },
      { id: 'spodnie_garnitur', label: 'Spodnie od garnituru', garmentTypes: ['pants_formal'] },
      { id: 'pizama_dol', label: 'Dół piżamy', garmentTypes: ['other'] },
      { id: 'spodnie_robocze', label: 'Spodnie robocze/techniczne', garmentTypes: ['other'] },
      { id: 'shorty', label: 'Shorty / krótkie spodenki', garmentTypes: ['shorts'] },
      { id: 'spodnica', label: 'Spódnica', garmentTypes: ['skirt'] },
      { id: 'sukienka', label: 'Sukienka', garmentTypes: ['other'] },
    ],
  },
  {
    id: 'lingerie',
    label: 'Bielizna',
    supabaseCategories: ['headwear'],
    productTypes: [
      { id: 'biustonosz', label: 'Biustonosz', garmentTypes: ['bra'] },
      { id: 'majtki', label: 'Majtki / bokserki / slipy', garmentTypes: ['underwear'] },
      { id: 'rajstopy', label: 'Rajstopy / pończochy', garmentTypes: ['socks'] },
      { id: 'pizama', label: 'Piżama', garmentTypes: ['other'] },
      { id: 'stroj_kapielowy_jednoczesciowy', label: 'Strój kąpielowy jednoczęściowy', garmentTypes: ['other'] },
      { id: 'stroj_kapielowy_dwuczesciowy', label: 'Strój kąpielowy dwuczęściowy', garmentTypes: ['other'] },
    ],
  },
  {
    id: 'jewelry',
    label: 'Biżuteria',
    supabaseCategories: ['accessories'],
    productTypes: [
      { id: 'pierscionek', label: 'Pierścionek', garmentTypes: ['ring'] },
      { id: 'bransoletka', label: 'Bransoletka', garmentTypes: ['bracelet'] },
      { id: 'naszyjnik', label: 'Naszyjnik / łańcuszek', garmentTypes: ['necklace'] },
      { id: 'kolczyki', label: 'Kolczyki', garmentTypes: ['earrings'] },
      { id: 'zegarek', label: 'Zegarek / smartwatch', garmentTypes: ['bracelet', 'other'] },
    ],
  },
  {
    id: 'accessories',
    label: 'Akcesoria',
    supabaseCategories: ['accessories'],
    productTypes: [
      { id: 'pasek', label: 'Pasek', garmentTypes: ['belt'] },
      { id: 'rekawiczki', label: 'Rękawiczki', garmentTypes: ['gloves'] },
      { id: 'czapka_zimowa', label: 'Czapka zimowa', garmentTypes: ['hat'] },
      { id: 'czapka_daszek', label: 'Czapka z daszkiem', garmentTypes: ['cap'] },
      { id: 'kapelusz', label: 'Kapelusz', garmentTypes: ['hat'] },
      { id: 'szalik', label: 'Szalik / komin', garmentTypes: ['scarf'] },
      { id: 'okulary', label: 'Okulary', garmentTypes: ['other'] },
    ],
  },
  {
    id: 'footwear',
    label: 'Buty',
    supabaseCategories: ['footwear'],
    productTypes: [
      { id: 'szpilki', label: 'Szpilki', garmentTypes: ['dress_shoes'] },
      { id: 'botki', label: 'Botki', garmentTypes: ['boots'] },
      { id: 'baleriny', label: 'Baleriny', garmentTypes: ['dress_shoes'] },
      { id: 'sneakersy', label: 'Sneakersy', garmentTypes: ['sneakers'] },
      { id: 'oksfordy', label: 'Oksfordy', garmentTypes: ['dress_shoes'] },
      { id: 'derby', label: 'Derby', garmentTypes: ['dress_shoes'] },
      { id: 'loafers', label: 'Loafersy / mokasyny', garmentTypes: ['dress_shoes'] },
    ],
  },
];

export const PRODUCT_TYPE_MAP = QUICK_CATEGORY_CONFIGS.reduce<Record<string, QuickProductTypeConfig>>(
  (acc, category) => {
    category.productTypes.forEach((type) => {
      acc[type.id] = type;
    });
    return acc;
  },
  {}
);

export const PRODUCT_TYPE_CATEGORY_MAP = QUICK_CATEGORY_CONFIGS.reduce<Record<string, QuickCategoryId>>(
  (acc, category) => {
    category.productTypes.forEach((type) => {
      acc[type.id] = category.id;
    });
    return acc;
  },
  {} as Record<string, QuickCategoryId>
);

export const PRODUCT_TREE = QUICK_CATEGORY_CONFIGS;

export const CATEGORY_LABEL_MAP = QUICK_CATEGORY_CONFIGS.reduce<Record<QuickCategoryId, string>>(
  (acc, category) => {
    acc[category.id] = category.label;
    return acc;
  },
  {} as Record<QuickCategoryId, string>
);

export function getQuickCategoryConfig(id: QuickCategoryId): QuickCategoryConfig {
  const config = QUICK_CATEGORY_CONFIGS.find((category) => category.id === id);
  if (!config) {
    throw new Error(`Unknown quick category: ${id}`);
  }
  return config;
}

export function resolveCategoryLabel(id: string): string {
  return CATEGORY_LABEL_MAP[id as QuickCategoryId] ?? id;
}

export function resolveProductTypeLabel(categoryId: string, productTypeId: string | null | undefined): string | null {
  if (!productTypeId) {
    return null;
  }

  const category = QUICK_CATEGORY_CONFIGS.find((item) => item.id === categoryId);
  const type = category?.productTypes.find((item) => item.id === productTypeId);
  if (type) {
    return type.label;
  }

  const fallback = PRODUCT_TYPE_MAP[productTypeId];
  return fallback?.label ?? productTypeId;
}
