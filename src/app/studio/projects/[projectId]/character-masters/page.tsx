"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";

type Quote = {
  id: string;
  model: string;
  size: string;
  quality: string;
  hcPerImage: number;
  initialImages: number;
  initialHc: number;
  maxImages: number;
  maxHc: number;
  callUsdBound: number;
  maxProviderUsd: number;
  expiresAt: string;
  signature: string;
};

type CharacterBrief = { key: "baker" | "potter" | "gardener"; name: string; prompt: string };
type Master = { characterKey: string; characterId: string; referenceImageUrl: string; reused: boolean };

export default function PassionCharacterMastersPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [studioHcAvailable, setStudioHcAvailable] = useState<number | null>(null);
  const [characters, setCharacters] = useState<CharacterBrief[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [masters, setMasters] = useState<Master[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/studio/projects/${projectId}/character-masters`);
      const body = (await response.json()) as {
        quote?: Quote;
        characters?: CharacterBrief[];
        studioHcAvailable?: number | null;
        walletSource?: string;
        error?: string;
      };
      if (cancelled) return;
      if (!response.ok || !body.quote || body.walletSource !== "studio_hc") {
        setError(body.error ?? "The signed quote is not available.");
        return;
      }
      setQuote(body.quote);
      setStudioHcAvailable(typeof body.studioHcAvailable === "number" ? body.studioHcAvailable : null);
      setCharacters(body.characters ?? []);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function confirmAndGenerate() {
    if (!quote || !accepted || busy) return;
    setBusy(true);
    setError("");
    const next: Master[] = [];
    for (const character of characters) {
      const response = await fetch(`/api/studio/projects/${projectId}/character-masters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote,
          characterKey: character.key,
          attempt: 1,
          confirmed: true,
        }),
      });
      const body = (await response.json()) as { master?: Master; code?: string };
      if (!response.ok || !body.master) {
        setError(body.code ?? "Generation stopped before the next character.");
        setMasters(next);
        setBusy(false);
        return;
      }
      next.push(body.master);
      setMasters([...next]);
    }
    setBusy(false);
  }

  return (
    <StudioAuthGate>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
        <h1>MADE WITH PASSION character masters</h1>
        <p>Confirm this signed quote before any image is generated. Retries stay off until you request one character at a time.</p>
        {error ? <p role="alert">{error}</p> : null}
        {quote ? (
          <section data-testid="passion-masters-quote">
            <p data-testid="passion-studio-hc">
              Studio HC available {studioHcAvailable ?? "—"}. Generation reserves Studio HC.
            </p>
            <p>Model {quote.model}</p>
            <p>Size {quote.size}</p>
            <p>Quality {quote.quality}</p>
            <p>Initial reservation {quote.initialHc} Studio HC for {quote.initialImages} images</p>
            <p>Hard ceilings {quote.maxHc} Studio HC, {quote.maxImages} images, ${quote.maxProviderUsd}</p>
            <p>Bounded provider cost per image ${quote.callUsdBound}</p>
            <p>Quote expires {quote.expiresAt}</p>
            <label>
              <input
                data-testid="passion-masters-accept"
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              I confirm this signed quote for the three initial masters.
            </label>
            <button
              data-testid="passion-masters-confirm"
              type="button"
              disabled={!accepted || busy}
              onClick={() => void confirmAndGenerate()}
            >
              Generate the three masters
            </button>
          </section>
        ) : null}
        <section>
          {masters.map((master) => (
            <figure key={master.characterId}>
              <img alt={master.characterKey} src={master.referenceImageUrl} />
              <figcaption>
                {master.characterKey} · pending visual review · {master.characterId}
              </figcaption>
            </figure>
          ))}
        </section>
      </main>
    </StudioAuthGate>
  );
}
