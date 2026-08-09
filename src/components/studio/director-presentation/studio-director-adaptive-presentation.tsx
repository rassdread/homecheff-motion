"use client";

import { useMemo, useState } from "react";
import { useStudioDirectorPresentation } from "@/hooks/use-studio-director-presentation";
import {
  describeDirectorPresentation,
  shouldRenderCreativeGlobe,
  type StudioDirectorPresentationPlan,
} from "@/lib/studio-director-presentation";
import type {
  StudioProductExperienceId,
  StudioProductMode,
} from "@/lib/studio-creative-director";
import {
  StudioDirectorCreativeGlobe,
  StudioDirectorPackCards,
  type DirectorPackNode,
} from "@/components/studio/director-presentation/studio-director-pack-views";

type Props = {
  packs: DirectorPackNode[];
  selectedId?: string | null;
  productMode?: StudioProductMode;
  onSelect?: (experienceId: StudioProductExperienceId) => void;
  linkMode?: boolean;
  /** Optional override for tests / storybook */
  presentationOverride?: StudioDirectorPresentationPlan;
  showSearch?: boolean;
  title?: string;
  subtitle?: string;
};

/**
 * S.6H Adaptive Presentation Layer for Creative Director Experience Packs.
 * Same packs → same experience IDs on every device; only presentation changes.
 */
export function StudioDirectorAdaptivePresentation({
  packs,
  selectedId,
  productMode = "QUICK",
  onSelect,
  linkMode = false,
  presentationOverride,
  showSearch = true,
  title = "Experience Packs",
  subtitle,
}: Props) {
  const live = useStudioDirectorPresentation();
  const plan = presentationOverride ?? live;
  const [search, setSearch] = useState("");
  const [coachOpen, setCoachOpen] = useState(!plan.collapsibleInspectors);

  const showGlobe = shouldRenderCreativeGlobe(plan);
  const cardsPrimary = !showGlobe || plan.mode === "COMPACT_TABLET";

  const hint = useMemo(() => describeDirectorPresentation(plan), [plan]);

  return (
    <div
      className="space-y-4"
      data-studio-director-presentation={plan.mode}
      data-render-globe={showGlobe ? "true" : "false"}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
          <p className="mt-1 text-[11px] text-zinc-400" aria-live="polite">
            {hint}
          </p>
        </div>
        {plan.collapsibleInspectors ? (
          <button
            type="button"
            className="min-h-11 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700"
            onClick={() => setCoachOpen((v) => !v)}
            aria-expanded={coachOpen}
          >
            {coachOpen ? "Hide context" : "Show context"}
          </button>
        ) : null}
      </div>

      {showSearch && plan.renderPackCards ? (
        <label className="block text-xs text-zinc-600">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Packs, categories…"
            className={`mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 ${
              plan.touchOptimized ? "min-h-12" : "min-h-10"
            }`}
          />
        </label>
      ) : null}

      {showGlobe ? (
        <div className={plan.mode === "COMPACT_TABLET" ? "py-2" : "py-4"}>
          <StudioDirectorCreativeGlobe
            plan={plan}
            packs={packs}
            selectedId={selectedId}
            productMode={productMode}
            onSelect={onSelect}
            linkMode={linkMode}
          />
        </div>
      ) : null}

      {(cardsPrimary || plan.renderPackCards) && (
        <section className="space-y-2" aria-label="Experience pack cards">
          {!showGlobe ? (
            <p className="text-sm text-zinc-600">
              Choose a pack to continue. Creative Director runs the same plan on every device.
            </p>
          ) : plan.mode === "COMPACT_TABLET" ? (
            <p className="text-xs text-zinc-500">Or pick from the list</p>
          ) : null}
          <StudioDirectorPackCards
            plan={plan}
            packs={packs}
            selectedId={selectedId}
            productMode={productMode}
            onSelect={onSelect}
            linkMode={linkMode}
            search={search}
          />
        </section>
      )}

      {coachOpen ? (
        <aside
          className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 text-sm text-zinc-700"
          aria-label="Director context"
        >
          <p className="font-semibold text-zinc-900">Same architecture everywhere</p>
          <p className="mt-1 text-xs text-zinc-600">
            Continuity → Prompt Matrix → Creative Director → Provider Transform → Generation. Only
            this presentation adapts to your workspace.
          </p>
        </aside>
      ) : null}
    </div>
  );
}
