import { z } from 'zod';
import { CodeGenerationOutput } from '../codegen/schemas';
import { AnalysisResult, ArchitectureDecision, ArtifactPack } from '../domain/schemas';
import { VerificationReport } from '../runner/schemas';

export const TraceNodeType = z.enum([
  'source-span',
  'requirement',
  'gap',
  'clarification-question',
  'answer',
  'architecture-option',
  'decision',
  'artifact',
  'constitution-rule',
  'task',
  'code-file',
  'test',
  'evidence',
]);

export const TraceTruthStatus = z.enum([
  'SOURCE_GROUNDED',
  'AI_SUGGESTED',
  'INFERRED',
  'UNKNOWN',
  'USER_PROVIDED',
  'HUMAN_APPROVED',
  'ESTIMATE',
  'TOOL_VERIFIED',
  'FAILED',
]);

export const TraceNode = z.object({
  id: z.string().min(1),
  type: TraceNodeType,
  label: z.string().min(1),
  truthStatus: TraceTruthStatus,
  detail: z.string().min(1),
}).strict();

export const TraceEdge = z.object({
  id: z.string().min(1),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  relation: z.enum([
    'grounds',
    'affects',
    'raises',
    'answers',
    'informs',
    'selects',
    'rejects',
    'compiles',
    'constrains',
    'plans',
    'implements',
    'tests',
    'verifies',
  ]),
}).strict();

export const RequirementTrace = z.object({
  requirementId: z.string().min(1),
  nodeIds: z.array(z.string().min(1)).min(1),
  edgeIds: z.array(z.string().min(1)),
  status: z.enum(['VERIFIED', 'FAILED', 'UNKNOWN']),
  note: z.string().min(1),
}).strict();

export const TraceabilityGraph = z.object({
  projectId: z.string().min(1),
  graphVersion: z.number().int().nonnegative(),
  generationId: z.string().min(1),
  verificationReportId: z.string().min(1),
  nodes: z.array(TraceNode).min(1),
  edges: z.array(TraceEdge),
  requirementTraces: z.array(RequirementTrace).min(1),
  orphanRequirementIds: z.array(z.string().min(1)),
  unlinkedTestIds: z.array(z.string().min(1)),
  unknownRequirementIds: z.array(z.string().min(1)),
}).strict();

export const TraceabilityContext = z.object({
  analysis: AnalysisResult,
  decision: ArchitectureDecision,
  artifactPack: ArtifactPack,
  generation: CodeGenerationOutput,
  verification: VerificationReport,
}).strict().superRefine((value, context) => {
  const projectIds = new Set([
    value.analysis.projectId,
    value.artifactPack.projectId,
    value.generation.projectId,
  ]);
  if (projectIds.size !== 1) {
    context.addIssue({ code: 'custom', message: 'Traceability inputs must belong to one project' });
  }
  if (value.decision.stale || value.decision.graphVersion !== value.analysis.graphVersion) {
    context.addIssue({ code: 'custom', message: 'Traceability requires the current approved architecture decision', path: ['decision'] });
  }
  if (value.artifactPack.sourceGraphVersion !== value.analysis.graphVersion || value.generation.sourceGraphVersion !== value.analysis.graphVersion) {
    context.addIssue({ code: 'custom', message: 'Traceability inputs must use the current graph version' });
  }
  if (value.generation.provenance.decisionId !== value.decision.id) {
    context.addIssue({ code: 'custom', message: 'Generated code provenance does not cite the approved decision', path: ['generation', 'provenance', 'decisionId'] });
  }
  if (value.verification.generationId !== value.generation.generationId || value.verification.manifestHash !== value.generation.manifestHash) {
    context.addIssue({ code: 'custom', message: 'Verification evidence does not match the generated implementation', path: ['verification'] });
  }
});

export const WhyAnswerType = z.enum(['why', 'why-not', 'proof', 'reconsider', 'unknown']);

export const WhyAnswer = z.object({
  question: z.string().min(1),
  answerType: WhyAnswerType,
  headline: z.string().min(1),
  grounding: z.enum(['HUMAN_APPROVED', 'TOOL_VERIFIED', 'UNKNOWN']),
  sections: z.object({
    why: z.array(z.string()),
    whyNot: z.array(z.string()),
    proof: z.array(z.string()),
    reconsiderWhen: z.array(z.string()),
    unknowns: z.array(z.string()),
  }).strict(),
  citedEntityIds: z.array(z.string().min(1)),
  evidenceIds: z.array(z.string().min(1)),
  traversalNodeIds: z.array(z.string().min(1)),
}).strict();

export const WhyRequest = z.object({
  question: z.string().trim().min(3).max(500),
  context: TraceabilityContext,
}).strict();

export type TraceNodeType = z.infer<typeof TraceNodeType>;
export type TraceNode = z.infer<typeof TraceNode>;
export type TraceEdge = z.infer<typeof TraceEdge>;
export type RequirementTrace = z.infer<typeof RequirementTrace>;
export type TraceabilityGraph = z.infer<typeof TraceabilityGraph>;
export type TraceabilityContext = z.infer<typeof TraceabilityContext>;
export type WhyAnswerType = z.infer<typeof WhyAnswerType>;
export type WhyAnswer = z.infer<typeof WhyAnswer>;
export type WhyRequest = z.infer<typeof WhyRequest>;
