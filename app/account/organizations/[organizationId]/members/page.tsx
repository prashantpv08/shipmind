import Link from 'next/link';
import { getOrganizationGovernance } from '@/src/platform/governance';
import { InviteMemberForm } from './invite-member-form';
import { RevokeInvitationAction } from './revoke-invitation-action';

export const dynamic = 'force-dynamic';

export default async function OrganizationMembersPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const state = await getOrganizationGovernance(organizationId);
  return <main className="account-shell"><header className="account-topbar"><Link href="/account"><span>A</span><b>Axiom</b></Link><p>Organization access</p></header><section className="account-card governance-card" aria-labelledby="members-heading"><span className="landing-kicker"><i /> Tenant governance</span><h1 id="members-heading">Members and invitations</h1><p>Access rules, tenant scope, invitation state, and audit records are enforced by the Node platform. This page is a local management surface, not a substitute for production identity.</p>
    {state.status !== 'ready' ? <div className="account-state" role={state.status === 'forbidden' || state.status === 'unavailable' ? 'alert' : undefined}><h2>{state.status === 'unauthenticated' ? 'Authentication required' : state.status === 'forbidden' ? 'Access denied' : state.status === 'not-found' ? 'Organization not found' : 'Governance unavailable'}</h2><p>{state.status === 'unavailable' ? state.message : 'Return to account access and choose an available organization.'}</p><Link className="account-text-link" href="/account">Return to account access</Link></div> : null}
    {state.status === 'ready' ? <div className="account-state"><div className="project-access-heading"><div><h2>Organization access</h2><p>{organizationId}</p></div><Link className="account-text-link" href="/account">Change organization</Link></div>
      {state.canManage ? <div className="project-create-panel"><div><h3>Invite a member</h3><p>Owner access cannot be granted by invitation. Manual token delivery is local-development only.</p></div><InviteMemberForm organizationId={organizationId} /></div> : <div className="project-create-panel"><h3>Read-only access</h3><p>Your current role cannot manage invitations.</p></div>}
      <h2>Members</h2>{state.members.length === 0 ? <p>No members were returned.</p> : <ul className="governance-list">{state.members.map((member) => <li key={member.userId}><div><b>{member.displayName}</b><small>{member.email} · {member.userId}</small></div><span>{member.role.replaceAll('_', ' ')}</span></li>)}</ul>}
      <h2>Invitations</h2>{state.invitations.length === 0 ? <p>No invitations are available.</p> : <ul className="governance-list">{state.invitations.map((invitation) => <li key={invitation.id}><div><b>{invitation.email}</b><small>{invitation.role.replaceAll('_', ' ')} · {invitation.status}</small></div>{state.canManage && invitation.status === 'PENDING' ? <RevokeInvitationAction organizationId={organizationId} invitation={invitation} /> : <span>{invitation.status}</span>}</li>)}</ul>}
    </div> : null}</section></main>;
}
