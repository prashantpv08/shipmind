import { NextResponse } from 'next/server';
import { brief, initialGaps, requirements, spans } from '../../../src/domain/day2';
import { providerForEnv } from '../../../src/ai/provider';
export async function GET(){const provider=providerForEnv(); const qs=await provider.generateClarifications(brief); const arch=await provider.compareArchitectures(); if(qs.meta.outcome==='FAILED'||arch.meta.outcome==='FAILED') return NextResponse.json({error:qs.meta.error||arch.meta.error,analysisMeta:qs.meta,architectureMeta:arch.meta},{status:500}); return NextResponse.json({brief,spans,requirements,gaps:initialGaps,questions:qs.questions,options:arch.options,analysisMeta:qs.meta,architectureMeta:arch.meta});}
