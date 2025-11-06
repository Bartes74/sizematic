import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ token: string }>;
};

/**
 * GET /api/v1/secret-giver/public/[token]
 * Public endpoint for users without account to view and respond to SG request
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;
    const admin = createSupabaseAdminClient();

    const { data: sgRequest, error: fetchError } = await admin
      .from('secret_giver_requests')
      .select(`
        id,
        requested_category,
        product_type,
        status,
        is_anonymous,
        is_from_circle_member,
        created_at,
        sender:sender_id(display_name, avatar_url)
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (fetchError || !sgRequest) {
      return NextResponse.json(
        { error: 'Prośba nie istnieje lub już została rozpatrzona' },
        { status: 404 }
      );
    }

    // Don't expose sender info if anonymous
    const response = {
      ...sgRequest,
      sender: sgRequest.is_anonymous ? null : sgRequest.sender,
    };

    return NextResponse.json({ request: response });
  } catch (error) {
    console.error('GET /api/v1/secret-giver/public/[token] failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać prośby Secret Giver' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/secret-giver/public/[token]
 * Public endpoint for users without account to respond to SG request
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;
    const admin = createSupabaseAdminClient();
    const body = await request.json() as { action: 'approve' | 'reject', data_payload?: string };

    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { error: 'action musi być "approve" lub "reject"' },
        { status: 400 }
      );
    }

    if (body.action === 'approve' && !body.data_payload) {
      return NextResponse.json(
        { error: 'data_payload jest wymagany przy akceptacji' },
        { status: 400 }
      );
    }

    // Get the request
    const { data: sgRequest, error: fetchError } = await admin
      .from('secret_giver_requests')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !sgRequest) {
      return NextResponse.json({ error: 'Prośba nie istnieje' }, { status: 404 });
    }

    // Check if already responded
    if (sgRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Prośba została już rozpatrzona' },
        { status: 400 }
      );
    }

    // Update the request
    const updateData: any = {
      status: body.action === 'approve' ? 'approved' : 'rejected',
      responded_at: new Date().toISOString(),
    };

    if (body.action === 'approve') {
      // Set expiration to 48 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);
      updateData.expires_at = expiresAt.toISOString();
      updateData.data_payload = body.data_payload;
    }

    const { data: updated, error: updateError } = await admin
      .from('secret_giver_requests')
      .update(updateData)
      .eq('token', token)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update SG request:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send email notification to sender
    try {
      const { data: senderProfile } = await admin
        .from('profiles')
        .select('email, owner_id')
        .eq('id', sgRequest.sender_id)
        .single();

      if (senderProfile?.email) {
        if (body.action === 'approve') {
          const { sendSecretGiverApprovedEmail } = await import('@/lib/email/send-secret-giver-request');
          await sendSecretGiverApprovedEmail({
            to: senderProfile.email,
            recipientIdentifier: sgRequest.recipient_identifier,
            category: sgRequest.requested_category,
            productType: sgRequest.product_type,
            expiresAt: new Date(updateData.expires_at),
          });
        } else {
          const { sendSecretGiverRejectedEmail } = await import('@/lib/email/send-secret-giver-request');
          await sendSecretGiverRejectedEmail({
            to: senderProfile.email,
            recipientIdentifier: sgRequest.recipient_identifier,
            category: sgRequest.requested_category,
            productType: sgRequest.product_type,
          });
        }
      }
    } catch (emailError) {
      console.error('Failed to send SG response email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      success: true,
      message: body.action === 'approve' 
        ? 'Dziękujemy! Twój rozmiar został wysłany.'
        : 'Prośba odrzucona.'
    });
  } catch (error) {
    console.error('POST /api/v1/secret-giver/public/[token] failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się odpowiedzieć na prośbę Secret Giver' },
      { status: 500 }
    );
  }
}

