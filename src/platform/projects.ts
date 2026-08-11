import 'server-only';

import {
  OrganizationIdSchema,
  PlatformBusinessContextBaselineSchema,
  PlatformBusinessContextPreviewSchema,
  PlatformOrganizationSchema,
  PlatformProjectListSchema,
  type PlatformProject,
  PlatformWorkspaceListSchema,
  type PlatformWorkspace,
} from './contracts';
import { requestPlatform } from './request';
import * as platformSdk from './generated/sdk.gen';
import { currentSessionToken } from './session';

export type ProjectBusinessContextMigration =
  | { status: 'COMPLETE'; applicability: 'APPLICABLE' | 'NOT_APPLICABLE'; message: string }
  | { status: 'DECISION_REQUIRED'; applicability: 'NEEDS_DECISION'; message: string }
  | { status: 'GENERATION_REQUIRED' | 'REGENERATION_REQUIRED' | 'REVIEW_REQUIRED' | 'REVISION_REQUIRED'; applicability: 'APPLICABLE' | 'NOT_APPLICABLE'; message: string }
  | { status: 'ANALYSIS_REQUIRED' | 'ARCHIVED' | 'UNAVAILABLE'; applicability: null; message: string };

export type ProjectWithBusinessContextMigration = PlatformProject & {
  businessContextMigration: ProjectBusinessContextMigration;
};

export type OrganizationProjectsState =
  | {
      status: 'ready';
      projects: ProjectWithBusinessContextMigration[];
      nextCursor: string | null;
      workspaces: PlatformWorkspace[];
      moreWorkspaces: boolean;
      canCreate: boolean;
      canManageLifecycle: boolean;
      canReviewBusinessContext: boolean;
      migrationSummary: {
        complete: number;
        pending: number;
        unavailable: number;
        archived: number;
      };
    }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'unavailable'; message: string };

type MigrationLoadResult =
  | ProjectBusinessContextMigration
  | { status: 'UNAUTHENTICATED' | 'FORBIDDEN' };

async function loadBusinessContextMigration(
  organizationId: string,
  project: PlatformProject,
  token: string,
): Promise<MigrationLoadResult> {
  if (project.status === 'ARCHIVED') {
    return { status: 'ARCHIVED', applicability: null, message: 'Archived history remains inspectable and is not part of the active P0 migration queue.' };
  }
  if (project.graphVersion < 1) {
    return { status: 'ANALYSIS_REQUIRED', applicability: null, message: 'Analyze the current source set before Business Context can be reviewed.' };
  }

  const path = { organizationId, projectId: project.id };
  const [previewResponse, baselineResponse] = await Promise.all([
    requestPlatform((client) => platformSdk.getBusinessContextPreview({ client, path }), token),
    requestPlatform((client) => platformSdk.getCurrentBusinessContext({ client, path }), token),
  ]);
  if (previewResponse.status === 401 || baselineResponse.status === 401) return { status: 'UNAUTHENTICATED' };
  if (previewResponse.status === 403 || baselineResponse.status === 403) return { status: 'FORBIDDEN' };
  if (previewResponse.status === 409) {
    return { status: 'ANALYSIS_REQUIRED', applicability: null, message: 'Analyze the exact current graph before Business Context can be reviewed.' };
  }
  if (previewResponse.status !== 200 || baselineResponse.status !== 200) {
    return { status: 'UNAVAILABLE', applicability: null, message: 'The current Business Context migration state could not be loaded. Retry safely.' };
  }

  const preview = PlatformBusinessContextPreviewSchema.safeParse(previewResponse.body);
  const baseline = PlatformBusinessContextBaselineSchema.safeParse(baselineResponse.body);
  if (
    !preview.success
    || !baseline.success
    || preview.data.projectId !== project.id
    || preview.data.sourceGraphVersion !== project.graphVersion
    || baseline.data.projectId !== project.id
    || baseline.data.graphVersion !== project.graphVersion
  ) {
    return { status: 'UNAVAILABLE', applicability: null, message: 'The platform returned a stale or invalid Business Context migration state.' };
  }

  if (preview.data.applicability.status === 'NEEDS_DECISION') {
    return { status: 'DECISION_REQUIRED', applicability: 'NEEDS_DECISION', message: 'An authorized reviewer must decide whether this exact scope requires a user-facing experience.' };
  }
  if (baseline.data.version === null) {
    return { status: 'GENERATION_REQUIRED', applicability: preview.data.applicability.status, message: 'Generate the exact current Business Context before human review.' };
  }
  if (baseline.data.version.contentHash !== preview.data.contentHash) {
    return { status: 'REGENERATION_REQUIRED', applicability: preview.data.applicability.status, message: 'The compiled preview changed; regenerate it before relying on the stored version.' };
  }
  if (baseline.data.review === null) {
    return { status: 'REVIEW_REQUIRED', applicability: preview.data.applicability.status, message: 'The exact current Business Context version awaits human review.' };
  }
  if (baseline.data.review.decision !== 'ACCEPT' || baseline.data.review.truthStatus !== 'HUMAN_APPROVED') {
    return { status: 'REVISION_REQUIRED', applicability: preview.data.applicability.status, message: 'The latest exact review did not approve this Business Context; resolve its feedback before continuing.' };
  }
  return { status: 'COMPLETE', applicability: preview.data.applicability.status, message: 'The exact current Business Context and applicability are human-approved.' };
}

