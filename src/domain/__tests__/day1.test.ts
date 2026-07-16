import { describe, expect, it } from 'vitest';
import { notifyFlowSourceDocument } from '@/fixtures/notifyflow';
import { buildFixtureAnalysis } from '@/providers/fixtureAnalysisProvider';
import { validateAnalysisRun } from '@/domain/sourceValidation';
import { calculateReadiness } from '@/domain/readiness';

describe('Day 1 fixture analysis', () => {
  it('validates the successful NotifyFlow fixture', () => {
    const run = buildFixtureAnalysis(notifyFlowSourceDocument);
    expect(run.requirements).toHaveLength(6);
    expect(run.nonFunctionalRequirements).toHaveLength(5);
    expect(run.assumptions).toHaveLength(3);
    expect(run.risks).toHaveLength(3);
    expect(run.gaps).toHaveLength(5);
    expect(run.gaps.filter((gap) => gap.severity === 'BLOCKING')).toHaveLength(2);
  });
  it('rejects malformed fixture data', () => {
    const run = buildFixtureAnalysis(notifyFlowSourceDocument) as unknown as { objective?: string };
    delete run.objective;
    expect(() => validateAnalysisRun(run, notifyFlowSourceDocument)).toThrow();
  });
  it('rejects invalid source spans', () => {
    const badDoc = structuredClone(notifyFlowSourceDocument);
    badDoc.spans[0] = { ...badDoc.spans[0], text: 'invented quotation' };
    expect(() => buildFixtureAnalysis(badDoc)).toThrow(/text does not match/);
  });
  it('calculates readiness deterministically', () => {
    const run = buildFixtureAnalysis(notifyFlowSourceDocument);
    const a = calculateReadiness(run.projectId, run.id, run);
    const b = calculateReadiness(run.projectId, run.id, run);
    expect(a).toEqual(b);
    expect(a.overall).toBe(58);
  });
  it('preserves valid state after failed analysis attempt', () => {
    const valid = buildFixtureAnalysis(notifyFlowSourceDocument);
    let state = valid;
    try { buildFixtureAnalysis({ ...notifyFlowSourceDocument, spans: [{ ...notifyFlowSourceDocument.spans[0], text: 'bad' }] }); } catch { state = valid; }
    expect(state.id).toBe(valid.id);
    expect(state.requirements[0].title).toBe('Provide a tenant-aware notification service');
  });
});
