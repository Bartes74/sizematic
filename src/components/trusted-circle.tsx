'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/providers/locale-provider';
import { useTrustedCircle } from '@/hooks/use-trusted-circle';
import { PRODUCT_TREE, resolveCategoryLabel, resolveProductTypeLabel } from '@/data/product-tree';
import useSWR from 'swr';

type MemberSummary = {
  profile: {
    id: string;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  connected_at: string;
  outgoing_permissions: { category: string; product_type: string | null }[];
  incoming_permissions: { category: string; product_type: string | null }[];
};

type SharedData = {
  size_labels: Array<{
    id: string;
    category: string;
    product_type: string | null;
    label: string;
    brand_name: string | null;
    notes: string | null;
    created_at: string;
  }>;
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error('Nie udało się pobrać danych');
  }
  return res.json();
});

type SelectionState = Record<string, { category: string; productType: string | null }>;

type AvatarSize = 'sm' | 'md' | 'lg';

const AVATAR_SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
};

function TrustedCircleAvatar({
  name,
  email,
  src,
  size = 'md',
  className = '',
}: {
  name: string | null;
  email: string | null;
  src: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  const fallbackSource = name?.trim() || email?.trim() || '?';
  const fallback = fallbackSource.charAt(0).toUpperCase() || '?';

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 ${AVATAR_SIZE_CLASSES[size]} ${className}`}
    >
      {src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Remote avatars may not be configured for next/image yet. */}
          <img
            src={src}
            alt={name ?? email ?? 'Avatar'}
            className="h-full w-full object-cover"
          />
        </>
      ) : (
        <span className="font-semibold">{fallback}</span>
      )}
    </div>
  );
}

function formatCategory(categoryId: string) {
  return resolveCategoryLabel(categoryId);
}

function formatProductType(categoryId: string, productTypeId: string | null) {
  return resolveProductTypeLabel(categoryId, productTypeId);
}

export function TrustedCircle() {
  const { t } = useLocale();
  const { circle, isLoading, error, refresh } = useTrustedCircle();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [activeMember, setActiveMember] = useState<MemberSummary | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const limit = circle?.limit ?? null;
  const members: MemberSummary[] = circle?.members ?? [];
  const pendingInvites: Array<{ id: string; invitee_email: string; status: string; created_at: string }> =
    circle?.pending_invitations ?? [];

  const usedSlots = members.length + pendingInvites.length;
  const limitLabel = limit === null
    ? t('circle.limitUnlimited')
    : t('circle.limitInfo');

  const { data: sharedData, error: sharedError, isLoading: sharedLoading, mutate: refreshShared } = useSWR<SharedData>(
    activeMember ? `/api/v1/trusted-circle/members/${activeMember.profile.id}/shared` : null,
    fetcher
  );

  const canInvite = limit === null || usedSlots < limit;

  const handleSendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteStatus(null);
    setInviteError(null);
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError(t('circle.emailRequired'));
      return;
    }
    try {
      const response = await fetch('/api/v1/trusted-circle/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, message: inviteMessage }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setInviteError(payload?.message ?? t('circle.inviteErrorGeneric'));
        return;
      }
      setInviteStatus(t('circle.inviteSent'));
      setInviteEmail('');
      setInviteMessage('');
      refresh();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : t('circle.inviteErrorGeneric'));
    }
  };

  const handleCancelInvite = async (id: string) => {
    await fetch(`/api/v1/trusted-circle/invitations/${id}`, { method: 'DELETE' });
    refresh();
  };

  const handleRemoveMember = async (memberId: string) => {
    await fetch(`/api/v1/trusted-circle/members/${memberId}`, { method: 'DELETE' });
    setActiveMember(null);
    refresh();
  };

  const currentSelection: SelectionState = {};
  if (activeMember) {
    activeMember.outgoing_permissions.forEach((item) => {
      currentSelection[`${item.category}:${item.product_type ?? '*'}`] = {
        category: item.category,
        productType: item.product_type ?? null,
      };
    });
  }

  const handleUpdatePermissions = async (selections: SelectionState) => {
    if (!activeMember) return;
    setPermissionStatus(null);
    setPermissionError(null);
    try {
      const response = await fetch(
        `/api/v1/trusted-circle/members/${activeMember.profile.id}/permissions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selections: Object.values(selections),
          }),
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setPermissionError(payload?.error ?? t('circle.permissionsError'));
        return;
      }
      setPermissionStatus(t('circle.permissionsUpdated'));
      refresh();
    } catch (err) {
      setPermissionError(err instanceof Error ? err.message : t('circle.permissionsError'));
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h3 className="text-lg font-bold tracking-tight text-foreground">{t('circle.title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('circle.subtitle')}</p>
      </header>

      <form onSubmit={handleSendInvite} className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t('circle.emailLabel')}
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder={t('circle.emailPlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              disabled={!canInvite}
            />
          </div>
          <button
            type="submit"
            disabled={!canInvite}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {canInvite ? t('circle.addPerson') : t('circle.limitReachedButton')}
          </button>
        </div>
        <textarea
          value={inviteMessage}
          onChange={(event) => setInviteMessage(event.target.value)}
          placeholder={t('circle.messagePlaceholder')}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
        />
        {inviteStatus ? <p className="text-xs text-emerald-500">{inviteStatus}</p> : null}
        {inviteError ? <p className="text-xs text-destructive">{inviteError}</p> : null}
        <p className="text-xs text-muted-foreground">{limitLabel}</p>
      </form>

      {pendingInvites.length > 0 ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
          <h4 className="text-sm font-semibold text-foreground">{t('circle.pendingTitle')}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {pendingInvites.map((invite) => {
              const sentAt = new Date(invite.created_at).toLocaleDateString();
              return (
                <li
                  key={invite.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <TrustedCircleAvatar
                      name={invite.invitee_email}
                      email={invite.invitee_email}
                      src={null}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium text-foreground">{invite.invitee_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('circle.sentAt', { date: sentAt })}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelInvite(invite.id)}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    {t('circle.cancelInvite')}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h4 className="text-sm font-semibold text-foreground">{t('circle.membersTitle')}</h4>
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('circle.noPeople')}</p>
        ) : (
          <ul className="space-y-3">
            {members.map((member) => {
              const displayName = member.profile.display_name ?? member.profile.email ?? 'GiftFit user';
              const connectedAt = new Date(member.connected_at).toLocaleDateString();
              return (
                <li key={member.profile.id}>
                  <button
                    type="button"
                    onClick={() => setActiveMember(member)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <span className="flex items-center gap-3">
                      <TrustedCircleAvatar
                        name={member.profile.display_name}
                        email={member.profile.email}
                        src={member.profile.avatar_url}
                        size="md"
                      />
                      <span>
                        <span className="block font-medium text-foreground">{displayName}</span>
                        <span className="text-xs text-muted-foreground">
                          {t('circle.connectedSince', { date: connectedAt })}
                        </span>
                      </span>
                    </span>
                    <span className="rounded-full border border-primary/40 px-3 py-1 text-xs font-medium text-primary">
                      {t('circle.manage')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {activeMember ? (
        <TrustedCircleMemberDialog
          member={activeMember}
          onClose={() => {
            setActiveMember(null);
            setPermissionStatus(null);
            setPermissionError(null);
          }}
          sharedData={sharedData}
          sharedError={sharedError}
          sharedLoading={sharedLoading}
          onRefreshShared={async () => {
            await refreshShared();
          }}
          onUpdatePermissions={handleUpdatePermissions}
          onRemove={() => handleRemoveMember(activeMember.profile.id)}
          status={permissionStatus}
          error={permissionError}
        />
      ) : null}
    </section>
  );
}

type MemberDialogProps = {
  member: MemberSummary;
  sharedData?: SharedData;
  sharedError?: Error;
  sharedLoading: boolean;
  onRefreshShared: () => Promise<void>;
  onUpdatePermissions: (selection: SelectionState) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
  status: string | null;
  error: string | null;
};

function TrustedCircleMemberDialog({
  member,
  sharedData,
  sharedError,
  sharedLoading,
  onRefreshShared,
  onUpdatePermissions,
  onRemove,
  onClose,
  status,
  error,
}: MemberDialogProps) {
  const { t } = useLocale();
  const initialSelection = useMemo<SelectionState>(() => {
    const map: SelectionState = {};
    member.outgoing_permissions.forEach((perm) => {
      map[`${perm.category}:${perm.product_type ?? '*'}`] = {
        category: perm.category,
        productType: perm.product_type ?? null,
      };
    });
    return map;
  }, [member.outgoing_permissions]);

  const [selection, setSelection] = useState<SelectionState>(initialSelection);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    setSelection(initialSelection);
  }, [initialSelection]);

  const toggleSelection = (category: string, productType: string | null) => {
    const key = `${category}:${productType ?? '*'}`;
    setSelection((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { category, productType };
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    await onUpdatePermissions(selection);
    setIsSaving(false);
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    await onRemove();
    setIsRemoving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <TrustedCircleAvatar
              name={member.profile.display_name}
              email={member.profile.email}
              src={member.profile.avatar_url}
              size="lg"
            />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {member.profile.display_name ?? member.profile.email}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('circle.connectedSince', { date: new Date(member.connected_at).toLocaleDateString() })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/60 p-2 text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <span className="sr-only">{t('common.close')}</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">{t('circle.sharingWithMember')}</h4>
            <div className="max-h-72 space-y-3 overflow-auto pr-2">
              {PRODUCT_TREE.map((category) => (
                <div key={category.id}>
                  <button
                    type="button"
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
                      selection[`${category.id}:*`]
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 hover:border-primary/40'
                    }`}
                    onClick={() => toggleSelection(category.id, null)}
                  >
                    {category.label} {t('circle.wholeCategorySuffix')}
                  </button>
                  <div className="mt-2 grid gap-2 pl-3">
                    {category.productTypes.map((type) => {
                      const key = `${category.id}:${type.id}`;
                      const isActive = Boolean(selection[key]);
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleSelection(category.id, type.id)}
                          className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                            isActive
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border/60 hover:border-primary/40'
                          }`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? t('circle.saving') : t('circle.saveSettings')}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isRemoving}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRemoving ? t('circle.removing') : t('circle.removeMember')}
              </button>
            </div>
            {status ? <p className="text-xs text-emerald-500">{status}</p> : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">{t('circle.theyShareWithMe')}</h4>
              <button
                type="button"
                onClick={() => onRefreshShared()}
                className="text-xs text-primary hover:underline"
              >
                {t('circle.refresh')}
              </button>
            </div>
            <div className="max-h-72 space-y-3 overflow-auto pr-2">
              {sharedLoading ? (
                <p className="text-sm text-muted-foreground">{t('circle.loadingShared')}</p>
              ) : sharedError ? (
                <p className="text-sm text-destructive">{sharedError.message}</p>
              ) : sharedData && sharedData.size_labels.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('circle.noSharedSizes')}</p>
              ) : (
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {sharedData?.size_labels.map((label) => {
                    const categoryLabel = formatCategory(label.category);
                    const productTypeLabel = formatProductType(label.category, label.product_type);
                    return (
                      <li key={label.id} className="rounded-lg border border-border/60 bg-background px-3 py-2">
                        <p className="font-medium text-foreground">
                          {label.label} {label.brand_name ? `(${label.brand_name})` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {productTypeLabel ? `${categoryLabel} • ${productTypeLabel}` : categoryLabel}
                        </p>
                        {label.notes ? <p className="italic text-muted-foreground">{label.notes}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
