'use client';

import { useState } from 'react';
import type { ArchitectureOption, JiraBacklogPlan, JiraPublication } from '../../src/projects/schemas';
import { ActionLabel } from './action-label';
import { ArchitectureDiagrams } from './architecture-diagrams';
import { CodingStudio } from './coding-studio';

type DeliveryLoadingAction = 'notion' | 'plan' | 'jira' | 'coding' | null;

type DeliveryStageProps = {
  plan: JiraBacklogPlan | null;
  publication: JiraPublication | null;
  jiraConfigured: boolean;
  jiraChecking: boolean;
  codingPacket: string;
  busy: boolean;
  loadingAction: DeliveryLoadingAction;
  option: ArchitectureOption;
  projectName: string;
  notionUrl?: string;
  jiraProjectKey?: string;
  jiraError?: string;
  onReviewDecision: () => void;
  onPublishNotion: () => void;
  onPreparePlan: () => void;
  onCreateJira: () => void;
  onPrepareCoding: (storyId: string) => void;
};

export function DeliveryStage({ plan, publication, jiraConfigured, jiraChecking, codingPacket, busy, loadingAction, option, projectName, notionUrl, jiraProjectKey, jiraError, onReviewDecision, onPublishNotion, onPreparePlan, onCreateJira, onPrepareCoding }: DeliveryStageProps) {
  const [selectedStoryId, setSelectedStoryId] = useState('');
  const selectedStory = selectedStoryId || publication?.stories[0]?.localId || plan?.stories[0]?.localId || '';
  const selectedStoryPlan = plan?.stories.find((story) => story.localId === selectedStory);
  const selectedJiraStory = publication?.stories.find((story) => story.localId === selectedStory);

  return <section className="stage-surface handoff-stage delivery-stage">
    <div className="handoff-hero"><span className="approved-orbit">✓</span><span className="experience-kicker"><i /> Human approved</span><h2>Architecture approved. Delivery can begin.</h2><p>The final HLD and ADR are tied to the approved graph. Next, review the generated epic and child stories, create them in Jira once, then prepare coding context story by story.</p><div>{notionUrl ? <><a className="primary-glow-button compact" href={notionUrl} target="_blank" rel="noreferrer">Open complete project in Notion <span>↗</span></a><button type="button" className="quiet-button light" aria-busy={loadingAction === 'notion'} disabled={busy} onClick={onPublishNotion}><ActionLabel loading={loadingAction === 'notion'} loadingText="Syncing to Notion…">Sync latest to Notion</ActionLabel></button></> : <button type="button" className="primary-glow-button compact" aria-busy={loadingAction === 'notion'} disabled={busy} onClick={onPublishNotion}><ActionLabel loading={loadingAction === 'notion'} loadingText="Publishing to Notion…">Publish complete project <span>→</span></ActionLabel></button>}<button type="button" className="quiet-button light" onClick={onReviewDecision}>Review decision</button></div></div>
    <ArchitectureDiagrams option={option} projectName={projectName} status="HUMAN_APPROVED" />

    <section className="delivery-pipeline" aria-labelledby="delivery-title">
      <header><div><span className="mini-kicker">Approved system → delivery</span><h3 id="delivery-title">One governed path from decision to code.</h3><p>Nothing is created externally until you approve the preview. Coding context is produced only for Jira-published stories.</p></div><ol><li className="complete"><span>1</span>HLD approved</li><li className={publication ? 'complete' : 'active'}><span>2</span>Jira backlog</li><li className={codingPacket ? 'complete' : ''}><span>3</span>Coding task</li></ol></header>
      {!plan ? <div className="delivery-empty"><span>JR</span><div><b>Prepare the Jira delivery plan</b><p>Axiom will compile one epic and source-linked child stories from the approved documents and architecture. This does not create Jira issues.</p></div><button type="button" aria-busy={loadingAction === 'plan'} disabled={busy} onClick={onPreparePlan}><ActionLabel loading={loadingAction === 'plan'} loadingText="Preparing preview…">Prepare preview →</ActionLabel></button></div> : <div className="backlog-preview">
        <div className="epic-preview"><span>EPIC</span><div><small>AI_SUGGESTED · graph v{plan.sourceGraphVersion}</small><h4>{plan.epic.summary}</h4><p>{plan.epic.description}</p></div>{publication ? <a href={publication.epicUrl} target="_blank" rel="noreferrer">{publication.epicKey} ↗</a> : null}</div>
        <div className="story-preview-list" aria-label="Jira story preview">{plan.stories.map((story) => { const created = publication?.stories.find((item) => item.localId === story.localId); return <button type="button" key={story.localId} className={selectedStory === story.localId ? 'selected' : ''} onClick={() => setSelectedStoryId(story.localId)}><span>{created?.key ?? story.localId}</span><div><b>{story.summary}</b><small>{story.sourceEntityIds.join(' · ') || 'Requires scope clarification'} · {story.acceptanceCriteria.length} acceptance criteria</small></div><i>{created ? 'Created' : story.priority}</i></button>; })}</div>
        {!publication ? <div className="jira-confirmation"><div><b>{plan.stories.length + 1} Jira items ready for confirmation</b><p>The epic is created first; every story is then created as its child. Axiom stores the returned issue keys and will not recreate the same approved plan.</p>{jiraConfigured ? <small>Connected to Jira project {jiraProjectKey}.</small> : jiraError ? <small className="jira-error">Jira connection failed: {jiraError}</small> : null}</div><button type="button" className="primary-glow-button compact" aria-busy={loadingAction === 'jira' || jiraChecking} disabled={loadingAction === 'jira' || jiraChecking || !jiraConfigured} onClick={onCreateJira}><ActionLabel loading={loadingAction === 'jira' || jiraChecking} loadingText={jiraChecking ? 'Checking Jira connection…' : 'Creating Jira hierarchy…'}>{jiraConfigured ? <>Confirm & create in Jira <span>↗</span></> : 'Jira connection needs attention'}</ActionLabel></button></div> : <div className="coding-handoff"><div><span className="approved-mark">✓</span><div><b>Jira backlog created</b><p>{publication.epicKey} with {publication.stories.length} child stories is ready. Select a story and prepare the controlled coding task.</p></div></div><button type="button" className="primary-glow-button compact" aria-busy={loadingAction === 'coding'} disabled={busy || !selectedStory} onClick={() => onPrepareCoding(selectedStory)}><ActionLabel loading={loadingAction === 'coding'} loadingText="Compiling coding task…">Prepare coding task <span>→</span></ActionLabel></button></div>}
      </div>}
      {codingPacket ? <CodingStudio codingPacket={codingPacket} jiraKey={selectedJiraStory?.key} story={selectedStoryPlan} /> : null}
    </section>
  </section>;
}
