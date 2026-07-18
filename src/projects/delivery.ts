import { createHash } from 'node:crypto';
import {
  JiraBacklogPlan,
  type ArbDecision,
  type DocumentApproval,
  type JiraBacklogPlan as JiraBacklogPlanType,
  type JiraPublication,
  type Project,
  type ProjectKnowledge,
} from './schemas';

function compact(value: string, maximum: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

function hashPlan(value: Omit<JiraBacklogPlanType, 'sha256'>) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function compileJiraBacklogPlan(input: {
  project: Project;
  knowledge: ProjectKnowledge;
  documentApproval: DocumentApproval;
  decision: ArbDecision;
  generatedAt?: string;
}) {
  if (input.knowledge.graphVersion !== input.project.graphVersion || input.documentApproval.graphVersion !== input.project.graphVersion || input.decision.graphVersion !== input.project.graphVersion) {
    throw new Error('Backlog generation requires documents and architecture approved against the current graph');
  }
  const generatedAt = input.generatedAt ?? input.decision.approvedAt;
  const requirements = input.knowledge.entities.filter((entity) => entity.category === 'REQUIREMENT').slice(0, 12);
  const nfrs = input.knowledge.entities.filter((entity) => entity.category === 'NFR').slice(0, 8);
  const baseStories = requirements.map((requirement, index) => ({
    localId: `STORY-${String(index + 2).padStart(3, '0')}`,
    summary: compact(`Implement ${requirement.text.replace(/^(the\s+)?(?:system|service|product|user)\s+(?:must|shall|should)\s+/i, '')}`, 180),
    description: `Deliver the source-linked behavior in ${requirement.id}. Preserve the approved ${input.decision.optionName} boundaries and do not infer behavior beyond the canonical project graph.`,
    acceptanceCriteria: [
      `The behavior stated by ${requirement.id} is demonstrable end to end and remains traceable to ${requirement.sourceId ?? 'its approved graph evidence'}.`,
      'Validation, loading, empty, failure, and recovery behavior is implemented wherever the story introduces an asynchronous user action.',
      'Relevant tests cite the requirement ID and verification output is recorded only from executed repository-defined commands.',
    ],
    sourceEntityIds: [requirement.id],
    priority: 'P0' as const,
    truthStatus: 'AI_SUGGESTED' as const,
  }));
  const architectureStory = {
    localId: 'STORY-001',
    summary: compact(`Establish the approved ${input.decision.optionName} delivery foundation`, 180),
    description: `Create the minimum implementation boundary required by ${input.decision.id}. This story does not authorize repository writes until an allowlisted workspace is selected for coding.`,
    acceptanceCriteria: [
      `Implementation boundaries match the HUMAN_APPROVED architecture decision ${input.decision.id}.`,
      'Dependencies, configuration, failure boundaries, and observability hooks are explicit and reviewable.',
      'No verification result is claimed before its fixed command has executed.',
    ],
    sourceEntityIds: [input.decision.id],
    priority: 'P0' as const,
    truthStatus: 'AI_SUGGESTED' as const,
  };
  const nfrStory = nfrs.length ? {
    localId: `STORY-${String(baseStories.length + 2).padStart(3, '0')}`,
    summary: 'Implement and verify approved non-functional controls',
    description: 'Apply measurable performance, reliability, security, privacy, cost, and operability constraints that exist in the current graph. UNKNOWN targets remain clarification items and must not become fabricated gates.',
    acceptanceCriteria: [
      `Every implemented control maps to one of: ${nfrs.map((entity) => entity.id).join(', ')}.`,
      'Each measurable target has a repository-defined verification method; unresolved targets remain UNKNOWN.',
      'Failure output and measured values are stored without model modification.',
    ],
    sourceEntityIds: nfrs.map((entity) => entity.id),
    priority: 'P0' as const,
    truthStatus: 'AI_SUGGESTED' as const,
  } : null;
  const fallbackStory = requirements.length ? [] : [{
    localId: 'STORY-002',
    summary: 'Resolve functional scope before implementation',
    description: 'No source-grounded functional requirement exists in the approved graph. Resolve the functional-scope gap before authorizing code generation.',
    acceptanceCriteria: ['At least one functional requirement is human-confirmed or source-grounded.', 'The refreshed document baseline and architecture are re-approved before coding.'],
    sourceEntityIds: [],
    priority: 'P0' as const,
    truthStatus: 'AI_SUGGESTED' as const,
  }];
  const withoutHash = {
    id: `JIRA-PLAN-${input.project.id}-G${input.project.graphVersion}`,
    projectId: input.project.id,
    sourceGraphVersion: input.project.graphVersion,
    documentApprovalId: input.documentApproval.id,
    arbDecisionId: input.decision.id,
    epic: {
      summary: compact(`${input.project.name} — approved product delivery`, 180),
      description: `Implement the approved product baseline for ${input.project.name}. The epic is governed by graph v${input.project.graphVersion}, document approval ${input.documentApproval.id}, and architecture decision ${input.decision.id}.`,
      sourceEntityIds: input.knowledge.entities.map((entity) => entity.id),
      truthStatus: 'AI_SUGGESTED' as const,
    },
    stories: [architectureStory, ...baseStories, ...fallbackStory, ...(nfrStory ? [nfrStory] : [])],
    truthStatus: 'AI_SUGGESTED' as const,
    generatedAt,
  };
  return JiraBacklogPlan.parse({ ...withoutHash, sha256: hashPlan(withoutHash as JiraBacklogPlanType) });
}

export function compileCodingTaskPacket(plan: JiraBacklogPlanType, publication: JiraPublication, storyId: string) {
  const story = plan.stories.find((item) => item.localId === storyId);
  const jiraStory = publication.stories.find((item) => item.localId === storyId);
  if (!story || !jiraStory) throw new Error('Select a Jira-published story before preparing coding context');
  return `# Axiom Coding Task — ${jiraStory.key}\n\n## Objective\n\n${story.summary}\n\n## Approved scope\n\n${story.description}\n\n- Parent epic: ${publication.epicKey}\n- Jira story: ${jiraStory.key}\n- Canonical graph: v${plan.sourceGraphVersion}\n- Document approval: ${plan.documentApprovalId}\n- Architecture decision: ${plan.arbDecisionId}\n- Truth status: ${story.truthStatus}\n\n## Source-linked entities\n\n${story.sourceEntityIds.map((id) => `- ${id}`).join('\n') || '- UNKNOWN — functional scope must be resolved before implementation.'}\n\n## Acceptance criteria\n\n${story.acceptanceCriteria.map((criterion) => `- ${criterion}`).join('\n')}\n\n## Repository boundary\n\n- Coding may begin only after a repository workspace and write allowlist are explicitly selected.\n- Do not install model-selected packages or execute model-generated shell commands.\n- Preserve stable IDs and the approved architecture boundary.\n\n## Fixed verification commands\n\n- pnpm lint\n- pnpm typecheck\n- pnpm test\n- pnpm build\n\n## Definition of done\n\n- The visible user flow works for this story.\n- Inputs and outputs are validated.\n- Loading, empty, success, and failure states exist where applicable.\n- Relevant tests cite approved requirement IDs.\n- Evidence contains actual command, duration, exit code, and bounded output.\n- Failed commands remain FAILED; measured values are never rewritten by a model.\n`;
}
