"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { StudioProjectMediaBrowser } from "@/components/studio/studio-project-media-browser";
import { StudioProjectAssistantRail } from "@/components/studio/studio-project-assistant-rail";
import { useOptionalHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { publishStudioFilmAssistantContext } from "@/lib/studio-film-assistant-bridge";
import { useLocale, useActiveTranslator } from "@/i18n/client";
import { ECOSYSTEM_BRAND_MARK_URL } from "@/lib/ecosystem-navigation/contract";
import {
  isWorkspaceSection,
  type ProjectWorkspaceView,
  type WorkspaceSection,
} from "@/lib/studio-project-workspace";
import { StudioProjectFilmEditor } from "@/components/studio/studio-project-film-editor";
import { StudioProjectScenePanel } from "@/components/studio/studio-project-scene-panel";
import { StudioProjectTimeline } from "@/components/studio/studio-project-timeline";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  parseStudioWorkflow,
  workflowDefaultSection,
  workflowLegacyHref,
  workflowPrimarySections,
  workspaceSelectionSearch,
  type StudioWorkflow,
} from "@/lib/studio-v23-intent";
import { planStudioWorkspaceLayout, type StudioWorkspaceLayoutPlan } from "@/lib/studio-workspace-posture";

const NAV = [
  { id: "dashboard", href: "/studio", section: null },
  { id: "projects", href: "/projects", section: null },
  { id: "media", href: null, section: "media" as const },
  { id: "characters", href: null, section: "characters" as const },
  { id: "voices", href: null, section: "audio" as const },
  { id: "exports", href: null, section: "export" as const },
] as const;

const SECTIONS: WorkspaceSection[] = ["overview", "scenes", "characters", "media", "audio", "timeline", "export"];

type Props = {
  workspace: ProjectWorkspaceView;
  initialSection?: string | null;
  initialSceneId?: string | null;
  initialCharacterId?: string | null;
  initialWorkflow?: string | null;
  onReload?: () => void;
};

function formatWhen(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale);
}

