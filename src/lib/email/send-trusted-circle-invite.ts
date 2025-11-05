import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '127.0.0.1';
const SMTP_PORT = Number(process.env.SMTP_PORT || 1025);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.TRUSTED_CIRCLE_FROM_EMAIL || 'giftfit@localhost.dev';
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

export type TrustedCircleInviteEmailPayload = {
  to: string;
  inviterName: string;
  acceptUrl: string;
};

export async function sendTrustedCircleInviteEmail(payload: TrustedCircleInviteEmailPayload) {
  const acceptOrigin = (() => {
    try {
      return new URL(payload.acceptUrl).origin;
    } catch (error) {
      console.error('sendTrustedCircleInviteEmail: failed to parse acceptUrl origin', error);
      return SITE_URL;
    }
  })() || 'http://localhost:3000';

  const assetBase = SITE_URL || acceptOrigin;
  const normalisedAssetBase = assetBase.endsWith('/') ? assetBase.slice(0, -1) : assetBase;
  const logoUrl = LOGO_URL || `${normalisedAssetBase}/logo.svg`;

  const subject = `${payload.inviterName} zaprasza Cię do Kręgu Zaufanych ${SITE_NAME}`;
  const html = `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f7fa;padding:40px 0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 20px 45px -32px rgba(6,134,239,0.25);">
          <tr>
            <td style="background:#05111b;padding:32px;text-align:center;">
              <img src="${logoUrl}" alt="${SITE_NAME}" height="42" style="display:block;margin:0 auto 16px auto;" />
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.02em;">${SITE_NAME}</h1>
              <p style="margin:8px 0 0 0;color:#8fa9c5;font-size:14px;">${SITE_CLAIM}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;color:#101828;font-size:16px;line-height:1.6;">
              <p style="margin-top:0;">Cześć,</p>
              <p><strong>${payload.inviterName}</strong> zaprasza Cię do swojego Kręgu Zaufanych w ${SITE_NAME}. Dzięki temu będziesz mógł bezpiecznie udostępniać rozmiary i pomagać sobie wzajemnie przy wyborze prezentów.</p>
              <p>Aby zaakceptować zaproszenie, kliknij poniższy przycisk:</p>
              <p style="text-align:center;margin:32px 0;">
                <a href="${payload.acceptUrl}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:#48A9A6;color:#ffffff;text-decoration:none;font-weight:600;box-shadow:0 12px 24px -12px rgba(72,169,166,0.65);">
                  Dołącz do Kręgu
                </a>
              </p>
              <p style="color:#475467;font-size:14px;">
                Jeśli nie masz jeszcze konta, zarejestruj się w ${SITE_NAME}, a następnie ponownie kliknij odnośnik.
              </p>
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
