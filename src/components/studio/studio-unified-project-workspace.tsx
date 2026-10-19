"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { StudioProjectMediaBrowser } from "@/components/studio/studio-project-media-browser";
import { useLocale, useActiveTranslator } from "@/i18n/client";
import { ECOSYSTEM_BRAND_MARK_URL } from "@/lib/ecosystem-navigation/contract";
import {
  isWorkspaceSection,
  type ProjectWorkspaceView,
  type WorkspaceSection,
} from "@/lib/studio-project-workspace";
import { StudioProjectScenePanel } from "@/components/studio/studio-project-scene-panel";
import { studioVisual } from "@/lib/studio-visual-tokens";

const NAV = [
  { id: "dashboard", href: "/studio", section: null },
  { id: "projects", href: "/projects", section: null },
  { id: "media", href: null, section: "media" as const },
  { id: "characters", href: null, section: "characters" as const },
  { id: "voices", href: null, section: "audio" as const },
  { id: "exports", href: null, section: "export" as const },
] as const;

const SECTIONS: WorkspaceSection[] = ["overview", "scenes", "characters", "media", "audio", "export"];

type Props = {
  workspace: ProjectWorkspaceView;
  initialSection?: string | null;
  onReload?: () => void;
};

function formatWhen(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale);
}

export function StudioUnifiedProjectWorkspace({ workspace, initialSection, onReload }: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const [section, setSection] = useState<WorkspaceSection>(
    isWorkspaceSection(initialSection) ? initialSection : "overview",
  );
  const [navOpen, setNavOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [mediaProjectId, setMediaProjectId] = useState(workspace.mediaProjectIds[0] ?? "");
  const [selectedCharacterId, setSelectedCharacterId] = useState(workspace.characters[0]?.id ?? "");

  const selectedCharacter = workspace.characters.find((item) => item.id === selectedCharacterId) ?? workspace.characters[0] ?? null;
  const previewImage =
    selectedCharacter?.referenceImageUrl ||
    workspace.scenes.find((scene) => scene.imageUrl)?.imageUrl ||
    workspace.media[0]?.previewUrl ||
    "";
  const previewVideo = workspace.exports.find((item) => item.status === "completed" && item.downloadUrl)?.downloadUrl ?? "";

  const link = useMemo(() => {
    const map = new Map(workspace.links.map((item) => [item.id, item.href]));
    return (id: string) => map.get(id) ?? "";
  }, [workspace.links]);

  function chooseSection(next: WorkspaceSection) {
    setSection(next);
    setNavOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    window.history.replaceState(null, "", url.toString());
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
    <div className="min-h-screen bg-[#041428] text-zinc-900 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden border-r border-white/10 bg-[#041428] lg:block">{sidebar}</aside>
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
              <h1 className="truncate text-lg font-bold tracking-tight">{workspace.project.title}</h1>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-full border border-white/20 px-3 text-sm font-semibold lg:hidden"
            aria-expanded={contextOpen}
            onClick={() => setContextOpen(true)}
          >
            {t("studio.workspace.v12.details")}
          </button>
        </header>
        {navOpen ? (
          <div id="workspace-nav" className="border-b border-white/10 bg-[#041428] lg:hidden">
            {sidebar}
          </div>
        ) : null}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-w-0 px-4 py-5 sm:px-6">
            <div className="flex gap-2 overflow-x-auto pb-4" role="tablist" aria-label={t("studio.workspace.v12.sectionsLabel")}>
              {SECTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={section === item}
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
                {section === "scenes" ? <StudioProjectScenePanel workspace={workspace} onReload={onReload ?? (() => undefined)} /> : null}
                {section === "characters" ? (
                  <Characters
                    workspace={workspace}
                    selectedId={selectedCharacter?.id ?? ""}
                    onSelect={setSelectedCharacterId}
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
                {section === "export" ? <Exports workspace={workspace} link={link} t={t} /> : null}
              </div>
            </section>
          </main>
          <Context
            workspace={workspace}
            character={selectedCharacter}
            link={link}
            open={contextOpen}
            onClose={() => setContextOpen(false)}
            t={t}
          />
        </div>
      </div>
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
  if (workspace.characters.length === 0) {
    return <Empty text={t("studio.workspace.v12.charactersEmpty")} href="/studio/characters" action={t("studio.workspace.v12.openCharacters")} />;
  }
  return (
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
  if (!workspace.project.animationLinked || ready.length === 0) {
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
  link,
  open,
  onClose,
  t,
}: {
  workspace: ProjectWorkspaceView;
  character: ProjectWorkspaceView["characters"][number] | null;
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
      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <h2 className="text-sm font-bold text-zinc-900">{t("studio.workspace.v12.directorTitle")}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-700">{t("studio.workspace.v12.directorBody")}</p>
        <p className="mt-2 text-xs font-semibold text-zinc-500">{t("studio.workspace.v12.directorNotExecuting")}</p>
      </section>
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
