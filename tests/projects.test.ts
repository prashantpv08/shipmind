import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('arbitrary project knowledge pipeline', () => {
  beforeEach(async () => {
    process.env.AXIOM_DATA_DIR = await mkdtemp(join(tmpdir(), 'axiom-projects-'));
    delete process.env.NOTION_ACCESS_TOKEN;
    delete process.env.NOTION_PARENT_PAGE_ID;
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.AXIOM_DATA_DIR;
    delete process.env.NOTION_ACCESS_TOKEN;
    delete process.env.NOTION_PARENT_PAGE_ID;
  });

  it('persists a source, creates exact grounded entities, and compiles versioned documents', async () => {
    const store = await import('../src/projects/store');
    const { persistUploadedSource } = await import('../src/projects/extract');
    const { analyzeProjectSources } = await import('../src/projects/analyze');
    const { compileHldDocument, compileProjectDocuments } = await import('../src/projects/documents');
    const { compileWireframeHandoff } = await import('../src/projects/wireframes');
    const { ArbDecision } = await import('../src/projects/schemas');

    const project = await store.createProject('Digital lending modernization');
    const content = 'Customers must submit a lending application. P95 latency must remain below 300 ms. The team agreed to use the approved regional cloud. Budget must remain below $1,000. What retention period applies?';
    const source = await persistUploadedSource({
      workspaceId: project.workspaceId,
      projectId: project.id,
      file: new File([content], 'brief.md', { type: 'text/markdown' }),
    });
    await store.addSources(project.id, [source]);

    const knowledge = analyzeProjectSources(project.id, 1, [source], '2026-07-17T12:00:00.000Z');
    await store.saveKnowledge(knowledge);
    expect(knowledge.entities).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'REQUIREMENT', truthStatus: 'SOURCE_GROUNDED', sourceId: source.id }),
      expect.objectContaining({ category: 'NFR', truthStatus: 'SOURCE_GROUNDED' }),
      expect.objectContaining({ category: 'DECISION', truthStatus: 'SOURCE_GROUNDED' }),
      expect.objectContaining({ category: 'CONSTRAINT', truthStatus: 'SOURCE_GROUNDED' }),
      expect.objectContaining({ category: 'OPEN_QUESTION', truthStatus: 'SOURCE_GROUNDED' }),
    ]));
    for (const entity of knowledge.entities.filter((item) => item.truthStatus === 'SOURCE_GROUNDED')) {
      expect(source.extractedText.slice(entity.startOffset, entity.endOffset)).toBe(entity.quote);
    }

    const documents = compileProjectDocuments({ project: { ...project, graphVersion: 1, status: 'ANALYZED' }, knowledge, sources: [source], generatedAt: '2026-07-17T12:01:00.000Z' });
    await store.saveDocuments(project.id, documents);
    expect(documents.map((document) => document.type)).toEqual(['requirements', 'srs', 'nfr', 'hld']);
    expect(documents.every((document) => document.version === 1 && document.sourceGraphVersion === 1)).toBe(true);
    expect(documents.find((document) => document.type === 'srs')?.content).toContain(source.id);
    expect(documents.find((document) => document.type === 'hld')?.content).toContain('sequenceDiagram');
    expect((await store.getProject(project.id))?.documents).toHaveLength(4);

    const selected = knowledge.architectureOptions[0];
    const decision = ArbDecision.parse({
      id: 'ARB-TEST-001', projectId: project.id, optionId: selected.id, optionName: selected.name,
      rationale: selected.why, rejectedOptionIds: knowledge.architectureOptions.slice(1).map((option) => option.id),
      risks: selected.risks, graphVersion: 1, version: 1, truthStatus: 'HUMAN_APPROVED', approvedAt: '2026-07-17T12:02:00.000Z',
    });
    await store.saveArbDecision(decision);
    const hld = compileHldDocument({ project: { ...project, graphVersion: 1, status: 'ARB_APPROVED' }, knowledge, decision, previousDocuments: documents, generatedAt: '2026-07-17T12:03:00.000Z' });
    await store.saveDocuments(project.id, [hld]);
    expect(hld.content).toContain(`Selected option: ${selected.name}`);
    expect(hld.content).toContain('HUMAN_APPROVED');
    const wireframe = compileWireframeHandoff({ project: { ...project, graphVersion: 1, status: 'HLD_READY' }, knowledge, decision, hld, generatedAt: '2026-07-17T12:04:00.000Z' });
    expect(wireframe.screens).toHaveLength(4);
    expect(wireframe.truthStatus).toBe('AI_SUGGESTED');
    expect(wireframe.groundedStatements.map((statement) => statement.entityId)).toEqual(expect.arrayContaining(knowledge.entities.filter((entity) => entity.truthStatus === 'SOURCE_GROUNDED').map((entity) => entity.id)));
    expect(wireframe.assumptions.join(' ')).toContain('design hypotheses');
    expect(wireframe.hldDocumentId).toBe(hld.id);
    expect((await store.getProject(project.id))?.project.status).toBe('HLD_READY');
  });

  it('stores unsupported files as failed evidence instead of inventing extracted text', async () => {
    const store = await import('../src/projects/store');
    const { persistUploadedSource } = await import('../src/projects/extract');
    const project = await store.createProject('Unsupported source test');
    const source = await persistUploadedSource({
      workspaceId: project.workspaceId,
      projectId: project.id,
      file: new File([new Uint8Array([0, 1, 2])], 'diagram.bin', { type: 'application/octet-stream' }),
    });

    expect(source.status).toBe('FAILED');
    expect(source.extractedText).toBe('');
    expect(source.extractionError).toContain('Unsupported source type');
  });

  it('reports missing Notion configuration without exposing secret values', async () => {
    const { notionStatus } = await import('../src/integrations/notion');
    expect(notionStatus()).toEqual({
      configured: false,
      mode: 'internal-connection',
      missing: ['NOTION_ACCESS_TOKEN', 'NOTION_PARENT_PAGE_ID'],
    });
  });

  it('publishes sources and generated documents to Notion and returns an idempotent publication', async () => {
    process.env.NOTION_ACCESS_TOKEN = 'test-secret-never-returned';
    process.env.NOTION_PARENT_PAGE_ID = 'parent-page';
    const { publishProjectToNotion } = await import('../src/integrations/notion');
    const store = await import('../src/projects/store');
    const { analyzeProjectSources } = await import('../src/projects/analyze');
    const { compileProjectDocuments } = await import('../src/projects/documents');
    const { persistUploadedSource } = await import('../src/projects/extract');
    const project = await store.createProject('Notion publication');
    const source = await persistUploadedSource({ workspaceId: project.workspaceId, projectId: project.id, file: new File(['The service must retain audit records.'], 'brief.txt', { type: 'text/plain' }) });
    const knowledge = analyzeProjectSources(project.id, 1, [source]);
    const currentProject = { ...project, graphVersion: 1, status: 'ANALYZED' as const };
    const documents = compileProjectDocuments({ project: currentProject, knowledge, sources: [source] });
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      call += 1;
      return new Response(JSON.stringify({ id: `page-${call}`, url: `https://notion.so/page-${call}` }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));

    const publication = await publishProjectToNotion({ project: currentProject, sources: [source], documents, knowledge });
    expect(call).toBeGreaterThanOrEqual(6);
    expect(publication.projectPageUrl).toBe('https://notion.so/page-1');
    expect(JSON.stringify(publication)).not.toContain(process.env.NOTION_ACCESS_TOKEN);
    const callsBeforeRepeat = call;
    const repeated = await publishProjectToNotion({ project: currentProject, sources: [source], documents, knowledge, previousPublication: publication });
    expect(repeated).toEqual(publication);
    expect(call).toBe(callsBeforeRepeat);
  });
});

