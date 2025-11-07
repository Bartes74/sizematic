import type { PlanType, UserRole } from '@/lib/types';

export function getTrustedCircleLimit(
  roleOrPlan: UserRole | PlanType | null | undefined
): number | null {
  switch (roleOrPlan) {
    case 'premium_plus':
    case 'premium':
    case 'premium_monthly':
    case 'premium_yearly':
    case 'admin':
      return null;
    case 'free':
    default:
      return 1;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
