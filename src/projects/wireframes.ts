import { createHash } from 'node:crypto';
import { WireframeHandoff, type ArbDecision, type Project, type ProjectDocument, type ProjectKnowledge, type WireframeNode, type WireframeTemplateId } from './schemas';
import { getWireframeTemplate } from './wireframe-templates';

function stableId(projectId: string, graphVersion: number, key: string) {
  return `WF-${createHash('sha256').update(`${projectId}:${graphVersion}:${key}`).digest('hex').slice(0, 12).toUpperCase()}`;
}

function node(id: string, value: Omit<WireframeNode, 'id'>): WireframeNode {
  return WireframeHandoff.shape.screens.element.shape.nodes.element.parse({ id, ...value });
}

function chrome(prefix: string, title: string, sourceEntityIds: string[]): WireframeNode[] {
  return [
    node(`${prefix}-sidebar`, { kind: 'rectangle', x: 40, y: 58, width: 188, height: 718, backgroundColor: '#101828', strokeColor: '#101828', truthStatus: 'AI_SUGGESTED', sourceEntityIds: [] }),
    node(`${prefix}-brand`, { kind: 'text', x: 68, y: 86, text: 'Axiom', fontSize: 26, strokeColor: '#ffffff', truthStatus: 'AI_SUGGESTED', sourceEntityIds: [] }),
    node(`${prefix}-nav`, { kind: 'text', x: 68, y: 170, text: 'Overview\nWork queue\nRecords\nEvidence\nSettings', fontSize: 16, strokeColor: '#d0d5dd', truthStatus: 'AI_SUGGESTED', sourceEntityIds: [] }),
    node(`${prefix}-header`, { kind: 'rectangle', x: 228, y: 58, width: 1080, height: 72, backgroundColor: '#ffffff', strokeColor: '#d9dee7', truthStatus: 'AI_SUGGESTED', sourceEntityIds }),
    node(`${prefix}-title`, { kind: 'text', x: 266, y: 80, text: title, fontSize: 24, strokeColor: '#172033', truthStatus: 'AI_SUGGESTED', sourceEntityIds }),
  ];
}

function screenNodes(input: {
  projectId: string;
  graphVersion: number;
  slug: string;
  title: string;
  primaryAction: string;
  sections: string[];
  sourceEntityIds: string[];
  sourceStatements: string[];
  gapTitles: string[];
}) {
  const prefix = stableId(input.projectId, input.graphVersion, `${input.slug}-node`);
  const cards = input.sections.slice(0, 3).flatMap((section, index) => {
    const x = 266 + index * 326;
    const evidence = input.sourceStatements[index];
    return [
      node(`${prefix}-card-${index}`, { kind: 'rectangle', x, y: 202, width: 292, height: 184, backgroundColor: '#ffffff', strokeColor: '#d9dee7', truthStatus: 'AI_SUGGESTED', sourceEntityIds: input.sourceEntityIds.slice(index, index + 1) }),
      node(`${prefix}-card-title-${index}`, { kind: 'text', x: x + 22, y: 226, text: section, fontSize: 18, strokeColor: '#172033', truthStatus: 'AI_SUGGESTED', sourceEntityIds: [] }),
      node(`${prefix}-card-body-${index}`, { kind: 'text', x: x + 22, y: 276, text: evidence ? `Grounded input\n${evidence.slice(0, 72)}` : 'Design hypothesis\nRequires stakeholder review', fontSize: 14, strokeColor: evidence ? '#166534' : '#667085', truthStatus: evidence ? 'SOURCE_GROUNDED' : 'AI_SUGGESTED', sourceEntityIds: evidence ? input.sourceEntityIds.slice(index, index + 1) : [] }),
    ];
  });
  return [
    ...chrome(prefix, input.title, input.sourceEntityIds),
    node(`${prefix}-context`, { kind: 'text', x: 266, y: 154, text: 'Source-linked product hypothesis · review before approval', fontSize: 14, strokeColor: '#667085', truthStatus: 'AI_SUGGESTED', sourceEntityIds: [] }),
    node(`${prefix}-action`, { kind: 'rectangle', x: 1100, y: 146, width: 170, height: 44, backgroundColor: '#2636d9', strokeColor: '#2636d9', truthStatus: 'AI_SUGGESTED', sourceEntityIds: [] }),
    node(`${prefix}-action-text`, { kind: 'text', x: 1120, y: 159, text: input.primaryAction, fontSize: 15, strokeColor: '#ffffff', truthStatus: 'AI_SUGGESTED', sourceEntityIds: [] }),
    ...cards,
    node(`${prefix}-workspace`, { kind: 'rectangle', x: 266, y: 420, width: 944, height: 250, backgroundColor: '#ffffff', strokeColor: '#d9dee7', truthStatus: 'AI_SUGGESTED', sourceEntityIds: input.sourceEntityIds }),
    node(`${prefix}-workspace-heading`, { kind: 'text', x: 294, y: 448, text: 'Primary workflow', fontSize: 20, strokeColor: '#172033', truthStatus: 'AI_SUGGESTED', sourceEntityIds: [] }),
    node(`${prefix}-workflow`, { kind: 'text', x: 294, y: 500, text: 'INPUT / FILTERS                 REVIEWABLE RECORDS                 OUTCOME / NEXT ACTION\n\nDefault state                         Evidence and status                  Approved transition\n\nLoading state                         Empty state                           Validation failure\n\nDependency failure                    Recovery action                      Audit history', fontSize: 15, strokeColor: '#475467', truthStatus: 'AI_SUGGESTED', sourceEntityIds: input.sourceEntityIds }),
    node(`${prefix}-gap`, { kind: 'rectangle', x: 266, y: 700, width: 944, height: 62, backgroundColor: '#fffbeb', strokeColor: '#fde68a', truthStatus: input.gapTitles.length ? 'UNKNOWN' : 'AI_SUGGESTED', sourceEntityIds: [] }),
    node(`${prefix}-gap-text`, { kind: 'text', x: 294, y: 718, text: input.gapTitles.length ? `OPEN DESIGN DECISIONS · ${input.gapTitles.join(' · ').slice(0, 118)}` : 'No blocker mapped to this screen; non-blocking assumptions still require review.', fontSize: 14, strokeColor: '#92400e', truthStatus: input.gapTitles.length ? 'UNKNOWN' : 'AI_SUGGESTED', sourceEntityIds: [] }),
  ];
}

