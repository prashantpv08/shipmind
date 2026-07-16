'use client';

import { useState } from 'react';
import {
  answerQuestion,
  approve,
  brief,
  dimensions,
  initialGaps,
  makeQuestions,
  options,
  readiness,
  requirements,
  resolvedGaps,
  spans,
  weighted,
} from '../src/domain/day2';
import type { ArchitectureDecision, ClarificationQuestion } from '../src/domain/schemas';

type SubmitAnswer = (questionId: string, value: string, optionId?: string) => void;

function Header() {
  const mode = process.env.NEXT_PUBLIC_AXIOM_AI_MODE === 'live' ? 'Live AI' : 'Demo fixture';

  return (
    <header className="flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-black">Axiom — Clarification and Architecture Decision Lab</h1>
        <p className="muted">NotifyFlow Day 2: grounded analysis → clarify blockers → decide → ADR.</p>
      </div>
      <span className="badge">{mode}</span>
    </header>
  );
}

function StageNav({ loaded, answeredCount, questionCount, unlocked }: {
  loaded: boolean;
  answeredCount: number;
  questionCount: number;
  unlocked: boolean;
}) {
  const stages = [
    { label: '1. Analyze', status: loaded ? 'Complete' : 'Ready' },
    { label: '2. Clarify', status: `${answeredCount}/${questionCount} answered` },
    { label: '3. Decide', status: unlocked ? 'Unlocked' : 'Locked by blockers' },
  ];

  return (
    <nav className="grid grid-cols-3 gap-3">
      {stages.map((stage) => (
        <div key={stage.label} className="card">
          <b>{stage.label}</b>
          <p className="muted text-sm">{stage.status}</p>
        </div>
      ))}
    </nav>
  );
}

