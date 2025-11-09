'use client';

import { useEffect, useMemo, useState } from 'react';
import { UpsellModal } from '@/components/upsell-modal';
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
  circle_id: string;
  circle_name: string;
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

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => {
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
  const candidateName = typeof name === 'string' ? name.trim() : '';
  const candidateEmail = typeof email === 'string' ? email.trim() : '';
  const fallbackSource = candidateName || candidateEmail || '?';
  const fallback = fallbackSource.slice(0, 1).toUpperCase() || '?';

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

type TrustedCircleProps = {
  initialData?: {
    plan: string | null;
    plan_type: string | null;
    limit: number | null;
    pending_invitations: Array<{ id: string; invitee_email: string; status: string; created_at: string; circle_id: string | null }>;
    circles: Array<{ id: string; name: string; allow_wishlist_access: boolean; allow_size_access: boolean; member_count: number }>;
    members: MemberSummary[];
  };
};

export function TrustedCircle({ initialData }: TrustedCircleProps) {
  const { t } = useLocale();
  const { circle, isLoading, error, refresh } = useTrustedCircle(initialData);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [activeMember, setActiveMember] = useState<MemberSummary | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);
  const [circleStatus, setCircleStatus] = useState<string | null>(null);
  const [circleError, setCircleError] = useState<string | null>(null);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);

  const circles = circle?.circles ?? [];
  const defaultCircleId = circles[0]?.id ?? null;

  useEffect(() => {
    if (circles.length === 0) {
      setActiveCircleId(null);
      return;
    }

    setActiveCircleId((current) => {
      if (current && circles.some((existing) => existing.id === current)) {
        return current;
      }
      return circles[0]?.id ?? null;
    });
  }, [circles]);

  useEffect(() => {
    if (activeMember && activeMember.circle_id !== activeCircleId) {
      setActiveMember(null);
    }
  }, [activeCircleId, activeMember]);

  const limit = circle?.limit ?? null;
  const members: MemberSummary[] = circle?.members ?? [];
  const pendingInvites = (circle?.pending_invitations ?? []).filter((invite) => {
    if (!activeCircleId) {
      return true;
    }
    if (invite.circle_id === null && defaultCircleId && activeCircleId === defaultCircleId) {
      return true;
    }
    return invite.circle_id === activeCircleId;
  });
  const activeMembers = members.filter((member) => !activeCircleId || member.circle_id === activeCircleId);
  const usedSlots = activeMembers.length + pendingInvites.length;
  const limitLabel = limit === null
    ? t('circle.limitUnlimited')
    : t('circle.limitInfo', { used: usedSlots, limit });

  const activeCircle = circles.find((entry) => entry.id === activeCircleId) ?? null;
  const activeCircleName = activeCircle?.name ?? t('circle.defaultCircle');
  const planType = circle?.plan_type ?? circle?.plan ?? 'free';

  const { data: sharedData, error: sharedError, isLoading: sharedLoading, mutate: refreshShared } = useSWR<SharedData>(
    activeMember ? `/api/v1/trusted-circle/members/${activeMember.profile.id}/shared` : null,
    fetcher
  );

  const canInvite = Boolean(activeCircleId) && (limit === null || usedSlots < limit);
  const canCreateCircle = planType !== 'free' || circles.length === 0;
  const hasReachedCircleLimit = !canCreateCircle;

  const handleSendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteStatus(null);
    setInviteError(null);
    const ownedCircleIds = new Set(circles.map((circleItem) => circleItem.id));
    const targetCircleId = activeCircleId && ownedCircleIds.has(activeCircleId) ? activeCircleId : null;

    if (circles.length === 0) {
      setInviteError(t('circle.noCircleSelected'));
      return;
    }
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
        body: JSON.stringify({ email, message: inviteMessage, circle_id: targetCircleId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const errorCode = payload?.error;
        if (errorCode && t.has(`circle.inviteErrors.${errorCode}`)) {
          setInviteError(t(`circle.inviteErrors.${errorCode}`));
        } else {
          setInviteError(payload?.message ?? t('circle.inviteErrorGeneric'));
        }
        return;
      }
      setInviteStatus(t('circle.inviteSent'));
      setInviteEmail('');
      setInviteMessage('');
      refresh();
    } catch (err) {
      console.error(err);
      setInviteError(t('circle.inviteErrorGeneric'));
    }
  };

  const handleCreateCircle = async () => {
    setCircleStatus(null);
    setCircleError(null);

    if (!canCreateCircle) {
      setCircleError(t('circle.createLimitReached'));
      setIsUpsellOpen(true);
      return;
    }

    const proposed = typeof window !== 'undefined' ? window.prompt(t('circle.createPrompt')) : null;
    const trimmed = proposed?.trim();

    if (!trimmed) {
      return;
    }

    try {
      setIsCreatingCircle(true);
      const response = await fetch('/api/v1/trusted-circle/circles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmed }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setCircleError(payload?.error ?? t('circle.createError'));
        return;
      }

      const createdId: string | null = payload?.circle?.id ?? null;
      if (createdId) {
        setActiveCircleId(createdId);
      }
      setCircleStatus(t('circle.createSuccess', { name: trimmed }));
      await refresh();
    } catch (error) {
      setCircleError(error instanceof Error ? error.message : t('circle.createError'));
    } finally {
      setIsCreatingCircle(false);
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
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="section-card transition space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">{t('circle.circlesTitle')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('circle.circlesSubtitle', { count: circles.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateCircle}
                disabled={isCreatingCircle}
                aria-disabled={hasReachedCircleLimit}
                title={hasReachedCircleLimit ? t('circle.createLimitReached') : undefined}
                className={`inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-[var(--surface-interactive)] px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${hasReachedCircleLimit ? 'cursor-pointer text-primary hover:border-primary/60 hover:text-primary' : 'text-foreground hover:border-primary/50 hover:text-primary'}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                </svg>
                {t('circle.createCircleButton')}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('circle.planLabel', { plan: t(`circle.plan.${planType}`, { defaultMessage: planType }) })}
            </p>
          </div>

          {circleStatus ? <p className="text-xs text-emerald-500">{circleStatus}</p> : null}
          {circleError ? <p className="text-xs text-destructive">{circleError}</p> : null}

          <div className="flex flex-wrap gap-2">
            {circles.length ? (
              circles.map((circleItem) => {
                const isActive = circleItem.id === activeCircleId;
                return (
                  <button
                    key={circleItem.id}
                    type="button"
                    onClick={() => setActiveCircleId(circleItem.id)}
                    className={`flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${isActive ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border/60 bg-muted/10 text-foreground hover:border-primary/40 hover:text-primary'}`}
                  >
                    <span className="text-sm font-semibold">{circleItem.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('circle.memberCount', { count: circleItem.member_count })}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">{t('circle.noCircles')}</p>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
            <p className="text-sm font-semibold text-foreground">
              {t('circle.activeCircleLabel', { circle: activeCircleName })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{limitLabel}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {t('circle.inviteTitle', { circle: activeCircleName })}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">{t('circle.inviteSubtitle')}</p>
          </div>

          <form onSubmit={handleSendInvite} className="space-y-3">
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
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
          </form>

          {pendingInvites.length > 0 ? (
            <div className="space-y-3 rounded-2xl border border-border bg-muted/10 p-4">
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
                          <p className="text-xs text-muted-foreground">{sentAt}</p>
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
        </div>

        <div className="section-card transition space-y-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              {t('circle.membersBox.title', { circle: activeCircleName })}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('circle.membersBox.subtitle')}</p>
          </div>
          <h4 className="text-sm font-semibold text-foreground">{t('circle.membersTitle')}</h4>
          <div className="mt-3">
            {error ? (
              <p className="text-sm text-destructive">{(error as Error).message}</p>
            ) : isLoading ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : !activeCircleId ? (
              <p className="text-sm text-muted-foreground">{t('circle.noCircles')}</p>
            ) : activeMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('circle.noPeople')}</p>
            ) : (
              <ul className="space-y-3">
                {activeMembers.map((member) => {
                  const displayName = member.profile.display_name ?? member.profile.email ?? 'GiftFit user';
                  const connectedAt = new Date(member.connected_at).toLocaleDateString();
                  const connectedLabel = `${t('circle.connectedSince')} ${connectedAt}`;
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
                            <span className="text-xs text-muted-foreground">{connectedLabel}</span>
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
        </div>
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

      <UpsellModal isOpen={isUpsellOpen} reason="max_circles" onClose={() => setIsUpsellOpen(false)} />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-10">
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
                {`${t('circle.connectedSince')} ${new Date(member.connected_at).toLocaleDateString()}`}
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
