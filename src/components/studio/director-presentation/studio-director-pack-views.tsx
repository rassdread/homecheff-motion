"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  shouldRenderCreativeGlobe,
  type StudioDirectorPresentationPlan,
} from "@/lib/studio-director-presentation";
import {
  buildExperiencePackHref,
  getProductExperience,
  type StudioProductExperienceId,
  type StudioProductMode,
} from "@/lib/studio-creative-director";

export type DirectorPackNode = {
  experienceId: StudioProductExperienceId;
  label: string;
  goal: string;
  family: string;
};

type Props = {
  plan: StudioDirectorPresentationPlan;
  packs: DirectorPackNode[];
  selectedId?: string | null;
  productMode?: StudioProductMode;
  onSelect?: (experienceId: StudioProductExperienceId) => void;
  /** When set, packs navigate via href instead of onSelect */
  linkMode?: boolean;
};

/**
 * Lightweight Creative Globe — CSS orbit only.
 * Mounted only when {@link shouldRenderCreativeGlobe} is true (desktop/tablet).
 * No particles on tablet; no Three.js; no mobile mount.
 */
export function StudioDirectorCreativeGlobe({
  plan,
  packs,
  selectedId,
  productMode = "QUICK",
  onSelect,
  linkMode = false,
}: Props) {
  if (!shouldRenderCreativeGlobe(plan)) {
    return null;
  }

  const size = plan.mode === "COMPACT_TABLET" ? 280 : 420;
  const visible = packs.slice(0, plan.maxVisibleOrbitNodes);
  const radius = size * 0.38;

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width: size, height: size }}
      data-director-globe={plan.mode}
      data-orbit-nodes={visible.length}
      aria-label="Creative Director experience globe"
      role="list"
    >
      {plan.allowParticles ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-8 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(0,109,82,0.25), transparent 55%)",
          }}
        />
      ) : null}

      <div
        className={`absolute inset-[18%] rounded-full border border-[#006D52]/30 bg-gradient-to-br from-[#006D52]/15 to-zinc-100 shadow-inner ${
          plan.allowRichMotion ? "animate-[spin_48s_linear_infinite]" : ""
        }`}
        style={plan.allowRichMotion ? undefined : { animation: "none" }}
        aria-hidden
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="z-10 flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#006D52] text-center text-white shadow-lg sm:h-28 sm:w-28">
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            Director
          </span>
          <span className="px-2 text-xs font-bold leading-tight">Experience</span>
        </div>
      </div>

      {visible.map((pack, index) => {
        const angle = (index / visible.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const selected = selectedId === pack.experienceId;
        const className = [
          "absolute z-20 flex min-h-11 min-w-11 max-w-[7.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border px-2 py-1.5 text-center text-[11px] font-semibold leading-tight shadow-sm transition",
          selected
            ? "border-[#006D52] bg-[#006D52] text-white"
            : "border-zinc-200 bg-white text-zinc-800 hover:border-[#006D52]/50",
          plan.touchOptimized ? "min-h-12 min-w-12 text-xs" : "",
        ].join(" ");

        const style = {
          left: `calc(50% + ${x}px)`,
          top: `calc(50% + ${y}px)`,
        } as const;

        if (linkMode) {
          return (
            <Link
              key={pack.experienceId}
              role="listitem"
              href={buildExperiencePackHref({
                experienceId: pack.experienceId,
                mode: productMode,
              })}
              className={className}
              style={style}
              title={pack.label}
            >
              {pack.label}
            </Link>
          );
        }

        return (
          <button
            key={pack.experienceId}
            type="button"
            role="listitem"
            className={className}
            style={style}
            title={pack.label}
            onClick={() => onSelect?.(pack.experienceId)}
          >
            {pack.label}
          </button>
        );
      })}
    </div>
  );
}

export function StudioDirectorPackCards({
  plan,
  packs,
  selectedId,
  productMode = "QUICK",
  onSelect,
  linkMode = false,
  search = "",
}: Props & { search?: string }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packs;
    return packs.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.goal.toLowerCase().includes(q) ||
        p.family.toLowerCase().includes(q) ||
        p.experienceId.toLowerCase().includes(q)
    );
  }, [packs, search]);

  const grid =
    plan.mode === "MINIMAL_MOBILE"
      ? "grid grid-cols-1 gap-3"
      : plan.mode === "COMPACT_MOBILE"
        ? "grid grid-cols-2 gap-3"
        : "grid grid-cols-1 gap-3 sm:grid-cols-2";

  return (
    <ul className={grid} data-director-cards={plan.mode} role="list">
      {filtered.map((pack) => {
        const selected = selectedId === pack.experienceId;
        const className = [
          "flex flex-col rounded-2xl border px-4 py-3 text-left transition",
          plan.touchOptimized ? "min-h-14" : "min-h-12",
          selected
            ? "border-[#006D52] bg-[#006D52]/5"
            : "border-zinc-200 bg-white hover:border-[#006D52]/40",
        ].join(" ");

        if (linkMode) {
          return (
            <li key={pack.experienceId}>
              <Link
                href={buildExperiencePackHref({
                  experienceId: pack.experienceId,
                  mode: productMode,
                })}
                className={className}
              >
                <span className="font-semibold text-zinc-900">{pack.label}</span>
                <span className="text-xs text-zinc-500">{pack.goal.replace(/_/g, " ")}</span>
              </Link>
            </li>
          );
        }

        return (
          <li key={pack.experienceId}>
            <button
              type="button"
              className={`${className} w-full`}
              onClick={() => onSelect?.(pack.experienceId)}
            >
              <span className="font-semibold text-zinc-900">{pack.label}</span>
              <span className="text-xs text-zinc-500">{pack.goal.replace(/_/g, " ")}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function toDirectorPackNodes(
  ids: readonly StudioProductExperienceId[]
): DirectorPackNode[] {
  return ids.map((experienceId) => {
    const entry = getProductExperience(experienceId);
    return {
      experienceId,
      label: entry.label,
      goal: entry.creativeGoal,
      family: entry.family,
    };
  });
}
