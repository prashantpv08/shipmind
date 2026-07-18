import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.JIRA_BASE_URL;
  delete process.env.JIRA_EMAIL;
  delete process.env.JIRA_API_TOKEN;
  delete process.env.JIRA_PROJECT_KEY;
});

function approvedProjectFixture() {
  const now = '2026-07-18T10:00:00.000Z';
  return import('../src/projects/schemas').then(({ ArbDecision, DocumentApproval, Project, ProjectKnowledge }) => {
    const project = Project.parse({ id: 'PROJ-DELIVERY', workspaceId: 'WS-1', name: 'Claims workspace', status: 'HLD_READY', graphVersion: 3, createdAt: now, updatedAt: now });
    const architectureOptions = [0, 1, 2].map((index) => ({ id: `ARCH-${index}`, projectId: project.id, name: index === 0 ? 'Modular monolith' : `Alternative ${index}`, summary: 'Architecture option.', recommended: index === 0, why: ['Fits current delivery evidence.'], whyNot: ['Has a documented tradeoff.'], risks: ['Review scale assumptions.'], truthStatus: 'AI_SUGGESTED' as const }));
    const knowledge = ProjectKnowledge.parse({
      projectId: project.id, graphVersion: 3, summary: 'Claims operations product.',
      entities: [
        { id: 'REQ-001', projectId: project.id, category: 'REQUIREMENT', text: 'The system must allow an operator to review a claim.', truthStatus: 'SOURCE_GROUNDED', sourceId: 'SRC-1', quote: 'The system must allow an operator to review a claim.', startOffset: 0, endOffset: 55 },
        { id: 'NFR-001', projectId: project.id, category: 'NFR', text: 'P95 latency must remain below 500 ms.', truthStatus: 'SOURCE_GROUNDED', sourceId: 'SRC-1', quote: 'P95 latency must remain below 500 ms.', startOffset: 56, endOffset: 93 },
      ],
      architectureOptions, analyzedAt: now, analyzer: 'axiom-deterministic-grounded-v1',
    });
    const approval = DocumentApproval.parse({ id: 'DOCAPP-1', projectId: project.id, graphVersion: 3, documentHashes: { srs: 'a'.repeat(64) }, truthStatus: 'HUMAN_APPROVED', approvedAt: now });
    const decision = ArbDecision.parse({ id: 'ARB-1', projectId: project.id, optionId: architectureOptions[0].id, optionName: architectureOptions[0].name, rationale: architectureOptions[0].why, rejectedOptionIds: architectureOptions.slice(1).map((option) => option.id), risks: architectureOptions[0].risks, graphVersion: 3, version: 1, truthStatus: 'HUMAN_APPROVED', approvedAt: now });
    return { project, knowledge, approval, decision };
  });
}

