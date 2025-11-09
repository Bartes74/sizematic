import { NextRequest, NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';

type OnboardingPayload = {
  completed?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createSupabaseAdminClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as OnboardingPayload | null;
    const completed = payload?.completed ?? true;

    const { error: updateError } = await admin
      .from('profiles')
      .update({ has_completed_onboarding: completed })
      .eq('owner_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, completed });
  } catch (error) {
    console.error('POST /api/v1/profile/onboarding failed:', error);
    return NextResponse.json({ error: 'Nie udało się zaktualizować ustawień onboarding.' }, { status: 500 });
  }
}

