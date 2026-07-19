import { createHash } from 'node:crypto';
import {
  ProjectDocument,
  type ArbDecision,
  type ArchitectureOption,
  type KnowledgeEntity,
  type Project,
  type ProjectDocument as ProjectDocumentType,
  type ProjectKnowledge,
  type ProjectSource,
} from './schemas';

function clean(value: string) {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ').trim();
}

function lines(entities: KnowledgeEntity[], category: KnowledgeEntity['category']) {
  const matches = entities.filter((entity) => entity.category === category);
  if (!matches.length) return '- **UNKNOWN** — No items are available.';
  return matches.map((entity) => `- **${entity.id}** [${entity.truthStatus}] ${entity.text}${entity.sourceId ? ` — Source: ${entity.sourceId}` : entity.clarificationQuestionId ? ` — Clarification: ${entity.clarificationQuestionId}` : ''}`).join('\n');
}

function documentControl(project: Project, knowledge: ProjectKnowledge, version: number, generatedAt: string, status = 'AI_SUGGESTED until human approval') {
  return `| Field | Value |
|---|---|
| Project ID | ${project.id} |
| Workspace ID | ${project.workspaceId} |
| Artifact version | ${version} |
| Source graph version | ${knowledge.graphVersion} |
| Generated | ${generatedAt} |
| Status | ${status} |
| Authority | Compiled view; the canonical Axiom project graph remains authoritative |`;
}

function sourceSet(sources: ProjectSource[]) {
  return sources.map((source) => `- **${source.id}** — ${source.name} (${source.mimeType}, ${source.status}) — SHA-256: ${source.sha256}`).join('\n') || '- **UNKNOWN** — No source artifacts are available.';
}

function gapsTable(knowledge: ProjectKnowledge) {
  if (!knowledge.gaps.length) return '| UNKNOWN | UNKNOWN | No structured gaps are available | UNKNOWN | UNKNOWN |';
  return knowledge.gaps.map((gap) => `| ${gap.id} | ${gap.severity} | ${clean(gap.title)} | ${gap.status} | ${clean(gap.affectedArtifacts.join(', '))} | ${clean(gap.rationale)} |`).join('\n');
}

function questions(knowledge: ProjectKnowledge) {
  if (!knowledge.clarificationQuestions.length) return '- **UNKNOWN** — No clarification questions are available.';
  return knowledge.clarificationQuestions.map((question) => `### ${question.id} — ${question.status}
${question.question}

- Why it matters: ${question.whyItMatters}
- Affects: ${question.affectedEntityIds.join(', ') || 'Project-level architecture and artifacts'}
- Answer: ${question.answer ?? 'UNKNOWN — awaiting human response'}
- Truth status: ${question.truthStatus}`).join('\n\n');
}

function readiness(knowledge: ProjectKnowledge) {
  if (!knowledge.readiness) return 'Readiness is UNKNOWN because a deterministic calculation is not available for this graph version.';
  return `**Overall readiness: ${knowledge.readiness.score}/100** (raw ${knowledge.readiness.rawScore}/100)

| Category | Score | Maximum | Open gaps | Explanation |
|---|---:|---:|---|---|
${knowledge.readiness.categories.map((category) => `| ${category.label} | ${category.score} | ${category.maximum} | ${category.openGapIds.join(', ') || 'None'} | ${clean(category.explanation)} |`).join('\n')}

${knowledge.readiness.caps.length ? `Caps applied:\n${knowledge.readiness.caps.map((cap) => `- ${cap}`).join('\n')}` : 'No score cap is currently applied.'}`;
}

function requirementsTable(knowledge: ProjectKnowledge, category: 'REQUIREMENT' | 'NFR') {
  const entities = knowledge.entities.filter((entity) => entity.category === category);
  if (!entities.length) return '| UNKNOWN | UNKNOWN | No items extracted | UNKNOWN | NEEDS_CLARIFICATION |';
  return entities.map((entity) => `| ${entity.id} | ${entity.truthStatus} | ${clean(entity.text)} | ${entity.sourceId ?? entity.clarificationQuestionId ?? 'UNKNOWN'} | ${entity.truthStatus === 'UNKNOWN' ? 'BLOCKED' : 'NEEDS_REVIEW'} |`).join('\n');
}

