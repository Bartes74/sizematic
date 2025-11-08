'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { DashboardVariant, UserRole } from '@/lib/types';

export type AdminUserProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: UserRole;
  dashboard_variant: DashboardVariant | null;
  created_at: string;
  owner_id: string;
};

type AdminUsersTableProps = {
  users: AdminUserProfile[];
  onRefresh?: () => Promise<void> | void;
};

const ROLE_TRANSLATION_KEYS: Record<UserRole, string> = {
  free: 'free',
  premium: 'premium',
  premium_plus: 'premiumPlus',
  admin: 'admin',
};

const ROLE_COLORS: Record<UserRole, string> = {
  free: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  premium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  premium_plus: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
};

const VARIANT_COLORS: Record<DashboardVariant, string> = {
  full: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  simple: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
};

export function AdminUsersTable({ users, onRefresh }: AdminUsersTableProps) {
  const locale = useLocale();
  const t = useTranslations('dashboard.admin.users');
  const tRoles = useTranslations('dashboard.admin.roles');
  const tVariants = useTranslations('dashboard.admin.users.variantLabels');
  const tCommon = useTranslations('common');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [currentRole, setCurrentRole] = useState<UserRole>('free');
  const [currentVariant, setCurrentVariant] = useState<DashboardVariant>('full');
  const [isChanging, setIsChanging] = useState(false);

  const openModal = (
    userId: string,
    userName: string,
    role: UserRole,
    variant: DashboardVariant | null
  ) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setCurrentRole(role);
    setCurrentVariant(variant ?? 'full');
  };

  const closeModal = (force = false) => {
    if (!force && isChanging) {
      return;
    }
    setSelectedUserId(null);
    setSelectedUserName('');
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!selectedUserId) return;

    setIsChanging(true);
    try {
      const response = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUserId, newRole }),
      });

      if (response.ok) {
        setCurrentRole(newRole);
        await onRefresh?.();
        closeModal(true);
        return;
      } else {
        let message = '';
        try {
          const error = await response.json();
          message = typeof error?.message === 'string' ? error.message : '';
        } catch (parseError) {
          console.error(parseError);
        }
        window.alert(
          message
            ? t('errors.updateFailedWithMessage', { message })
            : t('errors.updateFailed')
        );
      }
    } catch (error) {
      console.error(error);
      window.alert(t('errors.unexpected'));
    } finally {
      setIsChanging(false);
    }
  };

  const handleVariantChange = async (newVariant: DashboardVariant) => {
    if (!selectedUserId) return;

    setIsChanging(true);
    try {
      const response = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUserId, newVariant }),
      });

      if (response.ok) {
        setCurrentVariant(newVariant);
        await onRefresh?.();
        closeModal(true);
        return;
      } else {
        let message = '';
        try {
          const error = await response.json();
          message = typeof error?.message === 'string' ? error.message : '';
        } catch (parseError) {
          console.error(parseError);
        }
        window.alert(
          message
            ? t('errors.updateFailedWithMessage', { message })
            : t('errors.updateFailed')
        );
      }
    } catch (error) {
      console.error(error);
      window.alert(t('errors.unexpected'));
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-lg shadow-black/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('columns.user')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('columns.email')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('columns.role')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('columns.variant')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('columns.createdAt')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(() => {
                        const source = user.display_name?.trim() || user.email?.trim() || t('fallbacks.defaultInitial');
                        return source.slice(0, 1).toUpperCase();
                      })()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {user.display_name || t('fallbacks.noName')}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('idLabel', { value: user.id.slice(0, 8) })}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-foreground">{user.email || t('fallbacks.noEmail')}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                    {tRoles(ROLE_TRANSLATION_KEYS[user.role])}
                  </span>
                </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {user.dashboard_variant ? (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANT_COLORS[user.dashboard_variant]}`}
                  >
                    {tVariants(user.dashboard_variant)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">{t('variantUnset')}</span>
                )}
              </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat(locale || undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }).format(new Date(user.created_at))}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() =>
                      openModal(
                        user.id,
                        user.display_name || user.email || t('fallbacks.defaultUser'),
                        user.role,
                        user.dashboard_variant
                      )
                    }
                    disabled={isChanging}
                    className="text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('actions.manage')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        </div>
      )}

      {/* Modal for changing role */}
      {selectedUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => closeModal()}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">{t('modal.title')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedUserName}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{t('modal.rolesTitle')}</p>
              {(['free', 'premium', 'premium_plus', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  disabled={currentRole === role || isChanging}
                  className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors border ${
                    currentRole === role
                      ? 'bg-muted border-border text-muted-foreground cursor-not-allowed'
                      : 'bg-background border-border hover:bg-muted hover:border-primary text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{tRoles(ROLE_TRANSLATION_KEYS[role])}</span>
                    {currentRole === role && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[role]}`}>
                        {t('modal.current')}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-sm font-semibold text-foreground">{t('modal.variantTitle')}</p>
              {(['full', 'simple'] as DashboardVariant[]).map((variant) => (
                <button
                  key={variant}
                  onClick={() => handleVariantChange(variant)}
                  disabled={currentVariant === variant || isChanging}
                  className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors border ${
                    currentVariant === variant
                      ? 'bg-muted border-border text-muted-foreground cursor-not-allowed'
                      : 'bg-background border-border hover:bg-muted hover:border-primary text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{tVariants(variant)}</span>
                    {currentVariant === variant && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${VARIANT_COLORS[variant]}`}>
                        {t('modal.current')}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => closeModal()}
                disabled={isChanging}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {tCommon('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
