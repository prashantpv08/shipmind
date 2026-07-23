# Ticket Quality Foundation

Date: 2026-07-23

## Outcome

Axiom now has a connector-neutral Agile work-item contract and deterministic quality evaluator in `axiom-platform`. Jira issues and Trello cards will be compiled views of this contract; neither connector defines the canonical backlog.

The normalized hierarchy is:

```text
Initiative
  -> Epic
       -> Story
            -> Task
       -> Defect
```

An Epic may stand without an Initiative. A Story must belong to an Epic, a Task to a Story, and a Defect to an Epic or Story. Stories additionally require persona, capability, and benefit. Defects require observed behavior, expected behavior, and reproduction steps.

Every implementable item carries outcome, context, scope, out-of-scope, acceptance criteria with an explicit verification method, dependencies, risks, open questions, evidence expectations, source links, priority, and relative estimate. Stable Axiom IDs are independent from Jira keys and Trello card IDs.

## Deterministic gates

The `ticket-quality-v1` evaluator rejects:

- malformed or incomplete structured output;
- invalid Agile parents or duplicate stable IDs;
- missing Story or Defect semantics;
- invalid source references and unjustified work;
- vague or unverifiable acceptance criteria;
- blocking unanswered questions;
- missing or cyclic dependencies;
- materially overlapping sibling work items;
- uncovered approved requirements; and
- fabricated claims that tests passed, deployment occurred, or an external Jira issue was created.

Deterministic failures cannot be overridden by a later semantic-review model.

## Evaluation seed

`pnpm eval:tickets` runs seven local, non-billable scenarios covering a good Agile hierarchy, vague criteria, contradictory critical unknowns, duplicate stories, cyclic dependencies, malformed model output, and adversarial prompt-injection content. Every scenario matches its expected result.

The dataset is marked `AWAITING_HUMAN_REVIEW`. It is a regression seed for the evaluator, not yet an approved launch dataset and not evidence that any Groq or OpenAI model meets the launch gates. Production customer content is not included.

## Next slice

Add PostgreSQL `WorkItem` and immutable `WorkItemVersion` persistence, then compile an approved canonical graph version into a fixture-generated draft batch. The draft must pass these gates before it can enter exact preview and human review. Paid provider adapters remain disabled until budget reservation and usage reconciliation exist.
