# Decision 0001: Workspace intake and design handoff

- Status: Accepted for UI/UX implementation
- Date: 2026-07-17

## Context

The product direction now begins with workspace-scoped project intake. A workspace can contain multiple projects, and each project can receive files, folders, and pasted meeting transcripts before requirement or architecture work starts.

This expands the original hackathon SRS, which intentionally excluded arbitrary repository ingestion and live meeting integrations.

## Decision

The current milestone implements the professional intake and project-organization UI only:

1. Sources are gathered into a project draft.
2. Extracted knowledge will be separated into requirements, decisions, constraints, risks, open questions, and source traceability.
3. Notion is the intended project-documentation system of record.
4. ARB review follows structured documentation.
5. HLD generation follows ARB approval.
6. Figma is the intended wireframe creation and handoff surface after HLD.

## Integrity boundary

The UI must not claim that arbitrary documents were analyzed, published to Notion, or converted into Figma wireframes until those integrations and server-side ingestion paths exist. Uploaded source metadata remains browser-local in this UI milestone. The existing validated NotifyFlow sample pipeline remains available separately as an interactive sample.
