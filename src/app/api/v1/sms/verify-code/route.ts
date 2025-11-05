import { NextRequest, NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';

type VerifyCodePayload = {
  code: string;
};

const FREE_SG_POOL_ON_VERIFICATION = 2; // As per user requirement

/**
 * POST /api/v1/sms/verify-code
 * Verify SMS code and unlock Secret Giver free pool
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createSupabaseAdminClient();
    const body = (await request.json()) as VerifyCodePayload;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    if (!body.code) {
      return NextResponse.json(
        { error: 'Kod weryfikacyjny jest wymagany' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_sms_verified, phone_number, free_sg_pool')
      .eq('owner_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil nie istnieje' }, { status: 404 });
    }

    // Check if already verified
    if (profile.is_sms_verified) {
      return NextResponse.json(
        { error: 'Numer telefonu jest już zweryfikowany' },
        { status: 400 }
      );
    }

    if (!profile.phone_number) {
      return NextResponse.json(
        { error: 'Najpierw wyślij kod weryfikacyjny' },
        { status: 400 }
      );
    }

    // Find valid verification code
    const { data: verificationCode, error: codeError } = await admin
      .from('sms_verification_codes')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('phone_number', profile.phone_number)
      .eq('code', body.code.trim())
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) {
      console.error('Error fetching verification code:', codeError);
      return NextResponse.json({ error: codeError.message }, { status: 500 });
    }

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Nieprawidłowy lub wygasły kod weryfikacyjny' },
        { status: 400 }
      );
    }

    // Mark code as verified
    await admin
      .from('sms_verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verificationCode.id);

    // Update profile: verify SMS and grant free SG pool
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        is_sms_verified: true,
        free_sg_pool: profile.free_sg_pool + FREE_SG_POOL_ON_VERIFICATION,
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Weryfikacja zakończona! Odblokowałeś ${FREE_SG_POOL_ON_VERIFICATION} darmowe 'strzały' Secret Giver.`,
      free_sg_pool: profile.free_sg_pool + FREE_SG_POOL_ON_VERIFICATION,
    });
  } catch (error) {
    console.error('POST /api/v1/sms/verify-code failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się zweryfikować kodu' },
      { status: 500 }
    );
  }
}

