import { organizations, workspaces } from './schema';
import type { AxiomDatabase } from './client';
import { LOCAL_ORGANIZATION_ID, LOCAL_ORGANIZATION_SLUG } from './prototype-import';

export const DEFAULT_WORKSPACE_ID = 'WS-PRODUCT-ENGINEERING';

export async function seedLocalDatabase(db: AxiomDatabase) {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.insert(organizations).values({
      id: LOCAL_ORGANIZATION_ID,
      slug: LOCAL_ORGANIZATION_SLUG,
      name: 'Local Development',
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing({ target: organizations.id });
    await tx.insert(workspaces).values({
      id: DEFAULT_WORKSPACE_ID,
      organizationId: LOCAL_ORGANIZATION_ID,
      name: 'Product Engineering',
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing({ target: workspaces.id });
  });
  return { organizationId: LOCAL_ORGANIZATION_ID, workspaceId: DEFAULT_WORKSPACE_ID };
}
