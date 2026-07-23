import { z } from 'zod';

export const OrganizationIdSchema = z.string().regex(/^ORG-[A-Za-z0-9_-]{1,124}$/);

export const PlatformOrganizationSchema = z.object({
  id: OrganizationIdSchema,
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  status: z.literal('ACTIVE'),
  role: z.enum(['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT', 'DEVELOPER', 'REVIEWER', 'VIEWER']),
}).strict();

export const CurrentUserOrganizationsSchema = z.object({
  organizations: z.array(PlatformOrganizationSchema).max(100),
});

export type PlatformOrganization = z.infer<typeof PlatformOrganizationSchema>;

export const PlatformProjectIdSchema = z.string().regex(/^PROJ-[A-Za-z0-9_-]{1,123}$/);
export const PlatformWorkspaceIdSchema = z.string().regex(/^WS-[A-Za-z0-9_-]{1,125}$/);

export const PlatformProjectSchema = z.object({
  id: PlatformProjectIdSchema,
  workspaceId: PlatformWorkspaceIdSchema,
  name: z.string().min(1).max(160),
  status: z.enum([
    'DRAFT',
    'SOURCES_READY',
    'ANALYZED',
    'NEEDS_CLARIFICATION',
    'DOCUMENTED',
    'DOCUMENTS_APPROVED',
    'DESIGN_READY',
    'ARB_APPROVED',
    'HLD_READY',
    'PUBLISHED',
    'BACKLOG_READY',
    'ARCHIVED',
  ]),
  graphVersion: z.number().int().nonnegative(),
  rowVersion: z.number().int().positive(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export const PlatformProjectListSchema = z.object({
  projects: z.array(PlatformProjectSchema).max(100),
  nextCursor: z.string().min(1).max(512).nullable(),
}).strict();

export const PlatformProjectListQuerySchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  workspaceId: PlatformWorkspaceIdSchema.optional(),
}).strict();

export type PlatformProject = z.infer<typeof PlatformProjectSchema>;

export const PlatformCreateProjectRequestSchema = z.object({
  workspaceId: PlatformWorkspaceIdSchema,
  name: z.string().trim().min(2).max(160),
}).strict();

export const PlatformIdempotencyKeySchema = z.string().regex(/^[A-Za-z0-9._:-]{8,128}$/);
export const PlatformProjectEtagSchema = z.string().regex(/^"PROJ-[A-Za-z0-9_-]{1,123}:[1-9][0-9]*"$/);

export const PlatformWorkspaceSchema = z.object({
  id: PlatformWorkspaceIdSchema,
  name: z.string().min(1).max(120),
  rowVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export const PlatformWorkspaceListSchema = z.object({
  workspaces: z.array(PlatformWorkspaceSchema).max(100),
  nextCursor: z.string().min(1).max(512).nullable(),
}).strict();

export type PlatformWorkspace = z.infer<typeof PlatformWorkspaceSchema>;
