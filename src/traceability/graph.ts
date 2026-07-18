import type { Artifact } from '../domain/schemas';
import {
  RequirementTrace,
  TraceEdge,
  TraceNode,
  TraceabilityContext,
  TraceabilityGraph,
  type RequirementTrace as RequirementTraceType,
  type TraceEdge as TraceEdgeType,
  type TraceNode as TraceNodeType,
  type TraceabilityContext as TraceabilityContextType,
  type TraceabilityGraph as TraceabilityGraphType,
} from './schemas';

const artifactLabels: Record<Artifact['type'], string> = {
  srs: 'Software requirements specification',
  nfr: 'Non-functional requirements',
  hld: 'High-level design',
  adr: 'Architecture decision record',
  openapi: 'OpenAPI 3.1 contract',
  'test-strategy': 'Test strategy',
  backlog: 'Implementation backlog',
  'codex-task': 'Codex task packet',
  constitution: 'Engineering Constitution',
};

function edge(id: string, fromId: string, toId: string, relation: TraceEdgeType['relation']) {
  return TraceEdge.parse({ id, fromId, toId, relation });
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function connectedEdges(edges: TraceEdgeType[], nodeIds: string[]) {
  const selected = new Set(nodeIds);
  return edges.filter((item) => selected.has(item.fromId) && selected.has(item.toId)).map((item) => item.id);
}

export function buildTraceabilityGraph(input: unknown): TraceabilityGraphType {
  const context = TraceabilityContext.parse(input);
  const { analysis, decision, artifactPack, generation, verification } = context;
  const selectedOption = analysis.architectureOptions.find((option) => option.id === decision.selectedOptionId);
  if (!selectedOption) throw new Error('Approved architecture option is missing from the canonical graph');

  const requirements = [...analysis.functionalRequirements, ...analysis.nonFunctionalRequirements];
  const nodes: TraceNodeType[] = [];
  const edges: TraceEdgeType[] = [];

  for (const span of analysis.sourceSpans) {
    nodes.push(TraceNode.parse({ id: span.id, type: 'source-span', label: span.quote, detail: `${span.startOffset}–${span.endOffset} in ${span.documentId}`, truthStatus: 'SOURCE_GROUNDED' }));
  }
  for (const requirement of requirements) {
    nodes.push(TraceNode.parse({ id: requirement.id, type: 'requirement', label: requirement.text, detail: `${requirement.kind.replace('_', ' ')} · ${requirement.priority}`, truthStatus: requirement.truthStatus }));
    for (const evidence of requirement.sourceEvidence) {
      if (evidence.spanId) edges.push(edge(`EDGE-GROUND-${evidence.spanId}-${requirement.id}`, evidence.spanId, requirement.id, 'grounds'));
    }
    if (selectedOption.coverageRefs.includes(requirement.id)) {
      edges.push(edge(`EDGE-INFORM-${requirement.id}-${decision.id}`, requirement.id, decision.id, 'informs'));
    }
  }

  for (const gap of analysis.gaps) {
    const resolved = analysis.clarificationQuestions.some((question) => question.relatedGapIds.includes(gap.id) && question.answerStatus === 'ANSWERED');
    nodes.push(TraceNode.parse({ id: gap.id, type: 'gap', label: gap.title, detail: `${gap.severity} · ${resolved ? 'resolved by user answer' : 'unresolved'}`, truthStatus: resolved ? 'USER_PROVIDED' : gap.truthStatus }));
    for (const spanId of gap.sourceSpanIds) {
      if (analysis.sourceSpans.some((span) => span.id === spanId)) edges.push(edge(`EDGE-GROUND-${spanId}-${gap.id}`, spanId, gap.id, 'grounds'));
    }
    for (const requirementId of gap.affectedEntityIds) {
      if (requirements.some((requirement) => requirement.id === requirementId)) edges.push(edge(`EDGE-AFFECT-${gap.id}-${requirementId}`, gap.id, requirementId, 'affects'));
    }
  }

  for (const question of analysis.clarificationQuestions) {
    nodes.push(TraceNode.parse({ id: question.id, type: 'clarification-question', label: question.text, detail: `${question.severity} · ${question.answerStatus}`, truthStatus: question.provenance }));
    for (const gapId of question.relatedGapIds) {
      if (analysis.gaps.some((gap) => gap.id === gapId)) edges.push(edge(`EDGE-RAISE-${gapId}-${question.id}`, gapId, question.id, 'raises'));
    }
    for (const requirementId of question.affectedEntityIds) {
      if (requirements.some((requirement) => requirement.id === requirementId)) edges.push(edge(`EDGE-INFORM-${question.id}-${requirementId}`, question.id, requirementId, 'informs'));
    }
    if (question.answer) {
      nodes.push(TraceNode.parse({ id: question.answer.id, type: 'answer', label: question.answer.value, detail: `Answer to ${question.id}`, truthStatus: question.answer.provenance }));
      edges.push(edge(`EDGE-ANSWER-${question.id}-${question.answer.id}`, question.id, question.answer.id, 'answers'));
      edges.push(edge(`EDGE-INFORM-${question.answer.id}-${decision.id}`, question.answer.id, decision.id, 'informs'));
    }
  }

  nodes.push(TraceNode.parse({
    id: decision.id,
    type: 'decision',
    label: selectedOption.name,
    detail: `ADR v${decision.version} · approved for graph v${decision.graphVersion}`,
    truthStatus: decision.truthStatus,
  }));

  for (const option of analysis.architectureOptions) {
    nodes.push(TraceNode.parse({
      id: option.id,
      type: 'architecture-option',
      label: option.name,
      detail: `${option.deploymentModel} · ${option.monthlyCostRange.truthStatus} USD ${option.monthlyCostRange.min}–${option.monthlyCostRange.max}/month`,
      truthStatus: option.id === decision.selectedOptionId ? 'HUMAN_APPROVED' : option.truthStatus,
    }));
    edges.push(edge(
      `EDGE-${option.id === decision.selectedOptionId ? 'SELECT' : 'REJECT'}-${option.id}-${decision.id}`,
      option.id,
      decision.id,
      option.id === decision.selectedOptionId ? 'selects' : 'rejects',
    ));
  }

  for (const artifact of artifactPack.artifacts) {
    nodes.push(TraceNode.parse({ id: artifact.id, type: 'artifact', label: artifactLabels[artifact.type], detail: `${artifact.type} v${artifact.version} · ${artifact.hash.slice(0, 18)}…`, truthStatus: artifact.truthStatus }));
    edges.push(edge(`EDGE-COMPILE-${decision.id}-${artifact.id}`, decision.id, artifact.id, 'compiles'));
  }

  for (const rule of artifactPack.constitution.rules) {
    nodes.push(TraceNode.parse({ id: rule.id, type: 'constitution-rule', label: rule.statement, detail: `${rule.category} · ${rule.severity} · ${rule.verificationMethod}`, truthStatus: rule.truthStatus }));
    for (const linkedId of rule.linkedEntityIds) {
      if (nodes.some((node) => node.id === linkedId)) edges.push(edge(`EDGE-CONSTRAIN-${linkedId}-${rule.id}`, linkedId, rule.id, 'constrains'));
    }
  }

  nodes.push(TraceNode.parse({
    id: generation.selectedSliceId,
    type: 'task',
    label: 'Notification API vertical slice',
    detail: 'POST /notifications and GET /notifications/{id}',
    truthStatus: 'HUMAN_APPROVED',
  }));
  if (artifactPack.artifacts.some((artifact) => artifact.id === 'ART-BACKLOG-001')) {
    edges.push(edge(`EDGE-PLAN-ART-BACKLOG-001-${generation.selectedSliceId}`, 'ART-BACKLOG-001', generation.selectedSliceId, 'plans'));
  }

  for (const file of generation.files) {
    const isTest = file.path.startsWith('tests/');
    nodes.push(TraceNode.parse({ id: file.id, type: isTest ? 'test' : 'code-file', label: file.path, detail: `${file.hash.slice(0, 18)}… · ${file.linkedEntityIds.join(', ')}`, truthStatus: 'AI_SUGGESTED' }));
    if (!isTest) {
      edges.push(edge(`EDGE-IMPLEMENT-${generation.selectedSliceId}-${file.id}`, generation.selectedSliceId, file.id, 'implements'));
      for (const artifactId of generation.provenance.artifactIds) {
        if (artifactPack.artifacts.some((artifact) => artifact.id === artifactId)) {
          edges.push(edge(`EDGE-IMPLEMENT-${artifactId}-${file.id}`, artifactId, file.id, 'implements'));
        }
      }
    }
    for (const linkedId of file.linkedEntityIds) {
      if (artifactPack.constitution.rules.some((rule) => rule.id === linkedId)) {
        edges.push(edge(`EDGE-CONSTRAIN-${linkedId}-${file.id}`, linkedId, file.id, 'constrains'));
      }
    }
  }

  const implementationFiles = generation.files.filter((file) => !file.path.startsWith('tests/'));
  const testFiles = generation.files.filter((file) => file.path.startsWith('tests/'));
  for (const testFile of testFiles) {
    const linkedRequirementIds = testFile.linkedEntityIds.filter((id) => requirements.some((requirement) => requirement.id === id));
    for (const requirementId of linkedRequirementIds) {
      edges.push(edge(`EDGE-TEST-REQ-${requirementId}-${testFile.id}`, requirementId, testFile.id, 'tests'));
      for (const codeFile of implementationFiles.filter((file) => file.linkedEntityIds.includes(requirementId))) {
        edges.push(edge(`EDGE-TEST-CODE-${requirementId}-${codeFile.id}-${testFile.id}`, codeFile.id, testFile.id, 'tests'));
      }
    }
  }

  for (const evidence of verification.evidence) {
    nodes.push(TraceNode.parse({ id: evidence.id, type: 'evidence', label: evidence.claim, detail: `${evidence.type} · run ${evidence.verificationRunId}`, truthStatus: evidence.truthStatus }));
    for (const linkedId of evidence.linkedEntityIds) {
      if (nodes.some((node) => node.id === linkedId)) {
        edges.push(edge(`EDGE-VERIFY-${linkedId}-${evidence.id}`, linkedId, evidence.id, 'verifies'));
      }
    }
  }

  const requirementTraces: RequirementTraceType[] = requirements.map((requirement) => {
    const coverage = verification.requirementCoverage.find((item) => item.requirementId === requirement.id);
    const relatedTests = testFiles.filter((file) => file.linkedEntityIds.includes(requirement.id)).map((file) => file.id);
    const relatedCode = implementationFiles.filter((file) => file.linkedEntityIds.includes(requirement.id)).map((file) => file.id);
    const relatedArtifacts = selectedOption.coverageRefs.includes(requirement.id) ? artifactPack.artifacts.map((artifact) => artifact.id) : [];
    const evidenceIds = coverage?.evidenceIds ?? [];
    const sourceSpanIds = requirement.sourceEvidence.flatMap((item) => item.spanId ? [item.spanId] : []);
    const nodeIds = unique([
      ...sourceSpanIds,
      requirement.id,
      ...(selectedOption.coverageRefs.includes(requirement.id) ? [decision.id] : []),
      ...relatedArtifacts,
      ...relatedCode,
      ...relatedTests,
      ...evidenceIds,
    ]);
    return RequirementTrace.parse({
      requirementId: requirement.id,
      nodeIds,
      edgeIds: connectedEdges(edges, nodeIds),
      status: coverage?.status ?? 'UNKNOWN',
      note: coverage?.note ?? 'No generated verification mapping exists for this requirement.',
    });
  });

  const unlinkedTestIds = testFiles
    .filter((file) => !file.linkedEntityIds.some((id) => requirements.some((requirement) => requirement.id === id)))
    .map((file) => file.id);
  const orphanRequirementIds = requirementTraces
    .filter((trace) => !trace.nodeIds.some((id) => testFiles.some((file) => file.id === id)))
    .map((trace) => trace.requirementId);
  const unknownRequirementIds = requirementTraces.filter((trace) => trace.status === 'UNKNOWN').map((trace) => trace.requirementId);

  return TraceabilityGraph.parse({
    projectId: analysis.projectId,
    graphVersion: analysis.graphVersion,
    generationId: generation.generationId,
    verificationReportId: verification.id,
    nodes,
    edges,
    requirementTraces,
    orphanRequirementIds,
    unlinkedTestIds,
    unknownRequirementIds,
  });
}

export function traceRequirement(graphInput: unknown, requirementId: string) {
  const graph = TraceabilityGraph.parse(graphInput);
  const trace = graph.requirementTraces.find((item) => item.requirementId === requirementId);
  if (!trace) throw new Error(`Requirement ${requirementId} is not present in the traceability graph`);
  const nodeIds = new Set(trace.nodeIds);
  const edgeIds = new Set(trace.edgeIds);
  return {
    trace,
    nodes: graph.nodes.filter((node) => nodeIds.has(node.id)),
    edges: graph.edges.filter((item) => edgeIds.has(item.id)),
  };
}
