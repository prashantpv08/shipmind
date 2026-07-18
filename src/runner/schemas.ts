import { z } from 'zod';
import { CodeApproval, CodeGenerationOutput } from '../codegen/schemas';

export const VerificationCommandId = z.enum(['build', 'unit', 'api', 'coverage']);
export const VerificationMetricValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const VerificationRun = z.object({
  id: z.string().min(1),
  commandId: VerificationCommandId,
  command: z.string().min(1),
  startedAt: z.iso.datetime(),
  durationMs: z.number().int().nonnegative(),
  exitCode: z.number().int().nullable(),
  status: z.enum(['passed', 'failed', 'error']),
  truthStatus: z.enum(['TOOL_VERIFIED', 'FAILED']),
  timedOut: z.boolean(),
  rawOutputExcerpt: z.string().max(40_000),
  metrics: z.record(z.string(), VerificationMetricValue),
}).strict();

export const VerificationEvidence = z.object({
  id: z.string().min(1),
  verificationRunId: z.string().min(1),
  type: z.enum(['build', 'unit-test', 'api-test', 'coverage']),
  truthStatus: z.enum(['TOOL_VERIFIED', 'FAILED']),
  claim: z.string().min(1),
  measurements: z.record(z.string(), VerificationMetricValue),
  linkedEntityIds: z.array(z.string().min(1)),
  createdAt: z.iso.datetime(),
}).strict();

export const RequirementCoverage = z.object({
  requirementId: z.string().min(1),
  status: z.enum(['VERIFIED', 'FAILED', 'UNKNOWN']),
  evidenceIds: z.array(z.string().min(1)),
  testFileIds: z.array(z.string().min(1)),
  note: z.string().min(1),
}).strict();

export const VerificationReport = z.object({
  id: z.string().min(1),
  generationId: z.string().min(1),
  manifestHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime(),
  overallStatus: z.enum(['passed', 'failed']),
  truthStatus: z.enum(['TOOL_VERIFIED', 'FAILED']),
  runs: z.array(VerificationRun).length(4),
  evidence: z.array(VerificationEvidence).length(4),
  requirementCoverage: z.array(RequirementCoverage).min(1),
}).strict();

export const VerificationRequest = z.object({
  generation: CodeGenerationOutput,
  approval: CodeApproval,
}).strict()
  .refine((value) => value.approval.generationId === value.generation.generationId, {
    message: 'Code approval does not match the generated implementation',
    path: ['approval', 'generationId'],
  })
  .refine((value) => value.approval.manifestHash === value.generation.manifestHash, {
    message: 'Code approval manifest does not match the controlled workspace',
    path: ['approval', 'manifestHash'],
  });

export type VerificationCommandId = z.infer<typeof VerificationCommandId>;
export type VerificationRun = z.infer<typeof VerificationRun>;
export type VerificationEvidence = z.infer<typeof VerificationEvidence>;
export type RequirementCoverage = z.infer<typeof RequirementCoverage>;
export type VerificationReport = z.infer<typeof VerificationReport>;
export type VerificationRequest = z.infer<typeof VerificationRequest>;
