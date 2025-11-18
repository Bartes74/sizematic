import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccessibleSizeLabels, getAccessibleGarments, getAccessibleBodyMeasurements } from '@/server/trusted-circle/access';
import { createSupabaseAdminClient } from '@/lib/supabase';

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const params = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const memberProfileId = params.memberId?.trim();
    if (!memberProfileId) {
      return NextResponse.json({ error: 'invalid_member' }, { status: 400 });
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!currentProfile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }

    const admin = createSupabaseAdminClient();
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', memberProfileId)
      .maybeSingle();

    if (!ownerProfile) {
      return NextResponse.json({ error: 'member_not_found' }, { status: 404 });
    }

    const [sizeLabels, garments, bodyMeasurements] = await Promise.all([
      getAccessibleSizeLabels(memberProfileId, currentProfile.id),
      getAccessibleGarments(memberProfileId, currentProfile.id),
      getAccessibleBodyMeasurements(memberProfileId, currentProfile.id),
    ]);

    return NextResponse.json({
      size_labels: sizeLabels,
      garments: garments,
      body_measurements: bodyMeasurements,
    });
  } catch (error) {
    console.error('GET /api/v1/trusted-circle/members/[memberId]/shared failed:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