function acceptanceCriteria(knowledge: ProjectKnowledge) {
  const requirements = knowledge.entities.filter((entity) => entity.category === 'REQUIREMENT');
  if (!requirements.length) return '- **UNKNOWN** — No functional requirements are available for acceptance definition.';
  return requirements.map((entity) => `### ${entity.id}
- [AI_SUGGESTED] Demonstrate the outcome stated in ${entity.id} using the exact source-grounded behavior.
- [AI_SUGGESTED] Verify authorized and unauthorized actor behavior after the role clarification is resolved.
- [AI_SUGGESTED] Verify validation, empty, loading, failure, and recovery outcomes where the workflow applies.
- Source or answer: ${entity.sourceId ?? entity.clarificationQuestionId ?? 'UNKNOWN'}`).join('\n\n');
}

function answeredByCategory(knowledge: ProjectKnowledge, category: ProjectKnowledge['gaps'][number]['category']) {
  const gapIds = new Set(knowledge.gaps.filter((gap) => gap.category === category).map((gap) => gap.id));
  const matches = knowledge.clarificationQuestions.filter((question) => gapIds.has(question.gapId));
  return matches.map((question) => `- **${question.id}** [${question.truthStatus}] ${question.answer ?? 'UNKNOWN — awaiting answer'}`).join('\n') || '- **UNKNOWN** — This decision has not been confirmed.';
}

function inferNfr(entity: KnowledgeEntity) {
  const text = entity.text;
  const latency = /\b(p(?:95|99))?\s*(?:response(?:[- ]time)?|latency)[^\d]{0,30}(?:below|under|less than|<=?)?\s*([\d,.]+)\s*(ms|milliseconds?|s|seconds?)\b/i.exec(text);
  const availability = /\bavailability[^\d]{0,30}([\d.]+)\s*%/i.exec(text);
  const budget = /\b(?:budget|cost)[^\d$]{0,30}(?:usd|\$)?\s*([\d,.]+)\b/i.exec(text);
  if (latency) return { category: 'Performance', metric: `${latency[1]?.toLowerCase() ?? 'response'} latency`, target: `< ${latency[2]}`, unit: latency[3], verification: 'Defined load test with percentile assertion' };
  if (availability) return { category: 'Availability', metric: 'Service availability', target: `>= ${availability[1]}`, unit: 'percent', verification: 'Availability SLI review over the approved measurement window' };
  if (budget) return { category: 'Cost', metric: 'Monthly operating cost', target: `<= ${budget[1]}`, unit: 'USD/month', verification: 'Provider estimate review against the approved load assumptions' };
  if (/security|privacy|encrypt|authori[sz]|audit/i.test(text)) return { category: 'Security / privacy', metric: 'UNKNOWN', target: 'UNKNOWN', unit: 'UNKNOWN', verification: 'Threat-model and security-control review; automated tools do not certify compliance' };
  if (/reliab|retry|recovery|rto|rpo/i.test(text)) return { category: 'Reliability', metric: 'UNKNOWN', target: 'UNKNOWN', unit: 'UNKNOWN', verification: 'Failure-injection and recovery test after targets are confirmed' };
  return { category: 'Unclassified', metric: 'UNKNOWN', target: 'UNKNOWN', unit: 'UNKNOWN', verification: 'UNKNOWN — clarification required' };
}

function mermaidId(value: string, index: number) {
  const normalized = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
  return normalized || `Component${index + 1}`;
}

