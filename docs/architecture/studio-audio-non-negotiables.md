# Studio Audio Non-Negotiables (S.7A)

Derived from repository evidence. Future S.7 implementation **must not break** these.

---

## 1. Character owns persistent voice identity

`StudioCharacter.voiceProfile` (+ provider, language, lock, history, per-lang JSON) is the character voice source of truth.

Do not replace Character identity with ephemeral prompts or silent narrator swaps without user/system visibility.

## 2. Dual voice layers must stay honest

Storyboard narration and Character cast voice are **different layers today**. Unification may happen in S.7 — but must not pretend they are already one.

## 3. Creative Director / audio directors orchestrate — they do not replace engines

Music Director, Sound Director, Audio Production / Asset / Voice Identity directors **plan and hand off**. Generation remains provider + job/route systems.

## 4. Prompt Matrix remains the language layer (when wired)

Audio Matrix IDs exist (`VOICE_TTS`, `VOICE_CLONE`, `MUSIC_GENERATE`, `SFX_GENERATE`, …). S.7 may wrap routes — must not invent a second prompt stack.

## 5. GenerationJobs execute paid generation where certified

VOICE_TTS already uses `StudioGenerationJob`. New audio job wiring must follow S.4 rules (idempotency, `chargeFinalized`, no silent free retries).

## 6. Credits are server-authoritative

Audio prices live in `studio-action-cost-registry.ts`. Client UI cannot invent free paid generation. Admin/test bypasses must not leak to normal users.

## 7. Consent for voice clone

Clone requires `consentConfirmed`. Do not remove consent gates.

## 8. Motion/render must retain attached audio when export enabled

Voice mux, linked music/SFX beds, and subtitle burn-in modes are product promises for enabled export settings. Do not drop handoff URLs silently.

## 9. No fake dubbing or lip-sync claims

Amplitude mouth overlay ≠ AI lip-sync. Overlay language export ≠ dubbing. Marketing must stay honest.

## 10. Reusable audio assets must remain reusable

User library music/SFX/clones and Character voice profiles must remain linkable across scenes/storyboards/projects. Do not orphan generated audio without indexing path.

## 11. Do not change billing prices in S.7A–S.7 foundation without S.8

Technical wiring only until S.8 financial audit.

## 12. Fusion / Continuity visual identity remains separate

Audio Continuity must not rewrite Character/Location/Prop/World visual ContinuityBundle ownership.
