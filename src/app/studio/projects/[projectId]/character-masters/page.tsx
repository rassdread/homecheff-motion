"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  PassionCharacterMastersPanel,
  type PassionMastersCharacterView,
  type PassionMastersQuoteView,
  type PassionMastersResultView,
} from "@/components/studio/passion-character-masters-panel";

type Quote = PassionMastersQuoteView & {
  id: string;
  maxImages: number;
  maxHc: number;
  maxProviderUsd: number;
  expiresAt: string;
  signature: string;
};

export default function PassionCharacterMastersPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const submitting = useRef(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [studioHcAvailable, setStudioHcAvailable] = useState<number | null>(null);
  const [characters, setCharacters] = useState<PassionMastersCharacterView[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [masters, setMasters] = useState<PassionMastersResultView[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/studio/projects/${projectId}/character-masters`);
      const body = (await response.json()) as {
        quote?: Quote;
        characters?: Array<PassionMastersCharacterView & { prompt?: string }>;
        studioHcAvailable?: number | null;
        walletSource?: string;
        saved?: PassionMastersResultView[];
        error?: string;
      };
      if (cancelled) return;
      if (!response.ok || !body.quote || body.walletSource !== "studio_hc") {
        setError(body.error ?? "The signed quote is not available.");
        return;
      }
      setQuote(body.quote);
      setStudioHcAvailable(typeof body.studioHcAvailable === "number" ? body.studioHcAvailable : null);
      setCharacters(
        (body.characters ?? []).map((character) => ({
          key: character.key,
          name: character.name,
        }))
      );
      setMasters(
        (body.saved ?? []).filter(
          (master) => master.characterId && master.referenceImageUrl
        )
      );
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function confirmAndGenerate(replaceExisting: boolean) {
    if (!quote || !accepted || busy || submitting.current) return;
    const savedKeys = new Set(masters.map((master) => master.characterKey));
    const targets = characters.filter(
      (character) => replaceExisting || !savedKeys.has(character.key)
    );
    if (targets.length === 0) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    const next: PassionMastersResultView[] = replaceExisting ? [] : [...masters];
    try {
      for (const character of targets) {
        setActiveKey(character.key);
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
        const body = (await response.json()) as { master?: PassionMastersResultView; code?: string };
        if (!response.ok || !body.master) {
          setError(body.code ?? "Generation stopped before the next character.");
          setMasters(next);
          return;
        }
        next.push(body.master);
        setMasters([...next]);
      }
    } finally {
      submitting.current = false;
      setActiveKey(null);
      setBusy(false);
    }
  }

  return (
    <StudioAuthGate>
      <PassionCharacterMastersPanel
        quote={quote}
        studioHcAvailable={studioHcAvailable}
        characters={characters}
        masters={masters}
        accepted={accepted}
        busy={busy}
        activeKey={activeKey}
        error={error}
        onAcceptedChange={setAccepted}
        projectId={projectId}
        onGenerate={() => void confirmAndGenerate(false)}
        onRegenerate={() => void confirmAndGenerate(true)}
      />
    </StudioAuthGate>
  );
}
