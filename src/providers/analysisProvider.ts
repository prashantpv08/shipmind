import type { AnalysisRun, SourceDocument } from '@/domain/schemas';
export interface AnalysisProvider { analyze(projectId: string, document: SourceDocument): Promise<AnalysisRun>; }
export class LiveAnalysisProvider implements AnalysisProvider { async analyze(): Promise<AnalysisRun> { throw new Error('LiveAnalysisProvider is intentionally disabled for Day 1 until the fixture-backed journey works.'); } }
