import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const { email, password, displayName } = parsed.data;

    const supabase = await createClient();
    const admin = createSupabaseAdminClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
          first_name: displayName || null,
          has_completed_onboarding: false,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
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
