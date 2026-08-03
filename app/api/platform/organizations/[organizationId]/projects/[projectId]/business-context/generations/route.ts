import { handleBusinessContextMutation } from '@/src/platform/business-context-bff';

export const dynamic = 'force-dynamic';

export function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string }> }) {
  return handleBusinessContextMutation(request, context, 'generate');
}
