import type { EditorReferenceAssignment, EditorReferenceMetadata } from "@/types/editor-reference-metadata";

const VIEW_PHRASE: Record<string, string> = {
  front: "front view",
  back: "back view",
  left_side: "left side view",
  right_side: "right side view",
  three_quarter: "three-quarter view",
  detail: "detail view",
  full_body: "full body view",
  portrait: "portrait view",
};

function metadataLine(meta: EditorReferenceMetadata, roleLabel: string): string | null {
  const parts: string[] = [];
  if (meta.view) {
    parts.push(VIEW_PHRASE[meta.view] ?? meta.view);
  }
  if (meta.clothingType) {
    parts.push(meta.clothingType.replace(/_/g, " "));
  }
  if (meta.familyType) {
    parts.push(meta.familyType.replace(/_/g, " "));
  }
  if (meta.animalType) {
    parts.push(meta.animalType);
  }
  if (meta.notes?.trim()) {
    parts.push(meta.notes.trim());
  }
  if (parts.length === 0) {
    return null;
  }
  return `Use ${roleLabel} (${parts.join(", ")}) in generation.`;
}

export function buildReferenceMetadataPromptLines(assignments: EditorReferenceAssignment[]): string[] {
  const lines: string[] = [];
  for (const assignment of assignments) {
    if (!assignment.metadata) {
      continue;
    }
    const roleLabel = assignment.metadata.role ?? assignment.role;
    const line = metadataLine(assignment.metadata, roleLabel);
    if (line) {
      lines.push(`- ${line}`);
    }
  }

  const familyRefs = assignments.filter((a) => a.metadata?.familyType);
  if (familyRefs.length >= 1) {
    lines.push("- Use maternal and paternal aging references when available.");
  }
  if (familyRefs.length >= 2) {
    lines.push("- Use family references to infer aging and identity features.");
  }
  if (familyRefs.length >= 3) {
    lines.push("- Use extended family references for aging estimation.");
  }

  const clothingByType = new Map<string, EditorReferenceAssignment[]>();
  for (const assignment of assignments) {
    if (!assignment.metadata?.clothingType) {
      continue;
    }
    const key = assignment.metadata.clothingType;
    clothingByType.set(key, [...(clothingByType.get(key) ?? []), assignment]);
  }
  if (clothingByType.size >= 2) {
    lines.push("- Create one complete outfit using all uploaded clothing references.");
    for (const [type, items] of clothingByType.entries()) {
      const views = items.map((i) => i.metadata?.view).filter(Boolean);
      lines.push(`- Use ${type.replace(/_/g, " ")} reference${items.length > 1 ? "s" : ""}${views.length ? ` (${views.join(", ")})` : ""} for outfit reconstruction.`);
    }
  } else if (assignments.filter((a) => a.role === "outfit" || a.metadata?.clothingType).length >= 2) {
    lines.push("- Use outfit front and back references to reconstruct the clothing.");
  }

  const animalSide = assignments.find(
    (a) => a.metadata?.animalType && (a.metadata.view === "left_side" || a.metadata.view === "right_side")
  );
  if (animalSide) {
    lines.push("- Use animal side view for body silhouette.");
  }

  const personFront = assignments.find(
    (a) => (a.role === "person" || a.role === "character") && a.metadata?.view === "front"
  );
  if (personFront) {
    lines.push("- Use the person front view for facial identity.");
  }

  return [...new Set(lines)];
}
