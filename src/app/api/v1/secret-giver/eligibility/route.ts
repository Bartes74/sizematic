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
      .select('id, is_sms_verified, free_sg_pool, iap_sg_pool, plan_type, role')
      .eq('owner_id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const planType = profile.plan_type ?? 'free';
    const role = profile.role ?? 'free';
    const isPremium =
      role === 'admin' ||
      planType === 'premium_monthly' ||
      planType === 'premium_yearly';
    const totalPool = profile.free_sg_pool + profile.iap_sg_pool;
    const canSend = isPremium || totalPool > 0;
    const needsVerification = !profile.is_sms_verified;

    return NextResponse.json({
      eligible: canSend && profile.is_sms_verified,
      needs_sms_verification: needsVerification,
      is_premium: isPremium,
      free_sg_pool: profile.free_sg_pool,
      iap_sg_pool: profile.iap_sg_pool,
      plan_type: role === 'admin' ? 'admin' : planType,
      role,
      can_send_if_verified: isPremium || totalPool > 0,
    });
  } catch (error) {
    console.error('GET /api/v1/secret-giver/eligibility failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się sprawdzić uprawnień' },
      { status: 500 }
    );
  }
}

