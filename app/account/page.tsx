import Link from 'next/link';

import { localAuthenticationEnabled } from '@/src/platform/config';
import { getCurrentUserState } from '@/src/platform/current-user';

import { SessionControls } from './session-controls';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getCurrentUserState();
  const localAuth = localAuthenticationEnabled();

  return (
    <main className="account-shell">
      <header className="account-topbar">
        <Link href="/" aria-label="Return to Axiom home"><span>A</span><b>Axiom</b></Link>
        <p>Account access</p>
      </header>

      <section className="account-card" aria-labelledby="account-heading">
        <span className="landing-kicker"><i /> Identity boundary</span>
        <h1 id="account-heading">Your Axiom access</h1>
        <p>Sessions remain in an HTTP-only browser cookie. The web application forwards them to the platform API without exposing credentials to client code.</p>

        {user.status === 'unauthenticated' ? (
          <div className="account-state">
            <h2>Authentication required</h2>
            <p>No valid session is available. Production identity-provider sign-in will be connected in a separate release.</p>
            {localAuth ? <SessionControls action="local-sign-in" /> : <p>Local authentication is disabled.</p>}
          </div>
        ) : null}

        {user.status === 'unavailable' ? (
          <div className="account-state" role="alert">
            <h2>Access temporarily unavailable</h2>
            <p>{user.message}</p>
            <SessionControls action="sign-out" />
          </div>
        ) : null}

        {user.status === 'authenticated' ? (
          <div className="account-state">
            <div className="account-state-heading">
              <div><h2>Authenticated</h2><p>Your active organization memberships are listed below.</p></div>
              <SessionControls action="sign-out" />
            </div>
            {user.organizations.length === 0 ? (
              <p>No active organization memberships were found.</p>
            ) : (
              <ul className="organization-access-list">
                {user.organizations.map((organization) => (
                  <li key={organization.id}>
                    <div><b>{organization.name}</b><small>{organization.id}</small></div>
                    <div className="account-org-actions">
                      <span>{organization.role}</span>
                      <Link href={`/account/organizations/${organization.id}/projects`}>View projects</Link>
                      <Link href={`/account/organizations/${organization.id}/models`}>View models</Link>
                      {['OWNER', 'ADMINISTRATOR'].includes(organization.role) ? <Link href={`/account/organizations/${organization.id}/billing`}>View budget</Link> : null}
                      {['OWNER', 'ADMINISTRATOR'].includes(organization.role) ? <Link href={`/account/organizations/${organization.id}/members`}>Manage access</Link> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
