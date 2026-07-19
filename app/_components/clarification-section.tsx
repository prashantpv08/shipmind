import type { ClarificationQuestion } from '../../src/domain/schemas';
import type { SubmitAnswer } from './types';

export function ClarificationSection({ questions, onSubmit }: {
  questions: ClarificationQuestion[];
  onSubmit: SubmitAnswer;
}) {
  return (
    <section className="card">
      <h2 className="text-xl font-black">Clarify highest-impact unknowns</h2>
      <div className="responsive-grid">
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
        <span className={`badge severity-${question.severity.toLowerCase()}`}>{question.severity}</span>
        <span className="badge">{question.answerStatus}</span>
      </div>
      <h3 className="mt-2 font-bold">{question.text}</h3>
      <p className="muted">Why: {question.whyItMatters}</p>
      <p className="text-sm">
        Affects: {question.affectedEntityIds.join(', ')} | Gaps: {question.relatedGapIds.join(', ')}
      </p>
      {question.options.map((option) => (
        <button
          type="button"
          key={option.id}
          onClick={() => onSubmit(question.id, option.value, option.id)}
          className="my-2 block w-full rounded bg-slate-100 p-2 text-left"
        >
          {option.label}
        </button>
      ))}
      <form
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const value = String(form.get('custom') || '').trim();
          if (value) onSubmit(question.id, value);
        }}
      >
        <input name="custom" required className="w-full rounded border p-2" placeholder="Custom answer supported" />
        <button className="btn mt-2">Submit / edit answer</button>
      </form>
      {question.answer ? (
        <p className="mt-2"><span className="badge">USER_PROVIDED</span> {question.answer.value}</p>
      ) : null}
    </div>
  );
}