function AnalyzeSection({ loaded, highlight, onLoad, onHighlight }: {
  loaded: boolean;
  highlight: string;
  onLoad: () => void;
  onHighlight: (spanId: string) => void;
}) {
  return (
    <section className="card">
      <div className="flex gap-3">
        <button className="btn" onClick={onLoad}>{loaded ? 'Reset / Load NotifyFlow' : 'Load NotifyFlow + Analyze'}</button>
        <span className="badge">Fixture mode works without API key</span>
      </div>
      {loaded ? (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <h2 className="font-bold">Product brief</h2>
            <p className="leading-7">{brief}</p>
            <h3 className="mt-3 font-bold">Source spans</h3>
            {spans.map((span) => (
              <button
                key={span.id}
                onClick={() => onHighlight(span.id)}
                className={`my-1 block rounded p-2 text-left ${highlight === span.id ? 'mark' : 'bg-slate-100'}`}
              >
                {span.id}: {span.text}
              </button>
            ))}
          </div>
          <div>
            <h2 className="font-bold">Grounded findings</h2>
            {requirements.map((requirement) => (
              <button
                key={requirement.id}
                onClick={() => onHighlight(requirement.span)}
                className="my-1 block w-full rounded border p-2 text-left"
              >
                <b>{requirement.id}</b> <span className="badge">{requirement.truth}</span>
                <br />
                {requirement.text}
              </button>
            ))}
            <h3 className="mt-3 font-bold">Unknowns and inferred items</h3>
            {initialGaps.map((gap) => (
              <div key={gap.id} className="my-1 rounded border p-2">
                <b>{gap.id}</b> <span className="badge">UNKNOWN</span> <span className="badge">{gap.severity}</span>
                <br />
                {gap.title}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReadinessSection({ before, score, gaps }: {
  before: number;
  score: ReturnType<typeof readiness>;
  gaps: ReturnType<typeof resolvedGaps>;
}) {
  const resolved = gaps.filter((gap) => gap.resolved).map((gap) => gap.id).join(', ') || 'None yet';
  const remaining = score.unknowns.map((gap) => gap.id).join(', ') || 'None blocking';

  return (
    <section className="card">
      <h2 className="text-xl font-black">Readiness: {before} → {score.total}</h2>
      <div className="my-3 grid grid-cols-7 gap-2">
        {score.categories.map((category) => (
          <div key={category.label} className="rounded bg-slate-100 p-2">
            <b className="text-sm">{category.label}</b>
            <p>{category.score}/{category.weight}</p>
            <small>{category.items[0]}</small>
          </div>
        ))}
      </div>
      <p><b>Resolved gaps:</b> {resolved}</p>
      <p><b>Remaining unknowns:</b> {remaining}</p>
    </section>
  );
}

function ClarificationSection({ questions, onSubmit }: {
  questions: ClarificationQuestion[];
  onSubmit: SubmitAnswer;
}) {
  return (
    <section className="card">
      <h2 className="text-xl font-black">Clarify highest-impact unknowns</h2>
      <div className="grid grid-cols-2 gap-3">
        {questions.map((question) => (
          <ClarificationCard key={question.id} question={question} onSubmit={onSubmit} />
        ))}
      </div>
    </section>
  );
}

function ClarificationCard({ question, onSubmit }: {
  question: ClarificationQuestion;
  onSubmit: SubmitAnswer;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex gap-2">
        <b>{question.id}</b>
        <span className="badge">{question.severity}</span>
        <span className="badge">{question.answerStatus}</span>
      </div>
      <h3 className="mt-2 font-bold">{question.text}</h3>
      <p className="muted">Why: {question.whyItMatters}</p>
      <p className="text-sm">
        Affects: {question.affectedEntityIds.join(', ')} | Gaps: {question.relatedGapIds.join(', ')}
      </p>
      {question.options.map((option) => (
        <button
          key={option.id}
          onClick={() => onSubmit(question.id, option.value, option.id)}
          className="my-2 block w-full rounded bg-slate-100 p-2 text-left"
        >
          {option.label}
        </button>
      ))}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit(question.id, String(form.get('custom') || 'Custom answer'));
        }}
      >
        <input name="custom" className="w-full rounded border p-2" placeholder="Custom answer supported" />
        <button className="btn mt-2">Submit / edit answer</button>
      </form>
      {question.answer ? (
        <p className="mt-2"><span className="badge">USER_PROVIDED</span> {question.answer.value}</p>
      ) : null}
    </div>
  );
}

function DecisionSection({ unlocked, score, selected, adr, onSelect, onApprove }: {
  unlocked: boolean;
  score: ReturnType<typeof readiness>;
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

export default function Page() {
  const [loaded, setLoaded] = useState(false);
  const [highlight, setHighlight] = useState('');
  const [questions, setQuestions] = useState(makeQuestions());
  const [selected, setSelected] = useState('ARCH-SERVERLESS');
  const [adr, setAdr] = useState<ArchitectureDecision | null>(null);
  const gaps = resolvedGaps(questions, initialGaps);
  const score = readiness(gaps);
  const before = readiness(initialGaps).total;
  const unlocked = score.blockers.length === 0;

  function load() {
    setLoaded(true);
    setAdr(null);
    setQuestions(makeQuestions());
  }

  function submit(questionId: string, value: string, optionId?: string) {
    setQuestions((currentQuestions) => answerQuestion(currentQuestions, questionId, value, optionId));
    if (adr) setAdr({ ...adr, stale: true });
  }

  return (
    <main className="mx-auto max-w-[1400px] space-y-5 p-6">
      <Header />
      <StageNav
        loaded={loaded}
        answeredCount={questions.filter((question) => question.answerStatus === 'ANSWERED').length}
        questionCount={questions.length}
        unlocked={unlocked}
      />
      <AnalyzeSection loaded={loaded} highlight={highlight} onLoad={load} onHighlight={setHighlight} />
      {loaded ? (
        <>
          <ReadinessSection before={before} score={score} gaps={gaps} />
          <ClarificationSection questions={questions} onSubmit={submit} />
          <DecisionSection
            unlocked={unlocked}
            score={score}
            selected={selected}
            adr={adr}
            onSelect={setSelected}
            onApprove={() => setAdr(approve(selected))}
          />
        </>
      ) : null}
    </main>
  );
}
