'use client';

import { format } from "date-fns";
import { useLocale } from "@/providers/locale-provider";
import { MeasurementForm } from "@/components/measurement-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

type Measurement = {
  id: string;
  profile_id: string;
  label: string;
  value_cm: number;
  category: string;
  notes: string | null;
  recorded_at: string;
};

type Summary = {
  average_value_cm: number;
  sample_size: number;
  computed_at: string;
} | null;

type HomePageProps = {
  measurements: Measurement[];
  summary: Summary;
};

const CATEGORY_OPTIONS = ["tops", "bottoms", "footwear", "accessories"];

function formatValue(value: number) {
  return `${value.toFixed(1)} cm`;
}

function formatTimestamp(timestamp: string) {
  return format(new Date(timestamp), "dd.MM.yyyy HH:mm");
}

export function HomePage({ measurements, summary }: HomePageProps) {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header with Glassmorphism */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
              {t('common.appName')}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {t('home.demo.title')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* Measurements Table Section */}
          <section className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {t('measurements.title')}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t('home.subtitle')}
                </p>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-foreground">
                <span className="flex h-2 w-2 rounded-full bg-primary"></span>
                {measurements.length} {t('home.demo.samples')}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('measurements.category')}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('measurements.label')}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('measurements.value')}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('measurements.notes')}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('measurements.recordedAt')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {measurements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <p className="text-sm text-muted-foreground">
                          {t('measurements.addFirst')}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    measurements.map((item) => (
                      <tr
                        key={item.id}
                        className="group transition-colors hover:bg-muted/30"
                      >
                        <td className="px-6 py-4 font-semibold capitalize text-card-foreground">
                          {item.category}
                        </td>
                        <td className="px-6 py-4 text-card-foreground">
                          {item.label}
                        </td>
                        <td className="px-6 py-4 font-bold text-primary">
                          {formatValue(item.value_cm)}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {item.notes ?? "—"}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {formatTimestamp(item.recorded_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sidebar with Stats & Form */}
          <aside className="space-y-6">
            {/* Stats Card with Gradient */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 shadow-lg shadow-primary/5">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl"></div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
                {t('home.demo.average')}
              </h3>
              <p className="mt-4 text-5xl font-bold tracking-tight text-foreground">
                {summary?.average_value_cm != null ? formatValue(summary.average_value_cm) : "—"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {summary?.sample_size ?? 0} {t('home.demo.samples')}
              </p>
            </div>

            <MeasurementForm categories={CATEGORY_OPTIONS} />
          </aside>
        </div>
      </main>
    </div>
  );
}
