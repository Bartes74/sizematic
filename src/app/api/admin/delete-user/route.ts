import { NextRequest, NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';

type DeletePayload = {
  user_id: string;
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

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 });
    }

    const payload = (await request.json().catch(() => null)) as DeletePayload | null;
    const targetUserId = payload?.user_id?.trim();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Brak identyfikatora użytkownika' }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Nie możesz usunąć własnego konta.' }, { status: 400 });
    }

    const { data: targetProfile } = await admin
      .from('profiles')
      .select('id, owner_id')
      .eq('id', targetUserId)
      .maybeSingle();

    if (!targetProfile?.owner_id) {
      return NextResponse.json({ error: 'Profil użytkownika nie istnieje.' }, { status: 404 });
    }

    const { error: deleteProfileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', targetUserId);

    if (deleteProfileError) {
      console.error('Failed to delete profile:', deleteProfileError);
      return NextResponse.json({ error: deleteProfileError.message }, { status: 500 });
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(targetProfile.owner_id);

    if (deleteUserError) {
      console.error('Failed to delete auth user:', deleteUserError);
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/admin/delete-user failed:', error);
    return NextResponse.json({ error: 'Nie udało się usunąć użytkownika.' }, { status: 500 });
  }
}

