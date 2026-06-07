"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioWorldIdentityTypePreviewCard } from "@/components/studio/studio-world-identity-type-preview";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { useStudioAdvancedFeatures } from "@/lib/studio-advanced-features";
import {
  worldIdentityCompletenessTier,
  worldIdentityFormFromWorld,
  worldIdentityFormToPatch,
  mergeWorldIdentityForm,
  type WorldIdentityFormValues,
} from "@/lib/studio-world-identity-fields";
import {
  buildWorldIdentityAiSuggestion,
  diffWorldIdentityForm,
  hasWorldIdentitySuggestion,
} from "@/lib/studio-world-identity-suggestion";
import {
  listVisibleWorldTypes,
  WORLD_IDENTITY_TYPE_PREVIEW_IDS,
  isAdvancedWorldPreviewType,
  WORLD_IDENTITY_VISUAL_STYLES,
  WORLD_IDENTITY_SHAPES,
  WORLD_IDENTITY_COLOR_THEMES,
  WORLD_IDENTITY_LIGHTING,
  WORLD_IDENTITY_MOODS,
  WORLD_IDENTITY_ENV_FEELS,
  WORLD_IDENTITY_MUSIC_STYLES,
  WORLD_IDENTITY_AMBIENCE,
  WORLD_IDENTITY_AUDIO_ENERGY,
  WORLD_IDENTITY_VOICE_DIRECTIONS,
  WORLD_IDENTITY_SOUND_FEELS,
  WORLD_IDENTITY_CAMERA_STYLES,
  WORLD_IDENTITY_MOTION_STYLES,
  WORLD_IDENTITY_PACING,
  WORLD_IDENTITY_PREFERRED_SHOTS,
  WORLD_IDENTITY_RENDER_STRATEGIES,
} from "@/lib/studio-world-identity-presets";
import { identityCompleteness, toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import { updateStudioWorldApi } from "@/lib/studio-worlds-client";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

type Props = {
  worlds: StudioWorldProfileListItem[];
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  storyboard?: StudioStoryboardDetail | null;
  memory?: StudioProjectMemorySnapshot | null;
  canModify: boolean;
  isAdmin?: boolean;
  onWorldUpdated: (world: StudioWorldProfileListItem) => void;
  onSwitchTool?: (tool: StudioToolId) => void;
  initialWorldId?: string | null;
};

function presetKey(group: string, id: string): TranslationKey {
  return `studio.worldIdentity.presets.${group}.${id}` as TranslationKey;
}

function fieldLabelKey(field: string): TranslationKey {
  return `studio.worldIdentity.fields.${field}` as TranslationKey;
}

function formatCompareValue(
  key: keyof WorldIdentityFormValues,
  source: WorldIdentityFormValues | Partial<WorldIdentityFormValues>
): string {
  const raw = source[key];
  if (key === "renderStrategies") {
    return Array.isArray(raw) ? raw.join(", ") || "—" : "—";
  }
  return String(raw ?? "—");
}

export function StudioWorkspaceWorldIdentityBuilder({
  worlds,
  characters,
  locations,
  props,
  storyboard,
  memory,
  canModify,
  isAdmin = false,
  onWorldUpdated,
  onSwitchTool,
  initialWorldId,
}: Props) {
  const t = useActiveTranslator();
  const [advancedFeatures] = useStudioAdvancedFeatures();
  const showAdvancedTypes = isAdmin || advancedFeatures;

  const [selectedId, setSelectedId] = useState<string | null>(
    initialWorldId ?? worlds[0]?.id ?? null
  );
  const [form, setForm] = useState<WorldIdentityFormValues | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedOk, setSavedOk] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("core");

  const selectedWorld = useMemo(
    () => worlds.find((w) => w.id === selectedId) ?? null,
    [worlds, selectedId]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!selectedWorld) {
        setForm(null);
        return;
      }
      setForm(worldIdentityFormFromWorld(selectedWorld));
      setSavedOk(false);
      setSaveError("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedWorld]);

  const aiSuggestion = useMemo(() => {
    if (!storyboard || !selectedWorld) return null;
    return buildWorldIdentityAiSuggestion({
      storyboard,
      world: selectedWorld,
      characters,
      locations,
      props,
      worlds,
      memory,
    });
  }, [storyboard, selectedWorld, characters, locations, props, worlds, memory]);

  const showSuggestion = useMemo(() => {
    if (!selectedWorld || !aiSuggestion) return false;
    return hasWorldIdentitySuggestion(selectedWorld, aiSuggestion);
  }, [selectedWorld, aiSuggestion]);

  const completenessScore = useMemo(() => {
    if (!selectedWorld || !form) return 0;
    const patch = worldIdentityFormToPatch(form);
    const merged: StudioWorldProfileListItem = {
      ...selectedWorld,
      name: patch.name ?? selectedWorld.name,
      description: patch.description ?? selectedWorld.description,
      visualStyle: patch.visualStyle ?? selectedWorld.visualStyle,
      tone: patch.tone ?? selectedWorld.tone,
      continuityRules: patch.continuityRules ?? selectedWorld.continuityRules,
    };
    return identityCompleteness(toIdentitySpec(merged));
  }, [selectedWorld, form]);

  const completenessTier = worldIdentityCompletenessTier(completenessScore);
  const visibleWorldTypes = listVisibleWorldTypes(showAdvancedTypes);

  const linkedCharacters = useMemo(
    () => characters.filter((c) => c.worldProfileId === selectedId),
    [characters, selectedId]
  );

  const linkedLocations = useMemo(
    () => locations.filter((l) => l.worldProfileId === selectedId),
    [locations, selectedId]
  );

  const linkedProps = useMemo(
    () => props.filter((p) => p.worldProfileId === selectedId),
    [props, selectedId]
  );

  const preferredShotSet = useMemo(() => {
    if (!form) return new Set<string>();
    return new Set(
      form.preferredShots
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    );
  }, [form]);

  const updateField = useCallback(
    <K extends keyof WorldIdentityFormValues>(key: K, value: WorldIdentityFormValues[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
      setSavedOk(false);
    },
    []
  );

  const applyPreset = useCallback(
    (
      group:
        | "type"
        | "visualStyle"
        | "shape"
        | "color"
        | "lighting"
        | "mood"
        | "env"
        | "music"
        | "ambience"
        | "energy"
        | "voice"
        | "sound"
        | "camera"
        | "motion"
        | "pacing",
      id: string
    ) => {
      if (group === "type") updateField("worldType", id);
      if (group === "visualStyle") updateField("visualStyle", id);
      if (group === "shape") updateField("shapeLanguage", id);
      if (group === "color") updateField("colorTheme", id);
      if (group === "lighting") updateField("lighting", id);
      if (group === "mood") updateField("mood", id);
      if (group === "env") updateField("environmentFeel", id);
      if (group === "music") updateField("musicStyle", id);
      if (group === "ambience") updateField("ambience", id);
      if (group === "energy") updateField("audioEnergy", id);
      if (group === "voice") updateField("voiceDirection", id);
      if (group === "sound") updateField("soundFeel", id);
      if (group === "camera") updateField("cameraStyle", id);
      if (group === "motion") updateField("motionStyle", id);
      if (group === "pacing") updateField("pacing", id);
    },
    [updateField]
  );

  const togglePreferredShot = useCallback((shotId: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const parts = prev.preferredShots
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const set = new Set(parts);
      if (set.has(shotId)) {
        set.delete(shotId);
      } else {
        set.add(shotId);
      }
      return { ...prev, preferredShots: [...set].join(", ") };
    });
    setSavedOk(false);
  }, []);

  const toggleRenderStrategy = useCallback((strategyId: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const set = new Set(prev.renderStrategies);
      if (set.has(strategyId)) {
        set.delete(strategyId);
      } else {
        set.add(strategyId);
      }
      return { ...prev, renderStrategies: [...set] };
    });
    setSavedOk(false);
  }, []);

  const handleSave = async () => {
    if (!selectedWorld || !form || !canModify) return;
    setSaveBusy(true);
    setSaveError("");
    const res = await updateStudioWorldApi(selectedWorld.id, worldIdentityFormToPatch(form));
    setSaveBusy(false);
    if (!res.ok) {
      setSaveError(t("studio.worldIdentity.saveFailed"));
      return;
    }
    onWorldUpdated(res.data.world);
    setForm(worldIdentityFormFromWorld(res.data.world));
    setSavedOk(true);
  };

  const applyAiSuggestion = () => {
    if (!form || !aiSuggestion) return;
    setForm(mergeWorldIdentityForm(form, aiSuggestion));
    setCompareOpen(false);
    setSavedOk(false);
  };

  if (worlds.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
        {t("studio.worldIdentity.noWorlds")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.worldIdentity.title")}</h3>
        <p className="mt-1 text-xs text-zinc-600">{t("studio.worldIdentity.hint")}</p>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-zinc-700">
          {t("studio.worldIdentity.selectWorld")}
        </span>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        >
          {worlds.map((world) => (
            <option key={world.id} value={world.id}>
              {world.name}
            </option>
          ))}
        </select>
      </label>

      {selectedWorld && form ?
        <>
          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.worldIdentity.completeness.label")}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {t(`studio.worldIdentity.completeness.${completenessTier}`)}
              <span className="ml-2 text-xs font-normal text-zinc-500">({completenessScore}%)</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-[#0067B1] transition-all"
                style={{ width: `${completenessScore}%` }}
              />
            </div>
          </div>

          {showSuggestion ?
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-900">
                {t("studio.worldIdentity.suggestion.available")}
              </p>
              <button
                type="button"
                onClick={() => setCompareOpen((v) => !v)}
                className="mt-2 text-xs font-semibold text-[#0067B1] hover:underline"
              >
                {compareOpen ?
                  t("studio.worldIdentity.suggestion.hideCompare")
                : t("studio.worldIdentity.suggestion.showCompare")}
              </button>
              {compareOpen && aiSuggestion ?
                <div className="mt-3 space-y-2 text-xs">
                  {diffWorldIdentityForm(form, aiSuggestion).map((key) => (
                    <div key={key} className="grid gap-1 sm:grid-cols-2">
                      <div className="rounded-lg bg-white/80 p-2">
                        <p className="font-semibold text-zinc-500">
                          {t("studio.worldIdentity.suggestion.current")}
                        </p>
                        <p className="text-zinc-800">{formatCompareValue(key, form)}</p>
                      </div>
                      <div className="rounded-lg bg-white p-2 ring-1 ring-[#0067B1]/20">
                        <p className="font-semibold text-[#0067B1]">
                          {t("studio.worldIdentity.suggestion.proposed")}
                        </p>
                        <p className="text-zinc-800">{formatCompareValue(key, aiSuggestion)}</p>
                      </div>
                    </div>
                  ))}
                  {canModify ?
                    <button
                      type="button"
                      onClick={applyAiSuggestion}
                      className="rounded-full bg-[#0067B1] px-4 py-2 text-xs font-semibold text-white"
                    >
                      {t("studio.worldIdentity.suggestion.apply")}
                    </button>
                  : null}
                </div>
              : null}
            </div>
          : null}

          {[
            { id: "core", title: t("studio.worldIdentity.sections.core") },
            { id: "visual", title: t("studio.worldIdentity.sections.visual") },
            { id: "audio", title: t("studio.worldIdentity.sections.audio") },
            { id: "motion", title: t("studio.worldIdentity.sections.motion") },
            { id: "context", title: t("studio.worldIdentity.sections.context") },
          ].map((section) => (
            <div key={section.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <button
                type="button"
                onClick={() =>
                  setExpandedSection((s) => (s === section.id ? "" : section.id))
                }
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-zinc-900"
              >
                {section.title}
                <span className="text-zinc-400">{expandedSection === section.id ? "−" : "+"}</span>
              </button>

              {expandedSection === section.id ?
                <div className="space-y-3 border-t border-zinc-100 px-4 py-4">
                  {section.id === "core" ?
                    <>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("name"))}
                        </span>
                        <input
                          value={form.name}
                          disabled={!canModify}
                          onChange={(e) => updateField("name", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("description"))}
                        </span>
                        <textarea
                          value={form.description}
                          disabled={!canModify}
                          rows={2}
                          onChange={(e) => updateField("description", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("worldType"))}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {visibleWorldTypes.map((typeId) =>
                            WORLD_IDENTITY_TYPE_PREVIEW_IDS.includes(typeId) ?
                              <StudioWorldIdentityTypePreviewCard
                                key={typeId}
                                worldTypeId={typeId}
                                selected={form.worldType === typeId}
                                onSelect={() => canModify && applyPreset("type", typeId)}
                              />
                            : (
                              <button
                                key={typeId}
                                type="button"
                                disabled={!canModify}
                                onClick={() => applyPreset("type", typeId)}
                                className={`rounded-lg border px-2 py-2 text-left text-xs ${
                                  form.worldType === typeId ?
                                    "border-[#0067B1] bg-[#0067B1]/5 font-semibold"
                                  : "border-zinc-200"
                                } ${isAdvancedWorldPreviewType(typeId) ? "opacity-95" : ""}`}
                              >
                                {t(`studio.worldIdentity.types.${typeId}` as TranslationKey)}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </>
                  : null}

                  {section.id === "visual" ?
                    <>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("visualStyle"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_VISUAL_STYLES.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("visualStyle", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.visualStyle === id ?
                                  "bg-[#0067B1] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.visualStyles.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("shapeLanguage"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_SHAPES.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("shape", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.shapeLanguage === id ?
                                  "bg-[#0067B1]/10 text-[#0067B1]"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.shapes.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("colorTheme"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_COLOR_THEMES.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("color", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.colorTheme === id ?
                                  "bg-[#006D52] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(presetKey("color", id))}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("lighting"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_LIGHTING.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("lighting", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.lighting === id ?
                                  "bg-amber-100 text-amber-900"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.lighting.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("mood"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_MOODS.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("mood", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.mood === id ?
                                  "bg-[#006D52] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.moods.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("environmentFeel"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_ENV_FEELS.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("env", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.environmentFeel === id ?
                                  "bg-[#0067B1]/10 text-[#0067B1]"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.envFeels.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("visualDetails"))}
                        </span>
                        <textarea
                          value={form.visualDetails}
                          disabled={!canModify}
                          rows={2}
                          onChange={(e) => updateField("visualDetails", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          placeholder={t("studio.worldIdentity.placeholders.visualDetails")}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("forbiddenElements"))}
                        </span>
                        <textarea
                          value={form.forbiddenElements}
                          disabled={!canModify}
                          rows={2}
                          onChange={(e) => updateField("forbiddenElements", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                    </>
                  : null}

                  {section.id === "audio" ?
                    <>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("musicStyle"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_MUSIC_STYLES.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("music", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.musicStyle === id ?
                                  "bg-[#0067B1] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.musicStyles.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("ambience"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_AMBIENCE.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("ambience", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.ambience === id ?
                                  "bg-[#006D52] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.ambience.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("audioEnergy"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_AUDIO_ENERGY.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("energy", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.audioEnergy === id ?
                                  "bg-[#0067B1]/10 text-[#0067B1]"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.audioEnergy.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("voiceDirection"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_VOICE_DIRECTIONS.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("voice", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.voiceDirection === id ?
                                  "bg-amber-100 text-amber-900"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.voiceDirections.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("soundFeel"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_SOUND_FEELS.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("sound", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.soundFeel === id ?
                                  "bg-[#006D52] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.soundFeels.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("audioDetails"))}
                        </span>
                        <textarea
                          value={form.audioDetails}
                          disabled={!canModify}
                          rows={2}
                          onChange={(e) => updateField("audioDetails", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          placeholder={t("studio.worldIdentity.placeholders.audioDetails")}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("audioForbiddenElements"))}
                        </span>
                        <textarea
                          value={form.audioForbiddenElements}
                          disabled={!canModify}
                          rows={2}
                          onChange={(e) => updateField("audioForbiddenElements", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                    </>
                  : null}

                  {section.id === "motion" ?
                    <>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("cameraStyle"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_CAMERA_STYLES.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("camera", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.cameraStyle === id ?
                                  "bg-[#0067B1] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.cameraStyles.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("motionStyle"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_MOTION_STYLES.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("motion", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.motionStyle === id ?
                                  "bg-[#0067B1]/10 text-[#0067B1]"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.motionStyles.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("pacing"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_PACING.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("pacing", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.pacing === id ?
                                  "bg-[#006D52] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.pacing.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("preferredShots"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_PREFERRED_SHOTS.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => togglePreferredShot(id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                preferredShotSet.has(id) ?
                                  "bg-[#0067B1] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.preferredShots.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("forbiddenShotStyles"))}
                        </span>
                        <textarea
                          value={form.forbiddenShotStyles}
                          disabled={!canModify}
                          rows={2}
                          onChange={(e) => updateField("forbiddenShotStyles", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("renderStrategies"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WORLD_IDENTITY_RENDER_STRATEGIES.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => toggleRenderStrategy(id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.renderStrategies.includes(id) ?
                                  "bg-[#0067B1] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.worldIdentity.renderStrategies.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  : null}

                  {section.id === "context" ?
                    <>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("usageContext"))}
                        </span>
                        <textarea
                          value={form.usageContext}
                          disabled={!canModify}
                          rows={2}
                          onChange={(e) => updateField("usageContext", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("brandRules"))}
                        </span>
                        <textarea
                          value={form.brandRules}
                          disabled={!canModify}
                          rows={2}
                          onChange={(e) => updateField("brandRules", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-zinc-700">
                            {t(fieldLabelKey("linkedCharacters"))}
                          </p>
                          {onSwitchTool ?
                            <button
                              type="button"
                              onClick={() => onSwitchTool("characters")}
                              className="text-[11px] font-semibold text-[#0067B1] hover:underline"
                            >
                              {t("studio.worldIdentity.open")}
                            </button>
                          : null}
                        </div>
                        {linkedCharacters.length === 0 ?
                          <p className="mt-1 text-xs text-zinc-500">
                            {t("studio.worldIdentity.noLinkedCharacters")}
                          </p>
                        : (
                          <ul className="mt-2 space-y-1">
                            {linkedCharacters.map((character) => (
                              <li
                                key={character.id}
                                className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-800"
                              >
                                {character.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-zinc-700">
                            {t(fieldLabelKey("linkedLocations"))}
                          </p>
                          {onSwitchTool ?
                            <button
                              type="button"
                              onClick={() => onSwitchTool("locations")}
                              className="text-[11px] font-semibold text-[#0067B1] hover:underline"
                            >
                              {t("studio.worldIdentity.open")}
                            </button>
                          : null}
                        </div>
                        {linkedLocations.length === 0 ?
                          <p className="mt-1 text-xs text-zinc-500">
                            {t("studio.worldIdentity.noLinkedLocations")}
                          </p>
                        : (
                          <ul className="mt-2 space-y-1">
                            {linkedLocations.map((location) => (
                              <li
                                key={location.id}
                                className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-800"
                              >
                                {location.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-zinc-700">
                            {t(fieldLabelKey("linkedProps"))}
                          </p>
                          {onSwitchTool ?
                            <button
                              type="button"
                              onClick={() => onSwitchTool("props")}
                              className="text-[11px] font-semibold text-[#0067B1] hover:underline"
                            >
                              {t("studio.worldIdentity.open")}
                            </button>
                          : null}
                        </div>
                        {linkedProps.length === 0 ?
                          <p className="mt-1 text-xs text-zinc-500">
                            {t("studio.worldIdentity.noLinkedProps")}
                          </p>
                        : (
                          <ul className="mt-2 space-y-1">
                            {linkedProps.map((prop) => (
                              <li
                                key={prop.id}
                                className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-800"
                              >
                                {prop.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <p className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-600">
                        {t("studio.worldIdentity.brandDisclaimer")}
                      </p>
                    </>
                  : null}
                </div>
              : null}
            </div>
          ))}

          {saveError ?
            <p className="text-sm text-red-700">{saveError}</p>
          : null}
          {savedOk ?
            <p className="text-sm text-[#006D52]">{t("studio.worldIdentity.saved")}</p>
          : null}

          {canModify ?
            <button
              type="button"
              disabled={saveBusy}
              onClick={() => void handleSave()}
              className="w-full rounded-full bg-[#0067B1] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              {saveBusy ?
                t("studio.worldIdentity.saving")
              : t("studio.worldIdentity.save")}
            </button>
          : null}
        </>
      : null}
    </div>
  );
}