function architectureDiagrams(project: Project, option: ArchitectureOption) {
  const components = option.components.map((component, index) => ({ ...component, id: mermaidId(component.name, index) }));
  const chain = components.map((component) => component.id).join(' --> ');
  const componentNodes = components.map((component) => `    ${component.id}["${clean(component.name)}"]`).join('\n');
  const deploymentNodes = components.map((component, index) => `    ${component.id}["${clean(component.name)}\\n${clean(option.technologies[index % option.technologies.length] ?? 'Technology pending review')}"]`).join('\n');
  const sequenceParticipants = components.slice(0, 4).map((component) => `    participant ${component.id} as ${clean(component.name)}`).join('\n');
  const sequenceMessages = components.slice(0, 4).flatMap((component, index, values) => index < values.length - 1
    ? [`    ${component.id}->>+${values[index + 1].id}: ${clean(option.dataFlows[index] ?? 'Validated request')}`, `    ${values[index + 1].id}-->>-${component.id}: Outcome / status`]
    : []).join('\n');
  return `### System context diagram
\`\`\`mermaid
flowchart LR
    User["Product user"] --> AxiomSystem["${clean(project.name)}"]
    AxiomSystem --> External["Approved external services"]
    AxiomSystem --> Evidence["Audit and observability evidence"]
\`\`\`

### Component diagram
\`\`\`mermaid
flowchart LR
${componentNodes}
    ${chain}
\`\`\`

### Deployment diagram
\`\`\`mermaid
flowchart TB
    subgraph Runtime["${clean(option.deploymentModel)}"]
${deploymentNodes}
    end
    Edge["Client / edge"] --> ${components[0]?.id ?? 'Runtime'}
    ${components.at(-1)?.id ?? components[0]?.id ?? 'Runtime'} --> Observability["Logs, metrics, traces"]
\`\`\`

### Primary sequence diagram
\`\`\`mermaid
sequenceDiagram
    actor User
${sequenceParticipants}
    User->>+${components[0]?.id ?? 'Application'}: Submit validated request
${sequenceMessages}
    ${components[0]?.id ?? 'Application'}-->>-User: Confirmed outcome or recoverable error
\`\`\``;
}

function compileRequirements(project: Project, knowledge: ProjectKnowledge, sources: ProjectSource[], version: number, generatedAt: string) {
  return `# Requirements Catalogue — ${project.name}

## Document control
${documentControl(project, knowledge, version, generatedAt)}

## Executive summary
${knowledge.summary}

## Source set
${sourceSet(sources)}

## Readiness
${readiness(knowledge)}

## Functional requirements
| ID | Truth status | Statement | Provenance | Readiness |
|---|---|---|---|---|
${requirementsTable(knowledge, 'REQUIREMENT')}

## Non-functional requirements
| ID | Truth status | Statement | Provenance | Readiness |
|---|---|---|---|---|
${requirementsTable(knowledge, 'NFR')}

## Decisions
${lines(knowledge.entities, 'DECISION')}

## Constraints
${lines(knowledge.entities, 'CONSTRAINT')}

## Risks
${lines(knowledge.entities, 'RISK')}

## Gap register
| Gap ID | Severity | Title | Status | Affected artifacts | Rationale |
|---|---|---|---|---|---|
${gapsTable(knowledge)}

## Clarification queue
${questions(knowledge)}

## Acceptance criteria
${acceptanceCriteria(knowledge)}
`;
}

function compileSrs(project: Project, knowledge: ProjectKnowledge, sources: ProjectSource[], version: number, generatedAt: string) {
  return `# Software Requirements Specification — ${project.name}

## 1. Document control
${documentControl(project, knowledge, version, generatedAt)}

## 2. Purpose and scope
This SRS is a deterministic compiled view of the canonical Axiom project graph. It defines the currently grounded product intent, confirmed clarification answers, explicit unknowns, and review boundaries for ${project.name}. Direct edits to this document are not authoritative in the MVP.

### In scope
${lines(knowledge.entities, 'REQUIREMENT')}

### Out of scope
- **UNKNOWN** — Confirm exclusions through the clarification workflow before architecture approval.

## 3. Product overview
${knowledge.summary}

### Source baseline
${sourceSet(sources)}

### Requirement readiness
${readiness(knowledge)}

## 4. Actors and assumptions
### Actors and permissions
${answeredByCategory(knowledge, 'FUNCTIONAL_SCOPE')}

### Assumptions requiring review
${knowledge.gaps.filter((gap) => gap.status === 'OPEN').map((gap) => `- **${gap.id}** [UNKNOWN] ${gap.title}: ${gap.description}`).join('\n') || '- No open assumptions remain.'}

## 5. Functional requirements
| ID | Truth status | Statement | Source or answer | Readiness |
|---|---|---|---|---|
${requirementsTable(knowledge, 'REQUIREMENT')}

## 6. Non-functional requirements
| ID | Truth status | Statement | Source or answer | Readiness |
|---|---|---|---|---|
${requirementsTable(knowledge, 'NFR')}

See the separate NFR Specification for metrics, targets, rationale, and verification methods.

## 7. External interfaces
${answeredByCategory(knowledge, 'INTEGRATION')}

## 8. Business rules and constraints
### Confirmed decisions
${lines(knowledge.entities, 'DECISION')}

### Constraints
${lines(knowledge.entities, 'CONSTRAINT')}

### Data lifecycle
${answeredByCategory(knowledge, 'DATA')}

## 9. Risks and dependencies
${lines(knowledge.entities, 'RISK')}

### Gap-derived risks
${knowledge.gaps.filter((gap) => gap.status === 'OPEN').map((gap) => `- **${gap.id}** (${gap.severity}) ${gap.title} — impacts ${gap.impactAreas.join(', ')}.`).join('\n') || '- No open gap-derived risks.'}

## 10. Acceptance criteria
${acceptanceCriteria(knowledge)}

## 11. Traceability references
Every grounded item retains a stable entity ID and exact source artifact ID. Human-confirmed answers retain their clarification-question ID. Artifact hashes and graph version appear in document control.

| Entity | Provenance | Truth status |
|---|---|---|
${knowledge.entities.map((entity) => `| ${entity.id} | ${entity.sourceId ?? entity.clarificationQuestionId ?? 'UNKNOWN'} | ${entity.truthStatus} |`).join('\n') || '| UNKNOWN | UNKNOWN | UNKNOWN |'}

## 12. Open items
${questions(knowledge)}
`;
}

