import { NextResponse } from 'next/server';
import { resetNotifyFlowDemo } from '../../../../src/demo/reset';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST() {
  try {
    return NextResponse.json(await resetNotifyFlowDemo());
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 500 });
  }
}
