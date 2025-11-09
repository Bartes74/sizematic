import { NextRequest, NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';

type RegisterPayload = {
  email?: string;
  password?: string;
  displayName?: string;
};

function isValidEmail(value: string | undefined): value is string {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPassword(value: string | undefined): value is string {
  return typeof value === 'string' && value.length >= 8;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as RegisterPayload | null;

    if (!body || !isValidEmail(body.email) || !isValidPassword(body.password)) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const email = body.email.trim();
    const password = body.password;
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : undefined;

    const supabase = await createClient();
    const admin = createSupabaseAdminClient();

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get('origin') ?? 'http://localhost:3000';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
          first_name: displayName || null,
          has_completed_onboarding: false,
        },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'no_user' }, { status: 500 });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', data.user.id)
      .maybeSingle();

    if (profile) {
      await admin
        .from('profiles')
        .update({
          display_name: displayName || email.split('@')[0],
          first_name: displayName || null,
          has_completed_onboarding: false,
        })
        .eq('id', profile.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/auth/register failed:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
