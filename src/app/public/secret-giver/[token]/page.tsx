'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type SGRequest = {
  id: string;
  requested_category: string;
  product_type?: string;
  status: string;
  is_anonymous: boolean;
  is_from_circle_member: boolean;
  created_at: string;
  sender?: {
    display_name: string;
    avatar_url?: string;
  } | null;
};

const CATEGORY_LABELS: { [key: string]: string } = {
  tops: 'Rozmiar odzieży górnej',
  bottoms: 'Rozmiar odzieży dolnej',
  footwear: 'Rozmiar obuwia',
  headwear: 'Rozmiar nakryć głowy',
  accessories: 'Rozmiar akcesoriów',
  outerwear: 'Rozmiar odzieży wierzchniej',
  kids: 'Rozmiar dziecięcy',
};

export default function PublicSecretGiverPage() {
  const params = useParams();
  const token = params?.token as string;

  const [request, setRequest] = useState<SGRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [sizeValue, setSizeValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/v1/secret-giver/public/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRequest(data.request);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch SG request:', err);
        setError('Nie udało się pobrać prośby');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleRespond = async (action: 'approve' | 'reject') => {
    if (action === 'approve' && !sizeValue.trim()) {
      alert('Podaj swój rozmiar');
      return;
    }

    setResponding(true);

    try {
      const res = await fetch(`/api/v1/secret-giver/public/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          data_payload: action === 'approve' ? sizeValue.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert(data.error || 'Nie udało się wysłać odpowiedzi');
      }
    } catch (err) {
      console.error('Failed to respond:', err);
      alert('Wystąpił błąd podczas wysyłania odpowiedzi');
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Prośba niedostępna
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'Ta prośba nie istnieje lub już została rozpatrzona.'}
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Przejdź do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Dziękujemy!
          </h1>
          <p className="text-gray-600 mb-6">
            Twój rozmiar został wysłany. Nadawca otrzymał dostęp na 48 godzin.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">
              Chcesz ułatwić znajomym kupowanie prezentów na stałe?
            </h2>
            <p className="text-sm text-blue-800 mb-4">
              <strong>Załóż darmowe konto GiftFit</strong>, aby zapisać
              wszystkie swoje rozmiary i otrzymać własne{' '}
              <strong>2 darmowe &apos;strzały&apos; Secret Giver</strong>.
            </p>
            <Link
              href="/auth/register"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Stwórz darmowe konto
            </Link>
          </div>

          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Przejdź do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  // Determine message content
  let heading = '🎁 Prośba o rozmiar';
  let message = '';

  if (request.is_from_circle_member && request.is_anonymous) {
    heading = '🎁 Prośba z Kręgu Zaufanych';
    message = `Ktoś z Twojego Kręgu Zaufanych chce kupić Ci prezent-niespodziankę! Potrzebuje Twojego ${CATEGORY_LABELS[request.requested_category] || request.requested_category}.`;
  } else if (request.is_anonymous) {
    message = `Ktoś z Twoich znajomych używa GiftFit, by kupić Ci prezent-niespodziankę! Potrzebuje Twojego ${CATEGORY_LABELS[request.requested_category] || request.requested_category}.`;
  } else if (request.sender) {
    message = `${request.sender.display_name} używa GiftFit, by kupić Ci idealny prezent! Potrzebuje Twojego ${CATEGORY_LABELS[request.requested_category] || request.requested_category}.`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎁</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{heading}</h1>
          <p className="text-gray-600">{message}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="size"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Wpisz swój rozmiar
            </label>
            <input
              id="size"
              type="text"
              value={sizeValue}
              onChange={(e) => setSizeValue(e.target.value)}
              placeholder="np. M, 42, 10.5"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={responding}
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Uwaga:</strong> Dostęp do rozmiaru wygaśnie za 48 godzin
              po udostępnieniu.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleRespond('approve')}
              disabled={responding || !sizeValue.trim()}
              className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {responding ? 'Wysyłanie...' : 'Wyślij rozmiar'}
            </button>
            <button
              onClick={() => handleRespond('reject')}
              disabled={responding}
              className="px-6 py-3 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
            >
              Odrzuć
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Nie masz jeszcze konta GiftFit?{' '}
            <Link
              href="/auth/register"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Załóż darmowe konto
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

