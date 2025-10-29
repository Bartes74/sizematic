import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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
    const { userId, newRole } = body as { userId: string; newRole: UserRole };

    if (!userId || !newRole) {
      return NextResponse.json(
        { message: 'Brak wymaganych parametrów' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: UserRole[] = ['free', 'premium', 'premium_plus', 'admin'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { message: 'Nieprawidłowa rola' },
        { status: 400 }
      );
    }

    // Update user role
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Error updating role:', error);
      return NextResponse.json(
        { message: 'Błąd podczas aktualizacji roli' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Rola została zaktualizowana' },
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
