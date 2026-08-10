import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({ requestPlatform: mocks.requestPlatform, safeRequestId: (value: string | null) => value ?? 'architecture-request-id' }));

import { POST as approveArchitecture } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/architecture/decisions/route';
import { POST as generateArchitecture } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/architecture/generations/route';

const hashes = { requirements: 'a'.repeat(64), srs: 'b'.repeat(64), nfr: 'c'.repeat(64) };
const project = { id: 'PROJ-ONE', workspaceId: 'WS-ONE', name: 'Product One', status: 'DESIGN_READY', graphVersion: 3, rowVersion: 7, archivedAt: null, createdAt: '2026-07-23T00:00:00.000Z', updatedAt: '2026-07-24T00:00:00.000Z' };

function option(profile: 'LEAN' | 'BALANCED' | 'DISTRIBUTED', index: number) {
  const id = `ARCHOPT-ONE-${profile}`;
  return {
    id, generationId: 'ARCHGEN-ONE', projectId: 'PROJ-ONE', graphVersion: 3, generationVersion: 1, profile,
    name: `${profile} architecture option`, summary: 'A complete architecture option for exact local contract verification.',
    deploymentModel: 'One explicit deployment model with bounded and inspectable runtime responsibilities.',
    components: [{ name: 'API', responsibility: 'Validates organization-scoped requests and invokes domain services.' }, { name: 'PostgreSQL', responsibility: 'Stores canonical state, approvals, versions, and audit evidence.' }],
    dataFlows: ['A validated request enters the organization-scoped service boundary.'], technologies: ['Node.js', 'PostgreSQL'],
    why: ['This option has a bounded operating model suitable for the approved scope.'], whyNot: ['This option carries trade-offs that require explicit human acceptance.'],
    assumptions: ['The approved workload remains inside the recorded scaling boundary.'], risks: ['Runtime contention may grow if workload assumptions become invalid.'],
    failureModes: [{ failure: 'A process stops while work is running.', mitigation: 'Persist intent and use idempotent recovery before retrying.' }, { failure: 'Database contention delays requests.', mitigation: 'Measure queries and locks before changing service boundaries.' }],
    estimatedCost: { range: 'UNKNOWN', basis: 'No measured workload or approved provider prices exist for a defensible range.', truthStatus: 'UNKNOWN' },
    reconsiderationTriggers: [{ metric: 'Measured workload', condition: 'Reconsider when the approved scaling boundary is repeatedly exceeded.' }],
    scoreBreakdown: {
      deliverySpeed: { score: 4, rationale: 'The component set keeps initial delivery coordination bounded.' }, operationalSimplicity: { score: 4, rationale: 'The operating surface remains explicit and inspectable.' },
      scalability: { score: 3, rationale: 'The option supports bounded scaling within its stated assumptions.' }, reliability: { score: 3, rationale: 'Failure controls are explicit but still require measured verification.' },
      costPredictability: { score: 2, rationale: 'Monetary cost remains unknown without workload and provider evidence.' },
    },
    sourceEntityIds: ['REQ-ONE'], truthStatus: 'AI_SUGGESTED', sha256: String(index + 1).repeat(64),
  };
}

const options = [option('LEAN', 0), option('BALANCED', 1), option('DISTRIBUTED', 2)];
const generation = { id: 'ARCHGEN-ONE', projectId: 'PROJ-ONE', graphVersion: 3, version: 1, contentHash: 'd'.repeat(64), compilerVersion: 'architecture-comparison-compiler-v1', recommendedOptionId: options[1]!.id, recommendationBasis: 'The balanced option adds a durable boundary without assuming speculative domain services.', requirementDocumentHashes: hashes, options, generatedAt: '2026-07-24T00:00:00.000Z' };
const generated = { project, baseline: { projectId: 'PROJ-ONE', graphVersion: 3, generation, decision: null, artifacts: [] }, replayed: false };

