"use client";

/**
 * S.5 Creative Memory — fits existing Assets Hub (no Adaptive Workspace redesign).
 * Projects + library search + favorites, paginated.
 */

import { useEffect, useState, useTransition } from "react";
import { studioLibraryVisual } from "@/lib/studio-library-visual";
import { studioVisual } from "@/lib/studio-visual-tokens";

type CreativeProject = {
  id: string;
  title: string;
  status: string;
  pinned: boolean;
  favorite: boolean;
  updatedAt: string;
};

type LibraryAsset = {
  id: string;
  title: string;
  family: string;
  favorite: boolean;
  origin: string;
};

export function StudioCreativeMemoryPanel() {
  const [projects, setProjects] = useState<CreativeProject[]>([]);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [pRes, aRes] = await Promise.all([
          fetch("/api/studio/creative-projects?recent=1&limit=8", { cache: "no-store" }),
          fetch("/api/studio/library/assets?limit=12", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (pRes.ok) {
          const data = (await pRes.json()) as { projects: CreativeProject[] };
          setProjects(data.projects ?? []);
        }
        if (aRes.ok) {
          const data = (await aRes.json()) as { assets: LibraryAsset[] };
          setAssets(data.assets ?? []);
        }
      } catch {
        if (!cancelled) setError("Could not load creative memory.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function runSearch(nextQuery: string) {
    setQuery(nextQuery);
    startTransition(() => {
      void (async () => {
        const res = await fetch(
          `/api/studio/library/search?q=${encodeURIComponent(nextQuery)}&limit=12`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { assets: LibraryAsset[] };
        setAssets(data.assets ?? []);
      })();
    });
  }

  async function createProject() {
    const title = window.prompt("Project title");
    if (!title?.trim()) return;
    const res = await fetch("/api/studio/creative-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (!res.ok) {
      setError("Could not create project.");
      return;
    }
    const data = (await res.json()) as { project: CreativeProject };
    setProjects((prev) => [data.project, ...prev].slice(0, 8));
  }

  async function syncLibrary() {
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/studio/library/sync", { method: "POST" });
        if (!res.ok) {
          setError("Sync failed.");
          return;
        }
        const list = await fetch("/api/studio/library/assets?limit=12", { cache: "no-store" });
        if (list.ok) {
          const data = (await list.json()) as { assets: LibraryAsset[] };
          setAssets(data.assets ?? []);
        }
      })();
    });
  }

  return (
    <section className={studioLibraryVisual.lightPanel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${studioVisual.eyebrow}`}>
            Creative memory
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Projects & asset library</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Permanent workspace index for uploads, generations, brand kits, and presets. Generation
            jobs stay temporary; assets stay reusable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void createProject()}
            className="inline-flex min-h-[40px] items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            New project
          </button>
          <button
            type="button"
            onClick={() => void syncLibrary()}
            disabled={pending}
            className="inline-flex min-h-[40px] items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            Index library
          </button>
        </div>
      </div>

      {error ?
        <p className="mt-3 text-sm text-rose-600" role="alert">
          {error}
        </p>
      : null}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Recent projects</h3>
          {projects.length === 0 ?
            <p className="mt-2 text-sm text-slate-500">No creative projects yet.</p>
          : (
            <ul className="mt-2 space-y-2">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-900">{p.title}</span>
                  <span className="text-xs text-slate-500">
                    {p.pinned ? "Pinned · " : ""}
                    {p.favorite ? "★ · " : ""}
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Library</h3>
            <input
              type="search"
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="Search pizza, cinematic, voice…"
              className="min-h-[40px] min-w-[12rem] flex-1 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-800"
              aria-label="Search library"
            />
          </div>
          {assets.length === 0 ?
            <p className="mt-2 text-sm text-slate-500">
              {pending ? "Searching…" : "No indexed assets yet. Use Index library."}
            </p>
          : (
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
              {assets.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium text-slate-900">{a.title}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {a.favorite ? "★ " : ""}
                    {a.family}
                    {a.origin ? ` · ${a.origin}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
