# ADR 0006: Governed Build Studio and visible action state

## Status

Accepted for the hackathon product journey on 2026-07-18.

## Context

After Axiom creates the approved Jira hierarchy, users need to understand whether coding is actually running, what changed, and what evidence was produced. Sending users directly into an external IDE would hide the governance chain and make it difficult to distinguish real execution from simulated progress. The UI also had inconsistent async feedback: some actions changed text, some only disabled controls, and several shared a broad busy flag.

## Decision

Axiom owns an in-product Build Studio as the primary implementation experience. A coding agent will operate only inside an explicitly selected repository workspace with an allowlisted write boundary. The studio presents:

1. the selected Jira story and approved task contract;
2. repository authorization status;
3. real agent/tool events and changed files;
4. inspectable diffs with source links;
5. fixed verification commands and stored evidence.

An external IDE such as VS Code or Cursor is an optional handoff after a patch exists. It is not the primary progress surface.

Until generic repository authorization is implemented, the studio must stop at the authorization gate. It may not simulate file changes, terminal output, progress percentages, or successful commands. The fixed NotifyFlow sandbox remains the executable proof of controlled generation and verification.

Every asynchronous control uses a visible spinner, action-specific text, `aria-busy`, and a disabled state while its action is active. Navigation, selection, modal toggles, and other synchronous controls do not show artificial loading.

The Jira connection status endpoint performs only read-only requests for the current account and project create metadata. Creating an Epic or Story still requires explicit confirmation of the reviewed plan hash.

## Consequences

- Users can see what is complete, waiting, locked, or verified without relying on an IDE.
- No fake coding activity is shown before repository authorization.
- The hackathon can demonstrate real generation and verification through NotifyFlow while preserving a credible generic-product boundary.
- Future repository support must add workspace selection, path allowlisting, atomic patch application, cancellation, and persisted execution events before unlocking the remaining Build Studio stages.
