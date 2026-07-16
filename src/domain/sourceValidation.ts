import { AnalysisRunSchema, SourceDocument, SourceSpanSchema, type AnalysisRun } from './schemas';

export function validateSourceSpan(document: SourceDocument, span: unknown) {
  const parsed = SourceSpanSchema.parse(span);
  const actual = document.content.slice(parsed.start, parsed.end);
  if (actual !== parsed.text) throw new Error(`Invalid source span ${parsed.id}: text does not match original brief`);
  return parsed;
}

export function validateAnalysisRun(run: unknown, document: SourceDocument): AnalysisRun {
  const parsed = AnalysisRunSchema.parse(run);
  const spans = new Map(document.spans.map((span) => [span.id, validateSourceSpan(document, span)]));
  const check = (id: string, item: { status: string; sourceSpanIds: string[] }) => {
    if (item.status === 'GROUNDED' && item.sourceSpanIds.length === 0) throw new Error(`${id} is grounded without source spans`);
    for (const spanId of item.sourceSpanIds) if (!spans.has(spanId)) throw new Error(`${id} references unknown source span ${spanId}`);
  };
  [...parsed.requirements, ...parsed.nonFunctionalRequirements, ...parsed.assumptions, ...parsed.risks, ...parsed.gaps].forEach((item) => check(item.id, item));
  return parsed;
}
