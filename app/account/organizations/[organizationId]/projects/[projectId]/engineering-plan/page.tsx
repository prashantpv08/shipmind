import Link from 'next/link';

import { getEngineeringPlanPage } from '@/src/platform/engineering-plans';

import { EngineeringPlanWorkflow } from './engineering-plan-workflow';

export const dynamic = 'force-dynamic';

export default async function EngineeringPlanPage({ params }: { params: Promise<{ organizationId: string; projectId: string }> }) {
  const { organizationId, projectId } = await params;
  const state = await getEngineeringPlanPage(organizationId, projectId);
  const projectsHref = `/account/organizations/${encodeURIComponent(organizationId)}/projects`;
  const projectHref = `${projectsHref}/${encodeURIComponent(projectId)}`;
  return <main className="account-shell">
    <header className="account-topbar"><Link href="/account"><span>A</span><b>Axiom</b></Link><p>AI Engineering Plan</p></header>
    <section className="account-card engineering-plan-card" aria-labelledby="engineering-plan-heading">
      <span className="landing-kicker"><i /> Full lifecycle engineering intelligence</span>
      <h1 id="engineering-plan-heading">Engineering Plan</h1>
      <p>Axiom explains what to build, which technical direction fits, what not to choose yet, which coding rules govern generated patches, how to test and secure the result, how to deliver it on AWS, what evidence is missing, and what must be proven next. Approved work can later flow to a bounded native or external coding agent and an explicitly authorized GitHub connector.</p>
      {state.status !== 'ready' ? <div className="account-state" role={state.status === 'forbidden' || state.status === 'unavailable' ? 'alert' : undefined}><h2>{state.status === 'unauthenticated' ? 'Authentication required' : state.status === 'forbidden' ? 'Access denied' : state.status === 'not-found' ? 'Project not found' : 'Engineering Plan unavailable'}</h2><p>{state.status === 'unavailable' ? state.message : 'Return to the authorized project list and try again.'}</p><Link className="account-text-link" href={projectsHref}>Return to projects</Link></div> : null}
      {state.status === 'ready' ? <div className="account-state"><div className="project-access-heading"><div><h2>{state.project.name}</h2><p>{state.project.id} · graph v{state.project.graphVersion} · {state.project.status.replaceAll('_', ' ')}</p></div><nav aria-label="Project navigation"><Link className="account-text-link" href={projectHref}>Sources</Link><Link className="account-text-link" href={`${projectHref}/business-context`}>Business Context</Link><Link className="account-text-link" href={`${projectHref}/backlog`}>Backlog</Link><Link className="account-text-link" href={projectsHref}>Projects</Link></nav></div><EngineeringPlanWorkflow organizationId={organizationId} projectId={projectId} graphVersion={state.project.graphVersion} canGenerate={state.canGenerate} initialPlan={state.plan} /></div> : null}
    </section>
  </main>;
}
