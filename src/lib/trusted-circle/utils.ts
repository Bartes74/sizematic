import type { UserRole } from '@/lib/types';

export function getTrustedCircleLimit(role: UserRole | null | undefined): number | null {
  switch (role) {
    case 'premium_plus':
      return null;
    case 'premium':
      return 5;
    case 'free':
    default:
      return 1;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
