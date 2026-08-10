import 'server-only';
import { fixtureAnalysisResult } from '../domain/day2';
import type { AnalysisResult, RunMeta } from '../domain/schemas';

export interface ModelProvider {
  analyze(brief: string): Promise<AnalysisResult>;
}

function fixtureRun(startedAt: string): RunMeta {
  return {
    label: 'Demo fixture',
    providerName: 'notifyflow-day2-fixture',
    modelName: 'notifyflow-day2-fixture',
    mode: 'fixture',
    startedAt,
    completedAt: new Date().toISOString(),
    outcome: 'SUCCEEDED',
  };
}

export class FixtureProvider implements ModelProvider {
  async analyze(_brief?: string) {
    const startedAt = new Date().toISOString();
    return fixtureAnalysisResult(fixtureRun(startedAt));
  }
}

export function withVerifiedGrounding<
  T extends { truthStatus: string; sourceEvidence: { spanId?: string; quote?: string }[] },
>(item: T, spans: { id: string; quote: string }[]): T {
  if (item.truthStatus === 'SOURCE_GROUNDED') {
    const valid = item.sourceEvidence.length > 0
      && item.sourceEvidence.every((evidence) => evidence.quote
        && spans.some((span) => span.id === evidence.spanId && span.quote === evidence.quote));
    if (!valid) return { ...item, truthStatus: 'AI_SUGGESTED', sourceEvidence: [] } as T;
  }
  return item;
}

export function sourceEvidenceForQuote(quote: string | undefined, spans: { id: string; quote: string }[]) {
  if (!quote) return [];
  const span = spans.find((candidate) => candidate.quote === quote);
  return span ? [{ spanId: span.id, quote: span.quote }] : [];
}

export function providerForEnv(): ModelProvider {
  return new FixtureProvider();
}
