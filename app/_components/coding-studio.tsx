'use client';

import { useState } from 'react';
import type { JiraBacklogStory } from '../../src/projects/schemas';
import { ActionLabel } from './action-label';

type CodingStudioProps = {
  codingPacket: string;
  jiraKey?: string;
  story?: JiraBacklogStory;
  onOpenExecutableSample: () => void;
};

export function CodingStudio({ codingPacket, jiraKey, story, onOpenExecutableSample }: CodingStudioProps) {
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPacket() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(codingPacket);
      setCopied(true);
    } finally {
      setCopying(false);
    }
  }

  return <section className="coding-studio" aria-labelledby="coding-studio-title">
    <header>
      <div><span className="mini-kicker">Axiom Build Studio</span><h4 id="coding-studio-title">Watch implementation become evidence.</h4><p>Axiom will code inside an allowlisted workspace. The product streams real file changes and commands here; an external IDE is an optional handoff, not a requirement.</p></div>
      <span className="studio-mode"><i /> Repository authorization required</span>
    </header>
    <div className="coding-studio-grid">
      <aside className="coding-story-context">
        <span>Selected Jira story</span>
        <b>{jiraKey ?? story?.localId ?? 'Story selected'}</b>
        <h5>{story?.summary ?? 'Controlled coding task'}</h5>
        <p>{story?.description ?? 'The approved story contract is ready for implementation.'}</p>
        <dl><div><dt>Truth boundary</dt><dd>{story?.truthStatus ?? 'AI_SUGGESTED'}</dd></div><div><dt>Acceptance checks</dt><dd>{story?.acceptanceCriteria.length ?? 0}</dd></div><div><dt>Source entities</dt><dd>{story?.sourceEntityIds.length ?? 0}</dd></div></dl>
      </aside>
      <div className="coding-execution-ledger">
        <div className="execution-step complete"><span>01</span><div><b>Task contract compiled</b><p>Approved scope, sources, acceptance criteria, and fixed verification commands are frozen.</p></div><i>Complete</i></div>
        <div className="execution-step active"><span>02</span><div><b>Authorize repository workspace</b><p>Select the target repository and write allowlist before an agent may change files.</p></div><i>Waiting</i></div>
        <div className="execution-step locked"><span>03</span><div><b>Generate and review patch</b><p>The file tree, diffs, source links, and agent events will appear here from real tool output.</p></div><i>Locked</i></div>
        <div className="execution-step locked"><span>04</span><div><b>Run fixed verification</b><p>Build, tests, coverage, command duration, and exit codes become stored evidence.</p></div><i>Locked</i></div>
      </div>
      <aside className="coding-live-panel">
        <header><span /><span /><span /><b>Live activity</b></header>
        <div><time>READY</time><p>Task packet compiled from the approved Jira story.</p><time>WAIT</time><p>No coding process is running. Repository authorization is required.</p></div>
        <small>No simulated progress or fabricated command output is displayed.</small>
      </aside>
    </div>
    <footer>
      <div><button type="button" aria-busy={copying} disabled={copying} onClick={copyPacket}><ActionLabel loading={copying} loadingText="Copying task…">{copied ? 'Task packet copied' : 'Copy task for IDE'}</ActionLabel></button><button type="button" className="primary-glow-button compact" onClick={onOpenExecutableSample}>Open live coding proof <span>→</span></button></div>
      <p>The NotifyFlow sample demonstrates the real generated-file diff and verification runner while generic repository authorization remains intentionally locked.</p>
    </footer>
    <details><summary>View compiled coding contract</summary><pre>{codingPacket}</pre></details>
  </section>;
}
