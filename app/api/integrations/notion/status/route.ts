import { NextResponse } from 'next/server';
import { notionStatus } from '../../../../../src/integrations/notion';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(notionStatus());
}
