# Remaining gaps

- The timeline is not built. Dutch subtitle times are still scene-order placeholders. `dialogueText` is one untimed line per scene.
- Several spoken clips per scene, and a saved speaker, need a later line table. V14 does not guess the speaker.
- Film narration is still one script, `voiceNarrationScript`. It is not split into clips and no narrator audio is generated.
- The AI director still does not execute scene tools. Its proposal preview keeps an existing spoken line, and applying a proposal does not clear it.
- Character masters, MADE WITH PASSION, and paid generation are unchanged.
- The dialogue form is in this commit and is not on production. Production still shows the V13 notice that the spoken line cannot be saved.
- Pricing tests that expect the old pack sizes are still failing. They need a founder decision before anyone updates them.
