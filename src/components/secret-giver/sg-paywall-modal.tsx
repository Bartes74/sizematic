'use client';

import { useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type ProductType = 'sg_3_pack' | 'sg_10_pack' | 'premium_yearly' | 'premium_monthly';

const PRODUCTS = {
  sg_3_pack: {
    name: '3 Strzały SG',
    price: '19.99 PLN',
    description: 'Jednorazowy pakiet 3 próśb Secret Giver',
  },
  sg_10_pack: {
    name: '10 Strzałów SG',
    price: '49.99 PLN',
    description: 'Jednorazowy pakiet 10 próśb Secret Giver',
    badge: 'Najlepsza wartość',
  },
  premium_yearly: {
    name: 'Premium - Roczny',
    price: '99.99 PLN / rok',
    description: 'Nielimitowane SG i Kręgi + wszystkie funkcje Premium',
    badge: 'Najlepsza opcja!',
  },
  premium_monthly: {
    name: 'Premium - Miesięczny',
    price: '19.99 PLN / miesiąc',
    description: 'Nielimitowane SG i Kręgi + wszystkie funkcje Premium',
  },
};

export function SGPaywallModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (productKey: ProductType) => {
    setLoading(true);

    try {
      const endpoint = productKey.includes('premium')
        ? '/api/v1/subscriptions/checkout'
        : '/api/v1/secret-giver/checkout';

      const body = productKey.includes('premium')
        ? { plan_key: productKey }
        : { product_key: productKey };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = data.checkout_url;
      } else {
        alert(data.error || 'Nie udało się utworzyć sesji płatności');
      }
    } catch (err) {
      console.error('Failed to create checkout:', err);
      alert('Wystąpił błąd podczas tworzenia płatności');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Wykorzystałeś darmowe &apos;strzały&apos;!
            </h2>
            <p className="text-gray-600">
              Aby dalej wysyłać prośby Secret Giver, wybierz opcję dla siebie:
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {/* Token packages */}
          <div className="border-b pb-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Pakiety Tokenów
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['sg_3_pack', 'sg_10_pack'] as ProductType[]).map((key) => {
                const product = PRODUCTS[key];
                return (
                  <button
                    key={key}
                    onClick={() => handlePurchase(key)}
                    disabled={loading}
                    className="relative p-4 border-2 rounded-lg text-left hover:border-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed border-gray-200"
                  >
                    {'badge' in product && product.badge && (
                      <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {product.badge}
                      </div>
                    )}
                    <div className="font-semibold text-gray-900 mb-1">
                      {product.name}
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {product.price}
                    </div>
                    <div className="text-sm text-gray-600">
                      {product.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subscription plans */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Subskrypcje Premium
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['premium_yearly', 'premium_monthly'] as ProductType[]).map(
                (key) => {
                  const product = PRODUCTS[key];
                  return (
                    <button
                      key={key}
                      onClick={() => handlePurchase(key)}
                      disabled={loading}
                      className="relative p-4 border-2 rounded-lg text-left hover:border-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed border-gray-200"
                    >
                      {'badge' in product && product.badge && (
                        <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {product.badge}
                        </div>
                      )}
                      <div className="font-semibold text-gray-900 mb-1">
                        {product.name}
                      </div>
                      <div className="text-2xl font-bold text-purple-600 mb-2">
                        {product.price}
                      </div>
                      <div className="text-sm text-gray-600">
                        {product.description}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-gray-600 text-center">
            Wszystkie płatności są bezpieczne i szyfrowane przez Stripe
          </p>
        </div>
      </div>
    </div>
  );
}

