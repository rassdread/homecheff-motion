"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioLocationIdentityStylePreviewCard } from "@/components/studio/studio-location-identity-style-preview";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { useStudioAdvancedFeatures } from "@/lib/studio-advanced-features";
import {
  locationIdentityCompletenessTier,
  locationIdentityFormFromLocation,
  locationIdentityFormToPatch,
  mergeLocationIdentityForm,
  type LocationIdentityFormValues,
} from "@/lib/studio-location-identity-fields";
import {
  buildLocationIdentityAiSuggestion,
  diffLocationIdentityForm,
  hasLocationIdentitySuggestion,
} from "@/lib/studio-location-identity-suggestion";
import {
  LOCATION_IDENTITY_ARCHITECTURE,
  LOCATION_IDENTITY_COLOR_THEMES,
  LOCATION_IDENTITY_CROWD,
  LOCATION_IDENTITY_LIGHTING,
  LOCATION_IDENTITY_MATERIALS,
  LOCATION_IDENTITY_MOODS,
  LOCATION_IDENTITY_STYLE_PREVIEW_IDS,
  LOCATION_IDENTITY_TYPES,
  listVisibleLocationStyles,
} from "@/lib/studio-location-identity-presets";
import { identityCompleteness, toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import { updateStudioLocationApi } from "@/lib/studio-locations-client";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

type Props = {
  locations: StudioLocationListItem[];
  worlds: StudioWorldProfileListItem[];
  storyboard?: StudioStoryboardDetail | null;
  characters?: StudioCharacterListItem[];
  props?: StudioPropListItem[];
  memory?: StudioProjectMemorySnapshot | null;
  canModify: boolean;
  isAdmin?: boolean;
  onLocationUpdated: (location: StudioLocationListItem) => void;
  initialLocationId?: string | null;
};

function presetKey(group: string, id: string): TranslationKey {
  return `studio.locationIdentity.presets.${group}.${id}` as TranslationKey;
}

function fieldLabelKey(field: string): TranslationKey {
  return `studio.locationIdentity.fields.${field}` as TranslationKey;
}

export function StudioWorkspaceLocationIdentityBuilder({
  locations,
  worlds,
  storyboard,
  characters = [],
  props = [],
  memory,
  canModify,
  isAdmin = false,
  onLocationUpdated,
  initialLocationId,
}: Props) {
  const t = useActiveTranslator();
  const [advancedFeatures] = useStudioAdvancedFeatures();
  const showAdvancedStyles = isAdmin || advancedFeatures;

  const [selectedId, setSelectedId] = useState<string | null>(
    initialLocationId ?? locations[0]?.id ?? null
  );
  const [form, setForm] = useState<LocationIdentityFormValues | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedOk, setSavedOk] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("core");

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedId) ?? null,
    [locations, selectedId]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!selectedLocation) {
        setForm(null);
        return;
      }
      setForm(locationIdentityFormFromLocation(selectedLocation));
      setSavedOk(false);
      setSaveError("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedLocation]);

  const aiSuggestion = useMemo(() => {
    if (!storyboard || !selectedLocation) return null;
    return buildLocationIdentityAiSuggestion({
      storyboard,
      location: selectedLocation,
      characters,
      locations,
      props,
      worlds,
      memory,
    });
  }, [storyboard, selectedLocation, characters, locations, props, worlds, memory]);

  const showSuggestion = useMemo(() => {
    if (!selectedLocation || !aiSuggestion) return false;
    return hasLocationIdentitySuggestion(selectedLocation, aiSuggestion);
  }, [selectedLocation, aiSuggestion]);

  const completenessScore = useMemo(() => {
    if (!selectedLocation || !form) return 0;
    const patch = locationIdentityFormToPatch(form);
    const merged: StudioLocationListItem = {
      ...selectedLocation,
      name: patch.name ?? selectedLocation.name,
      category: (patch.category as StudioLocationListItem["category"]) ?? selectedLocation.category,
      description: patch.description ?? selectedLocation.description,
      worldMemory: patch.worldMemory ?? selectedLocation.worldMemory,
      visualIdentity: patch.visualIdentity ?? selectedLocation.visualIdentity,
      environmentKeywords: patch.environmentKeywords ?? selectedLocation.environmentKeywords,
      continuityNotes: patch.continuityNotes ?? selectedLocation.continuityNotes,
      worldProfileId:
        patch.worldProfileId !== undefined ?
          patch.worldProfileId
        : selectedLocation.worldProfileId,
    };
    return identityCompleteness(toIdentitySpec(merged));
  }, [selectedLocation, form]);

  const completenessTier = locationIdentityCompletenessTier(completenessScore);
  const visibleStyles = listVisibleLocationStyles(showAdvancedStyles);

  const updateField = useCallback(
    <K extends keyof LocationIdentityFormValues>(key: K, value: LocationIdentityFormValues[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
      setSavedOk(false);
    },
    []
  );

  const applyPreset = useCallback(
    (
      group: "mood" | "architecture" | "material" | "lighting" | "crowd" | "color" | "type",
      id: string
    ) => {
      if (group === "mood") updateField("mood", id);
      if (group === "architecture") updateField("architecture", id);
      if (group === "material") {
        setForm((prev) => {
          if (!prev) return prev;
          const parts = prev.materials
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          if (parts.includes(id)) return prev;
          return { ...prev, materials: [...parts, id].join(", ") };
        });
        setSavedOk(false);
      }
      if (group === "lighting") updateField("lighting", id);
      if (group === "crowd") updateField("crowdLevel", id);
      if (group === "color") updateField("colorTheme", id);
      if (group === "type") updateField("locationType", id);
    },
    [updateField]
  );

  const handleSave = async () => {
    if (!selectedLocation || !form || !canModify) return;
    setSaveBusy(true);
    setSaveError("");
    const res = await updateStudioLocationApi(
      selectedLocation.id,
      locationIdentityFormToPatch(form)
    );
    setSaveBusy(false);
    if (!res.ok) {
      setSaveError(t("studio.locationIdentity.saveFailed"));
      return;
    }
    onLocationUpdated(res.data.location);
    setForm(locationIdentityFormFromLocation(res.data.location));
    setSavedOk(true);
  };

  const applyAiSuggestion = () => {
    if (!form || !aiSuggestion) return;
    setForm(mergeLocationIdentityForm(form, aiSuggestion));
    setCompareOpen(false);
    setSavedOk(false);
  };

  if (locations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
        {t("studio.locationIdentity.noLocations")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.locationIdentity.title")}</h3>
        <p className="mt-1 text-xs text-zinc-600">{t("studio.locationIdentity.hint")}</p>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-zinc-700">
          {t("studio.locationIdentity.selectLocation")}
        </span>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      {selectedLocation && form ?
        <>
          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.locationIdentity.completeness.label")}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {t(`studio.locationIdentity.completeness.${completenessTier}`)}
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
                {t("studio.locationIdentity.suggestion.available")}
              </p>
              <button
                type="button"
                onClick={() => setCompareOpen((v) => !v)}
                className="mt-2 text-xs font-semibold text-[#0067B1] hover:underline"
              >
                {compareOpen ?
                  t("studio.locationIdentity.suggestion.hideCompare")
                : t("studio.locationIdentity.suggestion.showCompare")}
              </button>
              {compareOpen && aiSuggestion ?
                <div className="mt-3 space-y-2 text-xs">
                  {diffLocationIdentityForm(form, aiSuggestion).map((key) => (
                    <div key={key} className="grid gap-1 sm:grid-cols-2">
                      <div className="rounded-lg bg-white/80 p-2">
                        <p className="font-semibold text-zinc-500">
                          {t("studio.locationIdentity.suggestion.current")}
                        </p>
                        <p className="text-zinc-800">{String(form[key] ?? "—")}</p>
                      </div>
                      <div className="rounded-lg bg-white p-2 ring-1 ring-[#0067B1]/20">
                        <p className="font-semibold text-[#0067B1]">
                          {t("studio.locationIdentity.suggestion.proposed")}
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
                      {t("studio.locationIdentity.suggestion.apply")}
                    </button>
                  : null}
                </div>
              : null}
            </div>
          : null}

          {[
            { id: "core", title: t("studio.locationIdentity.sections.core") },
            { id: "style", title: t("studio.locationIdentity.sections.style") },
            { id: "atmosphere", title: t("studio.locationIdentity.sections.atmosphere") },
            { id: "materials", title: t("studio.locationIdentity.sections.materials") },
            { id: "context", title: t("studio.locationIdentity.sections.context") },
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
                          {t(fieldLabelKey("locationType"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {LOCATION_IDENTITY_TYPES.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("type", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.locationType === id ?
                                  "bg-[#0067B1] text-white"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.locationIdentity.types.${id}` as TranslationKey)}
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

                  {section.id === "style" ?
                    <>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("visualStyle"))}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {visibleStyles.map((styleId) =>
                            LOCATION_IDENTITY_STYLE_PREVIEW_IDS.includes(styleId) ?
                              <StudioLocationIdentityStylePreviewCard
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
                                {t(`studio.locationIdentity.styles.${styleId}` as TranslationKey)}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </>
                  : null}

                  {section.id === "atmosphere" ?
                    <>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("mood"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {LOCATION_IDENTITY_MOODS.map((id) => (
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
                              {t(`studio.locationIdentity.moods.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("visualIdentity"))}
                        </span>
                        <textarea
                          value={form.visualIdentity}
                          disabled={!canModify}
                          rows={2}
                          onChange={(e) => updateField("visualIdentity", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          placeholder={t("studio.locationIdentity.placeholders.visualIdentity")}
                        />
                      </label>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("crowdLevel"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {LOCATION_IDENTITY_CROWD.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("crowd", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.crowdLevel === id ?
                                  "bg-[#0067B1]/10 text-[#0067B1]"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.locationIdentity.crowd.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  : null}

                  {section.id === "materials" ?
                    <>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("architecture"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {LOCATION_IDENTITY_ARCHITECTURE.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("architecture", id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                form.architecture === id ?
                                  "bg-[#0067B1]/10 text-[#0067B1]"
                                : "border border-zinc-200 text-zinc-700"
                              }`}
                            >
                              {t(`studio.locationIdentity.architecture.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("materials"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {LOCATION_IDENTITY_MATERIALS.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!canModify}
                              onClick={() => applyPreset("material", id)}
                              className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium"
                            >
                              {t(`studio.locationIdentity.materials.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                        <input
                          value={form.materials}
                          disabled={!canModify}
                          onChange={(e) => updateField("materials", e.target.value)}
                          className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("lighting"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {LOCATION_IDENTITY_LIGHTING.map((id) => (
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
                              {t(`studio.locationIdentity.lighting.${id}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("colorTheme"))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {LOCATION_IDENTITY_COLOR_THEMES.map((id) => (
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
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-700">
                          {t(fieldLabelKey("worldMemory"))}
                        </span>
                        <textarea
                          value={form.worldMemory}
                          disabled={!canModify}
                          rows={2}
                          onChange={(e) => updateField("worldMemory", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          placeholder={t("studio.locationIdentity.placeholders.worldMemory")}
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
                          <option value="">{t("studio.locationIdentity.noWorld")}</option>
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
            <p className="text-sm text-[#006D52]">{t("studio.locationIdentity.saved")}</p>
          : null}

          {canModify ?
            <button
              type="button"
              disabled={saveBusy}
              onClick={() => void handleSave()}
              className="w-full rounded-full bg-[#0067B1] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              {saveBusy ?
                t("studio.locationIdentity.saving")
              : t("studio.locationIdentity.save")}
            </button>
          : null}
        </>
      : null}
    </div>
  );
}
