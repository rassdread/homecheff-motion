"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";

export function StudioFilmReturnLink({ storyboardId }: { storyboardId: string }) {
  const t = useActiveTranslator();
  const [href, setHref] = useState("");
  const [title, setTitle] = useState("");
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/studio/storyboards/${storyboardId}/film`, { credentials: "include" })
      .then((response) => response.json())
      .then((body: { film?: { href?: string; title?: string } | null }) => {
        if (cancelled || !body.film?.href) return;
        setHref(body.film.href);
        setTitle(body.film.title ?? "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [storyboardId]);
  if (!href) return null;
  return (
    <p className="border-b border-zinc-200 bg-white px-4 py-3 text-sm">
      <Link href={href} className="font-semibold text-[#006D52]">
        {t("studio.workspace.v13.backToFilm", { title: title || t("studio.workspace.v13.filmFallback") })}
      </Link>
    </p>
  );
}