export function compileWireframeHandoff(input: {
  project: Project;
  knowledge: ProjectKnowledge;
  decision: ArbDecision;
  hld: ProjectDocument;
  templateId?: WireframeTemplateId;
  generatedAt?: string;
}) {
  if (input.decision.truthStatus !== 'HUMAN_APPROVED') throw new Error('A human-approved ARB decision is required before wireframe generation');
  if (input.decision.graphVersion !== input.knowledge.graphVersion) throw new Error('Approved ARB decision is stale for the current graph');
  if (input.hld.type !== 'hld' || input.hld.sourceGraphVersion !== input.knowledge.graphVersion) throw new Error('A current HLD is required before wireframe generation');

  const template = getWireframeTemplate(input.templateId ?? 'regulated-workflow');
  const groundedStatements = input.knowledge.entities
    .filter((entity) => entity.truthStatus === 'SOURCE_GROUNDED' && entity.sourceId)
    .map((entity) => ({ entityId: entity.id, category: entity.category, text: entity.text, sourceId: entity.sourceId as string }));
  const requirementEntities = groundedStatements.filter((statement) => statement.category === 'REQUIREMENT' || statement.category === 'NFR');
  const openGaps = input.knowledge.gaps.filter((gap) => gap.status === 'OPEN');
  const screens = template.screens.map((definition, index) => {
    const assignedStatements = groundedStatements.filter((_, statementIndex) => statementIndex % template.screens.length === index);
    const assignedGaps = openGaps.filter((_, gapIndex) => gapIndex % template.screens.length === index);
    const sourceEntityIds = assignedStatements.map((statement) => statement.entityId);
    return {
      id: stableId(input.project.id, input.knowledge.graphVersion, `${template.id}-${definition.slug}`),
      slug: definition.slug,
      title: definition.title,
      purpose: definition.purpose,
      truthStatus: 'AI_SUGGESTED' as const,
      sourceEntityIds,
      unresolvedGapIds: assignedGaps.map((gap) => gap.id),
      requiredStates: ['DEFAULT', 'LOADING', 'EMPTY', 'VALIDATION_ERROR', 'FAILURE'] as const,
      nodes: screenNodes({
        projectId: input.project.id,
        graphVersion: input.knowledge.graphVersion,
        slug: definition.slug,
        title: definition.title,
        primaryAction: definition.primaryAction,
        sections: definition.sections,
        sourceEntityIds,
        sourceStatements: assignedStatements.map((statement) => statement.text),
        gapTitles: assignedGaps.map((gap) => gap.title),
      }),
    };
  });
  const flows = screens.slice(0, -1).map((screen, index) => ({
    id: stableId(input.project.id, input.knowledge.graphVersion, `${template.id}-flow-${index}`),
    fromScreenId: screen.id,
    toScreenId: screens[index + 1].id,
    label: template.screens[index].primaryAction,
    truthStatus: 'AI_SUGGESTED' as const,
  }));
  const coveredIds = new Set(screens.flatMap((screen) => screen.sourceEntityIds));
  const uncoveredEntityIds = requirementEntities.map((entity) => entity.entityId).filter((entityId) => !coveredIds.has(entityId));
  const openQuestions = input.knowledge.clarificationQuestions.filter((question) => question.status === 'OPEN').map((question) => question.question);

  return WireframeHandoff.parse({
    id: stableId(input.project.id, input.knowledge.graphVersion, `${template.id}-handoff`),
    projectId: input.project.id,
    projectName: input.project.name,
    version: 1,
    templateId: template.id,
    templateName: template.name,
    sourceGraphVersion: input.knowledge.graphVersion,
    arbDecisionId: input.decision.id,
    hldDocumentId: input.hld.id,
    truthStatus: 'AI_SUGGESTED',
    reviewStatus: 'DRAFT',
    screens,
    flows,
    coverage: {
      totalEntityCount: requirementEntities.length,
      coveredEntityCount: requirementEntities.length - uncoveredEntityIds.length,
      uncoveredEntityIds,
    },
    groundedStatements,
    assumptions: [
      'Screen structure, actions, labels, and example records are design hypotheses rather than source facts.',
      'The selected template accelerates review but does not override project requirements or architecture constraints.',
      'Required loading, empty, validation, failure, permission, and recovery states must be reviewed before design approval.',
    ],
    openQuestions: openQuestions.length ? openQuestions : ['Which proposed interactions and screen states should the product owner approve for implementation?'],
    gaps: openGaps,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    generator: 'axiom-deterministic-wireframe-v2',
  });
}
