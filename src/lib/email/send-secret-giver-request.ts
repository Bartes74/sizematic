import nodemailer from 'nodemailer';
import { resolveCategoryLabel, resolveProductTypeLabel } from '@/data/product-tree';

const SMTP_HOST = process.env.SMTP_HOST || '127.0.0.1';
const SMTP_PORT = Number(process.env.SMTP_PORT || 1025);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || 'giftfit@localhost.dev';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'GiftFit';
const SITE_CLAIM = process.env.NEXT_PUBLIC_SITE_CLAIM || 'Niespodzianka w idealnym rozmiarze!';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || `${SITE_URL}/logo.svg`;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: SMTP_USER
    ? {
        user: SMTP_USER,
        pass: SMTP_PASS,
      }
    : undefined,
});

function formatProductLabel(category: string, productType?: string): string {
  const categoryLabel = resolveCategoryLabel(category);
  if (productType) {
    const productTypeLabel = resolveProductTypeLabel(category, productType);
    return productTypeLabel ? `${categoryLabel} - ${productTypeLabel}` : categoryLabel;
  }
  return categoryLabel;
}

/**
 * Send Secret Giver request to recipient
 */
export type SGRequestEmailPayload = {
  to: string;
  category: string;
  productType?: string;
  senderName?: string; // undefined if anonymous
  isFromCircleMember: boolean;
  isAnonymous: boolean;
  token: string; // for public access link
  hasAccount: boolean; // true if recipient already has account
};

export async function sendSecretGiverRequestEmail(payload: SGRequestEmailPayload) {
  const categoryLabel = formatProductLabel(payload.category, payload.productType);
  const respondUrl = payload.hasAccount
    ? `${SITE_URL}/dashboard?sg_request=${payload.token}`
    : `${SITE_URL}/public/secret-giver/${payload.token}`;

  // Determine message content based on conditions
  let greeting = 'Cześć!';
  let messageBody = '';

  if (payload.isFromCircleMember && payload.isAnonymous) {
    messageBody = `Ktoś z Twojego <strong>Kręgu Zaufanych</strong> w ${SITE_NAME} chce kupić Ci prezent-niespodziankę! Potrzebuje Twojego <strong>${categoryLabel}</strong>. Pomóż mu, klikając poniższy przycisk:`;
  } else if (payload.isAnonymous) {
    messageBody = `Ktoś z Twoich znajomych używa ${SITE_NAME}, by kupić Ci prezent-niespodziankę! Potrzebuje Twojego <strong>${categoryLabel}</strong>.`;
  } else if (payload.senderName) {
    greeting = `Cześć!`;
    messageBody = `Twój znajomy <strong>${payload.senderName}</strong> używa ${SITE_NAME}, by kupić Ci idealny prezent! Potrzebuje Twojego <strong>${categoryLabel}</strong>.`;
  }

  const subject = payload.isAnonymous
    ? `🎁 Ktoś chce kupić Ci prezent! Podaj ${categoryLabel}`
    : `🎁 ${payload.senderName} prosi o ${categoryLabel}`;

  const html = `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f7fa;padding:40px 0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 20px 45px -32px rgba(6,134,239,0.25);">
          <tr>
            <td style="background:#05111b;padding:32px;text-align:center;">
              <img src="${LOGO_URL}" alt="${SITE_NAME}" height="42" style="display:block;margin:0 auto 16px auto;" />
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.02em;">${SITE_NAME}</h1>
              <p style="margin:8px 0 0 0;color:#8fa9c5;font-size:14px;">${SITE_CLAIM}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;color:#101828;font-size:16px;line-height:1.6;">
              <p style="margin-top:0;">${greeting}</p>
              <p>${messageBody}</p>
              <p style="text-align:center;margin:32px 0;">
                <a href="${respondUrl}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:#48A9A6;color:#ffffff;text-decoration:none;font-weight:600;box-shadow:0 12px 24px -12px rgba(72,169,166,0.65);">
                  Podaj rozmiar
                </a>
              </p>
              <p style="color:#475467;font-size:14px;">
                Dostęp do rozmiaru wygaśnie za 48 godzin po udostępnieniu.
              </p>
              ${!payload.hasAccount ? `
              <hr style="border:0;border-top:1px solid #e4e7ec;margin:24px 0;" />
              <p style="color:#475467;font-size:14px;">
                <strong>Nie masz jeszcze konta?</strong><br/>
                Załóż darmowe konto ${SITE_NAME}, aby zapisać wszystkie swoje rozmiary i otrzymać własne <strong>2 darmowe 'strzały' Secret Giver</strong>.
              </p>
              <p style="text-align:center;">
                <a href="${SITE_URL}/auth/register" style="display:inline-block;padding:12px 24px;border-radius:999px;border:2px solid #48A9A6;color:#48A9A6;text-decoration:none;font-weight:600;">
                  Stwórz darmowe konto
                </a>
              </p>
              ` : ''}
              <p style="margin-bottom:0;">Do zobaczenia!<br/>Zespół ${SITE_NAME}</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f2f4f7;padding:20px 32px;text-align:center;color:#667085;font-size:12px;">
              Otrzymałeś tę wiadomość, ponieważ ktoś wpisał Twój adres e-mail w serwisie ${SITE_NAME}. Jeśli to pomyłka, po prostu zignoruj tę wiadomość.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: payload.to,
    subject,
    html,
  });
}

/**
 * Send notification to sender when request is approved
 */
export type SGApprovedEmailPayload = {
  to: string;
  recipientIdentifier: string;
  category: string;
  expiresAt: Date;
};

export async function sendSecretGiverApprovedEmail(payload: SGApprovedEmailPayload) {
  const categoryLabel = getCategoryLabel(payload.category);
  const expiresIn = Math.round((payload.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)); // hours
  const dashboardUrl = `${SITE_URL}/dashboard?tab=secret-giver`;

  const subject = `✅ Rozmiar udostępniony! Otrzymałeś dostęp do ${categoryLabel}`;

  const html = `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f7fa;padding:40px 0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 20px 45px -32px rgba(6,134,239,0.25);">
          <tr>
            <td style="background:#05111b;padding:32px;text-align:center;">
              <img src="${LOGO_URL}" alt="${SITE_NAME}" height="42" style="display:block;margin:0 auto 16px auto;" />
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.02em;">${SITE_NAME}</h1>
              <p style="margin:8px 0 0 0;color:#8fa9c5;font-size:14px;">${SITE_CLAIM}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;color:#101828;font-size:16px;line-height:1.6;">
              <p style="margin-top:0;">Świetna wiadomość!</p>
              <p>Otrzymałeś rozmiar od <strong>${payload.recipientIdentifier}</strong>!</p>
              <p>Twoja prośba o <strong>${categoryLabel}</strong> została zaakceptowana. Masz teraz dostęp do tego rozmiaru przez <strong>${expiresIn} godzin</strong>.</p>
              <p style="text-align:center;margin:32px 0;">
                <a href="${dashboardUrl}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:#48A9A6;color:#ffffff;text-decoration:none;font-weight:600;box-shadow:0 12px 24px -12px rgba(72,169,166,0.65);">
                  Zobacz rozmiar
                </a>
              </p>
              <p style="color:#475467;font-size:14px;">
                <strong>Chcesz mieć ten rozmiar na stałe?</strong><br/>
                Zaproś Odbiorcę do swojego Kręgu Zaufanych. Będziecie mogli na stałe udostępniać sobie rozmiary i Listy Marzeń, bez ponownego pytania.
              </p>
              <p style="margin-bottom:0;">Powodzenia w zakupach!<br/>Zespół ${SITE_NAME}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: payload.to,
    subject,
    html,
  });
}

