import { createHash } from 'node:crypto';
import type { Artifact } from '../domain/schemas';
import { buildTraceabilityGraph } from '../traceability/graph';
import {
  ProjectExportBundle,
  ProjectExportFile,
  ProjectExportRequest,
  type ProjectExportBundle as ProjectExportBundleType,
  type ProjectExportFile as ProjectExportFileType,
} from './schemas';

const artifactOrder: Artifact['type'][] = [
  'srs',
  'nfr',
  'hld',
  'adr',
  'openapi',
  'test-strategy',
  'backlog',
  'codex-task',
  'constitution',
];

function sha256(content: string) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'axiom-project';
}

function exportFile(input: Omit<ProjectExportFileType, 'sha256'>) {
  return ProjectExportFile.parse({ ...input, sha256: sha256(input.content) });
}

function buildFiles(request: ProjectExportRequest, graph: ReturnType<typeof buildTraceabilityGraph>) {
  const { context } = request;
  const files: ProjectExportFileType[] = [
    exportFile({ id: 'EXPORT-CANONICAL-GRAPH', path: 'project/canonical-graph.json', kind: 'canonical-graph', mediaType: 'application/json', version: context.analysis.graphVersion, sourceGraphVersion: context.analysis.graphVersion, content: json(context.analysis) }),
    exportFile({ id: 'EXPORT-APPROVED-DECISION', path: 'project/approved-decision.json', kind: 'decision', mediaType: 'application/json', version: context.decision.version, sourceGraphVersion: context.analysis.graphVersion, content: json(context.decision) }),
  ];

  for (const type of artifactOrder) {
    const artifact = context.artifactPack.artifacts.find((item) => item.type === type);
    if (!artifact) throw new Error(`Artifact pack is missing ${type}`);
    const extension = artifact.mediaType === 'application/json' ? 'json' : 'md';
    const file = exportFile({
      id: artifact.id,
      path: `artifacts/${String(files.length - 1).padStart(2, '0')}-${safeName(type)}-v${artifact.version}.${extension}`,
      kind: 'artifact',
      mediaType: artifact.mediaType,
      version: artifact.version,
      sourceGraphVersion: artifact.sourceGraphVersion,
      content: artifact.content,
    });
    if (file.sha256 !== artifact.hash) throw new Error(`Artifact ${artifact.id} content does not match its approved hash`);
    files.push(file);
  }

  files.push(
    exportFile({ id: 'EXPORT-GENERATION', path: 'implementation/generation.json', kind: 'generation', mediaType: 'application/json', version: null, sourceGraphVersion: context.analysis.graphVersion, content: json(context.generation) }),
    exportFile({ id: context.verification.id, path: 'evidence/verification.json', kind: 'verification', mediaType: 'application/json', version: null, sourceGraphVersion: context.analysis.graphVersion, content: json(context.verification) }),
    exportFile({ id: 'EXPORT-TRACEABILITY', path: 'traceability/graph.json', kind: 'traceability', mediaType: 'application/json', version: context.analysis.graphVersion, sourceGraphVersion: context.analysis.graphVersion, content: json(graph) }),
  );

  if (request.whyAnswer) {
    files.push(exportFile({ id: 'EXPORT-WHY-ANSWER', path: 'reasoning/latest-why-answer.json', kind: 'why-answer', mediaType: 'application/json', version: null, sourceGraphVersion: context.analysis.graphVersion, content: json(request.whyAnswer) }));
  }
  return files;
}

function assertWhyAnswerMatchesGraph(request: ProjectExportRequest, graph: ReturnType<typeof buildTraceabilityGraph>) {
  if (!request.whyAnswer) return;
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  for (const entityId of [...request.whyAnswer.citedEntityIds, ...request.whyAnswer.traversalNodeIds]) {
    if (!nodeIds.has(entityId)) throw new Error(`Why answer cites unknown graph entity ${entityId}`);
  }
}

export function compileProjectExport(input: unknown, createdAt = new Date().toISOString()): ProjectExportBundleType {
  const request = ProjectExportRequest.parse(input);
  const graph = buildTraceabilityGraph(request.context);
  assertWhyAnswerMatchesGraph(request, graph);
  const files = buildFiles(request, graph);
  const rootHash = sha256(files.map((file) => `${file.path}:${file.sha256}`).join('\n'));
  const exportId = `EXPORT-${rootHash.slice('sha256:'.length, 'sha256:'.length + 16).toUpperCase()}`;
  return ProjectExportBundle.parse({
    manifest: {
      schemaVersion: 1,
      exportId,
      projectId: request.context.analysis.projectId,
      sourceGraphVersion: request.context.analysis.graphVersion,
      generationId: request.context.generation.generationId,
      verificationReportId: request.context.verification.id,
      createdAt,
      fileCount: files.length,
      rootHash,
      files: files.map(({ content: _content, ...file }) => file),
    },
    files,
  });
}

export function renderExportMarkdown(bundleInput: unknown) {
  const bundle = ProjectExportBundle.parse(bundleInput);
  const manifestRows = bundle.manifest.files.map((file) => `| ${file.id} | \`${file.path}\` | ${file.kind} | ${file.version ?? '—'} | \`${file.sha256}\` |`).join('\n');
  const sections = bundle.files.map((file) => {
    const heading = `## ${file.id}\n\n- Path: \`${file.path}\`\n- Kind: ${file.kind}\n- SHA-256: \`${file.sha256}\`\n`;
    return file.mediaType === 'text/markdown'
      ? `${heading}\n${file.content.trim()}\n`
      : `${heading}\n\`\`\`json\n${file.content.trim()}\n\`\`\`\n`;
  }).join('\n---\n\n');
  return `# Axiom project handoff pack\n\n` +
    `- Export: \`${bundle.manifest.exportId}\`\n` +
    `- Project: \`${bundle.manifest.projectId}\`\n` +
    `- Graph version: ${bundle.manifest.sourceGraphVersion}\n` +
    `- Generation: \`${bundle.manifest.generationId}\`\n` +
    `- Verification: \`${bundle.manifest.verificationReportId}\`\n` +
    `- Created: ${bundle.manifest.createdAt}\n` +
    `- Root hash: \`${bundle.manifest.rootHash}\`\n\n` +
    `## Machine-readable manifest\n\n| ID | Path | Kind | Version | SHA-256 |\n|---|---|---|---:|---|\n${manifestRows}\n\n---\n\n${sections}`;
}

export function exportResponse(input: unknown, createdAt = new Date().toISOString()) {
  const request = ProjectExportRequest.parse(input);
  const bundle = compileProjectExport(request, createdAt);
  const baseName = `axiom-${safeName(bundle.manifest.projectId)}-graph-v${bundle.manifest.sourceGraphVersion}`;
  return request.format === 'json'
    ? { bundle, content: json(bundle), filename: `${baseName}.json`, mediaType: 'application/json' as const }
    : { bundle, content: renderExportMarkdown(bundle), filename: `${baseName}.md`, mediaType: 'text/markdown' as const };
}
