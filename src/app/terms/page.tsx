import { MarketingShell } from '@/components/marketing/marketing-shell';
import { getBrandingSettings } from '@/lib/branding';

const ACCENT = '#48A9A6';

const INTRO_FACTS = [
  { label: 'Wersja', value: '1.0' },
  { label: 'Data wejścia w życie', value: '[dd.mm.rrrr]' },
];

export default async function TermsPage() {
  const branding = await getBrandingSettings();

  return (
    <MarketingShell branding={branding}>
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <article className="rounded-3xl border border-border/40 bg-card/85 p-8 shadow-xl shadow-black/5 backdrop-blur sm:p-12">
          <header className="mb-12 space-y-6 text-center sm:text-left">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em]"
              style={{ borderColor: `${ACCENT}4d`, backgroundColor: `${ACCENT}1a`, color: ACCENT }}
            >
              GiftFit
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-[2.75rem]">
                Regulamin świadczenia usług GiftFit
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground sm:max-w-3xl">
                Dokument określa zasady korzystania z aplikacji GiftFit, w tym sposób zawierania i rozwiązywania umów,
                zakres funkcji planów oraz uprawnienia i obowiązki Użytkowników i Administratora.
              </p>
            </div>
            <dl className="grid gap-4 text-left sm:grid-cols-2">
              {INTRO_FACTS.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/40 bg-background/70 p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">{item.label}</dt>
                  <dd className="mt-2 text-sm text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          </header>

          <div className="space-y-12 text-sm leading-relaxed text-muted-foreground">
            <TermSection title="1. Postanowienia ogólne">
              <NumberedList
                items={[
                  'Regulamin określa zasady korzystania z aplikacji GiftFit („Aplikacja”, „Usługa”), w tym zasady zawierania i rozwiązywania umów, uprawnienia i obowiązki Użytkowników oraz Administratora.',
                  'Administratorem i usługodawcą jest: [pełna nazwa spółki], z siedzibą w [adres], wpisana do [rejestru/KRS], NIP: [NIP], REGON: [REGON], e-mail: [support@…].',
                  'Aplikacja umożliwia prowadzenie Zunifikowanego Profilu Rozmiarowego (ZPR), selektywne udostępnianie danych Zaufanemu Kręgowi, tworzenie linków prezentowych i korzystanie z funkcji Secret Giver.',
                  'Szczegółowa macierz funkcji według planów (Free / Premium / Premium Plus) stanowi integralny opis Usługi.',
                ]}
              />
            </TermSection>

            <TermSection title="2. Definicje">
              <NumberedList
                items={[
                  'Użytkownik – osoba fizyczna posiadająca konto w Aplikacji.',
                  'Konto – zbiór zasobów i ustawień przypisanych do Użytkownika.',
                  'ZPR – profil danych rozmiarowych, wymiarów i preferencji dopasowania Użytkownika.',
                  'Zaufany Krąg – lista osób, którym Użytkownik udziela granularnego dostępu do wybranych części ZPR; dostęp jest odwoływalny.',
                  'Link prezentowy – tymczasowy link o zdefiniowanym zakresie (kategorie), czasie życia (TTL) i limitach odsłon; w wyższych planach może być jednorazowy lub zabezpieczony hasłem.',
                  'Secret Giver (SG) – procedura złożenia prośby o jednorazowy wgląd w jeden rozmiar wybranej kategorii w określonym czasie (np. 48 h) z rejestrowaną zgodą adresata.',
                ]}
              />
            </TermSection>

            <TermSection title="3. Warunki techniczne i rejestracja">
              <BulletList
                items={[
                  'Do korzystania z Aplikacji wymagane jest urządzenie z dostępem do Internetu oraz aktualna przeglądarka lub system mobilny.',
                  'Rejestracja wymaga podania e-maila i hasła (haszowanego) lub skorzystania z logowania zewnętrznego (OAuth – jeśli dostępne).',
                  'Utworzenie konta oznacza zawarcie umowy o świadczenie usług drogą elektroniczną na warunkach Regulaminu.',
                ]}
              />
            </TermSection>

            <TermSection title="4. Plany i zakres usług">
              <NumberedList
                items={[
                  'Dostępne plany: Free („Essential”), Premium („Plus”), Premium Plus („Pro”) – różnią się zakresem funkcji (liczba grup, granularność udostępnień, linki tymczasowe, kalendarz okazji, wishlisty, konwersje rozmiarów, analityka, blokada SG).',
                  'Aktualny opis funkcji planów prezentowany jest w Aplikacji na ekranie „Porównaj plany”.',
                  'Administrator może wprowadzać nowe plany lub modyfikować istniejące (bez pogorszenia praw nabytych w trwającym okresie rozliczeniowym).',
                ]}
              />
            </TermSection>

            <TermSection title="5. Płatności i rozliczenia">
              <NumberedList
                items={[
                  'Płatne elementy Usługi rozliczane są cyklicznie (miesięcznie/rocznie) przez operatorów Stripe/RevenueCat; dane karty przetwarza wyłącznie operator.',
                  'Ceny podawane są w PLN i zawierają podatki, o ile nie wskazano inaczej.',
                  'Zmiany cen obowiązują od kolejnego okresu rozliczeniowego po uprzednim powiadomieniu.',
                  'Za Secret Giver może być naliczana jednorazowa opłata zgodnie z cennikiem w Aplikacji.',
                  'Faktury/rachunki dostępne są w formie elektronicznej.',
                ]}
              />
            </TermSection>

            <TermSection title="6. Zasady korzystania">
              <BulletList
                items={[
                  'Użytkownik zobowiązany jest podawać dane prawdziwe i aktualne oraz chronić dane logowania.',
                  'Zabronione jest naruszanie prawa lub dóbr osobistych, próby obejścia zabezpieczeń oraz udostępnianie treści bez zgody właściciela.',
                  'Administrator może ograniczyć lub zablokować korzystanie z Usługi w razie naruszeń, po uprzednim wezwaniu do zaprzestania, a w przypadkach rażących – niezwłocznie.',
                ]}
              />
            </TermSection>

            <TermSection title="7. Udostępnianie, Zaufany Krąg i linki">
              <BulletList
                items={[
                  'Użytkownik decyduje, komu i jakie kategorie rozmiarów udostępnia (per kategoria i per osoba/grupa) z możliwością określenia czasu oraz natychmiastowego cofnięcia.',
                  'Link prezentowy zawiera zakres, TTL, limit wyświetleń i oznaczenia planu; w planie Premium+ może być jednorazowy i zabezpieczony hasłem.',
                  'Użytkownik może w każdej chwili unieważnić link prezentowy.',
                ]}
              />
            </TermSection>

            <TermSection title="8. Secret Giver (SG)">
              <NumberedList
                items={[
                  'SG umożliwia darczyńcy zwrócenie się o wgląd w jeden rozmiar wybranej kategorii profilu odbiorcy na oznaczony czas (np. 48 h).',
                  'Odbiorca może zaakceptować lub odmówić prośbę; po akceptacji uprawnienie wygasa automatycznie po czasie.',
                  'W planach Premium/Premium+ odbiorca może zablokować możliwość kierowania do niego próśb SG; w planie Free blokada może być niedostępna.',
                  'Administrator prowadzi dziennik zgód i wygaszeń SG w celu rozliczalności i bezpieczeństwa.',
                ]}
              />
            </TermSection>

            <TermSection title="9. Treści i własność intelektualna">
              <BulletList
                items={[
                  'Prawa do Aplikacji (UI, grafika, kod) przysługują Administratorowi lub licencjodawcom.',
                  'Użytkownik zachowuje prawa do swoich treści wprowadzonych do ZPR i udziela niewyłącznej licencji na techniczne przetwarzanie w zakresie niezbędnym do świadczenia Usługi.',
                  'Zakazane jest dekompilowanie, odtwarzanie kodu i działania podobne, poza przypadkami dozwolonymi prawem.',
                ]}
              />
            </TermSection>

            <TermSection title="10. Odpowiedzialność">
              <NumberedList
                items={[
                  'Usługa jest świadczona z należytą starannością, jednak Administrator nie gwarantuje nieprzerwanego działania w każdych warunkach (prace serwisowe, siła wyższa).',
                  'Administrator nie odpowiada za szkody wynikłe z udostępnienia danych rozmiarowych wbrew ustawieniom przez osoby trzecie, którym Użytkownik sam udzielił dostępu.',
                  'Nie wyłączamy odpowiedzialności w zakresie niedopuszczalnym przez obowiązujące przepisy, w szczególności wobec konsumentów.',
                ]}
              />
            </TermSection>

            <TermSection title="11. Rezygnacja i usunięcie konta">
              <BulletList
                items={[
                  'Użytkownik może w każdej chwili usunąć konto z poziomu Aplikacji; dla planów płatnych świadczenie kończy się z końcem bieżącego okresu rozliczeniowego.',
                  'Administrator może rozwiązać umowę z ważnych powodów (rażące naruszenie Regulaminu), z podaniem przyczyny i co do zasady uprzednim wezwaniem do zaniechania naruszeń.',
                ]}
              />
            </TermSection>

            <TermSection title="12. Prawo odstąpienia od umowy (konsumenci)">
              <NumberedList
                items={[
                  'Konsument ma 14 dni na odstąpienie od umowy zawartej na odległość, chyba że wyraził zgodę na rozpoczęcie świadczenia przed upływem terminu i został poinformowany o utracie prawa odstąpienia.',
                  'Informacja o prawie odstąpienia oraz wzór formularza udostępniane są w Aplikacji lub w e-mailu potwierdzającym.',
                  'W przypadku mikropłatności jednorazowych (np. SG) świadczenie realizowane jest niezwłocznie – odstąpienie może nie przysługiwać po pełnym spełnieniu świadczenia za zgodą konsumenta.',
                ]}
              />
            </TermSection>

            <TermSection title="13. Reklamacje">
              <NumberedList
                items={[
                  'Reklamacje dotyczące Usługi można składać na adres [support@…] lub przez formularz w Aplikacji.',
                  'Administrator rozpatruje reklamację niezwłocznie, nie później niż w ciągu 14 dni roboczych, i udziela odpowiedzi na adres podany przez Użytkownika.',
                ]}
              />
            </TermSection>

            <TermSection title="14. Dane osobowe">
              <BulletList
                items={[
                  'Zasady przetwarzania danych reguluje Polityka Prywatności dostępna w Aplikacji.',
                  'Aplikacja działa w architekturze chmurowej (np. GCP) z wykorzystaniem operatorów płatności i dostawców komunikacji – każdy podmiot działa na podstawie umowy powierzenia i zgodnie z zasadą minimalizacji.',
                  'Mechanizmy udostępniania (Krąg, linki, SG) zaprojektowano zgodnie z privacy-by-design, z możliwością odwołania dostępu, TTL i rejestrowaniem zgód.',
                ]}
              />
            </TermSection>

            <TermSection title="15. Bezpieczeństwo">
              <NumberedList
                items={[
                  'Stosujemy m.in. szyfrowanie w tranzycie i spoczynku, RBAC, logowanie zdarzeń, kopie zapasowe, testy bezpieczeństwa oraz segregację uprawnień.',
                  'Incydent bezpieczeństwa zgłoś na [security@…]; po weryfikacji podejmiemy odpowiednie działania naprawcze.',
                ]}
              />
            </TermSection>

            <TermSection title="16. Usługi dla firm (B2B/Teams)">
              <NumberedList
                items={[
                  'W ofertach B2B dostępne są dodatkowe funkcje (panel admina, raporty, zarządzanie odzieżą roboczą, subskrypcje korporacyjne) – zasady określa odrębna umowa (w tym DPA).',
                  'Pracownik ma wgląd i kontrolę nad zakresem danych udostępnianych pracodawcy.',
                ]}
              />
            </TermSection>

            <TermSection title="17. Zmiany Regulaminu">
              <NumberedList
                items={[
                  'Możemy zmienić Regulamin z ważnych przyczyn (np. zmiana prawa, funkcji, dostawców).',
                  'O zmianach poinformujemy w Aplikacji i/lub e-mailem z wyprzedzeniem. Użytkownik może wypowiedzieć umowę, jeśli nie akceptuje zmian.',
                  'Zmiany cen lub zakresów planów nie wpływają na już opłacony okres.',
                ]}
              />
            </TermSection>

            <TermSection title="18. Prawo właściwe i spory">
              <NumberedList
                items={[
                  'Do umów z konsumentami stosuje się prawo państwa zwykłego miejsca zamieszkania konsumenta w UE, z poszanowaniem bezwzględnie obowiązujących przepisów.',
                  'Spory można kierować do właściwego sądu powszechnego lub skorzystać z pozasądowych metod rozwiązywania sporów (np. platforma ODR).',
                  'W relacjach B2B właściwe jest prawo polskie i sąd miejscowo właściwy dla siedziby Administratora, o ile umowa nie stanowi inaczej.',
                ]}
              />
            </TermSection>

            <TermSection title="19. Kontakt">
              <Paragraph>
                [nazwa spółki] – [adres]. E-mail: [support@…] | [privacy@…] | [security@…]. Godziny wsparcia: [pn–pt, …].
              </Paragraph>
            </TermSection>

            <TermSection title="Załącznik 1 – Zakres funkcji planów (skrót)">
              <BulletList
                items={[
                  'Free: ZPR dla podstawowych kategorii, 1 grupa do 5 członków, granularne uprawnienia per kategoria; SG dostępne, brak blokady.',
                  'Premium: wszystko z Free + nielimitowane grupy i członkowie, kalendarz okazji, podstawowa analityka, możliwość blokady SG.',
                  'Premium Plus: wszystko z Premium + linki tymczasowe (TTL, max views, one-time, hasło), wishlisty, konwersje międzynarodowe.',
                ]}
              />
            </TermSection>
          </div>
        </article>
      </main>
    </MarketingShell>
  );
}

function TermSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-3xl border border-border/30 bg-background/70 p-6 shadow-inner shadow-black/5">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 rounded-2xl bg-background/70 p-3">
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
    <ol className="space-y-3">
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
