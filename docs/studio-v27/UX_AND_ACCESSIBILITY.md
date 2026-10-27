# UX and accessibility

## Desktop space

The homepage container is `max-w-6xl`. From the `lg` breakpoint the composer and continue-working list sit in the main column. Quick start, recent projects, recent workflows, and library links sit in a 20rem side column (22rem from `xl`).

Photo to video uses `max-w-6xl` instead of `max-w-2xl`. Quick Ad uses `max-w-3xl` and `lg:max-w-5xl` instead of `max-w-lg`, and the selected photo can grow to `lg:max-h-72`.

The project workspace already used a left rail from 1024px and a right assistant rail. That layout was not replaced.

Mobile keeps a single column. The side column stacks under the composer. No new horizontal-scroll container was added.

## Contrast

On the light homepage, secondary lines that were `text-zinc-500` in the history and continue rows are `text-zinc-700`. Inspiration chips use `text-zinc-800` on white, and the selected chip uses `#054b39` on a green tint. Focus rings use `outline-[#006D52]`.

Shared dark-surface tokens `userEmail`, `subheadingOnDark`, and `bodyOnDark` moved from `text-white/60` or `text-white/75` to `text-white/90` so grey-on-navy copy is closer to the page background `#041428`.

This is not a measured WCAG audit of every wizard. Disabled buttons still use `disabled:opacity-40` in `studioVisual`. Small uppercase badges remain. Those need a visual pass on the real screens.

## One composer

The homepage still has one `StudioAiHomeComposer`. The right-hand growth sidebar is the existing context panel and was not given a second text field. Inside a project, `StudioProjectAssistantRail` remains the project assistant.

## Viewports

An anonymous local dev server was checked for horizontal overflow:

- 1440 and 390: photo-to-video page, no overflow. The homepage at 1440 also had no overflow.
- 360: photo-to-video and Quick Ad, no overflow.
- 768, 1024, 1080, and 1280: Quick Ad, no overflow.

That is a scroll-width check, not a full visual review of every wizard. Below the `lg` breakpoint the homepage side column stacks under the composer.
