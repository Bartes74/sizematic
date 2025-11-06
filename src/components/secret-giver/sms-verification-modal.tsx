'use client';

import { useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function SMSVerificationModal({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError('Podaj numer telefonu');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/sms/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep('code');
      } else {
        setError(data.error || 'Nie udało się wysłać kodu');
      }
    } catch (err) {
      console.error('Failed to send code:', err);
      setError('Wystąpił błąd podczas wysyłania kodu');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setError('Podaj kod weryfikacyjny');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/sms/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Nieprawidłowy kod weryfikacyjny');
      }
    } catch (err) {
      console.error('Failed to verify code:', err);
      setError('Wystąpił błąd podczas weryfikacji');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Weryfikacja SMS
        </h2>
        <p className="text-gray-600 mb-6">
          Aby chronić naszą społeczność przed spamem, wymagamy szybkiej
          weryfikacji SMS. To odblokuje Twoją darmową pulę{' '}
          <strong>2 próśb Secret Giver</strong>.
        </p>

        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Numer telefonu
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+48 123 456 789"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSendCode}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Wysyłanie...' : 'Wyślij kod SMS'}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 disabled:cursor-not-allowed transition"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-800">
                ✅ Kod został wysłany na numer <strong>{phoneNumber}</strong>
              </p>
            </div>

            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Kod weryfikacyjny (6 cyfr)
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                disabled={loading}
                maxLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Weryfikowanie...' : 'Zweryfikuj'}
              </button>
              <button
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError(null);
                }}
                disabled={loading}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 disabled:cursor-not-allowed transition"
              >
                Wstecz
              </button>
            </div>

            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Wyślij kod ponownie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

