import { TraceabilityContext, WhyAnswer, WhyRequest, type TraceabilityContext as TraceabilityContextType, type WhyAnswer as WhyAnswerType, type WhyAnswerType as AnswerKind } from './schemas';

export const suggestedWhyQuestions = [
  'Why was the serverless event-driven architecture selected?',
  'Why not Kafka-based microservices?',
  'What proves the notification API works?',
  'What would make us reconsider this architecture?',
] as const;

function unique(items: string[]) {
  return [...new Set(items)];
}

function classifyQuestion(question: string): AnswerKind {
  const normalized = question.toLowerCase();
  if (/reconsider|decision trigger|change (the|this|our) architecture|change (the|this|our) decision/.test(normalized)) return 'reconsider';
  if (/why\s+not|why\s+did(?:n't| not)|reject|rejected|instead of/.test(normalized)) return 'why-not';
  if (/proof|prove|evidence|verified|verification|test|coverage|works|meet|compliant/.test(normalized)) return 'proof';
  if (/why|selected|chosen|choose|recommended/.test(normalized)) return 'why';
  return 'unknown';
}

function targetRequirement(question: string, context: TraceabilityContextType) {
  const normalized = question.toLowerCase();
  const explicitId = question.toUpperCase().match(/(?:FR|NFR)-[A-Z]+-\d+|(?:FR|NFR)-\d+/)?.[0];
  const requirements = [...context.analysis.functionalRequirements, ...context.analysis.nonFunctionalRequirements];
  if (explicitId) return requirements.find((item) => item.id === explicitId);
  if (/cost|budget|1,?000/.test(normalized)) return requirements.find((item) => item.id === 'NFR-COST-001');
  if (/tenant|security|isolation/.test(normalized)) return requirements.find((item) => item.id === 'NFR-SEC-001');
  if (/scale|million|load|throughput|performance/.test(normalized)) return requirements.find((item) => item.id === 'NFR-SCALE-001');
  if (/delivery status|audit/.test(normalized)) return requirements.find((item) => item.id === 'FR-002');
  if (/notification|api|email|sms/.test(normalized)) return requirements.find((item) => item.id === 'FR-001');
  return undefined;
}

function selectedArchitecture(context: TraceabilityContextType) {
  const selected = context.analysis.architectureOptions.find((option) => option.id === context.decision.selectedOptionId);
  if (!selected) throw new Error('Approved architecture option is missing from the canonical graph');
  return selected;
}

function rejectedArchitecture(question: string, context: TraceabilityContextType) {
  const normalized = question.toLowerCase();
  const rejectedIds = new Set(context.decision.rejectedAlternatives.map((item) => item.optionId));
  return context.analysis.architectureOptions.find((option) => rejectedIds.has(option.id) && (
    normalized.includes(option.name.toLowerCase())
    || (normalized.includes('kafka') && option.id === 'ARCH-KAFKA')
    || (normalized.includes('microservice') && option.id === 'ARCH-KAFKA')
    || (normalized.includes('container') && option.id === 'ARCH-CONTAINER')
  )) ?? context.analysis.architectureOptions.find((option) => rejectedIds.has(option.id));
}

function resolveWhy(question: string, context: TraceabilityContextType): WhyAnswerType {
  const selected = selectedArchitecture(context);
  return WhyAnswer.parse({
    question,
    answerType: 'why',
    headline: `${selected.name} is the human-approved fit for the clarified MVP boundary.`,
    grounding: 'HUMAN_APPROVED',
    sections: {
      why: unique([...context.decision.rationale, ...selected.why]),
      whyNot: selected.whyNot,
      proof: [],
      reconsiderWhen: context.decision.reconsiderationTriggers,
      unknowns: ['Architecture approval records a decision, not runtime proof. Cost remains an estimate until measured operational evidence exists.'],
    },
    citedEntityIds: unique([context.decision.id, selected.id, ...selected.coverageRefs]),
    evidenceIds: [],
    traversalNodeIds: unique([...selected.coverageRefs, context.decision.id]),
  });
}

function resolveWhyNot(question: string, context: TraceabilityContextType): WhyAnswerType {
  const selected = selectedArchitecture(context);
  const rejected = rejectedArchitecture(question, context);
  if (!rejected) {
    return WhyAnswer.parse({
      question,
      answerType: 'unknown',
      headline: 'The question does not identify an alternative rejected by the approved ADR.',
      grounding: 'UNKNOWN',
      sections: { why: [], whyNot: [], proof: [], reconsiderWhen: [], unknowns: ['Name one of the alternatives recorded in the approved architecture decision.'] },
      citedEntityIds: [context.decision.id],
      evidenceIds: [],
      traversalNodeIds: [context.decision.id],
    });
  }
  const rejection = context.decision.rejectedAlternatives.find((item) => item.optionId === rejected.id);
  return WhyAnswer.parse({
    question,
    answerType: 'why-not',
    headline: `${rejected.name} was rejected for this MVP; ${selected.name} remains approved.`,
    grounding: 'HUMAN_APPROVED',
    sections: {
      why: context.decision.rationale,
      whyNot: unique([...(rejection?.whyRejected ?? []), ...rejected.whyNot]),
      proof: [],
      reconsiderWhen: rejected.reconsiderationTriggers,
      unknowns: ['The alternative cost range is an estimate, not executed evidence.'],
    },
    citedEntityIds: unique([context.decision.id, selected.id, rejected.id]),
    evidenceIds: [],
    traversalNodeIds: unique([selected.id, rejected.id, context.decision.id]),
  });
}

function resolveProof(question: string, context: TraceabilityContextType): WhyAnswerType {
  const requirement = targetRequirement(question, context);
  const coverage = requirement
    ? context.verification.requirementCoverage.find((item) => item.requirementId === requirement.id)
    : undefined;
  const selectedEvidenceIds = coverage?.evidenceIds ?? context.verification.evidence.map((item) => item.id);
  const selectedEvidence = context.verification.evidence.filter((item) => selectedEvidenceIds.includes(item.id));
  const verifiedEvidence = selectedEvidence.filter((item) => item.truthStatus === 'TOOL_VERIFIED');
  const proofAvailable = context.verification.overallStatus === 'passed'
    && verifiedEvidence.length > 0
    && (!coverage || coverage.status === 'VERIFIED');
  const unknownCoverage = context.verification.requirementCoverage.filter((item) => item.status === 'UNKNOWN');
  const targetLabel = requirement ? `${requirement.id} — ${requirement.text}` : 'the generated vertical slice';

  return WhyAnswer.parse({
    question,
    answerType: 'proof',
    headline: proofAvailable
      ? `Executed evidence verifies ${targetLabel}.`
      : `Proof for ${targetLabel} is UNKNOWN.`,
    grounding: proofAvailable ? 'TOOL_VERIFIED' : 'UNKNOWN',
    sections: {
      why: [],
      whyNot: [],
      proof: proofAvailable ? verifiedEvidence.map((item) => item.claim) : [],
      reconsiderWhen: [],
      unknowns: unique([
        ...(!proofAvailable ? [coverage?.note ?? 'No matching executed evidence proves this claim.'] : []),
        ...unknownCoverage.filter((item) => item.requirementId !== requirement?.id).map((item) => `${item.requirementId}: ${item.note}`),
      ]),
    },
    citedEntityIds: unique([
      ...(requirement ? [requirement.id] : []),
      ...(requirement ? (coverage?.testFileIds ?? []) : verifiedEvidence.flatMap((item) => item.linkedEntityIds)),
    ]),
    evidenceIds: proofAvailable ? verifiedEvidence.map((item) => item.id) : [],
    traversalNodeIds: unique([
      ...(requirement ? [requirement.id] : []),
      ...(coverage?.testFileIds ?? []),
      ...(proofAvailable ? verifiedEvidence.map((item) => item.id) : []),
    ]),
  });
}

function resolveReconsider(question: string, context: TraceabilityContextType): WhyAnswerType {
  const selected = selectedArchitecture(context);
  return WhyAnswer.parse({
    question,
    answerType: 'reconsider',
    headline: `The approved ${selected.name} decision has explicit reconsideration boundaries.`,
    grounding: 'HUMAN_APPROVED',
    sections: {
      why: context.decision.rationale,
      whyNot: [],
      proof: [],
      reconsiderWhen: context.decision.reconsiderationTriggers,
      unknowns: ['A trigger becoming true requires new measured evidence and a new architecture review; it does not automatically change the ADR.'],
    },
    citedEntityIds: [context.decision.id, selected.id],
    evidenceIds: [],
    traversalNodeIds: [selected.id, context.decision.id],
  });
}

export function resolveWhyQuestion(input: unknown): WhyAnswerType {
  const request = WhyRequest.parse(input);
  const kind = classifyQuestion(request.question);
  if (kind === 'why') return resolveWhy(request.question, request.context);
  if (kind === 'why-not') return resolveWhyNot(request.question, request.context);
  if (kind === 'proof') return resolveProof(request.question, request.context);
  if (kind === 'reconsider') return resolveReconsider(request.question, request.context);
  const context = TraceabilityContext.parse(request.context);
  return WhyAnswer.parse({
    question: request.question,
    answerType: 'unknown',
    headline: 'Axiom could not ground this question in the current project graph.',
    grounding: 'UNKNOWN',
    sections: {
      why: [],
      whyNot: [],
      proof: [],
      reconsiderWhen: [],
      unknowns: ['Ask about the approved decision, a rejected alternative, executed proof, or a reconsideration trigger.'],
    },
    citedEntityIds: [context.decision.id],
    evidenceIds: [],
    traversalNodeIds: [context.decision.id],
  });
}
