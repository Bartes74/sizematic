import { NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'Profil nie istnieje.' }, { status: 404 });
  }

  const { data: invitation, error: invitationError } = await admin
    .from('trusted_circle_invitations')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (invitationError) {
    return NextResponse.json({ error: invitationError.message }, { status: 500 });
  }

  if (!invitation || invitation.inviter_profile_id !== profile.id) {
    return NextResponse.json({ error: 'Zaproszenie nie istnieje lub nie należy do Ciebie.' }, { status: 404 });
  }

  const { error: updateError } = await admin
    .from('trusted_circle_invitations')
    .update({ status: 'cancelled', revoked_at: new Date().toISOString() })
    .eq('id', invitation.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
