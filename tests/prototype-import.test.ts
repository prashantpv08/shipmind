import { describe, expect, it } from 'vitest';
import { buildPrototypeImportPlan } from '../src/db/prototype-import';
import { ProjectDatabase } from '../src/projects/schemas';

function prototypeSnapshot() {
  return ProjectDatabase.parse({
    version: 1,
    workspaces: [{ id: 'WS-1', name: 'Workspace', createdAt: '2026-07-20T10:00:00.000Z', updatedAt: '2026-07-20T10:00:00.000Z' }],
    projects: [{ id: 'PROJ-1', workspaceId: 'WS-1', name: 'Project', status: 'SOURCES_READY', graphVersion: 0, createdAt: '2026-07-20T10:00:00.000Z', updatedAt: '2026-07-20T10:00:00.000Z' }],
    sources: [{
      id: 'SRC-1', workspaceId: 'WS-1', projectId: 'PROJ-1', name: 'brief.txt', kind: 'FILE',
      mimeType: 'text/plain', size: 12, sha256: 'a'.repeat(64), extractedText: 'A requirement',
      rawPath: 'uploads/brief.txt', status: 'EXTRACTED', createdAt: '2026-07-20T10:00:00.000Z',
    }],
    knowledge: [],
    architectureBriefs: [],
    arbDecisions: [],
    documents: [],
    documentApprovals: [],
    notionPublications: [],
    jiraPublications: [],
    wireframeRevisions: [],
  });
}

describe('prototype PostgreSQL import planning', () => {
  it('produces a deterministic, non-mutating dry-run plan', () => {
    const snapshot = prototypeSnapshot();
    const first = buildPrototypeImportPlan(snapshot);
    const second = buildPrototypeImportPlan(snapshot);

    expect(first.errors).toEqual([]);
    expect(first.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(second.sourceHash).toBe(first.sourceHash);
    expect(first.counts).toMatchObject({ workspaces: 1, projects: 1, sources: 1, documents: 0 });
  });

  it('blocks cross-reference loss before connecting to PostgreSQL', () => {
    const snapshot = prototypeSnapshot();
    snapshot.projects[0].workspaceId = 'WS-MISSING';

    const plan = buildPrototypeImportPlan(snapshot);

    expect(plan.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('references missing workspace'),
      expect.stringContaining('workspace does not match'),
    ]));
  });

  it('allows stable document IDs across versions but blocks duplicate versions', () => {
    const snapshot = prototypeSnapshot();
    const base = {
      id: 'DOC-SRS-PROJ-1', projectId: 'PROJ-1', type: 'srs' as const,
      sourceGraphVersion: 1, title: 'SRS', content: 'Versioned content',
      sha256: 'e'.repeat(64), truthStatus: 'AI_SUGGESTED' as const,
      generatedAt: '2026-07-20T10:00:00.000Z',
    };
    snapshot.documents.push({ ...base, version: 1 }, { ...base, version: 2, sha256: 'f'.repeat(64) });
    expect(buildPrototypeImportPlan(snapshot).errors).toEqual([]);

    snapshot.documents.push({ ...base, version: 2, sha256: 'f'.repeat(64) });
    expect(buildPrototypeImportPlan(snapshot).errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Duplicate document ID/version'),
      expect.stringContaining('Duplicate document project/type/version'),
    ]));
  });
});
