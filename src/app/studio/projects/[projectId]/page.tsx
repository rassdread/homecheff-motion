"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";

type Resource = {
  id: string;
  family: string;
  title: string;
  previewUrl: string;
  characterId: string;
};

type ProjectResponse = {
  project?: { id: string; title: string; description: string };
  resources?: Resource[];
  storyboardHref?: string | null;
  error?: string;
};

function section(title: string, items: Resource[], projectId: string, empty: string) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {items.length === 0 ? <p className="mt-2 text-sm text-zinc-600">{empty}</p> : null}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const href = item.characterId
            ? `/studio/characters/${item.characterId}/edit?returnTo=${encodeURIComponent(`/studio/projects/${projectId}`)}`
            : "";
          const body = (
            <span className="flex items-center gap-3">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <span className="h-14 w-14 rounded-lg bg-zinc-100" />
              )}
              <span className="font-semibold text-zinc-900">{item.title}</span>
            </span>
          );
          return (
            <li key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
              {href ? (
                <Link href={href} className="block min-h-11">
                  {body}
                </Link>
              ) : body}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function StudioCreativeProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [data, setData] = useState<ProjectResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/studio/creative-projects/${projectId}`, { credentials: "include" })
      .then(async (response) => {
        const body = (await response.json()) as ProjectResponse;
        if (cancelled) return;
        if (!response.ok) {
          setError(body.error ?? "Dit project is niet beschikbaar.");
          return;
        }
        setData(body);
      })
      .catch(() => {
        if (!cancelled) setError("Dit project is niet beschikbaar.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const resources = data?.resources ?? [];
  const characters = resources.filter((item) => item.family === "character");
  const locations = resources.filter((item) => item.family === "location");
  const props = resources.filter((item) => item.family === "prop");
  const media = resources.filter((item) => !["character", "location", "prop"].includes(item.family));

  return (
    <StudioAuthGate>
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <Link href="/projects" className="text-sm font-medium text-[#006D52] hover:underline">
          ← Mijn projecten
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">{data?.project?.title ?? "Project"}</h1>
        {data?.project?.description ? <p className="mt-2 text-sm text-zinc-600">{data.project.description}</p> : null}
        {error ? <p className="mt-6 text-sm text-red-700">{error}</p> : null}
        {section("Personages", characters, projectId, "Nog geen personages in dit project.")}
        {section("Locaties", locations, projectId, "Nog geen locaties in dit project.")}
        {section("Props", props, projectId, "Nog geen props in dit project.")}
        {section("Media", media, projectId, "Nog geen andere media in dit project.")}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900">Storyboard</h2>
          {data?.storyboardHref ? (
            <Link href={data.storyboardHref} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[#006D52]">
              Open het storyboard
            </Link>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">Dit project heeft nog geen storyboard.</p>
          )}
        </section>
      </main>
    </StudioAuthGate>
  );
}
