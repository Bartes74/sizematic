import { NextRequest, NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { sendSMSCode, generateVerificationCode, normalizePhoneNumber } from '@/lib/sms/sinch';

type SendCodePayload = {
  phone_number: string;
};

/**
 * POST /api/v1/sms/send-code
 * Send SMS verification code to user's phone
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createSupabaseAdminClient();
    const body = (await request.json()) as SendCodePayload;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    if (!body.phone_number) {
      return NextResponse.json(
        { error: 'phone_number jest wymagany' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_sms_verified, phone_number')
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

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(body.phone_number);

    // Check if phone number is already used by another user
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .eq('is_sms_verified', true)
      .neq('id', profile.id)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Ten numer telefonu jest już zweryfikowany przez innego użytkownika' },
        { status: 409 }
      );
    }

    // Check rate limiting - max 10 codes per hour per profile
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { count } = await admin
      .from('sms_verification_codes')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .gte('created_at', oneHourAgo.toISOString());

    if ((count || 0) >= 10) {
      return NextResponse.json(
        { error: 'Zbyt wiele próśb o kod. Spróbuj ponownie za godzinę.' },
        { status: 429 }
      );
    }

    // Generate verification code
    const code = generateVerificationCode();

    // Set expiration to 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Save code to database
    const { error: insertError } = await admin
      .from('sms_verification_codes')
      .insert({
        profile_id: profile.id,
        phone_number: normalizedPhone,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Failed to save verification code:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Send SMS via Sinch
    const smsResult = await sendSMSCode(normalizedPhone, code);

    if (!smsResult.success) {
      console.error('SMS sending failed:', smsResult.error);
      return NextResponse.json(
        { error: smsResult.error || 'Nie udało się wysłać SMS. Spróbuj ponownie.' },
        { status: 500 }
      );
    }
    
    console.log('SMS verification code sent successfully to:', normalizedPhone);

    // Update profile with phone number (not yet verified)
    await admin
      .from('profiles')
      .update({ phone_number: normalizedPhone })
      .eq('id', profile.id);

    return NextResponse.json({
      success: true,
      message: 'Kod weryfikacyjny został wysłany SMS',
      expires_in_minutes: 10,
    });
  } catch (error) {
    console.error('POST /api/v1/sms/send-code failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się wysłać kodu weryfikacyjnego' },
      { status: 500 }
    );
  }
}

