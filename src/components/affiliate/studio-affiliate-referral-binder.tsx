"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  STUDIO_AFFILIATE_REF_COOKIE,
  STUDIO_AFFILIATE_REF_MAX_AGE_SEC,
  STUDIO_COMPANY_TRACK_COOKIE,
  STUDIO_COMPANY_TRACK_SLUG_COOKIE,
  readStudioAffiliateRefFromSearch,
  readStudioCompanyTrackFromSearch,
} from "@/lib/affiliate/studio-affiliate-referral";

function writeCookie(name: string, value: string, maxAge = STUDIO_AFFILIATE_REF_MAX_AGE_SEC) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function readCookie(name: string): string | null {
  const raw = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.split("=").slice(1).join("="));
  } catch {
    return null;
  }
}

function hasCompanyTrackCookie(): boolean {
  return Boolean(readCookie(STUDIO_COMPANY_TRACK_COOKIE) || readCookie(STUDIO_COMPANY_TRACK_SLUG_COOKIE));
}

/**
 * Capture ?ref= / ?aff= / ?aff_track= into cookies, then bind to centralUserId when session is ready.
 */
export function StudioAffiliateReferralBinder() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const session = useAuthSession();
  const bindAttempted = useRef(false);

  useEffect(() => {
    const companySlug = readStudioCompanyTrackFromSearch(searchParams.toString());
    if (companySlug && !hasCompanyTrackCookie()) {
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ slug: companySlug }))))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      writeCookie(STUDIO_COMPANY_TRACK_COOKIE, payload);
      writeCookie(STUDIO_COMPANY_TRACK_SLUG_COOKIE, companySlug);
    }

    // Personal ref: skip when company track owns this landing (Growth /a sets both).
    if (companySlug) return;
    const parsed = readStudioAffiliateRefFromSearch(searchParams.toString());
    if (!parsed) return;
    const payload = JSON.stringify(parsed);
    writeCookie(STUDIO_AFFILIATE_REF_COOKIE, payload);
  }, [searchParams, pathname]);

  useEffect(() => {
    if (!session.resolved || !session.user || bindAttempted.current) return;
    const companySlug =
      readCookie(STUDIO_COMPANY_TRACK_SLUG_COOKIE) ||
      (() => {
        const raw = readCookie(STUDIO_COMPANY_TRACK_COOKIE);
        if (!raw) return null;
        try {
          const json = JSON.parse(
            decodeURIComponent(
              Array.from(atob(raw.replace(/-/g, "+").replace(/_/g, "/")))
                .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
                .join(""),
            ),
          ) as { slug?: string };
          return json.slug?.trim().toLowerCase() || null;
        } catch {
          return null;
        }
      })();

    if (companySlug) {
      bindAttempted.current = true;
      void fetch("/api/me/affiliate/bind-referral", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affTrackSlug: companySlug }),
      }).catch(() => {
        bindAttempted.current = false;
      });
      return;
    }

    const cookie = readCookie(STUDIO_AFFILIATE_REF_COOKIE);
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
