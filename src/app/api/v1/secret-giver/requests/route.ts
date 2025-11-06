import { NextRequest, NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { normalizeEmail } from '@/lib/trusted-circle/utils';

type CreateSGRequestPayload = {
  recipient_identifier: string; // email or phone
  requested_category: string;
  product_type?: string;
  is_anonymous?: boolean;
};

/**
 * GET /api/v1/secret-giver/requests
 * Get user's Secret Giver requests (sent and received)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'sent', 'received', 'all'

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, phone_number')
      .eq('owner_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil nie istnieje' }, { status: 404 });
    }

    let requests: any[] = [];

    if (type === 'sent' || type === 'all') {
      const { data: sentRequests } = await supabase
        .from('secret_giver_requests')
        .select(`
          *,
          sender:sender_id(id, display_name, avatar_url),
          recipient:recipient_profile_id(id, display_name, avatar_url)
        `)
        .eq('sender_id', profile.id)
        .order('created_at', { ascending: false });

      if (sentRequests) {
        requests = [...requests, ...sentRequests.map(r => ({ ...r, direction: 'sent' }))];
      }
    }

    if (type === 'received' || type === 'all') {
      const { data: receivedRequests } = await supabase
        .from('secret_giver_requests')
        .select(`
          *,
          sender:sender_id(id, display_name, avatar_url),
          recipient:recipient_profile_id(id, display_name, avatar_url)
        `)
        .or(`recipient_profile_id.eq.${profile.id},and(recipient_profile_id.is.null,recipient_identifier.eq.${profile.email})${profile.phone_number ? `,and(recipient_profile_id.is.null,recipient_identifier.eq.${profile.phone_number})` : ''}`)
        .order('created_at', { ascending: false });

      if (receivedRequests) {
        requests = [...requests, ...receivedRequests.map(r => ({ ...r, direction: 'received' }))];
      }
    }

    // Sort all by created_at
    requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('GET /api/v1/secret-giver/requests failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać próśb Secret Giver' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/secret-giver/requests
 * Create a new Secret Giver request
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createSupabaseAdminClient();
    const body = (await request.json()) as CreateSGRequestPayload;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    // Validate input
    if (!body.recipient_identifier || !body.requested_category) {
      return NextResponse.json(
        { error: 'recipient_identifier i requested_category są wymagane' },
        { status: 400 }
      );
    }

    // Get sender profile
    const { data: senderProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_sms_verified, free_sg_pool, role, email, phone_number, allow_anonymous_sg')
      .eq('owner_id', user.id)
      .single();

    if (profileError || !senderProfile) {
      return NextResponse.json({ error: 'Profil nie istnieje' }, { status: 404 });
    }

    // Check SMS verification
    if (!senderProfile.is_sms_verified) {
      return NextResponse.json(
        { 
          error: 'sms_verification_required',
          message: 'Wymagana weryfikacja SMS przed wysłaniem prośby Secret Giver'
        },
        { status: 403 }
      );
    }

    // Check eligibility (premium or has pool)
    const isPremium = senderProfile.role === 'premium' || senderProfile.role === 'premium_plus' || senderProfile.role === 'admin';
    if (!isPremium && senderProfile.free_sg_pool <= 0) {
      return NextResponse.json(
        {
          error: 'pool_exhausted',
          message: 'Wyczerpano darmową pulę Secret Giver. Kup pakiet lub Premium.'
        },
        { status: 402 }
      );
    }

    // Normalize recipient identifier
    const isEmail = body.recipient_identifier.includes('@');
    const recipientIdentifier = isEmail 
      ? normalizeEmail(body.recipient_identifier)
      : body.recipient_identifier.trim();

    // Check if sending to self
    if (
      (isEmail && normalizeEmail(senderProfile.email || '') === recipientIdentifier) ||
      (!isEmail && senderProfile.phone_number === recipientIdentifier)
    ) {
      return NextResponse.json(
        { error: 'Nie możesz wysłać prośby do siebie' },
        { status: 400 }
      );
    }

    // Find recipient profile
    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('id, owner_id, allow_anonymous_sg')
      .or(`email.ilike.${recipientIdentifier},phone_number.eq.${recipientIdentifier}`)
      .maybeSingle();

    // Check if recipient allows anonymous requests
    if (body.is_anonymous && recipientProfile && !recipientProfile.allow_anonymous_sg) {
      return NextResponse.json(
        {
          error: 'anonymous_not_allowed',
          message: 'Ten użytkownik nie akceptuje próśb anonimowych. Odznacz pole "Wyślij anonimowo".'
        },
        { status: 400 }
      );
    }

    // Check if they are in trusted circle
    let isFromCircleMember = false;
    if (recipientProfile) {
      const { data: membership } = await admin
        .from('trusted_circle_memberships')
        .select('id')
        .or(
          `and(owner_profile_id.eq.${senderProfile.id},member_profile_id.eq.${recipientProfile.id}),and(owner_profile_id.eq.${recipientProfile.id},member_profile_id.eq.${senderProfile.id})`
        )
        .maybeSingle();

      if (membership) {
        isFromCircleMember = true;

        // Check if sender already has access to this category
        const { data: existingPermission } = await admin
          .from('trusted_circle_permissions')
          .select('id')
          .eq('owner_profile_id', recipientProfile.id)
          .eq('member_profile_id', senderProfile.id)
          .eq('category', body.requested_category)
          .maybeSingle();

        if (existingPermission) {
          return NextResponse.json(
            {
              error: 'already_have_access',
              message: 'Posiadasz już ten rozmiar! Wejdź do "Zaufanego Kręgu" i wybierz profil Odbiorcy, aby zobaczyć wszystkie rozmiary, jakie Ci udostępnia.'
            },
            { status: 400 }
          );
        }
      }
    }

    // Create the request
    const { data: sgRequest, error: insertError } = await admin
      .from('secret_giver_requests')
      .insert({
        sender_id: senderProfile.id,
        recipient_identifier: recipientIdentifier,
        recipient_profile_id: recipientProfile?.id || null,
        requested_category: body.requested_category,
        product_type: body.product_type || null,
        is_anonymous: body.is_anonymous || false,
        is_from_circle_member: isFromCircleMember,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create SG request:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Decrement free pool if not premium
    if (!isPremium) {
      await admin
        .from('profiles')
        .update({ free_sg_pool: senderProfile.free_sg_pool - 1 })
        .eq('id', senderProfile.id);
    }

    // Send email notification to recipient
    try {
      const { sendSecretGiverRequestEmail } = await import('@/lib/email/send-secret-giver-request');
      await sendSecretGiverRequestEmail({
        to: recipientIdentifier,
        category: body.requested_category,
        productType: body.product_type,
        senderName: body.is_anonymous ? undefined : senderProfile.email || 'Użytkownik',
        isFromCircleMember: isFromCircleMember,
        isAnonymous: body.is_anonymous || false,
        token: sgRequest.token,
        hasAccount: !!recipientProfile,
      });
    } catch (emailError) {
      console.error('Failed to send SG request email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ request: sgRequest }, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/secret-giver/requests failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się utworzyć prośby Secret Giver' },
      { status: 500 }
    );
  }
}

