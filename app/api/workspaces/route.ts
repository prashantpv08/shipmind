import { NextResponse } from 'next/server';
import { listWorkspaces } from '../../../src/projects/store';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ workspaces: await listWorkspaces() });
}
