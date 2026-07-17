import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  ArtifactPack,
  ArtifactCompileRequest,
  ArtifactType,
  EngineeringConstitution,
  type AnalysisResult,
  type ArchitectureDecision,
  type Artifact,
  type ArtifactPack as ArtifactPackType,
  type ConstitutionRule,
} from '../domain/schemas';
import { resolvedGaps } from '../domain/day2';

export const OpenApiDocument = z.object({
  openapi: z.literal('3.1.0'),
  info: z.object({ title: z.string(), version: z.string(), description: z.string() }),
  paths: z.object({
    '/notifications': z.object({ post: z.record(z.string(), z.unknown()) }),
    '/notifications/{id}': z.object({ get: z.record(z.string(), z.unknown()) }),
  }),
  components: z.object({
    securitySchemes: z.record(z.string(), z.unknown()),
    schemas: z.record(z.string(), z.unknown()),
  }),
  'x-axiom-metadata': z.object({
    projectId: z.string(),
    sourceGraphVersion: z.number(),
    generatedAt: z.string(),
    compiledView: z.literal(true),
  }),
}).strict();

type ArtifactTypeValue = z.infer<typeof ArtifactType>;
type CompileInput = Pick<z.infer<typeof ArtifactCompileRequest>, 'analysis' | 'decision' | 'previousPack'>;

const artifactDefinitions: Array<{ id: string; type: ArtifactTypeValue }> = [
  { id: 'ART-SRS-001', type: 'srs' },
  { id: 'ART-NFR-001', type: 'nfr' },
  { id: 'ART-HLD-001', type: 'hld' },
  { id: 'ART-ADR-001', type: 'adr' },
  { id: 'ART-OPENAPI-001', type: 'openapi' },
  { id: 'ART-TEST-001', type: 'test-strategy' },
  { id: 'ART-BACKLOG-001', type: 'backlog' },
  { id: 'ART-CODEX-001', type: 'codex-task' },
  { id: 'ART-CONSTITUTION-001', type: 'constitution' },
];

function sha256(content: string) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function selectedOption(analysis: AnalysisResult, decision: ArchitectureDecision) {
  const option = analysis.architectureOptions.find((candidate) => candidate.id === decision.selectedOptionId);
  if (!option) throw new Error(`Approved architecture option ${decision.selectedOptionId} does not exist`);
  return option;
}

function answeredClarifications(analysis: AnalysisResult) {
  return analysis.clarificationQuestions.filter((question) => question.answer).map((question) => ({
    id: question.id,
    question: question.text,
    answer: question.answer?.value ?? 'UNKNOWN',
    affectedEntityIds: question.affectedEntityIds,
  }));
}

function documentHeader(title: string, analysis: AnalysisResult, version: number, generatedAt: string) {
  return `# ${title}

## Document control

| Field | Value |
|---|---|
| Version | ${version} |
| Date | ${generatedAt.slice(0, 10)} |
| Project ID | ${analysis.projectId} |
| Source graph version | ${analysis.graphVersion} |
| Authority | Compiled view; canonical graph remains authoritative |
`;
}

