/** HomeCheff Studio visual system — shared Tailwind class fragments. */

export const STUDIO_COLORS = {
  green: "#006D52",
  blue: "#0067B1",
  deepNavy: "#041428",
  midNavy: "#062a4a",
} as const;

export const studioVisual = {
  /** Full-page cinematic background for product routes */
  pageBg:
    "studio-page-bg min-h-[calc(100dvh-4rem)] flex-1 text-zinc-100",
  /** Sticky dark glass header */
  header:
    "sticky top-0 z-30 border-b border-white/10 bg-[#041428]/75 backdrop-blur-xl backface-hidden [transform:translateZ(0)] shadow-[0_8px_32px_-12px_rgba(0,103,177,0.35)]",
  headerInner: "mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-3.5 lg:px-10",
  logoMark:
    "relative h-8 w-8 overflow-hidden rounded-lg border border-white/20 shadow-[0_0_12px_rgba(0,109,82,0.35)]",
  logoText: "text-sm font-semibold tracking-tight text-white",
  /** Nav pills */
  navInactive:
    "inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/12 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/75 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white sm:min-h-0 sm:px-3 sm:py-2 sm:text-xs lg:px-4 lg:text-sm",
  navActive:
    "inline-flex min-h-11 shrink-0 items-center rounded-full border border-[#006D52]/50 bg-gradient-to-r from-[#006D52]/25 to-[#0067B1]/25 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_0_16px_rgba(0,103,177,0.35)] sm:min-h-0 sm:px-3 sm:py-2 sm:text-xs lg:px-4 lg:text-sm",
  /** Language switch */
  langSwitch:
    "flex items-center rounded-full border border-white/15 bg-white/8 p-0.5 backdrop-blur-sm",
  langOptionActive: "rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-2.5 py-1 text-[11px] font-semibold text-white sm:text-xs",
  langOptionInactive:
    "rounded-full px-2.5 py-1 text-[11px] font-semibold text-white/65 transition-colors hover:bg-white/10 hover:text-white sm:text-xs",
  /** User bar */
  userEmail: "truncate text-xs text-white/60 sm:text-sm",
  btnGhost:
    "shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 transition-colors hover:border-white/25 hover:bg-white/10 sm:px-3 sm:py-1.5 sm:text-sm",
  btnPrimary:
    "rounded-full border border-[#006D52]/40 bg-gradient-to-r from-[#006D52] to-[#0067B1] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_4px_20px_-4px_rgba(0,109,82,0.5)] transition-opacity hover:opacity-90 sm:px-4 sm:py-2 sm:text-sm",
  btnSecondary:
    "rounded-full border border-white/20 bg-white/8 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/12 sm:px-4 sm:py-2 sm:text-sm",
  adminBadge:
    "shrink-0 rounded-full border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200 backdrop-blur-sm sm:text-xs",
  roleBadgeUser:
    "shrink-0 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60 sm:text-xs",
  roleBadgePower:
    "shrink-0 rounded-full border border-sky-400/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200 sm:text-xs",
  /** Cards */
  cardLight:
    "rounded-2xl border border-white/15 bg-white/[0.94] p-6 text-zinc-900 shadow-[0_16px_48px_-24px_rgba(0,0,0,0.45)] backdrop-blur-md",
  cardGlass:
    "rounded-2xl border border-white/12 bg-white/8 p-6 text-white shadow-[0_12px_40px_-20px_rgba(0,103,177,0.25)] backdrop-blur-xl",
  cardElevated:
    "rounded-2xl border border-[#0067B1]/20 bg-white/[0.97] p-6 text-zinc-900 shadow-[0_20px_50px_-20px_rgba(0,103,177,0.2)]",
  cardActive:
    "ring-2 ring-[#006D52]/40 shadow-[0_0_24px_rgba(0,109,82,0.2)]",
  /** Buttons */
  btnGradientPrimary:
    "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,109,82,0.55)] transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
  btnOutline:
    "inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-[#0067B1]/40 hover:bg-white/10 disabled:opacity-40",
  btnDanger:
    "inline-flex items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-40",
  /** Editor working surfaces — brighter but on-brand */
  editorSurface:
    "rounded-xl border border-white/12 bg-white/[0.96] text-zinc-900 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.35)] backdrop-blur-sm",
  editorPanel:
    "rounded-xl border border-zinc-200/80 bg-white p-4 text-zinc-900 shadow-sm",
  editorTabActive:
    "rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_12px_rgba(0,103,177,0.3)]",
  editorTabInactive:
    "rounded-full border border-zinc-300/80 bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-[#0067B1]/30 hover:text-[#0067B1]",
  /** Eyebrow / section labels on dark pages */
  eyebrow: "text-xs font-semibold uppercase tracking-wider text-[#006D52]",
  eyebrowOnDark: "text-xs font-semibold uppercase tracking-wider text-emerald-300/90",
} as const;