describe('project intelligence and governed design', () => {
  it('creates ranked gaps, contextual clarifications, readiness, and architecture detail', async () => {
    const { analyzeProjectSources } = await import('../src/projects/analyze');
    const { ProjectSource } = await import('../src/projects/schemas');
    const source = ProjectSource.parse({
      id: 'SRC-INTELLIGENCE', workspaceId: 'WS-1', projectId: 'PROJ-INTELLIGENCE', name: 'brief.md', kind: 'FILE', mimeType: 'text/markdown', size: 96,
      sha256: 'a'.repeat(64), rawPath: '/tmp/brief.md', status: 'EXTRACTED', createdAt: '2026-07-18T10:00:00.000Z',
      extractedText: 'Customers must submit an application. P95 latency must remain below 300 ms. The service must retain an audit record.',
    });
    const knowledge = analyzeProjectSources('PROJ-INTELLIGENCE', 1, [source], '2026-07-18T10:01:00.000Z', 'Lending review');
    expect(knowledge.gaps.length).toBeGreaterThanOrEqual(5);
    expect(knowledge.clarificationQuestions.length).toBeGreaterThanOrEqual(3);
    expect(knowledge.clarificationQuestions.length).toBeLessThanOrEqual(5);
    expect(knowledge.readiness?.openBlockerIds.length).toBeGreaterThan(0);
    expect(knowledge.techStack).toHaveLength(7);
    expect(knowledge.architectureOptions).toEqual(expect.arrayContaining([
      expect.objectContaining({ recommended: true, components: expect.any(Array), dataFlows: expect.any(Array), technologies: expect.any(Array), failureModes: expect.any(Array), reconsiderationTriggers: expect.any(Array) }),
    ]));
  });

  it('records human answers in the graph and deterministically removes blocker caps', async () => {
    const { analyzeProjectSources } = await import('../src/projects/analyze');
    const { applyClarificationAnswer } = await import('../src/projects/intelligence');
    const { ProjectSource } = await import('../src/projects/schemas');
    const source = ProjectSource.parse({
      id: 'SRC-ANSWERS', workspaceId: 'WS-1', projectId: 'PROJ-ANSWERS', name: 'brief.txt', kind: 'FILE', mimeType: 'text/plain', size: 44,
      sha256: 'b'.repeat(64), rawPath: '/tmp/brief.txt', status: 'EXTRACTED', createdAt: '2026-07-18T10:00:00.000Z', extractedText: 'The product must support an approval workflow.',
    });
    let knowledge = analyzeProjectSources('PROJ-ANSWERS', 1, [source], '2026-07-18T10:01:00.000Z', 'Approval product');
    const initialScore = knowledge.readiness?.score ?? 0;
    const blockerQuestionIds = knowledge.clarificationQuestions
      .filter((question) => knowledge.gaps.some((gap) => gap.id === question.gapId && gap.severity === 'BLOCKER'))
      .map((question) => question.id);
    for (const [index, questionId] of blockerQuestionIds.entries()) {
      knowledge = applyClarificationAnswer({ knowledge, questionId, answer: `Confirmed decision ${index + 1}`, answeredAt: `2026-07-18T10:0${index + 2}:00.000Z` });
    }
    expect(knowledge.readiness?.openBlockerIds).toEqual([]);
    expect(knowledge.readiness?.score).toBeGreaterThan(initialScore);
    expect(knowledge.entities).toEqual(expect.arrayContaining([expect.objectContaining({ truthStatus: 'HUMAN_CONFIRMED', clarificationQuestionId: expect.any(String) })]));
  });

  it('migrates legacy decision-shaped clarification answers exactly once', async () => {
    const { analyzeProjectSources } = await import('../src/projects/analyze');
    const { applyClarificationAnswer, migrateLegacyClarificationAnswers } = await import('../src/projects/intelligence');
    const { ProjectKnowledge, ProjectSource } = await import('../src/projects/schemas');
    const source = ProjectSource.parse({
      id: 'SRC-LEGACY-ANSWER', workspaceId: 'WS-1', projectId: 'PROJ-LEGACY-ANSWER', name: 'brief.txt', kind: 'FILE', mimeType: 'text/plain', size: 44,
      sha256: 'e'.repeat(64), rawPath: '/tmp/brief.txt', status: 'EXTRACTED', createdAt: '2026-07-18T10:00:00.000Z', extractedText: 'The product must support an approval workflow.',
    });
    const initial = analyzeProjectSources(source.projectId, 1, [source], '2026-07-18T10:01:00.000Z', 'Legacy interview project');
    const question = initial.clarificationQuestions[0];
    const legacyAnswer = 'Administrators approve; members create and view their own records.';
    const answered = applyClarificationAnswer({ knowledge: initial, questionId: question.id, answer: legacyAnswer, answeredAt: '2026-07-18T10:02:00.000Z' });
    const legacy = ProjectKnowledge.parse({
      ...answered,
      entities: answered.entities.map((entity) => entity.clarificationQuestionId === question.id ? { ...entity, category: 'DECISION', text: `${question.question} Answer: ${legacyAnswer}` } : entity),
    });

    const migration = migrateLegacyClarificationAnswers({ knowledge: legacy, migratedAt: '2026-07-19T10:00:00.000Z' });
    expect(migration.migrated).toBe(true);
    expect(migration.knowledge.graphVersion).toBe(legacy.graphVersion + 1);
    expect(migration.knowledge.entities.find((entity) => entity.clarificationQuestionId === question.id)).toEqual(expect.objectContaining({
      category: 'REQUIREMENT',
      truthStatus: 'HUMAN_CONFIRMED',
      text: expect.stringContaining('Human-confirmed answer:'),
    }));

    const repeated = migrateLegacyClarificationAnswers({ knowledge: migration.knowledge, migratedAt: '2026-07-19T10:01:00.000Z' });
    expect(repeated.migrated).toBe(false);
    expect(repeated.knowledge.graphVersion).toBe(migration.knowledge.graphVersion);
  });

  it('classifies clarification answers and regenerates every document at each graph version', async () => {
    const { analyzeProjectSources } = await import('../src/projects/analyze');
    const { compileProjectDocuments } = await import('../src/projects/documents');
    const { applyClarificationAnswer } = await import('../src/projects/intelligence');
    const { Project, ProjectSource } = await import('../src/projects/schemas');
    const project = Project.parse({ id: 'PROJ-REGEN', workspaceId: 'WS-1', name: 'Interview project', status: 'ANALYZED', graphVersion: 1, createdAt: '2026-07-18T10:00:00.000Z', updatedAt: '2026-07-18T10:00:00.000Z' });
    const source = ProjectSource.parse({
      id: 'SRC-REGEN', workspaceId: 'WS-1', projectId: project.id, name: 'interview.txt', kind: 'MEETING_TRANSCRIPT', mimeType: 'text/plain', size: 320,
      sha256: 'd'.repeat(64), rawPath: '/tmp/interview.txt', status: 'EXTRACTED', createdAt: '2026-07-18T10:00:00.000Z',
      extractedText: 'Administrators have roles and permissions. Personal data uses retention and encryption. An external API is the system of record. P95 latency is below 500 ms with an availability target. Failures retry with recovery. Records have lifecycle states and audit history. Acceptance criteria require product sign-off.',
    });
    let knowledge = analyzeProjectSources(project.id, 1, [source], '2026-07-18T10:01:00.000Z', project.name);
    let documents = compileProjectDocuments({ project, knowledge, sources: [source], generatedAt: '2026-07-18T10:02:00.000Z' });
    const answersByCategory = {
      DELIVERY: 'A four-person TypeScript team must deliver by 30 September on managed cloud and own weekday support.',
      FUNCTIONAL_SCOPE: 'Administrators create and approve interviews; recruiters create and update interviews; candidates only view and respond to their own interview.',
      SECURITY_PRIVACY: 'Interview responses contain personal data, are restricted to recruiters and administrators, and are retained for 90 days.',
      INTEGRATION: 'The first release integrates with one synchronous HR system, which owns candidate records.',
      NFR: 'Peak 100 requests/second, p95 response time under 500 ms, 99.9% availability, RTO 1 hour, RPO 15 minutes, and USD 2,000/month.',
    } as const;

    for (const [index, question] of [...knowledge.clarificationQuestions].entries()) {
      const category = knowledge.gaps.find((gap) => gap.id === question.gapId)?.category;
      expect(category).toBeDefined();
      const answer = answersByCategory[category as keyof typeof answersByCategory];
      expect(answer).toBeDefined();
      knowledge = applyClarificationAnswer({ knowledge, questionId: question.id, answer, answeredAt: `2026-07-18T10:${String(index + 3).padStart(2, '0')}:00.000Z` });
      documents = compileProjectDocuments({ project: { ...project, graphVersion: knowledge.graphVersion }, knowledge, sources: [source], previousDocuments: documents, generatedAt: `2026-07-18T10:${String(index + 3).padStart(2, '0')}:30.000Z` });
      expect(documents.map((document) => document.type)).toEqual(['requirements', 'srs', 'nfr', 'hld']);
      expect(documents.every((document) => document.sourceGraphVersion === knowledge.graphVersion && document.version === index + 2)).toBe(true);
    }

    expect(knowledge.clarificationQuestions.every((question) => question.status === 'ANSWERED')).toBe(true);
    expect(knowledge.entities).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'REQUIREMENT', truthStatus: 'HUMAN_CONFIRMED' }),
      expect.objectContaining({ category: 'NFR', truthStatus: 'HUMAN_CONFIRMED' }),
      expect.objectContaining({ category: 'CONSTRAINT', truthStatus: 'HUMAN_CONFIRMED' }),
    ]));
    const requirements = documents.find((document) => document.type === 'requirements')?.content ?? '';
    const srs = documents.find((document) => document.type === 'srs')?.content ?? '';
    const nfr = documents.find((document) => document.type === 'nfr')?.content ?? '';
    const hld = documents.find((document) => document.type === 'hld')?.content ?? '';
    expect(requirements).not.toContain('| UNKNOWN | UNKNOWN | No items extracted');
    expect(requirements).not.toContain('## Constraints\n- **UNKNOWN**');
    expect(srs).not.toContain('### Constraints\n- **UNKNOWN**');
    expect(nfr).toContain('| p95 latency | < 500 | ms |');
    expect(nfr).toContain(answersByCategory.DELIVERY);
    expect(hld).toContain(answersByCategory.DELIVERY);
  });

  it('returns the same actionable 2,000-character message for guided text fields', async () => {
    const { ReviseDocumentRequest } = await import('../src/projects/schemas');
    const { GUIDED_TEXT_LIMIT_MESSAGE } = await import('../src/projects/validation');
    const parsed = ReviseDocumentRequest.safeParse({ section: 'Executive summary', instruction: 'x'.repeat(2_001) });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toBe(GUIDED_TEXT_LIMIT_MESSAGE);
  });

  it('compiles detailed artifacts and a template-specific traceable wireframe handoff', async () => {
    const { analyzeProjectSources } = await import('../src/projects/analyze');
    const { compileArchitectureDocuments, compileProjectDocuments } = await import('../src/projects/documents');
    const { compileWireframeHandoff } = await import('../src/projects/wireframes');
    const { ArbDecision, Project, ProjectSource } = await import('../src/projects/schemas');
    const project = Project.parse({ id: 'PROJ-DOCS', workspaceId: 'WS-1', name: 'Customer workspace', status: 'ANALYZED', graphVersion: 1, createdAt: '2026-07-18T10:00:00.000Z', updatedAt: '2026-07-18T10:00:00.000Z' });
    const source = ProjectSource.parse({ id: 'SRC-DOCS', workspaceId: 'WS-1', projectId: project.id, name: 'brief.md', kind: 'FILE', mimeType: 'text/markdown', size: 68, sha256: 'c'.repeat(64), rawPath: '/tmp/brief.md', status: 'EXTRACTED', createdAt: '2026-07-18T10:00:00.000Z', extractedText: 'Members must manage workspace records. P95 latency must remain below 300 ms.' });
    const knowledge = analyzeProjectSources(project.id, 1, [source], '2026-07-18T10:01:00.000Z', project.name);
    const baseDocuments = compileProjectDocuments({ project, knowledge, sources: [source], generatedAt: '2026-07-18T10:02:00.000Z' });
    const srs = baseDocuments.find((document) => document.type === 'srs');
    const nfr = baseDocuments.find((document) => document.type === 'nfr');
    expect(srs?.content).toContain('## 12. Open items');
    expect(srs?.content).toContain('## 10. Acceptance criteria');
    expect(nfr?.content).toContain('| p95 latency | < 300 | ms |');
    const selected = knowledge.architectureOptions[0];
    const decision = ArbDecision.parse({ id: 'ARB-DOCS', projectId: project.id, optionId: selected.id, optionName: selected.name, rationale: selected.why, rejectedOptionIds: knowledge.architectureOptions.slice(1).map((option) => option.id), risks: selected.risks, graphVersion: 1, version: 1, truthStatus: 'HUMAN_APPROVED', approvedAt: '2026-07-18T10:03:00.000Z' });
    const architectureDocuments = compileArchitectureDocuments({ project, knowledge, decision, previousDocuments: baseDocuments, generatedAt: '2026-07-18T10:04:00.000Z' });
    const hld = architectureDocuments.find((document) => document.type === 'hld');
    const adr = architectureDocuments.find((document) => document.type === 'adr');
    expect(hld?.content).toContain('## 12. Deployment view');
    expect(adr?.truthStatus).toBe('HUMAN_APPROVED');
    const handoff = compileWireframeHandoff({ project, knowledge, decision, hld: hld!, templateId: 'saas-admin', generatedAt: '2026-07-18T10:05:00.000Z' });
    expect(handoff.templateName).toBe('SaaS administration');
    expect(handoff.screens).toHaveLength(4);
    expect(handoff.flows).toHaveLength(3);
    expect(handoff.screens[0].requiredStates).toContain('FAILURE');
  });

  it('converts detailed markdown tables into native Notion table blocks', async () => {
    const { markdownBlocks } = await import('../src/integrations/notion');
    const blocks = markdownBlocks('# Summary\n\n| Field | Value |\n|---|---|\n| Readiness | 62/100 |');
    expect(blocks).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'table' })]));
  });

  it('chunks formatted Notion rich text and renders Mermaid fences as SVG image uploads', async () => {
    process.env.NOTION_ACCESS_TOKEN = 'test-secret-never-returned';
    process.env.NOTION_PARENT_PAGE_ID = 'parent-page';
    const { markdownBlocks, publishProjectToNotion } = await import('../src/integrations/notion');
    const { renderMermaidDiagramSvg, splitNotionMermaid } = await import('../src/integrations/notion-diagrams');
    const { Project, ProjectDocument, ProjectKnowledge } = await import('../src/projects/schemas');
    const longBold = `**${'x'.repeat(4_809)}**`;
    const richText = ((markdownBlocks(longBold)[0] as { paragraph: { rich_text: Array<{ text: { content: string } }> } }).paragraph.rich_text);
    expect(richText.every((item) => item.text.content.length <= 2_000)).toBe(true);
    expect(richText.map((item) => item.text.content).join('')).toHaveLength(4_809);

    const content = '# HLD\n\n### System context diagram\n```mermaid\nflowchart LR\n  User["Product user"] --> App["Axiom"]\n```';
    expect(splitNotionMermaid(content)).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'diagram', title: 'System context diagram' })]));
    expect(renderMermaidDiagramSvg('System context diagram', 'flowchart LR\nUser["Product user"] --> App["Axiom"]')).toContain('<svg');

    const project = Project.parse({ id: 'PROJ-NOTION-DIAGRAM', workspaceId: 'WS-1', name: 'Diagram project', status: 'HLD_READY', graphVersion: 1, createdAt: '2026-07-18T10:00:00.000Z', updatedAt: '2026-07-18T10:00:00.000Z' });
    const knowledge = ProjectKnowledge.parse({ projectId: project.id, graphVersion: 1, summary: 'Diagram publication.', entities: [], gaps: [], clarificationQuestions: [], architectureOptions: [0, 1, 2].map((index) => ({ id: `ARCH-${index}`, projectId: project.id, name: `Option ${index}`, summary: 'Option.', recommended: index === 0, why: ['Fit.'], whyNot: ['Tradeoff.'], risks: ['Risk.'], truthStatus: 'AI_SUGGESTED' })), analyzedAt: '2026-07-18T10:00:00.000Z', analyzer: 'axiom-deterministic-grounded-v1' });
    const document = ProjectDocument.parse({ id: 'DOC-HLD-DIAGRAM', projectId: project.id, type: 'hld', version: 1, sourceGraphVersion: 1, title: 'High-Level Design', content, sha256: 'f'.repeat(64), truthStatus: 'HUMAN_APPROVED', generatedAt: '2026-07-18T10:00:00.000Z' });
    const requests: Array<{ url: string; body: unknown }> = [];
    let page = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, body: init?.body });
      if (url.endsWith('/file_uploads')) return new Response(JSON.stringify({ id: 'upload-1', upload_url: 'https://api.notion.com/v1/file_uploads/upload-1/send' }), { status: 200, headers: { 'content-type': 'application/json' } });
      if (url.endsWith('/send')) return new Response(JSON.stringify({ id: 'upload-1', status: 'uploaded' }), { status: 200, headers: { 'content-type': 'application/json' } });
      page += 1;
      return new Response(JSON.stringify({ id: `page-${page}`, url: `https://notion.so/page-${page}` }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    await publishProjectToNotion({ project, sources: [], documents: [document], knowledge });
    expect(requests.some((request) => request.url.endsWith('/file_uploads'))).toBe(true);
    const pageBodies = requests.filter((request) => request.url.endsWith('/pages')).map((request) => JSON.stringify(request.body));
    expect(pageBodies.some((body) => body.includes('file_upload') && body.includes('upload-1'))).toBe(true);
    expect(pageBodies.every((body) => !body.includes('```mermaid'))).toBe(true);
  });

  it('creates a validated AI-assisted section revision without losing document provenance', async () => {
    const { reviseDocument, documentSections } = await import('../src/projects/revise-document');
    const { ProjectDocument } = await import('../src/projects/schemas');
    const content = '# SRS\n\n## 1. Scope\nOriginal grounded scope.\n\n## 2. Acceptance\nOriginal acceptance criteria.';
    const document = ProjectDocument.parse({
      id: 'DOC-SRS-TEST', projectId: 'PROJ-REVISION', type: 'srs', version: 1, sourceGraphVersion: 1, title: 'Software Requirements Specification', content,
      sha256: 'd'.repeat(64), truthStatus: 'AI_SUGGESTED', generatedAt: '2026-07-18T10:00:00.000Z',
    });
    const revision = await reviseDocument({ document, section: '2. Acceptance', instruction: 'Add explicit failure acceptance criteria.', entities: [], generatedAt: '2026-07-18T10:01:00.000Z' });
    expect(documentSections(content).map((section) => section.heading)).toEqual(['1. Scope', '2. Acceptance']);
    expect(revision.document.version).toBe(2);
    expect(revision.document.parentVersion).toBe(1);
    expect(revision.document.revisionProvider).toBe('axiom-fixture');
    expect(revision.document.content).toContain('Add explicit failure acceptance criteria.');
    expect(revision.document.content).toContain('Original grounded scope.');
  });

  it('supports document-approved wireframes, contextual answers, twelve templates, and project deletion', async () => {
    process.env.AXIOM_DATA_DIR = await mkdtemp(join(tmpdir(), 'axiom-project-controls-'));
    vi.resetModules();
    const store = await import('../src/projects/store');
    const { analyzeProjectSources } = await import('../src/projects/analyze');
    const { answerArchitectureQuestion } = await import('../src/projects/architecture-answer');
    const { compileProjectDocuments } = await import('../src/projects/documents');
    const { compileWireframeHandoff } = await import('../src/projects/wireframes');
    const { WIREFRAME_TEMPLATES } = await import('../src/projects/wireframe-templates');
    const { DocumentApproval, ProjectSource } = await import('../src/projects/schemas');
    const project = await store.createProject('AI operations console');
    const source = ProjectSource.parse({ id: 'SRC-APPROVAL', workspaceId: project.workspaceId, projectId: project.id, name: 'brief.md', kind: 'FILE', mimeType: 'text/markdown', size: 60, sha256: 'e'.repeat(64), rawPath: join(process.env.AXIOM_DATA_DIR!, 'missing-source.md'), status: 'EXTRACTED', createdAt: '2026-07-18T10:00:00.000Z', extractedText: 'Operators must review AI workflow failures and retry background jobs.' });
    await store.addSources(project.id, [source]);
    const knowledge = analyzeProjectSources(project.id, 1, [source], '2026-07-18T10:01:00.000Z', project.name);
    await store.saveKnowledge(knowledge);
    const currentProject = { ...project, graphVersion: 1, status: 'ANALYZED' as const };
    const documents = compileProjectDocuments({ project: currentProject, knowledge, sources: [source], generatedAt: '2026-07-18T10:02:00.000Z' });
    await store.saveDocuments(project.id, documents);
    const approval = DocumentApproval.parse({ id: 'DOCAPP-TEST', projectId: project.id, graphVersion: 1, documentHashes: Object.fromEntries(documents.map((document) => [document.type, document.sha256])), truthStatus: 'HUMAN_APPROVED', approvedAt: '2026-07-18T10:03:00.000Z' });
    await store.saveDocumentApproval(approval);
    const hld = documents.find((document) => document.type === 'hld')!;
    const handoff = compileWireframeHandoff({ project: currentProject, knowledge, documentApproval: approval, hld, templateId: 'ai-copilot' });
    const answer = answerArchitectureQuestion({ knowledge, question: 'What fails and how do we recover?' });
    expect(WIREFRAME_TEMPLATES).toHaveLength(12);
    expect(handoff.documentApprovalId).toBe(approval.id);
    expect(handoff.templateName).toBe('AI copilot');
    expect(answer.answer).toContain('Mitigation:');
    expect(await store.deleteProject(project.id)).toBe(true);
    expect(await store.getProject(project.id)).toBeNull();
    delete process.env.AXIOM_DATA_DIR;
  });
});
