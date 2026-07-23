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

export const PlatformMemberSchema = z.object({
  userId: z.string().regex(/^USER-[A-Za-z0-9_-]{1,123}$/),
  email: z.email().max(320),
  displayName: z.string().min(1).max(200),
  role: PlatformOrganizationSchema.shape.role,
  status: z.enum(['ACTIVE', 'REVOKED']),
  rowVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export const PlatformInvitationIdSchema = z.string().regex(/^INV-[A-Za-z0-9_-]{1,124}$/);
export const PlatformInvitationRoleSchema = z.enum([
  'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT', 'DEVELOPER', 'REVIEWER', 'VIEWER',
]);
export const PlatformInvitationSchema = z.object({
  id: PlatformInvitationIdSchema,
  email: z.email().max(320),
  role: PlatformInvitationRoleSchema,
  status: z.enum(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']),
  expiresAt: z.iso.datetime(),
  rowVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();
export const PlatformMemberListSchema = z.object({
  members: z.array(PlatformMemberSchema).max(100),
  nextCursor: z.string().min(1).max(512).nullable(),
}).strict();
export const PlatformInvitationListSchema = z.object({
  invitations: z.array(PlatformInvitationSchema).max(100),
  nextCursor: z.string().min(1).max(512).nullable(),
}).strict();
export const PlatformGovernanceListQuerySchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();
export const PlatformCreateInvitationRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
  role: PlatformInvitationRoleSchema,
}).strict();
export const PlatformInvitationTokenSchema = z.string().regex(/^INV-[A-Za-z0-9_-]{1,124}\.[A-Za-z0-9_-]{43}$/);
export const PlatformCreateInvitationResponseSchema = z.object({
  invitation: PlatformInvitationSchema,
  delivery: z.object({ mode: z.literal('MANUAL_LOCAL'), acceptanceToken: PlatformInvitationTokenSchema }).strict(),
  replayed: z.boolean(),
}).strict();
export const PlatformInvitationEtagSchema = z.string().regex(/^"INV-[A-Za-z0-9_-]{1,124}:[1-9][0-9]*"$/);

export type PlatformMember = z.infer<typeof PlatformMemberSchema>;
export type PlatformInvitation = z.infer<typeof PlatformInvitationSchema>;
export type PlatformInvitationRole = z.infer<typeof PlatformInvitationRoleSchema>;
