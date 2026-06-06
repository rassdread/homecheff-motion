"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { isPublicDebugUiEnabled } from "@/lib/debug-ui";

type BuildMeta = {
  commitSha: string;
  buildTime: string;
  vercelEnv: string;
};

export function MotionBuildDebugBadge({ className = "" }: { className?: string }) {
  const session = useAuthSession();
  const [meta, setMeta] = useState<BuildMeta | null>(null);

  const isAdmin = session.resolved && session.user?.role === "admin";
  const visible = isPublicDebugUiEnabled() || isAdmin;

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void fetch("/api/meta/build", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: BuildMeta) => {
        if (!cancelled) {
          setMeta(json);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMeta(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible || !meta?.commitSha) {
    return null;
  }

  const shortSha = meta.commitSha.slice(0, 7);
  const built = meta.buildTime ? new Date(meta.buildTime).toLocaleString() : "—";

  return (
    <p
      className={`font-mono text-[10px] text-zinc-500 ${className}`}
      title={`Full SHA: ${meta.commitSha}\nEnv: ${meta.vercelEnv}`}
    >
      build {shortSha} · {built}
    </p>
  );
}
