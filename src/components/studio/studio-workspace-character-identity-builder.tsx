"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioCharacterIdentityStylePreviewCard } from "@/components/studio/studio-character-identity-style-preview";
import { StudioWorkspaceCharacterVoiceInline } from "@/components/studio/studio-workspace-character-voice-inline";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { useStudioAdvancedFeatures } from "@/lib/studio-advanced-features";
import {
  characterIdentityCompletenessTier,
  characterIdentityFormFromCharacter,
  characterIdentityFormToPatch,
  mergeCharacterIdentityForm,
  resolveCharacterVoiceIdentityStatus,
  type CharacterIdentityFormValues,
} from "@/lib/studio-character-identity-fields";
import {
  buildCharacterIdentityAiSuggestion,
  diffCharacterIdentityForm,
  hasCharacterIdentitySuggestion,
} from "@/lib/studio-character-identity-suggestion";
import {
  CHARACTER_IDENTITY_ACCESSORY_PRESETS,
  CHARACTER_IDENTITY_COLOR_THEMES,
  CHARACTER_IDENTITY_ENERGIES,
  CHARACTER_IDENTITY_OUTFIT_PRESETS,
  CHARACTER_IDENTITY_PERSONALITY_PRESETS,
  CHARACTER_IDENTITY_SHAPE_LANGUAGES,
  CHARACTER_IDENTITY_STYLE_PREVIEW_IDS,
  CHARACTER_IDENTITY_TYPES,
  listVisibleCharacterStyles,
} from "@/lib/studio-character-identity-presets";
import { identityCompleteness, toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import { updateStudioCharacterApi } from "@/lib/studio-characters-client";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

type Props = {
  characters: StudioCharacterListItem[];
  worlds: StudioWorldProfileListItem[];
  storyboard?: StudioStoryboardDetail | null;
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  memory?: StudioProjectMemorySnapshot | null;
  canModify: boolean;
  isAdmin?: boolean;
  storyLanguage?: string;
  storyVoiceProfile?: string | null;
  onCharacterUpdated: (character: StudioCharacterListItem) => void;
  initialCharacterId?: string | null;
};

function presetKey(group: string, id: string): TranslationKey {
  return `studio.characterIdentity.presets.${group}.${id}` as TranslationKey;
}

function fieldLabelKey(field: string): TranslationKey {
  return `studio.characterIdentity.fields.${field}` as TranslationKey;
}

export function StudioWorkspaceCharacterIdentityBuilder({
  characters,
  worlds,
  storyboard,
  locations = [],
  props = [],
  memory,
  canModify,
  isAdmin = false,
  storyLanguage = "en",
  storyVoiceProfile,
  onCharacterUpdated,
  initialCharacterId,
}: Props) {
  const t = useActiveTranslator();
  const [advancedFeatures] = useStudioAdvancedFeatures();
  const showAdvancedStyles = isAdmin || advancedFeatures;

  const [selectedId, setSelectedId] = useState<string | null>(
    initialCharacterId ?? characters[0]?.id ?? null
  );
  const [form, setForm] = useState<CharacterIdentityFormValues | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedOk, setSavedOk] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("core");

  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === selectedId) ?? null,
    [characters, selectedId]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!selectedCharacter) {
        setForm(null);
        return;
      }
      setForm(characterIdentityFormFromCharacter(selectedCharacter));
      setSavedOk(false);
      setSaveError("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedCharacter]);

  const aiSuggestion = useMemo(() => {
    if (!storyboard || !selectedCharacter) return null;
    return buildCharacterIdentityAiSuggestion({
      storyboard,
      character: selectedCharacter,
      characters,
      locations,
      props,
      worlds,
      memory,
    });
  }, [storyboard, selectedCharacter, characters, locations, props, worlds, memory]);

  const showSuggestion = useMemo(() => {
    if (!selectedCharacter || !aiSuggestion) return false;
    return hasCharacterIdentitySuggestion(selectedCharacter, aiSuggestion);
  }, [selectedCharacter, aiSuggestion]);

  const completenessScore = useMemo(() => {
    if (!selectedCharacter || !form) return 0;
    const patch = characterIdentityFormToPatch(form);
    const merged: StudioCharacterListItem = {
      ...selectedCharacter,
      name: patch.name ?? selectedCharacter.name,
      role: (patch.role as StudioCharacterListItem["role"]) ?? selectedCharacter.role,
      description: patch.description ?? selectedCharacter.description,
      personality: patch.personality ?? selectedCharacter.personality,
      appearanceMemory: patch.appearanceMemory ?? selectedCharacter.appearanceMemory,
      personalityMemory: patch.personalityMemory ?? selectedCharacter.personalityMemory,
      visualKeywords: patch.visualKeywords ?? selectedCharacter.visualKeywords,
      defaultClothing: patch.defaultClothing ?? selectedCharacter.defaultClothing,
      defaultAccessories: patch.defaultAccessories ?? selectedCharacter.defaultAccessories,
      continuityNotes: patch.continuityNotes ?? selectedCharacter.continuityNotes,
      worldProfileId:
        patch.worldProfileId !== undefined ?
          patch.worldProfileId
        : selectedCharacter.worldProfileId,
    };
    return identityCompleteness(toIdentitySpec(merged));
  }, [selectedCharacter, form]);

  const completenessTier = characterIdentityCompletenessTier(completenessScore);

  const voiceStatus = selectedCharacter
    ? resolveCharacterVoiceIdentityStatus(selectedCharacter)
    : "none";

  const visibleStyles = listVisibleCharacterStyles(showAdvancedStyles);

  const updateField = useCallback(
    <K extends keyof CharacterIdentityFormValues>(key: K, value: CharacterIdentityFormValues[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
      setSavedOk(false);
    },
    []
  );

  const applyPreset = useCallback(
    (group: "personality" | "outfit" | "accessory" | "color", id: string) => {
      const label = t(presetKey(group, id));
      if (group === "personality") updateField("personality", label);
      if (group === "outfit") updateField("clothing", label);
      if (group === "accessory") updateField("accessories", label);
      if (group === "color") updateField("colorTheme", id);
    },
    [t, updateField]
  );

  const handleSave = async () => {
    if (!selectedCharacter || !form || !canModify) return;
    setSaveBusy(true);
    setSaveError("");
    const res = await updateStudioCharacterApi(
      selectedCharacter.id,
      characterIdentityFormToPatch(form)
    );
    setSaveBusy(false);
    if (!res.ok) {
      setSaveError(t("studio.characterIdentity.saveFailed"));
      return;
    }
    onCharacterUpdated(res.data.character);
    setForm(characterIdentityFormFromCharacter(res.data.character));
    setSavedOk(true);
  };

  const applyAiSuggestion = () => {
    if (!form || !aiSuggestion) return;
    setForm(mergeCharacterIdentityForm(form, aiSuggestion));
    setCompareOpen(false);
    setSavedOk(false);
  };

  if (characters.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
        {t("studio.characterIdentity.noCharacters")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.characterIdentity.title")}</h3>
        <p className="mt-1 text-xs text-zinc-600">{t("studio.characterIdentity.hint")}</p>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-zinc-700">
          {t("studio.characterIdentity.selectCharacter")}
        </span>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        >
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {selectedCharacter && form ?
        <>
          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.characterIdentity.completeness.label")}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {t(`studio.characterIdentity.completeness.${completenessTier}`)}
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
                {t("studio.characterIdentity.suggestion.available")}
              </p>
              <button
                type="button"
                onClick={() => setCompareOpen((v) => !v)}
                className="mt-2 text-xs font-semibold text-[#0067B1] hover:underline"
              >
                {compareOpen ?
                  t("studio.characterIdentity.suggestion.hideCompare")
                : t("studio.characterIdentity.suggestion.showCompare")}
              </button>
              {compareOpen && aiSuggestion ?
                <div className="mt-3 space-y-2 text-xs">
                  {diffCharacterIdentityForm(form, aiSuggestion).map((key) => (
                    <div key={key} className="grid gap-1 sm:grid-cols-2">
                      <div className="rounded-lg bg-white/80 p-2">
                        <p className="font-semibold text-zinc-500">
                          {t("studio.characterIdentity.suggestion.current")}
                        </p>
                        <p className="text-zinc-800">{String(form[key] ?? "—")}</p>
                      </div>
                      <div className="rounded-lg bg-white p-2 ring-1 ring-[#0067B1]/20">
                        <p className="font-semibold text-[#0067B1]">
                          {t("studio.characterIdentity.suggestion.proposed")}
                        </p>
                        <p className="text-zinc-800">{String(aiSuggestion[key] ?? "—")}</p>
                      </div>
                    </div>
                  ))}
                  {canModify ?
                    <button
                      type="button"
                      onClick={applyAiSuggestion}
                      className="rounded-full bg-[#0067B1] px-4 py-2 text-xs font-semibold text-white"
                    >
                      {t("studio.characterIdentity.suggestion.apply")}
                    </button>
                  : null}
                </div>
              : null}
            </div>
          : null}

          <p className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-600">
            {t("studio.characterIdentity.brandDisclaimer")}
          </p>

          {/* Core identity — accordion on mobile */}
          {[
            { id: "core", title: t("studio.characterIdentity.sections.core") },
            { id: "style", title: t("studio.characterIdentity.sections.style") },
            { id: "personality", title: t("studio.characterIdentity.sections.personality") },
            { id: "look", title: t("studio.characterIdentity.sections.look") },
            { id: "context", title: t("studio.characterIdentity.sections.context") },
            { id: "voice", title: t("studio.characterIdentity.sections.voice") },
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
                          {t(fieldLabelKey("characterType"))}
                        </span>
                        <select
                          value={form.characterType}
                          disabled={!canModify}
                          onChange={(e) => updateField("characterType", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        >
                          <option value="">{t("studio.characterIdentity.chooseOption")}</option>
                          {CHARACTER_IDENTITY_TYPES.map((id) => (
                            <option key={id} value={id}>
                              {t(`studio.characterIdentity.types.${id}` as TranslationKey)}
                            </option>
                          ))}
                        </select>
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
                    </>
                  : null}

                  {section.id === "style" ?
                    <>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("visualStyle"))}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {visibleStyles.map((styleId) =>
                            CHARACTER_IDENTITY_STYLE_PREVIEW_IDS.includes(styleId) ?
                              <StudioCharacterIdentityStylePreviewCard
                                key={styleId}
                                styleId={styleId}
                                selected={form.visualStyle === styleId}
                                onSelect={() => canModify && updateField("visualStyle", styleId)}
                              />
                            : (
                              <button
                                key={styleId}
                                type="button"
                                disabled={!canModify}
                                onClick={() => updateField("visualStyle", styleId)}
                                className={`rounded-lg border px-2 py-2 text-left text-xs ${
                                  form.visualStyle === styleId ?
                                    "border-[#0067B1] bg-[#0067B1]/5 font-semibold"
                                  : "border-zinc-200"
                                }`}
                              >
                                {t(`studio.characterIdentity.styles.${styleId}` as TranslationKey)}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("shapeLanguage"))}
                        </span>
                        <select
                          value={form.shapeLanguage}
                          disabled={!canModify}
                          onChange={(e) => updateField("shapeLanguage", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        >
                          <option value="">{t("studio.characterIdentity.chooseOption")}</option>
                          {CHARACTER_IDENTITY_SHAPE_LANGUAGES.map((id) => (
                            <option key={id} value={id}>
                              {t(`studio.characterIdentity.shapes.${id}` as TranslationKey)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("energy"))}
                        </span>
                        <select
                          value={form.energy}
                          disabled={!canModify}
                          onChange={(e) => updateField("energy", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        >
                          <option value="">{t("studio.characterIdentity.chooseOption")}</option>
                          {CHARACTER_IDENTITY_ENERGIES.map((id) => (
                            <option key={id} value={id}>
                              {t(`studio.characterIdentity.energies.${id}` as TranslationKey)}
                            </option>
                          ))}
                        </select>
                      </label>
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
                          placeholder={t("studio.characterIdentity.placeholders.appearanceMemory")}
                        />
                      </label>
                    </>
                  : null}

                  {section.id === "personality" ?
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {CHARACTER_IDENTITY_PERSONALITY_PRESETS.map((id) => (
                          <button
                            key={id}
                            type="button"
                            disabled={!canModify}
                            onClick={() => applyPreset("personality", id)}
                            className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:border-[#0067B1]"
                          >
                            {t(presetKey("personality", id))}
                          </button>
                        ))}
                      </div>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("personality"))}
                        </span>
                        <textarea
                          value={form.personality}
                          disabled={!canModify}
                          rows={3}
                          onChange={(e) => updateField("personality", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                    </>
                  : null}

                  {section.id === "look" ?
                    <>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("colorTheme"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {CHARACTER_IDENTITY_COLOR_THEMES.map((id) => (
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
                          {t(fieldLabelKey("clothing"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {CHARACTER_IDENTITY_OUTFIT_PRESETS.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("outfit", id)}
                              className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium"
                            >
                              {t(presetKey("outfit", id))}
                            </button>
                          ))}
                        </div>
                        <input
                          value={form.clothing}
                          disabled={!canModify}
                          onChange={(e) => updateField("clothing", e.target.value)}
                          className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("accessories"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {CHARACTER_IDENTITY_ACCESSORY_PRESETS.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("accessory", id)}
                              className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium"
                            >
                              {t(presetKey("accessory", id))}
                            </button>
                          ))}
                        </div>
                        <input
                          value={form.accessories}
                          disabled={!canModify}
                          onChange={(e) => updateField("accessories", e.target.value)}
                          className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </div>
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
                          <option value="">{t("studio.characterIdentity.noWorld")}</option>
                          {worlds.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  : null}

                  {section.id === "voice" ?
                    <>
                      <p className="text-xs text-zinc-600">
                        {t(`studio.characterIdentity.voiceStatus.${voiceStatus}`)}
                      </p>
                      <StudioWorkspaceCharacterVoiceInline
                        character={selectedCharacter}
                        storyLanguage={storyLanguage}
                        storyVoiceProfile={storyVoiceProfile}
                        canModify={canModify}
                        defaultExpanded
                        onCharacterUpdated={(updated) => {
                          onCharacterUpdated(updated);
                        }}
                      />
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
            <p className="text-sm text-[#006D52]">{t("studio.characterIdentity.saved")}</p>
          : null}

          {canModify ?
            <button
              type="button"
              disabled={saveBusy}
              onClick={() => void handleSave()}
              className="w-full rounded-full bg-[#0067B1] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              {saveBusy ?
                t("studio.characterIdentity.saving")
              : t("studio.characterIdentity.save")}
            </button>
          : null}
        </>
      : null}
    </div>
  );
}
