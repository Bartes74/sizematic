'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function SMSVerificationModal({ isOpen, onClose, onSuccess }: Props) {
  const t = useTranslations('secretGiver.smsVerification');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError(t('errors.phoneRequired'));
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
        setError(data.error || t('errors.sendFailed'));
      }
    } catch (err) {
      console.error('Failed to send code:', err);
      setError(t('errors.sendError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setError(t('errors.codeRequired'));
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
        setError(data.error || t('errors.invalidCode'));
      }
    } catch (err) {
      console.error('Failed to verify code:', err);
      setError(t('errors.verifyError'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-border rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('title')}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t('description')}
        </p>

        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {t('phoneLabel')}
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t('phonePlaceholder')}
                className="w-full px-4 py-3 border border-border bg-white dark:bg-gray-800 text-foreground rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSendCode}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? t('sending') : t('sendCode')}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 border border-border bg-surface-muted/50 text-foreground font-semibold rounded-lg hover:bg-surface-muted/80 disabled:cursor-not-allowed transition"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-700 dark:text-green-300">
                {t('codeSent', { phone: phoneNumber })}
              </p>
            </div>

            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {t('codeLabel')}
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('codePlaceholder')}
                className="w-full px-4 py-3 border border-border bg-white dark:bg-gray-800 text-foreground rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary text-center text-2xl font-mono tracking-widest"
                disabled={loading}
                maxLength={6}
              />
            </div>

            {error && (
              <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? t('verifying') : t('verify')}
              </button>
              <button
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError(null);
                }}
                disabled={loading}
                className="px-6 py-3 border border-border bg-surface-muted/50 text-foreground font-semibold rounded-lg hover:bg-surface-muted/80 disabled:cursor-not-allowed transition"
              >
                {t('back')}
              </button>
            </div>

            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full text-sm text-primary hover:text-primary/80 font-medium"
            >
              {t('resend')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