function compileNfr(project: Project, knowledge: ProjectKnowledge, version: number, generatedAt: string) {
  const rows = knowledge.entities.filter((entity) => entity.category === 'NFR').map((entity) => {
    const detail = inferNfr(entity);
    return `| ${entity.id} | ${detail.category} | ${clean(entity.text)} | ${detail.metric} | ${detail.target} | ${detail.unit} | Architecture suitability and release quality | ${entity.sourceId ?? entity.clarificationQuestionId ?? 'UNKNOWN'} | ${detail.verification} | ${entity.truthStatus} | UNKNOWN until verification executes |`;
  }).join('\n') || '| UNKNOWN | UNKNOWN | No measurable NFRs extracted | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Clarification required | UNKNOWN | UNKNOWN |';
  return `# Non-Functional Requirements Specification — ${project.name}

## Document control
${documentControl(project, knowledge, version, generatedAt)}

## Quality model
NFR recommendations and unresolved values remain AI_SUGGESTED or UNKNOWN. Runtime evidence is never inferred from this document.

## Confirmed operating constraints
${lines(knowledge.entities, 'CONSTRAINT')}

## Catalogue
| ID | Category | Statement | Metric | Target | Unit | Rationale | Source or answer | Verification method | Truth status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
${rows}

## NFR gaps
| Gap ID | Severity | Title | Status | Affected artifacts | Rationale |
|---|---|---|---|---|---|
${knowledge.gaps.filter((gap) => ['NFR', 'SECURITY_PRIVACY', 'FAILURE_HANDLING', 'DELIVERY'].includes(gap.category)).map((gap) => `| ${gap.id} | ${gap.severity} | ${clean(gap.title)} | ${gap.status} | ${gap.affectedArtifacts.join(', ')} | ${clean(gap.rationale)} |`).join('\n') || '| UNKNOWN | UNKNOWN | No NFR gap data | UNKNOWN | NFR | UNKNOWN |'}

## Verification boundary
- Metrics and thresholds are preserved only when they appear in a source or human-confirmed answer.
- Architecture estimates do not constitute measured performance, availability, security, accessibility, or cost evidence.
- Verification evidence remains UNKNOWN until the fixed verification runner executes the approved command.
`;
}

