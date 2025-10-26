import { format } from "date-fns";
import { MeasurementForm } from "@/components/measurement-form";
import { getMeasurementSummary, listMeasurements } from "@/server/measurements";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  tops: "Górne partie",
  bottoms: "Doły",
  footwear: "Obuwie",
  accessories: "Akcesoria"
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);

function formatCategory(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

function formatValue(value: number) {
  return `${value.toFixed(1)} cm`;
}

function formatTimestamp(timestamp: string) {
  return format(new Date(timestamp), "dd.MM.yyyy HH:mm");
}

export default async function Home() {
  const measurements = await listMeasurements();
  const summary = await getMeasurementSummary();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3rem] text-slate-400">SizeSync</p>
            <h1 className="text-2xl font-semibold text-slate-900">Panel pomiarów (MVP)</h1>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            Offline-first preview
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Zapisane pomiary</h2>
              <p className="text-sm text-slate-500">
                Wartości synchronizują się z Supabase i będą podstawą konwersji marek.
              </p>
            </div>
            <span className="text-sm text-slate-500">{measurements.length} wpisów</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100/60 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Kategoria</th>
                  <th className="px-4 py-3">Nazwa</th>
                  <th className="px-4 py-3">Wartość</th>
                  <th className="px-4 py-3">Notatka</th>
                  <th className="px-4 py-3">Zapisano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80 bg-white">
                {measurements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      Brak zapisanych pomiarów — dodaj pierwszy wpis po prawej stronie.
                    </td>
                  </tr>
                ) : (
                  measurements.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{formatCategory(item.category)}</td>
                      <td className="px-4 py-3 text-slate-700">{item.label}</td>
                      <td className="px-4 py-3 text-emerald-600">{formatValue(item.value_cm)}</td>
                      <td className="px-4 py-3 text-slate-500">{item.notes ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{formatTimestamp(item.recorded_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Średnia</h3>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">
              {summary?.average_value_cm != null ? formatValue(summary.average_value_cm) : "—"}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Na podstawie {summary?.sample_size ?? 0} pomiarów. Aktualizacja:{" "}
              {summary?.computed_at ? formatTimestamp(summary.computed_at) : "—"}
            </p>
          </div>

          <MeasurementForm categories={CATEGORY_OPTIONS} />

          <section className="rounded-xl border border-slate-200 bg-white/70 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">Deploy w Vercel</h3>
            <p className="mt-2 text-sm text-slate-600">
              Skonfiguruj zmienne środowiskowe `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` i `SUPABASE_SERVICE_ROLE_KEY`, a
              następnie podłącz projekt Supabase stworzony z migracjami w katalogu `supabase/`.
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
