import type { readiness, resolvedGaps } from '../../src/domain/day2';
import type { ArchitectureDecision } from '../../src/domain/schemas';
export type ReadinessScore = ReturnType<typeof readiness>;
export type ResolvedGaps = ReturnType<typeof resolvedGaps>;
export type SubmitAnswer = (questionId: string, value: string, optionId?: string) => void;
export type SelectedDecision = ArchitectureDecision | null;
