'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import type { PlatformProject } from '@/src/platform/contracts';

type ActionState = 'idle' | 'confirming' | 'loading' | 'success' | 'error' | 'stale';

export function ProjectLifecycleActions({
  organizationId,
  project,
}: {
  organizationId: string;
  project: Pick<PlatformProject, 'id' | 'name' | 'status' | 'rowVersion'>;
}) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const [state, setState] = useState<ActionState>('idle');
  const [message, setMessage] = useState('');
  const action = project.status === 'ARCHIVED' ? 'restore' : 'archive';

  async function mutateProjectLifecycle() {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setState('loading');
    setMessage('');
    try {
      const response = await fetch(
        `/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(project.id)}/${action}`,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'if-match': `"${project.id}:${project.rowVersion}"`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 412 || response.status === 409) {
          setState('stale');
          setMessage('The project changed before this action completed. Refresh the list before deciding again.');
          return;
        }
        setState('error');
        setMessage(
          response.status === 403
            ? 'Your current role cannot change the project lifecycle.'
            : response.status === 404
              ? 'The project is no longer available in this organization.'
              : 'The lifecycle action failed. No successful change is being claimed.',
        );
        return;
      }

      setState('success');
      setMessage(action === 'archive' ? `Archived ${project.name}.` : `Restored ${project.name}.`);
      router.refresh();
    } catch {
      setState('stale');
      setMessage('The response is unknown. Refresh the list before retrying because the lifecycle may already have changed.');
    } finally {
      requestInFlight.current = false;
    }
  }

  function refreshState() {
    setState('idle');
    setMessage('');
    router.refresh();
  }

  if (state === 'confirming') {
    return (
      <div className="project-lifecycle-confirmation">
        <p>Archive <b>{project.name}</b>? Its data will remain stored and it can be restored to {project.status.replaceAll('_', ' ').toLowerCase()}.</p>
        <div>
          <button type="button" onClick={mutateProjectLifecycle}>Confirm archive</button>
          <button type="button" onClick={() => setState('idle')}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-lifecycle-actions">
      {state === 'idle' ? (
        <button
          type="button"
          onClick={() => action === 'archive' ? setState('confirming') : void mutateProjectLifecycle()}
        >
          {action === 'archive' ? 'Archive' : 'Restore'}
        </button>
      ) : null}
      {state === 'loading' ? <button type="button" disabled aria-busy="true">Updating…</button> : null}
      {state === 'success' ? <p role="status">{message}</p> : null}
      {state === 'error' ? <p role="alert">{message}</p> : null}
      {state === 'stale' ? (
        <div>
          <p role="alert">{message}</p>
          <button type="button" onClick={refreshState}>Refresh project list</button>
        </div>
      ) : null}
    </div>
  );
}
