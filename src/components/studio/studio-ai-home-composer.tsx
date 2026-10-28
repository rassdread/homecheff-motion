"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import {
  interpretStudioAiHomePrompt,
  previewStudioAiHomeCredits,
  fetchStudioBrandKitsForHome,
} from "@/lib/studio-ai-home-client";
import {
  bindStudioAiHomeIntentProject,
  buildStudioAiHomeIntentPlan,
  storeStudioAiHomeIntentPlan,
} from "@/lib/studio-ai-home-intent";
import {
  publishStudioHomeComposerContext,
  STUDIO_HOME_DRAFT_KEY,
  subscribeStudioHomeComposerPrompt,
} from "@/lib/studio-home-composer-context";
import {
  classifyStudioCreativeIntent,
  creativeIntentHandoffHref,
  filmDescriptionFromPrompt,
  filmRequestKey,
  filmTitleFromPrompt,
  type StudioCreativeIntent,
} from "@/lib/studio-v23-intent";
import {
  STUDIO_AI_HOME_INSPIRATION,
  STUDIO_AI_HOME_INSPIRATION_PRIMARY_COUNT,
  type StudioAiHomeInspirationId,
} from "@/lib/studio-ai-home-inspiration";
import {
  inspirationWizardHref,
  rememberStudioWorkflow,
} from "@/lib/studio-v27-workflow-routes";
import { persistStagedStudioImage } from "@/lib/studio-v27-staged-upload";
import { fetchStudioCharacters } from "@/lib/studio-characters-client";
import { fetchStudioProps } from "@/lib/studio-props-client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { StudioAiHomeConfirmPanel } from "@/components/studio/studio-ai-home-confirm-panel";
import type { StudioCharacterListItem, StudioPropListItem } from "@/types/studio-api";
import type { StudioIntentPlan, StudioIntentPlanAttachment } from "@/types/studio-intent-plan";

function trackAiHomeEvent(event: string, detail?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("hc-studio-analytics", { detail: { event, ...detail } })
    );
  } catch {
    /* optional */
  }
}

type PickerKind = "media" | "character" | "product" | "brand" | null;

const HOME_DRAFT_KEY = STUDIO_HOME_DRAFT_KEY;

type HomeDraft = {
  prompt?: string;
  attachments?: StudioIntentPlanAttachment[];
  inspirationId?: StudioAiHomeInspirationId | null;
};

let homeDraftCache: HomeDraft | null | undefined;

function subscribeHomeDraft(): () => void {
  return () => undefined;
}

function readHomeDraft(): HomeDraft | null {
  if (homeDraftCache !== undefined) return homeDraftCache;
  try {
    const raw = sessionStorage.getItem(HOME_DRAFT_KEY);
    homeDraftCache = raw ? (JSON.parse(raw) as HomeDraft) : null;
  } catch {
    homeDraftCache = null;
  }
  return homeDraftCache;
}

function writeHomeDraft(value: HomeDraft): void {
  homeDraftCache = undefined;
  sessionStorage.setItem(HOME_DRAFT_KEY, JSON.stringify(value));
}