function compileProposedHld(project: Project, knowledge: ProjectKnowledge, _sources: ProjectSource[], version: number, generatedAt: string) {
  const option = knowledge.architectureOptions.find((candidate) => candidate.recommended) ?? knowledge.architectureOptions[0];
  if (!option) throw new Error('A proposed HLD requires at least one architecture option');
  return `# Proposed High-Level Design — ${project.name}

## Document control
${documentControl(project, knowledge, version, generatedAt, 'AI_SUGGESTED design proposal; final approval requires ARB')}

## 1. Design intent
${knowledge.summary}

This proposed HLD makes the design visible early enough for product and design review. It does not represent an approved architecture decision. The final HLD is regenerated after ARB approval.

## 2. Proposed architecture direction
- Direction: ${option.name}
- Deployment model: ${option.deploymentModel}
- Why proposed: ${option.why.join('; ')}
- Why it may not fit: ${option.whyNot.join('; ')}

## 3. Architecture diagrams
${architectureDiagrams(project, option)}

## 4. Component responsibilities
| Component | Responsibility |
|---|---|
${option.components.map((component) => `| ${clean(component.name)} | ${clean(component.responsibility)} |`).join('\n')}

## 5. Data flow
${option.dataFlows.map((flow, index) => `${index + 1}. ${flow}`).join('\n')}

## 6. Integration boundaries
${answeredByCategory(knowledge, 'INTEGRATION')}

## 7. Data and lifecycle
${answeredByCategory(knowledge, 'DATA')}

## 8. Security and privacy
${answeredByCategory(knowledge, 'SECURITY_PRIVACY')}

## 9. Failure and recovery
| Failure mode | Proposed mitigation |
|---|---|
${option.failureModes.map((failure) => `| ${clean(failure.failure)} | ${clean(failure.mitigation)} |`).join('\n')}

## 10. Technology direction
| Layer | Recommendation | Rationale | Alternatives | Status |
|---|---|---|---|---|
${knowledge.techStack.map((item) => `| ${item.layer} | ${clean(item.recommendation)} | ${clean(item.rationale)} | ${clean(item.alternatives.join('; '))} | ${item.truthStatus} |`).join('\n') || '| UNKNOWN | UNKNOWN | Awaiting analysis | UNKNOWN | UNKNOWN |'}

## 11. Delivery constraints
${answeredByCategory(knowledge, 'DELIVERY')}

## 12. Open design decisions
${knowledge.gaps.filter((gap) => gap.status === 'OPEN').map((gap) => `- **${gap.id}** (${gap.severity}) ${gap.title}`).join('\n') || '- No open design decisions.'}

## 13. Review boundary
- Product approval confirms the document baseline and may unlock an optional wireflow.
- ARB approval remains a later explicit decision and produces the final HUMAN_APPROVED ADR and HLD.
- Diagrams, technologies, costs, and unverified quality claims remain AI_SUGGESTED or UNKNOWN until approved or measured.
`;
}

function versionFor(type: ProjectDocumentType['type'], previous: ProjectDocumentType[] = []) {
  return Math.max(0, ...previous.filter((item) => item.type === type).map((item) => item.version)) + 1;
}

function createDocument(input: {
  project: Project;
  knowledge: ProjectKnowledge;
  type: ProjectDocumentType['type'];
  title: string;
  content: string;
  version: number;
  generatedAt: string;
  truthStatus?: ProjectDocumentType['truthStatus'];
}) {
  const content = input.content.trim();
  return ProjectDocument.parse({
    id: `DOC-${input.type.toUpperCase()}-${input.project.id}`,
    projectId: input.project.id,
    type: input.type,
    version: input.version,
    sourceGraphVersion: input.knowledge.graphVersion,
    title: input.title,
    content,
    sha256: createHash('sha256').update(content).digest('hex'),
    truthStatus: input.truthStatus ?? 'AI_SUGGESTED',
    generatedAt: input.generatedAt,
  });
}

export function compileProjectDocuments(input: {
  project: Project;
  knowledge: ProjectKnowledge;
  sources: ProjectSource[];
  previousDocuments?: ProjectDocumentType[];
  generatedAt?: string;
}) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const definitions = [
    { type: 'requirements' as const, title: 'Requirements Catalogue', compile: compileRequirements },
    { type: 'srs' as const, title: 'Software Requirements Specification', compile: compileSrs },
    { type: 'nfr' as const, title: 'Non-Functional Requirements Specification', compile: (project: Project, knowledge: ProjectKnowledge, _sources: ProjectSource[], version: number, at: string) => compileNfr(project, knowledge, version, at) },
    { type: 'hld' as const, title: 'Proposed High-Level Design', compile: compileProposedHld },
  ];
  return definitions.map((definition) => {
    const version = versionFor(definition.type, input.previousDocuments);
    return createDocument({
      project: input.project,
      knowledge: input.knowledge,
      type: definition.type,
      title: definition.title,
      content: definition.compile(input.project, input.knowledge, input.sources, version, generatedAt),
      version,
      generatedAt,
    });
  });
}

function selectedOption(knowledge: ProjectKnowledge, decision: ArbDecision) {
  const option = knowledge.architectureOptions.find((candidate) => candidate.id === decision.optionId);
  if (!option) throw new Error('Approved architecture option is missing from the current graph');
  return option;
}

