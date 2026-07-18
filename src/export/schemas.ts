import { z } from 'zod';
import { WhyAnswer, TraceabilityContext } from '../traceability/schemas';

export const ExportFileKind = z.enum([
  'canonical-graph',
  'decision',
  'artifact',
  'generation',
  'verification',
  'traceability',
  'why-answer',
]);

export const ProjectExportFile = z.object({
  id: z.string().min(1),
  path: z.string().min(1).max(240).regex(/^[a-zA-Z0-9._/-]+$/),
  kind: ExportFileKind,
  mediaType: z.enum(['text/markdown', 'application/json']),
  version: z.number().int().positive().nullable(),
  sourceGraphVersion: z.number().int().nonnegative(),
  sha256: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  content: z.string().max(5_000_000),
}).strict();

export const ProjectExportManifestEntry = ProjectExportFile.omit({ content: true });

export const ProjectExportManifest = z.object({
  schemaVersion: z.literal(1),
  exportId: z.string().regex(/^EXPORT-[A-F0-9]{16}$/),
  projectId: z.string().min(1),
  sourceGraphVersion: z.number().int().nonnegative(),
  generationId: z.string().min(1),
  verificationReportId: z.string().min(1),
  createdAt: z.iso.datetime(),
  fileCount: z.number().int().positive(),
  rootHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  files: z.array(ProjectExportManifestEntry).min(1),
}).strict();

export const ProjectExportBundle = z.object({
  manifest: ProjectExportManifest,
  files: z.array(ProjectExportFile).min(1),
}).strict().superRefine((value, context) => {
  if (value.manifest.fileCount !== value.files.length || value.manifest.files.length !== value.files.length) {
    context.addIssue({ code: 'custom', message: 'Export manifest file count does not match the bundle' });
  }
  if (new Set(value.files.map((file) => file.id)).size !== value.files.length) {
    context.addIssue({ code: 'custom', message: 'Export file IDs must be unique' });
  }
  if (new Set(value.files.map((file) => file.path)).size !== value.files.length) {
    context.addIssue({ code: 'custom', message: 'Export file paths must be unique' });
  }
  for (const file of value.files) {
    const entry = value.manifest.files.find((item) => item.id === file.id);
    if (!entry || entry.path !== file.path || entry.sha256 !== file.sha256) {
      context.addIssue({ code: 'custom', message: `Export manifest does not match ${file.id}` });
    }
  }
});

export const ProjectExportRequest = z.object({
  format: z.enum(['json', 'markdown']),
  context: TraceabilityContext,
  whyAnswer: WhyAnswer.optional(),
}).strict().superRefine((value, context) => {
  if (!value.whyAnswer) return;
  const evidenceIds = new Set(value.context.verification.evidence.map((item) => item.id));
  for (const evidenceId of value.whyAnswer.evidenceIds) {
    if (!evidenceIds.has(evidenceId)) context.addIssue({ code: 'custom', message: `Why answer cites unknown evidence ${evidenceId}`, path: ['whyAnswer', 'evidenceIds'] });
  }
});

export const DemoResetResult = z.object({
  resetAt: z.iso.datetime(),
  durationMs: z.number().int().nonnegative(),
  removedTargets: z.array(z.string().min(1)),
  preservedProjectData: z.literal(true),
  status: z.literal('RESET'),
}).strict();

export type ProjectExportFile = z.infer<typeof ProjectExportFile>;
export type ProjectExportManifest = z.infer<typeof ProjectExportManifest>;
export type ProjectExportBundle = z.infer<typeof ProjectExportBundle>;
export type ProjectExportRequest = z.infer<typeof ProjectExportRequest>;
export type DemoResetResult = z.infer<typeof DemoResetResult>;
