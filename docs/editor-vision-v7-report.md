# Editor V7 Report

## AI Command Bar

Permanent command bar above the canvas in visual mode. Label: **"What would you like to change?"** with example prompts, contextual suggestion chips, and a Plan submit action. Component: `editor-command-bar.tsx`.

## Intent Detection

`editor-v7-intent.ts` maps natural-language prompts to editor actions: magic replace, background remove, poster/social export, motion-ready, GIF, logo placement, branding, translation, studio story, and more.

## Action Plan Preview

`editor-action-plan-preview.tsx` shows the AI Plan with checkmarks per step, object labels, skill name, and **Preview / Apply / Edit Plan** buttons before execution.

## Multi Step Workflows

`editor-v7-action-plan.ts` builds ordered step lists from intents. One prompt can trigger multiple tools (e.g. clothing change + motion-ready, or full restaurant poster skill chain).

## Editor Skills

`editor-v7-skills.ts` defines eight reusable skills: Restaurant Poster, Marketplace Product Photo, Motion Ready Asset, Logo Placement, Background Cleanup, Social Media Post, Menu Design, Print Ready Export.

## Smart Object References

`editor-v7-object-references.ts` resolves globe, logo, jacket, character, and background layers from prompt text without requiring manual selection.

## Command History

`editor-v7-command-history.ts` stores applied commands on `document.assistantState`. Users can undo, redo, re-run, and duplicate commands from the assistant sidebar.

## Studio Bridge

`editor-v7-studio-bridge.ts` routes motion-ready, 5-scene story, and publish-to-social intents to export modes or Studio paths.

## Human First Assistant

No masks, polygons, segmentation sources, or provider names in the command UI. The assistant translates intent into human-readable plan steps.

## Contextual Suggestions

`editor-v7-suggestions.ts` proposes poster, motion, background removal, logo, GIF, and social actions based on detected document content and handoff score.

## Assistant Sidebar

`editor-assistant-sidebar.tsx` — collapsible panel with current plan, suggestions, command history, recent exports, and motion readiness score.

## Tests / Build Status

`src/lib/editor-vision-v7.test.ts` — 12 tests covering intent detection, action plans, multi-step skills, history, object references, suggestions, studio bridge, and combined prompts.

Run: `npm run lint` → `npm run build` → `npm run test`