export function compileHldDocument(input: {
  project: Project;
  knowledge: ProjectKnowledge;
  decision: ArbDecision;
  previousDocuments?: ProjectDocumentType[];
  generatedAt?: string;
}) {
  if (input.decision.graphVersion !== input.knowledge.graphVersion) throw new Error('Approved ARB decision is stale for the current graph');
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const version = versionFor('hld', input.previousDocuments);
  const option = selectedOption(input.knowledge, input.decision);
  const content = `# High-Level Design — ${input.project.name}

## Document control
${documentControl(input.project, input.knowledge, version, generatedAt, 'HUMAN_APPROVED architecture compiled from the ARB-approved canonical graph')}

- ARB decision: ${input.decision.id} v${input.decision.version} [${input.decision.truthStatus}]

## 1. System context
${input.knowledge.summary}

The design consumes the canonical graph at version ${input.knowledge.graphVersion}. Open non-blocking gaps remain visible and are not silently treated as approved behavior.

### Architecture diagrams
${architectureDiagrams(input.project, option)}

## 2. Selected architecture
- Selected option: ${input.decision.optionName}
- Deployment model: ${option.deploymentModel}
- Recommendation status before approval: ${option.truthStatus}
- Approval status: ${input.decision.truthStatus}
- Rationale: ${input.decision.rationale.join('; ')}

## 3. Component responsibilities
| Component | Responsibility |
|---|---|
${option.components.map((component) => `| ${clean(component.name)} | ${clean(component.responsibility)} |`).join('\n')}

## 4. Data flow
${option.dataFlows.map((flow, index) => `${index + 1}. ${flow}`).join('\n')}

## 5. External integrations
${answeredByCategory(input.knowledge, 'INTEGRATION')}

Recommended boundary: versioned contracts behind adapters with explicit authentication, timeouts, idempotency, ownership, and degraded behavior.

## 6. Data stores
${answeredByCategory(input.knowledge, 'DATA')}

AI_SUGGESTED baseline: a managed relational source of truth for transactional state and audit history, plus object storage only for confirmed document/blob requirements.

## 7. Tenant and ownership isolation
${answeredByCategory(input.knowledge, 'FUNCTIONAL_SCOPE')}

Isolation is UNKNOWN until roles, record ownership, and tenancy are explicitly confirmed.

## 8. Security boundaries
${answeredByCategory(input.knowledge, 'SECURITY_PRIVACY')}

Security validation requires threat-model review and real verification evidence; this HLD does not claim certification.

## 9. Failure handling
${answeredByCategory(input.knowledge, 'FAILURE_HANDLING')}

| Failure mode | Mitigation |
|---|---|
${option.failureModes.map((failure) => `| ${clean(failure.failure)} | ${clean(failure.mitigation)} |`).join('\n')}

## 10. Scalability and performance
${answeredByCategory(input.knowledge, 'NFR')}

Architecture estimates remain AI_SUGGESTED until load assumptions and verification thresholds are confirmed.

## 11. Observability
- Propagate one correlation identifier across user requests, database work, integrations, and asynchronous handlers.
- Emit structured logs with secrets and sensitive fields removed.
- Define service-level indicators only after NFR metrics and measurement windows are approved.
- Connect executed verification evidence to the requirement, decision, artifact, command, and graph version.

## 12. Deployment view
${option.deploymentModel}

Key technologies: ${option.technologies.join(', ')}.

## 13. Assumptions
${option.assumptions.map((assumption) => `- [AI_SUGGESTED] ${assumption}`).join('\n')}

## 14. Risks
${input.decision.risks.map((risk) => `- ${risk}`).join('\n')}
${lines(input.knowledge.entities, 'RISK')}

## 15. Rejected alternatives
${input.knowledge.architectureOptions.filter((candidate) => candidate.id !== option.id).map((candidate) => `### ${candidate.name}
${candidate.whyNot.map((reason) => `- ${reason}`).join('\n')}`).join('\n\n')}

## 16. Reconsideration triggers
${option.reconsiderationTriggers.map((trigger) => `- **${trigger.metric}:** ${trigger.condition}`).join('\n')}

## 17. Technology recommendation
| Layer | Recommendation | Rationale | Alternatives | Status |
|---|---|---|---|---|
${input.knowledge.techStack.map((item) => `| ${item.layer} | ${clean(item.recommendation)} | ${clean(item.rationale)} | ${clean(item.alternatives.join('; '))} | ${item.truthStatus} |`).join('\n') || '| UNKNOWN | UNKNOWN | No recommendation available | UNKNOWN | UNKNOWN |'}

## 18. Wireframe handoff
Axiom Wireframe Studio may compile source-linked design hypotheses from this current HLD. Screens, interactions, roles, and example records remain AI_SUGGESTED until design review and approval.
`;
  return createDocument({ project: input.project, knowledge: input.knowledge, type: 'hld', title: 'Approved High-Level Design', content, version, generatedAt, truthStatus: 'HUMAN_APPROVED' });
}

