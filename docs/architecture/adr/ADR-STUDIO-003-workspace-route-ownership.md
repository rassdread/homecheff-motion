# ADR-STUDIO-003 — Workspace Route Ownership

**Status:** Accepted (S.1)  
**Date:** 2026-08-08

## Context

Real workspace already lives at `/studio?storyboardId=…`. `/studio/workspace` only redirects. Changing the public URL would break bookmarks and suite links.

## Decision — Option A

**Canonical workspace route:** `/studio?storyboardId={id}`  
**Compatibility:** `/studio/workspace` continues to redirect (preserve `storyboardId` / `editorSession`).

Rationale:

- Existing `studioWorkspaceHref()` and suite links already use Option A  
- `/studio` doubles as product home when no id  
- Avoids SEO/migrate churn for an authenticated app surface  

## Consequences

- Document clearly; do not reintroduce a second live editor at `/studio/workspace`  
- S.2 IA may add `/studio/projects` aliases without moving the editor surface
