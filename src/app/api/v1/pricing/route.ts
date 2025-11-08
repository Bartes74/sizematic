import { NextResponse } from 'next/server';
import { getPricingSettings } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  const pricing = await getPricingSettings();
  return NextResponse.json(pricing, {
    headers: {
      'cache-control': 'no-store',
    },
  });
}

