# 0009 — Generate primary project clarifications from uploaded evidence

- Status: Accepted
- Date: 2026-07-19

## Decision

When `AXIOM_AI_MODE=live`, the primary project-analysis route sends extracted source excerpts and canonical source-grounded entity IDs to the isolated Groq provider. The provider returns exactly five project-specific gaps with one clarification question each. A strict JSON schema, Zod parsing, unique-category validation, distinct-option validation, and entity-reference validation run before anything is persisted.

Stable gap and question IDs are compiled by Axiom from the project and gap category; the model cannot choose canonical IDs. Readiness calculations, truth-status transitions, and graph persistence remain deterministic application logic.

Deterministic question templates are permitted only in explicit fixture/test mode. A live-provider failure is returned to the UI and never replaced silently with fixture questions.

## Why

The previous primary flow selected questions from a static checklist using keyword detection. That was useful for offline verification but did not produce sufficiently contextual interviews for arbitrary projects. Moving generation to the existing Groq boundary makes the visible questions depend on the submitted evidence while preserving Axiom's no-hallucination and stable-ID constraints.

## Reconsider when

- Model latency prevents the intake flow from completing within the hosted function limit.
- Very large source collections require retrieval instead of bounded per-source excerpts.
- Evaluation shows that a separate gap-generation and question-generation pass materially improves precision.
