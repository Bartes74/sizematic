import { format } from "date-fns";
import { getTranslations } from 'next-intl/server';
import { MeasurementForm } from "@/components/measurement-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getMeasurementSummary, listMeasurements } from "@/server/measurements";

export const dynamic = "force-dynamic";

const CATEGORY_OPTIONS = ["tops", "bottoms", "footwear", "accessories"];

function formatValue(value: number) {
  return `${value.toFixed(1)} cm`;
}

function formatTimestamp(timestamp: string) {
  return format(new Date(timestamp), "dd.MM.yyyy HH:mm");
}

export default async function Home() {
  const t = await getTranslations();
  const measurements = await listMeasurements();
  const summary = await getMeasurementSummary();

  return (
    <div className="min-h-screen bg-background">
      <header className="glass border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3rem] text-muted-foreground">{t('common.appName')}</p>
            <h1 className="text-2xl font-semibold text-foreground">{t('home.demo.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{t('measurements.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('home.subtitle')}
              </p>
            </div>
            <span className="text-sm text-muted-foreground">{measurements.length} {t('home.demo.samples')}</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t('measurements.category')}</th>
                  <th className="px-4 py-3">{t('measurements.label')}</th>
                  <th className="px-4 py-3">{t('measurements.value')}</th>
                  <th className="px-4 py-3">{t('measurements.notes')}</th>
                  <th className="px-4 py-3">{t('measurements.recordedAt')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card">
                {measurements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      {t('measurements.addFirst')}
                    </td>
                  </tr>
                ) : (
                  measurements.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-card-foreground capitalize">{item.category}</td>
                      <td className="px-4 py-3 text-card-foreground">{item.label}</td>
                      <td className="px-4 py-3 text-primary font-medium">{formatValue(item.value_cm)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.notes ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatTimestamp(item.recorded_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">{t('home.demo.average')}</h3>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {summary?.average_value_cm != null ? formatValue(summary.average_value_cm) : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary?.sample_size ?? 0} {t('home.demo.samples')}
            </p>
          </div>

          <MeasurementForm categories={CATEGORY_OPTIONS} />
        </aside>
      </main>
    </div>
  );
}