export function StudioUnifiedProjectWorkspace({
  workspace,
  initialSection,
  initialSceneId,
  initialCharacterId,
  initialWorkflow,
  onReload,
}: Props) {
  const t = useActiveTranslator();
  const globalAssistant = useOptionalHomeCheffAssistant();
  const [locale] = useLocale();
  const workflow: StudioWorkflow = parseStudioWorkflow(initialWorkflow) ?? "film";
  const [section, setSection] = useState<WorkspaceSection>(
    isWorkspaceSection(initialSection) ? initialSection : workflowDefaultSection(workflow),
  );
  const [navOpen, setNavOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [assistantCollapsed, setAssistantCollapsed] = useState(false);
  const [posture, setPosture] = useState<StudioWorkspaceLayoutPlan | null>(null);
  const [mediaProjectId, setMediaProjectId] = useState(workspace.mediaProjectIds[0] ?? "");
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    workspace.characters.some((item) => item.id === initialCharacterId)
      ? (initialCharacterId as string)
      : (workspace.characters[0]?.id ?? ""),
  );
  const [selectedSceneId, setSelectedSceneId] = useState(initialSceneId ?? "");

  useEffect(() => {
    const apply = () => setPosture(planStudioWorkspaceLayout(window.innerWidth, window.innerHeight));
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const selectedCharacter = workspace.characters.find((item) => item.id === selectedCharacterId) ?? workspace.characters[0] ?? null;
  const selectedScene = workspace.scenes.find((scene) => scene.id === selectedSceneId) ?? workspace.scenes[0] ?? null;

  useEffect(() => {
    publishStudioFilmAssistantContext({
      projectType: "creative_film",
      projectId: workspace.project.id,
      projectTitle: workspace.project.title,
      section,
      sectionLabel: t(`studio.workspace.v12.section.${section}`),
      workflow,
      sceneId: selectedScene?.id ?? null,
      sceneTitle: selectedScene ? `${selectedScene.order}. ${selectedScene.title}` : null,
      characterId: selectedCharacter?.id ?? null,
      characterName: selectedCharacter?.name ?? null,
      scenes: workspace.scenes.map((item) => ({
        id: item.id,
        order: item.order,
        title: item.title,
        dialogueText: item.dialogueText,
      })),
      balance: workspace.hcAvailable,
    });
    return () => publishStudioFilmAssistantContext(null);
  }, [section, selectedCharacter, selectedScene, t, workflow, workspace]);
  const previewImage =
    selectedCharacter?.referenceImageUrl ||
    workspace.scenes.find((scene) => scene.imageUrl)?.imageUrl ||
    workspace.media[0]?.previewUrl ||
    "";
  const previewVideo = workspace.exports.find((item) => item.status === "completed" && item.downloadUrl)?.downloadUrl ?? "";
  const primarySections = new Set(workflowPrimarySections(workflow));
  const legacyHref = workflowLegacyHref(workflow, workspace.project.id);

  const link = useMemo(() => {
    const map = new Map(workspace.links.map((item) => [item.id, item.href]));
    return (id: string) => map.get(id) ?? "";
  }, [workspace.links]);

  function writeSelection(patch: { section?: string | null; scene?: string | null; character?: string | null; workflow?: string | null }) {
    const next = workspaceSelectionSearch(window.location.search, patch);
    window.history.replaceState(null, "", `${window.location.pathname}${next}`);
  }

  function chooseSection(next: WorkspaceSection) {
    setSection(next);
    setNavOpen(false);
    writeSelection({ section: next, workflow, scene: selectedScene?.id ?? null, character: selectedCharacter?.id ?? null });
  }

  function chooseCharacter(id: string) {
    setSelectedCharacterId(id);
    writeSelection({ section, workflow, scene: selectedScene?.id ?? null, character: id });
  }

  const navButton = (id: (typeof NAV)[number]["id"], active: boolean) =>
    `${active ? "bg-[#0067B1] text-white" : "text-white/85 hover:bg-white/10"} flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067B1]`;

  const sidebar = (
    <nav aria-label={t("studio.workspace.v12.navLabel")} className="flex flex-col gap-1 p-3">
      <Link href="/studio" className="mb-4 flex items-center gap-2 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ECOSYSTEM_BRAND_MARK_URL} alt="HomeCheff" className="h-9 w-9 rounded-lg" />
        <span className="text-sm font-semibold text-white">HomeCheff Studio</span>
      </Link>
      {NAV.map((item) =>
        item.href ? (
          <Link key={item.id} href={item.href} className={navButton(item.id, false)}>
            {t(`studio.workspace.v12.nav.${item.id}`)}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            className={navButton(item.id, section === item.section)}
            aria-current={section === item.section ? "page" : undefined}
            onClick={() => item.section && chooseSection(item.section)}
          >
            {t(`studio.workspace.v12.nav.${item.id}`)}
          </button>
        ),
      )}
    </nav>
  );

  return (
    <div
      className="min-h-screen bg-[#041428] pb-24 text-zinc-900 min-[1024px]:grid min-[1024px]:grid-cols-[240px_minmax(0,1fr)] min-[1024px]:pb-0"
      data-studio-posture={posture?.posture ?? "compact"}
      data-testid="studio-v23-workspace"
    >
      <aside className={`${posture && !posture.showInlineLeftRail ? "hidden" : "hidden min-[1024px]:block"} border-r border-white/10 bg-[#041428]`}>{sidebar}</aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#041428]/95 px-4 py-3 text-white backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-white/20 lg:hidden"
              aria-expanded={navOpen}
              aria-controls="workspace-nav"
              onClick={() => setNavOpen((open) => !open)}
            >
              {t("studio.workspace.v12.menu")}
            </button>
            <div className="min-w-0">
              <p className="text-xs text-white/70">{t("studio.workspace.v12.projectEyebrow")}</p>
              <h1 className="truncate text-lg font-bold tracking-tight" data-testid="studio-v24-project" data-project-id={workspace.project.id} data-workflow={workflow} data-scene-id={selectedScene?.id ?? ""}>{workspace.project.title}</h1>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-full border border-white/20 px-3 text-sm font-semibold lg:hidden"
            aria-expanded={contextOpen}
            onClick={() => (globalAssistant ? globalAssistant.setOpen(true) : setContextOpen(true))}
          >
            {t("studio.v23.assistant.title")}
          </button>
        </header>
        {navOpen ? (
          <div id="workspace-nav" className="border-b border-white/10 bg-[#041428] lg:hidden">
            {sidebar}
          </div>
        ) : null}

        <div className="min-[1024px]:grid min-[1024px]:grid-cols-[minmax(0,1fr)_320px] min-[1440px]:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 px-4 py-5 sm:px-6">
            <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="studio-v23-workflow">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                {t(`studio.v23.workflow.${workflow}`)}
              </span>
              {legacyHref ? (
                <Link href={legacyHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline-offset-2 hover:underline">
                  {t("studio.v23.workflow.legacy")}
                </Link>
              ) : null}
            </div>
            <div className="mb-4 flex flex-wrap gap-2" data-testid="studio-v23-simple-actions">
              {(
                [
                  ["media", "studio.v23.simple.image"],
                  ["scenes", "studio.v23.simple.video"],
                  ["audio", "studio.v23.simple.voice"],
                  ["timeline", "studio.v23.simple.timeline"],
                  ["export", "studio.v23.simple.export"],
                ] as const
              ).map(([target, label]) => (
                <button
                  key={target}
                  type="button"
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/20 px-3 text-sm font-semibold text-white"
                  onClick={() => chooseSection(target)}
                >
                  {t(label)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pb-4" role="tablist" aria-label={t("studio.workspace.v12.sectionsLabel")}>
              {SECTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={section === item}
                  data-primary={primarySections.has(item) ? "true" : "false"}
                  className={section === item ? studioVisual.editorTabActive : studioVisual.editorTabInactive}
                  onClick={() => chooseSection(item)}
                >
                  {t(`studio.workspace.v12.section.${item}`)}
                </button>
              ))}
            </div>

            <section className={`${studioVisual.cardLight} overflow-hidden p-0`}>
              <div className="bg-[#041428]">
                {section === "export" && previewVideo ? (
                  <video controls playsInline src={previewVideo} className="max-h-[520px] w-full bg-black" />
                ) : previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewImage} alt="" className="max-h-[520px] w-full object-contain" />
                ) : (
                  <div className="flex min-h-56 items-center justify-center px-6 text-center text-sm text-white/80">
                    {t("studio.workspace.v12.previewEmpty")}
                  </div>
                )}
              </div>
              <div className="p-5 sm:p-6">
                {section === "overview" ? <Overview workspace={workspace} locale={locale} t={t} /> : null}
                {section === "scenes" ? (
                  <>
                    <StudioProjectScenePanel
                      workspace={workspace}
                      initialSceneId={selectedScene?.id ?? initialSceneId}
                      onReload={onReload ?? (() => undefined)}
                      onSceneChange={(sceneId) => {
                        setSelectedSceneId(sceneId);
                        writeSelection({ section: "scenes", workflow, scene: sceneId, character: selectedCharacter?.id ?? null });
                      }}
                    />
                    <div className="mt-6">
                      <StudioProjectFilmEditor workspace={workspace} />
                    </div>
                  </>
                ) : null}
                {section === "characters" ? (
                  <Characters
                    workspace={workspace}
                    selectedId={selectedCharacter?.id ?? ""}
                    onSelect={chooseCharacter}
                    t={t}
                  />
                ) : null}
                {section === "media" ? (
                  <Media
                    workspace={workspace}
                    link={link}
                    mediaProjectId={mediaProjectId}
                    onMediaProjectId={setMediaProjectId}
                    t={t}
                  />
                ) : null}
                {section === "audio" ? <Audio workspace={workspace} link={link} t={t} /> : null}
                {section === "timeline" ? (
                  <StudioProjectTimeline
                    projectId={workspace.project.id}
                    music={workspace.music.map((item) => ({ id: item.id, title: item.title }))}
                    soundEffects={workspace.soundEffects.map((item) => ({ id: item.id, title: item.title }))}
                  />
                ) : null}
                {section === "export" ? <Exports workspace={workspace} link={link} t={t} /> : null}
              </div>
            </section>
          </main>
          <Context
            workspace={workspace}
            character={selectedCharacter}
            scene={selectedScene}
            section={section}
            workflow={workflow}
            embedAssistant={!globalAssistant}
            assistantCollapsed={assistantCollapsed}
            onToggleAssistant={() => setAssistantCollapsed((value) => !value)}
            link={link}
            open={contextOpen}
            onClose={() => setContextOpen(false)}
            t={t}
          />
        </div>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-200 bg-white px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] min-[768px]:hidden"
        aria-label={t("studio.workspace.v12.sectionsLabel")}
      >
        {(
          [
            ["overview", "studio.workspace.v12.section.overview"],
            ["scenes", "studio.workspace.v12.section.scenes"],
            ["timeline", "studio.workspace.v12.section.timeline"],
          ] as const
        ).map(([target, label]) => (
          <button
            key={target}
            type="button"
            className="min-h-11 flex-1 text-xs font-semibold text-zinc-800"
            onClick={() => chooseSection(target)}
          >
            {t(label)}
          </button>
        ))}
        <button
          type="button"
          className="min-h-11 flex-1 text-xs font-semibold text-zinc-800"
          onClick={() => (globalAssistant ? globalAssistant.setOpen(true) : setContextOpen(true))}
        >
          {t("studio.v23.assistant.title")}
        </button>
      </nav>
    </div>
  );
}

type Translate = ReturnType<typeof useActiveTranslator>;

function Overview({
  workspace,
  locale,
  t,
}: {
  workspace: ProjectWorkspaceView;
  locale: string;
  t: Translate;
}) {
  const counts = [
    ["characters", workspace.characters.length],
    ["scenes", workspace.scenes.length],
    ["images", workspace.media.filter((item) => item.family === "image").length],
    ["videos", workspace.media.filter((item) => item.family === "video").length + workspace.exports.filter((item) => item.downloadUrl).length],
    ["audio", workspace.music.length + workspace.soundEffects.length + workspace.voiceover.length],
  ] as const;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#0067B1]">{t(`studio.workspace.v12.status.${workspace.project.status}` as "studio.workspace.v12.status.active")}</p>
        {workspace.project.description ? <p className="mt-2 text-sm leading-6 text-zinc-700">{workspace.project.description}</p> : <p className="mt-2 text-sm text-zinc-600">{t("studio.workspace.v12.noDescription")}</p>}
        <p className="mt-3 text-xs text-zinc-500">
          {t("studio.workspace.v12.updated", { when: formatWhen(workspace.project.updatedAt, locale) })}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {counts.map(([key, count]) => (
          <li key={key} className="rounded-xl border border-zinc-200 px-3 py-3">
            <p className="text-2xl font-bold text-zinc-900">{count}</p>
            <p className="text-xs font-medium text-zinc-600">{t(`studio.workspace.v12.count.${key}`)}</p>
          </li>
        ))}
      </ul>
      {workspace.characters.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-3">
          {workspace.characters.map((character) => (
            <li key={character.id} className="rounded-xl border border-zinc-200 p-3">
              {character.referenceImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.referenceImageUrl} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
              ) : null}
              <p className="text-sm font-semibold text-zinc-900">{character.name}</p>
              <p className="text-xs text-zinc-600">{character.voiceAssigned ? t("studio.workspace.v12.voiceAssigned") : t("studio.workspace.v12.voiceMissing")}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <JobList jobs={workspace.jobs} t={t} />
    </div>
  );
}

function Characters({
  workspace,
  selectedId,
  onSelect,
  t,
}: {
  workspace: ProjectWorkspaceView;
  selectedId: string;
  onSelect: (id: string) => void;
  t: Translate;
}) {
  const [referenceId, setReferenceId] = useState("");
  const [referenceNote, setReferenceNote] = useState("");
  if (workspace.characters.length === 0) {
    return <Empty text={t("studio.workspace.v12.charactersEmpty")} href="/studio/characters" action={t("studio.workspace.v12.openCharacters")} />;
  }
  const images = workspace.media.filter((item) => item.family === "image");
  return (
    <div className="space-y-4">
    <ul className="grid gap-3 sm:grid-cols-2">
      {workspace.characters.map((character) => (
        <li key={character.id}>
          <button
            type="button"
            onClick={() => onSelect(character.id)}
            className={`flex w-full gap-3 rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0067B1] ${selectedId === character.id ? "border-[#0067B1] ring-2 ring-[#0067B1]/30" : "border-zinc-200"}`}
            aria-pressed={selectedId === character.id}
          >
            {character.referenceImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={character.referenceImageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <span className="h-16 w-16 rounded-lg bg-zinc-100" />
            )}
            <span>
              <span className="block font-semibold text-zinc-900">{character.name}</span>
              <span className="mt-1 block text-xs text-zinc-600">
                {character.voiceAssigned ? t("studio.workspace.v12.voiceAssigned") : t("studio.workspace.v12.voiceMissing")}
                {character.voiceLanguage ? ` · ${character.voiceLanguage}` : ""}
                {character.voiceGender ? ` · ${character.voiceGender}` : ""}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
    {images.length > 0 && selectedId ? (
      <div className="space-y-2" data-testid="studio-v23-reference-picker">
        <p className="text-sm font-semibold text-zinc-900">{t("studio.v23.reference.use")}</p>
        <ul className="flex gap-2 overflow-x-auto">
          {images.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={referenceId === item.id}
                className={`min-h-11 rounded-xl border p-2 text-left text-xs ${referenceId === item.id ? "border-[#0067B1]" : "border-zinc-200"}`}
                onClick={() => setReferenceId(item.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <span className="mt-1 block max-w-16 truncate">{item.title}</span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`${studioVisual.btnGradientPrimary} min-h-11 px-3 text-sm`}
          disabled={!referenceId}
          onClick={() => {
            void fetch("/api/studio/assistant/actions", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "ASSOCIATE_CHARACTER_REFERENCE",
                confirmed: true,
                projectId: workspace.project.id,
                characterId: selectedId,
                assetId: referenceId,
              }),
            }).then((response) => {
              setReferenceNote(response.ok ? t("studio.v23.reference.saved") : t("studio.v23.save.error"));
            });
          }}
        >
          {t("studio.v23.assistant.confirm")}
        </button>
        {referenceNote ? <p className="text-sm text-zinc-700">{referenceNote}</p> : null}
      </div>
    ) : null}
    </div>
  );
}

function Media({
  workspace,
  link,
  mediaProjectId,
  onMediaProjectId,
  t,
}: {
  workspace: ProjectWorkspaceView;
  link: (id: string) => string;
  mediaProjectId: string;
  onMediaProjectId: (id: string) => void;
  t: Translate;
}) {
  return (
    <div className="space-y-4">
      {workspace.mediaProjectIds.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {workspace.mediaProjectIds.map((id, index) => (
            <button
              key={id}
              type="button"
              className={mediaProjectId === id ? studioVisual.editorTabActive : studioVisual.editorTabInactive}
              onClick={() => onMediaProjectId(id)}
            >
              {index === 0 ? t("studio.workspace.v12.linkedStoryboardMedia") : t("studio.workspace.v12.linkedVideoMedia")}
            </button>
          ))}
        </div>
      ) : null}
      {link("imageEditor") ? (
        <a href={link("imageEditor")} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#006D52]">
          {t("studio.v24.action.edit_image")}
        </a>
      ) : null}
      {mediaProjectId ? (
        <StudioProjectMediaBrowser key={mediaProjectId} lockProjectId={mediaProjectId} />
      ) : workspace.media.length === 0 ? (
        <Empty text={t("studio.workspace.v12.mediaEmpty")} href={link("mediaLibrary")} action={t("studio.workspace.v12.openMediaLibrary")} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {workspace.media.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-xl border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt={item.title} className="h-40 w-full object-cover" />
              <p className="px-3 py-2 text-sm font-semibold">{item.title}</p>
            </li>
          ))}
        </ul>
      )}
      <TextLink href={link("mediaLibrary")}>{t("studio.workspace.v12.openMediaLibrary")}</TextLink>
    </div>
  );
}

function Audio({
  workspace,
  link,
  t,
}: {
  workspace: ProjectWorkspaceView;
  link: (id: string) => string;
  t: Translate;
}) {
  return (
    <div className="space-y-8">
      <AudioBlock title={t("studio.workspace.v12.audio.dialogue")}>
        {workspace.characters.length === 0 ? <p className="text-sm text-zinc-600">{t("studio.workspace.v12.audio.dialogueEmpty")}</p> : (
          <ul className="space-y-2">
            {workspace.characters.map((character) => (
              <li key={character.id} className="text-sm text-zinc-800">
                <span className="font-semibold">{character.name}</span>
                {" — "}
                {character.voiceAssigned ? t("studio.workspace.v12.voiceAssigned") : t("studio.workspace.v12.voiceMissing")}
                {character.voiceSummary ? ` — ${character.voiceSummary}` : ""}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-zinc-500">{t("studio.workspace.v12.audio.dialogueNote")}</p>
      </AudioBlock>
      <AudioBlock title={t("studio.workspace.v12.audio.voiceover")}>
        {workspace.voiceover.length === 0 ? <p className="text-sm text-zinc-600">{t("studio.workspace.v12.audio.voiceoverEmpty")}</p> : <ClipList clips={workspace.voiceover} />}
      </AudioBlock>
      <AudioBlock title={t("studio.workspace.v12.audio.music")}>
        {!workspace.audioLibraryAvailable ? <p className="text-sm text-zinc-600">{t("studio.workspace.v12.audio.unavailable")}</p> : workspace.music.length === 0 ? <p className="text-sm text-zinc-600">{t("studio.workspace.v12.audio.musicEmpty")}</p> : <ClipList clips={workspace.music} />}
        <p className="mt-2 text-xs text-zinc-500">{t("studio.workspace.v12.audio.musicNote")}</p>
      </AudioBlock>
      <AudioBlock title={t("studio.workspace.v12.audio.sfx")}>
        {!workspace.audioLibraryAvailable ? <p className="text-sm text-zinc-600">{t("studio.workspace.v12.audio.unavailable")}</p> : workspace.soundEffects.length === 0 ? <p className="text-sm text-zinc-600">{t("studio.workspace.v12.audio.sfxEmpty")}</p> : <ClipList clips={workspace.soundEffects} />}
      </AudioBlock>
      <AudioBlock title={t("studio.workspace.v12.audio.mine")}>
        <p className="text-sm text-zinc-600">{t("studio.workspace.v12.audio.mineNote")}</p>
        {link("storyboardEditor") ? <TextLink href={link("storyboardEditor")}>{t("studio.workspace.v12.openAdvancedAudio")}</TextLink> : null}
      </AudioBlock>
    </div>
  );
}

function Exports({
  workspace,
  link,
  t,
}: {
  workspace: ProjectWorkspaceView;
  link: (id: string) => string;
  t: Translate;
}) {
  const ready = workspace.exports.filter((item) => item.downloadUrl);
  if (ready.length === 0) {
    return <Empty text={t("studio.workspace.v12.exportEmpty")} note={t("studio.workspace.v12.exportNote")} />;
  }
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {ready.map((item) => (
          <li key={item.id} className="rounded-xl border border-zinc-200 p-3">
            <p className="text-sm font-semibold text-zinc-900">{item.label}</p>
            <p className="text-xs text-zinc-500">{item.status}</p>
            <a href={item.downloadUrl ?? ""} className={`${studioVisual.btnGradientPrimary} mt-3`} download>
              {t("studio.workspace.v12.download")}
            </a>
          </li>
        ))}
      </ul>
      {link("animation") ? <TextLink href={link("animation")}>{t("studio.workspace.v12.openAnimation")}</TextLink> : null}
    </div>
  );
}

function Context({
  workspace,
  character,
  scene,
  section,
  workflow,
  embedAssistant,
  assistantCollapsed,
  onToggleAssistant,
  link,
  open,
  onClose,
  t,
}: {
  workspace: ProjectWorkspaceView;
  character: ProjectWorkspaceView["characters"][number] | null;
  scene: ProjectWorkspaceView["scenes"][number] | null;
  section: WorkspaceSection;
  workflow: StudioWorkflow;
  embedAssistant: boolean;
  assistantCollapsed: boolean;
  onToggleAssistant: () => void;
  link: (id: string) => string;
  open: boolean;
  onClose: () => void;
  t: Translate;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const body = (
    <div className="space-y-5">
      <div className="flex items-center justify-between lg:hidden">
        <h2 className="text-base font-bold">{t("studio.workspace.v12.details")}</h2>
        <button type="button" className="min-h-11 px-2 text-sm font-semibold text-[#006D52]" onClick={onClose}>
          {t("studio.workspace.v12.close")}
        </button>
      </div>
      <section>
        <h2 className="text-sm font-bold text-zinc-900">{t("studio.workspace.v12.hcTitle")}</h2>
        {workspace.hcAvailable == null ? (
          <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.v12.hcUnavailable")}</p>
        ) : (
          <p className="mt-1 text-2xl font-bold text-zinc-900">{workspace.hcAvailable} HC</p>
        )}
        <p className="mt-2 text-xs leading-5 text-zinc-600">{t("studio.workspace.v12.hcQuoteLater")}</p>
        <TextLink href={link("credits")}>{t("studio.workspace.v12.openCredits")}</TextLink>
      </section>
      {character ? (
        <section>
          <h2 className="text-sm font-bold text-zinc-900">{character.name}</h2>
          {character.description ? <p className="mt-1 text-sm text-zinc-700">{character.description}</p> : null}
          <p className="mt-2 text-sm text-zinc-700">
            {character.voiceAssigned ? t("studio.workspace.v12.voiceAssigned") : t("studio.workspace.v12.voiceMissing")}
          </p>
          <TextLink href={`/studio/characters/${character.id}/edit?returnTo=${encodeURIComponent(`/studio/projects/${workspace.project.id}?section=characters`)}`}>
            {t("studio.workspace.v12.editCharacter")}
          </TextLink>
          <TextLink href={`/studio/characters/${character.id}#voice`}>
            {t("studio.workspace.v12.openVoiceCatalog")}
          </TextLink>
        </section>
      ) : null}
      {embedAssistant ? (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3" data-workflow={workflow}>
          <StudioProjectAssistantRail
            projectId={workspace.project.id}
            projectTitle={workspace.project.title}
            sectionLabel={t(`studio.workspace.v12.section.${section}`)}
            section={section}
            sceneId={scene?.id ?? null}
            sceneTitle={scene ? `${scene.order}. ${scene.title}` : null}
            characterId={character?.id ?? null}
            characterName={character?.name ?? null}
            scenes={workspace.scenes.map((item) => ({
              id: item.id,
              order: item.order,
              title: item.title,
              dialogueText: item.dialogueText,
            }))}
            balance={workspace.hcAvailable}
            collapsed={assistantCollapsed}
            onToggle={onToggleAssistant}
          />
          <p className="mt-3 text-xs font-semibold text-zinc-500">{t("studio.workspace.v12.directorNotExecuting")}</p>
        </section>
      ) : null}
      {link("characterMasters") ? <TextLink href={link("characterMasters")}>{t("studio.workspace.v12.masterTools")}</TextLink> : null}
    </div>
  );

  return (
    <>
      <aside className="hidden border-l border-zinc-200 bg-white p-5 lg:block">{body}</aside>
      {open ? (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("studio.workspace.v12.details")}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            {body}
          </div>
        </div>
      ) : null}
    </>
  );
}

function JobList({ jobs, t }: { jobs: ProjectWorkspaceView["jobs"]; t: Translate }) {
  if (jobs.length === 0) return <p className="text-sm text-zinc-600">{t("studio.workspace.v12.jobsEmpty")}</p>;
  return (
    <ul className="space-y-2">
      {jobs.map((job) => (
        <li key={job.id} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-zinc-800">{job.capability}</span>
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{job.status}</span>
        </li>
      ))}
    </ul>
  );
}

function AudioBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-zinc-900">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function ClipList({ clips }: { clips: ProjectWorkspaceView["music"] }) {
  return (
    <ul className="space-y-3">
      {clips.map((clip) => (
        <li key={clip.id}>
          <p className="text-sm font-semibold text-zinc-900">{clip.title}</p>
          <audio controls preload="none" src={clip.audioUrl} className="mt-1 w-full" />
        </li>
      ))}
    </ul>
  );
}

function Empty({ text, href, action, note }: { text: string; href?: string; action?: string; note?: string }) {
  return (
    <div>
      <p className="text-sm text-zinc-700">{text}</p>
      {note ? <p className="mt-2 text-xs text-zinc-500">{note}</p> : null}
      {href && action ? (
        <Link href={href} className={`${studioVisual.btnGradientPrimary} mt-4`}>
          {action}
        </Link>
      ) : null}
    </div>
  );
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <Link href={href} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[#006D52] underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}
