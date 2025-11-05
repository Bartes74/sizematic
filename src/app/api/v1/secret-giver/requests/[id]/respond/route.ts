import { NextRequest, NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RespondPayload = {
  action: 'approve' | 'reject';
  data_payload?: string; // The size/measurement value
};

/**
 * POST /api/v1/secret-giver/requests/[id]/respond
 * Recipient responds to a Secret Giver request (approve or reject)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const admin = createSupabaseAdminClient();
    const body = (await request.json()) as RespondPayload;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

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

    // Get recipient profile
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('id, email, phone_number')
      .eq('owner_id', user.id)
      .single();

    if (!recipientProfile) {
      return NextResponse.json({ error: 'Profil nie istnieje' }, { status: 404 });
    }

    // Get the request
    const { data: sgRequest, error: fetchError } = await admin
      .from('secret_giver_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !sgRequest) {
      return NextResponse.json({ error: 'Prośba nie istnieje' }, { status: 404 });
    }

    // Verify the user is the recipient
    const isRecipient = 
      (sgRequest.recipient_profile_id && sgRequest.recipient_profile_id === recipientProfile.id) ||
      (sgRequest.recipient_identifier === recipientProfile.email) ||
      (sgRequest.recipient_identifier === recipientProfile.phone_number);

    if (!isRecipient) {
      return NextResponse.json(
        { error: 'Nie jesteś odbiorcą tej prośby' },
        { status: 403 }
      );
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
      recipient_profile_id: recipientProfile.id, // Link profile if not linked yet
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
      .eq('id', id)
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
            expiresAt: new Date(updateData.expires_at),
          });
        } else {
          const { sendSecretGiverRejectedEmail } = await import('@/lib/email/send-secret-giver-request');
          await sendSecretGiverRejectedEmail({
            to: senderProfile.email,
            recipientIdentifier: sgRequest.recipient_identifier,
            category: sgRequest.requested_category,
          });
        }
      }
    } catch (emailError) {
      console.error('Failed to send SG response email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      request: updated,
      message: body.action === 'approve' 
        ? 'Prośba zatwierdzona. Nadawca otrzyma dostęp na 48 godzin.'
        : 'Prośba odrzucona.'
    });
  } catch (error) {
    console.error('POST /api/v1/secret-giver/requests/[id]/respond failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się odpowiedzieć na prośbę Secret Giver' },
      { status: 500 }
    );
  }
}

