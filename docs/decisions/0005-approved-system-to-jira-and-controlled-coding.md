# Decision 0005 — Approved system to Jira and controlled coding

## Status

Accepted for the hackathon product journey on 2026-07-18.

## Context

The project workspace previously stopped after a human approved the architecture and Axiom generated the final HLD and ADR. The SRS already requires an implementation backlog and Codex task packet, but the arbitrary-project workspace did not expose that transition. Users need an explicit answer to “documents are approved—what happens next?” and a governed bridge into their delivery system.

Creating Jira issues immediately after document approval would be premature. The stories and coding boundary also depend on the selected architecture, final HLD, ADR, failure model, and technology direction. External issue creation is a material side effect and must not happen silently.

## Decision

The project journey is:

```text
Document baseline approved
-> optional wireflow
-> architecture review and HUMAN_APPROVED ARB decision
-> final HLD and ADR
-> AI_SUGGESTED Jira epic and child-story preview
-> explicit human confirmation
-> create the Epic first, then its child Stories in Jira
-> select a Jira-published story
-> compile a source-linked Codex coding task packet
-> authorize a target repository and path allowlist before code writes
-> execute only repository-defined verification commands
```

The Jira plan is compiled deterministically from the current canonical graph, exact document approval, and ARB decision. Its SHA-256 hash is confirmed by the client before publication. A stored publication makes the same approved plan idempotent.

For the hackathon, Jira Cloud uses a server-side API-token adapter configured by `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and `JIRA_PROJECT_KEY`. Credentials never cross the server boundary. OAuth 2.0 is the production multi-tenant replacement.

## Coding boundary

The new arbitrary-project path prepares a validated coding task packet after Jira publication. It does not claim that arbitrary project code has been generated. Code writes remain blocked until the user selects a real target repository and the product establishes an allowlisted workspace. The existing NotifyFlow sample remains the only fully executable fixed-template generation and verification slice in this hackathon repository.

## Consequences

- Users see what follows approval without leaving Axiom.
- Jira receives an explicit Epic-to-Story hierarchy with source IDs and acceptance criteria.
- External writes require a visible confirmation step.
- Stale document or architecture versions cannot create or reuse a backlog.
- Coding agents receive approved context without gaining arbitrary filesystem or shell authority.
- A future generic code-generation adapter must add repository selection, path allowlisting, dependency policy, atomic writes, and fixed verification before it can execute this packet.
