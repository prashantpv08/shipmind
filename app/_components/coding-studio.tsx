'use client';

import { useState } from 'react';
import type { JiraBacklogStory } from '../../src/projects/schemas';
import { ActionLabel } from './action-label';

type CodingStudioProps = {
  codingPacket: string;
  jiraKey?: string;
  story?: JiraBacklogStory;
};

export function CodingStudio({ codingPacket, jiraKey, story }: CodingStudioProps) {
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
      <div><span className="mini-kicker">Axiom Build Studio</span><h4 id="coding-studio-title">Governed coding handoff complete.</h4><p>The approved Jira story is compiled into a controlled task contract. This is the final implemented stage of the current MVP.</p></div>
      <span className="studio-mode complete"><i /> MVP handoff complete</span>
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
        <div className="execution-step next-phase"><span>02</span><div><b>Connect repository workspace</b><p>Repository authorization and the write allowlist are planned for the next implementation phase.</p></div><i>Next phase</i></div>
        <div className="execution-step next-phase"><span>03</span><div><b>Generate and review patch</b><p>Project-specific file changes, source links, and agent events will be added in the next phase.</p></div><i>Next phase</i></div>
        <div className="execution-step next-phase"><span>04</span><div><b>Run fixed verification</b><p>Build, tests, coverage, command duration, and exit codes will become stored evidence in the next phase.</p></div><i>Next phase</i></div>
      </div>
      <aside className="coding-live-panel">
        <header><span /><span /><span /><b>Handoff status</b></header>
        <div><time>READY</time><p>Task packet compiled from the approved Jira story.</p><time>DONE</time><p>The current MVP ends at this governed coding handoff.</p><time>NEXT</time><p>Repository execution and verification are planned next.</p></div>
        <small>No coding process is running and no simulated command output is displayed.</small>
      </aside>
    </div>
    <footer>
      <div><button type="button" aria-busy={copying} disabled={copying} onClick={copyPacket}><ActionLabel loading={copying} loadingText="Copying task…">{copied ? 'Task packet copied' : 'Copy task for IDE'}</ActionLabel></button></div>
      <p className="mvp-boundary-note"><b>Current MVP ends here.</b><span>Live repository authorization, project-specific code generation, and verification are planned for the next implementation phase.</span></p>
    </footer>
    <details><summary>View compiled coding contract</summary><pre>{codingPacket}</pre></details>
  </section>;
}
