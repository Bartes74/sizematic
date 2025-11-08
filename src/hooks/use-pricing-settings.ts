'use client';

import useSWR from 'swr';
import type { PricingSettings } from '@/lib/types';
import { PRICING_DEFAULTS } from '@/lib/pricing-defaults';

type PricingResponse = PricingSettings;

const fetcher = async (url: string): Promise<PricingResponse> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Failed to load pricing');
  }
  return res.json();
};

export function usePricingSettings() {
  const { data, error, isLoading, mutate } = useSWR<PricingResponse>('/api/v1/pricing', fetcher, {
    revalidateOnFocus: false,
  });

  return {
    data: data ?? PRICING_DEFAULTS,
    currency: (data ?? PRICING_DEFAULTS).currency,
    error,
    isLoading,
    mutate,
  };
}

