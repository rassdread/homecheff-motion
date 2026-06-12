import { buildGenerationPackageFromDocument } from "@/lib/editor-generation-package";
import { createHomeCheffProjectId, defaultProjectPermissions } from "@/lib/homecheff-project-package-core";
import {
  HOMECHEFF_PACKAGE_VERSION,
  type HomeCheffAssetReference,
  type HomeCheffProjectPackage,
  type HomeCheffShareMode,
} from "@/types/homecheff-project-package";
import type { EditorGenerationPackage } from "@/types/editor-generation-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function assetFromUrl(input: {
  id: string;
  url: string;
  kind: string;
  role?: string;
  mimeType?: string;
  storageKey?: string;
}): HomeCheffAssetReference {
  return {
    id: input.id,
    url: input.url,
    kind: input.kind,
    role: input.role,
    mimeType: input.mimeType,
    storageKey: input.storageKey,
    sourceService: "editor",
    createdAt: new Date().toISOString(),
    accessScope: "project",
  };
}

export function collectAssetsFromGenerationPackage(pkg: EditorGenerationPackage): HomeCheffAssetReference[] {
  const assets: HomeCheffAssetReference[] = [];
  const push = (id: string, url: string, kind: string, role?: string) => {
    if (!url) return;
    assets.push(assetFromUrl({ id, url, kind, role }));
  };

  for (const ref of pkg.sourceReferences) {
    push(`ref_${ref.instanceId}`, ref.url, "source_reference", ref.roleId);
  }
  for (const img of pkg.generatedImages) {
    push(`gen_${img.id}`, img.url, img.kind, img.label);
  }
  for (const frame of pkg.sequenceFrames) {
    push(`seq_${frame.id}`, frame.url, frame.kind, `step_${frame.stepIndex ?? 0}`);
  }
  for (const video of pkg.motionOutputs) {
    push(`motion_${video.id}`, video.url, video.kind);
  }
  for (const thumb of pkg.thumbnails) {
    push(`thumb_${thumb.id}`, thumb.url, thumb.kind);
  }

  return assets;
}

export function buildHomeCheffProjectFromEditorDocument(input: {
  document: EditorCanvasDocument;
  title?: string;
  ownerId?: string;
  shareMode?: HomeCheffShareMode;
  existing?: HomeCheffProjectPackage;
}): HomeCheffProjectPackage {
  const now = new Date().toISOString();
  const generationPackage =
    input.document.instructionStudioState?.generationPackage ?? buildGenerationPackageFromDocument(input.document);
  const workflow =
    generationPackage.workflow ??
    input.document.instructionStudioState?.combineIntent ??
    input.document.instructionStudioState?.fusionPlan?.intent ??
    "custom_composition";

  const assetReferences = collectAssetsFromGenerationPackage(generationPackage);
  const id = input.existing?.id ?? createHomeCheffProjectId();

  return {
    id,
    version: HOMECHEFF_PACKAGE_VERSION,
    projectFormat: "hc",
    projectVersion: 1,
    projectType: "editor",
    createdAt: input.existing?.createdAt ?? now,
    updatedAt: now,
    ownerId: input.ownerId ?? input.existing?.ownerId,
    sourceService: "editor",
    title: input.title ?? input.document.name ?? "HomeCheff Project",
    description: input.existing?.description,
    permissions: defaultProjectPermissions(input.shareMode ?? input.existing?.permissions.shareMode ?? "private_backup"),
    assetReferences: dedupeAssets([...(input.existing?.assetReferences ?? []), ...assetReferences]),
    generationPackageIds: dedupeIds([
      ...(input.existing?.generationPackageIds ?? []),
      generationPackage.id,
    ]),
    workflowState: {
      workflow,
      editorSessionId: input.document.sessionId,
    },
    metadata: {
      workflow,
      editorFlowMode: input.document.editorFlowMode,
    },
    prompts: {
      ...(input.existing?.prompts ?? {}),
      editor_primary: "Structured generation with metadata-enriched prompts.",
    },
    settings: input.existing?.settings ?? {},
    handoffHistory: input.existing?.handoffHistory ?? [],
    servicePayload: {
      ...(input.existing?.servicePayload ?? {}),
      editor: {
        sessionId: input.document.sessionId,
        workflow: String(workflow),
        generationPackageIds: [generationPackage.id],
        generationPackages: [generationPackage],
        documentSnapshot: {
          sessionId: input.document.sessionId,
          name: input.document.name,
          backgroundUrl: input.document.backgroundUrl,
          instructionStudioState: input.document.instructionStudioState,
        },
        metadata: { workflow },
      },
    },
  };
}

function dedupeAssets(assets: HomeCheffAssetReference[]): HomeCheffAssetReference[] {
  const seen = new Set<string>();
  return assets.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

function dedupeIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function mergeHomeCheffProject(
  base: HomeCheffProjectPackage,
  patch: Partial<HomeCheffProjectPackage>
): HomeCheffProjectPackage {
  return {
    ...base,
    ...patch,
    updatedAt: new Date().toISOString(),
    assetReferences: patch.assetReferences ?? base.assetReferences,
    generationPackageIds: patch.generationPackageIds ?? base.generationPackageIds,
    servicePayload: {
      ...base.servicePayload,
      ...patch.servicePayload,
    },
    handoffHistory: patch.handoffHistory ?? base.handoffHistory,
    prompts: { ...base.prompts, ...patch.prompts },
    settings: { ...base.settings, ...patch.settings },
    metadata: { ...base.metadata, ...patch.metadata },
  };
}