export function compileAdrDocument(input: {
  project: Project;
  knowledge: ProjectKnowledge;
  decision: ArbDecision;
  previousDocuments?: ProjectDocumentType[];
  generatedAt?: string;
}) {
  if (input.decision.graphVersion !== input.knowledge.graphVersion) throw new Error('Approved ARB decision is stale for the current graph');
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const version = versionFor('adr', input.previousDocuments);
  const option = selectedOption(input.knowledge, input.decision);
  const alternatives = input.knowledge.architectureOptions.filter((candidate) => candidate.id !== option.id);
  const content = `# ${input.decision.id} — Select the architecture for ${input.project.name}

## Document control
${documentControl(input.project, input.knowledge, version, generatedAt, 'HUMAN_APPROVED decision compiled from the canonical graph')}

## Status
${input.decision.truthStatus}

## Date
${input.decision.approvedAt}

## Context
${input.knowledge.summary}

## Decision question
Which architecture should govern the current approved scope of ${input.project.name}?

## Selected option
**${option.name}** — ${option.summary}

## Rationale
${input.decision.rationale.map((reason) => `- ${reason}`).join('\n')}

## Alternatives considered
${alternatives.map((candidate) => `- ${candidate.name}: ${candidate.summary}`).join('\n')}

## Why not the alternatives
${alternatives.map((candidate) => `### ${candidate.name}
${candidate.whyNot.map((reason) => `- ${reason}`).join('\n')}`).join('\n\n')}

## Consequences
- The team accepts the selected deployment model: ${option.deploymentModel}
- The team must preserve the listed component boundaries and verify the documented failure mitigations.
- Open non-blocking gaps remain UNKNOWN and may trigger a new graph version and superseding ADR.

## Risks
${input.decision.risks.map((risk) => `- ${risk}`).join('\n')}

## Assumptions
${option.assumptions.map((assumption) => `- ${assumption}`).join('\n')}

## Verification expectations
- Validate architecture boundaries through code structure and contract tests.
- Execute real unit, API, and coverage commands before claiming implementation proof.
- Do not treat estimates as measured performance, reliability, security, accessibility, or cost evidence.

## Reconsideration triggers
${option.reconsiderationTriggers.map((trigger) => `- **${trigger.metric}:** ${trigger.condition}`).join('\n')}

## Approval
- Decision ID: ${input.decision.id}
- Approved option ID: ${input.decision.optionId}
- Approved graph version: ${input.decision.graphVersion}
- Truth status: ${input.decision.truthStatus}
- Approved at: ${input.decision.approvedAt}
`;
  return createDocument({ project: input.project, knowledge: input.knowledge, type: 'adr', title: 'Architecture Decision Record', content, version, generatedAt, truthStatus: 'HUMAN_APPROVED' });
}

export function compileArchitectureDocuments(input: {
  project: Project;
  knowledge: ProjectKnowledge;
  decision: ArbDecision;
  previousDocuments?: ProjectDocumentType[];
  generatedAt?: string;
}) {
  return [compileAdrDocument(input), compileHldDocument(input)];
}

export function architectureComparisonMarkdown(options: ArchitectureOption[]) {
  return `| Option | Recommended | Deployment | Technologies | Cost estimate | Why | Why not |
|---|---|---|---|---|---|---|
${options.map((option) => `| ${clean(option.name)} | ${option.recommended ? 'Yes — AI_SUGGESTED' : 'No'} | ${clean(option.deploymentModel)} | ${clean(option.technologies.join(', '))} | ${clean(`${option.estimatedCost.range}: ${option.estimatedCost.basis}`)} | ${clean(option.why.join('; '))} | ${clean(option.whyNot.join('; '))} |`).join('\n')}`;
}
