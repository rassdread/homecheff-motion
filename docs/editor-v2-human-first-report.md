# Editor V2 Human First Experience Report

## Visual Edit Mode

Default editor experience is now **Visual Edit Mode**. Users see the photo first with clean overlays — no semantic panels, confidence scores, or AI metadata by default.

**Advanced Controls** toggle exposes the full technical editor (layer tree, composition graph, QA panels, semantic properties).

## Object Detection UX

Detected objects show subtle overlays on hover; selected objects show a name and contextual action menu with human-friendly labels (Edit appearance, Adjust body, Remove, etc.).

Object kind is inferred from labels and categories: person, character, mascot, background, logo, product.

## Direct Manipulation

Canvas supports click, drag, resize, and rotate directly on the image:

- Move layers and placements via pointer drag
- Scale handle on selected objects (visual mode)
- Rotate handle on selected objects (visual mode)
- No property panel required for basic edits

## AI Suggestions

After selecting an object, contextual suggestion chips appear (e.g. Remove background, Create poster, Animation-ready version). Suggestions map to internal operations without exposing technical terms.

## Body Editing

**Adjust body** opens a simplified panel with friendly slider labels (Head, Shoulders, Arms, Waist, Legs, Height, Hands, Feet). Live preview via body guide overlay on canvas.

## Logo Placement

**Attach logo** opens the existing placement flow with human-first framing — select target on canvas, choose reference, drag and scale visually.

## Remove & Replace

Remove and Replace actions map to existing layer operations. Background cleanup/replace/style actions available from contextual menus.

## Motion Preparation

**Prepare for animation** marks layers internally with animation readiness metadata without exposing motion anchors or construction profiles.

## Advanced Mode Separation

Advanced mode preserves:

- Semantic layer tree
- Composition graph preview
- Identity locks and metadata fields
- Placement QA panel
- Technical property panels

## Mobile Experience

Visual mode on mobile: tap to select object, bottom sheet for object list, attach logo button, floating suggestions.

## Accessibility

Action menus use `role="menu"`, toolbars use `role="toolbar"`, resize/rotate controls have aria-labels, keyboard-focusable buttons throughout.

## Tests / Build Status

See validation output.

**Commit:** Transform Editor Into Human First Visual Editing Experience
