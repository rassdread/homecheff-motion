# Animate-pagina: duration / credits UX (handoff)

Samenvatting van het gesprek en de wijzigingen (alleen UI/i18n; geen Vidu-, billing- of backend-aanpassingen).

## Probleem

Voor upload van ≥2 beelden toonde de UI “0 overgangen / 0 seconden / 0 credits”, wat kapot oogde. Preset-kaarten en admin advanced waren onduidelijk; dubbele estimate-blokken verwarrend.

## Oplossing (kort)

1. **Geen nullen vóór ≥2 beelden** — vriendelijke i18n-teksten (`animate.estimate.needTwoForCalc`, `uploadMinPresetHint`, enz.).
2. **Preset-kaarten** — `AnimateEstimateCard` in `mode="preset"`: resolutie, sec/overgang, max beelden/overgangen, bij ≥2 beelden huidige schatting + maximum credits/USD voor dat preset.
3. **`src/components/animate/animate-estimate-card.tsx`** — herbruikbaar: `preset` | `advanced` | `final`; optionele `className`; overrides voor advanced (workflow-credits/USD).
4. **Admin advanced** — grid model / resolutie / sec per overgang; estimate-box; target totale duur eronder met i18n; bij \<2 beelden disabled + placeholder. Target-total sync **zonder** `useEffect` + `setState` (derived value + draft alleen bij focus).
5. **Dubbele blokken** verwijderd op `animate/page.tsx`; **final summary** vóór genereren (`mode="final"`).
6. **`animate-duration-summary.tsx`** verwijderd (vervangen door estimate card).
7. **i18n** — keys onder o.a. `animate.estimate.*` in `en.ts` / `nl.ts`.

## Formules (UI)

- Transitions (ongecapped in simpele formule): `max(0, imageCount - 1)`; in preset-UI gecapped met `maxTransitions` van het preset.
- Credits (preset, zonder advanced override): `transitions × secondsPerTransition × creditsPerSecond` (afgerond zoals in code).
- USD: `credits × 0.005` (`CREDIT_USD`).

## Bestanden (belangrijkste)

- `src/app/animate/page.tsx`
- `src/components/animate/animate-estimate-card.tsx`
- `src/i18n/locales/en.ts`, `nl.ts`
- Verwijderd: `src/components/animate/animate-duration-summary.tsx`

## Validatie

`npm run lint` en `npm run build` slagen na deze ronde.

## Juiste volgorde van handelingen (logisch)

**Let op:** bij Git hoort **`add` vóór `commit`**, daarna **`push`**. Dus niet “commit → add → push”, maar onderstaande volgorde.

### Lokaal, vóór je commit en pusht

1. **`git pull`** (als je met anderen op dezelfde branch werkt — voorkomt conflicten achteraf).
2. **Database / Prisma** (alleen als het schema wijzigt):
   - Migratie maken en toepassen: `npm run prisma:migrate` (of `npx prisma migrate dev` met naam).
   - Controleren: `npx prisma validate` en `npx prisma migrate status`.
3. **Controleren dat de app klopt:** `npm run lint` en `npm run build`.
4. **Git — in deze volgorde:**
   - `git add` (of `git add -p`) — bepaal wat mee in de commit gaat.
   - `git commit -m "…"` — pas ná staging.
   - `git push` — pas ná een geslaagde commit.

### Op server / CI / productie (na merge of deploy)

1. **Migraties toepassen** — `npx prisma migrate deploy` (geen interactieve `migrate dev`).
2. **Applicatie starten / build** zoals je pipeline dat doet (`npm run build`, enz.).

### Kort geheugensteuntje

| Fase        | Handelingen |
|------------|----------------|
| Data-model | migratie → `migrate status` / `validate` |
| Kwaliteit  | `lint` → `build` |
| Versiebeheer | `add` → `commit` → `push` |

### Cursor: regel voor alle projecten (“Riedel”)

- **Globaal (aanbevolen voor elke nieuwe repo):** `~/.cursor/rules/riedel.mdc` met `alwaysApply: true` — gelijk aan wat nu op je machine staat.
- **Per repo (team + versiebeheer):** `.cursor/rules/riedel.mdc` in dit project (zelfde inhoud).
- **Alternatief (officieel door Cursor):** *Cursor Settings → Rules → User rules* —zelfde bulletlijst plakken als back-up als globale `.mdc` in jouw Cursor-versie niet overal wordt ingeladen.
