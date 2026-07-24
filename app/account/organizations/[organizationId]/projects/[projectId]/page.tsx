import Link from 'next/link';

import { getProjectSources } from '@/src/platform/sources';

import { SourceWorkflow } from './source-workflow';

export const dynamic = 'force-dynamic';

export default async function ProjectSourcePage({ params }: { params: Promise<{ organizationId: string; projectId: string }> }) {
  const { organizationId, projectId } = await params;
  const state = await getProjectSources(organizationId, projectId);
  const projectsHref = `/account/organizations/${encodeURIComponent(organizationId)}/projects`;
  return <main className="account-shell">
    <header className="account-topbar"><Link href="/account"><span>A</span><b>Axiom</b></Link><p>Project sources and analysis</p></header>
    <section className="account-card project-source-card" aria-labelledby="project-source-heading">
      <span className="landing-kicker"><i /> Source-grounded intake</span>
      <h1 id="project-source-heading">Project sources and analysis</h1>
      <p>Files remain local. The Node platform owns validation, extraction, provenance, durable execution, and the canonical graph.</p>
      {state.status !== 'ready' ? <div className="account-state" role={state.status === 'forbidden' || state.status === 'unavailable' ? 'alert' : undefined}><h2>{state.status === 'unauthenticated' ? 'Authentication required' : state.status === 'forbidden' ? 'Access denied' : state.status === 'not-found' ? 'Project not found' : 'Sources unavailable'}</h2><p>{state.status === 'unavailable' ? state.message : 'Return to the authorized project list and try again.'}</p><Link className="account-text-link" href={projectsHref}>Return to projects</Link></div> : null}
      {state.status === 'ready' ? <div className="account-state"><div className="project-access-heading"><div><h2>{state.project.name}</h2><p>{state.project.id} · graph v{state.project.graphVersion} · {state.project.status.replaceAll('_', ' ')}</p></div><nav aria-label="Project navigation"><Link className="account-text-link" href={projectsHref}>Projects</Link><Link className="account-text-link" href={`${projectsHref}/${encodeURIComponent(projectId)}/engineering-plan`}>Engineering Plan</Link><Link className="account-text-link" href={`${projectsHref}/${encodeURIComponent(projectId)}/backlog`}>Backlog</Link></nav></div><SourceWorkflow organizationId={organizationId} projectId={projectId} sources={state.sources} initialRun={state.latestRun} canManage={state.canManage} /></div> : null}
    </section>
  </main>;
}
