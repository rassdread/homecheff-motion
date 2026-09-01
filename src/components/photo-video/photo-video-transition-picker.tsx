"use client";

import type { TranslationKey } from "@/i18n";
import {
  PHOTO_VIDEO_SIGNATURE_TRANSITIONS,
  PHOTO_VIDEO_STANDARD_TRANSITIONS,
  type PhotoVideoTransitionKind,
} from "@/lib/photo-video/transition-kind";

const STANDARD_LABEL: Record<(typeof PHOTO_VIDEO_STANDARD_TRANSITIONS)[number], TranslationKey> = {
  cut: "px4a.transition.cut",
  fade: "px4a.transition.fade",
  slide: "px4a.transition.slide",
  wipe: "px4a.transition.wipe",
  zoom_blend: "px4a.transition.zoomBlend",
};

const SIGNATURE_LABEL: Record<(typeof PHOTO_VIDEO_SIGNATURE_TRANSITIONS)[number], TranslationKey> = {
  hc_shards: "px4a.transition.shards",
  hc_tiles: "px4a.transition.tiles",
  hc_orbit: "px4a.transition.orbit",
  hc_ripple: "px4a.transition.ripple",
  hc_split: "px4a.transition.split",
  hc_strips: "px4a.transition.strips",
  hc_lens: "px4a.transition.lens",
};

function Glyph({ kind }: { kind: PhotoVideoTransitionKind }) {
  const base = "relative block h-6 w-9 overflow-hidden rounded-sm border border-current/30";
  if (kind === "auto") {
    return (
      <span className={base} aria-hidden="true">
        <span className="absolute inset-y-0 left-0 w-1/3 bg-current/80" />
        <span className="absolute inset-y-0 left-1/3 w-1/3 bg-current/50" />
        <span className="absolute inset-y-0 right-0 w-1/3 bg-current/25" />
      </span>
    );
  }
  if (kind === "cut") {
    return (
      <span className={base} aria-hidden="true">
        <span className="absolute inset-y-0 left-0 w-1/2 bg-current/80" />
        <span className="absolute inset-y-0 right-0 w-1/2 bg-current/35" />
      </span>
    );
  }
  if (kind === "fade") {
    return (
      <span className={base} aria-hidden="true">
        <span className="absolute inset-0 bg-current/80" />
        <span className="absolute inset-0 bg-current/40 mix-blend-multiply" />
      </span>
    );
  }
  if (kind === "slide") {
    return (
      <span className={base} aria-hidden="true">
        <span className="absolute inset-y-0 left-0 w-2/3 bg-current/45" />
        <span className="absolute inset-y-0 right-0 w-2/3 translate-x-1 bg-current/80" />
      </span>
    );
  }
  if (kind === "wipe") {
    return (
      <span className={base} aria-hidden="true">
        <span className="absolute inset-0 bg-current/30" />
        <span className="absolute inset-y-0 left-0 w-1/2 bg-current/80" />
      </span>
    );
  }
  if (kind === "zoom_blend") {
    return (
      <span className={base} aria-hidden="true">
        <span className="absolute inset-1 rounded-sm border border-current/70" />
        <span className="absolute inset-2 rounded-sm bg-current/80" />
      </span>
    );
  }
  if (kind === "hc_shards") {
    return (
      <span className={base} aria-hidden="true">
        <span className="absolute left-0.5 top-0.5 h-3 w-3 rotate-12 bg-current/80" />
        <span className="absolute right-1 top-1 h-2.5 w-3 -rotate-6 bg-current/55" />
        <span className="absolute bottom-0.5 left-2 h-2 w-4 rotate-3 bg-current/35" />
      </span>
    );
  }
  if (kind === "hc_tiles") {
    return (
      <span className={`${base} grid grid-cols-3 grid-rows-2 gap-px p-0.5`} aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={i % 2 === 0 ? "bg-current/80" : "bg-current/35"} />
        ))}
      </span>
    );
  }
  if (kind === "hc_orbit") {
    return (
      <span className={base} aria-hidden="true">
        <span className="absolute inset-0.5 rounded-full border-2 border-current/40" />
        <span className="absolute left-1/2 top-0.5 h-1/2 w-0.5 origin-bottom -translate-x-1/2 rotate-45 bg-current/80" />
      </span>
    );
  }
  if (kind === "hc_split") {
    return (
      <span className={base} aria-hidden="true">
        <span className="absolute inset-y-0 left-0 w-1/2 -translate-x-0.5 bg-current/80" />
        <span className="absolute inset-y-0 right-0 w-1/2 translate-x-0.5 bg-current/45" />
      </span>
    );
  }
  if (kind === "hc_strips") {
    return (
      <span className={`${base} flex gap-px p-0.5`} aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`h-full flex-1 ${i % 2 === 0 ? "bg-current/80" : "bg-current/30"}`} />
        ))}
      </span>
    );
  }
  if (kind === "hc_lens") {
    return (
      <span className={base} aria-hidden="true">
        <span className="absolute inset-0 bg-current/25" />
        <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-current/80 bg-current/50" />
      </span>
    );
  }
  return (
    <span className={base} aria-hidden="true">
      <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-current/80 [clip-path:polygon(0_40%,20%_0,40%_80%,60%_20%,80%_70%,100%_30%,100%_100%,0_100%)]" />
    </span>
  );
}

