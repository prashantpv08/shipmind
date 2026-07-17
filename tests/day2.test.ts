import { describe, expect, it, vi } from 'vitest';
import { AnalysisResult, ArchitectureOption, ClarificationQuestion } from '../src/domain/schemas';
import {
  answerQuestion,
  approve,
  brief,
  deriveSpans,
  dimensions,
  fixtureAnalysisResult,
  initialGaps,
  makeQuestions,
  options,
  readiness,
  resolvedGaps,
  weighted,
} from '../src/domain/day2';
import { FixtureProvider, OpenAIProvider, sourceEvidenceForQuote, withVerifiedGrounding } from '../src/ai/provider';

describe('day2 domain and analysis contract', () => {
  it('validates the fixture AnalysisResult and run metadata', async () => {
    const result = await new FixtureProvider().analyze(brief);

    expect(AnalysisResult.safeParse(result).success).toBe(true);
    expect(result.run).toMatchObject({
      label: 'Demo fixture',
      providerName: 'notifyflow-day2-fixture',
      mode: 'fixture',
      outcome: 'SUCCEEDED',
    });
  });

  it('validates question schema and references real gaps/entities', () => {
    const questions = makeQuestions();

    expect(questions).toHaveLength(4);
    questions.forEach((question) => {
      expect(ClarificationQuestion.safeParse(question).success).toBe(true);
      expect(question.relatedGapIds.every((id) => initialGaps.some((gap) => gap.id === id))).toBe(true);
    });
  });

  it('stores suggested and custom answers as USER_PROVIDED with stable ids', () => {
    let questions = makeQuestions();
    questions = answerQuestion(questions, 'CQ-LOAD', questions[0].options[0].value, questions[0].options[0].id);
    const answerId = questions[0].answer?.id;
    questions = answerQuestion(questions, 'CQ-LOAD', 'custom value');

    expect(questions[0].answer?.provenance).toBe('USER_PROVIDED');
    expect(questions[0].answer?.id).toBe(answerId);
  });

  it('returns identical readiness for identical inputs and enforces blocker caps', () => {
    expect(readiness(initialGaps)).toEqual(readiness(initialGaps));
    expect(readiness(initialGaps).total).toBeLessThanOrEqual(69);

    let questions = makeQuestions();
    for (const question of questions) {
      questions = answerQuestion(questions, question.id, question.options[0].value, question.options[0].id);
    }

    expect(readiness(resolvedGaps(questions)).blockers).toHaveLength(0);
  });

  it('validates architecture options and uses each returned score breakdown', () => {
    expect(options).toHaveLength(3);
    options.forEach((option) => expect(ArchitectureOption.safeParse(option).success).toBe(true));
    expect(dimensions.reduce((sum, dimension) => sum + dimension.weight, 0)).toBe(100);
    expect(weighted(options[0])).toBeGreaterThan(weighted(options[2]));

    const liveOption = { ...options[0], id: 'ARCH-LIVE-CUSTOM' };
    expect(weighted(liveOption)).toBe(weighted(options[0]));
  });

  it('creates a human-approved ADR from the returned selected option', () => {
    const adr = approve('ARCH-SERVERLESS');

    expect(adr.truthStatus).toBe('HUMAN_APPROVED');
    expect(adr.selectedOptionId).toBe('ARCH-SERVERLESS');
    expect(adr.rejectedAlternatives).toHaveLength(2);
    expect(adr.risks).toContain('Provider outage: Backoff, DLQ, and operator retry runbook');
  });

  it('derives exact offsets under the supplied source document id', () => {
    const source = 'Prefix exact quote suffix';
    const [span] = deriveSpans(source, [['S1', 'exact quote']], 'SRC-LIVE');

    expect(span).toMatchObject({
      documentId: 'SRC-LIVE',
      quote: 'exact quote',
      startOffset: 7,
      endOffset: 18,
    });
    expect(source.slice(span.startOffset, span.endOffset)).toBe(span.quote);
  });

  it('downgrades grounded evidence that is missing or not an exact verified quote', () => {
    const spans = [{ id: 'S1', quote: 'exact quote' }];

    expect(sourceEvidenceForQuote('exact quote', spans)).toHaveLength(1);
    expect(withVerifiedGrounding({ truthStatus: 'SOURCE_GROUNDED', sourceEvidence: [] }, spans).truthStatus)
      .toBe('AI_SUGGESTED');
    expect(withVerifiedGrounding({
      truthStatus: 'SOURCE_GROUNDED',
      sourceEvidence: [{ spanId: 'S1', quote: 'invented' }],
    }, spans).truthStatus).toBe('AI_SUGGESTED');
  });

  it('validates a mocked live structured response and links spans to the live source document', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const fixture = fixtureAnalysisResult({
      label: 'Demo fixture',
      providerName: 'fixture',
      modelName: 'fixture',
      mode: 'fixture',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      outcome: 'SUCCEEDED',
    });
    const client = {
      responses: {
        parse: vi.fn(async () => ({
          output_parsed: {
            productObjective: 'Live objective',
            findings: [{
              id: 'FR-LIVE-001',
              kind: 'FUNCTIONAL',
              text: 'Support email',
              truthStatus: 'SOURCE_GROUNDED',
              quote: 'support email and SMS',
              affectedEntityIds: [],
              severity: null,
              security: null,
              mitigation: null,
            }, ...fixture.gaps.map((gap) => ({
              id: gap.id,
              kind: 'GAP' as const,
              text: gap.title,
              truthStatus: 'UNKNOWN' as const,
              quote: null,
              affectedEntityIds: gap.affectedEntityIds,
              severity: gap.severity,
              security: gap.security,
              mitigation: null,
            }))],
            clarificationQuestions: fixture.clarificationQuestions.map((question) => ({
              ...question,
              truthStatus: 'AI_SUGGESTED',
              provenance: 'AI_SUGGESTED',
              answer: null,
            })),
            architectureOptions: fixture.architectureOptions,
          },
        })),
      },
    };

    const result = await new OpenAIProvider(client as never).analyze(brief);

    expect(result.run.label).toBe('Live AI');
    expect(result.functionalRequirements[0].sourceEvidence[0].quote).toBe('support email and SMS');
    expect(result.sourceSpans[0].documentId).toBe(result.sourceDocument.id);
  });

  it('does not silently substitute the fixture after a live provider failure', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const client = { responses: { parse: vi.fn(async () => { throw new Error('boom'); }) } };

    await expect(new OpenAIProvider(client as never).analyze(brief)).rejects.toThrow('boom');
  });

  it('rejects a live result with no gaps instead of inserting fixture gaps', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const fixture = fixtureAnalysisResult({
      label: 'Demo fixture',
      providerName: 'fixture',
      modelName: 'fixture',
      mode: 'fixture',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      outcome: 'SUCCEEDED',
    });
    const client = {
      responses: {
        parse: vi.fn(async () => ({
          output_parsed: {
            productObjective: 'Incomplete live result',
            findings: [{
              id: 'FR-LIVE-001',
              kind: 'FUNCTIONAL',
              text: 'Support email',
              truthStatus: 'SOURCE_GROUNDED',
              quote: 'support email and SMS',
              affectedEntityIds: [],
              severity: null,
              security: null,
              mitigation: null,
            }],
            clarificationQuestions: fixture.clarificationQuestions.map((question) => ({
              ...question,
              truthStatus: 'AI_SUGGESTED',
              provenance: 'AI_SUGGESTED',
              answer: null,
            })),
            architectureOptions: fixture.architectureOptions,
          },
        })),
      },
    };

    await expect(new OpenAIProvider(client as never).analyze(brief))
      .rejects.toThrow('no gaps; result rejected without fixture substitution');
  });
});
