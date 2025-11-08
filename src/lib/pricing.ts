'use server';

import { PRICING_DEFAULTS } from '@/lib/pricing-defaults';
import { createClient } from '@/lib/supabase/server';
import type { PricingSettings } from '@/lib/types';

export async function getPricingSettings(): Promise<PricingSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pricing_settings')
    .select('currency, premium_monthly, premium_yearly, sg_pack_3, sg_pack_10')
    .single();

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to load pricing settings, using defaults', error);
    }
    return PRICING_DEFAULTS;
  }

  return {
    currency: data?.currency ?? PRICING_DEFAULTS.currency,
    premium_monthly: Number(data?.premium_monthly ?? PRICING_DEFAULTS.premium_monthly),
    premium_yearly: Number(data?.premium_yearly ?? PRICING_DEFAULTS.premium_yearly),
    sg_pack_3: Number(data?.sg_pack_3 ?? PRICING_DEFAULTS.sg_pack_3),
    sg_pack_10: Number(data?.sg_pack_10 ?? PRICING_DEFAULTS.sg_pack_10),
  };
}

export { PRICING_DEFAULTS as DEFAULT_PRICING };

