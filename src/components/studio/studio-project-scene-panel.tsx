"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { moveSceneId } from "@/lib/studio-project-linking";
import type { ProjectWorkspaceView } from "@/lib/studio-project-workspace";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Option = { id: string; title: string; createdAt: string; sceneCount?: number; status?: string; linkedFilmId: string | null; linkedFilmTitle: string | null };
type CharacterOption = { id: string; name: string; referenceImageUrl: string };

export function StudioProjectScenePanel({
  workspace,
  onReload,
}: {
  workspace: ProjectWorkspaceView;
  onReload: () => void;
}) {
  const t = useActiveTranslator();
  const projectId = workspace.project.id;
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<Option[] | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [animations, setAnimations] = useState<Option[] | null>(null);
  const [selectedId, setSelectedId] = useState(workspace.scenes[0]?.id ?? "");
  const scene = workspace.scenes.find((item) => item.id === selectedId) ?? workspace.scenes[0] ?? null;
  const [advanced, setAdvanced] = useState(false);
  const [characters, setCharacters] = useState<CharacterOption[] | null>(null);

  useEffect(() => {
    if (!workspace.project.storyboardLinked) return;
    let cancelled = false;
    void fetch(`/api/studio/projects/${projectId}/film-characters`, { credentials: "include" })
      .then((response) => response.json())
      .then((body: { characters?: CharacterOption[] }) => {
        if (!cancelled) setCharacters(body.characters ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [projectId, workspace.project.storyboardLinked]);

  async function post(url: string, body: unknown) {
    setBusy(true);
    setMessage("");
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; code?: string; sceneId?: string };
    setBusy(false);
    if (!response.ok) {
      setMessage(messageFor(payload.code, t));
      return false;
    }
    if (payload.sceneId) setSelectedId(payload.sceneId);
    onReload();
    return true;
  }

  async function patch(url: string, body: unknown) {
    setBusy(true);
    setMessage("");
    const response = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { code?: string };
    setBusy(false);
    if (!response.ok) {
      setMessage(messageFor(payload.code, t));
      return false;
    }
    onReload();
    return true;
  }

  if (!workspace.project.storyboardLinked) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-700">{t("studio.workspace.v13.noStoryboard")}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={studioVisual.btnGradientPrimary} disabled={busy} onClick={() => void post(`/api/studio/projects/${projectId}/storyboard`, { mode: "create" })}>
            {t("studio.workspace.v13.createStoryboard")}
          </button>
          <button
            type="button"
            className={studioVisual.editorTabInactive}
            disabled={busy}
            onClick={() => {
              void fetch(`/api/studio/projects/${projectId}/storyboard`, { credentials: "include" })
                .then((response) => response.json())
                .then((body: { storyboards?: Option[] }) => setOptions(body.storyboards ?? []));
            }}
          >
            {t("studio.workspace.v13.attachStoryboard")}
          </button>
        </div>
        {options ? (
          <ul className="space-y-2">
            {options.length === 0 ? <li className="text-sm text-zinc-600">{t("studio.workspace.v13.noOwnedStoryboards")}</li> : null}
            {options.map((item) => (
              <li key={item.id} className="rounded-xl border border-zinc-200 p-3 text-sm">
                <p className="font-semibold text-zinc-900">{item.title}</p>
                <p className="text-xs text-zinc-500">{item.sceneCount ?? 0} · {item.linkedFilmTitle ? t("studio.workspace.v13.linkedTo", { title: item.linkedFilmTitle }) : t("studio.workspace.v13.unlinked")}</p>
                <button type="button" className="mt-2 min-h-11 text-sm font-semibold text-[#006D52]" disabled={Boolean(item.linkedFilmId) || busy} onClick={() => setPendingId(item.id)}>
                  {t("studio.workspace.v13.choose")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {pendingId ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3" role="dialog" aria-label={t("studio.workspace.v13.confirmAttach")}>
            <p className="text-sm text-zinc-800">{t("studio.workspace.v13.confirmAttach")}</p>
            <button type="button" className={`${studioVisual.btnGradientPrimary} mt-3`} disabled={busy} onClick={() => void post(`/api/studio/projects/${projectId}/storyboard`, { mode: "attach", storyboardId: pendingId, confirmed: true })}>
              {t("studio.workspace.v13.confirm")}
            </button>
          </div>
        ) : null}
        {message ? <p className="text-sm text-red-700" role="alert">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600">{t("studio.workspace.v13.storyboardConnected")}</p>
      <Narrator projectId={projectId} initial={workspace.project.narratorScript ?? ""} onSave={(text) => patch(`/api/studio/projects/${projectId}/narrator`, { text })} busy={busy} />
      <div className="flex flex-wrap gap-3">
        <button type="button" className={studioVisual.btnGradientPrimary} disabled={busy} onClick={() => void post(`/api/studio/projects/${projectId}/scenes`, { title: t("studio.workspace.v13.newSceneTitle") })}>
          {t("studio.workspace.v13.addScene")}
        </button>
        {workspace.project.storyboardId ? (
          <>
            <Link href={`/studio?storyboardId=${encodeURIComponent(workspace.project.storyboardId)}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#006D52]">
              {t("studio.workspace.v12.openAdvancedStoryboard")}
            </Link>
            <Link href={`/studio/storyboards/${workspace.project.storyboardId}/classic`} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#006D52]">
              {t("studio.workspace.v12.openClassicStoryboard")}
            </Link>
          </>
        ) : null}
      </div>
      {workspace.scenes.length === 0 ? <p className="text-sm text-zinc-600">{t("studio.workspace.v12.scenesNone")}</p> : null}
      <ol className="space-y-2">
        {workspace.scenes.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <button type="button" className={`min-h-11 flex-1 rounded-xl border px-3 text-left text-sm font-semibold ${item.id === scene?.id ? "border-[#0067B1]" : "border-zinc-200"}`} onClick={() => setSelectedId(item.id)}>
              {item.order + 1}. {item.title || t("studio.workspace.v12.untitledScene")}
            </button>
            <button type="button" className="min-h-11 min-w-11 rounded-full border border-zinc-300" aria-label={t("studio.workspace.v13.moveUp")} onClick={() => {
              const next = moveSceneId(workspace.scenes.map((row) => row.id), item.id, "up");
              if (next && next.join() !== workspace.scenes.map((row) => row.id).join()) void post(`/api/studio/projects/${projectId}/scenes/reorder`, { sceneIds: next });
            }}>↑</button>
            <button type="button" className="min-h-11 min-w-11 rounded-full border border-zinc-300" aria-label={t("studio.workspace.v13.moveDown")} onClick={() => {
              const next = moveSceneId(workspace.scenes.map((row) => row.id), item.id, "down");
              if (next && next.join() !== workspace.scenes.map((row) => row.id).join()) void post(`/api/studio/projects/${projectId}/scenes/reorder`, { sceneIds: next });
            }}>↓</button>
          </li>
        ))}
      </ol>
      {scene ? (
        <SceneForm
          key={scene.id}
          projectId={projectId}
          scene={scene}
          characters={characters}
          advanced={advanced}
          onAdvanced={() => {
            setAdvanced(true);
            if (!characters) {
              void fetch(`/api/studio/projects/${projectId}/film-characters`, { credentials: "include" })
                .then((response) => response.json())
                .then((body: { characters?: CharacterOption[] }) => setCharacters(body.characters ?? []));
            }
          }}
          onLoadCharacters={() => {
            if (characters) return;
            void fetch(`/api/studio/projects/${projectId}/film-characters`, { credentials: "include" })
              .then((response) => response.json())
              .then((body: { characters?: CharacterOption[] }) => setCharacters(body.characters ?? []));
          }}
          busy={busy}
          onSave={(body) => patch(`/api/studio/projects/${projectId}/scenes/${scene.id}`, body)}
          onSelectImage={(imageId) => post(`/api/studio/projects/${projectId}/scenes/${scene.id}/select-image`, { imageId })}
        />
      ) : null}
      <AnimationPrep projectId={projectId} linked={workspace.project.animationLinked} animations={animations} busy={busy} onOpen={() => {
        void fetch(`/api/studio/projects/${projectId}/animation`, { credentials: "include" })
          .then((response) => response.json())
          .then((body: { animations?: Option[] }) => setAnimations(body.animations ?? []));
      }} onAttach={(animationProjectId) => post(`/api/studio/projects/${projectId}/animation`, { animationProjectId, confirmed: true })} />
      {workspace.project.animationProjectId ? (
        <Link href={`/videos/${workspace.project.animationProjectId}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#006D52]">
          {t("studio.workspace.v12.openAnimation")}
        </Link>
      ) : null}
      {message ? <p className="text-sm text-red-700" role="alert">{message}</p> : null}
    </div>
  );
}

function SceneForm({
  projectId,
  scene,
  characters,
  advanced,
  onAdvanced,
  onLoadCharacters,
  busy,
  onSave,
  onSelectImage,
}: {
  projectId: string;
  scene: ProjectWorkspaceView["scenes"][number];
  characters: CharacterOption[] | null;
  advanced: boolean;
  onAdvanced: () => void;
  onLoadCharacters: () => void;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onSelectImage: (imageId: string) => void;
}) {
  const t = useActiveTranslator();
  const [title, setTitle] = useState(scene.title);
  const [description, setDescription] = useState(scene.description);
  const [subtitleText, setSubtitleText] = useState(scene.subtitleText ?? "");
  const [dialogueText, setDialogueText] = useState(scene.dialogueText ?? "");
  const [action, setAction] = useState(scene.action ?? "");
  const [emotion, setEmotion] = useState(scene.emotion ?? "");
  const [characterIds, setCharacterIds] = useState((scene.characters ?? []).map((item) => item.id));
  const field = "mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900";
  return (
    <form
      className="space-y-3 rounded-xl border border-zinc-200 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ title, description, subtitleText, dialogueText, action, emotion, characterIds });
      }}
    >
      <label className="block text-sm font-semibold text-zinc-900">{t("studio.workspace.v13.sceneTitle")}
        <input className={field} value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="block text-sm font-semibold text-zinc-900">{t("studio.workspace.v13.description")}
        <textarea className={field} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <div>
        <p className="text-sm font-semibold text-zinc-900">{t("studio.workspace.v13.characters")}</p>
        <button type="button" className="mt-1 text-sm font-semibold text-[#0067B1]" onClick={onLoadCharacters}>{t("studio.workspace.v13.loadCharacters")}</button>
        <ul className="mt-2 space-y-2">
          {(characters ?? scene.characters ?? []).map((character) => (
            <li key={character.id} className="flex items-center gap-2 text-sm">
              {character.referenceImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.referenceImageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : null}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={characterIds.includes(character.id)} onChange={(event) => {
                  setCharacterIds((current) => event.target.checked ? [...current, character.id] : current.filter((id) => id !== character.id));
                }} />
                {character.name}
              </label>
              <Link href={`/studio/characters/${character.id}/edit?returnTo=${encodeURIComponent(`/studio/projects/${projectId}?section=scenes`)}`} className="text-[#006D52]">{t("studio.workspace.v12.editCharacter")}</Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-zinc-500">{t("studio.workspace.v14.speakerNote")}</p>
      </div>
      <label className="block text-sm font-semibold text-zinc-900">{t("studio.workspace.v14.dialogue")}
        <textarea className={field} rows={3} value={dialogueText} onChange={(event) => setDialogueText(event.target.value)} />
      </label>
      <p className="text-xs text-zinc-500">{t("studio.workspace.v14.dialogueHint")}</p>
      <label className="block text-sm font-semibold text-zinc-900">{t("studio.workspace.v13.subtitle")}
        <textarea className={field} rows={2} value={subtitleText} onChange={(event) => setSubtitleText(event.target.value)} />
      </label>
      <p className="text-xs text-zinc-500">{t("studio.workspace.v13.subtitleTiming")}</p>
      {advanced ? (
        <>
          <label className="block text-sm font-semibold text-zinc-900">{t("studio.workspace.v13.action")}
            <textarea className={field} rows={2} value={action} onChange={(event) => setAction(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold text-zinc-900">{t("studio.workspace.v13.emotion")}
            <input className={field} value={emotion} onChange={(event) => setEmotion(event.target.value)} />
          </label>
          <div>
            <p className="text-sm font-semibold text-zinc-900">{t("studio.workspace.v14.visualPrompt")}</p>
            <p className="mt-1 text-xs text-zinc-500">{t("studio.workspace.v14.visualPromptNote")}</p>
            {(scene.images ?? []).some((image) => image.generatedPrompt?.trim()) ? (
              <ul className="mt-2 space-y-2">
                {(scene.images ?? []).filter((image) => image.generatedPrompt?.trim()).map((image) => (
                  <li key={image.id} className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-700">{image.generatedPrompt}</li>
                ))}
              </ul>
            ) : <p className="mt-1 text-xs text-zinc-500">{t("studio.workspace.v14.visualPromptEmpty")}</p>}
          </div>
        </>
      ) : (
        <button type="button" className="text-sm font-semibold text-[#0067B1]" onClick={onAdvanced}>{t("studio.workspace.v13.advanced")}</button>
      )}
      {(scene.images ?? []).length > 0 ? (
        <ul className="grid grid-cols-2 gap-2">
          {(scene.images ?? []).map((image) => (
            <li key={image.id} className="text-xs">
              {image.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.imageUrl} alt="" className="h-24 w-full rounded-lg object-cover" />
              ) : null}
              <p>{image.status}{image.selected ? ` · ${t("studio.workspace.v13.preferred")}` : ""}</p>
              {image.status === "completed" && !image.selected ? (
                <button type="button" className="min-h-11 font-semibold text-[#006D52]" onClick={() => onSelectImage(image.id)}>{t("studio.workspace.v13.useStill")}</button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-zinc-600">{t("studio.workspace.v12.noSceneImage")}</p>}
      <button type="submit" className={studioVisual.btnGradientPrimary} disabled={busy}>{t("studio.workspace.v13.save")}</button>
    </form>
  );
}

function Narrator({ initial, onSave, busy }: { projectId: string; initial: string; onSave: (text: string) => void; busy: boolean }) {
  const t = useActiveTranslator();
  const [text, setText] = useState(initial);
  return (
    <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); onSave(text); }}>
      <label className="block text-sm font-semibold text-zinc-900">{t("studio.workspace.v13.narrator")}
        <textarea className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" rows={2} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <p className="text-xs text-zinc-500">{t("studio.workspace.v13.narratorNote")}</p>
      <button type="submit" className={studioVisual.editorTabInactive} disabled={busy}>{t("studio.workspace.v13.saveNarrator")}</button>
    </form>
  );
}

function AnimationPrep({
  linked,
  animations,
  busy,
  onOpen,
  onAttach,
}: {
  projectId: string;
  linked: boolean;
  animations: Option[] | null;
  busy: boolean;
  onOpen: () => void;
  onAttach: (id: string) => void;
}) {
  const t = useActiveTranslator();
  const [pending, setPending] = useState("");
  if (linked) return <p className="text-sm text-zinc-600">{t("studio.workspace.v13.animationLinked")}</p>;
  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-700">{t("studio.workspace.v13.animationIntro")}</p>
      <button type="button" className={studioVisual.editorTabInactive} onClick={onOpen}>{t("studio.workspace.v13.attachAnimation")}</button>
      {animations?.map((item) => (
        <div key={item.id} className="rounded-xl border border-zinc-200 p-3 text-sm">
          <p className="font-semibold">{item.title}</p>
          <p className="text-xs text-zinc-500">{item.status} · {item.linkedFilmTitle ? t("studio.workspace.v13.linkedTo", { title: item.linkedFilmTitle }) : t("studio.workspace.v13.unlinked")}</p>
          <button type="button" className="mt-2 min-h-11 font-semibold text-[#006D52]" disabled={Boolean(item.linkedFilmId) || busy} onClick={() => setPending(item.id)}>{t("studio.workspace.v13.choose")}</button>
        </div>
      ))}
      {pending ? (
        <button type="button" className={studioVisual.btnGradientPrimary} disabled={busy} onClick={() => onAttach(pending)}>{t("studio.workspace.v13.confirmAnimation")}</button>
      ) : null}
    </div>
  );
}

function messageFor(code: string | undefined, t: ReturnType<typeof useActiveTranslator>) {
  if (code === "linked_elsewhere") return t("studio.workspace.v13.conflictElsewhere");
  if (code === "already_linked_other") return t("studio.workspace.v13.conflictCurrent");
  if (code === "confirmation_required") return t("studio.workspace.v13.confirmAttach");
  if (code === "INVALID_CHARACTERS") return t("studio.workspace.v13.characterRejected");
  return t("studio.workspace.v13.saveFailed");
}