describe('approved delivery planning', () => {
  it('compiles an epic, source-linked child stories, and a bounded coding packet', async () => {
    const { compileCodingTaskPacket, compileJiraBacklogPlan } = await import('../src/projects/delivery');
    const { JiraPublication } = await import('../src/projects/schemas');
    const fixture = await approvedProjectFixture();
    const plan = compileJiraBacklogPlan({ ...fixture, documentApproval: fixture.approval, generatedAt: '2026-07-18T10:01:00.000Z' });
    expect(plan.epic.summary).toContain('Claims workspace');
    expect(plan.stories).toEqual(expect.arrayContaining([
      expect.objectContaining({ localId: 'STORY-001', sourceEntityIds: ['ARB-1'] }),
      expect.objectContaining({ sourceEntityIds: ['REQ-001'], truthStatus: 'AI_SUGGESTED' }),
      expect.objectContaining({ sourceEntityIds: ['NFR-001'] }),
    ]));
    const publication = JiraPublication.parse({ id: 'JIRA-PUB-1', projectId: fixture.project.id, sourceGraphVersion: 3, planId: plan.id, planHash: plan.sha256, projectKey: 'AX', epicKey: 'AX-1', epicUrl: 'https://axiom.atlassian.net/browse/AX-1', stories: plan.stories.map((story, index) => ({ localId: story.localId, key: `AX-${index + 2}`, url: `https://axiom.atlassian.net/browse/AX-${index + 2}` })), createdAt: '2026-07-18T10:02:00.000Z' });
    const packet = compileCodingTaskPacket(plan, publication, 'STORY-002');
    expect(packet).toContain('## Approved scope');
    expect(packet).toContain('REQ-001');
    expect(packet).toContain('pnpm typecheck');
    expect(packet).toContain('write allowlist');
  });

  it('renders an honest Build Studio gate before generic repository execution is authorized', async () => {
    const [{ createElement }, { renderToStaticMarkup }, { CodingStudio }] = await Promise.all([
      import('react'),
      import('react-dom/server'),
      import('../app/_components/coding-studio'),
    ]);
    const fixture = await approvedProjectFixture();
    const { compileJiraBacklogPlan } = await import('../src/projects/delivery');
    const plan = compileJiraBacklogPlan({ ...fixture, documentApproval: fixture.approval, generatedAt: '2026-07-18T10:01:00.000Z' });
    const html = renderToStaticMarkup(createElement(CodingStudio, { codingPacket: '# Approved task', jiraKey: 'AX-2', story: plan.stories[0], onOpenExecutableSample: () => undefined }));
    expect(html).toContain('Axiom Build Studio');
    expect(html).toContain('Repository authorization required');
    expect(html).toContain('No coding process is running');
    expect(html).toContain('No simulated progress or fabricated command output');
  });

  it('reports Jira configuration without exposing credential values', async () => {
    process.env.JIRA_BASE_URL = 'https://axiom.atlassian.net';
    process.env.JIRA_EMAIL = 'developer@example.com';
    process.env.JIRA_API_TOKEN = 'test-secret-never-returned';
    const { jiraStatus } = await import('../src/integrations/jira');
    expect(jiraStatus()).toEqual({ configured: false, mode: 'jira-cloud-api-token', missing: ['JIRA_PROJECT_KEY'] });
    expect(JSON.stringify(jiraStatus())).not.toContain(process.env.JIRA_API_TOKEN);
  });

  it('verifies Jira credentials and project issue permissions without mutating Jira', async () => {
    process.env.JIRA_BASE_URL = 'https://axiom.atlassian.net';
    process.env.JIRA_EMAIL = 'developer@example.com';
    process.env.JIRA_API_TOKEN = 'test-secret-never-returned';
    process.env.JIRA_PROJECT_KEY = 'AX';
    const requests: Array<{ method: string; url: string }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push({ method: init?.method ?? 'GET', url });
      if (url.endsWith('/rest/api/3/myself')) return new Response(JSON.stringify({ displayName: 'Axiom Builder', emailAddress: 'private@example.com' }), { status: 200 });
      return new Response(JSON.stringify({ values: [{ id: '10000', name: 'Epic' }, { id: '10001', name: 'Story' }] }), { status: 200 });
    }));
    const { verifyJiraConnection } = await import('../src/integrations/jira');
    const status = await verifyJiraConnection();
    expect(status).toEqual(expect.objectContaining({ configured: true, connected: true, projectKey: 'AX', accountName: 'Axiom Builder', issueTypes: ['Epic', 'Story'] }));
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.method === 'GET')).toBe(true);
    expect(JSON.stringify(status)).not.toContain(process.env.JIRA_API_TOKEN);
    expect(JSON.stringify(status)).not.toContain('private@example.com');
  });

  it('creates the Jira epic first and then creates every story with that parent', async () => {
    process.env.JIRA_BASE_URL = 'https://axiom.atlassian.net';
    process.env.JIRA_EMAIL = 'developer@example.com';
    process.env.JIRA_API_TOKEN = 'test-secret-never-returned';
    process.env.JIRA_PROJECT_KEY = 'AX';
    const { compileJiraBacklogPlan } = await import('../src/projects/delivery');
    const { publishJiraBacklog } = await import('../src/integrations/jira');
    const fixture = await approvedProjectFixture();
    const plan = compileJiraBacklogPlan({ ...fixture, documentApproval: fixture.approval, generatedAt: '2026-07-18T10:01:00.000Z' });
    const requests: Array<{ method: string; url: string; body?: Record<string, unknown>; authorization?: string }> = [];
    let created = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push({ method: init?.method ?? 'GET', url, body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined, authorization: (init?.headers as Record<string, string> | undefined)?.authorization });
      if (url.includes('/createmeta/')) return new Response(JSON.stringify({ issueTypes: [{ id: '10000', name: 'Epic' }, { id: '10001', name: 'Story' }] }), { status: 200 });
      created += 1;
      return new Response(JSON.stringify({ id: String(created), key: `AX-${created}`, self: `${url}/AX-${created}` }), { status: 201 });
    }));
    const publication = await publishJiraBacklog(plan);
    expect(publication.epicKey).toBe('AX-1');
    expect(publication.stories).toHaveLength(plan.stories.length);
    const creates = requests.filter((request) => request.url.endsWith('/rest/api/3/issue'));
    expect(creates[0].body).not.toHaveProperty('fields.parent');
    for (const request of creates.slice(1)) expect(request.body).toHaveProperty('fields.parent.key', 'AX-1');
    expect(JSON.stringify(publication)).not.toContain(process.env.JIRA_API_TOKEN);
    expect(requests.every((request) => request.authorization?.startsWith('Basic '))).toBe(true);
  });
});
