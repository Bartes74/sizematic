'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { AdminUsersTable, type AdminUserProfile } from '@/components/admin-users-table';
import type { DashboardVariant, UserRole } from '@/lib/types';

type RoleFilter = 'all' | UserRole;
type VariantFilter = 'all' | DashboardVariant | 'unset';
type SortOption =
  | 'created_desc'
  | 'created_asc'
  | 'name_asc'
  | 'name_desc'
  | 'role_asc'
  | 'role_desc'
  | 'variant_asc'
  | 'variant_desc';

const DEFAULT_LIMIT = 250;

type UsersResponse = {
  users: AdminUserProfile[];
};

const fetcher = async (url: string): Promise<UsersResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string' && payload.error.trim().length > 0
        ? payload.error
        : 'Failed to load users';
    throw new Error(message);
  }

  return payload ?? { users: [] };
};

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debounced;
}

export function AdminUsersExplorer() {
  const tPanel = useTranslations('dashboard.admin.usersPanel');
  const tRoles = useTranslations('dashboard.admin.roles');
  const tUsers = useTranslations('dashboard.admin.users');

  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [variantFilter, setVariantFilter] = useState<VariantFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('created_desc');

  const debouncedSearch = useDebouncedValue(searchInput.trim(), 350);

  const queryString = useMemo(() => {
    if (!isOpen) return '';

    const params = new URLSearchParams();

    if (debouncedSearch.length > 0) {
      params.set('search', debouncedSearch);
    }

    if (roleFilter !== 'all') {
      params.set('role', roleFilter);
    }

    if (variantFilter !== 'all') {
      params.set('variant', variantFilter);
    }

    params.set('sort', sortOption);
    params.set('limit', String(DEFAULT_LIMIT));

    const serialized = params.toString();
    return serialized ? `?${serialized}` : '';
  }, [debouncedSearch, roleFilter, variantFilter, sortOption, isOpen]);

  const { data, error, isLoading, mutate } = useSWR<UsersResponse>(
    isOpen ? `/api/admin/users${queryString}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const users = data?.users ?? [];
  const resultsCount = users.length;

  const roleOptions: Array<{ value: RoleFilter; label: string }> = [
    { value: 'all', label: tPanel('filters.roleAll') },
    { value: 'free', label: tRoles('free') },
    { value: 'premium', label: tRoles('premium') },
    { value: 'premium_plus', label: tRoles('premiumPlus') },
    { value: 'admin', label: tRoles('admin') },
  ];

  const variantOptions: Array<{ value: VariantFilter; label: string }> = [
    { value: 'all', label: tPanel('filters.variantAll') },
    { value: 'full', label: tUsers('variantLabels.full') },
    { value: 'simple', label: tUsers('variantLabels.simple') },
    { value: 'unset', label: tPanel('filters.variantUnset') },
  ];

  const sortOptions: Array<{ value: SortOption; label: string }> = [
    { value: 'created_desc', label: tPanel('filters.sortOptions.created_desc') },
    { value: 'created_asc', label: tPanel('filters.sortOptions.created_asc') },
    { value: 'name_asc', label: tPanel('filters.sortOptions.name_asc') },
    { value: 'name_desc', label: tPanel('filters.sortOptions.name_desc') },
    { value: 'role_asc', label: tPanel('filters.sortOptions.role_asc') },
    { value: 'role_desc', label: tPanel('filters.sortOptions.role_desc') },
    { value: 'variant_asc', label: tPanel('filters.sortOptions.variant_asc') },
    { value: 'variant_desc', label: tPanel('filters.sortOptions.variant_desc') },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{tPanel('title')}</p>
          <p className="text-xs text-muted-foreground">{tPanel('subtitle', { limit: DEFAULT_LIMIT })}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-[var(--surface-interactive)] px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
        >
          <span>{isOpen ? tPanel('close') : tPanel('open')}</span>
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
          </svg>
        </button>
      </div>

      {isOpen ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tPanel('search.label')}
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={tPanel('search.placeholder')}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tPanel('filters.role')}
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tPanel('filters.variant')}
              <select
                value={variantFilter}
                onChange={(event) => setVariantFilter(event.target.value as VariantFilter)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {variantOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tPanel('filters.sort')}
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as SortOption)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              {tPanel('results', {
                count: resultsCount,
              })}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => mutate()}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.5 10a6.5 6.5 0 116.5 6.5m0 0l2.5-2.5m-2.5 2.5l-2.5-2.5"
                  />
                </svg>
                {tPanel('refresh')}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
              {tPanel('loading')}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
              {tPanel('error')}
            </div>
          ) : resultsCount === 0 ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
              {tPanel('empty')}
            </div>
          ) : (
            <AdminUsersTable
              users={users}
              onRefresh={async () => {
                await mutate();
              }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

