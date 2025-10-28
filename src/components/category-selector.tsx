'use client';

import type { Category } from '@/lib/types';
import { useRouter } from 'next/navigation';

type CategoryItem = {
  id: Category;
  name: string;
  icon: React.ReactNode;
  description: string;
};

const CATEGORIES: CategoryItem[] = [
  {
    id: 'tops',
    name: 'Góra',
    description: 'Koszulki, swetry, koszule, bluzy',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6v4H9z" />
      </svg>
    ),
  },
  {
    id: 'bottoms',
    name: 'Dół',
    description: 'Spodnie, jeansy, szorty, spódnice',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6l6-6 6 6" />
      </svg>
    ),
  },
  {
    id: 'footwear',
    name: 'Buty',
    description: 'Sneakersy, sandały, kozaki, botki',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      </svg>
    ),
  },
  {
    id: 'outerwear',
    name: 'Odzież wierzchnia',
    description: 'Kurtki, płaszcze, marynarki',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    id: 'headwear',
    name: 'Bielizna',
    description: 'Bielizna, skarpety, majtki, biustonosze',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    id: 'accessories',
    name: 'Akcesoria',
    description: 'Paski, szaliki, rękawiczki, czapki, kapelusze, biżuteria',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
];

export function CategorySelector() {
  const router = useRouter();

  const handleSelectCategory = (categoryId: Category) => {
    // Navigate to specific garment add page with category
    router.push(`/dashboard/garments/add/${categoryId}`);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((category) => (
        <button
          key={category.id}
          onClick={() => handleSelectCategory(category.id)}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-left transition-all hover:scale-[1.02] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
        >
          <div className="relative z-10">
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-4 text-primary transition-colors group-hover:bg-primary/20">
              {category.icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {category.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {category.description}
            </p>
          </div>

          {/* Hover effect */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all group-hover:h-40 group-hover:w-40" />

          {/* Arrow icon */}
          <div className="absolute bottom-6 right-6 opacity-0 transition-opacity group-hover:opacity-100">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}
