'use client';

import { useMemo, useState } from 'react';
import { compileArchitecturePackages, defaultArchitecturePlanningInput } from '../../src/projects/architecture-planning';
import { architectureBudgetErrors, architectureBudgetMinimums, architectureHostingBudgetGuidance, formatArchitectureMoney } from '../../src/projects/architecture-budget';
import type { ArchitectureBrief, ArchitecturePlanningInput } from '../../src/projects/schemas';
import type { ArchitecturePlanningEntity } from '../../src/projects/architecture-planning';

const surfaces: Array<[ArchitecturePlanningInput['productSurface'], string]> = [
  ['STATIC_SITE', 'Website'], ['WEB_APP', 'Web app'], ['MOBILE_APP', 'Mobile app'], ['WEB_AND_MOBILE', 'Web + mobile'], ['API_SERVICE', 'API/service'],
];
const priorities: Array<[ArchitecturePlanningInput['deliveryPriority'], string]> = [
  ['LOWEST_COST', 'Lowest cost'], ['FASTEST_DELIVERY', 'Fastest delivery'], ['BALANCED', 'Balanced'], ['SCALE_READY', 'Scale-ready'],
];
const skills: Array<[ArchitecturePlanningInput['teamSkills'][number], string]> = [
  ['AI_ASSISTED', 'AI will do it'], ['HTML_CSS_JS', 'HTML/CSS/JS'], ['REACT_TYPESCRIPT', 'React/TypeScript'], ['PHP_LARAVEL', 'PHP/Laravel'], ['PYTHON', 'Python'], ['GO', 'Go'], ['JAVA', 'Java'], ['DOTNET', '.NET'], ['DART_FLUTTER', 'Dart/Flutter'], ['SWIFT', 'Swift'], ['KOTLIN', 'Kotlin'],
];
const mobileCapabilities: Array<[ArchitecturePlanningInput['mobileCapabilities'][number], string]> = [
  ['PUSH_NOTIFICATIONS', 'Push'], ['OFFLINE', 'Offline'], ['CAMERA', 'Camera'], ['LOCATION', 'Location'], ['PAYMENTS', 'Payments'], ['BLUETOOTH', 'Bluetooth'],
];

function inputFromBrief(brief?: ArchitectureBrief): ArchitecturePlanningInput {
  if (!brief) return defaultArchitecturePlanningInput();
  const { id: _id, projectId: _projectId, graphVersion: _graphVersion, truthStatus: _truthStatus, updatedAt: _updatedAt, ...input } = brief;
  return input;
}

