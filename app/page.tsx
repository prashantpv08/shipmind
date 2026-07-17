'use client';

import { useState } from 'react';
import { AnalyzeSection } from './_components/analyze-section';
import { ClarificationSection } from './_components/clarification-section';
import { DecisionSection } from './_components/decision-section';
import { Header, StageNav } from './_components/header';
import { ReadinessSection } from './_components/readiness-section';
import { answerQuestion, approve, brief as sampleBrief, readiness, resolvedGaps } from '../src/domain/day2';
import {
  AnalyzeErrorResponse,
  AnalysisResult,
  type ArchitectureDecision,
  type RunMeta,
} from '../src/domain/schemas';

export default function Page() {
  const [brief, setBrief] = useState(sampleBrief);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [lastValid, setLastValid] = useState<AnalysisResult | null>(null);
  const [displayedRun, setDisplayedRun] = useState<RunMeta | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState('');
  const [selected, setSelected] = useState('ARCH-SERVERLESS');
  const [adr, setAdr] = useState<ArchitectureDecision | null>(null);

  const questions = analysis?.clarificationQuestions ?? [];
  const gaps = analysis ? resolvedGaps(questions, analysis.gaps) : [];
  const score = readiness(gaps);
  const before = analysis ? readiness(analysis.gaps).total : 0;
  const unlocked = analysis ? score.blockers.length === 0 : false;

  async function analyze(useFixture = false) {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brief, useFixture }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const failure = AnalyzeErrorResponse.safeParse(body);
        if (failure.success) {
          setDisplayedRun(failure.data.run);
          throw new Error(failure.data.error);
        }
        const message = body && typeof body === 'object' && 'error' in body
          ? String(body.error)
          : 'Analysis failed';
        throw new Error(message);
      }

      const parsed = AnalysisResult.parse(body);
      setAnalysis(parsed);
      setLastValid(parsed);
      setDisplayedRun(parsed.run);
      setAdr(null);
      setSelected(parsed.architectureOptions[0]?.id ?? '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setAnalysis(lastValid);
    } finally {
      setLoading(false);
    }
  }

  function submit(questionId: string, value: string, optionId?: string) {
    setAnalysis((current) => current ? {
      ...current,
      clarificationQuestions: answerQuestion(current.clarificationQuestions, questionId, value, optionId),
      graphVersion: current.graphVersion + 1,
    } : current);
    setAdr((current) => current ? { ...current, stale: true } : current);
  }

  function reset() {
    setBrief(sampleBrief);
    setAnalysis(null);
    setLastValid(null);
    setDisplayedRun(null);
    setError('');
    setAdr(null);
    setHighlight('');
  }

  return (
    <main className="mx-auto max-w-[1400px] space-y-5 p-6">
      <Header run={displayedRun ?? analysis?.run} />
      <StageNav
        loaded={Boolean(analysis)}
        loading={loading}
        answeredCount={questions.filter((question) => question.answerStatus === 'ANSWERED').length}
        questionCount={questions.length}
        unlocked={unlocked}
      />
      <AnalyzeSection
        brief={brief}
        setBrief={setBrief}
        analysis={analysis}
        highlight={highlight}
        loading={loading}
        error={error}
        onAnalyze={() => analyze(false)}
        onFixture={() => analyze(true)}
        onHighlight={setHighlight}
        onReset={reset}
      />
      {analysis ? (
        <>
          <ReadinessSection before={before} score={score} gaps={gaps} />
          <ClarificationSection questions={questions} onSubmit={submit} />
          <DecisionSection
            options={analysis.architectureOptions}
            unlocked={unlocked}
            score={score}
            selected={selected}
            adr={adr}
            graphVersion={analysis.graphVersion}
            onSelect={setSelected}
            onApprove={() => setAdr(approve(selected, analysis.architectureOptions, analysis.graphVersion))}
          />
        </>
      ) : null}
    </main>
  );
}
