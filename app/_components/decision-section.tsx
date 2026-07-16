import { dimensions, options, weighted } from '../../src/domain/day2';
import type { ArchitectureDecision } from '../../src/domain/schemas';
import type { ReadinessScore } from './types';

export function DecisionSection({ unlocked, score, selected, adr, onSelect, onApprove }: {
  unlocked: boolean;
  score: ReadinessScore;
  selected: string;
  adr: ArchitectureDecision | null;
  onSelect: (optionId: string) => void;
  onApprove: () => void;
}) {
  if (!unlocked) {
    return (
      <section className="card">
        <h2 className="text-xl font-black">Architecture Decision Lab</h2>
        <div className="rounded border border-amber-200 bg-amber-50 p-3">
          <b>Locked.</b> Resolve blockers first: {score.blockers.map((blocker) => blocker.id).join(', ')}
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="text-xl font-black">Architecture Decision Lab</h2>
      <p><span className="badge">AI_SUGGESTED recommendation</span> Serverless event-driven</p>
      <div className="grid grid-cols-3 gap-3">
        {options.map((option) => (
          <ArchitectureCard key={option.id} option={option} selected={selected === option.id} onSelect={onSelect} />
        ))}
      </div>
      <ComparisonTable />
      <button className="btn mt-4" onClick={onApprove}>Explicitly approve selected option</button>
      {adr ? <AdrSummary adr={adr} /> : null}
    </section>
  );
}

function ArchitectureCard({ option, selected, onSelect }: {
  option: (typeof options)[number];
  selected: boolean;
  onSelect: (optionId: string) => void;
}) {
  return (
    <article className={`rounded-xl border p-3 ${selected ? 'ring-2 ring-slate-900' : ''}`}>
      <h3 className="font-black">{option.name}</h3>
      <p>{option.summary}</p>
      <p><b>Score:</b> {weighted(option.id).toFixed(0)}/100</p>
      <p>
        <span className="badge">Cost {option.monthlyCostRange.truthStatus}</span>
        ${option.monthlyCostRange.min}-${option.monthlyCostRange.max}/mo
      </p>
      <Bullets title="Why" items={option.why} />
      <Bullets title="Why Not" items={option.whyNot} />
      <h4 className="mt-2 font-bold">Failure modes</h4>
      {option.failureModes.map((failure) => (
        <p key={failure.mode} className="text-sm"><b>{failure.mode}:</b> {failure.mitigation}</p>
      ))}
      <Bullets title="Reconsider" items={option.reconsiderationTriggers} />
      <button className="btn mt-3" onClick={() => onSelect(option.id)}>Choose</button>
    </article>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <>
      <h4 className="mt-2 font-bold">{title}</h4>
      <ul className="list-disc pl-5">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </>
  );
}

function ComparisonTable() {
  return (
    <>
      <h3 className="mt-4 font-bold">Transparent weighted comparison</h3>
      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Weight</th>
            {options.map((option) => <th key={option.id}>{option.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {dimensions.map((dimension) => (
            <tr key={dimension.id} className="border-t">
              <td>{dimension.label} <span className="badge">{dimension.truthStatus}</span></td>
              <td>{dimension.weight}</td>
              {options.map((option) => (
                <td key={option.id}>{dimension.ratings[option.id]}/5 = {((dimension.ratings[option.id] / 5) * dimension.weight).toFixed(1)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function AdrSummary({ adr }: { adr: ArchitectureDecision }) {
  const optionName = options.find((option) => option.id === adr.selectedOptionId)?.name;

  return (
    <section className="mt-4 rounded-xl border bg-green-50 p-3">
      <h3 className="font-black">
        Versioned ADR {adr.id} v{adr.version} {adr.stale ? <span className="badge">Potentially stale — re-evaluate</span> : null}
      </h3>
      <p><span className="badge">{adr.truthStatus}</span> Approved {adr.approvedAt}</p>
      <p><b>Decision:</b> {optionName}</p>
      <p><b>Rationale:</b> {adr.rationale.join('; ')}</p>
      <p><b>Rejected alternatives:</b> {adr.rejectedAlternatives.map((alternative) => alternative.optionId).join(', ')}</p>
      <p><b>Risks:</b> {adr.risks.join('; ')}</p>
      <p><b>Triggers:</b> {adr.reconsiderationTriggers.join('; ')}</p>
    </section>
  );
}
