import { handleBudgetPolicyUpdate } from '@/src/platform/billing-bff';

export const dynamic = 'force-dynamic';

export function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string; policyId: string }> },
) {
  return handleBudgetPolicyUpdate(request, context);
}
