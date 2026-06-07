"use client";

import { useCallback, useState } from "react";
import { StudioDirectorAccordionSection } from "@/components/studio/director-v2/studio-director-accordion-section";
import { StudioDirectorScenePreviewStrip } from "@/components/studio/director-v2/studio-director-scene-preview-strip";
import { StudioDirectorSectionCamera } from "@/components/studio/director-v2/sections/camera-section";
import { StudioDirectorSectionCharacters } from "@/components/studio/director-v2/sections/characters-section";
import { StudioDirectorSectionDirector } from "@/components/studio/director-v2/sections/director-section";
import { StudioDirectorSectionEmotion } from "@/components/studio/director-v2/sections/emotion-section";
import { StudioDirectorSectionVoice } from "@/components/studio/director-v2/sections/voice-section";
import { StudioDirectorSectionMusic } from "@/components/studio/director-v2/sections/music-section";
import { StudioDirectorSectionSound } from "@/components/studio/director-v2/sections/sound-section";
import { StudioDirectorSectionText } from "@/components/studio/director-v2/sections/text-section";
import { StudioDirectorSectionAdvanced } from "@/components/studio/director-v2/sections/advanced-section";
import { StudioAudioConfidenceCard } from "@/components/studio/studio-audio-confidence-card";
import { StudioSceneIdentityConsumptionSummary } from "@/components/studio/studio-scene-identity-consumption-summary";
import { StudioCharacterCapabilitiesSummary } from "@/components/studio/studio-character-capabilities-summary";
import {
  readStudioDirectorV2Mode,
  writeStudioDirectorV2Mode,
  type StudioDirectorV2Mode,
} from "@/lib/studio-director-v2-mode";
import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import { useActiveTranslator } from "@/i18n/client";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioSceneUpdateInput } from "@/lib/studio-scene-validation";
import { updateStudioStoryboardApi } from "@/lib/studio-storyboards-client";

type Props = {
  storyboardId: string;
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  flowScenes: StoryFlowSceneInput[];
  storyboardTitle: string;
  storyboardDescription: string;
  aiDirectorPrompt: string;
  aiDirectorStyleStrength: string;
  directorProfile: StudioDirectorProfile;
  styleProfile: StudioPromptStyleProfile;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  canModify: boolean;
  saving: boolean;
  onSave: (patch: StudioSceneUpdateInput) => Promise<void>;
  onSceneDraftChange: (scene: StudioSceneDetail) => void;
  onStoryboardNotesUpdated?: (notes: string) => void;
};

