import { describe, expect, it } from 'vitest';
import { POST } from '../app/api/why/route';
import { compileArtifactPack } from '../src/artifacts/compile';
import { FixtureCodeGenerator } from '../src/codegen/provider';
import { CodeGenerationRequest } from '../src/codegen/schemas';
import { validateCodeGeneration } from '../src/codegen/workspace';
import { answerQuestion, approve, fixtureAnalysisResult } from '../src/domain/day2';
import { AnalysisResult } from '../src/domain/schemas';
import { buildRequirementCoverage } from '../src/runner/parsers';
import { VerificationEvidence, VerificationReport, VerificationRun } from '../src/runner/schemas';
import { buildTraceabilityGraph, traceRequirement } from '../src/traceability/graph';
import { TraceabilityContext, WhyAnswer } from '../src/traceability/schemas';
import { resolveWhyQuestion, suggestedWhyQuestions } from '../src/traceability/why';

const now = '2026-07-18T12:00:00.000Z';

async function tracedContext() {
  const initial = fixtureAnalysisResult({
    label: 'Demo fixture', providerName: 'fixture', modelName: 'fixture', mode: 'fixture',
    startedAt: now, completedAt: now, outcome: 'SUCCEEDED',
  });
  let questions = initial.clarificationQuestions;
  for (const question of questions) questions = answerQuestion(questions, question.id, question.options[0].value, question.options[0].id);
  const analysis = AnalysisResult.parse({ ...initial, clarificationQuestions: questions, graphVersion: 5 });
  const decision = approve('ARCH-SERVERLESS', analysis.architectureOptions, analysis.graphVersion);
  const artifactPack = compileArtifactPack({ analysis, decision }, now);
  const draft = await new FixtureCodeGenerator().generate(CodeGenerationRequest.parse({
    analysis, decision, artifactPack, selectedSliceId: 'SLICE-NOTIFICATION-API-001',
  }));
  const generation = validateCodeGeneration(draft);
  const unitFile = generation.files.find((file) => file.path.includes('.unit.test.'))!;
  const apiFile = generation.files.find((file) => file.path.includes('.api.test.'))!;
  const runs = (['build', 'unit', 'api', 'coverage'] as const).map((commandId) => VerificationRun.parse({
    id: `RUN-${commandId.toUpperCase()}`,
    commandId,
    command: `pnpm sandbox:${commandId}`,
    startedAt: now,
    durationMs: 25,
    exitCode: 0,
    status: 'passed',
    truthStatus: 'TOOL_VERIFIED',
    timedOut: false,
    rawOutputExcerpt: 'Executed output',
    metrics: commandId === 'build'
      ? { typecheckPassed: true }
      : commandId === 'coverage'
        ? { testsPassed: 6, lines: 97.56, lineThresholdMet: true }
        : { testsPassed: commandId === 'unit' ? 2 : 4, testsTotal: commandId === 'unit' ? 2 : 4 },
  }));
  const evidence = [
    VerificationEvidence.parse({ id: 'EVID-BUILD', verificationRunId: 'RUN-BUILD', type: 'build', truthStatus: 'TOOL_VERIFIED', claim: 'The fixed build command completed with exit code 0.', measurements: runs[0].metrics, linkedEntityIds: generation.files.map((file) => file.id), createdAt: now }),
    VerificationEvidence.parse({ id: 'EVID-UNIT', verificationRunId: 'RUN-UNIT', type: 'unit-test', truthStatus: 'TOOL_VERIFIED', claim: 'The fixed unit command completed with exit code 0.', measurements: runs[1].metrics, linkedEntityIds: [...unitFile.linkedEntityIds, unitFile.id], createdAt: now }),
    VerificationEvidence.parse({ id: 'EVID-API', verificationRunId: 'RUN-API', type: 'api-test', truthStatus: 'TOOL_VERIFIED', claim: 'The fixed API command completed with exit code 0.', measurements: runs[2].metrics, linkedEntityIds: [...apiFile.linkedEntityIds, apiFile.id], createdAt: now }),
    VerificationEvidence.parse({ id: 'EVID-COVERAGE', verificationRunId: 'RUN-COVERAGE', type: 'coverage', truthStatus: 'TOOL_VERIFIED', claim: 'The fixed V8 coverage run measured 97.56% line coverage for the generated slice.', measurements: runs[3].metrics, linkedEntityIds: [unitFile.id, apiFile.id], createdAt: now }),
  ];
  const verification = VerificationReport.parse({
    id: 'VERIFY-001',
    generationId: generation.generationId,
    manifestHash: generation.manifestHash,
    startedAt: now,
    completedAt: now,
    overallStatus: 'passed',
    truthStatus: 'TOOL_VERIFIED',
    runs,
    evidence,
    requirementCoverage: buildRequirementCoverage(generation, evidence),
  });
  return TraceabilityContext.parse({ analysis, decision, artifactPack, generation, verification });
}

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
