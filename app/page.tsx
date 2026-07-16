'use client';

import { useState } from 'react';
import { AnalyzeSection } from './_components/analyze-section';
import { ClarificationSection } from './_components/clarification-section';
import { DecisionSection } from './_components/decision-section';
import { Header, StageNav } from './_components/header';
import { ReadinessSection } from './_components/readiness-section';
import { answerQuestion, approve, initialGaps, makeQuestions, readiness, resolvedGaps } from '../src/domain/day2';
import type { ArchitectureDecision } from '../src/domain/schemas';

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
