# UX blueprint

The founder’s three-pane sketch is the right structure. Two changes follow from the code and the competitors:

1. The timeline is a mode of the project, not a fourth app. It stays at the bottom when a project is open, and it is hidden on Dashboard, Media, and Voices.
2. Simple and advanced are the same routes. Advanced reveals duration, seed, and provider. It does not open `/editor` or `/animate` by surprise.

## Layout

**Left (narrow)**  
Dashboard, Projects, Media, Characters, Voices, Exports. One item is current. No second “library” or “videos” item.

**Center**  
- Dashboard: continue the last film, jobs in progress, HC balance.  
- Project: scene strip (the storyboard) and a large preview.  
- Media and Characters: the existing browsers.

**Right**  
Properties for the selection. The AI director is a tab here, not a floating chat that can navigate away. It shows the next suggested action and, when HC > 0, the quote.

**Bottom**  
Timeline when a project is open. Job list as a thin status row, expanding on click. Playback controls sit on the preview, not in a second bar.

## Modes

| | Simple | Advanced |
|---|---|---|
| Scene | Description, character, generate still, generate motion | Prompt, duration, reference picker |
| Audio | Pick voice, type the line, add music | Catalog filters already built |
| Timeline | Reorder scenes | Trim, volume, subtitle offset |
| Director | “Make the next scene” with a quote | Shows the action name and the service |

## States

- Empty project: three steps — characters, first scene, voice. Passion skips the first step because the masters exist.
- Loading: skeleton on the preview, not a blank page.
- Error: the job row shows failed and the refund state. The scene stays.
- No HC: the quote explains the shortfall and links to `/account/credits`. The action stays disabled.

## Responsive

Desktop is the editing layout. Below 900px the right panel becomes a sheet, and the timeline becomes a scene list with up/down. Do not ship a separate mobile editor.

## Accessibility

One primary button per pane (green). Keyboard order: sidebar, scene strip, preview, properties, timeline. Quote approval is a button, not only a chat reply.

## What not to add

A node canvas, a second viewer, or a full-screen chat. The video page’s repair tools stay behind an overflow menu until the shell replaces them.
