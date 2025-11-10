import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSGCheckoutSession, STRIPE_CONFIG } from '@/lib/stripe/client';

type CheckoutPayload = {
  product_key: 'sg_5_pack';
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

/**
 * POST /api/v1/secret-giver/checkout
 * Create Stripe checkout session for Secret Giver pack purchase
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = (await request.json()) as CheckoutPayload;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    if (!body.product_key || !STRIPE_CONFIG.sgProducts[body.product_key]) {
      return NextResponse.json(
        { error: 'Nieprawidłowy klucz produktu' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil nie istnieje' }, { status: 404 });
    }

    const requestUrl = new URL(request.url);
    const siteUrl = SITE_URL ?? `${requestUrl.protocol}//${requestUrl.host}`;

    const session = await createSGCheckoutSession({
      userId: user.id,
      profileId: profile.id,
      productKey: body.product_key,
      successUrl: `${siteUrl}/dashboard?sg_success=true`,
      cancelUrl: `${siteUrl}/dashboard?sg_cancelled=true`,
    });

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('POST /api/v1/secret-giver/checkout failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się utworzyć sesji płatności' },
      { status: 500 }
    );
  }
}

