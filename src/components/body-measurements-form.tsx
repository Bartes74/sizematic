'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { BodyMeasurements } from '@/lib/types';

type BodyMeasurementsFormProps = {
  profileId: string;
  initialData: BodyMeasurements | null;
};

type MeasurementField = {
  key: keyof Omit<BodyMeasurements, 'profile_id' | 'notes' | 'last_updated' | 'created_at'>;
  label: string;
  instruction: string;
  unit: string;
  required?: boolean;
  femaleOnly?: boolean;
};

const MEASUREMENT_FIELDS: MeasurementField[] = [
  {
    key: 'height_cm',
    label: 'Wzrost',
    instruction: 'Stań prosto, bez butów, plecami do ściany. Zaznacz punkt na ścianie na wysokości czubka głowy. Zmierz odległość od podłogi do zaznaczonego punktu.',
    unit: 'cm',
    required: true,
  },
  {
    key: 'neck_cm',
    label: 'Obwód szyi / kołnierzyka',
    instruction: 'Owiń miarkę wokół podstawy szyi. Aby zapewnić komfort, wsuń jeden palec między miarkę a szyję.',
    unit: 'cm',
  },
  {
    key: 'chest_cm',
    label: 'Obwód klatki piersiowej',
    instruction: 'Zmierz obwód w najszerszym miejscu klatki piersiowej, prowadząc miarkę pod pachami. U kobiet pomiaru dokonuje się na wysokości sutków.',
    unit: 'cm',
    required: true,
  },
  {
    key: 'shoulder_cm',
    label: 'Szerokość ramion',
    instruction: 'Zmierz odległość między końcami ramion (punkty, gdzie ramię łączy się z tułowiem).',
    unit: 'cm',
  },
  {
    key: 'sleeve_cm',
    label: 'Długość rękawa',
    instruction: 'Przy lekko zgiętym łokciu, zmierz odległość od kości ramiennej (centralny punkt na ramieniu) przez łokieć aż do nadgarstka.',
    unit: 'cm',
  },
  {
    key: 'underbust_cm',
    label: 'Obwód pod biustem',
    instruction: 'Zmierz obwód ciasno, na wydechu, bezpośrednio pod biustem. Upewnij się, że miarka leży poziomo.',
    unit: 'cm',
    femaleOnly: true,
  },
  {
    key: 'bust_cm',
    label: 'Obwód w biuście',
    instruction: 'Zmierz obwód luźno w najpełniejszym punkcie biustu (na wysokości sutków), nie ściskając piersi. Najlepiej mierzyć się w miękkim biustonoszu bez usztywnień.',
    unit: 'cm',
    femaleOnly: true,
  },
  {
    key: 'waist_natural_cm',
    label: 'Obwód talii (naturalnej)',
    instruction: 'Zmierz obwód w najwęższym miejscu tułowia, zazwyczaj tuż nad pępkiem. Aby łatwo zlokalizować talię, można lekko zgiąć się w bok – miejsce zgięcia to naturalna talia.',
    unit: 'cm',
    required: true,
  },
  {
    key: 'waist_pants_cm',
    label: 'Obwód pasa (do spodni)',
    instruction: 'Zmierz obwód w miejscu, w którym zazwyczaj nosisz spodnie. Dla wielu osób jest to linia nieco poniżej pępka. UWAGA: Ten wymiar różni się od obwodu talii naturalnej!',
    unit: 'cm',
    required: true,
  },
  {
    key: 'hips_cm',
    label: 'Obwód bioder',
    instruction: 'Stań ze złączonymi stopami i zmierz obwód w najszerszym miejscu bioder i pośladków.',
    unit: 'cm',
    required: true,
  },
  {
    key: 'inseam_cm',
    label: 'Długość wewnętrzna nogawki',
    instruction: 'Zmierz długość od kroku do miejsca, gdzie ma się kończyć nogawka (np. do kostki lub podłogi). Pomiar najlepiej wykonać z pomocą drugiej osoby lub mierząc dobrze dopasowane spodnie.',
    unit: 'cm',
  },
  {
    key: 'head_cm',
    label: 'Obwód głowy',
    instruction: 'Owiń miarkę wokół głowy, prowadząc ją około 1 cm nad uszami i przez środek czoła.',
    unit: 'cm',
  },
  {
    key: 'hand_cm',
    label: 'Obwód dłoni',
    instruction: 'Zmierz obwód dłoni w najszerszym miejscu, na wysokości kostek, z wyłączeniem kciuka.',
    unit: 'cm',
  },
  {
    key: 'foot_left_cm',
    label: 'Długość lewej stopy',
    instruction: 'Postaw stopę na kartce papieru i dokładnie ją obrysuj. Zmierz linijką odległość od końca pięty do czubka najdłuższego palca.',
    unit: 'cm',
  },
  {
    key: 'foot_right_cm',
    label: 'Długość prawej stopy',
    instruction: 'Postaw stopę na kartce papieru i dokładnie ją obrysuj. Zmierz linijką odległość od końca pięty do czubka najdłuższego palca.',
    unit: 'cm',
  },
];

export function BodyMeasurementsForm({ profileId, initialData }: BodyMeasurementsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showInstructions, setShowInstructions] = useState<string | null>(null);

  // Initialize form state
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initialFormData: Record<string, string> = {};
    MEASUREMENT_FIELDS.forEach(field => {
      initialFormData[field.key] = initialData?.[field.key]?.toString() || '';
    });
    return initialFormData;
  });

  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();

      // Convert form data to numbers (null for empty strings)
      const measurementData: any = { profile_id: profileId };
      MEASUREMENT_FIELDS.forEach(field => {
        const value = formData[field.key];
        measurementData[field.key] = value ? parseFloat(value) : null;
      });
      measurementData.notes = notes || null;

      // Upsert (insert or update)
      const { error: upsertError } = await supabase
        .from('body_measurements')
        .upsert(measurementData, { onConflict: 'profile_id' });

      if (upsertError) throw upsertError;

      setSuccess(true);
      router.refresh();

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas zapisywania wymiarów');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* General instructions */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Podstawowe zasady mierzenia</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>Używaj miękkiej miarki krawieckiej (centymetra)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>Pomiary wykonuj na bieliźnie lub na nagim ciele</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>Stój prosto, w naturalnej, rozluźnionej pozycji</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>Miarka powinna przylegać do ciała, ale go nie uciskać</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>Wykonuj pomiary przed lustrem, aby kontrolować prawidłowe ułożenie miarki</span>
          </li>
        </ul>
      </div>

      {/* Measurement fields */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Twoje wymiary</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {MEASUREMENT_FIELDS.map(field => (
            <div key={field.key} className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
                {field.femaleOnly && <span className="text-xs text-muted-foreground">(kobiety)</span>}
                <button
                  type="button"
                  onClick={() => setShowInstructions(showInstructions === field.key ? null : field.key)}
                  className="ml-auto flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
                  title="Pokaż instrukcję"
                >
                  ?
                </button>
              </label>

              {showInstructions === field.key && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
                  {field.instruction}
                </div>
              )}

              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={formData[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={`np. 170${field.unit === 'cm' ? '' : ''}`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {field.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-sm font-medium text-foreground">
            Notatki (opcjonalnie)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Dodatkowe informacje, np. data ostatniego pomiaru, uwagi..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-600">
          ✓ Wymiary zostały zapisane pomyślnie!
        </div>
      )}

      {/* Submit button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Zapisywanie...' : initialData ? 'Aktualizuj wymiary' : 'Zapisz wymiary'}
        </button>
      </div>
    </form>
  );
}
