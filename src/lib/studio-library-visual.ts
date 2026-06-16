/**
 * Library / assets hub visual tokens — dark Studio page surfaces.
 * Use instead of ad-hoc slate-* on studio-page-bg routes.
 */

import { studioVisual } from "@/lib/studio-visual-tokens";

export const studioLibraryVisual = {
  pageMain: `${studioVisual.pageRoot} ${studioVisual.pageBg}`,

  heroBreadcrumb: "text-sm text-slate-300",
  heroBreadcrumbLink: "font-medium text-green-300 transition-colors hover:text-green-200 hover:underline",
  heroBreadcrumbSep: "mx-1.5 text-slate-500",
  heroBreadcrumbCurrent: "font-medium text-white",
  heroBackLink:
    "inline-flex min-h-[44px] items-center text-sm font-medium text-green-300 transition-colors hover:text-green-200 hover:underline",
  heroTitle: "text-xl font-bold text-white sm:text-2xl",
  heroTitleLarge: "mt-1 text-2xl font-bold text-white sm:text-3xl",
  heroDescription: "mt-1 max-w-2xl text-sm text-slate-300",
  sectionTitle: "text-lg font-semibold text-white sm:text-xl",
  sectionLead: "mt-1 text-sm text-slate-300",
  metaMuted: "text-xs text-slate-400",
  helperText: "text-sm text-slate-300",
  loadingText: "text-sm text-slate-300",
  emptyText: "text-sm text-slate-300",
  errorText: "text-sm text-red-300",

  filterChip:
    "shrink-0 min-h-[44px] rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-900 ring-1 ring-white/25 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-50",
  filterChipActive: `${studioVisual.navActive} shrink-0 min-h-[44px] rounded-full px-3 py-2 text-xs font-semibold`,

  formControl:
    "min-h-[44px] rounded-xl border border-white/25 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70 disabled:opacity-50",
  formControlWide:
    "min-h-[44px] min-w-[180px] flex-1 rounded-xl border border-white/25 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70",
  filterToggle:
    "min-h-[44px] rounded-xl border border-white/25 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70",
  adminCheckboxLabel:
    "flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-white/25 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-sm",

  viewToggleWrap: "flex rounded-xl border border-white/25 bg-white p-1 shadow-sm",
  viewToggleBtn:
    "min-h-[40px] rounded-lg px-3 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70",
  viewToggleBtnActive: "min-h-[40px] rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-950",

  /** Light inset panels on dark Studio pages (hub groups, recent strip). */
  lightPanel:
    "rounded-2xl border border-white/15 bg-white/[0.94] p-4 text-slate-900 shadow-[0_12px_40px_-20px_rgba(0,103,177,0.2)] backdrop-blur-sm sm:p-6",
  lightPanelTitle: "text-lg font-semibold text-slate-900",
  lightPanelBody: "text-sm text-slate-700",
  lightPanelMeta: "text-xs text-slate-600",

  adminPanel: "rounded-2xl border border-white/15 bg-white/[0.94] p-4 shadow-sm backdrop-blur-sm sm:p-6",
  embeddedShell: "rounded-xl border border-slate-200 bg-slate-50/50 p-4",
  embeddedTitle: "text-lg font-semibold text-slate-900 sm:text-xl",
  embeddedLead: "mt-1 text-sm text-slate-700",
} as const;

export function libraryFilterChipClasses(active: boolean): string {
  return active ? studioLibraryVisual.filterChipActive : studioLibraryVisual.filterChip;
}

export function libraryViewToggleClasses(active: boolean): string {
  return active ? studioLibraryVisual.viewToggleBtnActive : studioLibraryVisual.viewToggleBtn;
}

/** WCAG AA reference pairs on #041428 — documented for regression tests. */
export const LIBRARY_DARK_SURFACE_CONTRAST = {
  breadcrumb: { fg: "#cbd5e1", bg: "#041428", minRatio: 4.5 },
  backLink: { fg: "#86efac", bg: "#041428", minRatio: 4.5 },
  title: { fg: "#ffffff", bg: "#041428", minRatio: 4.5 },
  description: { fg: "#cbd5e1", bg: "#041428", minRatio: 4.5 },
  chipUnselected: { fg: "#0f172a", bg: "#ffffff", minRatio: 4.5 },
} as const;
