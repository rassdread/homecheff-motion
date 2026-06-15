"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { listRecentEditorDocuments } from "@/lib/editor-canvas-session";
import { studioVisual } from "@/lib/studio-visual-tokens";

type RecentEdit = {
  label: string;
  href: string;
};

export function EditorLandingContinueCard() {
  const t = useActiveTranslator();
  const [mounted, setMounted] = useState(false);
  const [recent, setRecent] = useState<RecentEdit | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const doc = listRecentEditorDocuments()[0];
      if (doc) {
        setRecent({
          label: doc.name,
          href: `/editor?session=${encodeURIComponent(doc.sessionId)}`,
        });
      }
      setMounted(true);
    });
  }, []);

  if (!mounted || !recent) {
    return null;
  }

  return (
    <div
      className={`mt-8 ${studioVisual.cardGlass} max-w-xl`}
      data-testid="editor-landing-continue-card"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/90">
        {t("landing.continue.title" as never)}
      </p>
      <Link
        href={recent.href}
        className="mt-2 block text-sm font-semibold text-white hover:underline"
      >
        {recent.label}
      </Link>
    </div>
  );
}
