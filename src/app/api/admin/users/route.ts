import { NextRequest, NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import type { DashboardVariant, UserRole } from '@/lib/types';

type SortOption =
  | 'created_desc'
  | 'created_asc'
  | 'name_asc'
  | 'name_desc'
  | 'role_asc'
  | 'role_desc'
  | 'variant_asc'
  | 'variant_desc';

const ROLE_VALUES: UserRole[] = ['free', 'premium', 'premium_plus', 'admin'];
const VARIANT_VALUES: DashboardVariant[] = ['full', 'simple'];

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('owner_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createSupabaseAdminClient();
    const { searchParams } = new URL(request.url);

    const rawSearch = searchParams.get('search')?.trim() ?? '';
    const rawRole = (searchParams.get('role') ?? 'all') as UserRole | 'all';
    const rawVariant = (searchParams.get('variant') ?? 'all') as DashboardVariant | 'all' | 'unset';
    const sortOption = (searchParams.get('sort') ?? 'created_desc') as SortOption;
    const limitParam = Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;

    let query = adminClient
      .from('profiles')
      .select('id, display_name, email, role, dashboard_variant, created_at, owner_id')
      .limit(limit);

    if (rawSearch.length > 0) {
      const sanitized = rawSearch.replace(/[%_]/g, '\\$&').replace(/'/g, '');
      query = query.or(`display_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
    }

    if (rawRole !== 'all' && ROLE_VALUES.includes(rawRole as UserRole)) {
      query = query.eq('role', rawRole);
    }

    if (rawVariant === 'unset') {
      query = query.is('dashboard_variant', null);
    } else if (rawVariant !== 'all' && VARIANT_VALUES.includes(rawVariant as DashboardVariant)) {
      query = query.eq('dashboard_variant', rawVariant);
    }

    let orderColumn: string = 'created_at';
    let ascending = false;

    switch (sortOption) {
      case 'created_asc':
        ascending = true;
        break;
      case 'name_asc':
        orderColumn = 'display_name';
        ascending = true;
        break;
      case 'name_desc':
        orderColumn = 'display_name';
        ascending = false;
        break;
      case 'role_asc':
        orderColumn = 'role';
        ascending = true;
        break;
      case 'role_desc':
        orderColumn = 'role';
        ascending = false;
        break;
      case 'variant_asc':
        orderColumn = 'dashboard_variant';
        ascending = true;
        break;
      case 'variant_desc':
        orderColumn = 'dashboard_variant';
        ascending = false;
        break;
      case 'created_desc':
      default:
        orderColumn = 'created_at';
        ascending = false;
        break;
    }

    query = query.order(orderColumn, {
      ascending,
      nullsFirst: orderColumn === 'display_name' || orderColumn === 'email' ? false : undefined,
    });

    const { data, error } = await query;

    if (error) {
      console.error('[Admin] Failed to load users list', error);
      return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    console.error('[Admin] Unexpected error loading users', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

