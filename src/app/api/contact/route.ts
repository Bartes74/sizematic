import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

function getTransport() {
  const host = process.env.CONTACT_SMTP_HOST;
  const port = process.env.CONTACT_SMTP_PORT;
  const user = process.env.CONTACT_SMTP_USER;
  const pass = process.env.CONTACT_SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('Missing SMTP configuration for contact form');
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function POST(request: Request) {
  const { name, email, message } = await request.json().catch(() => ({}));

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const transporter = getTransport();

    await transporter.sendMail({
      from: process.env.CONTACT_FROM ?? process.env.CONTACT_SMTP_USER,
      to: process.env.CONTACT_RECIPIENT ?? 'bartes7@gmail.com',
      replyTo: email,
      subject: `[GiftFit] Nowa wiadomość od ${name}`,
      text: message,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
