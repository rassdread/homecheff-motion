"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  acceptVerifiedSfxCues,
  emptyStudioFilmProject,
  updateFilmScene,
  type FilmVoiceRole,
  type StudioFilmProjectDocument,
} from "@/lib/studio-film-pipeline";
import type { EditorMusicTrack } from "@/lib/studio-user-video-editor";

const fieldClass = "min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900";
const VOICES: Array<{ id: FilmVoiceRole; label: "studio.videoEditor.film.voice.american_female" | "studio.videoEditor.film.voice.british_female" | "studio.videoEditor.film.voice.english_narrator" }> = [
  { id: "american_female", label: "studio.videoEditor.film.voice.american_female" },
  { id: "british_female", label: "studio.videoEditor.film.voice.british_female" },
  { id: "english_narrator", label: "studio.videoEditor.film.voice.english_narrator" },
];

type CharacterOption = { id: string; name: string };

export function StudioFilmEditorPanel({
  film,
  music,
  pictures,
  onChange,
}: {
  film: StudioFilmProjectDocument | null;
  music: EditorMusicTrack[];
  pictures: Array<{ id: string; label: string }>;
  onChange: (next: StudioFilmProjectDocument | null) => void;
}) {
  const t = useActiveTranslator();
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [sceneId, setSceneId] = useState(film?.scenes[0]?.id ?? "scene-1");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/studio/characters");
      if (!response.ok) return;
      const body = (await response.json()) as { characters?: CharacterOption[] };
      if (!cancelled) setCharacters(body.characters ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!film) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-4" data-testid="film-editor-empty">
        <h2 className="text-sm font-semibold text-zinc-900">{t("studio.videoEditor.film.title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.videoEditor.film.intro")}</p>
        <button
          type="button"
          className="mt-3 inline-flex min-h-11 items-center rounded-full bg-[#006D52] px-4 text-sm font-semibold text-white"
          data-testid="film-editor-start"
          onClick={() => onChange(emptyStudioFilmProject(6))}
        >
          {t("studio.videoEditor.film.start")}
        </button>
      </section>
    );
  }

  const scene = film.scenes.find((item) => item.id === sceneId) ?? film.scenes[0];
  if (!scene) return null;

  function patchScene(patch: Parameters<typeof updateFilmScene>[2]) {
    if (!film || !scene) return;
    onChange(updateFilmScene(film, scene.id, patch));
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4" data-testid="film-editor-panel">
      <h2 className="text-sm font-semibold text-zinc-900">{t("studio.videoEditor.film.title")}</h2>
      <p className="mt-1 text-sm text-zinc-600">{t("studio.videoEditor.film.intro")}</p>
      <label className="mt-3 block text-sm text-zinc-700">
        {t("studio.videoEditor.film.projectTitle")}
        <input
          className={`${fieldClass} mt-1`}
          value={film.title}
          onChange={(event) => onChange({ ...film, title: event.target.value })}
        />
      </label>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {film.scenes.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="min-h-11 shrink-0 rounded-full border border-zinc-300 px-3 text-sm"
            data-testid={`film-scene-${index + 1}`}
            onClick={() => setSceneId(item.id)}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3">
        <label className="text-sm text-zinc-700">
          {t("studio.videoEditor.film.picture")}
          <select
            className={`${fieldClass} mt-1`}
            data-testid="film-picture"
            value={scene.sourceSceneId ?? ""}
            onChange={(event) => patchScene({ sourceSceneId: event.target.value || null })}
          >
            <option value="">{t("studio.videoEditor.film.noPicture")}</option>
            {pictures.map((picture) => (
              <option key={picture.id} value={picture.id}>
                {picture.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-700">
          {t("studio.videoEditor.film.character")}
          <select
            className={`${fieldClass} mt-1`}
            data-testid="film-character"
            value={scene.characterId ?? ""}
            onChange={(event) => patchScene({ characterId: event.target.value || null })}
          >
            <option value="">{t("studio.videoEditor.film.noCharacter")}</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-700">
          {t("studio.videoEditor.film.voice")}
          <select
            className={`${fieldClass} mt-1`}
            data-testid="film-voice"
            value={scene.voiceRole}
            onChange={(event) => patchScene({ voiceRole: event.target.value as FilmVoiceRole })}
          >
            {VOICES.map((role) => (
              <option key={role.id} value={role.id}>
                {t(role.label)}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-zinc-500">{t("studio.videoEditor.film.voiceNote")}</span>
        </label>
        <label className="text-sm text-zinc-700">
          {t("studio.videoEditor.film.englishTitle")}
          <input
            className={`${fieldClass} mt-1`}
            data-testid="film-english-title"
            value={scene.englishTitle}
            onChange={(event) => patchScene({ englishTitle: event.target.value })}
          />
        </label>
        <label className="text-sm text-zinc-700">
          {t("studio.videoEditor.film.dialogue")}
          <textarea
            className={`${fieldClass} mt-1 min-h-20 py-2`}
            data-testid="film-dialogue"
            value={scene.englishDialogue}
            onChange={(event) => patchScene({ englishDialogue: event.target.value })}
          />
        </label>
        <label className="text-sm text-zinc-700">
          {t("studio.videoEditor.film.dutchSubtitle")}
          <textarea
            className={`${fieldClass} mt-1 min-h-20 py-2`}
            data-testid="film-dutch"
            value={scene.dutchSubtitle}
            onChange={(event) => patchScene({ dutchSubtitle: event.target.value })}
          />
        </label>
        <label className="text-sm text-zinc-700">
          {t("studio.videoEditor.film.music")}
          <select
            className={`${fieldClass} mt-1`}
            data-testid="film-music"
            value={scene.musicTrackId ?? ""}
            onChange={(event) => patchScene({ musicTrackId: event.target.value || null })}
          >
            <option value="">{t("studio.videoEditor.noMusic")}</option>
            {music.map((track) => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </select>
        </label>
        <SfxFields key={scene.id} film={film} sceneId={scene.id} onChange={onChange} />
        <label className="text-sm text-zinc-700">
          {t("studio.videoEditor.film.export")}
          <select
            className={`${fieldClass} mt-1`}
            data-testid="film-export"
            value={film.export.subtitleMode}
            onChange={(event) =>
              onChange({
                ...film,
                export: { ...film.export, subtitleMode: event.target.value === "srt" ? "srt" : "burn_in" },
              })
            }
          >
            <option value="burn_in">{t("studio.videoEditor.film.burnIn")}</option>
            <option value="srt">{t("studio.videoEditor.film.srtOnly")}</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={film.logo.enabled}
            onChange={(event) => onChange({ ...film, logo: { ...film.logo, enabled: event.target.checked } })}
          />
          {t("studio.videoEditor.film.logo")}
        </label>
        <label className="text-sm text-zinc-700">
          {t("studio.videoEditor.cta")}
          <input
            className={`${fieldClass} mt-1`}
            value={film.cta.title}
            onChange={(event) => onChange({ ...film, cta: { ...film.cta, title: event.target.value } })}
          />
        </label>
      </div>
    </section>
  );
}

function SfxFields({
  film,
  sceneId,
  onChange,
}: {
  film: StudioFilmProjectDocument;
  sceneId: string;
  onChange: (next: StudioFilmProjectDocument) => void;
}) {
  const t = useActiveTranslator();
  const existing = film.sfxCues.find((cue) => cue.sceneId === sceneId);
  const [label, setLabel] = useState(existing?.label ?? "");
  const [start, setStart] = useState(existing ? String(existing.startSeconds) : "1");
  const [duration, setDuration] = useState(existing ? String(existing.durationSeconds) : "0.4");
  const [verified, setVerified] = useState(existing?.verified === true);

  function commit(nextVerified: boolean, nextLabel = label, nextStart = start, nextDuration = duration) {
    const others = film.sfxCues.filter((cue) => cue.sceneId !== sceneId);
    const result = acceptVerifiedSfxCues([
      ...others,
      {
        id: existing?.id ?? `sfx-${sceneId}`,
        sceneId,
        label: nextLabel,
        startSeconds: Number(nextStart),
        durationSeconds: Number(nextDuration),
        verified: nextVerified,
      },
    ]);
    onChange({ ...film, sfxCues: result.accepted });
  }

  return (
    <div className="grid gap-2 rounded-xl bg-zinc-50 p-3">
      <p className="text-sm font-semibold text-zinc-800">{t("studio.videoEditor.film.sfx")}</p>
      <input className={fieldClass} data-testid="film-sfx-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t("studio.videoEditor.film.sfxLabel")} />
      <div className="grid grid-cols-2 gap-2">
        <input className={fieldClass} data-testid="film-sfx-start" value={start} onChange={(event) => setStart(event.target.value)} />
        <input className={fieldClass} data-testid="film-sfx-duration" value={duration} onChange={(event) => setDuration(event.target.value)} />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          data-testid="film-sfx-verified"
          checked={verified}
          onChange={(event) => {
            setVerified(event.target.checked);
            commit(event.target.checked);
          }}
        />
        {t("studio.videoEditor.film.sfxVerified")}
      </label>
    </div>
  );
}
