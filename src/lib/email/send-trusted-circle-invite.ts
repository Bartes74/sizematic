import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '127.0.0.1';
const SMTP_PORT = Number(process.env.SMTP_PORT || 1025);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.TRUSTED_CIRCLE_FROM_EMAIL || 'giftfit@localhost.dev';

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
  const subject = `${payload.inviterName} zaprasza Cię do Kręgu Zaufanych GiftFit`;
  const html = `
    <p>Cześć,</p>
    <p><strong>${payload.inviterName}</strong> zaprasza Cię do swojego Kręgu Zaufanych w GiftFit.</p>
    <p>Aby zaakceptować zaproszenie, kliknij poniższy przycisk:</p>
    <p><a href="${payload.acceptUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#0686ef;color:#ffffff;text-decoration:none;">Dołącz do Kręgu</a></p>
    <p>Jeśli nie masz jeszcze konta, zarejestruj się w GiftFit, a następnie otwórz ponownie link.</p>
    <p>Do zobaczenia!<br/>Zespół GiftFit</p>
  `;

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: payload.to,
    subject,
    html,
  });
}
