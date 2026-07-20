import Link from 'next/link';

import { getOrganizationProjects } from '@/src/platform/projects';

import { CreateProjectForm } from './create-project-form';

export const dynamic = 'force-dynamic';

export default async function OrganizationProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const { organizationId } = await params;
  const { cursor: rawCursor } = await searchParams;
  const cursor = typeof rawCursor === 'string' ? rawCursor : undefined;
  const state = await getOrganizationProjects(organizationId, cursor);

  return (
    <main className="account-shell">
      <header className="account-topbar">
        <Link href="/account" aria-label="Return to account access"><span>A</span><b>Axiom</b></Link>
        <p>Organization projects</p>
      </header>

      <section className="account-card project-access-card" aria-labelledby="projects-heading">
        <span className="landing-kicker"><i /> Tenant-scoped read</span>
        <h1 id="projects-heading">Organization projects</h1>
        <p>Project metadata comes from the authoritative Node platform. Every query includes the organization boundary and is re-authorized by the platform.</p>

        {state.status === 'unauthenticated' ? (
          <div className="account-state">
            <h2>Authentication required</h2>
            <p>Your session is missing or expired.</p>
            <Link className="account-text-link" href="/account">Return to account access</Link>
          </div>
        ) : null}

        {state.status === 'forbidden' ? (
          <div className="account-state" role="alert">
            <h2>Organization access denied</h2>
            <p>Your current membership does not permit this organization project read.</p>
            <Link className="account-text-link" href="/account">Choose an available organization</Link>
          </div>
        ) : null}

        {state.status === 'not-found' ? (
          <div className="account-state">
            <h2>Projects not found</h2>
            <p>The requested organization project collection is unavailable.</p>
            <Link className="account-text-link" href="/account">Return to account access</Link>
          </div>
        ) : null}

        {state.status === 'unavailable' ? (
          <div className="account-state" role="alert">
            <h2>Projects temporarily unavailable</h2>
            <p>{state.message}</p>
            <Link className="account-text-link" href={`/account/organizations/${organizationId}/projects`}>Try again</Link>
          </div>
        ) : null}

        {state.status === 'ready' ? (
          <div className="account-state">
            <div className="project-access-heading">
              <div><h2>Authorized project metadata</h2><p>{organizationId}</p></div>
              <Link className="account-text-link" href="/account">Change organization</Link>
            </div>
            {state.canCreate ? (
              state.workspaces.length > 0 ? (
                <div className="project-create-panel">
                  <div><h3>Create project</h3><p>The platform validates workspace ownership and records an immutable audit event.</p></div>
                  <CreateProjectForm organizationId={organizationId} workspaces={state.workspaces} />
                  {state.moreWorkspaces ? <p>Only the first 100 workspaces are available in this initial creation view.</p> : null}
                </div>
              ) : (
                <div className="project-create-panel">
                  <h3>Project creation unavailable</h3>
                  <p>This organization has no available workspace.</p>
                </div>
              )
            ) : (
              <div className="project-create-panel">
                <h3>Read-only access</h3>
                <p>Your current organization role can view projects but cannot create them.</p>
              </div>
            )}
            {state.projects.length === 0 ? (
              <p>No projects are available in this organization.</p>
            ) : (
              <ul className="project-access-list">
                {state.projects.map((project) => (
                  <li key={project.id}>
                    <div>
                      <b>{project.name}</b>
                      <small>{project.id} · {project.workspaceId}</small>
                    </div>
                    <dl>
                      <div><dt>Status</dt><dd>{project.status.replaceAll('_', ' ')}</dd></div>
                      <div><dt>Graph</dt><dd>v{project.graphVersion}</dd></div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
            {state.nextCursor ? (
              <Link
                className="account-page-link"
                href={`/account/organizations/${organizationId}/projects?cursor=${encodeURIComponent(state.nextCursor)}`}
              >
                Next page
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