export function ArchitecturePlanningLab({ projectId, projectName, graphVersion, entities, existing, approved, onSaved }: {
  projectId: string;
  projectName: string;
  graphVersion: number;
  entities: ArchitecturePlanningEntity[];
  existing?: ArchitectureBrief;
  approved: boolean;
  onSaved: (brief: ArchitectureBrief) => void;
}) {
  const [draft, setDraft] = useState<ArchitecturePlanningInput>(() => inputFromBrief(existing));
  const [saved, setSaved] = useState<ArchitectureBrief | undefined>(existing);
  const [state, setState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(inputFromBrief(saved));
  const confirmed = Boolean(saved && !dirty && saved.graphVersion === graphVersion);
  const packages = useMemo(() => compileArchitecturePackages({ projectName, entities, brief: draft, confirmed }), [projectName, entities, draft, confirmed]);
  const selected = packages.find((item) => item.id === draft.selectedPackageId) ?? packages[1];
  const mobile = draft.productSurface === 'MOBILE_APP' || draft.productSurface === 'WEB_AND_MOBILE';
  const budgetErrors = architectureBudgetErrors(draft);
  const budgetMinimums = architectureBudgetMinimums(draft);
  const developmentMinimum = budgetMinimums.development;
  const hostingMinimum = budgetMinimums.monthlyHosting;
  const hostingGuidance = architectureHostingBudgetGuidance(draft);
  const budgetValid = !budgetErrors.development && !budgetErrors.monthlyHosting;

  function toggleSkill(skill: ArchitecturePlanningInput['teamSkills'][number]) {
    setDraft((current) => ({
      ...current,
      teamSkills: skill === 'AI_ASSISTED'
        ? ['AI_ASSISTED']
        : current.teamSkills.includes(skill)
          ? current.teamSkills.filter((item) => item !== skill)
          : [...current.teamSkills.filter((item) => item !== 'AI_ASSISTED'), skill],
    }));
    setState('idle');
  }

  async function save() {
    setState('saving'); setError('');
    try {
      const response = await fetch(`/api/projects/${projectId}/architecture/brief`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) });
      const body = await response.json() as { brief?: ArchitectureBrief; error?: string };
      if (!response.ok || !body.brief) throw new Error(body.error ?? `Request failed with ${response.status}`);
      setSaved(body.brief); setDraft(inputFromBrief(body.brief)); setState('success'); onSaved(body.brief);
    } catch (cause) {
      setState('error'); setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return <section className="architecture-planning-lab" aria-labelledby="architecture-planning-title">
    <header>
      <div><span className="mini-kicker">Architecture inputs</span><h3 id="architecture-planning-title">Choose the stack and where it will run.</h3><p>Axiom starts with a provisional suggestion, then recalculates three packages from your budget, team, product surface, scale, and hosting ownership.</p></div>
      <span className={`planning-truth ${confirmed ? 'confirmed' : ''}`}>{confirmed ? 'HUMAN_CONFIRMED inputs' : 'PROVISIONAL inputs'}</span>
    </header>

    <div className="architecture-input-grid">
      <fieldset disabled={approved}><legend>What are you building?</legend><div className="choice-row">{surfaces.map(([value, label]) => <button type="button" className={draft.productSurface === value ? 'selected' : ''} aria-pressed={draft.productSurface === value} key={value} onClick={() => setDraft({ ...draft, productSurface: value })}>{label}</button>)}</div></fieldset>
      <fieldset disabled={approved}><legend>What matters most?</legend><div className="choice-row">{priorities.map(([value, label]) => <button type="button" className={draft.deliveryPriority === value ? 'selected' : ''} aria-pressed={draft.deliveryPriority === value} key={value} onClick={() => setDraft({ ...draft, deliveryPriority: value })}>{label}</button>)}</div></fieldset>
      <fieldset className="budget-fields" disabled={approved}><legend>What can the project spend?</legend><label>Currency<select value={draft.developmentBudget.currency} onChange={(event) => setDraft({ ...draft, developmentBudget: { ...draft.developmentBudget, currency: event.target.value as ArchitecturePlanningInput['developmentBudget']['currency'] }, monthlyHostingBudget: { ...draft.monthlyHostingBudget, currency: event.target.value as ArchitecturePlanningInput['monthlyHostingBudget']['currency'] } })}><option>USD</option><option>INR</option><option>EUR</option><option>GBP</option></select></label><label>Development budget<input type="number" min={developmentMinimum} value={draft.developmentBudget.maximum} aria-invalid={Boolean(budgetErrors.development)} aria-describedby="development-budget-minimum" onChange={(event) => setDraft({ ...draft, developmentBudget: { ...draft.developmentBudget, maximum: Number(event.target.value) } })} /><small id="development-budget-minimum" className={budgetErrors.development ? 'budget-error' : ''}>{budgetErrors.development || `Minimum ${formatArchitectureMoney(draft.developmentBudget.currency, developmentMinimum)}`}</small></label><label>Monthly hosting ceiling<input type="number" min={hostingMinimum} value={draft.monthlyHostingBudget.maximum} aria-invalid={Boolean(budgetErrors.monthlyHosting)} aria-describedby="hosting-budget-minimum hosting-budget-guidance" onChange={(event) => setDraft({ ...draft, monthlyHostingBudget: { ...draft.monthlyHostingBudget, maximum: Number(event.target.value) } })} /><small id="hosting-budget-minimum" className={budgetErrors.monthlyHosting ? 'budget-error' : ''}>{budgetErrors.monthlyHosting || `Minimum ${formatArchitectureMoney(draft.monthlyHostingBudget.currency, hostingMinimum)}/month`}</small></label><p id="hosting-budget-guidance" className="hosting-budget-guidance">{hostingGuidance}</p></fieldset>
      <fieldset disabled={approved}><legend>What does the team already know?</legend><div className="check-grid">{skills.map(([value, label]) => <label key={value}><input type="checkbox" checked={draft.teamSkills.includes(value)} onChange={() => toggleSkill(value)} />{label}</label>)}</div>{draft.teamSkills.includes('AI_ASSISTED') ? <p className="ai-build-note"><b>Axiom chooses and prepares the implementation.</b> A human still reviews the code, connects accounts, approves spending, and owns production operation.</p> : null}<label className="compact-input">Team size<input type="number" min="1" max="500" value={draft.teamSize} onChange={(event) => setDraft({ ...draft, teamSize: Number(event.target.value) })} /></label></fieldset>
      <fieldset disabled={approved}><legend>Expected scale</legend><select value={draft.expectedScale} onChange={(event) => setDraft({ ...draft, expectedScale: event.target.value as ArchitecturePlanningInput['expectedScale'] })}><option value="PROTOTYPE">Prototype or pilot</option><option value="SMALL">Small production workload</option><option value="GROWING">Growing product</option><option value="HIGH_SCALE">High-scale workload</option></select></fieldset>
      <fieldset disabled={approved}><legend>How should hosting work?</legend><select value={draft.hostingPreference} onChange={(event) => setDraft({ ...draft, hostingPreference: event.target.value as ArchitecturePlanningInput['hostingPreference'], preferredProvider: event.target.value === 'CONNECT_EXISTING' ? draft.preferredProvider : undefined })}><option value="RECOMMEND_FOR_ME">Recommend and guide me</option><option value="CONNECT_EXISTING">Connect my existing provider</option><option value="SELF_HOSTED">Use infrastructure I operate</option></select>{draft.hostingPreference === 'CONNECT_EXISTING' ? <label>Provider<input placeholder="AWS, Azure, Vercel, cPanel…" value={draft.preferredProvider ?? ''} onChange={(event) => setDraft({ ...draft, preferredProvider: event.target.value })} /></label> : null}</fieldset>
      {mobile ? <fieldset disabled={approved}><legend>Which mobile capabilities are required?</legend><div className="check-grid">{mobileCapabilities.map(([value, label]) => <label key={value}><input type="checkbox" checked={draft.mobileCapabilities.includes(value)} onChange={() => setDraft((current) => ({ ...current, mobileCapabilities: current.mobileCapabilities.includes(value) ? current.mobileCapabilities.filter((item) => item !== value) : [...current.mobileCapabilities, value] }))} />{label}</label>)}</div></fieldset> : null}
    </div>

    <div className="stack-package-grid" aria-label="Technology and hosting packages">{packages.map((item) => <article key={item.id} className={draft.selectedPackageId === item.id ? 'selected' : ''}>
      <span>{item.label}</span><h4>{item.name}</h4><p>{item.summary}</p>
      <dl><div><dt>Frontend</dt><dd>{item.frontend}</dd></div><div><dt>Backend</dt><dd>{item.backend}</dd></div><div><dt>Database</dt><dd>{item.database}</dd></div><div><dt>Mobile</dt><dd>{item.mobile}</dd></div><div><dt>Hosting</dt><dd>{item.hosting}</dd></div></dl>
      <b>{item.estimatedMonthlyCost}</b><button type="button" disabled={approved} aria-pressed={draft.selectedPackageId === item.id} onClick={() => { setDraft({ ...draft, selectedPackageId: item.id }); setState('idle'); }}>{draft.selectedPackageId === item.id ? 'Selected package' : 'Choose package'}</button>
    </article>)}</div>

    <div className="architecture-blueprint">
      <div><span className="mini-kicker">What Axiom will prepare</span><h4>{selected.name} deployment blueprint</h4><ul>{selected.automationPlan.map((item) => <li key={item}>{item}</li>)}</ul><p>External account connection, billing approval, production deployment, and app-store submission remain explicit human approval boundaries.</p></div>
      <div><span className="mini-kicker">Connection path</span><ol>{selected.connectionSteps.map((item) => <li key={item}>{item}</li>)}</ol></div>
      <div><span className="mini-kicker">What is validated?</span>{selected.validation.map((item) => <p key={item.label}><i className={`validation-${item.status.toLowerCase()}`}>{item.status.replace('_', ' ')}</i><b>{item.label}</b><small>{item.detail}</small></p>)}</div>
    </div>

    <footer><div>{state === 'saving' ? <p role="status">Saving confirmed inputs and recalculating packages…</p> : null}{state === 'error' ? <p className="revision-error" role="alert"><b>Architecture inputs were not saved.</b> {error}</p> : null}{state === 'success' && confirmed ? <p className="planning-success" role="status">Inputs saved. The selected package can now be captured in the architecture decision.</p> : null}{!budgetValid ? <p className="revision-error" role="alert">Enter budgets at or above the workload and currency-specific planning minimums.</p> : state === 'idle' && !confirmed ? <p>Save these inputs before architecture approval. Cost and runtime claims remain estimates until real evidence exists.</p> : null}</div><button type="button" className="solid-action" disabled={approved || state === 'saving' || draft.teamSkills.length === 0 || !dirty || !budgetValid} onClick={save}>{approved ? 'Captured in approved ADR' : state === 'saving' ? 'Saving…' : confirmed ? 'Inputs confirmed' : 'Confirm inputs & recalculate'}</button></footer>
  </section>;
}