function architectureRequest(path: string, body: unknown, idempotencyKey: string) {
  return new Request(`http://127.0.0.1${path}`, { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json', 'idempotency-key': idempotencyKey, 'if-match': '"PROJ-ONE:6"' }, body: JSON.stringify(body) });
}

describe('architecture BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentSessionToken.mockResolvedValue('A'.repeat(43));
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'architecture-001', etag: '"PROJ-ONE:7"', idempotencyReplayed: 'false', body: generated });
  });

  it('forwards versioned option generation with project concurrency and idempotency', async () => {
    const path = '/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/architecture/generations';
    const response = await generateArchitecture(architectureRequest(path, { sourceGraphVersion: 3 }, 'architecture-generate-001'), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBe('architecture-001');
    expect(response.headers.get('etag')).toBe('"PROJ-ONE:7"');
    expect(response.headers.get('idempotency-replayed')).toBe('false');
    expect(mocks.requestPlatform).toHaveBeenCalledWith(expect.any(Function), 'A'.repeat(43), 'architecture-request-id');
  });

  it('forwards approval of one exact option and human rationale', async () => {
    const selected = options[1]!;
    const body = { sourceGraphVersion: 3, generationId: generation.id, generationContentHash: generation.contentHash, selectedOptionId: selected.id, selectedOptionHash: selected.sha256, comment: 'This option is approved because its bounded worker trade-off matches the current product scope.' };
    const decision = { id: 'ADR-ONE', projectId: 'PROJ-ONE', graphVersion: 3, version: 1, generationId: generation.id, generationContentHash: generation.contentHash, selectedOptionId: selected.id, selectedOptionHash: selected.sha256, comment: body.comment, rejectedAlternatives: options.filter((option) => option.id !== selected.id).map((option) => ({ optionId: option.id, whyRejected: option.whyNot })), truthStatus: 'HUMAN_APPROVED', approvedByUserId: 'USER-ONE', approvedAt: '2026-07-24T01:00:00.000Z' };
    const architectureArtifacts = (['hld', 'adr'] as const).map((type) => ({ id: `DOC-PROJ-ONE-${type}`, projectId: 'PROJ-ONE', type, version: 1, sourceGraphVersion: 3, title: type === 'hld' ? 'High-Level Design' : 'Architecture Decision Record', content: `# Approved ${type}\n\nSelected ${selected.id}.`, sha256: type === 'hld' ? 'e'.repeat(64) : 'f'.repeat(64), truthStatus: 'HUMAN_APPROVED', provenance: { mode: 'DETERMINISTIC_COMPILER', compilerVersion: 'architecture-comparison-compiler-v1', generationId: generation.id, decisionId: decision.id, selectedOptionId: selected.id }, generatedAt: decision.approvedAt }));
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'architecture-approve-001', etag: '"PROJ-ONE:8"', idempotencyReplayed: 'false', body: { project: { ...project, status: 'HLD_READY', rowVersion: 8 }, baseline: { projectId: 'PROJ-ONE', graphVersion: 3, generation, decision, artifacts: architectureArtifacts }, replayed: false } });
    const response = await approveArchitecture(architectureRequest('/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/architecture/decisions', body, 'architecture-approve-001'), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(201);
    expect(mocks.requestPlatform).toHaveBeenCalledWith(expect.any(Function), 'A'.repeat(43), 'architecture-request-id');
  });

  it('rejects cross-origin mutation before reading the session', async () => {
    const request = new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/architecture/generations', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://attacker.invalid' } });
    const response = await generateArchitecture(request, { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(403);
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
  });

  it('preserves invalid path precedence over invalid headers and body', async () => {
    const request = new Request('http://127.0.0.1/api/platform/organizations/invalid/projects/invalid/architecture/generations', {
      method: 'POST',
      headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json' },
      body: '{}',
    });
    const response = await generateArchitecture(request, {
      params: Promise.resolve({ organizationId: 'invalid', projectId: 'invalid' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
  });

  it('preserves invalid header and body precedence over authentication', async () => {
    mocks.currentSessionToken.mockResolvedValue(null);
    const request = new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/architecture/generations', {
      method: 'POST',
      headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json' },
      body: '{}',
    });
    const response = await generateArchitecture(request, {
      params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'INVALID_REQUEST' } });
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
  });

  it('rejects a valid same-origin mutation when unauthenticated', async () => {
    mocks.currentSessionToken.mockResolvedValue(null);
    const response = await generateArchitecture(
      architectureRequest(
        '/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/architecture/generations',
        { sourceGraphVersion: 3 },
        'architecture-generate-unauthenticated',
      ),
      { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) },
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('architecture-request-id');
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
    expect(mocks.requestPlatform).not.toHaveBeenCalled();
  });

  it('rejects a malformed successful platform response', async () => {
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'architecture-002', body: { baseline: null } });
    const response = await generateArchitecture(architectureRequest('/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/architecture/generations', { sourceGraphVersion: 3 }, 'architecture-generate-002'), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(502);
    expect(response.headers.get('x-request-id')).toBe('architecture-002');
  });
});
