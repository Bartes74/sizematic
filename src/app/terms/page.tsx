import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { getBrandingSettings } from '@/lib/branding';

function getTermsContent() {
  const filePath = path.join(process.cwd(), 'content', 'terms.md');
  return fs.readFileSync(filePath, 'utf-8');
}

export default async function TermsPage() {
  const branding = await getBrandingSettings();
  const content = getTermsContent();

  return (
    <MarketingShell branding={branding}>
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border/40 bg-card/80 p-8 shadow-xl shadow-black/5 backdrop-blur sm:p-10">
          <article className="prose prose-slate max-w-none leading-relaxed dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        </section>
      </main>
    </MarketingShell>
  );
}