export async function getOrganizationProjects(
  organizationIdInput: string,
  cursor?: string,
): Promise<OrganizationProjectsState> {
  const organizationId = OrganizationIdSchema.safeParse(organizationIdInput);
  if (!organizationId.success || (cursor !== undefined && (cursor.length < 1 || cursor.length > 512))) {
    return { status: 'not-found' };
  }

  const token = await currentSessionToken();
  if (!token) return { status: 'unauthenticated' };

  const organizationPath = { organizationId: organizationId.data };
  const [organizationResponse, projectResponse, workspaceResponse] = await Promise.all([
    requestPlatform((client) => platformSdk.getOrganization({ client, path: organizationPath }), token),
    requestPlatform((client) => platformSdk.listProjects({ client, path: organizationPath, query: { limit: 50, ...(cursor === undefined ? {} : { cursor }) } }), token),
    requestPlatform((client) => platformSdk.listWorkspaces({ client, path: organizationPath, query: { limit: 100 } }), token),
  ]);
  const responses = [organizationResponse, projectResponse, workspaceResponse];

  if (responses.some((response) => response.status === 401)) return { status: 'unauthenticated' };
  if (responses.some((response) => response.status === 403)) return { status: 'forbidden' };
  if (responses.some((response) => response.status === 404)) return { status: 'not-found' };
  if (responses.some((response) => response.status !== 200)) {
    return { status: 'unavailable', message: 'We could not load projects from the platform.' };
  }

  const organization = PlatformOrganizationSchema.safeParse(organizationResponse.body);
  const projectPage = PlatformProjectListSchema.safeParse(projectResponse.body);
  const workspacePage = PlatformWorkspaceListSchema.safeParse(workspaceResponse.body);
  if (!organization.success || !projectPage.success || !workspacePage.success) {
    return { status: 'unavailable', message: 'The platform returned an unexpected project response.' };
  }

  const migrationStates = await Promise.all(projectPage.data.projects.map((project) => (
    loadBusinessContextMigration(organizationId.data, project, token)
  )));
  if (migrationStates.some((migration) => migration.status === 'UNAUTHENTICATED')) return { status: 'unauthenticated' };
  if (migrationStates.some((migration) => migration.status === 'FORBIDDEN')) return { status: 'forbidden' };
  const projects = projectPage.data.projects.map((project, index) => ({
    ...project,
    businessContextMigration: migrationStates[index] as ProjectBusinessContextMigration,
  }));

  return {
    status: 'ready',
    ...projectPage.data,
    projects,
    workspaces: workspacePage.data.workspaces,
    moreWorkspaces: workspacePage.data.nextCursor !== null,
    canCreate: ['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT'].includes(organization.data.role),
    canManageLifecycle: ['OWNER', 'ADMINISTRATOR'].includes(organization.data.role),
    canReviewBusinessContext: ['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT', 'REVIEWER'].includes(organization.data.role),
    migrationSummary: {
      complete: projects.filter((project) => project.businessContextMigration.status === 'COMPLETE').length,
      pending: projects.filter((project) => !['COMPLETE', 'ARCHIVED', 'UNAVAILABLE'].includes(project.businessContextMigration.status)).length,
      unavailable: projects.filter((project) => project.businessContextMigration.status === 'UNAVAILABLE').length,
      archived: projects.filter((project) => project.businessContextMigration.status === 'ARCHIVED').length,
    },
  };
}
