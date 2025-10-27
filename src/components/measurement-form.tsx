"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createMeasurementAction } from "@/app/actions";
import { useLocale } from "@/providers/locale-provider";
import type { Category } from "@/lib/types";

const initialState = {
  error: undefined as string | undefined
};

type MeasurementFormProps = {
  categories: Category[];
};

// EN 13402 measurement fields
const MEASUREMENT_FIELDS = [
  { value: "chest", label: "Klatka piersiowa / Chest" },
  { value: "waist", label: "Talia / Waist" },
  { value: "hips", label: "Biodra / Hips" },
  { value: "inseam", label: "Długość nogawki / Inseam" },
  { value: "height", label: "Wzrost / Height" },
  { value: "neck", label: "Obwód szyi / Neck" },
  { value: "shoulder", label: "Szerokość ramion / Shoulder" },
  { value: "sleeve", label: "Długość rękawa / Sleeve" },
  { value: "foot_length", label: "Długość stopy / Foot length" },
  { value: "head", label: "Obwód głowy / Head" },
  { value: "hand", label: "Obwód dłoni / Hand" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useLocale();

  return (
    <button
      type="submit"
      className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      disabled={pending}
    >
      {pending ? t('form.saving') : t('form.addMeasurement')}
    </button>
  );
}

export function MeasurementForm({ categories }: MeasurementFormProps) {
  const [state, formAction] = useFormState(createMeasurementAction, initialState);
  const { t } = useLocale();

  return (
    <form action={formAction} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5 sm:p-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {t('form.title')}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t('form.subtitle')}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('form.category')}
          </span>
          <select
            name="category"
            required
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            defaultValue={categories[0]}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pole pomiaru / Measurement field
          </span>
          <select
            name="measurementField"
            required
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            defaultValue={MEASUREMENT_FIELDS[0].value}
          >
            {MEASUREMENT_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('form.value')}
          </span>
          <input
            name="value"
            placeholder="92.5"
            inputMode="decimal"
            required
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('form.notes')}
          </span>
          <input
            name="notes"
            placeholder={t('form.notesPlaceholder')}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </label>
      </div>

      {state.error ? (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {state.error}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
