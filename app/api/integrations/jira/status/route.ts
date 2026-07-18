import { NextResponse } from 'next/server';
import { verifyJiraConnection } from '../../../../../src/integrations/jira';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(await verifyJiraConnection());
}
