"use client";

import { confidenceTierLabel } from "@/lib/vision-target-highlight";
import type { VisionTargetPickerAuditCard } from "@/types/vision-target-picker";

type Props = {
  card: VisionTargetPickerAuditCard;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 border-b border-zinc-100 py-2 text-xs last:border-0">
      <span className="font-medium text-zinc-500">{label}</span>
      <span className="text-zinc-800">{value}</span>
    </div>
  );
}

export function EditorVisionTargetPickerAuditPanel({ card }: Props) {
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
      data-testid="vision-target-picker-audit"
    >
      <h3 className="text-sm font-semibold text-zinc-900">Vision Target Picker Audit</h3>
      <div className="mt-2">
        <Row label="Source" value={card.source} />
        <Row label="Polygon" value={card.polygon ? "yes" : "no"} />
        <Row label="Mask" value={card.mask ? "yes" : "no"} />
        <Row label="Quad" value={card.quad ? "yes" : "no"} />
        <Row label="Target" value={card.targetLabel} />
        <Row label="Confidence" value={confidenceTierLabel(card.confidenceTier).replace("● ", "")} />
        <Row label="Branding Eligible" value={card.brandingEligible ? "Ja" : "Nee"} />
        <Row label="Motion Eligible" value={card.motionEligible ? "Ja" : "Nee"} />
      </div>
    </div>
  );
}