function bulletList(items: string[], empty = 'UNKNOWN') {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${empty}`;
}

function requirementLines(analysis: AnalysisResult, kind: 'functional' | 'non-functional') {
  const requirements = kind === 'functional'
    ? analysis.functionalRequirements
    : analysis.nonFunctionalRequirements;
  return requirements.map((requirement) => {
    const sources = requirement.sourceEvidence.map((evidence) => evidence.spanId).filter(Boolean).join(', ') || 'UNKNOWN';
    return `- **${requirement.id}** [${requirement.truthStatus}] ${requirement.text} _(source: ${sources})_`;
  }).join('\n');
}

function compileSrs(analysis: AnalysisResult, version: number, generatedAt: string) {
  return `${documentHeader('NotifyFlow Software Requirements Specification', analysis, version, generatedAt)}
## Purpose and scope

${analysis.productObjective}

## Product overview

NotifyFlow is a multi-tenant AWS notification service for email and SMS submission, delivery status, and audit history.

## Actors and assumptions

${bulletList(analysis.assumptions.map((assumption) => `${assumption.id} [${assumption.truthStatus}] ${assumption.text}`))}

## Functional requirements

${requirementLines(analysis, 'functional')}

## Non-functional requirements

${requirementLines(analysis, 'non-functional')}

## External interfaces

- Email and SMS provider interfaces are required; provider selection remains UNKNOWN.
- AWS is a source-grounded deployment constraint.

## Business rules and constraints

${bulletList(answeredClarifications(analysis).map((answer) => `${answer.id} [USER_PROVIDED] ${answer.answer}`))}

## Risks and dependencies

${bulletList(analysis.risks.map((risk) => `${risk.id} [${risk.truthStatus}] ${risk.title}: ${risk.mitigation}`))}

## Acceptance criteria

- Detailed per-requirement acceptance criteria remain UNKNOWN until the implementation backlog is approved.

## Traceability references

- Source document: ${analysis.sourceDocument.id}
- Architecture decision: ADR-001

## Open items

${bulletList(resolvedGaps(analysis.clarificationQuestions, analysis.gaps).filter((gap) => !gap.resolved).map((gap) => `${gap.id} [UNKNOWN] ${gap.title}`), 'No open gaps recorded')}
`;
}

function compileNfr(analysis: AnalysisResult, version: number, generatedAt: string) {
  const rows = analysis.nonFunctionalRequirements.map((requirement) => {
    const source = requirement.sourceEvidence.map((evidence) => evidence.spanId).filter(Boolean).join(', ') || 'UNKNOWN';
    const details = requirement.id.includes('SEC')
      ? ['Security', 'Cross-tenant data exposure', 'No tenant data visible to another tenant', 'record', 'Protect tenant confidentiality', 'tenant-isolation-api-test']
      : requirement.id.includes('COST')
        ? ['Cost', 'Estimated monthly AWS cost', '< 1,000', 'USD/month', 'Meet the source-grounded MVP budget', 'estimate-review']
        : requirement.id.includes('SCALE')
          ? ['Performance', 'Monthly notification volume', '1,000,000', 'notifications/month', 'Size the approved architecture to expected demand', 'load-model-review']
          : ['Delivery', 'Time to first usable release', 'UNKNOWN', 'UNKNOWN', 'Preserve the requested delivery urgency without inventing a date', 'plan-review'];
    return `| ${requirement.id} | ${details[0]} | ${requirement.text} | ${details[1]} | ${details[2]} | ${details[3]} | ${details[4]} | ${source} | ${requirement.truthStatus} | ${details[5]} | UNKNOWN until executed |`;
  }).join('\n');
  return `${documentHeader('NotifyFlow Non-Functional Requirements', analysis, version, generatedAt)}
## NFR register

| ID | Category | Statement | Metric | Target | Unit | Rationale | Source | Truth status | Verification method | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
${rows}

## Known unknowns

${bulletList(resolvedGaps(analysis.clarificationQuestions, analysis.gaps).filter((gap) => !gap.resolved).map((gap) => `${gap.id}: ${gap.title}`), 'No open gaps recorded')}
`;
}

function compileHld(analysis: AnalysisResult, decision: ArchitectureDecision, version: number, generatedAt: string) {
  const option = selectedOption(analysis, decision);
  return `${documentHeader('NotifyFlow High-Level Design', analysis, version, generatedAt)}
## System context

${analysis.productObjective}

## Selected architecture

**${option.name}** — ${option.summary}

## Components and responsibilities

${bulletList(option.components)}

## Data flow

${bulletList(option.dataFlows)}

## External integrations and data stores

${bulletList(option.technologies)}

## Data stores

- The approved option uses its status store and audit log; exact physical schemas remain UNKNOWN until controlled code generation.

## Tenant isolation and security boundaries

${option.security}

## Failure handling

${bulletList(option.failureModes.map((failure) => `${failure.mode}: ${failure.mitigation}`))}

## Scalability and observability

- Scalability: ${option.scalability}
- Reliability: ${option.reliability}
- Observability details beyond CloudWatch remain UNKNOWN.

## Deployment view

${option.deploymentModel}

## Assumptions and risks

${bulletList(option.assumptions)}

## Risks

${bulletList(decision.risks)}

## Rejected alternatives

${bulletList(decision.rejectedAlternatives.map((alternative) => `${alternative.optionId}: ${alternative.whyRejected.join('; ')}`))}

## Reconsideration triggers

${bulletList(decision.reconsiderationTriggers)}
`;
}

function compileAdr(analysis: AnalysisResult, decision: ArchitectureDecision, version: number, generatedAt: string) {
  const option = selectedOption(analysis, decision);
  return `${documentHeader(`${decision.id}: ${decision.decisionQuestion}`, analysis, version, generatedAt)}
## Status and approval

- Status: Approved
- Truth status: ${decision.truthStatus}
- Approved at: ${decision.approvedAt}

## Context

${analysis.productObjective}

## Decision question

${decision.decisionQuestion}

## Selected option

${option.name}

## Rationale

${bulletList(decision.rationale)}

## Alternatives considered and why not

${bulletList(decision.rejectedAlternatives.map((alternative) => `${alternative.optionId}: ${alternative.whyRejected.join('; ')}`))}

## Consequences and risks

${bulletList(decision.risks)}

## Assumptions

${bulletList(decision.approvedAssumptions)}

## Verification expectations

- Build, unit, API, and coverage commands must execute before proof is claimed.

## Reconsideration triggers

${bulletList(decision.reconsiderationTriggers)}

## Approval

The selected option was explicitly approved with ${decision.truthStatus} status against graph version ${decision.graphVersion}.
`;
}

function compileOpenApi(analysis: AnalysisResult, version: number, generatedAt: string) {
  const document = OpenApiDocument.parse({
    openapi: '3.1.0',
    info: {
      title: 'NotifyFlow API',
      version: String(version),
      description: 'Compiled contract for the approved NotifyFlow vertical slice. External delivery remains mocked.',
    },
    paths: {
      '/notifications': {
        post: {
          operationId: 'createNotification',
          summary: 'Accept a tenant-scoped notification',
          description: 'Tenant identity is derived from the authenticated bearer token, never trusted from the request body.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'Idempotency-Key', in: 'header', required: true, description: 'Deduplicates retries within the trusted tenant scope.', schema: { type: 'string', minLength: 1 } },
            { name: 'X-Correlation-ID', in: 'header', required: false, description: 'Caller-provided trace identifier; the service returns one when omitted.', schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/CreateNotificationRequest' },
                examples: { email: { value: { channel: 'email', recipient: 'customer@example.com', message: 'Your order shipped.' } } },
              },
            },
          },
          responses: {
            '202': {
              description: 'Notification accepted',
              headers: { 'X-Correlation-ID': { schema: { type: 'string' }, description: 'Trace identifier for this request.' } },
              content: { 'application/json': { schema: { '$ref': '#/components/schemas/Notification' } } },
            },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
            '401': { description: 'Missing or invalid trusted tenant context' },
          },
        },
      },
      '/notifications/{id}': {
        get: {
          operationId: 'getNotification',
          summary: 'Retrieve a notification within trusted tenant context',
          description: 'The resource is returned only when its tenant matches the authenticated tenant context.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'X-Correlation-ID', in: 'header', required: false, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Notification status', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Notification' } } } },
            '404': { description: 'Not found in tenant scope', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
          },
        },
      },
    },
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
      schemas: {
        CreateNotificationRequest: {
          type: 'object', required: ['channel', 'recipient', 'message'], additionalProperties: false,
          properties: { channel: { enum: ['email', 'sms'] }, recipient: { type: 'string' }, message: { type: 'string' } },
        },
        Notification: {
          type: 'object', required: ['id', 'channel', 'status', 'correlationId'], additionalProperties: false,
          properties: {
            id: { type: 'string', example: 'ntf_01JABC' },
            channel: { type: 'string', enum: ['email', 'sms'] },
            status: { type: 'string', enum: ['accepted', 'queued', 'sending', 'delivered', 'failed'] },
            correlationId: { type: 'string', example: 'corr_01JABC' },
          },
        },
        Error: {
          type: 'object', required: ['code', 'message', 'correlationId'], additionalProperties: false,
          properties: { code: { type: 'string' }, message: { type: 'string' }, correlationId: { type: 'string' } },
        },
      },
    },
    'x-axiom-metadata': {
      projectId: analysis.projectId,
      sourceGraphVersion: analysis.graphVersion,
      generatedAt,
      compiledView: true,
    },
  });
  return JSON.stringify(document, null, 2);
}

function compileTestStrategy(analysis: AnalysisResult, version: number, generatedAt: string) {
  return `${documentHeader('NotifyFlow Test Strategy', analysis, version, generatedAt)}
## Scope and risk priorities

- P0: tenant isolation, validation, idempotency, status retrieval, and audit behavior.

## Unit tests

- Validate notification input and retry/idempotency domain rules.

## API tests

- Exercise POST /notifications and GET /notifications/{id}, including validation and cross-tenant denial.

## Contract tests

- Parse OpenAPI 3.1 and verify request, response, error, idempotency, tenant, status, and correlation-ID behavior.

## Performance tests

- Performance execution: UNKNOWN until a real benchmark runs.

## Security checks

- Security result: UNKNOWN until a real approved scan runs.

## Accessibility checks

- Accessibility result: UNKNOWN; no generated admin UI is in the selected slice.

## Test data and environment

- Synthetic NotifyFlow data only; external email and SMS delivery mocked.

## Entry and exit criteria

- Entry: code approved for verification.
- Exit: fixed build, unit, API, and coverage commands complete with stored evidence.

## Requirement mapping

${bulletList([...analysis.functionalRequirements, ...analysis.nonFunctionalRequirements].map((requirement) => `${requirement.id}: test mapping pending implementation`))}

## Known manual checks

- Provider outage recovery and AWS-region configuration remain manual or UNKNOWN.
`;
}

function compileBacklog(analysis: AnalysisResult, version: number, generatedAt: string) {
  return `${documentHeader('NotifyFlow Implementation Backlog', analysis, version, generatedAt)}
## Epic EPIC-001 — Tenant-safe notification API

Linked requirements: ${analysis.functionalRequirements.map((requirement) => requirement.id).join(', ')}

### STORY-001 — Accept notifications

- Priority: P0
- Acceptance: validate email/SMS input, derive tenant from trusted context, require idempotency key.
- Dependencies: approved OpenAPI and ADR-001.

### STORY-002 — Retrieve notification status

- Priority: P0
- Acceptance: retrieve by ID only within the authenticated tenant scope.
- Dependencies: STORY-001.

### STORY-003 — Audit and verify behavior

- Priority: P0
- Acceptance: create audit events and tests linked to requirement IDs.
- Dependencies: STORY-001, STORY-002.

## Selected for build

STORY-001 through STORY-003 form the first controlled vertical slice.

## Deferred

- Real email/SMS delivery, admin dashboard, security scan, and performance execution remain deferred or UNKNOWN.
`;
}

function compileCodexTask(analysis: AnalysisResult, decision: ArchitectureDecision, constitution: EngineeringConstitution, version: number, generatedAt: string) {
  return `${documentHeader('Codex Task Packet: NotifyFlow API Slice', analysis, version, generatedAt)}
## Scope

Implement POST /notifications and GET /notifications/{id} in the controlled starter workspace only.

## Required behavior

- Input validation, trusted tenant context, idempotency, audit event, initial status, and tenant-isolated retrieval.
- External email and SMS delivery must remain mocked.

## Governing decision

${decision.id} — ${selectedOption(analysis, decision).name}

## Required files

- Exact allowlisted paths are defined by the controlled-code milestone, not by this document.

## Approved constitution context

${bulletList(constitution.rules.map((rule) => `${rule.id} [${rule.truthStatus}] ${rule.statement} Verification: ${rule.verificationMethod}.`))}

## Acceptance criteria

- Generated tests cite requirement IDs.
- Verification runs only fixed commands defined in repository code.
- No result is marked verified without executed evidence.

## Definition of done

- Build, unit, API, and coverage commands execute and evidence is stored honestly.
`;
}

function constitutionRules(analysis: AnalysisResult, decision: ArchitectureDecision): ConstitutionRule[] {
  const answers = answeredClarifications(analysis);
  const answerText = (id: string) => answers.find((answer) => answer.id === id)?.answer;
  return [
    { id:'ARCH-001',category:'architecture',statement:`Implementation must preserve the approved ${selectedOption(analysis,decision).name} boundaries.`,severity:'blocker',rationale:'Code must implement the human-approved ADR.',verificationMethod:'static-review',threshold:null,status:'proposed',truthStatus:'HUMAN_APPROVED',linkedEntityIds:[decision.id] },
    { id:'QUAL-001',category:'quality',statement:'Line coverage should be at least 80 percent for the generated slice.',severity:'high',rationale:'Suggested quality gate pending explicit rule approval.',verificationMethod:'vitest-coverage',threshold:{metric:'lineCoverage',operator:'gte',value:80},status:'proposed',truthStatus:'AI_SUGGESTED',linkedEntityIds:analysis.functionalRequirements.map((requirement)=>requirement.id) },
    { id:'SEC-001',category:'security',statement:answerText('CQ-TENANT')??'Trusted tenant identity source remains UNKNOWN.',severity:'blocker',rationale:'Tenant isolation is a P0 source-grounded requirement.',verificationMethod:'api-test',threshold:null,status:'proposed',truthStatus:answerText('CQ-TENANT')?'USER_PROVIDED':'UNKNOWN',linkedEntityIds:['NFR-SEC-001','CQ-TENANT'] },
    { id:'TEST-001',category:'testing',statement:'Generated tests must map to requirement IDs and verification results must come from executed fixed commands.',severity:'blocker',rationale:'Traceability and honest evidence are P0 controls.',verificationMethod:'test-mapping-review',threshold:null,status:'proposed',truthStatus:'AI_SUGGESTED',linkedEntityIds:analysis.functionalRequirements.map((requirement)=>requirement.id) },
    { id:'A11Y-001',category:'accessibility',statement:'Admin dashboard accessibility target remains UNKNOWN.',severity:'medium',rationale:'The brief requests a dashboard but provides no measurable target.',verificationMethod:'manual-review',threshold:null,status:'proposed',truthStatus:'UNKNOWN',linkedEntityIds:[] },
    { id:'PERF-001',category:'performance',statement:answerText('CQ-LOAD')??'Peak load and delivery latency remain UNKNOWN.',severity:'high',rationale:'Performance targets govern async design and later verification.',verificationMethod:'performance-test',threshold:null,status:'proposed',truthStatus:answerText('CQ-LOAD')?'USER_PROVIDED':'UNKNOWN',linkedEntityIds:['CQ-LOAD'] },
    { id:'DEPLOY-001',category:'deployment',statement:'The first release must deploy to AWS in the approved architecture boundary.',severity:'high',rationale:'AWS is a source-grounded deployment constraint.',verificationMethod:'deployment-config-review',threshold:null,status:'proposed',truthStatus:'SOURCE_GROUNDED',linkedEntityIds:['NFR-COST-001',decision.id] },
    { id:'COST-001',category:'cost',statement:'Estimated AWS MVP cost must remain below USD 1,000 per month.',severity:'high',rationale:'Source-grounded budget constraint; estimates are not runtime evidence.',verificationMethod:'estimate-review',threshold:{metric:'monthlyCostUsd',operator:'lt',value:1000},status:'proposed',truthStatus:'SOURCE_GROUNDED',linkedEntityIds:['NFR-COST-001'] },
    { id:'DEL-001',category:'delivery',statement:'Only fixed repository-defined verification commands may execute.',severity:'blocker',rationale:'Prevents model-generated command execution and fabricated evidence.',verificationMethod:'runner-registry-review',threshold:null,status:'proposed',truthStatus:'AI_SUGGESTED',linkedEntityIds:[decision.id] },
  ];
}

export function compileArtifactPack(input: CompileInput, generatedAt = new Date().toISOString()): ArtifactPackType {
  const parsed = ArtifactCompileRequest.parse(input);
  const { analysis, decision, previousPack } = parsed;
  const constitutionVersion = (previousPack?.constitution.version ?? 0) + 1;
  const constitution = EngineeringConstitution.parse({
    id: 'CONST-001', projectId: analysis.projectId, version: constitutionVersion,
    sourceGraphVersion: analysis.graphVersion, architectureDecisionId: decision.id,
    generatedAt, truthStatus: 'AI_SUGGESTED', rules: constitutionRules(analysis, decision),
  });
  const previousById = new Map(previousPack?.artifacts.map((artifact) => [artifact.id, artifact]));
  const contentByType = new Map<ArtifactTypeValue, (version: number) => string>([
    ['srs', (version) => compileSrs(analysis, version, generatedAt)],
    ['nfr', (version) => compileNfr(analysis, version, generatedAt)],
    ['hld', (version) => compileHld(analysis, decision, version, generatedAt)],
    ['adr', (version) => compileAdr(analysis, decision, version, generatedAt)],
    ['openapi', (version) => compileOpenApi(analysis, version, generatedAt)],
    ['test-strategy', (version) => compileTestStrategy(analysis, version, generatedAt)],
    ['backlog', (version) => compileBacklog(analysis, version, generatedAt)],
    ['codex-task', (version) => compileCodexTask(analysis, decision, constitution, version, generatedAt)],
    ['constitution', () => JSON.stringify(constitution, null, 2)],
  ]);
  const artifacts: Artifact[] = artifactDefinitions.map(({ id, type }) => {
    const version = (previousById.get(id)?.version ?? 0) + 1;
    const content = contentByType.get(type)?.(version);
    if (!content) throw new Error(`No compiler registered for ${type}`);
    return {
      id, projectId: analysis.projectId, type, version, content,
      mediaType: type === 'openapi' || type === 'constitution' ? 'application/json' : 'text/markdown',
      sourceGraphVersion: analysis.graphVersion, hash: sha256(content),
      truthStatus: type === 'adr' ? 'HUMAN_APPROVED' : 'AI_SUGGESTED', generatedAt,
    };
  });
  return ArtifactPack.parse({
    projectId: analysis.projectId,
    sourceGraphVersion: analysis.graphVersion,
    generatedAt,
    constitution,
    artifacts,
  });
}
