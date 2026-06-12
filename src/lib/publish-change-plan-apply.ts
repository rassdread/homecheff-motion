import type { PublishAiProposal } from "@/lib/publish-ai-assistant";
import type { PublishChangePlan, PublishTextSegmentPlan } from "@/lib/publish-change-plan";
import type { PublishSafeZoneId } from "@/lib/publish-safe-zone-v2";
import { zoneToOverlayPosition } from "@/lib/publish-safe-zone-v2";
import type { PublishProject } from "@/types/publish-overlay";
import { addPublishOverlay, patchPublishOverlay } from "@/lib/publish-overlay-timeline";

export function proposalToChangePlan(
  projectId: string,
  proposal: PublishAiProposal,
  acceptance: Record<string, boolean>
): PublishChangePlan {
  const segments: PublishTextSegmentPlan[] = [];

  if (acceptance.overlays !== false || acceptance.title !== false || acceptance.cta !== false) {
    const sceneOverlays =
      proposal.scenes?.length
        ? proposal.scenes.map((s) => ({
            id: s.id,
            text: s.overlayText,
            type: s.title.toLowerCase().includes("cta") ? "cta" as const : s.index === 1 ? "title" as const : "text" as const,
            zoneHint: s.zoneId,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        : proposal.overlayTexts.map((item) => ({ ...item, startTime: 0, endTime: 999 }));

    for (const item of sceneOverlays) {
      if (item.id === "prop_title" && acceptance.title === false) continue;
      if (item.id === "prop_cta" && acceptance.cta === false) continue;
      if (item.type !== "title" && item.type !== "cta" && acceptance.overlays === false) continue;
      segments.push({
        id: item.id,
        startTime: item.startTime,
        endTime: item.endTime,
        originalText: "",
        proposedText: item.text,
        acceptedText: item.text,
        zoneId: item.zoneHint,
      });
    }
  }

  if (acceptance.subtitles !== false) {
    const subs =
      proposal.scenes?.length
        ? proposal.scenes.map((s) => ({
            id: `sub_${s.id}`,
            text: s.voiceLine,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        : proposal.subtitles;
    for (const sub of subs) {
      if (!sub.text.trim()) continue;
      segments.push({
        id: sub.id,
        startTime: sub.startTime,
        endTime: sub.endTime,
        originalText: "",
        proposedText: sub.text,
        acceptedText: sub.text,
      });
    }
  }

  if (acceptance.voice && proposal.voiceOverScript) {
    segments.push({
      id: "voice_script",
      startTime: 0,
      endTime: 0,
      originalText: "",
      proposedText: proposal.voiceOverScript,
      acceptedText: proposal.voiceOverScript,
    });
  }

  return {
    projectId,
    segments,
    pendingRender: segments.length > 0,
    lastEditedAt: new Date().toISOString(),
  };
}

export function applyChangePlanToPublishProject(
  project: PublishProject,
  plan: PublishChangePlan,
  options: { orientation?: "portrait" | "landscape" } = {}
): PublishProject {
  let next = { ...project, overlays: [...project.overlays] };

  for (const segment of plan.segments) {
    if (segment.id.startsWith("sub_")) continue;
    if (!segment.acceptedText.trim()) continue;

    const zone = segment.zoneId as PublishSafeZoneId | undefined;
    const pos = zone ? zoneToOverlayPosition(zone, options.orientation ?? "portrait") : { x: 0.1, y: 0.1 };

    const overlayType = segment.id.includes("cta") ? "cta" : segment.id.includes("title") ? "title" : "text";
    const existing = next.overlays.find((o) => o.id === segment.id);
    if (existing) {
      next = patchPublishOverlay(next, segment.id, {
        text: segment.acceptedText,
        x: pos.x,
        y: pos.y,
        startTime: segment.startTime,
        endTime: segment.endTime,
      });
    } else {
      next = addPublishOverlay(next, overlayType);
      const added = next.overlays[next.overlays.length - 1];
      if (added) {
        next = patchPublishOverlay(next, added.id, {
          text: segment.acceptedText,
          x: pos.x,
          y: pos.y,
          startTime: segment.startTime,
          endTime: segment.endTime,
        });
      }
    }
  }

  if (plan.segments.find((s) => s.id === "prop_title")?.acceptedText) {
    next.name = plan.segments.find((s) => s.id === "prop_title")!.acceptedText;
  }

  return next;
}

export function loadPublishChangePlanFromMetadata(project: PublishProject): PublishChangePlan | null {
  const raw = project.metadata?.changePlan;
  if (!raw || typeof raw !== "object") return null;
  return raw as PublishChangePlan;
}

export function savePublishChangePlanToMetadata(
  project: PublishProject,
  plan: PublishChangePlan
): PublishProject {
  return {
    ...project,
    metadata: { ...project.metadata, changePlan: plan },
    updatedAt: new Date().toISOString(),
  };
}
