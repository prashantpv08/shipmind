import { handleExpiredReservationRecovery } from '@/src/platform/billing-bff';

export const dynamic = 'force-dynamic';

export function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  return handleExpiredReservationRecovery(request, context);
}
