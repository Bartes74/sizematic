import type { Category, GarmentType } from '@/lib/types';
import type { ProductFieldDefinition, ProductTypeDefinition, QuickCategoryId } from './product-types';
import { PRODUCT_TYPES } from './product-types';

export type { QuickCategoryId, ProductTypeDefinition, ProductFieldDefinition } from './product-types';
export { PRODUCT_TYPES } from './product-types';

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

const CATEGORY_LABELS: Record<QuickCategoryId, string> = {
  outerwear: 'Okrycia',
  tops: 'Góra',
  bottoms: 'Dół',
  lingerie: 'Bielizna',
  jewelry: 'Biżuteria',
  accessories: 'Akcesoria',
  footwear: 'Buty',
};

type CategoryAccumulator = {
  supabaseCategories: Set<Category>;
  productTypes: QuickProductTypeConfig[];
};

const categoryAccumulator = new Map<QuickCategoryId, CategoryAccumulator>();

function registerProductType(definition: ProductTypeDefinition) {
  const existing = categoryAccumulator.get(definition.category);
  if (!existing) {
    categoryAccumulator.set(definition.category, {
      supabaseCategories: new Set(definition.supabaseCategories),
      productTypes: [
        {
          id: definition.id,
          label: definition.label,
          garmentTypes: definition.garmentTypes,
        },
      ],
    });
    return;
  }

  definition.supabaseCategories.forEach((cat) => existing.supabaseCategories.add(cat));
  existing.productTypes.push({
    id: definition.id,
    label: definition.label,
    garmentTypes: definition.garmentTypes,
  });
}

PRODUCT_TYPES.forEach(registerProductType);

export const QUICK_CATEGORY_CONFIGS: QuickCategoryConfig[] = Array.from(categoryAccumulator.entries())
  .sort(([a], [b]) => {
    const order = ['outerwear', 'tops', 'bottoms', 'lingerie', 'jewelry', 'accessories', 'footwear'];
    return order.indexOf(a) - order.indexOf(b);
  })
  .map(([id, data]) => ({
    id,
    label: CATEGORY_LABELS[id],
    supabaseCategories: Array.from(data.supabaseCategories),
    productTypes: data.productTypes,
  }));

export const PRODUCT_TYPE_MAP = PRODUCT_TYPES.reduce<Record<string, ProductTypeDefinition>>(
  (acc, definition) => {
    acc[definition.id] = definition;
    return acc;
  },
  {}
);

export const PRODUCT_TYPE_CATEGORY_MAP = PRODUCT_TYPES.reduce<Record<string, QuickCategoryId>>(
  (acc, definition) => {
    acc[definition.id] = definition.category;
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
    throw new Error(`Nieznana kategoria: ${id}`);
  }
  return config;
}

export function resolveCategoryLabel(id: string): string {
  return CATEGORY_LABEL_MAP[id as QuickCategoryId] ?? id;
}

export function resolveProductTypeLabel(
  categoryId: string,
  productTypeId: string | null | undefined
): string | null {
  if (!productTypeId) {
    return null;
  }

  const category = QUICK_CATEGORY_CONFIGS.find((item) => item.id === categoryId);
  const type = category?.productTypes.find((item) => item.id === productTypeId);
  if (type) {
    return type.label;
  }

  return PRODUCT_TYPE_MAP[productTypeId]?.label ?? productTypeId;
}
