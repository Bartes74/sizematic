'use server';

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createSubscriptionCheckoutSession, STRIPE_CONFIG } from '@/lib/stripe/client';

type CheckoutPayload = {
  plan_key: keyof typeof STRIPE_CONFIG.subscriptionPlans;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = (await request.json().catch(() => null)) as CheckoutPayload | null;

    if (!body?.plan_key || !(body.plan_key in STRIPE_CONFIG.subscriptionPlans)) {
      return NextResponse.json({ error: 'Nieprawidłowy plan subskrypcyjny.' }, { status: 400 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan_type')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profil użytkownika nie istnieje.' }, { status: 404 });
    }

    if (profile.plan_type === body.plan_key) {
      return NextResponse.json(
        {
          error: 'already_subscribed',
          message: 'Masz już aktywną subskrypcję tego typu.',
        },
        { status: 409 },
      );
    }

    const requestUrl = new URL(request.url);
    const siteUrl = SITE_URL ?? `${requestUrl.protocol}//${requestUrl.host}`;

    const session = await createSubscriptionCheckoutSession({
      userId: user.id,
      profileId: profile.id,
      planKey: body.plan_key,
      successUrl: `${siteUrl}/dashboard?subscription_success=true`,
      cancelUrl: `${siteUrl}/dashboard?subscription_cancelled=true`,
    });

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('POST /api/v1/subscriptions/checkout failed:', error);
    return NextResponse.json(
      { error: 'Nie udało się utworzyć sesji subskrypcji Stripe.' },
      { status: 500 },
    );
  }
}

