import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { POST } from '../app/api/code/generate/route';
import { compileArtifactPack } from '../src/artifacts/compile';
import { FixtureCodeGenerator } from '../src/codegen/provider';
import { CodeGenerationDraft, CodeGenerationOutput, CodeGenerationRequest } from '../src/codegen/schemas';
import { ALLOWED_GENERATED_PATHS, validateCodeGeneration, writeControlledWorkspace } from '../src/codegen/workspace';
import { answerQuestion, approve, fixtureAnalysisResult } from '../src/domain/day2';
import { AnalysisResult } from '../src/domain/schemas';

const now = '2026-07-17T12:00:00.000Z';

function codeInput() {
  const initial = fixtureAnalysisResult({
    label: 'Demo fixture', providerName: 'fixture', modelName: 'fixture', mode: 'fixture',
    startedAt: now, completedAt: now, outcome: 'SUCCEEDED',
  });
  let questions = initial.clarificationQuestions;
  for (const question of questions) questions = answerQuestion(questions, question.id, question.options[0].value, question.options[0].id);
  const analysis = AnalysisResult.parse({ ...initial, clarificationQuestions: questions, graphVersion: 5 });
  const decision = approve('ARCH-SERVERLESS', analysis.architectureOptions, analysis.graphVersion);
  const artifactPack = compileArtifactPack({ analysis, decision }, now);
  return CodeGenerationRequest.parse({ analysis, decision, artifactPack, selectedSliceId: 'SLICE-NOTIFICATION-API-001' });
}

async function tempWorkspace() {
  const sandboxRoot = await mkdtemp(join(tmpdir(), 'axiom-codegen-'));
  const templateRoot = join(sandboxRoot, 'template');
  const workspaceRoot = join(sandboxRoot, 'workspace');
  await mkdir(templateRoot, { recursive: true });
  await writeFile(join(templateRoot, 'package.json'), '{"private":true}\n');
  await writeFile(join(templateRoot, 'tsconfig.json'), '{}\n');
  await writeFile(join(templateRoot, 'vitest.config.ts'), 'export default {};\n');
  return { sandboxRoot, templateRoot, workspaceRoot };
}

describe('controlled code-generation contract', () => {
  it('builds a strict fixture draft from approved artifacts with prompt provenance', async () => {
    const input = codeInput();
    const draft = await new FixtureCodeGenerator().generate(input);
    const output = validateCodeGeneration(draft);

    expect(CodeGenerationDraft.safeParse(draft).success).toBe(true);
    expect(CodeGenerationOutput.safeParse(output).success).toBe(true);
    expect(output.files.map((file) => file.path)).toEqual(ALLOWED_GENERATED_PATHS);
    expect(output.provenance.artifactIds).toContain('ART-OPENAPI-001');
    expect(output.provenance.ruleIds).toContain('SEC-001');
    expect(output.manifestHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(output.traceLinks.every((link) => output.files.some((file) => file.id === link.toId))).toBe(true);
  });

  it('rejects traversal, absolute paths, malformed output, and non-allowlisted paths', async () => {
    const valid = await new FixtureCodeGenerator().generate(codeInput());
    for (const path of ['../escape.ts', '/tmp/escape.ts', 'src\\escape.ts']) {
      expect(CodeGenerationDraft.safeParse({ ...valid, operations: [{ ...valid.operations[0], path }] }).success).toBe(false);
    }
    expect(() => validateCodeGeneration({ ...valid, operations: [{ ...valid.operations[0], path: 'src/not-allowed.ts' }] }))
      .toThrow('outside the allowlist');
    expect(CodeGenerationDraft.safeParse({ ...valid, injectedCommand: 'npm install malware' }).success).toBe(false);
  });

  it('rejects duplicate and excessive output before writing', async () => {
    const valid = await new FixtureCodeGenerator().generate(codeInput());
    expect(() => validateCodeGeneration({ ...valid, operations: [valid.operations[0], valid.operations[0]] }))
      .toThrow('duplicate file paths');
    const excessive = valid.operations.map((operation) => ({ ...operation, content: 'x'.repeat(60000) }));
    expect(() => validateCodeGeneration({ ...valid, operations: excessive }))
      .toThrow('exceeds the 262144-byte total limit');
    expect(CodeGenerationDraft.safeParse({ ...valid, operations: [{ ...valid.operations[0], content: 'x'.repeat(65537) }] }).success)
      .toBe(false);
  });

  it('writes a complete workspace and preserves stable file IDs and hashes', async () => {
    const roots = await tempWorkspace();
    const draft = await new FixtureCodeGenerator().generate(codeInput());
    const first = await writeControlledWorkspace(draft, roots);
    const second = await writeControlledWorkspace(draft, roots);

    expect(first.files.map((file) => file.id)).toEqual(second.files.map((file) => file.id));
    expect(first.files.map((file) => file.hash)).toEqual(second.files.map((file) => file.hash));
    expect(await readFile(join(roots.workspaceRoot, 'src/notification-service.ts'), 'utf8')).toContain("url.pathname === '/notifications'");
    expect(await readFile(join(roots.workspaceRoot, 'tests/notification-service.api.test.ts'), 'utf8')).toContain('NFR-SEC-001');
  });

  it('rejects template symlinks and leaves the prior workspace untouched', async () => {
    const roots = await tempWorkspace();
    await mkdir(roots.workspaceRoot, { recursive: true });
    await writeFile(join(roots.workspaceRoot, 'sentinel.txt'), 'prior valid workspace');
    await symlink('/tmp', join(roots.templateRoot, 'escape-link'));
    const draft = await new FixtureCodeGenerator().generate(codeInput());

    await expect(writeControlledWorkspace(draft, roots)).rejects.toThrow('Symlinks are not allowed');
    await expect(readFile(join(roots.workspaceRoot, 'sentinel.txt'), 'utf8')).resolves.toBe('prior valid workspace');
  });

  it('rejects an existing workspace symlink before staging output', async () => {
    const roots = await tempWorkspace();
    await symlink('/tmp', roots.workspaceRoot);
    const draft = await new FixtureCodeGenerator().generate(codeInput());

    await expect(writeControlledWorkspace(draft, roots)).rejects.toThrow('Symlinks are not allowed');
  });
});

describe('code-generation route', () => {
  it('rejects invalid JSON and generation before an approved artifact pack', async () => {
    expect((await POST(new Request('http://x/api/code/generate', { method: 'POST', body: '{' }))).status).toBe(400);
    const input = codeInput();
    const response = await POST(new Request('http://x/api/code/generate', {
      method: 'POST', body: JSON.stringify({ ...input, artifactPack: undefined }),
    }));
    expect(response.status).toBe(400);
  });

  it('writes and returns validated generated code for the approved slice', async () => {
    const response = await POST(new Request('http://x/api/code/generate', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(codeInput()),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(CodeGenerationOutput.safeParse(body).success).toBe(true);
    expect(body.files).toHaveLength(5);
  });
});
