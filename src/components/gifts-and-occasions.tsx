'use client';

import { useLocale } from "@/providers/locale-provider";
import { useState } from "react";

type Occasion = {
  id: string;
  date: Date;
  title: string;
  personName: string;
  sizeCategory?: string;
};

export function GiftsAndOccasions() {
  const { t } = useLocale();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);

  // Placeholder data - będzie zastąpione prawdziwymi danymi z bazy
  const occasions: Occasion[] = [
    // Przykład: { id: '1', date: new Date(2025, 10, 15), title: 'Urodziny', personName: 'Anna', sizeCategory: 'Płaszcz' }
  ];

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Generate calendar days for current month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const calendarDays = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add the actual days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const getOccasionsForDay = (day: number) => {
    return occasions.filter(occ =>
      occ.date.getDate() === day &&
      occ.date.getMonth() === currentMonth &&
      occ.date.getFullYear() === currentYear
    );
  };

  const handleDayClick = (day: number | null) => {
    if (day) {
      const clickedDate = new Date(currentYear, currentMonth, day);
      setSelectedDate(clickedDate);
      setShowAddEvent(true);
    }
  };

  return (
    <section className="animate-fade-in-up space-y-4 stagger-2">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          {t('giftsAndOccasions.title')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('giftsAndOccasions.subtitle')}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-lg shadow-black/5">
        {/* Calendar Header */}
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">
            {new Date(currentYear, currentMonth).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
          </h4>
          <div className="flex gap-1">
            <button className="rounded-lg p-1 hover:bg-muted">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="rounded-lg p-1 hover:bg-muted">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'].map(day => (
            <div key={day} className="p-2 text-center text-[10px] font-medium text-muted-foreground">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            const dayOccasions = day ? getOccasionsForDay(day) : [];
            const hasOccasion = dayOccasions.length > 0;
            const isToday = day === currentDate.getDate() && currentMonth === currentDate.getMonth();

            return (
              <button
                key={index}
                onClick={() => handleDayClick(day)}
                disabled={!day}
                className={`relative aspect-square rounded-lg p-1 text-xs transition-all ${
                  !day
                    ? 'cursor-default'
                    : isToday
                    ? 'bg-primary/10 font-bold text-primary ring-2 ring-primary/30'
                    : hasOccasion
                    ? 'bg-accent/10 font-semibold text-accent hover:bg-accent/20'
                    : 'hover:bg-muted'
                }`}
              >
                {day && (
                  <>
                    <span className={isToday ? 'text-primary' : hasOccasion ? 'text-accent' : 'text-foreground'}>
                      {day}
                    </span>
                    {hasOccasion && (
                      <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Upcoming occasions */}
        {occasions.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
            <p className="text-xs font-medium text-muted-foreground">Najbliższe wydarzenia:</p>
            {occasions.slice(0, 3).map(occ => (
              <div key={occ.id} className="flex items-center gap-2 rounded-lg bg-muted/30 p-2 text-xs">
                <span className="font-medium text-foreground">{occ.date.getDate()}.{occ.date.getMonth() + 1}</span>
                <span className="text-muted-foreground">•</span>
                <span className="flex-1 text-foreground">{occ.title} - {occ.personName}</span>
                {occ.sizeCategory && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                    {occ.sizeCategory}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 rounded-xl bg-primary/5 px-3 py-2 text-[10px] text-muted-foreground">
          💡 {t('giftsAndOccasions.premiumFeature')}
        </p>
      </div>

      {/* Add Event Modal - placeholder */}
      {showAddEvent && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">
              Dodaj wydarzenie - {selectedDate.getDate()}.{selectedDate.getMonth() + 1}.{selectedDate.getFullYear()}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tutaj będzie formularz dodawania wydarzenia z linkiem do rozmiarów osoby.
            </p>
            <button
              onClick={() => setShowAddEvent(false)}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
