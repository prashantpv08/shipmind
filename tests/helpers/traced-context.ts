import { compileArtifactPack } from '../../src/artifacts/compile';
import { FixtureCodeGenerator } from '../../src/codegen/provider';
import { CodeGenerationRequest } from '../../src/codegen/schemas';
import { validateCodeGeneration } from '../../src/codegen/workspace';
import { answerQuestion, approve, fixtureAnalysisResult } from '../../src/domain/day2';
import { AnalysisResult } from '../../src/domain/schemas';
import { buildRequirementCoverage } from '../../src/runner/parsers';
import { VerificationEvidence, VerificationReport, VerificationRun } from '../../src/runner/schemas';
import { TraceabilityContext } from '../../src/traceability/schemas';

export const tracedContextTime = '2026-07-18T12:00:00.000Z';

export async function tracedContext() {
  const initial = fixtureAnalysisResult({
    label: 'Demo fixture', providerName: 'fixture', modelName: 'fixture', mode: 'fixture',
    startedAt: tracedContextTime, completedAt: tracedContextTime, outcome: 'SUCCEEDED',
  });
  let questions = initial.clarificationQuestions;
  for (const question of questions) {
    questions = answerQuestion(questions, question.id, question.options[0].value, question.options[0].id);
  }
  const analysis = AnalysisResult.parse({ ...initial, clarificationQuestions: questions, graphVersion: 5 });
  const decision = approve('ARCH-SERVERLESS', analysis.architectureOptions, analysis.graphVersion);
  const artifactPack = compileArtifactPack({ analysis, decision }, tracedContextTime);
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
    startedAt: tracedContextTime,
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
    VerificationEvidence.parse({ id: 'EVID-BUILD', verificationRunId: 'RUN-BUILD', type: 'build', truthStatus: 'TOOL_VERIFIED', claim: 'The fixed build command completed with exit code 0.', measurements: runs[0].metrics, linkedEntityIds: generation.files.map((file) => file.id), createdAt: tracedContextTime }),
    VerificationEvidence.parse({ id: 'EVID-UNIT', verificationRunId: 'RUN-UNIT', type: 'unit-test', truthStatus: 'TOOL_VERIFIED', claim: 'The fixed unit command completed with exit code 0.', measurements: runs[1].metrics, linkedEntityIds: [...unitFile.linkedEntityIds, unitFile.id], createdAt: tracedContextTime }),
    VerificationEvidence.parse({ id: 'EVID-API', verificationRunId: 'RUN-API', type: 'api-test', truthStatus: 'TOOL_VERIFIED', claim: 'The fixed API command completed with exit code 0.', measurements: runs[2].metrics, linkedEntityIds: [...apiFile.linkedEntityIds, apiFile.id], createdAt: tracedContextTime }),
    VerificationEvidence.parse({ id: 'EVID-COVERAGE', verificationRunId: 'RUN-COVERAGE', type: 'coverage', truthStatus: 'TOOL_VERIFIED', claim: 'The fixed V8 coverage run measured 97.56% line coverage for the generated slice.', measurements: runs[3].metrics, linkedEntityIds: [unitFile.id, apiFile.id], createdAt: tracedContextTime }),
  ];
  const verification = VerificationReport.parse({
    id: 'VERIFY-001',
    generationId: generation.generationId,
    manifestHash: generation.manifestHash,
    startedAt: tracedContextTime,
    completedAt: tracedContextTime,
    overallStatus: 'passed',
    truthStatus: 'TOOL_VERIFIED',
    runs,
    evidence,
    requirementCoverage: buildRequirementCoverage(generation, evidence),
  });
  return TraceabilityContext.parse({ analysis, decision, artifactPack, generation, verification });
}
