import { z } from 'zod';

export const StatusSchema = z.enum([
  'READY',
  'PENDING',
  'ANALYZING',
  'VALID',
  'INVALID',
  'GROUNDED',
  'INFERRED',
  'UNKNOWN',
  'BLOCKING',
  'OPEN'
]);

export const ProvenanceSchema = z.object({
  kind: z.enum(['SOURCE', 'FIXTURE', 'LIVE_STUB', 'SYSTEM']),
  label: z.string().min(1),
  sourceSpanIds: z.array(z.string()).default([])
});

export const TimestampsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

const BaseEntitySchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  status: StatusSchema,
  provenance: ProvenanceSchema
}).merge(TimestampsSchema);

export const SourceSpanSchema = BaseEntitySchema.extend({
  documentId: z.string().min(1),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  text: z.string().min(1)
}).refine((span) => span.end > span.start, 'Source span end must be greater than start');

export const SourceDocumentSchema = BaseEntitySchema.extend({
  title: z.string().min(1),
  content: z.string().min(1),
  spans: z.array(SourceSpanSchema).default([])
});

export const ProjectSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  slug: z.string().min(1),
  objective: z.string().optional(),
  sourceDocumentIds: z.array(z.string()).default([])
});

const FindingBaseSchema = BaseEntitySchema.extend({
  title: z.string().min(1),
  description: z.string().min(1),
  sourceSpanIds: z.array(z.string()).default([])
});

export const RequirementSchema = FindingBaseSchema.extend({
  priority: z.enum(['MUST', 'SHOULD', 'COULD']),
  acceptanceHint: z.string().min(1)
});

export const NonFunctionalRequirementSchema = FindingBaseSchema.extend({
  category: z.enum(['SECURITY', 'PERFORMANCE', 'RELIABILITY', 'OPERABILITY', 'COST', 'SCALABILITY', 'USABILITY']),
  measurableTarget: z.string().optional()
});

export const AssumptionSchema = FindingBaseSchema.extend({
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH'])
});

export const RiskSchema = FindingBaseSchema.extend({
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  mitigation: z.string().min(1)
});

export const GapSchema = FindingBaseSchema.extend({
  gapType: z.enum(['MISSING', 'AMBIGUOUS', 'CONFLICT', 'UNTESTABLE']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'BLOCKING'])
});

export const ReadinessCategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  score: z.number().min(0).max(100),
  rationale: z.string().min(1)
});

export const ReadinessScoreSchema = BaseEntitySchema.extend({
  overall: z.number().min(0).max(100),
  categories: z.array(ReadinessCategorySchema)
});

export const AnalysisRunSchema = BaseEntitySchema.extend({
  provider: z.enum(['FIXTURE', 'LIVE_STUB']),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  objective: z.string().min(1),
  requirements: z.array(RequirementSchema),
  nonFunctionalRequirements: z.array(NonFunctionalRequirementSchema),
  assumptions: z.array(AssumptionSchema),
  risks: z.array(RiskSchema),
  gaps: z.array(GapSchema),
  readinessScore: ReadinessScoreSchema
});

export type Project = z.infer<typeof ProjectSchema>;
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
export type SourceSpan = z.infer<typeof SourceSpanSchema>;
export type AnalysisRun = z.infer<typeof AnalysisRunSchema>;
export type ReadinessScore = z.infer<typeof ReadinessScoreSchema>;
