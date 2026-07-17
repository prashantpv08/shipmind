import { describe, expect, it } from 'vitest';
import { POST } from '../app/api/artifacts/route';
import { compileArtifactPack, OpenApiDocument } from '../src/artifacts/compile';
import { answerQuestion, approve, fixtureAnalysisResult } from '../src/domain/day2';
import { AnalysisResult, ArtifactPack } from '../src/domain/schemas';

const generatedAt = '2026-07-17T12:00:00.000Z';

function approvedInput() {
  const initial = fixtureAnalysisResult({
    label: 'Demo fixture',
    providerName: 'notifyflow-day2-fixture',
    modelName: 'notifyflow-day2-fixture',
    mode: 'fixture',
    startedAt: generatedAt,
    completedAt: generatedAt,
    outcome: 'SUCCEEDED',
  });
  let questions = initial.clarificationQuestions;
  for (const question of questions) {
    questions = answerQuestion(questions, question.id, question.options[0].value, question.options[0].id);
  }
  const analysis = AnalysisResult.parse({
    ...initial,
    clarificationQuestions: questions,
    graphVersion: initial.graphVersion + questions.length,
  });
  return {
    analysis,
    decision: approve('ARCH-SERVERLESS', analysis.architectureOptions, analysis.graphVersion),
  };
}

describe('artifact compiler', () => {
  it('compiles nine validated, hashed artifacts and every required constitution category', () => {
    const pack = compileArtifactPack(approvedInput(), generatedAt);

    expect(ArtifactPack.safeParse(pack).success).toBe(true);
    expect(pack.artifacts).toHaveLength(9);
    expect(new Set(pack.artifacts.map((artifact) => artifact.type)).size).toBe(9);
    expect(pack.artifacts.every((artifact) => artifact.sourceGraphVersion === pack.sourceGraphVersion)).toBe(true);
    expect(pack.artifacts.every((artifact) => /^sha256:[a-f0-9]{64}$/.test(artifact.hash))).toBe(true);
    expect(new Set(pack.constitution.rules.map((rule) => rule.category))).toEqual(new Set([
      'architecture', 'quality', 'security', 'testing', 'performance', 'accessibility', 'deployment', 'cost', 'delivery',
    ]));
  });

  it('emits required document sections without claiming unexecuted evidence', () => {
    const pack = compileArtifactPack(approvedInput(), generatedAt);
    const srs = pack.artifacts.find((artifact) => artifact.type === 'srs')?.content ?? '';
    const nfr = pack.artifacts.find((artifact) => artifact.type === 'nfr')?.content ?? '';
    const hld = pack.artifacts.find((artifact) => artifact.type === 'hld')?.content ?? '';
    const adr = pack.artifacts.find((artifact) => artifact.type === 'adr')?.content ?? '';
    const testStrategy = pack.artifacts.find((artifact) => artifact.type === 'test-strategy')?.content ?? '';
    const backlog = pack.artifacts.find((artifact) => artifact.type === 'backlog')?.content ?? '';
    const codexTask = pack.artifacts.find((artifact) => artifact.type === 'codex-task')?.content ?? '';

    for (const heading of ['## Document control', '## Purpose and scope', '## Product overview', '## Actors and assumptions', '## Functional requirements', '## Non-functional requirements', '## Acceptance criteria', '## Traceability references']) {
      expect(srs).toContain(heading);
    }
    for (const field of ['Category', 'Metric', 'Target', 'Unit', 'Rationale', 'Verification method', 'Evidence']) expect(nfr).toContain(field);
    for (const heading of ['## System context', '## Selected architecture', '## Components and responsibilities', '## Data flow', '## Data stores', '## Risks', '## Reconsideration triggers']) expect(hld).toContain(heading);
    for (const heading of ['## Context', '## Decision question', '## Selected option', '## Alternatives considered and why not', '## Verification expectations', '## Approval']) expect(adr).toContain(heading);
    for (const heading of ['## Unit tests', '## API tests', '## Contract tests', '## Performance tests', '## Security checks', '## Accessibility checks', '## Requirement mapping']) expect(testStrategy).toContain(heading);
    expect(backlog).toContain('## Selected for build');
    for (const heading of ['## Scope', '## Required files', '## Approved constitution context', '## Acceptance criteria', '## Definition of done']) expect(codexTask).toContain(heading);
    expect(testStrategy).toContain('Performance execution: UNKNOWN');
    expect(testStrategy).not.toMatch(/tests? pass(?:ed)?/i);
  });

  it('emits a valid OpenAPI 3.1 contract for the controlled vertical slice', () => {
    const pack = compileArtifactPack(approvedInput(), generatedAt);
    const content = pack.artifacts.find((artifact) => artifact.type === 'openapi')?.content ?? '';
    const document = OpenApiDocument.parse(JSON.parse(content));

    expect(document.paths['/notifications'].post.operationId).toBe('createNotification');
    expect(document.paths['/notifications/{id}'].get.operationId).toBe('getNotification');
    expect(document.paths['/notifications'].post.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Idempotency-Key' }),
      expect.objectContaining({ name: 'X-Correlation-ID' }),
    ]));
    expect(document.components.schemas.Notification).toMatchObject({
      properties: { status: { enum: ['accepted', 'queued', 'sending', 'delivered', 'failed'] } },
    });
    expect(document['x-axiom-metadata'].compiledView).toBe(true);
  });

  it('preserves stable IDs and increments versions during regeneration', () => {
    const input = approvedInput();
    const first = compileArtifactPack(input, generatedAt);
    const second = compileArtifactPack({ ...input, previousPack: first }, '2026-07-17T12:05:00.000Z');

    expect(second.constitution.id).toBe(first.constitution.id);
    expect(second.constitution.version).toBe(2);
    expect(second.artifacts.map((artifact) => artifact.id)).toEqual(first.artifacts.map((artifact) => artifact.id));
    expect(second.artifacts.every((artifact) => artifact.version === 2)).toBe(true);
  });

  it('rejects stale and graph-mismatched decisions', () => {
    const input = approvedInput();

    expect(() => compileArtifactPack({ ...input, decision: { ...input.decision, stale: true } }, generatedAt))
      .toThrow('Stale ADR must be re-approved');
    expect(() => compileArtifactPack({ ...input, decision: { ...input.decision, graphVersion: 1 } }, generatedAt))
      .toThrow('ADR graph version must match');
  });
});

describe('artifact route', () => {
  it('rejects invalid JSON and stale decisions', async () => {
    const invalidJson = await POST(new Request('http://x/api/artifacts', { method: 'POST', body: '{' }));
    expect(invalidJson.status).toBe(400);

    const input = approvedInput();
    const stale = await POST(new Request('http://x/api/artifacts', {
      method: 'POST',
      body: JSON.stringify({ ...input, decision: { ...input.decision, stale: true } }),
    }));
    expect(stale.status).toBe(400);
    await expect(stale.json()).resolves.toMatchObject({ error: 'Stale ADR must be re-approved before artifact generation' });
  });

  it('returns a schema-valid pack for an approved decision', async () => {
    const response = await POST(new Request('http://x/api/artifacts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(approvedInput()),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(ArtifactPack.safeParse(body).success).toBe(true);
  });
});