/**
 * Send notification to sender when request is rejected
 */
export type SGRejectedEmailPayload = {
  to: string;
  recipientIdentifier: string;
  category: string;
};

export async function sendSecretGiverRejectedEmail(payload: SGRejectedEmailPayload) {
  const categoryLabel = getCategoryLabel(payload.category);

  const subject = `❌ Prośba odrzucona - ${categoryLabel}`;

  const html = `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f7fa;padding:40px 0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 20px 45px -32px rgba(6,134,239,0.25);">
          <tr>
            <td style="background:#05111b;padding:32px;text-align:center;">
              <img src="${LOGO_URL}" alt="${SITE_NAME}" height="42" style="display:block;margin:0 auto 16px auto;" />
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.02em;">${SITE_NAME}</h1>
              <p style="margin:8px 0 0 0;color:#8fa9c5;font-size:14px;">${SITE_CLAIM}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;color:#101828;font-size:16px;line-height:1.6;">
              <p style="margin-top:0;">Niestety...</p>
              <p>Użytkownik <strong>${payload.recipientIdentifier}</strong> odrzucił Twoją prośbę o <strong>${categoryLabel}</strong>.</p>
              <p style="color:#475467;font-size:14px;">
                Twoja darmowa pula Secret Giver nie została zwrócona.
              </p>
              <p style="margin-bottom:0;">Zespół ${SITE_NAME}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: payload.to,
    subject,
    html,
  });
}

/**
 * Send notification when request expires
 */
export type SGExpiredEmailPayload = {
  to: string;
  recipientIdentifier: string;
  category: string;
  reason: 'timeout' | 'access_expired';
};

export async function sendSecretGiverExpiredEmail(payload: SGExpiredEmailPayload) {
  const categoryLabel = getCategoryLabel(payload.category);

  const subject = payload.reason === 'timeout' 
    ? `⏰ Prośba wygasła - ${categoryLabel}`
    : `⏰ Dostęp wygasł - ${categoryLabel}`;

  const message = payload.reason === 'timeout'
    ? `Użytkownik <strong>${payload.recipientIdentifier}</strong> nie odpowiedział na Twoją prośbę o <strong>${categoryLabel}</strong> w czasie 72 godzin.`
    : `Twój czasowy dostęp do <strong>${categoryLabel}</strong> od <strong>${payload.recipientIdentifier}</strong> wygasł po 48 godzinach.`;

  const html = `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f7fa;padding:40px 0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 20px 45px -32px rgba(6,134,239,0.25);">
          <tr>
            <td style="background:#05111b;padding:32px;text-align:center;">
              <img src="${LOGO_URL}" alt="${SITE_NAME}" height="42" style="display:block;margin:0 auto 16px auto;" />
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.02em;">${SITE_NAME}</h1>
              <p style="margin:8px 0 0 0;color:#8fa9c5;font-size:14px;">${SITE_CLAIM}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;color:#101828;font-size:16px;line-height:1.6;">
              <p style="margin-top:0;">Twoja prośba wygasła</p>
              <p>${message}</p>
              <p style="color:#475467;font-size:14px;">
                Twoja darmowa pula Secret Giver nie została zwrócona.
              </p>
              <p style="margin-bottom:0;">Zespół ${SITE_NAME}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: payload.to,
    subject,
    html,
  });
}

