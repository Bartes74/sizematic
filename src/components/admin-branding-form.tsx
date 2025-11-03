'use client';

import { useState, useCallback, type ChangeEvent, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { BrandingSettings } from '@/lib/types';

type AdminBrandingFormProps = {
  initial: BrandingSettings;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_LOGO_HEIGHT_PX = 48;

export function AdminBrandingForm({ initial }: AdminBrandingFormProps) {
  const router = useRouter();
  const t = useTranslations('dashboard.admin.branding');
  const [siteName, setSiteName] = useState(initial.site_name);
  const [siteClaim, setSiteClaim] = useState(initial.site_claim);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logo_url);
  const [logoPath, setLogoPath] = useState<string | null>(initial.logo_path);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetFeedback = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    resetFeedback();
    const file = event.target.files?.[0];

    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(t('errors.invalidFileType'));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(t('errors.fileTooLarge', { size: '2 MB' }));
      return;
    }

    setLogoFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [resetFeedback]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!siteName.trim()) {
      setError(t('errors.nameRequired'));
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      let uploadedLogoUrl = logoUrl;
      let uploadedLogoPath = logoPath;

      if (logoFile) {
        const ext = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png';
        const filename = `logo-${Date.now()}.${ext}`;
        const storagePath = `branding/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from('branding')
          .upload(storagePath, logoFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        if (uploadedLogoPath && uploadedLogoPath !== storagePath) {
          await supabase.storage
            .from('branding')
            .remove([uploadedLogoPath]);
        }

        const { data: publicUrlData } = supabase.storage
          .from('branding')
          .getPublicUrl(storagePath);

        uploadedLogoUrl = publicUrlData.publicUrl;
        uploadedLogoPath = storagePath;
      }

      const { error: updateError } = await supabase
        .from('branding_settings')
        .update({
          site_name: siteName.trim(),
          site_claim: siteClaim.trim(),
          logo_url: uploadedLogoUrl,
          logo_path: uploadedLogoPath,
        })
        .eq('id', true);

      if (updateError) {
        throw updateError;
      }

      setLogoUrl(uploadedLogoUrl);
      setLogoPath(uploadedLogoPath);
      setLogoFile(null);
      setLogoPreview(null);
      setSuccess(t('success'));

      setTimeout(() => {
        router.refresh();
      }, 800);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : null;
      setError(message || t('errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [logoFile, logoPath, logoUrl, router, siteClaim, siteName, resetFeedback, t]);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card/80 shadow-lg shadow-black/5 backdrop-blur p-6 sm:p-8"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="w-full lg:w-1/3">
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/70 p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">{t('preview.title')}</p>
              <div className="mt-4 flex items-center justify-center">
                {logoPreview || logoUrl ? (
                  <div className="relative h-16 w-24">
                    <Image
                      src={logoPreview || logoUrl || ''}
                      alt={t('preview.alt')}
                      fill
                      className="object-contain"
                      sizes="96px"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 6h14l-1 10h-3l-1 5-3-4-3 4-1-5H6L5 6z" />
                    </svg>
                    <span className="sr-only">{t('preview.empty')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-5">
            <div>
              <label htmlFor="siteName" className="text-sm font-semibold text-foreground">
                {t('fields.siteName.label')}
              </label>
              <input
                id="siteName"
                type="text"
                value={siteName}
                onChange={(event) => {
                  resetFeedback();
                  setSiteName(event.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder={t('fields.siteName.placeholder')}
                required
              />
            </div>

            <div>
              <label htmlFor="siteClaim" className="text-sm font-semibold text-foreground">
                {t('fields.siteClaim.label')}
              </label>
              <input
                id="siteClaim"
                type="text"
                value={siteClaim}
                onChange={(event) => {
                  resetFeedback();
                  setSiteClaim(event.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder={t('fields.siteClaim.placeholder')}
              />
            </div>

            <div>
              <label htmlFor="siteLogo" className="text-sm font-semibold text-foreground">
                {t('fields.siteLogo.label')}
              </label>
              <input
                id="siteLogo"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleFileChange}
                className="mt-2 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {t('fields.siteLogo.note', { max: MAX_LOGO_HEIGHT_PX, size: '2 MB' })}
              </p>
              {logoFile && (
                <p className="mt-1 text-xs text-primary">
                  {t('fields.siteLogo.pending', { action: t('submit.save') })}
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 dark:text-emerald-200">
            {success}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? t('submit.saving') : t('submit.save')}
          </button>
        </div>
      </div>
    </form>
  );
}
