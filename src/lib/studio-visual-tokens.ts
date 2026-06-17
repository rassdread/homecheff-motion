/** HomeCheff Studio visual system — shared Tailwind class fragments. */

export const STUDIO_COLORS = {
  green: "#006D52",
  blue: "#0067B1",
  deepNavy: "#041428",
  midNavy: "#062a4a",
} as const;

export const studioVisual = {
  /** Full-page cinematic background for product routes */
  pageBg: "studio-page-bg text-zinc-100",
  pageRoot: "relative w-full min-w-0 overflow-visible",
  /** Sticky dark glass header — compact V4 */
  header:
    "studio-header-safe sticky top-0 z-30 border-b border-white/[0.085] bg-[#041428]/75 backdrop-blur-xl backface-hidden [transform:translateZ(0)] shadow-[0_6px_26px_-12px_rgba(0,103,177,0.28)] supports-[backdrop-filter]:bg-[#041428]/75 bg-[#041428]/95",
  headerInner:
    "mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 px-2 py-2 min-h-[var(--studio-header-height)] sm:gap-2 sm:px-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-2 lg:px-5 lg:py-2.5 lg:min-h-[72px]",
  logoMark:
    "relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-white/[0.17] shadow-[0_0_10px_rgba(0,109,82,0.3)] sm:h-8 sm:w-8",
  logoText: "hidden min-[400px]:inline text-xs font-semibold tracking-tight text-white sm:text-sm",
  /** Nav pills */
  navInactive:
    "inline-flex h-9 shrink-0 items-center rounded-full border border-white/[0.10] bg-white/5 px-2.5 text-xs font-medium text-white/80 transition-all hover:border-white/[0.17] hover:bg-white/10 hover:text-white lg:px-3",
  navActive:
    "inline-flex h-9 shrink-0 items-center rounded-full border border-[#006D52]/45 bg-gradient-to-r from-[#006D52]/25 to-[#0067B1]/25 px-2.5 text-xs font-semibold text-white shadow-[0_0_13px_rgba(0,103,177,0.28)] lg:px-3",
  /** Language switch */
  langSwitch:
    "flex items-center rounded-full border border-white/[0.13] bg-white/[0.07] p-0.5 backdrop-blur-sm",
  langOptionActive: "",
  langOptionInactive: "",
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
  userPill:
    "inline-flex max-w-[9.5rem] min-h-[44px] items-center gap-1 rounded-full border border-white/[0.13] bg-white/[0.07] px-2 py-1.5 text-xs backdrop-blur-sm transition-colors hover:bg-white/10 sm:max-w-[12rem] sm:gap-1.5 sm:px-2.5 lg:max-w-none",
  userDropdown:
    "overflow-hidden rounded-xl border border-white/[0.13] bg-[#041428]/95 py-1 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.65)] backdrop-blur-xl",
  userDropdownItem:
    "block px-3 py-2 text-sm text-white/90 transition-colors hover:bg-white/10",
  mobileMenuButton:
    "inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.13] bg-white/[0.07] px-3 text-sm font-semibold text-white backdrop-blur-sm",
  mobileNavDrawer:
    "studio-mobile-nav-drawer",
  /** Cards */
  /** Cards on dark pages — tinted glass, not harsh pure white */
  cardOnDark:
    "rounded-2xl border border-white/14 bg-white/[0.08] p-6 text-white shadow-[0_16px_48px_-24px_rgba(0,0,0,0.45)] backdrop-blur-md",
  cardOnDarkMuted:
    "rounded-2xl border border-white/12 bg-[#041428]/55 p-5 text-white/90 backdrop-blur-md",
  headingOnDark: "text-white font-bold tracking-tight",
  subheadingOnDark: "text-white/85",
  bodyOnDark: "text-white/75",
  /** Hub/list cards — soft glass on cinematic bg */
  cardLight:
    "rounded-2xl border border-white/15 bg-white/[0.94] p-6 text-zinc-900 shadow-[0_16px_48px_-24px_rgba(0,0,0,0.45)] backdrop-blur-md",
  hubCard:
    "rounded-2xl border border-white/14 bg-white/[0.94] p-4 text-zinc-900 shadow-[0_12px_40px_-20px_rgba(0,103,177,0.2)] backdrop-blur-sm",
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
  fusionCategorySection:
    "rounded-2xl border border-white/[0.10] bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6",
  fusionCategoryDivider:
    "mt-4 h-px w-full bg-gradient-to-r from-[#006D52] via-white/20 to-[#0067B1]",
  fusionCard:
    "relative rounded-2xl border border-white/20 bg-white/[0.97] p-5 text-left shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 hover:border-[#0067B1]/35 disabled:opacity-50",
  fusionCardSelected:
    "relative rounded-2xl border border-transparent bg-white p-5 text-left shadow-[0_14px_36px_-16px_rgba(0,103,177,0.45)] ring-2 ring-transparent [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(135deg,#006D52,#0067B1)_border-box] transition hover:-translate-y-0.5 disabled:opacity-50",
  fusionBadge:
    "shrink-0 rounded-full bg-gradient-to-r from-[#006D52]/15 to-[#0067B1]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0067B1]",
  /** App-level overlays — above header (z-30), assistant FAB (z-40), bottom sheets (z-50). */
  appModalZ: "z-[1000]",
  appModalOverlay:
    "fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm",
  appModalClose:
    "fixed z-[1001] flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/55 text-lg font-semibold text-white shadow-[0_4px_24px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-white/50 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/80 active:scale-95",
  appModalNavBtn:
    "fixed top-1/2 z-[1001] -translate-y-1/2 rounded-full border border-white/25 bg-black/50 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:border-white/40 hover:bg-black/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/80 disabled:cursor-not-allowed disabled:opacity-30",
} as const;
