import type { StyleDnaBillingMode, StyleDnaErrorCode } from "@/types/studio-style-dna";
import type { StyleDnaImageUrlType } from "@/server/studio/style-dna-image-url";
import type { SessionUser } from "@/server/auth/session";

export const STYLE_DNA_ROUTE_VERSION = "2026-06-24-premium-session-v2";

export type StyleDnaRouteDebug = {
  routeName: string;
  routeVersion: string;
  billingMode: StyleDnaBillingMode;
  sourceKind: string;
  hasImageUrl: boolean;
  imageUrlType: StyleDnaImageUrlType;
  cacheStatus: "hit" | "miss" | "bypass";
  creditMode: "premium_session" | "standalone" | "production_contract" | "cache_hit" | "admin";
  errorCode?: StyleDnaErrorCode;
};

export function isStyleDnaAdminDebugUser(user: Pick<SessionUser, "role" | "email">): boolean {
  return user.role === "admin" || user.role === "superadmin";
}

export function buildStyleDnaRouteDebug(input: Omit<StyleDnaRouteDebug, "routeName" | "routeVersion">): StyleDnaRouteDebug {
  return {
    routeName: "/api/editor/vision/style-dna",
    routeVersion: STYLE_DNA_ROUTE_VERSION,
    ...input,
  };
}
