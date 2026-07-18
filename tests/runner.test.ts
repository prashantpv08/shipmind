import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CodeApproval, CodeGenerationOutput } from '../src/codegen/schemas';
import type { FixedCommandDefinition } from '../src/runner/commands';
import { createVerificationRun } from '../src/runner/execute';
import { buildRequirementCoverage, parseCoverageMetrics, parseVitestMetrics } from '../src/runner/parsers';
import { VerificationEvidence, VerificationReport, VerificationRequest } from '../src/runner/schemas';
import { persistVerificationReport } from '../src/runner/store';

const manifestHash = `sha256:${'a'.repeat(64)}`;
const fileHash = `sha256:${'b'.repeat(64)}`;

function generation() {
  return CodeGenerationOutput.parse({
    generationId: 'GEN-CODE-001',
    projectId: 'PROJECT-001',
    sourceGraphVersion: 1,
    selectedSliceId: 'SLICE-NOTIFICATION-API-001',
    generatedAt: '2026-07-18T00:00:00.000Z',
    provider: { mode: 'fixture', name: 'notifyflow-controlled-code-fixture' },
    workspaceRoot: 'sandbox/notification-service/workspace',
    templateFiles: ['package.json'],
    manifestHash,
    provenance: {
      artifactIds: ['ART-ADR', 'ART-OPENAPI', 'ART-BACKLOG', 'ART-TASK'],
      decisionId: 'ADR-001',
      constitutionId: 'CONST-001',
      requirementIds: ['FR-001', 'FR-002', 'NFR-UNKNOWN'],
      ruleIds: ['TEST-001'],
    },
    files: [
      { id: 'CODE-UNIT', path: 'tests/notification-service.unit.test.ts', content: 'unit', hash: fileHash, linkedEntityIds: ['FR-001'], generationId: 'GEN-CODE-001', diff: '+unit' },
      { id: 'CODE-API', path: 'tests/notification-service.api.test.ts', content: 'api', hash: fileHash, linkedEntityIds: ['FR-002'], generationId: 'GEN-CODE-001', diff: '+api' },
    ],
    traceLinks: [{ id: 'TRACE-001', fromType: 'requirement', fromId: 'FR-001', relation: 'tests', toType: 'code-file', toId: 'CODE-UNIT' }],
  });
}

function command(id: FixedCommandDefinition['id']): FixedCommandDefinition {
  return { id, label: id, displayCommand: `pnpm sandbox:${id}`, program: '/fixed/node', args: [], cwd: '/fixed/root', timeoutMs: 1_000 };
}

describe('fixed verification parsing and truth status', () => {
  it('parses Vitest summaries without accepting model-supplied metrics', () => {
    expect(parseVitestMetrics('Test Files  1 passed (1)\nTests  4 passed (4)\nDuration  312ms')).toEqual({
      testFilesPassed: 1,
      testFilesTotal: 1,
      testsPassed: 4,
      testsTotal: 4,
      reportedDuration: '312ms',
    });
  });

  it('validates V8 coverage summaries and rejects malformed metrics', () => {
    const metric = { total: 10, covered: 9, skipped: 0, pct: 90 };
    expect(parseCoverageMetrics({ total: { lines: metric, statements: metric, functions: metric, branches: metric } })).toMatchObject({ lines: 90, linesCovered: 9, linesTotal: 10 });
    expect(parseCoverageMetrics({ total: { lines: { pct: 'invented' } } })).toBeNull();
  });

  it('keeps non-zero exits and timeouts as FAILED evidence inputs', () => {
    const failed = createVerificationRun(command('unit'), { exitCode: 1, timedOut: false, output: 'Tests 1 failed' }, '2026-07-18T00:00:00.000Z', 25);
    const timedOut = createVerificationRun(command('api'), { exitCode: null, timedOut: true, output: 'partial output' }, '2026-07-18T00:00:01.000Z', 1_001);
    expect(failed).toMatchObject({ status: 'failed', truthStatus: 'FAILED', exitCode: 1 });
    expect(timedOut).toMatchObject({ status: 'failed', truthStatus: 'FAILED', timedOut: true, exitCode: null });
  });

  it('requires the approval to match both generation and manifest', () => {
    const approval = CodeApproval.parse({ generationId: 'GEN-CODE-001', manifestHash, truthStatus: 'HUMAN_APPROVED', approvedAt: '2026-07-18T00:00:00.000Z' });
    expect(VerificationRequest.safeParse({ generation: generation(), approval }).success).toBe(true);
    expect(VerificationRequest.safeParse({ generation: generation(), approval: { ...approval, generationId: 'GEN-OTHER' } }).success).toBe(false);
  });

  it('maps executed test evidence while preserving untested requirements as UNKNOWN', () => {
    const unit = VerificationEvidence.parse({ id: 'EVID-UNIT', verificationRunId: 'RUN-UNIT', type: 'unit-test', truthStatus: 'TOOL_VERIFIED', claim: 'Unit command passed.', measurements: { testsPassed: 1 }, linkedEntityIds: ['FR-001'], createdAt: '2026-07-18T00:00:00.000Z' });
    const api = VerificationEvidence.parse({ id: 'EVID-API', verificationRunId: 'RUN-API', type: 'api-test', truthStatus: 'FAILED', claim: 'API command failed.', measurements: { testsPassed: 0 }, linkedEntityIds: ['FR-002'], createdAt: '2026-07-18T00:00:00.000Z' });
    const matrix = buildRequirementCoverage(generation(), [unit, api]);
    expect(matrix.find((item) => item.requirementId === 'FR-001')?.status).toBe('VERIFIED');
    expect(matrix.find((item) => item.requirementId === 'FR-002')?.status).toBe('FAILED');
    expect(matrix.find((item) => item.requirementId === 'NFR-UNKNOWN')?.status).toBe('UNKNOWN');
  });

  it('persists validated reports atomically outside the generated workspace', async () => {
    const createdAt = '2026-07-18T00:00:00.000Z';
    const runs = (['build', 'unit', 'api', 'coverage'] as const).map((id) => createVerificationRun(command(id), { exitCode: 0, timedOut: false, output: id === 'build' ? '' : 'Test Files 1 passed (1)\nTests 1 passed (1)' }, createdAt, 10));
    const evidence = runs.map((run) => VerificationEvidence.parse({ id: `EVID-${run.commandId}`, verificationRunId: run.id, type: run.commandId === 'unit' ? 'unit-test' : run.commandId === 'api' ? 'api-test' : run.commandId, truthStatus: 'TOOL_VERIFIED', claim: `${run.commandId} passed.`, measurements: run.metrics, linkedEntityIds: ['FR-001'], createdAt }));
    const report = VerificationReport.parse({ id: 'VERIFY-001', generationId: 'GEN-CODE-001', manifestHash, startedAt: createdAt, completedAt: createdAt, overallStatus: 'passed', truthStatus: 'TOOL_VERIFIED', runs, evidence, requirementCoverage: [{ requirementId: 'FR-001', status: 'VERIFIED', evidenceIds: ['EVID-unit'], testFileIds: ['CODE-UNIT'], note: 'Executed evidence exists.' }] });
    const root = await mkdtemp(join(tmpdir(), 'axiom-verification-'));
    await persistVerificationReport(report, root);
    const files = await readdir(join(root, 'verification'));
    expect(files).toHaveLength(1);
    expect(VerificationReport.parse(JSON.parse(await readFile(join(root, 'verification', files[0]), 'utf8')))).toEqual(report);
  });
});
