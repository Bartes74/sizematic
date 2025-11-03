'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { BodyMeasurements } from '@/lib/types';
import {
  BODY_MEASUREMENT_DEFINITIONS,
  createBodyMeasurementUpdate,
  getBodyMeasurementValue,
  isDefinitionRequired,
} from '@/data/body-measurements';

type BodyMeasurementsFormProps = {
  profileId: string;
  initialData: BodyMeasurements | null;
};

export function BodyMeasurementsForm({ profileId, initialData }: BodyMeasurementsFormProps) {
  const router = useRouter();
  const t = useTranslations('measurementsForm');

  const NUMBER_FORMAT_HINT: Record<'cm' | 'mm', string> = {
    cm: t('formatHint.cm'),
    mm: t('formatHint.mm'),
  };
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showInstructions, setShowInstructions] = useState<string | null>(null);

  const definitions = useMemo(() => BODY_MEASUREMENT_DEFINITIONS, []);

  const hasExistingRecord = Boolean(initialData);

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initialFormData: Record<string, string> = {};
    definitions.forEach((definition) => {
      const storedValue = getBodyMeasurementValue(definition, initialData);
      initialFormData[definition.id] = storedValue != null ? storedValue.toString() : '';
    });
    return initialFormData;
  });

  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const measurementPayload: Record<string, number | null> = {};

      for (const definition of definitions) {
        const rawValue = (formData[definition.id] ?? '').trim();

        if (!rawValue) {
          definition.fields.forEach((field) => {
            measurementPayload[field] = null;
          });
          continue;
        }

        const normalized = rawValue.replace(',', '.');
        const numericValue = Number(normalized);

        if (Number.isNaN(numericValue) || numericValue <= 0) {
          throw new Error(t('errors.invalidValue', { label: definition.label }));
        }

        const updates = createBodyMeasurementUpdate(definition, numericValue);
        Object.assign(measurementPayload, updates);
      }

      const payload = {
        ...measurementPayload,
        notes: notes || null,
      } as Record<string, number | null | string | null>;

      let requestError = null;

      if (hasExistingRecord) {
        const { error: updateError } = await supabase
          .from('body_measurements')
          .update(payload)
          .eq('profile_id', profileId);
        requestError = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('body_measurements')
          .insert({ profile_id: profileId, ...payload });
        requestError = insertError;
      }

      if (requestError) {
        throw requestError;
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (submissionError: unknown) {
      const message =
        submissionError && typeof submissionError === 'object' && 'message' in submissionError
          ? String((submissionError as { message?: unknown }).message)
          : null;
      setError(message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t('basics.title')}</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {(t.raw('basics.items') as string[]).map((item, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-6 text-lg font-semibold text-foreground">{t('formTitle')}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {definitions.map((definition) => {
            const value = formData[definition.id] ?? '';
            const placeholder = NUMBER_FORMAT_HINT[definition.unit] ?? 'np. 0';
            const required = isDefinitionRequired(definition);

            return (
              <div key={definition.id} className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {definition.label}
                      {required && <span className="text-destructive">*</span>}
                      {definition.femaleOnly && (
                        <span className="text-xs text-muted-foreground">{t('instructions.femaleOnly')}</span>
                      )}
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{t('instructions.purposeLabel')}</span>
                      <br />
                      {definition.purpose}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setShowInstructions((prev) => (prev === definition.id ? null : definition.id))
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground hover:bg-muted/80"
                    title={t('instructions.toggle')}
                  >
                    ?
                  </button>
                </div>

                {showInstructions === definition.id && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
                    <p className="mb-2 font-medium">{t('instructions.title')}</p>
                    <ul className="space-y-1">
                      {definition.how.map((step, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="relative">
                  <input
                    type="number"
                    step={definition.unit === 'mm' ? 1 : 0.1}
                    value={value}
                    onChange={(event) => handleChange(definition.id, event.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {definition.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-sm font-medium text-foreground">{t('notes.label')}</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder={t('notes.placeholder')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-600">
          ✓ {t('submit.success')}
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading
            ? t('submit.saving')
            : hasExistingRecord
              ? t('submit.update')
              : t('submit.save')}
        </button>
      </div>
    </form>
  );
}
