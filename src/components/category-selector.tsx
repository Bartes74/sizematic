'use client';

import { useRouter } from 'next/navigation';

type CategoryItem = {
  key: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  route: string;
};

const CATEGORIES: CategoryItem[] = [
  {
    key: 'tops',
    name: 'Góra',
    description: 'Koszulki, swetry, koszule, bluzy',
    route: '/dashboard/garments/add/tops',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6v4H9z" />
      </svg>
    ),
  },
  {
    key: 'bottoms',
    name: 'Dół',
    description: 'Spodnie, jeansy, szorty, spódnice',
    route: '/dashboard/garments/add/bottoms',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6l6-6 6 6" />
      </svg>
    ),
  },
  {
    key: 'footwear',
    name: 'Buty',
    description: 'Sneakersy, sandały, kozaki, botki',
    route: '/dashboard/garments/add/footwear',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      </svg>
    ),
  },
  {
    key: 'outerwear',
    name: 'Odzież wierzchnia',
    description: 'Kurtki, płaszcze, marynarki',
    route: '/dashboard/garments/add/outerwear',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    key: 'lingerie',
    name: 'Bielizna',
    description: 'Bielizna, skarpety, majtki, biustonosze',
    route: '/dashboard/garments/add/headwear?quickCategory=lingerie',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    key: 'accessories',
    name: 'Akcesoria',
    description: 'Paski, szaliki, rękawiczki, czapki, kapelusze, biżuteria',
    route: '/dashboard/garments/add/accessories',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
  {
    key: 'jewelry',
    name: 'Biżuteria',
    description: 'Pierścionki, bransoletki, naszyjniki, kolczyki, zegarki',
    route: '/dashboard/garments/add/accessories?quickCategory=jewelry',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.09 6.26H20l-5.045 3.666L16.18 19 12 15.9 7.82 19l1.225-6.074L4 9.26h5.91z" />
      </svg>
    ),
  },
];

export function CategorySelector() {
  const router = useRouter();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((category) => (
        <button
          key={category.key}
          onClick={() => router.push(category.route)}
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
