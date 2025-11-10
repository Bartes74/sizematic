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

type UpsellReason = 'wishlist' | 'max_circles' | 'max_members' | 'no_sg_pool' | 'general';

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
  const [expandedCircleId, setExpandedCircleId] = useState<string | null>(null);
  const [circleStatus, setCircleStatus] = useState<string | null>(null);
  const [circleError, setCircleError] = useState<string | null>(null);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [upsellReason, setUpsellReason] = useState<UpsellReason>('general');
  const [isCircleModalOpen, setIsCircleModalOpen] = useState(false);
  const [circleModalMode, setCircleModalMode] = useState<'create' | 'edit'>('create');
  const [circleFormName, setCircleFormName] = useState('');
  const [circleFormAllowWishlist, setCircleFormAllowWishlist] = useState(false);
  const [circleFormAllowSizes, setCircleFormAllowSizes] = useState(true);
  const [circleModalError, setCircleModalError] = useState<string | null>(null);
  const [isSavingCircle, setIsSavingCircle] = useState(false);
  const [editingCircleId, setEditingCircleId] = useState<string | null>(null);
  const inviteErrorMessages = useMemo<Record<string, string>>(() => ({
    max_circles: t('circle.inviteErrors.max_circles'),
    limit_reached: t('circle.inviteErrors.limit_reached'),
    max_members: t('circle.inviteErrors.max_members'),
    already_member: t('circle.inviteErrors.already_member'),
    already_invited: t('circle.inviteErrors.already_invited'),
    invitee_limit_reached: t('circle.inviteErrors.invitee_limit_reached'),
    circle_not_found: t('circle.inviteErrors.circle_not_found'),
    circle_not_owned: t('circle.inviteErrors.circle_not_owned'),
  }), [t]);

  const circles = circle?.circles ?? [];
  const defaultCircleId = circles[0]?.id ?? null;

  useEffect(() => {
    if (circles.length === 0) {
      setExpandedCircleId(null);
      return;
    }

    setExpandedCircleId((current) => {
      if (current && circles.some((existing) => existing.id === current)) {
        return current;
      }
      return circles[0]?.id ?? null;
    });
  }, [circles]);

  useEffect(() => {
    setInviteEmail('');
    setInviteMessage('');
    setInviteStatus(null);
    setInviteError(null);
  }, [expandedCircleId]);

  useEffect(() => {
    if (activeMember && expandedCircleId && activeMember.circle_id !== expandedCircleId) {
      setActiveMember(null);
    }
  }, [expandedCircleId, activeMember]);

  const limit = circle?.limit ?? null;
  const members: MemberSummary[] = circle?.members ?? [];
  const pendingInvitations = circle?.pending_invitations ?? [];
  const planType = circle?.plan_type ?? circle?.plan ?? 'free';

  const { data: sharedData, error: sharedError, isLoading: sharedLoading, mutate: refreshShared } = useSWR<SharedData>(
    activeMember ? `/api/v1/trusted-circle/members/${activeMember.profile.id}/shared` : null,
    fetcher
  );

  const canCreateCircle = planType !== 'free' || circles.length === 0;
  const hasReachedCircleLimit = !canCreateCircle;

  const openCreateCircleModal = () => {
    setCircleStatus(null);
    setCircleError(null);
    setCircleModalError(null);

    if (!canCreateCircle) {
      setCircleError(t('circle.createLimitReached'));
      setUpsellReason('max_circles');
      setIsUpsellOpen(true);
      return;
    }

    setCircleModalMode('create');
    setCircleFormName('');
    setCircleFormAllowWishlist(false);
    setCircleFormAllowSizes(true);
    setEditingCircleId(null);
    setIsCircleModalOpen(true);
  };

  const openEditCircleModal = (circleToEdit: { id: string; name: string; allow_wishlist_access: boolean; allow_size_access: boolean }) => {
    setCircleStatus(null);
    setCircleError(null);
    setCircleModalMode('edit');
    setCircleFormName(circleToEdit.name);
    setCircleFormAllowWishlist(circleToEdit.allow_wishlist_access);
    setCircleFormAllowSizes(circleToEdit.allow_size_access);
    setEditingCircleId(circleToEdit.id);
    setCircleModalError(null);
    setIsCircleModalOpen(true);
  };

  const handleCircleModalClose = () => {
    if (isSavingCircle) {
      return;
    }
    setIsCircleModalOpen(false);
    setCircleModalError(null);
    setEditingCircleId(null);
    setCircleFormName('');
    setCircleFormAllowWishlist(false);
    setCircleFormAllowSizes(true);
  };

  const handleSubmitCircle = async () => {
    setCircleModalError(null);
    const trimmedName = circleFormName.trim();

    if (!trimmedName) {
      setCircleModalError(t('circle.createModal.nameRequired'));
      return;
    }

    const payload = {
      name: trimmedName,
      allowWishlistAccess: circleFormAllowWishlist,
      allowSizeAccess: circleFormAllowSizes,
    };

    try {
      setIsSavingCircle(true);
      if (circleModalMode === 'create') {
        if (!canCreateCircle) {
          setUpsellReason('max_circles');
          setIsUpsellOpen(true);
          return;
        }
        const response = await fetch('/api/v1/trusted-circle/circles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setCircleModalError(data?.error ?? t('circle.createError'));
          return;
        }

        const createdId: string | null = data?.circle?.id ?? null;
        if (createdId) {
          setExpandedCircleId(createdId);
        }
        setCircleStatus(t('circle.createSuccess', { name: trimmedName }));
      } else if (editingCircleId) {
        const response = await fetch(`/api/v1/trusted-circle/circles/${editingCircleId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setCircleModalError(data?.error ?? t('circle.updateError'));
          return;
        }

        setCircleStatus(t('circle.updateSuccess', { name: trimmedName }));
      }

      setIsCircleModalOpen(false);
      setCircleFormName('');
      setCircleFormAllowWishlist(false);
      setCircleFormAllowSizes(true);
      setEditingCircleId(null);
      await refresh();
    } catch (error) {
      setCircleModalError(error instanceof Error ? error.message : t('circle.createError'));
    } finally {
      setIsSavingCircle(false);
    }
  };

  const handleSendInvite = async (
    event: React.FormEvent,
    targetCircleId: string,
    canInviteInCircle: boolean
  ) => {
    event.preventDefault();
    setInviteStatus(null);
    setInviteError(null);

    if (!canInviteInCircle) {
      setInviteError(t('circle.limitReachedButton'));
      setUpsellReason('max_members');
      setIsUpsellOpen(true);
      return;
    }

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
        const errorCode = payload?.error as keyof typeof inviteErrorMessages | undefined;
        const localized = errorCode ? inviteErrorMessages[errorCode] : undefined;
        setInviteError(localized ?? payload?.message ?? t('circle.inviteErrorGeneric'));
        if (errorCode === 'limit_reached' || errorCode === 'max_members' || errorCode === 'max_circles') {
          setUpsellReason('max_members');
          setIsUpsellOpen(true);
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
      <div className="section-card transition space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">{t('circle.circlesTitle')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('circle.circlesSubtitle', { count: circles.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateCircleModal}
            disabled={isSavingCircle && circleModalMode === 'create'}
            aria-disabled={hasReachedCircleLimit}
            title={hasReachedCircleLimit ? t('circle.createLimitReached') : undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${hasReachedCircleLimit ? 'cursor-pointer text-primary hover:border-primary/60 hover:text-primary' : 'bg-[var(--surface-interactive)] text-foreground hover:border-primary/50 hover:text-primary'} disabled:cursor-not-allowed disabled:opacity-60`}
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
        {circleStatus ? (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-600">
            {circleStatus}
          </div>
        ) : null}
        {circleError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {circleError}
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : circles.length ? (
          <div className="space-y-4">
            {circles.map((circleItem) => {
              const isExpanded = expandedCircleId === circleItem.id;
              const membersForCircle = members.filter((member) => member.circle_id === circleItem.id);
              const pendingForCircle = pendingInvitations.filter((invite) => {
                if (invite.circle_id === circleItem.id) return true;
                if (invite.circle_id === null && defaultCircleId && circleItem.id === defaultCircleId) return true;
                return false;
              });
              const usedSlots = membersForCircle.length + pendingForCircle.length;
              const canInviteInCircle = limit === null || usedSlots < limit;
              const limitLabel =
                limit === null
                  ? t('circle.limitUnlimited')
                  : t('circle.limitInfo', { used: usedSlots, limit });

              return (
                <div key={circleItem.id} className="overflow-hidden rounded-2xl border border-border/70 bg-muted/5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCircleId((current) => (current === circleItem.id ? null : circleItem.id))
                    }
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground">{circleItem.name}</span>
                        <svg
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l5 5 5-5" />
                        </svg>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('circle.memberCount', { count: circleItem.member_count })}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                            circleItem.allow_size_access
                              ? 'border-emerald-300 text-emerald-700 dark:text-emerald-300'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                          </svg>
                          {circleItem.allow_size_access
                            ? t('circle.badge.sizeAccessOn')
                            : t('circle.badge.sizeAccessOff')}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                            circleItem.allow_wishlist_access
                              ? 'border-sky-300 text-sky-700 dark:text-sky-300'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 5h14v2a4 4 0 01-4 4H9v1l-3 3V5z"
                            />
                          </svg>
                          {circleItem.allow_wishlist_access
                            ? t('circle.badge.wishlistAccessOn')
                            : t('circle.badge.wishlistAccessOff')}
                        </span>
                      </div>
                    </div>
                  </button>
                  {isExpanded ? (
                    <div className="space-y-4 border-t border-border/60 bg-background/70 px-4 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">{limitLabel}</p>
                        <button
                          type="button"
                          onClick={() => openEditCircleModal(circleItem)}
                          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16.242V20h3.758L18.485 9.273l-3.758-3.758L4 16.242z" />
                          </svg>
                          {t('circle.editCircle')}
                        </button>
                      </div>
                      <form
                        onSubmit={(event) => handleSendInvite(event, circleItem.id, canInviteInCircle)}
                        className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4"
                      >
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
                            />
                          </div>
                          <button
                            type="submit"
                            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition ${
                              canInviteInCircle
                                ? 'bg-primary text-primary-foreground shadow hover:bg-primary/90'
                                : 'border border-primary/50 text-primary hover:border-primary'
                            }`}
                          >
                            {canInviteInCircle ? t('circle.addPerson') : t('circle.limitReachedButton')}
                          </button>
                        </div>
                        <textarea
                          value={inviteMessage}
                          onChange={(event) => setInviteMessage(event.target.value)}
                          placeholder={t('circle.messagePlaceholder')}
                          rows={2}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                        />
                        {inviteStatus && expandedCircleId === circleItem.id ? (
                          <p className="text-xs text-emerald-500">{inviteStatus}</p>
                        ) : null}
                        {inviteError && expandedCircleId === circleItem.id ? (
                          <p className="text-xs text-destructive">{inviteError}</p>
                        ) : null}
                      </form>
                      {pendingForCircle.length > 0 ? (
                        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                          <h4 className="text-sm font-semibold text-foreground">{t('circle.pendingTitle')}</h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {pendingForCircle.map((invite) => {
                              const sentAt = new Date(invite.created_at).toLocaleDateString();
                              return (
                                <li
                                  key={invite.id}
                                  className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3"
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
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">{t('circle.membersTitle')}</h4>
                        {isLoading ? (
                          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                        ) : membersForCircle.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t('circle.noPeople')}</p>
                        ) : (
                          <ul className="space-y-3">
                            {membersForCircle.map((member) => {
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
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('circle.noCircles')}</p>
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

      {isCircleModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/95 p-6 shadow-2xl">
            <div className="mb-4 space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                {circleModalMode === 'create'
                  ? t('circle.createModal.title')
                  : t('circle.editModal.title')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('circle.createModal.description')}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="new-circle-name">
                {t('circle.createModal.nameLabel')}
              </label>
              <input
                id="new-circle-name"
                type="text"
                value={circleFormName}
                onChange={(event) => {
                  setCircleFormName(event.target.value);
                  setCircleModalError(null);
                }}
                placeholder={t('circle.createModal.namePlaceholder')}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            </div>
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={circleFormAllowWishlist}
                  onChange={(event) => setCircleFormAllowWishlist(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                />
                <span>
                  <span className="text-sm font-semibold text-foreground">
                    {t('circle.createModal.wishlistLabel')}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t('circle.createModal.wishlistHint')}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={circleFormAllowSizes}
                  onChange={(event) => setCircleFormAllowSizes(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                />
                <span>
                  <span className="text-sm font-semibold text-foreground">
                    {t('circle.createModal.sizeLabel')}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t('circle.createModal.sizeHint')}
                  </span>
                </span>
              </label>
            </div>
            {circleModalError ? (
              <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                {circleModalError}
              </div>
            ) : null}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCircleModalClose}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                {t('circle.createModal.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmitCircle}
                disabled={isSavingCircle}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingCircle
                  ? t('circle.createModal.saving')
                  : circleModalMode === 'create'
                  ? t('circle.createModal.confirm')
                  : t('circle.editModal.save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <UpsellModal isOpen={isUpsellOpen} reason={upsellReason} onClose={() => setIsUpsellOpen(false)} />
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
