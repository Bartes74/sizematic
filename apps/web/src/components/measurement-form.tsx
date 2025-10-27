"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createMeasurementAction } from "@/app/[locale]/actions";

const initialState = {
  error: undefined as string | undefined
};

type MeasurementFormProps = {
  categories: string[];
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-400"
      disabled={pending}
    >
      {pending ? "Zapisywanie..." : "Dodaj pomiar"}
    </button>
  );
}

export function MeasurementForm({ categories }: MeasurementFormProps) {
  const [state, formAction] = useFormState(createMeasurementAction, initialState);

  return (
    <form action={formAction} className="space-y-6 rounded-xl border border-slate-200 bg-white/60 p-6 shadow-sm backdrop-blur-sm">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Dodaj nowy pomiar</h2>
        <p className="text-sm text-slate-500">
          Wartości zapisujemy w centymetrach; zasili to automatyczne konwersje marek.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Kategoria
          <select
            name="category"
            required
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            defaultValue={categories[0]}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Nazwa pomiaru
          <input
            name="label"
            placeholder="np. Klata"
            required
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Wartość (cm)
          <input
            name="value"
            placeholder="92.5"
            inputMode="decimal"
            required
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Notatka
          <input
            name="notes"
            placeholder="Opcjonalnie: posture, faza cyklu"
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </label>
      </div>

      {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}

      <SubmitButton />
    </form>
  );
}
