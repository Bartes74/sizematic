/**
 * Stripe client initialization and helpers
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Lazy initialization - only create Stripe instance when needed
let stripeInstance: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }
  
  if (!stripeInstance) {
    stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    });
  }
  
  return stripeInstance;
};

export const STRIPE_CONFIG = {
  webhookSecret: STRIPE_WEBHOOK_SECRET,
  currency: 'pln',
  
  // Secret Giver product prices (in grosze - PLN cents)
  sgProducts: {
    sg_3_pack: {
      name: 'Secret Giver - 3 strzały',
      price: 1999, // 19.99 PLN
      quantity: 3,
    },
    sg_10_pack: {
      name: 'Secret Giver - 10 strzałów',
      price: 4999, // 49.99 PLN
      quantity: 10,
    },
  },

  // Subscription plans (yearly/monthly)
  subscriptionPlans: {
    premium_yearly: {
      name: 'Premium - Roczny',
      price: 9999, // 99.99 PLN/year
      interval: 'year' as Stripe.Price.Recurring.Interval,
      role: 'premium' as const,
    },
    premium_monthly: {
      name: 'Premium - Miesięczny',
      price: 1999, // 19.99 PLN/month
      interval: 'month' as Stripe.Price.Recurring.Interval,
      role: 'premium' as const,
    },
    premium_plus_yearly: {
      name: 'Premium+ - Roczny',
      price: 19999, // 199.99 PLN/year
      interval: 'year' as Stripe.Price.Recurring.Interval,
      role: 'premium_plus' as const,
    },
  },
};

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  }

  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    STRIPE_WEBHOOK_SECRET
  );
}

/**
 * Create a checkout session for Secret Giver pack
 */
export async function createSGCheckoutSession(params: {
  userId: string;
  profileId: string;
  productKey: 'sg_3_pack' | 'sg_10_pack';
  successUrl: string;
  cancelUrl: string;
}) {
  const product = STRIPE_CONFIG.sgProducts[params.productKey];

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card', 'blik', 'p24'],
    line_items: [
      {
        price_data: {
          currency: STRIPE_CONFIG.currency,
          product_data: {
            name: product.name,
            description: `Pakiet ${product.quantity} próśb Secret Giver`,
          },
          unit_amount: product.price,
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      user_id: params.userId,
      profile_id: params.profileId,
      product_type: 'secret_giver_pack',
      product_key: params.productKey,
      sg_quantity: product.quantity.toString(),
    },
  });

  return session;
}

/**
 * Create a subscription checkout session
 */
export async function createSubscriptionCheckoutSession(params: {
  userId: string;
  profileId: string;
  planKey: keyof typeof STRIPE_CONFIG.subscriptionPlans;
  successUrl: string;
  cancelUrl: string;
}) {
  const plan = STRIPE_CONFIG.subscriptionPlans[params.planKey];

  // First, create or retrieve the product and price
  const product = await getStripe().products.create({
    name: plan.name,
    metadata: {
      plan_key: params.planKey,
      role: plan.role,
    },
  });

  const price = await getStripe().prices.create({
    product: product.id,
    currency: STRIPE_CONFIG.currency,
    unit_amount: plan.price,
    recurring: {
      interval: plan.interval,
    },
  });

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'blik', 'p24'],
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      user_id: params.userId,
      profile_id: params.profileId,
      product_type: 'subscription',
      plan_key: params.planKey,
      role: plan.role,
    },
  });

  return session;
}

