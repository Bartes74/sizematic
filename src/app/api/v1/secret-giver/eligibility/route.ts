import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/secret-giver/eligibility
 * Check if user is eligible to send Secret Giver requests
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_sms_verified, free_sg_pool, role')
      .eq('owner_id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const isPremium = profile.role === 'premium' || profile.role === 'premium_plus' || profile.role === 'admin';
    const canSend = isPremium || profile.free_sg_pool > 0;
    const needsVerification = !profile.is_sms_verified;

    return NextResponse.json({
      eligible: canSend && profile.is_sms_verified,
      needs_sms_verification: needsVerification,
      is_premium: isPremium,
      free_sg_pool: profile.free_sg_pool,
      can_send_if_verified: isPremium || profile.free_sg_pool > 0,
    });
  } catch (error) {
    console.error('GET /api/v1/secret-giver/eligibility failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się sprawdzić uprawnień' },
      { status: 500 }
    );
  }
}