function ChoiceButton({
  kind,
  label,
  selected,
  onSelect,
}: {
  kind: PhotoVideoTransitionKind;
  label: string;
  selected: boolean;
  onSelect: (kind: PhotoVideoTransitionKind) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      data-testid={`px4a-transition-${kind}`}
      onClick={() => onSelect(kind)}
      className={`flex min-h-11 min-w-[5.5rem] flex-1 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-sm font-medium ${
        selected
          ? "border-[#006D52] bg-[#006D52] text-white ring-2 ring-[#006D52] ring-offset-1"
          : "border-zinc-200 bg-white text-zinc-800"
      }`}
    >
      <Glyph kind={kind} />
      <span className="leading-tight">
        {label}
        {selected ? <span className="ml-1 font-semibold">✓</span> : null}
      </span>
    </button>
  );
}

export function PhotoVideoTransitionPicker({
  value,
  onChange,
  onPreview,
  previewDisabled,
  t,
}: {
  value: PhotoVideoTransitionKind;
  onChange: (kind: PhotoVideoTransitionKind) => void;
  onPreview: () => void;
  previewDisabled: boolean;
  t: (key: TranslationKey) => string;
}) {
  return (
    <fieldset className="space-y-3" data-testid="px4a-style">
      <legend className="text-sm font-semibold text-zinc-900">{t("px4a.style.legend")}</legend>
      <p className="text-sm text-zinc-600">{t("px4a.style.hint")}</p>
      <div role="radiogroup" aria-label={t("px4a.style.legend")} className="space-y-3">
        <div data-testid="px4a-transition-auto">
          <ChoiceButton
            kind="auto"
            label={t("px4a.style.auto")}
            selected={value === "auto"}
            onSelect={onChange}
          />
        </div>
        <div data-testid="px4a-transition-group-standard" className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("px4a.transition.standard")}
          </p>
          <div className="flex flex-wrap gap-2">
            {PHOTO_VIDEO_STANDARD_TRANSITIONS.map((kind) => (
              <ChoiceButton
                key={kind}
                kind={kind}
                label={t(STANDARD_LABEL[kind])}
                selected={value === kind}
                onSelect={onChange}
              />
            ))}
          </div>
        </div>
        <div data-testid="px4a-transition-group-signature" className="hidden space-y-2 sm:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
            {t("px4a.slice1b.transition.signatureBrand")}
          </p>
          <p className="text-sm text-zinc-600">{t("px4a.transition.signatureHint")}</p>
          <div className="flex flex-wrap gap-2">
            {PHOTO_VIDEO_SIGNATURE_TRANSITIONS.map((kind) => (
              <ChoiceButton
                key={kind}
                kind={kind}
                label={t(SIGNATURE_LABEL[kind])}
                selected={value === kind}
                onSelect={onChange}
              />
            ))}
          </div>
        </div>
        <details data-testid="px4a-transition-group-signature-mobile" className="space-y-2 sm:hidden">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-[#006D52]">
            {t("px4a.slice1b.transition.signatureBrand")}
          </summary>
          <p className="text-sm text-zinc-600">{t("px4a.transition.signatureHint")}</p>
          <div className="flex flex-wrap gap-2">
            {PHOTO_VIDEO_SIGNATURE_TRANSITIONS.map((kind) => (
              <ChoiceButton
                key={kind}
                kind={kind}
                label={t(SIGNATURE_LABEL[kind])}
                selected={value === kind}
                onSelect={onChange}
              />
            ))}
          </div>
        </details>
      </div>
      <button
        type="button"
        data-testid="px4a-transition-preview"
        className="min-h-11 rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-800 disabled:opacity-50"
        disabled={previewDisabled}
        onClick={onPreview}
      >
        {t("px4a.transition.preview")}
      </button>
    </fieldset>
  );
}
