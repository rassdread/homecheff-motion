"use client";

import { studioVisual } from "@/lib/studio-visual-tokens";

export type PassionMastersQuoteView = {
  model: string;
  size: string;
  quality: string;
  initialImages: number;
  initialHc: number;
  callUsdBound: number;
};

export type PassionMastersCharacterView = {
  key: "baker" | "potter" | "gardener";
  name: string;
};

export type PassionMastersResultView = {
  characterKey: string;
  characterId: string;
  referenceImageUrl: string;
};

const SHORT_DESCRIPTIONS: Record<PassionMastersCharacterView["key"], string> = {
  baker: "A woman with brown wavy hair and a linen apron in a warm kitchen.",
  potter: "A man with blond wavy hair at a wheel in a pottery workshop.",
  gardener: "A woman with long blonde curls in a flower garden.",
};

export function passionMastersProviderUsd(quote: PassionMastersQuoteView): string {
  const total = Math.round(quote.initialImages * quote.callUsdBound * 100) / 100;
  return total.toFixed(2);
}

export function passionMastersSizeLabel(size: string): string {
  return size.replace("x", " × ");
}

export function passionMastersQualityLabel(quality: string): string {
  if (!quality) return quality;
  return quality.charAt(0).toUpperCase() + quality.slice(1);
}

function characterStatus(input: {
  key: string;
  masters: PassionMastersResultView[];
  activeKey: string | null;
}): string {
  if (input.masters.some((master) => master.characterKey === input.key)) return "Generated";
  if (input.activeKey === input.key) return "Generating";
  return "Not generated";
}

type Props = {
  quote: PassionMastersQuoteView | null;
  studioHcAvailable: number | null;
  characters: PassionMastersCharacterView[];
  masters: PassionMastersResultView[];
  accepted: boolean;
  busy: boolean;
  activeKey: string | null;
  error: string;
  onAcceptedChange: (accepted: boolean) => void;
  onGenerate: () => void;
};

export function PassionCharacterMastersPanel({
  quote,
  studioHcAvailable,
  characters,
  masters,
  accepted,
  busy,
  activeKey,
  error,
  onAcceptedChange,
  onGenerate,
}: Props) {
  const canGenerate = Boolean(quote) && accepted && !busy;
  const balance =
    typeof studioHcAvailable === "number" ? studioHcAvailable.toLocaleString("en-US") : "—";

  return (
    <div className={`${studioVisual.pageBg} min-w-0 w-full overflow-x-hidden`}>
      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="min-w-0">
          <p className={studioVisual.eyebrowOnDark}>MADE WITH PASSION</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Character masters
          </h1>
        </header>

        {error ? (
          <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        {!quote ? (
          <p className="text-sm text-white/80">The signed quote is loading.</p>
        ) : (
          <>
            <section className={`${studioVisual.cardElevated} min-w-0`} data-testid="passion-studio-hc">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#006D52]">Studio balance</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{balance} Studio HC</p>
              <p className="mt-2 text-sm text-zinc-600">
                This is the Studio HC balance. It is separate from the central HomeCheff HC balance.
              </p>
            </section>

            <section className={`${studioVisual.cardElevated} min-w-0`} data-testid="passion-masters-quote">
              <h2 className="text-lg font-semibold text-zinc-900">Cost summary</h2>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-zinc-500">Model</dt>
                  <dd className="font-semibold text-zinc-900">{quote.model}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Quality</dt>
                  <dd className="font-semibold text-zinc-900">{passionMastersQualityLabel(quote.quality)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Size</dt>
                  <dd className="font-semibold text-zinc-900">{passionMastersSizeLabel(quote.size)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-6 text-zinc-800">
                Initial generation: {quote.initialImages} images, {quote.initialHc} Studio HC. Maximum
                estimated provider cost: ${passionMastersProviderUsd(quote)}.
              </p>
            </section>

            <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3" aria-label="Characters">
              {characters.map((character) => {
                const master = masters.find((item) => item.characterKey === character.key);
                const status = characterStatus({ key: character.key, masters, activeKey });
                return (
                  <article key={character.key} className={`${studioVisual.cardElevated} min-w-0`} data-testid={`passion-card-${character.key}`}>
                    <h2 className="text-xl font-semibold text-zinc-900">{character.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-700">{SHORT_DESCRIPTIONS[character.key]}</p>
                    <p className="mt-3 text-sm font-semibold text-[#0067B1]" data-testid={`passion-status-${character.key}`}>
                      {status}
                    </p>
                    {master ? (
                      <img
                        alt={character.name}
                        src={master.referenceImageUrl}
                        className="mt-4 aspect-[2/3] w-full rounded-xl object-cover"
                      />
                    ) : null}
                  </article>
                );
              })}
            </section>

            <section className={`${studioVisual.cardElevated} min-w-0`}>
              <label className="flex items-start gap-3 text-base font-medium leading-6 text-zinc-900" htmlFor="passion-masters-accept">
                <input
                  id="passion-masters-accept"
                  data-testid="passion-masters-accept"
                  className="mt-1 h-5 w-5 shrink-0 accent-[#006D52]"
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => onAcceptedChange(event.target.checked)}
                />
                <span>Ik bevestig dat ik 375 Studio-HC wil gebruiken om drie AI-personages te genereren.</span>
              </label>
              <div className="mt-5">
                <button
                  data-testid="passion-masters-confirm"
                  type="button"
                  className={`${studioVisual.btnGradientPrimary} studio-btn-glow w-full sm:w-auto`}
                  disabled={!canGenerate}
                  onClick={() => {
                    if (!canGenerate) return;
                    onGenerate();
                  }}
                >
                  {busy ? "Bezig…" : "Genereer 3 personages"}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
