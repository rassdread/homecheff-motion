import type { AnimationIntentId } from "@/lib/animation-intents";

export type AnimationIntentPreviewCardProps = {
  intentId: AnimationIntentId;
  selected: boolean;
  onSelect: () => void;
  label: string;
  description: string;
  showSuggestedBadge?: boolean;
  /** i18n string when `showSuggestedBadge` is true */
  suggestedBadgeText?: string;
  disabled?: boolean;
};

function IntentMiniPreview({ intentId }: { intentId: AnimationIntentId }) {
  const wrap = "relative mx-auto flex h-16 w-full max-w-[7.5rem] items-center justify-center";

  if (intentId === "morph") {
    return (
      <div className={wrap} aria-hidden>
        <div className="absolute left-2 top-3 h-10 w-10 rounded-xl bg-emerald-400/75 shadow-sm ring-1 ring-emerald-600/20" />
        <div className="absolute right-2 top-3 h-10 w-10 rounded-xl bg-teal-300/80 shadow-sm ring-1 ring-teal-600/15 mix-blend-multiply" />
        <div className="absolute inset-x-5 top-5 h-6 rounded-lg bg-gradient-to-r from-emerald-200/90 via-white/60 to-teal-200/90 blur-[2px]" />
      </div>
    );
  }

  if (intentId === "cinematic") {
    return (
      <div className={wrap} aria-hidden>
        <div className="relative h-11 w-[4.25rem] rounded-md border-2 border-zinc-400 bg-gradient-to-br from-zinc-100 to-zinc-300 shadow-inner">
          <span className="absolute -left-0.5 -top-0.5 block h-2 w-2 border-l-2 border-t-2 border-emerald-600" />
          <span className="absolute -right-0.5 -top-0.5 block h-2 w-2 border-r-2 border-t-2 border-emerald-600" />
          <span className="absolute -bottom-0.5 -left-0.5 block h-2 w-2 border-b-2 border-l-2 border-emerald-600" />
          <span className="absolute -bottom-0.5 -right-0.5 block h-2 w-2 border-b-2 border-r-2 border-emerald-600" />
          <span className="absolute left-1/2 top-1/2 h-8 w-px -translate-x-1/2 -translate-y-1/2 bg-emerald-500/40" />
          <span className="absolute left-1/2 top-1/2 h-px w-10 -translate-x-1/2 -translate-y-1/2 bg-emerald-500/35" />
        </div>
      </div>
    );
  }

  if (intentId === "product") {
    return (
      <div className={wrap} aria-hidden>
        <div
          className="flex h-12 w-14 items-center justify-center rounded-lg bg-gradient-to-b from-white via-zinc-50 to-zinc-200 shadow-md ring-1 ring-zinc-300/80"
          style={{
            boxShadow:
              "0 0 0 1px rgb(228 228 231 / 0.9), inset 0 0 20px rgb(255 255 255 / 0.95), 0 8px 24px -6px rgb(16 185 129 / 0.25)",
          }}
        >
          <div className="h-7 w-9 rounded border border-zinc-300/90 bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  /* dynamic */
  return (
    <div className={wrap} aria-hidden>
      <div
        className="h-14 w-20 rounded-md bg-zinc-900/5"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -32deg,
            transparent,
            transparent 3px,
            rgb(16 185 129 / 0.35) 3px,
            rgb(16 185 129 / 0.35) 5px
          )`,
        }}
      />
      <div className="pointer-events-none absolute inset-2 rounded bg-gradient-to-tr from-transparent via-emerald-400/20 to-transparent" />
    </div>
  );
}

export function AnimationIntentPreviewCard({
  intentId,
  selected,
  onSelect,
  label,
  description,
  showSuggestedBadge = false,
  suggestedBadgeText = "",
  disabled = false,
}: AnimationIntentPreviewCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={`relative flex w-full flex-col rounded-xl border p-3 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-400/60"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
      }`}
    >
      {showSuggestedBadge && suggestedBadgeText ? (
        <span className="absolute right-2 top-2 z-10 max-w-[calc(100%-1rem)] truncate rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          {suggestedBadgeText}
        </span>
      ) : null}
      <IntentMiniPreview intentId={intentId} />
      <span className="mt-2 line-clamp-2 text-center text-xs font-semibold text-zinc-900">{label}</span>
      <span className="mt-1 line-clamp-3 text-center text-[11px] leading-snug text-zinc-600">{description}</span>
    </button>
  );
}