export function StudioAiHomeComposer() {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const auth = useAuthSession();
  const router = useRouter();
  const promptId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const restoredDraft = useSyncExternalStore(subscribeHomeDraft, readHomeDraft, () => null);
  const [draftApplied, setDraftApplied] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<StudioIntentPlanAttachment[]>([]);
  const [inspirationId, setInspirationId] = useState<StudioAiHomeInspirationId | null>(null);
  if (!draftApplied && restoredDraft) {
    setDraftApplied(true);
    if (typeof restoredDraft.prompt === "string" && restoredDraft.prompt.trim()) {
      setPrompt(restoredDraft.prompt);
    }
    if (Array.isArray(restoredDraft.attachments) && restoredDraft.attachments.length > 0) {
      setAttachments(restoredDraft.attachments);
    }
    if (restoredDraft.inspirationId) setInspirationId(restoredDraft.inspirationId);
  }
  const [characters, setCharacters] = useState<StudioCharacterListItem[]>([]);
  const [props, setProps] = useState<StudioPropListItem[]>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string; url?: string | null }>>([]);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [plan, setPlan] = useState<StudioIntentPlan | null>(null);
  const [missingHint, setMissingHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedCredits, setEstimatedCredits] = useState<number | null>(null);

  useEffect(() => subscribeStudioHomeComposerPrompt((next) => {
    setPrompt(next);
    setPlan(null);
    setMissingHint(null);
  }), []);

  useEffect(() => {
    publishStudioHomeComposerContext({
      prompt,
      attachments: attachments.map((item) => ({ kind: item.kind, id: item.id, name: item.name })),
    });
    if (!draftApplied && !prompt.trim() && attachments.length === 0 && !inspirationId) return;
    try {
      writeHomeDraft({ prompt, attachments, inspirationId });
    } catch {
      /* ignore quota */
    }
  }, [attachments, draftApplied, inspirationId, prompt]);
  const [allowed, setAllowed] = useState(true);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  const [showAllInspiration, setShowAllInspiration] = useState(false);

  const selectedCharacterIds = new Set(
    attachments.filter((a) => a.kind === "character").map((a) => a.id)
  );
  const visibleInspiration = showAllInspiration
    ? STUDIO_AI_HOME_INSPIRATION
    : STUDIO_AI_HOME_INSPIRATION.slice(0, STUDIO_AI_HOME_INSPIRATION_PRIMARY_COUNT);

  useEffect(() => {
    if (!auth.resolved || !auth.user) {
      queueMicrotask(() => {
        setCharacters([]);
        setProps([]);
        setBrands([]);
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [charsRes, propsRes, brandKits] = await Promise.all([
          fetchStudioCharacters(),
          fetchStudioProps(),
          fetchStudioBrandKitsForHome(),
        ]);
        if (cancelled) return;
        setCharacters(charsRes.ok ? (charsRes.data.characters ?? []) : []);
        setProps(propsRes.ok ? (propsRes.data.props ?? []) : []);
        setBrands(
          brandKits.map((b) => ({
            id: b.id,
            name: b.name,
            url: b.kit?.logoUrl ?? null,
          }))
        );
      } catch {
        if (!cancelled) {
          setCharacters([]);
          setProps([]);
          setBrands([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.resolved, auth.user]);

  const upsertAttachment = useCallback((next: StudioIntentPlanAttachment) => {
    setAttachments((prev) => {
      if (next.kind === "character" || next.kind === "brand") {
        const without = prev.filter((a) => a.kind !== next.kind || a.id !== next.id);
        const exists = prev.some((a) => a.kind === next.kind && a.id === next.id);
        if (exists) return without;
        if (next.kind === "character") {
          return [...without.filter((a) => a.kind !== "character"), next];
        }
        return [...without.filter((a) => a.kind !== "brand"), next];
      }
      return [...prev.filter((a) => !(a.kind === next.kind && a.id === next.id)), next];
    });
    setPlan(null);
    setMissingHint(null);
  }, []);

  const removeAttachment = useCallback((kind: StudioIntentPlanAttachment["kind"], id: string) => {
    setAttachments((prev) => prev.filter((a) => !(a.kind === kind && a.id === id)));
    setPlan(null);
  }, []);

  const openInspirationWizard = (id: StudioAiHomeInspirationId, idea: string) => {
    const media = attachments.find((item) => item.kind === "media" && item.url);
    const character = attachments.find((item) => item.kind === "character");
    const target = inspirationWizardHref(id, {
      idea,
      mediaUrl: media?.url,
      characterId: character?.id,
    });
    const nextPlan = buildStudioAiHomeIntentPlan({
      prompt: idea,
      attachments,
      inspirationId: id,
      locale: locale === "en" ? "en" : "nl",
    });
    storeStudioAiHomeIntentPlan({ ...nextPlan, handoffHref: target.href });
    rememberStudioWorkflow({ id, href: target.href });
    trackAiHomeEvent("studio_ai_home_inspiration", { id, href: target.href });
    router.push(target.href);
  };

  const onPickInspiration = (id: StudioAiHomeInspirationId) => {
    const row = STUDIO_AI_HOME_INSPIRATION.find((e) => e.id === id);
    if (!row) return;
    const prefill = t(row.prefillKey);
    setInspirationId(id);
    setPrompt(prefill);
    setPlan(null);
    setMissingHint(null);
    openInspirationWizard(id, prefill);
  };

  const onMediaFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    void persistStagedStudioImage(file, { ownerId: auth.user?.id ?? null });
    upsertAttachment({
      kind: "media",
      id: `local-${file.name}-${file.size}`,
      name: file.name,
      url,
    });
    setPicker(null);
    trackAiHomeEvent("studio_ai_home_attach_media");
  };

  const runInterpretAndConfirm = async () => {
    setError(null);
    setMissingHint(null);
    const trimmed = prompt.trim();
    if (!trimmed && !inspirationId) {
      setMissingHint(t("studio.aiHome.missing.prompt"));
      return;
    }

    setBusy(true);
    try {
      let interpretation = null;
      if (auth.user && trimmed) {
        const interpreted = await interpretStudioAiHomePrompt({
          message: trimmed,
          locale,
        });
        interpretation = interpreted.interpretation;
      }

      const nextPlan = buildStudioAiHomeIntentPlan({
        prompt: trimmed,
        attachments,
        inspirationId,
        interpretation,
        locale: locale === "en" ? "en" : "nl",
      });

      if (nextPlan.missingRequired.length > 0 && nextPlan.missingQuestionKey) {
        setMissingHint(t(nextPlan.missingQuestionKey as never));
        setPlan(null);
        setBusy(false);
        return;
      }

      let credits: number | null = nextPlan.free ? 0 : null;
      let canProceed = true;
      let after: number | null = null;

      if (!nextPlan.free && nextPlan.billingActionType && auth.user) {
        const preview = await previewStudioAiHomeCredits(nextPlan.billingActionType);
        if (preview.ok && preview.preview) {
          credits = preview.preview.requiredCredits;
          canProceed = preview.preview.allowed;
          after = preview.preview.balanceAfter;
        } else {
          credits = null;
          // Still allow confirm UI; gate on make if preview fails for auth users
          canProceed = preview.code !== "INSUFFICIENT_CREDITS";
        }
      } else if (!nextPlan.free && !auth.user) {
        canProceed = false;
      }

      setEstimatedCredits(credits);
      setAllowed(nextPlan.free || canProceed);
      setBalanceAfter(after);
      setPlan({ ...nextPlan, estimatedCredits: credits });
      trackAiHomeEvent("studio_ai_home_plan", {
        pipeline: nextPlan.recommendedPipeline,
        free: nextPlan.free,
      });
    } catch {
      setError(t("studio.aiHome.error.generic"));
    } finally {
      setBusy(false);
    }
  };

  const creativeIntent = classifyStudioCreativeIntent(prompt);
  const projectHandoff =
    creativeIntent === "FILM" ? "film" : creativeIntent === "OPEN_EXISTING_PROJECT" ? "existing" : null;
  const editorIntent: StudioCreativeIntent | null =
    creativeIntent && creativeIntent !== "FILM" && creativeIntent !== "OPEN_EXISTING_PROJECT" ? creativeIntent : null;
  const editorHref = editorIntent
    ? creativeIntentHandoffHref(editorIntent, prompt, {
        mediaUrl: attachments.find((item) => item.kind === "media" && item.url)?.url ?? null,
      })
    : null;

  const onConfirmMake = () => {
    if (!plan) return;
    if (projectHandoff) {
      void completeProjectHandoff(projectHandoff);
      return;
    }
    if (inspirationId) {
      const target = inspirationWizardHref(inspirationId, {
        idea: prompt,
        mediaUrl: attachments.find((item) => item.kind === "media" && item.url)?.url,
        characterId: attachments.find((item) => item.kind === "character")?.id,
      });
      if (!auth.user && !plan.free) rememberDraft();
      storeStudioAiHomeIntentPlan({ ...plan, handoffHref: target.href });
      rememberStudioWorkflow({ id: inspirationId, href: target.href });
      trackAiHomeEvent("studio_ai_home_make", {
        pipeline: plan.recommendedPipeline,
        href: target.href,
      });
      router.push(target.href);
      return;
    }
    if (editorHref) {
      if (!auth.user) rememberDraft();
      storeStudioAiHomeIntentPlan({ ...plan, handoffHref: editorHref });
      trackAiHomeEvent("studio_ai_home_make", {
        pipeline: plan.recommendedPipeline,
        href: editorHref,
      });
      router.push(editorHref);
      return;
    }
    if (!plan.free && !allowed) return;
    if (!auth.user && !plan.free) {
      rememberDraft();
      router.push(`/login?next=${encodeURIComponent("/studio")}`);
      return;
    }
    storeStudioAiHomeIntentPlan(plan);
    trackAiHomeEvent("studio_ai_home_make", {
      pipeline: plan.recommendedPipeline,
      href: plan.handoffHref,
    });
    router.push(plan.handoffHref);
  };

  const rememberDraft = () => {
    try {
      writeHomeDraft({ prompt, attachments, inspirationId });
    } catch {
      /* ignore */
    }
  };

  const completeProjectHandoff = async (kind: "film" | "existing") => {
    if (busy || !auth.resolved) return;
    if (!auth.user) {
      rememberDraft();
      router.push(`/login?next=${encodeURIComponent("/studio")}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (kind === "film") {
        const response = await fetch("/api/studio/films", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: filmTitleFromPrompt(prompt),
            description: filmDescriptionFromPrompt(prompt),
            idempotencyKey: filmRequestKey(prompt),
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { projectId?: string; error?: string };
        if (!response.ok || !payload.projectId) {
          setError(payload.error || t("studio.aiHome.error.generic"));
          return;
        }
        storeStudioAiHomeIntentPlan(plan!);
        bindStudioAiHomeIntentProject(payload.projectId);
        router.push(`/studio/projects/${payload.projectId}?section=overview&workflow=film`);
        return;
      }
      const response = await fetch("/api/studio/creative-projects?recent=1&limit=1", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as { projects?: Array<{ id: string }> };
      const projectId = payload.projects?.[0]?.id;
      router.push(projectId ? `/studio/projects/${projectId}` : "/projects");
    } catch {
      setError(t("studio.aiHome.error.generic"));
    } finally {
      setBusy(false);
    }
  };

  const productProps = props.filter((p) =>
    ["packaging", "food", "drink", "brand_asset", "tool", "other"].includes(p.category)
  );

  return (
    <section className="space-y-4 overflow-x-hidden [@media(max-height:500px)]:space-y-2" data-testid="studio-ai-home-composer">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl [@media(max-height:500px)]:text-lg">
          {t("studio.aiHome.prompt.title")}
        </h1>
        <p className="text-sm text-zinc-600 [@media(max-height:500px)]:hidden">{t("studio.aiHome.prompt.subtitle")}</p>
      </div>

      <div
        className={`space-y-3 p-3 sm:p-4 ${studioVisual.editorSurface}`}
        data-testid="studio-ai-home-prompt-card"
      >
        <label htmlFor={promptId} className="sr-only">
          {t("studio.aiHome.prompt.title")}
        </label>
        <textarea
          id={promptId}
          data-testid="studio-ai-home-prompt"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setPlan(null);
            setMissingHint(null);
          }}
          rows={3}
          placeholder={t("studio.aiHome.prompt.placeholder")}
          className="max-h-[40vh] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006D52] sm:text-sm"
        />

        {attachments.length > 0 ?
          <ul className="flex max-w-full flex-wrap gap-2" data-testid="studio-ai-home-attachments">
            {attachments.map((a) => {
              const kindKey =
                a.kind === "media"
                  ? "studio.aiHome.attach.media"
                  : a.kind === "character"
                    ? "studio.aiHome.attach.character"
                    : a.kind === "product"
                      ? "studio.aiHome.attach.product"
                      : "studio.aiHome.attach.brand";
              return (
                <li key={`${a.kind}-${a.id}`} className="max-w-full">
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.kind, a.id)}
                    className="inline-flex max-w-full min-h-[40px] items-center gap-1 truncate rounded-full border border-zinc-200 bg-zinc-50 px-3 text-xs font-medium text-zinc-800"
                    aria-label={t("studio.aiHome.attach.remove", { name: a.name })}
                  >
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t(kindKey)}
                    </span>
                    <span className="truncate">{a.name}</span>
                    <span aria-hidden className="shrink-0">
                      ×
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex max-w-full flex-wrap gap-2">
            {(
              [
                ["media", "studio.aiHome.attach.media"],
                ["character", "studio.aiHome.attach.character"],
                ["product", "studio.aiHome.attach.product"],
                ["brand", "studio.aiHome.attach.brand"],
              ] as const
            ).map(([kind, key]) => (
              <button
                key={kind}
                type="button"
                data-testid={`studio-ai-home-attach-${kind}`}
                onClick={() => {
                  if (kind === "media") {
                    fileInputRef.current?.click();
                    return;
                  }
                  if (!auth.user) {
                    try {
                      writeHomeDraft({ prompt, attachments, inspirationId });
                    } catch {
                      /* ignore */
                    }
                    router.push(`/login?next=${encodeURIComponent("/studio")}`);
                    return;
                  }
                  setPicker((p) => (p === kind ? null : kind));
                }}
                className={`min-h-[44px] rounded-full border px-3 text-xs font-semibold ${
                  picker === kind
                    ? "border-[#006D52] bg-[#006D52]/10 text-[#006D52]"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                }`}
              >
                + {t(key)}
              </button>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            data-testid="studio-ai-home-media-input"
            onChange={(e) => onMediaFiles(e.target.files)}
          />
          <button
            type="button"
            data-testid="studio-ai-home-submit"
            disabled={busy}
            onClick={() => void runInterpretAndConfirm()}
            className={`min-h-[48px] w-full px-5 py-2.5 text-sm font-semibold sm:ml-auto sm:w-auto disabled:opacity-60 ${studioVisual.btnGradientPrimary}`}
          >
            {busy ? t("studio.aiHome.confirm.loading") : t("studio.aiHome.prompt.submit")}
          </button>
        </div>

        {picker === "character" ?
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3" data-testid="studio-ai-home-picker-character">
            {characters.length === 0 ?
              <p className="text-sm text-zinc-600">
                {t("studio.aiHome.characters.empty")}{" "}
                <Link href="/studio/characters/new" className="font-semibold text-[#006D52] underline">
                  {t("studio.aiHome.characters.new")}
                </Link>
              </p>
            : <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {characters.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="flex min-h-[40px] w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-white"
                      onClick={() =>
                        upsertAttachment({
                          kind: "character",
                          id: c.id,
                          name: c.name,
                          url: c.referenceImageUrl,
                        })
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.referenceImageUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>}
          </div>
        : null}

        {picker === "product" ?
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3" data-testid="studio-ai-home-picker-product">
            {productProps.length === 0 ?
              <p className="text-sm text-zinc-600">{t("studio.aiHome.products.empty")}</p>
            : <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {productProps.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex min-h-[40px] w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-white"
                      onClick={() =>
                        upsertAttachment({
                          kind: "product",
                          id: p.id,
                          name: p.name,
                          url: p.referenceImageUrl,
                        })
                      }
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>}
          </div>
        : null}

        {picker === "brand" ?
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3" data-testid="studio-ai-home-picker-brand">
            {brands.length === 0 ?
              <p className="text-sm text-zinc-600">{t("studio.aiHome.brands.empty")}</p>
            : <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {brands.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      className="flex min-h-[40px] w-full items-center rounded-lg px-2 text-left text-sm hover:bg-white"
                      onClick={() =>
                        upsertAttachment({
                          kind: "brand",
                          id: b.id,
                          name: b.name,
                          url: b.url,
                        })
                      }
                    >
                      {b.name}
                    </button>
                  </li>
                ))}
              </ul>}
          </div>
        : null}
      </div>

      {missingHint ?
        <p className="text-sm text-amber-800" data-testid="studio-ai-home-missing">
          {missingHint}
        </p>
      : null}
      {error ?
        <p className="text-sm text-red-700" data-testid="studio-ai-home-error">
          {error}
        </p>
      : null}

      {plan ?
        <StudioAiHomeConfirmPanel
          plan={plan}
          estimatedCredits={estimatedCredits}
          balanceAfter={balanceAfter}
          allowed={allowed || plan.free || Boolean(editorHref)}
          loading={busy || !auth.resolved}
          projectHandoff={projectHandoff}
          editorIntent={editorIntent}
          onConfirm={onConfirmMake}
          onAdjust={() => {
            setPlan(null);
            trackAiHomeEvent("studio_ai_home_adjust");
          }}
          onAdvanced={() => {
            storeStudioAiHomeIntentPlan({ ...plan, handoffHref: editorHref ?? plan.handoffHref });
            router.push(editorHref ?? plan.handoffHref);
          }}
        />
      : null}

      <section className="space-y-2" data-testid="studio-ai-home-inspiration">
        <h2 className="text-sm font-semibold text-zinc-900">
          {t("studio.aiHome.inspiration.try")}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {visibleInspiration.map((item) => {
            const active = inspirationId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  data-testid={`studio-ai-home-inspiration-${item.id}`}
                  aria-pressed={active}
                  onClick={() => onPickInspiration(item.id)}
                  className={`min-h-[40px] rounded-full border px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006D52] sm:text-sm ${
                    active
                      ? "border-[#006D52] bg-[#006D52]/15 text-[#054b39]"
                      : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
                  }`}
                >
                  {t(item.titleKey)}
                  {item.free ?
                    <span className="ml-1 text-[10px] uppercase text-[#006D52]">
                      {t("studio.slice1a.free.badge")}
                    </span>
                  : null}
                </button>
              </li>
            );
          })}
          {!showAllInspiration && STUDIO_AI_HOME_INSPIRATION.length > STUDIO_AI_HOME_INSPIRATION_PRIMARY_COUNT ?
            <li>
              <button
                type="button"
                data-testid="studio-ai-home-inspiration-more"
                onClick={() => setShowAllInspiration(true)}
                className="min-h-[40px] rounded-full border border-dashed border-zinc-300 bg-transparent px-3 text-xs font-semibold text-zinc-600 hover:border-zinc-400"
              >
                {t("studio.aiHome.inspiration.more")}
              </button>
            </li>
          : null}
        </ul>
      </section>

      {auth.user ?
        <section className="space-y-2" data-testid="studio-ai-home-characters">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">
              {t("studio.aiHome.characters.title")}
            </h2>
            <Link
              href="/studio/characters/new"
              className="text-xs font-semibold text-[#006D52] underline-offset-2 hover:underline"
              data-testid="studio-ai-home-character-new"
            >
              {t("studio.aiHome.characters.new")}
            </Link>
          </div>
          {characters.length > 0 ?
            <ul className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {characters.slice(0, 8).map((c) => {
                const selected = selectedCharacterIds.has(c.id);
                return (
                  <li key={c.id} className="shrink-0">
                    <button
                      type="button"
                      data-testid="studio-ai-home-character-chip"
                      aria-pressed={selected}
                      onClick={() =>
                        upsertAttachment({
                          kind: "character",
                          id: c.id,
                          name: c.name,
                          url: c.referenceImageUrl,
                        })
                      }
                      className={`flex min-h-[44px] items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                        selected
                          ? "border-[#006D52] bg-[#006D52]/10 text-[#006D52] ring-1 ring-[#006D52]/30"
                          : "border-zinc-200 bg-white text-zinc-800"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.referenceImageUrl}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                      {c.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          : <p className="text-sm text-zinc-500" data-testid="studio-ai-home-characters-empty">
              {t("studio.aiHome.characters.empty")}
            </p>}
        </section>
      : null}
    </section>
  );
}
