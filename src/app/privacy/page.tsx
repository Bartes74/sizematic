import { MarketingShell } from '@/components/marketing/marketing-shell';
import { getBrandingSettings } from '@/lib/branding';

const ACCENT = '#48A9A6';

const FACTS = [
  { label: 'Wersja', value: '1.0' },
  { label: 'Data wejścia w życie', value: '[dd.mm.rrrr]' },
  {
    label: 'Administrator danych',
    value: '[nazwa spółki], [adres], [NIP/KRS], e-mail: [privacy@…], tel.: […]',
  },
  { label: 'Inspektor Ochrony Danych', value: '[imię i nazwisko], e-mail: [iod@…]' },
];

export default async function PrivacyPage() {
  const branding = await getBrandingSettings();

  return (
    <MarketingShell branding={branding}>
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border/40 bg-card/85 p-8 shadow-xl shadow-black/5 backdrop-blur sm:p-12">
          <header className="mb-12 space-y-6 text-center sm:text-left">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em]"
              style={{ borderColor: `${ACCENT}4d`, backgroundColor: `${ACCENT}1a`, color: ACCENT }}
            >
              GiftFit
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-[2.75rem]">
                Polityka Prywatności
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground sm:max-w-3xl">
                Niniejsza Polityka wyjaśnia, jakie dane przetwarzamy, w jakich celach, komu je powierzamy,
                przez jaki okres oraz z jakich praw możesz korzystać. Projektujemy usługę zgodnie z zasadą
                privacy-by-design, tak aby to Ty miał(a) pełną kontrolę nad udostępnianiem swoich rozmiarów.
              </p>
            </div>
            <dl className="grid gap-4 text-left sm:grid-cols-2">
              {FACTS.map((fact) => (
                <div key={fact.label} className="rounded-2xl border border-border/40 bg-background/70 p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">{fact.label}</dt>
                  <dd className="mt-2 text-sm text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </header>

          <div className="space-y-12 text-sm leading-relaxed text-muted-foreground">
            <IntroNote />
            <Section
              title="1. Zakres działania i definicje"
              bullets={[
                'Aplikacja / Usługa – mobilna/PWA aplikacja GiftFit do tworzenia Zunifikowanego Profilu Rozmiarowego (ZPR), dzielenia się wybranymi danymi z Zaufanym Kręgiem, korzystania z funkcji Secret Giver oraz linków prezentowych.',
                'Użytkownik – osoba fizyczna korzystająca z Aplikacji.',
                'ZPR – uporządkowany profil rozmiarów, wymiarów i preferencji dopasowania (odzież, obuwie, biżuteria, akcesoria; także konwersje EU/US/UK i marki).',
                'Zaufany Krąg – prywatna lista osób, którym można granularnie udostępniać wybrane kategorie danych.',
                'Secret Giver – bezpieczna, czasowa zgoda na wgląd w pojedynczy rozmiar dla osoby obdarowującej (np. na 48h).',
                'Wersje planów – Free / Premium / Premium+ (różny zakres funkcji udostępniania i kontroli).',
              ]}
            />
            <Section title="2. Kategorie przetwarzanych danych">
              <SubHeading title="Konto i subskrypcja" />
              <BulletList
                items={[
                  'e-mail, hasło (haszowane), imię/nazwa profilu, status weryfikacji, plan i ważność subskrypcji, identyfikatory techniczne.',
                ]}
              />
              <SubHeading title="ZPR (treść profilu)" />
              <BulletList
                items={[
                  'kategorie i podkategorie (tops/bottoms/outerwear/underwear, buty, akcesoria, biżuteria), etykiety rozmiarów, wymiary, preferencje dopasowania, marki, notatki, profile konwersji rozmiarów (EU/US/UK).',
                ]}
              />
              <SubHeading title="Udostępnianie" />
              <BulletList
                items={[
                  'reguły i uprawnienia (kto co widzi i na jaki czas), członkowie Zaufanego Kręgu, generowane linki prezentowe (zakres, TTL, limit odsłon).',
                ]}
              />
              <SubHeading title="Secret Giver" />
              <BulletList
                items={[
                  'żądania dostępu do pojedynczych kategorii, statusy (oczekujące/zaakceptowane/odrzucone/wygasłe), czas ważności (np. 48h), log zgód.',
                ]}
              />
              <SubHeading title="Płatności i rozliczenia" />
              <BulletList
                items={[
                  'metadane transakcji (Stripe/RevenueCat), typ planu, status płatności; szczegóły karty przetwarza wyłącznie operator płatności.',
                ]}
              />
              <SubHeading title="Telemetria i logi" />
              <BulletList
                items={[
                  'dane techniczne urządzenia/przeglądarki, adres IP, identyfikatory sesji, logi błędów i bezpieczeństwo, statystyki użycia.',
                ]}
              />
              <SubHeading title="B2B/Pro (opcjonalnie)" />
              <BulletList
                items={[
                  'dane firmowe administratorów i użytkowników, zagregowane zapotrzebowanie na rozmiary, raporty; pracownik zawsze kontroluje zakres udostępnienia.',
                ]}
              />
              <InfoBox>
                Przechowywane rozmiary/wymiary nie należą do szczególnych kategorii danych (art. 9 RODO), chyba że
                samodzielnie wpiszesz treści je ujawniające – wtedy przetwarzamy je wyłącznie za Twoją wyraźną zgodą.
              </InfoBox>
            </Section>
            <Section title="3. Cele i podstawy prawne">
              <NumberedList
                items={[
                  'Świadczenie Usługi (konto, ZPR, udostępnianie, Secret Giver, linki) – art. 6 ust. 1 lit. b RODO (umowa).',
                  'Bezpieczeństwo, zapobieganie nadużyciom, rozliczalność (logi, audyty, ograniczenia czasowe SG) – art. 6 ust. 1 lit. f RODO (uzasadniony interes).',
                  'Płatności, fakturowanie, księgowość – art. 6 ust. 1 lit. b/c RODO (umowa/obowiązek prawny).',
                  'Komunikacja produktowa, wsparcie, badania satysfakcji – art. 6 ust. 1 lit. f RODO.',
                  'Marketing bezpośredni (opcjonalnie), newsletter, powiadomienia – art. 6 ust. 1 lit. a RODO (zgoda, możliwa do cofnięcia).',
                  'Anonimizowane statystyki i trendy rozmiarów – dane zanonimizowane nie są danymi osobowymi; gdy stosujemy dane osobowe, robimy to na podstawie art. 6 ust. 1 lit. f RODO przy zachowaniu minimalizacji i pseudonimizacji.',
                ]}
              />
            </Section>
            <Section title="4. Dobrowolność i kontrola udostępniania">
              <BulletList
                items={[
                  'Decydujesz, co i komu udostępniasz – reguły można ustawiać per kategoria i per osoba/grupa, z możliwością natychmiastowego cofnięcia.',
                  'Secret Giver dotyczy jednego rozmiaru i jest ograniczony czasowo (np. 48h). Możesz odmówić, zaakceptować lub zablokować zaproszenia (w planach płatnych).',
                  'Linki prezentowe pozwalają określić zakres, TTL, limit odsłon, opcjonalne hasło; link można unieważnić w dowolnym momencie.',
                ]}
              />
            </Section>
            <Section title="5. Odbiorcy danych i podmioty przetwarzające">
              <Paragraph>
                Dane przekazujemy wyłącznie, gdy jest to konieczne do działania Usługi lub wynika z obowiązku prawnego:
              </Paragraph>
              <BulletList
                items={[
                  'Hosting i infrastruktura chmurowa – np. Google Cloud Platform (serwery, bazy danych, kopie zapasowe).',
                  'Płatności i abonamenty – Stripe/RevenueCat (rozliczenia; dane kart przetwarza operator).',
                  'Komunikacja e-mail/push i obsługa – wybrani dostawcy, którym powierzamy tylko niezbędne metadane.',
                  'Analityka i logi – narzędzia monitorujące działanie oraz bezpieczeństwo.',
                  'B2B/Pro – gdy dołączasz do organizacji, określone dane udostępniasz pracodawcy wyłącznie za swoją zgodą i w ustalonym zakresie.',
                ]}
              />
              <Paragraph>
                Z każdym podmiotem przetwarzającym zawieramy umowę powierzenia zgodną z art. 28 RODO.
              </Paragraph>
            </Section>
            <Section title="6. Przekazywanie poza EOG">
              <Paragraph>
                Jeśli dostawca przetwarza dane poza Europejskim Obszarem Gospodarczym, stosujemy mechanizmy przewidziane
                przez RODO (np. Standardowe Klauzule Umowne) oraz dodatkowe środki techniczne. Informujemy o istotnych
                zmianach listy podmiotów i lokalizacji.
              </Paragraph>
            </Section>
            <Section title="7. Okres przechowywania">
              <BulletList
                items={[
                  'Konto i ZPR – do czasu usunięcia konta lub maksymalnie 36 miesięcy braku aktywności (z wcześniejszym powiadomieniem).',
                  'Reguły udostępniania / Zaufany Krąg – do czasu odwołania lub wygaśnięcia.',
                  'Secret Giver – metadane żądań i logi zgód przechowujemy do celów rozliczalności (zwykle 24 miesiące); dostęp do rozmiaru wygasa automatycznie po TTL.',
                  'Linki prezentowe – według ustawionego TTL/limitów; po unieważnieniu pozostają jedynie metadane audytowe.',
                  'Fakturowanie i rozliczenia – zgodnie z przepisami podatkowymi/księgowymi (zwykle 5 lat).',
                  'Logi bezpieczeństwa – standardowo 12–24 miesiące, chyba że przepisy lub interes prawny wymagają dłuższego okresu.',
                ]}
              />
            </Section>
            <Section title="8. Twoje prawa">
              <Paragraph>
                Masz prawo do dostępu, sprostowania, usunięcia („bycia zapomnianym”), ograniczenia przetwarzania,
                przenoszenia danych, sprzeciwu wobec przetwarzania oraz wycofania zgody (bez wpływu na zgodność z prawem
                przetwarzania przed jej cofnięciem). Skontaktuj się: [privacy@…]. Masz także prawo złożyć skargę do
                Prezesa UODO.
              </Paragraph>
              <Paragraph>
                Udostępniamy w Aplikacji panel prywatności, w którym sprawdzisz aktywne udostępnienia, linki, ustawienia
                SG i możesz szybko odwołać uprawnienia.
              </Paragraph>
            </Section>
            <Section title="9. Zautomatyzowane decyzje i profilowanie">
              <Paragraph>
                Nie prowadzimy zautomatyzowanego podejmowania decyzji wywołującego skutki prawne. W wyższych planach
                możemy proponować rekomendacje prezentów na podstawie danych i preferencji – zawsze możesz wyłączyć tę
                funkcję w ustawieniach.
              </Paragraph>
            </Section>
            <Section title="10. Bezpieczeństwo informacji">
              <Paragraph>
                Stosujemy szyfrowanie w tranzycie i spoczynku, kontrolę dostępu (RBAC), hasła haszowane (bcrypt), tokeny
                JWT, segmentację uprawnień, kopie zapasowe, rejestrowanie zdarzeń, testy bezpieczeństwa oraz zasadę
                minimalizacji. Funkcje SG oraz udostępniania posiadają twarde ograniczenia czasu i zakresu oraz jasne
                ekrany zgody.
              </Paragraph>
            </Section>
            <Section title="11. Pliki cookie i technologie podobne">
              <Paragraph>
                Korzystamy z niezbędnych plików cookie (utrzymanie sesji, bezpieczeństwo) oraz – za Twoją zgodą – z
                analitycznych i marketingowych. W każdej chwili możesz zmienić ustawienia w przeglądarce i zrezygnować z
                plików nie-niezbędnych.
              </Paragraph>
            </Section>
            <Section title="12. Dzieci">
              <Paragraph>
                Usługa nie jest kierowana do dzieci poniżej 16. roku życia. Jeżeli stwierdzimy, że przetwarzamy dane
                dziecka bez podstawy, niezwłocznie je usuniemy.
              </Paragraph>
            </Section>
            <Section title="13. Relacje B2B: Administrator vs. podmiot przetwarzający">
              <BulletList
                items={[
                  'W planie B2C jesteśmy Administratorem Twoich danych.',
                  'W ofercie B2B/Pro – jeżeli organizacja uzyskuje dostęp do Twoich danych rozmiarowych – robi to wyłącznie na podstawie Twojej świadomej zgody i w określonym zakresie; w tym zakresie możemy działać jako podmiot przetwarzający na mocy umowy powierzenia.',
                ]}
              />
            </Section>
            <Section title="14. Zmiany Polityki">
              <Paragraph>
                Politykę możemy aktualizować (np. przy zmianie funkcji lub dostawców). O istotnych zmianach
                poinformujemy z wyprzedzeniem w Aplikacji i/lub e-mailem. Nowa wersja obowiązuje od daty wskazanej na
                górze dokumentu.
              </Paragraph>
            </Section>
            <Section title="15. Kontakt">
              <Paragraph>
                Pytania, wnioski i żądania dotyczące danych osobowych prześlij na adres **[privacy@…]** lub pocztą na
                adres Administratora. Jeśli powołano Inspektora Ochrony Danych – **[iod@…]**.
              </Paragraph>
            </Section>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}

function Section({
  title,
  children,
  bullets,
}: {
  title: string;
  children?: React.ReactNode;
  bullets?: string[];
}) {
  return (
    <section className="space-y-5 rounded-3xl border border-border/30 bg-background/70 p-6 shadow-inner shadow-black/5">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {bullets ? <BulletList items={bullets} /> : null}
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-muted-foreground">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 rounded-2xl bg-background/70 p-3">
          <span
            className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
            aria-hidden="true"
            style={{ backgroundColor: ACCENT }}
          />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3 text-muted-foreground">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 rounded-2xl bg-background/70 p-3">
          <span
            className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{ backgroundColor: `${ACCENT}26`, color: ACCENT }}
          >
            {index + 1}
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed text-muted-foreground">{children}</p>;
}

function SubHeading({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>;
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 text-sm"
      style={{ borderColor: `${ACCENT}4d`, backgroundColor: `${ACCENT}1a`, color: ACCENT, borderWidth: 1, borderStyle: 'solid' }}
    >
      {children}
    </div>
  );
}

function IntroNote() {
  return (
    <div className="rounded-2xl border border-border/30 bg-background/70 p-5 text-sm leading-relaxed text-muted-foreground">
      Dbamy o prywatność projektując produkt w myśl zasady privacy-by-design. Udostępniamy narzędzia, które dają Ci
      pełną kontrolę nad tym, jakie dane rozmiarowe widzą inne osoby i w jakim czasie.
    </div>
  );
}
