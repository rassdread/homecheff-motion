"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioPropIdentityStylePreviewCard } from "@/components/studio/studio-prop-identity-style-preview";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  propIdentityCompletenessTier,
  propIdentityFormFromProp,
  propIdentityFormToPatch,
  mergePropIdentityForm,
  type PropIdentityFormValues,
} from "@/lib/studio-prop-identity-fields";
import { suggestPropLinkedCharacters } from "@/lib/studio-prop-identity-character-suggestions";
import {
  buildPropIdentityAiSuggestion,
  diffPropIdentityForm,
  hasPropIdentitySuggestion,
} from "@/lib/studio-prop-identity-suggestion";
import {
  PROP_IDENTITY_COLOR_THEMES,
  PROP_IDENTITY_FUNCTIONS,
  PROP_IDENTITY_MATERIALS,
  PROP_IDENTITY_SHAPES,
  PROP_IDENTITY_SIZES,
  PROP_IDENTITY_STYLE_PREVIEW_IDS,
  PROP_IDENTITY_STYLES,
  PROP_IDENTITY_TYPES,
} from "@/lib/studio-prop-identity-presets";
import { identityCompleteness, toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import { updateStudioPropApi } from "@/lib/studio-props-client";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

type Props = {
  props: StudioPropListItem[];
  characters: StudioCharacterListItem[];
  worlds: StudioWorldProfileListItem[];
  storyboard?: StudioStoryboardDetail | null;
  locations?: StudioLocationListItem[];
  memory?: StudioProjectMemorySnapshot | null;
  canModify: boolean;
  onPropUpdated: (prop: StudioPropListItem) => void;
  initialPropId?: string | null;
};

function presetKey(group: string, id: string): TranslationKey {
  return `studio.propIdentity.presets.${group}.${id}` as TranslationKey;
}

function fieldLabelKey(field: string): TranslationKey {
  return `studio.propIdentity.fields.${field}` as TranslationKey;
}

export function StudioWorkspacePropIdentityBuilder({
  props,
  characters,
  worlds,
  storyboard,
  locations = [],
  memory,
  canModify,
  onPropUpdated,
  initialPropId,
}: Props) {
  const t = useActiveTranslator();

  const [selectedId, setSelectedId] = useState<string | null>(
    initialPropId ?? props[0]?.id ?? null
  );
  const [form, setForm] = useState<PropIdentityFormValues | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedOk, setSavedOk] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("core");

  const selectedProp = useMemo(
    () => props.find((p) => p.id === selectedId) ?? null,
    [props, selectedId]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!selectedProp) {
        setForm(null);
        return;
      }
      setForm(propIdentityFormFromProp(selectedProp));
      setSavedOk(false);
      setSaveError("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedProp]);

  const aiSuggestion = useMemo(() => {
    if (!storyboard || !selectedProp) return null;
    return buildPropIdentityAiSuggestion({
      storyboard,
      prop: selectedProp,
      characters,
      locations,
      props,
      worlds,
      memory,
    });
  }, [storyboard, selectedProp, characters, locations, props, worlds, memory]);

  const showSuggestion = useMemo(() => {
    if (!selectedProp || !aiSuggestion) return false;
    return hasPropIdentitySuggestion(selectedProp, aiSuggestion);
  }, [selectedProp, aiSuggestion]);

  const completenessScore = useMemo(() => {
    if (!selectedProp || !form) return 0;
    const patch = propIdentityFormToPatch(form);
    const merged: StudioPropListItem = {
      ...selectedProp,
      name: patch.name ?? selectedProp.name,
      category: (patch.category as StudioPropListItem["category"]) ?? selectedProp.category,
      description: patch.description ?? selectedProp.description,
      appearanceMemory: patch.appearanceMemory ?? selectedProp.appearanceMemory,
      brandingRules: patch.brandingRules ?? selectedProp.brandingRules,
      continuityNotes: patch.continuityNotes ?? selectedProp.continuityNotes,
      worldProfileId:
        patch.worldProfileId !== undefined ?
          patch.worldProfileId
        : selectedProp.worldProfileId,
    };
    return identityCompleteness(toIdentitySpec(merged));
  }, [selectedProp, form]);

  const completenessTier = propIdentityCompletenessTier(completenessScore);

  const characterSuggestions = useMemo(() => {
    if (!selectedProp || !form) return [];
    return suggestPropLinkedCharacters({
      prop: selectedProp,
      form,
      characters,
      alreadyLinkedIds: form.linkedCharacterIds,
    });
  }, [selectedProp, form, characters]);

  const updateField = useCallback(
    <K extends keyof PropIdentityFormValues>(key: K, value: PropIdentityFormValues[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
      setSavedOk(false);
    },
    []
  );

  const toggleLinkedCharacter = useCallback((characterId: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const set = new Set(prev.linkedCharacterIds);
      if (set.has(characterId)) {
        set.delete(characterId);
      } else {
        set.add(characterId);
      }
      return { ...prev, linkedCharacterIds: [...set] };
    });
    setSavedOk(false);
  }, []);

  const applyPreset = useCallback(
    (
      group: "type" | "function" | "shape" | "material" | "size" | "color" | "style",
      id: string
    ) => {
      if (group === "type") updateField("propType", id);
      if (group === "function") updateField("propFunction", id);
      if (group === "shape") updateField("shapeLanguage", id);
      if (group === "material") updateField("material", id);
      if (group === "size") updateField("sizeImpression", id);
      if (group === "color") updateField("colorTheme", id);
      if (group === "style") updateField("styleId", id);
    },
    [updateField]
  );

  const handleSave = async () => {
    if (!selectedProp || !form || !canModify) return;
    setSaveBusy(true);
    setSaveError("");
    const res = await updateStudioPropApi(selectedProp.id, propIdentityFormToPatch(form));
    setSaveBusy(false);
    if (!res.ok) {
      setSaveError(t("studio.propIdentity.saveFailed"));
      return;
    }
    onPropUpdated(res.data.prop);
    setForm(propIdentityFormFromProp(res.data.prop));
    setSavedOk(true);
  };

  const applyAiSuggestion = () => {
    if (!form || !aiSuggestion) return;
    setForm(mergePropIdentityForm(form, aiSuggestion));
    setCompareOpen(false);
    setSavedOk(false);
  };

  if (props.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
        {t("studio.propIdentity.noProps")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.propIdentity.title")}</h3>
        <p className="mt-1 text-xs text-zinc-600">{t("studio.propIdentity.hint")}</p>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-zinc-700">
          {t("studio.propIdentity.selectProp")}
        </span>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        >
          {props.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {selectedProp && form ?
        <>
          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.propIdentity.completeness.label")}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {t(`studio.propIdentity.completeness.${completenessTier}`)}
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
                {t("studio.propIdentity.suggestion.available")}
              </p>
              <button
                type="button"
                onClick={() => setCompareOpen((v) => !v)}
                className="mt-2 text-xs font-semibold text-[#0067B1] hover:underline"
              >
                {compareOpen ?
                  t("studio.propIdentity.suggestion.hideCompare")
                : t("studio.propIdentity.suggestion.showCompare")}
              </button>
              {compareOpen && aiSuggestion ?
                <div className="mt-3 space-y-2 text-xs">
                  {diffPropIdentityForm(form, aiSuggestion).map((key) => (
                    <div key={key} className="grid gap-1 sm:grid-cols-2">
                      <div className="rounded-lg bg-white/80 p-2">
                        <p className="font-semibold text-zinc-500">
                          {t("studio.propIdentity.suggestion.current")}
                        </p>
                        <p className="text-zinc-800">
                          {key === "linkedCharacterIds" ?
                            form.linkedCharacterIds
                              .map((id) => characters.find((c) => c.id === id)?.name ?? id)
                              .join(", ") || "—"
                          : String(form[key] ?? "—")}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white p-2 ring-1 ring-[#0067B1]/20">
                        <p className="font-semibold text-[#0067B1]">
                          {t("studio.propIdentity.suggestion.proposed")}
                        </p>
                        <p className="text-zinc-800">
                          {key === "linkedCharacterIds" ?
                            (Array.isArray(aiSuggestion[key]) ?
                              aiSuggestion[key]!
                                .map((id) => characters.find((c) => c.id === id)?.name ?? id)
                                .join(", ")
                            : "—")
                          : String(aiSuggestion[key] ?? "—")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {canModify ?
                    <button
                      type="button"
                      onClick={applyAiSuggestion}
                      className="rounded-full bg-[#0067B1] px-4 py-2 text-xs font-semibold text-white"
                    >
                      {t("studio.propIdentity.suggestion.apply")}
                    </button>
                  : null}
                </div>
              : null}
            </div>
          : null}

          {[
            { id: "core", title: t("studio.propIdentity.sections.core") },
            { id: "shape", title: t("studio.propIdentity.sections.shape") },
            { id: "look", title: t("studio.propIdentity.sections.look") },
            { id: "context", title: t("studio.propIdentity.sections.context") },
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
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("propType"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {PROP_IDENTITY_TYPES.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("type", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.propType === id ?
                                  "bg-[#0067B1] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.propIdentity.types.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("propFunction"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {PROP_IDENTITY_FUNCTIONS.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("function", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.propFunction === id ?
                                  "bg-[#006D52] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.propIdentity.functions.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
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
                    </>
                  : null}

                  {section.id === "shape" ?
                    <>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("shapeLanguage"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {PROP_IDENTITY_SHAPES.map((id) => (
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
                              {t(`studio.propIdentity.shapes.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("styleId"))}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {PROP_IDENTITY_STYLES.map((styleId) =>
                            PROP_IDENTITY_STYLE_PREVIEW_IDS.includes(styleId) ?
                              <StudioPropIdentityStylePreviewCard
                                key={styleId}
                                styleId={styleId}
                                selected={form.styleId === styleId}
                                onSelect={() => canModify && applyPreset("style", styleId)}
                              />
                            : (
                              <button
                                key={styleId}
                                type="button"
                                disabled={!canModify}
                                onClick={() => applyPreset("style", styleId)}
                                className={`rounded-lg border px-2 py-2 text-left text-xs ${
                                  form.styleId === styleId ?
                                    "border-[#0067B1] bg-[#0067B1]/5 font-semibold"
                                  : "border-zinc-200"
                                }`}
                              >
                                {t(`studio.propIdentity.styles.${styleId}` as TranslationKey)}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </>
                  : null}

                  {section.id === "look" ?
                    <>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("material"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {PROP_IDENTITY_MATERIALS.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("material", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.material === id ?
                                  "bg-amber-100 text-amber-900"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.propIdentity.materials.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("colorTheme"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {PROP_IDENTITY_COLOR_THEMES.map((id) => (
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
                          {t(fieldLabelKey("sizeImpression"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {PROP_IDENTITY_SIZES.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("size", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.sizeImpression === id ?
                                  "bg-[#0067B1]/10 text-[#0067B1]"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.propIdentity.sizes.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("appearanceMemory"))}
                        </span>
                        <textarea
                          value={form.appearanceMemory}
                          disabled={!canModify}
                          rows={2}
                          onChange={(e) => updateField("appearanceMemory", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          placeholder={t("studio.propIdentity.placeholders.appearanceMemory")}
                        />
                      </label>
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
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("linkedCharacters"))}
                        </p>
                        {characters.length === 0 ?
                          <p className="mt-1 text-xs text-zinc-500">
                            {t("studio.propIdentity.noCharacters")}
                          </p>
                        : (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {characters.map((character) => (
                              <button
                                key={character.id}
                                type="button"
                                disabled={!canModify}
                                onClick={() => toggleLinkedCharacter(character.id)}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                  form.linkedCharacterIds.includes(character.id) ?
                                    "bg-[#0067B1] text-white"
                                  : "border border-zinc-200 text-zinc-700"
                                }`}
                              >
                                {character.name}
                              </button>
                            ))}
                          </div>
                        )}
                        {characterSuggestions.length > 0 ?
                          <div className="mt-3 rounded-lg border border-dashed border-[#006D52]/30 bg-[#006D52]/5 p-3">
                            <p className="text-[11px] font-semibold text-[#006D52]">
                              {t("studio.propIdentity.characterSuggestions.title")}
                            </p>
                            <p className="mt-1 text-[10px] text-zinc-600">
                              {t("studio.propIdentity.characterSuggestions.hint")}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {characterSuggestions.map((character) => (
                                <button
                                  key={character.id}
                                  type="button"
                                  disabled={!canModify}
                                  onClick={() => toggleLinkedCharacter(character.id)}
                                  className="rounded-full border border-[#006D52]/40 bg-white px-2.5 py-1 text-[11px] font-medium text-[#006D52]"
                                >
                                  {character.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        : null}
                      </div>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("world"))}
                        </span>
                        <select
                          value={form.worldProfileId ?? ""}
                          disabled={!canModify}
                          onChange={(e) =>
                            updateField("worldProfileId", e.target.value || null)
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        >
                          <option value="">{t("studio.propIdentity.noWorld")}</option>
                          {worlds.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </label>
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
            <p className="text-sm text-[#006D52]">{t("studio.propIdentity.saved")}</p>
          : null}

          {canModify ?
            <button
              type="button"
              disabled={saveBusy}
              onClick={() => void handleSave()}
              className="w-full rounded-full bg-[#0067B1] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              {saveBusy ?
                t("studio.propIdentity.saving")
              : t("studio.propIdentity.save")}
            </button>
          : null}
        </>
      : null}
    </div>
  );
}