export function StudioDirectorPanelV2({
  storyboardId,
  storyboard,
  scene,
  sceneIndex,
  sceneCount,
  flowScenes,
  storyboardTitle,
  storyboardDescription,
  aiDirectorPrompt,
  aiDirectorStyleStrength,
  directorProfile,
  styleProfile,
  characters,
  locations,
  props,
  worlds,
  canModify,
  saving,
  onSave,
  onSceneDraftChange,
  onStoryboardNotesUpdated,
}: Props) {
  const t = useActiveTranslator();
  const [mode, setMode] = useState<StudioDirectorV2Mode>(() => readStudioDirectorV2Mode());
  const [directorNotes, setDirectorNotes] = useState(aiDirectorPrompt);
  const [notesSaveBusy, setNotesSaveBusy] = useState(false);
  const [error, setError] = useState("");
  const [openSections, setOpenSections] = useState({
    director: true,
    characters: true,
    camera: true,
    emotion: true,
    text: true,
    voice: false,
    music: false,
    sound: false,
    advanced: false,
  });

  const patchDraft = useCallback(
    (patch: Partial<StudioSceneDetail>) => {
      onSceneDraftChange({ ...scene, ...patch });
    },
    [onSceneDraftChange, scene]
  );

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCharacter = (characterId: string) => {
    const ids = scene.characters.map((c) => c.id);
    const nextIds = ids.includes(characterId)
      ? ids.filter((id) => id !== characterId)
      : [...ids, characterId];
    patchDraft({
      characters: characters.filter((c) => nextIds.includes(c.id)),
    });
  };

  const handleSave = async () => {
    setError("");
    try {
      await onSave({
        title: scene.title,
        description: scene.description,
        action: scene.action,
        emotion: scene.emotion,
        camera: scene.camera,
        shotType: scene.shotType,
        cameraMovement: scene.cameraMovement,
        sceneEnergy: scene.sceneEnergy,
        transitionToNext: scene.transitionToNext,
        durationSeconds: scene.durationSeconds,
        locationId: scene.locationId,
        characterIds: scene.characters.map((c) => c.id),
        propIds: scene.props.map((p) => p.id),
        musicCueType: scene.musicCueType,
        musicEnergyTarget: scene.musicEnergyTarget,
        musicTransitionType: scene.musicTransitionType,
        musicStartBehavior: scene.musicStartBehavior,
        musicEndBehavior: scene.musicEndBehavior,
        soundEnvironmentOverride: scene.soundEnvironmentOverride,
        soundCharacterOverride: scene.soundCharacterOverride,
        soundPropOverride: scene.soundPropOverride,
        soundTransitionOverride: scene.soundTransitionOverride,
        soundAmbientOverride: scene.soundAmbientOverride,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("studio.storyboards.error.saveSceneFailed"));
    }
  };

  const persistDirectorNotes = async (notes: string) => {
    if (!canModify) {
      return;
    }
    setNotesSaveBusy(true);
    try {
      const res = await updateStudioStoryboardApi(storyboardId, { aiDirectorPrompt: notes });
      if (res.ok) {
        onStoryboardNotesUpdated?.(notes);
      }
    } finally {
      setNotesSaveBusy(false);
    }
  };

  const setModeAndPersist = (next: StudioDirectorV2Mode) => {
    setMode(next);
    writeStudioDirectorV2Mode(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          {t("studio.directorV2.shell.title")}
        </p>
        <div className="flex rounded-full border border-zinc-200 bg-white p-0.5">
          {(["beginner", "expert"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setModeAndPersist(value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                mode === value
                  ? "bg-[#006D52] text-white"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {t(`studio.directorV2.mode.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <StudioDirectorScenePreviewStrip
        scene={scene}
        sceneIndex={sceneIndex}
        sceneCount={sceneCount}
        directorProfile={directorProfile}
        storyboardTitle={storyboardTitle}
        storyboardDescription={storyboardDescription}
        aiDirectorNotes={directorNotes}
      />

      <StudioAudioConfidenceCard
        storyboard={storyboard}
        scene={scene}
        characters={characters}
      />

      <StudioSceneIdentityConsumptionSummary
        scene={scene}
        libraries={{ characters, locations, props, worlds }}
      />

      <StudioCharacterCapabilitiesSummary
        storyboard={storyboard}
        scene={scene}
        characters={characters}
        props={props}
        worlds={worlds}
        variant="compact"
        showMemoryTrends={false}
      />

      <div className="space-y-3">
          <StudioDirectorAccordionSection
            title={t("studio.directorV2.section.director")}
            infoKey="studio.directorV2.info.director"
            open={openSections.director}
            onToggle={() => toggleSection("director")}
          >
            <StudioDirectorSectionDirector
              scene={scene}
              sceneIndex={sceneIndex}
              sceneCount={sceneCount}
              flowScenes={flowScenes}
              directorNotes={directorNotes}
              aiDirectorStyleStrength={aiDirectorStyleStrength}
              canModify={canModify}
              onDirectorNotesChange={setDirectorNotes}
              onApplyPurpose={() => undefined}
              onApplySuggestion={(patch) => patchDraft(patch)}
            />
            {canModify ?
              <button
                type="button"
                disabled={notesSaveBusy || directorNotes === aiDirectorPrompt}
                onClick={() => void persistDirectorNotes(directorNotes)}
                className="mt-3 text-xs font-semibold text-[#0067B1] disabled:opacity-40"
              >
                {notesSaveBusy
                  ? t("button.loading")
                  : t("studio.directorV2.director.saveNotes")}
              </button>
            : null}
          </StudioDirectorAccordionSection>

          <StudioDirectorAccordionSection
            title={t("studio.directorV2.section.characters")}
            infoKey="studio.directorV2.info.characters"
            open={openSections.characters}
            onToggle={() => toggleSection("characters")}
            badge={String(scene.characters.length)}
          >
            <StudioDirectorSectionCharacters
              scene={scene}
              allCharacters={characters}
              canModify={canModify}
              onToggleCharacter={toggleCharacter}
            />
          </StudioDirectorAccordionSection>

          <StudioDirectorAccordionSection
            title={t("studio.directorV2.section.camera")}
            infoKey="studio.directorV2.info.camera"
            open={openSections.camera}
            onToggle={() => toggleSection("camera")}
          >
            <StudioDirectorSectionCamera
              scene={scene}
              canModify={canModify}
              onPatch={(patch) => patchDraft(patch)}
            />
          </StudioDirectorAccordionSection>

          <StudioDirectorAccordionSection
            title={t("studio.directorV2.section.emotion")}
            infoKey="studio.directorV2.info.emotion"
            open={openSections.emotion}
            onToggle={() => toggleSection("emotion")}
          >
            <StudioDirectorSectionEmotion
              scene={scene}
              canModify={canModify}
              onPatch={(patch) => patchDraft(patch)}
            />
          </StudioDirectorAccordionSection>

          <StudioDirectorAccordionSection
            title={t("studio.directorV2.section.text")}
            infoKey="studio.directorV2.info.text"
            open={openSections.text}
            onToggle={() => toggleSection("text")}
          >
            <StudioDirectorSectionText
              scene={scene}
              sceneIndex={sceneIndex}
              sceneCount={sceneCount}
              storyboardTitle={storyboardTitle}
              storyboardDescription={storyboardDescription}
              aiDirectorNotes={directorNotes}
            />
          </StudioDirectorAccordionSection>

          {mode === "expert" ? (
            <>
              <StudioDirectorAccordionSection
                title={t("studio.directorV2.section.voice")}
                infoKey="studio.directorV2.info.voice"
                open={openSections.voice}
                onToggle={() => toggleSection("voice")}
              >
                <StudioDirectorSectionVoice
                  scene={scene}
                  allCharacters={characters}
                  storyLanguage={storyboard.voiceLanguage ?? "en"}
                  storyVoiceProfile={storyboard.voiceProfile}
                />
              </StudioDirectorAccordionSection>

              <StudioDirectorAccordionSection
                title={t("studio.directorV2.section.music")}
                infoKey="studio.directorV2.info.music"
                open={openSections.music}
                onToggle={() => toggleSection("music")}
              >
                <StudioDirectorSectionMusic
                  scene={scene}
                  storyboard={storyboard}
                  canModify={canModify}
                  onPatch={(patch) => patchDraft(patch)}
                />
              </StudioDirectorAccordionSection>

              <StudioDirectorAccordionSection
                title={t("studio.directorV2.section.sound")}
                infoKey="studio.directorV2.info.sound"
                open={openSections.sound}
                onToggle={() => toggleSection("sound")}
              >
                <StudioDirectorSectionSound
                  scene={scene}
                  storyboard={storyboard}
                  canModify={canModify}
                  onPatch={(patch) => patchDraft(patch)}
                />
              </StudioDirectorAccordionSection>

              <StudioDirectorAccordionSection
                title={t("studio.directorV2.section.advanced")}
                infoKey="studio.directorV2.info.advanced"
                open={openSections.advanced}
                onToggle={() => toggleSection("advanced")}
              >
                <StudioDirectorSectionAdvanced
                  scene={scene}
                  sceneIndex={sceneIndex}
                  sceneCount={sceneCount}
                  aiDirectorNotes={directorNotes}
                  styleProfile={styleProfile}
                  directorProfile={directorProfile}
                />
              </StudioDirectorAccordionSection>
            </>
          ) : null}
      </div>

      {error ?
        <p className="text-sm text-red-700">{error}</p>
      : null}

      <button
        type="button"
        disabled={saving || !canModify}
        onClick={() => void handleSave()}
        className="rounded-full bg-[#006D52] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? t("button.loading") : t("studio.storyboards.saveScene")}
      </button>
    </div>
  );
}
