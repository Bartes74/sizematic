'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SMSVerificationModal } from './sms-verification-modal';
import { SGPaywallModal } from './sg-paywall-modal';
import { QUICK_CATEGORY_CONFIGS, resolveCategoryLabel, resolveProductTypeLabel } from '@/data/product-tree';
import type { QuickCategoryId } from '@/data/product-tree';

type SGRequest = {
  id: string;
  recipient_identifier: string;
  requested_category: string;
  product_type?: string;
  status: string;
  is_anonymous: boolean;
  is_from_circle_member: boolean;
  data_payload?: string;
  created_at: string;
  responded_at?: string;
  expires_at?: string;
  direction?: 'sent' | 'received';
  sender?: {
    display_name: string;
    avatar_url?: string;
  };
  recipient?: {
    display_name: string;
    avatar_url?: string;
  };
};

type Eligibility = {
  eligible: boolean;
  needs_sms_verification: boolean;
  is_premium: boolean;
  free_sg_pool: number;
  can_send_if_verified: boolean;
};


export function SecretGiverDashboard() {
  const t = useTranslations('secretGiver.dashboard');
  
  const STATUS_LABELS: { [key: string]: { label: string; color: string } } = {
    pending: { label: t('statuses.pending'), color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border border-yellow-500/20' },
    approved: { label: t('statuses.approved'), color: 'bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20' },
    rejected: { label: t('statuses.rejected'), color: 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20' },
    expired: { label: t('statuses.expired'), color: 'bg-surface-muted/50 text-muted-foreground border border-border/50' },
  };
  const [requests, setRequests] = useState<SGRequest[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  // New request form
  const [newRequest, setNewRequest] = useState({
    recipient_identifier: '',
    requested_category: 'tops' as QuickCategoryId,
    product_type: '' as string,
    is_anonymous: false,
  });

  useEffect(() => {
    fetchEligibility();
    fetchRequests();
  }, []);

  const fetchEligibility = async () => {
    try {
      const res = await fetch('/api/v1/secret-giver/eligibility');
      const data = await res.json();
      if (res.ok) {
        setEligibility(data);
      }
    } catch (err) {
      console.error('Failed to fetch eligibility:', err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/secret-giver/requests');
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!newRequest.recipient_identifier.trim()) {
      alert('Podaj email lub numer telefonu odbiorcy');
      return;
    }

    // Check eligibility
    if (!eligibility?.eligible) {
      if (eligibility?.needs_sms_verification) {
        setShowSMSModal(true);
        return;
      }
      if (!eligibility?.can_send_if_verified) {
        setShowPaywallModal(true);
        return;
      }
    }

    try {
      const res = await fetch('/api/v1/secret-giver/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Prośba wysłana!');
        setShowCreateModal(false);
        setNewRequest({
          recipient_identifier: '',
          requested_category: 'tops',
          product_type: '',
          is_anonymous: false,
        });
        fetchRequests();
        fetchEligibility();
      } else {
        if (data.error === 'sms_verification_required') {
          setShowSMSModal(true);
        } else if (data.error === 'pool_exhausted') {
          setShowPaywallModal(true);
        } else {
          alert(data.message || data.error || 'Nie udało się wysłać prośby');
        }
      }
    } catch (err) {
      console.error('Failed to send request:', err);
      alert('Wystąpił błąd podczas wysyłania prośby');
    }
  };

  const handleRespond = async (requestId: string, action: 'approve' | 'reject', dataPayload?: string) => {
    try {
      const res = await fetch(`/api/v1/secret-giver/requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data_payload: dataPayload }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        fetchRequests();
      } else {
        alert(data.error || 'Nie udało się odpowiedzieć na prośbę');
      }
    } catch (err) {
      console.error('Failed to respond:', err);
      alert('Wystąpił błąd');
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filter === 'all') return true;
    return req.direction === filter;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl mb-3">
          🎁 Secret Giver
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          Poproś znajomych o rozmiar bez zdradzania niespodzianki
        </p>
      </div>

      {/* Eligibility status */}
      {eligibility && (
        <div className="border border-border/50 bg-surface-muted/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              {eligibility.is_premium ? (
                <p className="text-foreground font-semibold">
                  {t('eligibility.premium')}
                </p>
              ) : (
                <p className="text-foreground font-semibold">
                  {t('eligibility.freePool')} <span className="text-2xl">{eligibility.free_sg_pool}</span> {t('eligibility.shots')}
                </p>
              )}
              {eligibility.needs_sms_verification && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('eligibility.needsSmsVerification')}
                </p>
              )}
            </div>
            {!eligibility.is_premium && eligibility.free_sg_pool === 0 && (
              <button
                onClick={() => setShowPaywallModal(true)}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition"
              >
                {t('eligibility.buyMore')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create new request button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full px-6 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition shadow-sm border border-border/20"
        >
          {t('createButton')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'sent', 'received'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === f
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'border border-border/50 bg-surface-muted/30 text-muted-foreground hover:bg-surface-muted/50'
            }`}
          >
            {f === 'all' && t('filters.all')}
            {f === 'sent' && t('filters.sent')}
            {f === 'received' && t('filters.received')}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 border border-border/50 bg-surface-muted/30 rounded-lg">
          <p className="text-muted-foreground">{t('emptyState')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="border border-border/50 bg-surface-muted/20 rounded-lg p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-semibold text-foreground">
                      {resolveCategoryLabel(req.requested_category)}
                      {req.product_type && ` - ${resolveProductTypeLabel(req.requested_category, req.product_type)}`}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        STATUS_LABELS[req.status]?.color || 'bg-surface-muted text-muted-foreground'
                      }`}
                    >
                      {STATUS_LABELS[req.status]?.label || req.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {req.direction === 'sent'
                      ? `${t('directions.to')} ${req.recipient_identifier}`
                      : req.is_anonymous
                      ? `${t('directions.from')} ${t('directions.anonymousUser')}`
                      : `${t('directions.from')} ${req.sender?.display_name || req.recipient_identifier}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(req.created_at).toLocaleString('pl-PL')}
                  </p>
                </div>
              </div>

              {req.status === 'approved' && req.data_payload && req.direction === 'sent' && (
                <div className="border border-green-600/30 bg-green-500/5 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {t('receivedSize')}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {req.data_payload}
                  </p>
                  {req.expires_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('accessExpires')} {new Date(req.expires_at).toLocaleString('pl-PL')}
                    </p>
                  )}
                </div>
              )}

              {req.status === 'pending' && req.direction === 'received' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      const size = prompt(t('actions.enterSize'));
                      if (size) handleRespond(req.id, 'approve', size);
                    }}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition"
                  >
                    {t('actions.approve')}
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, 'reject')}
                    className="px-4 py-2 border border-border bg-surface-muted/50 text-foreground font-semibold rounded-lg hover:bg-surface-muted/80 transition"
                  >
                    {t('actions.reject')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create request modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-border rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {t('modal.title')}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('modal.recipientLabel')}
                </label>
                <input
                  type="text"
                  value={newRequest.recipient_identifier}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, recipient_identifier: e.target.value })
                  }
                  placeholder={t('modal.recipientPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('modal.categoryLabel')}
                </label>
                <select
                  value={newRequest.requested_category}
                  onChange={(e) =>
                    setNewRequest({ 
                      ...newRequest, 
                      requested_category: e.target.value as QuickCategoryId,
                      product_type: '' // Reset product type when category changes
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-border bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-white"
                >
                  {QUICK_CATEGORY_CONFIGS.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('modal.productTypeLabel')}
                </label>
                <select
                  value={newRequest.product_type}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, product_type: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-border bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-white"
                >
                  <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{t('modal.productTypePlaceholder')}</option>
                  {QUICK_CATEGORY_CONFIGS.find((cat) => cat.id === newRequest.requested_category)?.productTypes.map((type) => (
                    <option key={type.id} value={type.id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={newRequest.is_anonymous}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, is_anonymous: e.target.checked })
                  }
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary/30"
                />
                <label htmlFor="anonymous" className="ml-2 text-sm text-foreground">
                  {t('modal.anonymousLabel')}
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSendRequest}
                  disabled={!newRequest.product_type}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('modal.sendButton')}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border border-border bg-surface-muted/50 text-foreground font-semibold rounded-lg hover:bg-surface-muted/80 transition"
                >
                  {t('modal.cancelButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <SMSVerificationModal
        isOpen={showSMSModal}
        onClose={() => setShowSMSModal(false)}
        onSuccess={() => {
          fetchEligibility();
          setShowSMSModal(false);
        }}
      />

      <SGPaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
      />
    </div>
  );
}

