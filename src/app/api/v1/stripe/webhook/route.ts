import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { verifyWebhookSignature } from '@/lib/stripe/client';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/v1/stripe/webhook
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    // Check for duplicate event (idempotency)
    const { data: existingEvent } = await admin
      .from('stripe_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log(`Duplicate webhook event ${event.id}, skipping`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // Log the event
    await admin
      .from('stripe_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        event_data: event.data.object as any,
      });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, admin);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription, admin);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, admin);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle successful recurring payment
        console.log('Invoice payment succeeded:', invoice.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle failed payment - could send notification
        console.error('Invoice payment failed:', invoice.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  admin: any
) {
  const metadata = session.metadata;
  if (!metadata?.profile_id) {
    console.error('Missing profile_id in checkout metadata');
    return;
  }

  if (metadata.product_type === 'secret_giver_pack') {
    // Add SG pool to user profile
    const sgQuantity = parseInt(metadata.sg_quantity || '0', 10);
    
    const { data: profile } = await admin
      .from('profiles')
      .select('iap_sg_pool')
      .eq('id', metadata.profile_id)
      .single();

    if (profile) {
      await admin
        .from('profiles')
        .update({
          iap_sg_pool: profile.iap_sg_pool + sgQuantity,
        })
        .eq('id', metadata.profile_id);

      console.log(`Added ${sgQuantity} purchased SG requests to profile ${metadata.profile_id}`);
    }
  } else if (metadata.product_type === 'subscription') {
    // Handle subscription checkout - actual role update happens in subscription.created
    console.log(`Subscription checkout completed for profile ${metadata.profile_id}`);
  }
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  admin: any
) {
  const metadata = subscription.metadata;
  if (!metadata?.profile_id) {
    console.error('Missing profile_id in subscription metadata');
    return;
  }

  const role = metadata.role || 'free';
  const planType =
    metadata.plan_key === 'premium_yearly'
      ? 'premium_yearly'
      : metadata.plan_key === 'premium_monthly'
      ? 'premium_monthly'
      : 'free';
  const status = subscription.status;

  // Update profile role if subscription is active
  if (status === 'active' || status === 'trialing') {
    await admin
      .from('profiles')
      .update({ role, plan_type: planType })
      .eq('id', metadata.profile_id);

    console.log(`Updated profile ${metadata.profile_id} to role ${role} (plan ${planType})`);
  }

  // Upsert subscription record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any;
  const currentPeriodStart = typeof sub.current_period_start === 'number' 
    ? new Date(sub.current_period_start * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEnd = typeof sub.current_period_end === 'number'
    ? new Date(sub.current_period_end * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // default 30 days

  await admin
    .from('subscriptions')
    .upsert({
      profile_id: metadata.profile_id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: sub.cancel_at_period_end || false,
    });
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  admin: any
) {
  const metadata = subscription.metadata;
  if (!metadata?.profile_id) {
    console.error('Missing profile_id in subscription metadata');
    return;
  }

  // Downgrade to free
  await admin
    .from('profiles')
    .update({ role: 'free', plan_type: 'free' })
    .eq('id', metadata.profile_id);

  // Update subscription status
  await admin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  console.log(`Downgraded profile ${metadata.profile_id} to free after subscription cancellation`);
}

