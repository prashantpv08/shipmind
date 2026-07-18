import { describe, expect, it } from 'vitest';
import { POST } from '../app/api/why/route';
import { buildTraceabilityGraph, traceRequirement } from '../src/traceability/graph';
import { TraceabilityContext, WhyAnswer } from '../src/traceability/schemas';
import { resolveWhyQuestion, suggestedWhyQuestions } from '../src/traceability/why';
import { tracedContext } from './helpers/traced-context';

describe('traceability graph', () => {
  it('traverses a requirement through decision, artifacts, code, tests, and executed evidence', async () => {
    const graph = buildTraceabilityGraph(await tracedContext());
    const selected = traceRequirement(graph, 'FR-001');
    const types = new Set(selected.nodes.map((node) => node.type));

    expect(types).toEqual(new Set(['source-span', 'requirement', 'decision', 'artifact', 'code-file', 'test', 'evidence']));
    expect(selected.trace.status).toBe('VERIFIED');
    expect(selected.edges.some((edge) => edge.relation === 'verifies')).toBe(true);
    expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(graph.nodes.length);
    expect(new Set(graph.edges.map((edge) => edge.id)).size).toBe(graph.edges.length);
    expect(graph.unknownRequirementIds).toContain('NFR-COST-001');
    expect(graph.orphanRequirementIds).toContain('NFR-COST-001');
    expect(graph.unlinkedTestIds).toEqual([]);
  });

  it('rejects stale or mismatched evidence contexts', async () => {
    const context = await tracedContext();
    expect(TraceabilityContext.safeParse({ ...context, verification: { ...context.verification, generationId: 'GEN-OTHER' } }).success).toBe(false);
    expect(TraceabilityContext.safeParse({ ...context, decision: { ...context.decision, stale: true } }).success).toBe(false);
  });
});

describe('grounded Why resolver', () => {
  it('answers all four approved demo questions from approved graph entities or executed evidence', async () => {
    const context = await tracedContext();
    const answers = suggestedWhyQuestions.map((question) => resolveWhyQuestion({ question, context }));

    expect(answers.map((answer) => answer.answerType)).toEqual(['why', 'why-not', 'proof', 'reconsider']);
    expect(answers[0]).toMatchObject({ grounding: 'HUMAN_APPROVED', citedEntityIds: expect.arrayContaining(['ADR-001', 'ARCH-SERVERLESS']) });
    expect(answers[1]).toMatchObject({ grounding: 'HUMAN_APPROVED', citedEntityIds: expect.arrayContaining(['ARCH-KAFKA']) });
    expect(answers[2].grounding).toBe('TOOL_VERIFIED');
    expect(answers[2].evidenceIds).toEqual(expect.arrayContaining(['EVID-UNIT', 'EVID-API']));
    expect(answers[3].sections.reconsiderWhen).toEqual(context.decision.reconsiderationTriggers);
    expect(answers.every((answer) => WhyAnswer.safeParse(answer).success)).toBe(true);
  });

  it('returns UNKNOWN instead of proof for an uncovered requirement', async () => {
    const context = await tracedContext();
    const answer = resolveWhyQuestion({ question: 'What proves NFR-COST-001?', context });

    expect(answer).toMatchObject({ answerType: 'proof', grounding: 'UNKNOWN', evidenceIds: [] });
    expect(answer.sections.proof).toEqual([]);
    expect(answer.sections.unknowns.join(' ')).toContain('No executed generated test');
  });

  it('returns a bounded unknown for unrelated free text', async () => {
    const context = await tracedContext();
    const answer = resolveWhyQuestion({ question: 'Who should cater the launch party?', context });
    expect(answer).toMatchObject({ answerType: 'unknown', grounding: 'UNKNOWN', evidenceIds: [] });
  });

  it('serves validated answers and rejects mismatched route payloads', async () => {
    const context = await tracedContext();
    const valid = await POST(new Request('http://x/api/why', { method: 'POST', body: JSON.stringify({ question: suggestedWhyQuestions[2], context }) }));
    expect(valid.status).toBe(200);
    expect(WhyAnswer.safeParse(await valid.json()).success).toBe(true);

    const invalid = await POST(new Request('http://x/api/why', { method: 'POST', body: JSON.stringify({ question: 'What proves the API works?', context: { ...context, verification: { ...context.verification, generationId: 'GEN-OTHER' } } }) }));
    expect(invalid.status).toBe(400);
  });
});
