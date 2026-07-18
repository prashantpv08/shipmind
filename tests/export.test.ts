import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { POST as exportProject } from '../app/api/export/route';
import { resetNotifyFlowDemo } from '../src/demo/reset';
import { compileProjectExport, exportResponse } from '../src/export/compile';
import { ProjectExportBundle } from '../src/export/schemas';
import { resolveWhyQuestion, suggestedWhyQuestions } from '../src/traceability/why';
import { tracedContext, tracedContextTime } from './helpers/traced-context';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function hash(content: string) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('governed project export', () => {
  it('packages every P0 record with unique paths, verified hashes, and one root manifest hash', async () => {
    const context = await tracedContext();
    const whyAnswer = resolveWhyQuestion({ question: suggestedWhyQuestions[2], context });
    const bundle = compileProjectExport({ format: 'json', context, whyAnswer }, tracedContextTime);

    expect(ProjectExportBundle.safeParse(bundle).success).toBe(true);
    expect(bundle.files).toHaveLength(15);
    expect(new Set(bundle.files.map((file) => file.id)).size).toBe(bundle.files.length);
    expect(new Set(bundle.files.map((file) => file.path)).size).toBe(bundle.files.length);
    expect(bundle.files.every((file) => hash(file.content) === file.sha256)).toBe(true);
    expect(bundle.manifest.rootHash).toBe(hash(bundle.files.map((file) => `${file.path}:${file.sha256}`).join('\n')));
    expect(bundle.manifest.files.filter((file) => file.kind === 'artifact').map((file) => file.sha256))
      .toEqual(context.artifactPack.artifacts.map((artifact) => artifact.hash));
    expect(bundle.manifest).toMatchObject({
      sourceGraphVersion: context.analysis.graphVersion,
      generationId: context.generation.generationId,
      verificationReportId: context.verification.id,
      fileCount: 15,
    });
  });

  it('renders useful JSON and Markdown handoffs without requiring a Why answer', async () => {
    const context = await tracedContext();
    const jsonOutput = exportResponse({ format: 'json', context }, tracedContextTime);
    const markdownOutput = exportResponse({ format: 'markdown', context }, tracedContextTime);

    expect(jsonOutput.bundle.files).toHaveLength(14);
    expect(ProjectExportBundle.parse(JSON.parse(jsonOutput.content)).manifest.exportId).toBe(jsonOutput.bundle.manifest.exportId);
    expect(jsonOutput.filename).toMatch(/graph-v5\.json$/);
    expect(markdownOutput.filename).toMatch(/graph-v5\.md$/);
    expect(markdownOutput.content).toContain('# Axiom project handoff pack');
    expect(markdownOutput.content).toContain('## Machine-readable manifest');
    expect(markdownOutput.content).toContain('traceability/graph.json');
    expect(markdownOutput.content).toContain('evidence/verification.json');
  });

  it('rejects a latest answer that cites an entity outside the current graph', async () => {
    const context = await tracedContext();
    const whyAnswer = resolveWhyQuestion({ question: suggestedWhyQuestions[0], context });

    expect(() => compileProjectExport({
      format: 'json',
      context,
      whyAnswer: { ...whyAnswer, citedEntityIds: [...whyAnswer.citedEntityIds, 'ADR-FROM-OTHER-GRAPH'] },
    }, tracedContextTime)).toThrow('Why answer cites unknown graph entity ADR-FROM-OTHER-GRAPH');
  });

  it('serves both attachment formats and rejects a graph-mismatched payload', async () => {
    const context = await tracedContext();
    const jsonResponse = await exportProject(new Request('http://x/api/export', {
      method: 'POST',
      body: JSON.stringify({ format: 'json', context }),
    }));
    expect(jsonResponse.status).toBe(200);
    expect(jsonResponse.headers.get('content-type')).toContain('application/json');
    expect(jsonResponse.headers.get('content-disposition')).toMatch(/attachment; filename=".*\.json"/);
    expect(jsonResponse.headers.get('x-axiom-export-id')).toMatch(/^EXPORT-[A-F0-9]{16}$/);
    expect(ProjectExportBundle.safeParse(await jsonResponse.json()).success).toBe(true);

    const markdownResponse = await exportProject(new Request('http://x/api/export', {
      method: 'POST',
      body: JSON.stringify({ format: 'markdown', context }),
    }));
    expect(markdownResponse.status).toBe(200);
    expect(markdownResponse.headers.get('content-type')).toContain('text/markdown');
    expect(await markdownResponse.text()).toContain('# Axiom project handoff pack');

    const invalidResponse = await exportProject(new Request('http://x/api/export', {
      method: 'POST',
      body: JSON.stringify({
        format: 'json',
        context: { ...context, verification: { ...context.verification, generationId: 'GEN-MISMATCH' } },
      }),
    }));
    expect(invalidResponse.status).toBe(400);
  });
});

describe('deterministic demo reset', () => {
  it('removes only generated sandbox and evidence data, preserves projects and templates, and is idempotent', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'axiom-reset-repo-'));
    const dataRoot = await mkdtemp(join(tmpdir(), 'axiom-reset-data-'));
    temporaryRoots.push(repositoryRoot, dataRoot);
    const sandboxRoot = join(repositoryRoot, 'sandbox/notification-service');
    const workspaceFile = join(sandboxRoot, 'workspace/src/generated.ts');
    const stageFile = join(sandboxRoot, '.axiom-stage-123/staged.ts');
    const backupFile = join(sandboxRoot, 'workspace.backup-123/backup.ts');
    const templateFile = join(sandboxRoot, 'template/src/template.ts');
    const projectFile = join(dataRoot, 'projects.json');
    const verificationFile = join(dataRoot, 'verification/VERIFY-001.json');

    for (const file of [workspaceFile, stageFile, backupFile, templateFile, projectFile, verificationFile]) {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, file === projectFile ? '{"preserve":true}' : 'sentinel', 'utf8');
    }

    const first = await resetNotifyFlowDemo({ repositoryRoot, dataRoot });
    expect(first).toMatchObject({ status: 'RESET', preservedProjectData: true });
    expect(first.durationMs).toBeLessThan(30_000);
    expect(first.removedTargets).toEqual(expect.arrayContaining([
      'sandbox/notification-service/workspace',
      'sandbox/notification-service/.axiom-stage-123',
      'sandbox/notification-service/workspace.backup-123',
      '.axiom-data/verification',
    ]));
    expect(await pathExists(workspaceFile)).toBe(false);
    expect(await pathExists(stageFile)).toBe(false);
    expect(await pathExists(backupFile)).toBe(false);
    expect(await pathExists(verificationFile)).toBe(false);
    expect(await readFile(templateFile, 'utf8')).toBe('sentinel');
    expect(await readFile(projectFile, 'utf8')).toBe('{"preserve":true}');

    const second = await resetNotifyFlowDemo({ repositoryRoot, dataRoot });
    expect(second.removedTargets).toEqual([]);
    expect(await readFile(projectFile, 'utf8')).toBe('{"preserve":true}');
  });
});
