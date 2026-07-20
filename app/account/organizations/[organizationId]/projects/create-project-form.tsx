'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import type { PlatformWorkspace } from '@/src/platform/contracts';

export function CreateProjectForm({
  organizationId,
  workspaces,
}: {
  organizationId: string;
  workspaces: PlatformWorkspace[];
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? '');
  const idempotencyKey = useRef<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2 || workspaceId.length === 0) return;

    setStatus('loading');
    setMessage('');
    const retryKey = idempotencyKey.current ?? crypto.randomUUID();
    idempotencyKey.current = retryKey;

    try {
      const response = await fetch(
        `/api/platform/organizations/${encodeURIComponent(organizationId)}/projects`,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'idempotency-key': retryKey,
          },
          body: JSON.stringify({ name: name.trim(), workspaceId }),
        },
      );

      if (!response.ok) {
        setStatus('error');
        setMessage(
          response.status === 403
            ? 'Your current role cannot create projects.'
            : response.status === 404
              ? 'The selected workspace is no longer available.'
              : response.status === 409
                ? 'This request conflicts with an earlier creation attempt. Change the input and retry.'
                : 'The project could not be created. Your input is preserved for a safe retry.',
        );
        return;
      }

      const created = await response.json() as { name?: unknown };
      setStatus('success');
      setMessage(`Created ${typeof created.name === 'string' ? created.name : 'the project'}.`);
      setName('');
      idempotencyKey.current = null;
      router.refresh();
    } catch {
      setStatus('error');
      setMessage('The platform could not be reached. Your input and retry key were preserved.');
    }
  }

  function changeName(value: string) {
    setName(value);
    idempotencyKey.current = null;
    if (status !== 'loading') setStatus('idle');
  }

  function changeWorkspace(value: string) {
    setWorkspaceId(value);
    idempotencyKey.current = null;
    if (status !== 'loading') setStatus('idle');
  }

  return (
    <form className="project-create-form" onSubmit={submit}>
      <div>
        <label htmlFor="project-name">Project name</label>
        <input
          id="project-name"
          name="name"
          value={name}
          onChange={(event) => changeName(event.target.value)}
          minLength={2}
          maxLength={160}
          required
          disabled={status === 'loading'}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="project-workspace">Workspace</label>
        <select
          id="project-workspace"
          name="workspaceId"
          value={workspaceId}
          onChange={(event) => changeWorkspace(event.target.value)}
          disabled={status === 'loading'}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={status === 'loading'} aria-busy={status === 'loading'}>
        {status === 'loading' ? 'Creating project…' : 'Create project'}
      </button>
      {status === 'success' ? <p role="status">{message}</p> : null}
      {status === 'error' ? <p role="alert">{message}</p> : null}
    </form>
  );
}
