import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/secret-giver/requests/[id]
 * Get details of a specific Secret Giver request
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    const { data: sgRequest, error: fetchError } = await supabase
      .from('secret_giver_requests')
      .select(`
        *,
        sender:sender_id(id, display_name, avatar_url, email),
        recipient:recipient_profile_id(id, display_name, avatar_url, email)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!sgRequest) {
      return NextResponse.json({ error: 'Prośba nie istnieje' }, { status: 404 });
    }

    return NextResponse.json({ request: sgRequest });
  } catch (error) {
    console.error('GET /api/v1/secret-giver/requests/[id] failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać prośby Secret Giver' },
      { status: 500 }
    );
  }
}

