import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { DashboardVariant, UserRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createSupabaseAdminClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: 'Nieautoryzowany dostęp' },
        { status: 401 }
      );
    }

    // Check if current user is admin
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('owner_id', user.id)
      .single();

    if (!currentUserProfile || currentUserProfile.role !== 'admin') {
      return NextResponse.json(
        { message: 'Brak uprawnień administratora' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const {
      userId,
      newRole,
      newVariant,
    } = body as {
      userId: string;
      newRole?: UserRole;
      newVariant?: DashboardVariant;
    };

    if (!userId || (!newRole && !newVariant)) {
      return NextResponse.json(
        { message: 'Brak wymaganych parametrów' },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {};

    if (newRole) {
      const validRoles: UserRole[] = ['free', 'premium', 'premium_plus', 'admin'];
      if (!validRoles.includes(newRole)) {
        return NextResponse.json(
          { message: 'Nieprawidłowa rola' },
          { status: 400 }
        );
      }
      updatePayload.role = newRole;
    }

    if (newVariant) {
      const validVariants: DashboardVariant[] = ['full', 'simple'];
      if (!validVariants.includes(newVariant)) {
        return NextResponse.json(
          { message: 'Nieprawidłowy wariant' },
          { status: 400 }
        );
      }
      updatePayload.dashboard_variant = newVariant;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { message: 'Brak zmian do zapisania' },
        { status: 400 }
      );
    }

    const { error } = await adminClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (error) {
      console.error('Error updating role:', error);
      return NextResponse.json(
        { message: 'Błąd podczas aktualizacji profilu' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Profil został zaktualizowany' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in update-role route:', error);
    return NextResponse.json(
      { message: 'Wewnętrzny błąd serwera' },
      { status: 500 }
    );
  }
}
