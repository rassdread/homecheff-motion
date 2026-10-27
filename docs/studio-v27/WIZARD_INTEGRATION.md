# Wizard integration

Selecting a homepage inspiration chip calls `inspirationWizardHref` and navigates. It does not call a provider and the route objects set `spendsCreditsOnOpen: false`.

| Chip | Wizard |
|---|---|
| photo_video | `/studio/photo-video` |
| product_photo | `/editor/start?experience=BUSINESS_PRODUCT` |
| advertisement | `/studio/quick-ad` |
| social_video | `/animate/instant?photoIntent=photo_to_video&experience=SOCIAL_REELS` |
| animation | `/animate/instant?photoIntent=photo_to_video&experience=CREATIVE_ANIMATION`, or `/motion/start` with the same photo intent when an HTTP image is already attached |
| story | `/studio/storyboards/new?experience=CREATIVE_STORYBOARD` |
| logo | `/editor/start?experience=BUSINESS_LOGO_PLACEMENT` |
| presentation | `/studio/storyboards/new?experience=CREATIVE_PRESENTATION` |

Confirm uses the same href when an inspiration id is still selected, unless the current text is an explicit film request or an "open my project" request. Those two still use the existing project handoff.

Free-text examples covered by `classifyStudioCreativeIntent` and `creativeIntentHandoffHref`:

- "Animeer deze foto" is `ANIMATION`. With a media URL the handoff is `/motion/start` plus `photoIntent=photo_to_video`, which the motion start page redirects to Instant.
- "Maak een productfoto" is `IMAGE` and opens `/editor/start`.
- "Maak een reclamevideo" is `VIDEO` and opens `/studio/quick-ad`.
- "Ik wil een film maken met zes personages" is `FILM` and still creates a film project only after confirm.
- "Maak een video." stays on `/studio/experience`.
- "Maak een reclame." still asks for a medium. The plan missing-question test remains.

`nextHrefForPack` now continues short-form social packs into Instant, storyboard and presentation packs into the storyboard brief, commercial into Quick Ad, and product, logo, and branding packs into the editor. Restaurant, HomeCheff, outfit, LinkedIn, and creative animation keep their previous destinations.

Ambiguous text such as "Maak iets moois." still sets `studio.aiHome.missing.medium` and does not create a film.

Recent workflow chips are stored in `sessionStorage` under `hc-studio-v27-recent-workflows`. There is no new database table. A repeated preset opens a new wizard URL. It does not update an existing project id.
