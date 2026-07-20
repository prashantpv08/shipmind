import { z } from 'zod';

export const PlatformOrganizationSchema = z.object({
  id: z.string().regex(/^ORG-[A-Z0-9]+(?:-[A-Z0-9]+)*$/),
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(160),
  status: z.literal('ACTIVE'),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
});

export const CurrentUserOrganizationsSchema = z.object({
  organizations: z.array(PlatformOrganizationSchema).max(100),
});

export type PlatformOrganization = z.infer<typeof PlatformOrganizationSchema>;
