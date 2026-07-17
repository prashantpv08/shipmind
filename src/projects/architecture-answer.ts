import type { ArchitectureOption, ProjectKnowledge } from './schemas';

export function answerArchitectureQuestion(input: {
  knowledge: ProjectKnowledge;
  question: string;
  selectedOptionId?: string;
}) {
  const normalized = input.question.toLowerCase();
  const namedOption = input.knowledge.architectureOptions.find((option) => normalized.includes(option.name.toLowerCase()));
  const selected = namedOption
    ?? input.knowledge.architectureOptions.find((option) => option.id === input.selectedOptionId)
    ?? input.knowledge.architectureOptions.find((option) => option.recommended)
    ?? input.knowledge.architectureOptions[0];
  if (!selected) throw new Error('No architecture option is available');

  let answer: string;
  if (/why not|reject|alternative|instead/.test(normalized)) {
    answer = `Why not ${selected.name}: ${selected.whyNot.join(' ')} Reconsider it when ${selected.reconsiderationTriggers.map((trigger) => trigger.condition).join(' ')}`;
  } else if (/cost|price|budget/.test(normalized)) {
    answer = `${selected.name} has an AI-suggested cost range of ${selected.estimatedCost.range}. Basis: ${selected.estimatedCost.basis} This is an estimate, not measured billing evidence.`;
  } else if (/fail|outage|recovery|reliab/.test(normalized)) {
    answer = selected.failureModes.map((item) => `${item.failure} Mitigation: ${item.mitigation}`).join(' ');
  } else if (/tech|stack|framework|database|language/.test(normalized)) {
    answer = `The current technology direction is ${selected.technologies.join(', ')}. Layer recommendations: ${input.knowledge.techStack.map((item) => `${item.layer}: ${item.recommendation}`).join('; ')}.`;
  } else if (/assum|risk|reconsider|trigger/.test(normalized)) {
    answer = `Assumptions: ${selected.assumptions.join(' ')} Risks: ${selected.risks.join(' ')} Reconsider when: ${selected.reconsiderationTriggers.map((trigger) => `${trigger.metric} — ${trigger.condition}`).join('; ')}.`;
  } else {
    answer = `${selected.name}: ${selected.summary} Why: ${selected.why.join(' ')} Why not: ${selected.whyNot.join(' ')}`;
  }
  const citations = [selected.id, ...input.knowledge.entities.filter((entity) => entity.category === 'REQUIREMENT' || entity.category === 'NFR').slice(0, 4).map((entity) => entity.id)];
  return { answer, citations, truthStatus: 'AI_SUGGESTED' as const, option: selected as ArchitectureOption };
}
