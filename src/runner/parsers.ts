import { z } from 'zod';
import type { CodeGenerationOutput } from '../codegen/schemas';
import type { RequirementCoverage, VerificationEvidence } from './schemas';

const CoverageMetric = z.object({
  total: z.number(),
  covered: z.number(),
  skipped: z.number(),
  pct: z.union([z.number(), z.string()]),
}).passthrough();

const CoverageSummary = z.object({
  total: z.object({
    lines: CoverageMetric,
    statements: CoverageMetric,
    functions: CoverageMetric,
    branches: CoverageMetric,
  }).passthrough(),
}).passthrough();

function percentage(value: number | string) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function stripAnsi(value: string) {
  const escape = String.fromCharCode(27);
  return value.replace(new RegExp(`${escape}\\[[0-?]*[ -/]*[@-~]`, 'g'), '');
}

export function parseVitestMetrics(rawOutput: string) {
  const output = stripAnsi(rawOutput);
  const files = output.match(/Test Files\s+(\d+) passed(?:\s+\((\d+)\))?/i);
  const tests = output.match(/Tests\s+(\d+) passed(?:\s+\((\d+)\))?/i);
  const duration = output.match(/Duration\s+([^\n\r]+)/i);
  return {
    testFilesPassed: files ? Number(files[1]) : null,
    testFilesTotal: files ? Number(files[2] ?? files[1]) : null,
    testsPassed: tests ? Number(tests[1]) : null,
    testsTotal: tests ? Number(tests[2] ?? tests[1]) : null,
    reportedDuration: duration?.[1]?.trim() ?? null,
  };
}

export function parseCoverageMetrics(value: unknown) {
  const parsed = CoverageSummary.safeParse(value);
  if (!parsed.success) return null;
  return {
    lines: percentage(parsed.data.total.lines.pct),
    statements: percentage(parsed.data.total.statements.pct),
    functions: percentage(parsed.data.total.functions.pct),
    branches: percentage(parsed.data.total.branches.pct),
    linesCovered: parsed.data.total.lines.covered,
    linesTotal: parsed.data.total.lines.total,
  };
}

function isTraceableRequirement(id: string) {
  return /^(FR|NFR|CQ)-/.test(id);
}

export function buildRequirementCoverage(
  generation: CodeGenerationOutput,
  evidence: VerificationEvidence[],
): RequirementCoverage[] {
  const testFiles = generation.files.filter((file) => file.path.startsWith('tests/'));
  const requirementIds = new Set([
    ...generation.provenance.requirementIds,
    ...testFiles.flatMap((file) => file.linkedEntityIds.filter(isTraceableRequirement)),
  ]);
  const evidenceByType = new Map(evidence.map((item) => [item.type, item]));

  return [...requirementIds].sort().map((requirementId) => {
    const linkedFiles = testFiles.filter((file) => file.linkedEntityIds.includes(requirementId));
    const linkedEvidence = linkedFiles.flatMap((file) => {
      const type = file.path.includes('.unit.') ? 'unit-test' : file.path.includes('.api.') ? 'api-test' : null;
      const item = type ? evidenceByType.get(type) : undefined;
      return item ? [item] : [];
    });
    const failed = linkedEvidence.some((item) => item.truthStatus === 'FAILED');
    const verified = linkedEvidence.some((item) => item.truthStatus === 'TOOL_VERIFIED');
    const status = failed ? 'FAILED' as const : verified ? 'VERIFIED' as const : 'UNKNOWN' as const;
    return {
      requirementId,
      status,
      evidenceIds: [...new Set(linkedEvidence.map((item) => item.id))],
      testFileIds: linkedFiles.map((file) => file.id),
      note: failed
        ? 'A linked executed test command failed; no proof claim is made.'
        : verified
          ? 'At least one linked generated test completed in a fixed command run.'
          : 'No executed generated test is linked to this requirement.',
    };
  });
}
