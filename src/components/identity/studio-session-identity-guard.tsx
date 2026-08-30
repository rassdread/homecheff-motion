"use client";

/**
 * Detects Studio session identity changes across tabs (shared host-only studio_session).
 */

import { useEffect, useRef, useState } from "react";
import {
  STUDIO_AUTH_CHANNEL,
  clearStudioIdentityBoundClientResidue,
  rememberStudioAuthUserId,
  type StudioAuthChannelMessage,
} from "@/lib/identity/studio-session-identity-channel";
import { invalidateAuthSessionCache } from "@/lib/auth-session-client";

async function fetchStudioUserId(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
    });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    const j = (await res.json().catch(() => null)) as {
      user?: { id?: string } | null;
    } | null;
    return typeof j?.user?.id === "string" ? j.user.id : null;
  } catch {
    return null;
  }
}

export function StudioSessionIdentityGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [banner, setBanner] = useState<string | null>(null);
  const knownUserIdRef = useRef<string | null>(null);
  const baselineSetRef = useRef(false);
  const reloadingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const applyIdentityChange = (nextUserId: string | null, reason: string) => {
      if (reloadingRef.current || cancelled) return;
      if (!baselineSetRef.current) {
        knownUserIdRef.current = nextUserId;
        baselineSetRef.current = true;
        rememberStudioAuthUserId(nextUserId);
        return;
      }
      const prev = knownUserIdRef.current;
      if (prev === nextUserId) return;

      reloadingRef.current = true;
      knownUserIdRef.current = nextUserId;
      rememberStudioAuthUserId(nextUserId);
      clearStudioIdentityBoundClientResidue();
      invalidateAuthSessionCache();
      setBanner(
        nextUserId == null
          ? "Je bent uitgelogd — gegevens worden gewist…"
          : "Sessie gewijzigd — gegevens worden opnieuw geladen…",
      );
      console.info("[homecheff-studio-auth] identity_changed", {
        reason,
        prev,
        next: nextUserId,
      });
      window.setTimeout(() => {
        window.location.reload();
      }, 400);
    };

    const sync = async (reason: string) => {
      const id = await fetchStudioUserId();
      if (cancelled) return;
      applyIdentityChange(id, reason);
    };

    void sync("mount");

    const onVis = () => {
      if (document.visibilityState === "visible") void sync("visibility");
    };
    const onFocus = () => void sync("focus");
    const onPageShow = (ev: PageTransitionEvent) => {
      if (ev.persisted) void sync("bfcache");
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(STUDIO_AUTH_CHANNEL);
      bc.onmessage = (ev: MessageEvent<StudioAuthChannelMessage>) => {
        const msg = ev.data;
        if (!msg || typeof msg !== "object") return;
        if (msg.type === "logout") {
          applyIdentityChange(null, "broadcast_logout");
          return;
        }
        if (msg.type === "login" || msg.type === "identity") {
          void sync(`broadcast_${msg.type}`);
        }
      };
    } catch {
      bc = null;
    }

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      bc?.close();
    };
  }, []);

  return (
    <>
      {banner ? (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[100] border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-950"
        >
          {banner}
        </div>
      ) : null}
      {children}
    </>
  );
}
