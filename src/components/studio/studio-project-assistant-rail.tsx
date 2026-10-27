"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { proposeStudioV23Command, type StudioV23SceneContext } from "@/lib/studio-v23-actions";
import { flushPendingSceneEdits } from "@/lib/studio-v23-pending-edits";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Quote = {
  actionType?: string;
  requiredCredits?: number;
  allowed?: boolean;
  reason?: string | null;
  confirmationRequired?: boolean;
  provider?: string;
  voiceProfile?: string;
  durationSeconds?: number;
  characterIdentityLock?: false;
};

type ActionResponse = {
  ok: boolean;
  status?: string;
  code?: string;
  message?: string;
  href?: string;
  quote?: Quote | null;
  providerCalls?: number;
  conflicts?: string[];
};

export function StudioProjectAssistantRail({
  projectId,
  projectTitle,
  sectionLabel,
  section,
  sceneId,
  sceneTitle,
  characterId,
  characterName,
  scenes,
  balance,
  collapsed,
  onToggle,
}: {
  projectId: string;
  projectTitle: string;
  sectionLabel: string;
  section: string;
  sceneId: string | null;
  sceneTitle: string | null;
  characterId: string | null;
  characterName: string | null;
  scenes: StudioV23SceneContext[];
  balance: number | null;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const t = useActiveTranslator();
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [proposal, setProposal] = useState<ReturnType<typeof proposeStudioV23Command> | null>(null);
  const [result, setResult] = useState<ActionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setNote("");
    const response = await fetch("/api/studio/assistant/actions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as ActionResponse;
    setBusy(false);
    setResult(payload);
    if (payload.ok && payload.status === "completed" && payload.href) {
      router.push(payload.href);
      router.refresh();
    }
    if (payload.ok && payload.status === "quote_ready") {
      setNote(t("studio.v23.assistant.noProvider"));
    }
    return payload;
  }

  async function prepare() {
    const next = proposeStudioV23Command({
      text: draft,
      projectId,
      scenes,
      selectedSceneId: sceneId,
      selectedCharacterId: characterId,
    });
    setProposal(next);
    setResult(null);
    if (next.kind !== "action") {
      setNote(t(next.messageKey ?? "studio.v23.assistant.clarify"));
      return;
    }
    if (!next.quote) return;
    const pendingFields = sceneId ? await flushPendingSceneEdits(projectId, sceneId) : [];
    await post({ ...next.request, confirmed: false, pendingFields });
  }

  async function confirm(resolvePending?: "apply" | "keep_manual") {
    if (proposal?.kind !== "action") return;
    const pendingFields = sceneId ? await flushPendingSceneEdits(projectId, sceneId) : [];
    if (pendingFields.length > 0 && !resolvePending) {
      setResult({ ok: false, code: "pending_manual_edit", message: t("studio.v23.assistant.pending") });
      return;
    }
    const payload = await post({
      ...proposal.request,
      confirmed: true,
      confirmDestructive: proposal.destructive,
      pendingFields,
      ...(resolvePending ? { resolvePending } : {}),
      idempotencyKey: idempotencyKey(proposal.request),
    });
    if (payload.code === "pending_manual_edit") setNote(t("studio.v23.assistant.pending"));
  }

  const quote = result?.quote;
  const blocked = quote?.allowed === false;

  return (
    <div className="space-y-3" data-testid="studio-v23-assistant">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-900">{t("studio.v23.assistant.title")}</h2>
        <button type="button" className="min-h-11 px-2 text-sm font-semibold text-[#006D52]" onClick={onToggle}>
          {collapsed ? t("studio.v23.assistant.expand") : t("studio.v23.assistant.collapse")}
        </button>
      </div>
      <ul className="flex flex-wrap gap-2" data-testid="studio-v23-context">
        <Chip label={t("studio.v23.context.project")} value={projectTitle} />
        <Chip label={t("studio.v23.context.editor")} value={sectionLabel} />
        {sceneTitle ? <Chip label={t("studio.v23.context.scene")} value={sceneTitle} /> : null}
        {characterName ? <Chip label={t("studio.v23.context.character")} value={characterName} /> : null}
        {section === "timeline" ? <Chip label={t("studio.v23.context.timeline")} value={sectionLabel} /> : null}
      </ul>
      {collapsed ? null : (
        <>
          <label className="block text-sm text-zinc-700" htmlFor="studio-v23-assistant-input">
            {t("studio.v23.assistant.placeholder")}
          </label>
          <textarea
            id="studio-v23-assistant-input"
            data-testid="studio-v23-assistant-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            className={`${studioVisual.btnOutline} min-h-11 w-full`}
            onClick={() => void prepare()}
            disabled={busy || !draft.trim()}
          >
            {t("studio.v23.assistant.propose")}
          </button>
          {proposal?.kind === "action" ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm" data-testid="studio-v23-proposal">
              <p className="font-semibold text-zinc-900">{proposal.summary}</p>
              {quote ? (
                <dl className="mt-2 space-y-1 text-xs text-zinc-700" data-testid="studio-v23-quote">
                  <div>{t("studio.v23.assistant.quoteReady")}</div>
                  <div>
                    {quote.actionType} · {quote.requiredCredits ?? "—"} HC
                    {balance != null ? ` · ${balance} HC` : ""}
                  </div>
                  {quote.allowed === false ? (
                    <div className="text-red-700">
                      {quote.reason || t("studio.v23.assistant.paidBlocked")}
                    </div>
                  ) : null}
                  <div>{t("studio.v23.assistant.noProvider")}</div>
                </dl>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="studio-v23-confirm"
                  className={`${studioVisual.btnGradientPrimary} min-h-11 px-3 text-sm`}
                  disabled={busy || blocked || proposal.quote === false && result?.code === "pending_manual_edit"}
                  onClick={() => void confirm()}
                >
                  {t("studio.v23.assistant.confirm")}
                </button>
                {result?.code === "pending_manual_edit" ? (
                  <>
                    <button type="button" className={`${studioVisual.btnOutline} min-h-11 px-3 text-sm`} onClick={() => void confirm("keep_manual")}>
                      {t("studio.v23.assistant.keepManual")}
                    </button>
                    <button type="button" className={`${studioVisual.btnOutline} min-h-11 px-3 text-sm`} onClick={() => void confirm("apply")}>
                      {t("studio.v23.assistant.applyAnyway")}
                    </button>
                  </>
                ) : null}
              </div>
              {blocked ? (
                <a href="/account/credits" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[#006D52]">
                  {t("studio.v23.credits")}
                </a>
              ) : null}
            </div>
          ) : null}
          {note ? <p className="text-sm text-amber-800">{note}</p> : null}
          {result && !result.ok && result.message ? <p className="text-sm text-red-700">{result.message}</p> : null}
        </>
      )}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700">
      <span className="font-semibold text-zinc-900">{label}: </span>
      {value}
    </li>
  );
}

function idempotencyKey(request: Record<string, unknown>): string {
  const raw = JSON.stringify(request);
  let hash = 5381;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) + hash + raw.charCodeAt(index)) >>> 0;
  }
  return `v23act${hash.toString(16).padStart(8, "0")}`.slice(0, 80);
}
