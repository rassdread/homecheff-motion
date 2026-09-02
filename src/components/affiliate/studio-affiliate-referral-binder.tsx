"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  STUDIO_AFFILIATE_REF_COOKIE,
  STUDIO_AFFILIATE_REF_MAX_AGE_SEC,
  readStudioAffiliateRefFromSearch,
} from "@/lib/affiliate/studio-affiliate-referral";

function writeCookie(value: string) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${STUDIO_AFFILIATE_REF_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${STUDIO_AFFILIATE_REF_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

function readCookie(): string | null {
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${STUDIO_AFFILIATE_REF_COOKIE}=`));
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.split("=").slice(1).join("="));
  } catch {
    return null;
  }
}

/**
 * Capture ?ref= / ?aff= into cookie, then bind to centralUserId when session is ready.
 */
export function StudioAffiliateReferralBinder() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const session = useAuthSession();
  const bindAttempted = useRef(false);

  useEffect(() => {
    const parsed = readStudioAffiliateRefFromSearch(searchParams.toString());
    if (!parsed) return;
    const payload = JSON.stringify(parsed);
    writeCookie(payload);
  }, [searchParams, pathname]);

  useEffect(() => {
    if (!session.resolved || !session.user || bindAttempted.current) return;
    const cookie = readCookie();
    if (!cookie) return;
    bindAttempted.current = true;
    void fetch("/api/me/affiliate/bind-referral", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: cookie.startsWith("{") ? cookie : JSON.stringify({ affiliateCentralUserId: cookie }),
    }).catch(() => {
      bindAttempted.current = false;
    });
  }, [session.resolved, session.user]);

  return null;
}
