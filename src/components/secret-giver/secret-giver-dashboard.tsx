'use client';

import { useEffect, useState } from 'react';
import { SMSVerificationModal } from './sms-verification-modal';
import { SGPaywallModal } from './sg-paywall-modal';

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

const CATEGORY_LABELS: { [key: string]: string } = {
  tops: 'Odzież górna',
  bottoms: 'Odzież dolna',
  footwear: 'Obuwie',
  headwear: 'Nakrycia głowy',
  accessories: 'Akcesoria',
  outerwear: 'Odzież wierzchnia',
  kids: 'Dziecięcy',
};

const STATUS_LABELS: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'Oczekuje', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Zatwierdzona', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Odrzucona', color: 'bg-red-100 text-red-800' },
  expired: { label: 'Wygasła', color: 'bg-gray-100 text-gray-800' },
};

export function SecretGiverDashboard() {
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
    requested_category: 'tops',
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              {eligibility.is_premium ? (
                <p className="text-blue-900 font-semibold">
                  ⭐ Premium: Nielimitowane prośby Secret Giver
                </p>
              ) : (
                <p className="text-blue-900 font-semibold">
                  Darmowa pula: <span className="text-2xl">{eligibility.free_sg_pool}</span> strzałów
                </p>
              )}
              {eligibility.needs_sms_verification && (
                <p className="text-sm text-blue-700 mt-1">
                  ⚠️ Wymagana weryfikacja SMS
                </p>
              )}
            </div>
            {!eligibility.is_premium && eligibility.free_sg_pool === 0 && (
              <button
                onClick={() => setShowPaywallModal(true)}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Kup więcej
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create new request button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
        >
          + Wyślij prośbę Secret Giver
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
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' && 'Wszystkie'}
            {f === 'sent' && 'Wysłane'}
            {f === 'received' && 'Otrzymane'}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Brak próśb</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-semibold text-gray-900">
                      {CATEGORY_LABELS[req.requested_category] || req.requested_category}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        STATUS_LABELS[req.status]?.color || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {STATUS_LABELS[req.status]?.label || req.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {req.direction === 'sent'
                      ? `Do: ${req.recipient_identifier}`
                      : req.is_anonymous
                      ? 'Od: Użytkownik anonimowy'
                      : `Od: ${req.sender?.display_name || req.recipient_identifier}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(req.created_at).toLocaleString('pl-PL')}
                  </p>
                </div>
              </div>

              {req.status === 'approved' && req.data_payload && req.direction === 'sent' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-green-900 mb-1">
                    Otrzymany rozmiar:
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {req.data_payload}
                  </p>
                  {req.expires_at && (
                    <p className="text-xs text-green-700 mt-1">
                      Dostęp wygasa: {new Date(req.expires_at).toLocaleString('pl-PL')}
                    </p>
                  )}
                </div>
              )}

              {req.status === 'pending' && req.direction === 'received' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      const size = prompt('Podaj swój rozmiar:');
                      if (size) handleRespond(req.id, 'approve', size);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                  >
                    Zatwierdź
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, 'reject')}
                    className="px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition"
                  >
                    Odrzuć
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create request modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Nowa prośba Secret Giver
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email lub numer telefonu odbiorcy
                </label>
                <input
                  type="text"
                  value={newRequest.recipient_identifier}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, recipient_identifier: e.target.value })
                  }
                  placeholder="email@example.com lub +48123456789"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategoria rozmiaru
                </label>
                <select
                  value={newRequest.requested_category}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, requested_category: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
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
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="anonymous" className="ml-2 text-sm text-gray-700">
                  Wyślij anonimowo
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSendRequest}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Wyślij prośbę
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
                >
                  Anuluj
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

