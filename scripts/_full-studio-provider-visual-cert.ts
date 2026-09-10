/**
 * FULL_STUDIO_CERT closeout — budgeted real OpenAI visual probes via Studio transform routers.
 * Caps: 4 OpenAI image edits max. No unbounded retries.
 *
 * Run: npx tsx scripts/_full-studio-provider-visual-cert.ts
 */
import { config as loadEnv } from "dotenv";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { put } from "@vercel/blob";
import {
  fetchOpenAiImageEdits,
  resolveOpenAiImageEditModel,
  openAiImageEditSupportsMultiReference,
  type OpenAiImageEditReferenceImage,
} from "../src/lib/openai-image-generation";
import { routeImageTransformation } from "../src/lib/studio-image-transformation-router";
import { mapFusionWizardToTransformationIntent } from "../src/lib/studio-image-transformation-map";
import {
  assessClothingTransformationQa,
  resolveClothingTransformationRoute,
} from "../src/lib/studio-clothing-transformation-runtime";
import {
  assessSceneRerenderQa,
  resolveSceneRerenderRoute,
} from "../src/lib/studio-scene-rerender-runtime";
import {
  mapProductLogoPayloadToIntent,
  buildProductLogoExecutionRecord,
} from "../src/lib/studio-product-logo-transformation-runtime";
import type { FusionRenderPayload } from "../src/types/editor-fusion-intelligence";

loadEnv({ path: ".env" });

const OUT = join("docs/audits/full-studio-cert/provider-visual");
const FIX = join("docs/audits/px4a7-prod-cert/fixtures");
const CAP_OPENAI_IMAGE = 4;
let openaiImageCalls = 0;

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function outfitPayload(personUrl: string, outfitUrl: string): FusionRenderPayload {
  return {
    blueprint: {
      id: "bp-outfit",
      workflowType: "outfit_from_reference",
      createdAt: new Date().toISOString(),
      references: [],
      traitAssignments: {},
      renderInstructions: [],
      preservationRules: ["face", "identity"],
      styleNotes: [],
    },
    styleDNA: [],
    referenceAnalysis: [
      {
        referenceId: "ref-outfit",
        assetId: "asset-outfit",
        imageUrl: outfitUrl,
        role: "outfit",
        roleId: "outfit",
        name: "Outfit",
        analysisVersion: 1,
        analyzedAt: new Date().toISOString(),
        parts: [],
        clothing: ["jacket"],
        accessories: [],
        colors: [],
        identityTraits: [],
        confidence: 0.9,
        premiumCached: true,
      },
      {
        referenceId: "ref-person",
        assetId: "asset-person",
        imageUrl: personUrl,
        role: "person",
        roleId: "person",
        name: "Person",
        analysisVersion: 1,
        analyzedAt: new Date().toISOString(),
        parts: [],
        clothing: [],
        accessories: [],
        colors: [],
        identityTraits: [],
        confidence: 0.9,
        premiumCached: true,
      },
    ],
    renderInstructions: ["Transfer outfit"],
    references: [{ referenceId: "ref-outfit", role: "outfit", url: outfitUrl, name: "Outfit" }],
    logoAssets: [],
    primaryImageUrl: personUrl,
  };
}

function productLogoPayload(
  personUrl: string,
  productUrl: string,
  logoUrl: string
): FusionRenderPayload {
  return {
    blueprint: {
      id: "bp-product",
      workflowType: "product_in_scene",
      createdAt: new Date().toISOString(),
      references: [],
      traitAssignments: {},
      renderInstructions: [],
      preservationRules: ["product", "logo"],
      styleNotes: [],
    },
    styleDNA: [],
    referenceAnalysis: [],
    renderInstructions: ["Preserve product and logo"],
    references: [
      { referenceId: "ref-product", role: "product", url: productUrl, name: "Product" },
      { referenceId: "ref-logo", role: "logo", url: logoUrl, name: "Logo", isLogo: true },
    ],
    logoAssets: [{ referenceId: "ref-logo", role: "logo", url: logoUrl, name: "Logo", isLogo: true }],
    primaryImageUrl: personUrl,
  };
}

async function uploadFixture(localName: string, key: string): Promise<string> {
  const buf = readFileSync(join(FIX, localName));
  const res = await put(`full-studio-cert/${key}-${Date.now()}.png`, buf, {
    access: "public",
    token: requireEnv("BLOB_READ_WRITE_TOKEN"),
    contentType: "image/png",
  });
  return res.url;
}

async function runEdit(params: {
  label: string;
  baseUrl: string;
  prompt: string;
  refs?: Array<{ url: string; role?: string }>;
}): Promise<{ ok: boolean; model: string; url?: string; error?: string; calls: number }> {
  if (openaiImageCalls >= CAP_OPENAI_IMAGE) {
    return { ok: false, model: "", error: "CALL_BUDGET_EXCEEDED", calls: openaiImageCalls };
  }
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = resolveOpenAiImageEditModel();
  const baseBuf = Buffer.from(await (await fetch(params.baseUrl)).arrayBuffer());
  const additionalImages: OpenAiImageEditReferenceImage[] = [];
  if (params.refs?.length && openAiImageEditSupportsMultiReference(model)) {
    for (const ref of params.refs.slice(0, 2)) {
      additionalImages.push({
        buffer: Buffer.from(await (await fetch(ref.url)).arrayBuffer()),
        role: ref.role === "logo" ? "logo" : "reference",
        filename: `${ref.role ?? "ref"}.png`,
      });
    }
  }
  openaiImageCalls += 1;
  const res = await fetchOpenAiImageEdits({
    apiKey,
    edit: {
      model,
      prompt: params.prompt.slice(0, 3200),
      imageBuffer: baseBuf,
      additionalImages: additionalImages.length ? additionalImages : undefined,
      size: "1024x1024",
      n: 1,
      inputFidelity: "high",
    },
    logContext: { helperPath: "full-studio-provider-visual-cert", route: params.label },
  });
  const raw = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      model,
      error: `HTTP ${res.status}: ${raw.slice(0, 400)}`,
      calls: openaiImageCalls,
    };
  }
  let parsed: { data?: Array<{ b64_json?: string; url?: string }> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, model, error: "JSON_PARSE", calls: openaiImageCalls };
  }
  const item = parsed.data?.[0];
  let outUrl = item?.url;
  if (!outUrl && item?.b64_json) {
    const buf = Buffer.from(item.b64_json, "base64");
    const uploaded = await put(`full-studio-cert/out-${params.label}-${Date.now()}.png`, buf, {
      access: "public",
      token: requireEnv("BLOB_READ_WRITE_TOKEN"),
      contentType: "image/png",
    });
    outUrl = uploaded.url;
    writeFileSync(join(OUT, `${params.label}.png`), buf);
  }
  return { ok: Boolean(outUrl), model, url: outUrl, calls: openaiImageCalls };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    caps: { openaiImage: CAP_OPENAI_IMAGE },
    probes: {} as Record<string, unknown>,
  };

  const personUrl = await uploadFixture("px4a7-photo-red.png", "person-a");
  const outfitUrl = await uploadFixture("px4a7-photo-blue.png", "outfit-b");
  const locationUrl = await uploadFixture("px4a7-photo-green.png", "location-1");
  const productUrl = await uploadFixture("px4a7-photo-orange.png", "product-1");
  const logoUrl = await uploadFixture("px4a7-photo-purple.png", "logo-1");

  // D OUTFIT
  {
    const payload = outfitPayload(personUrl, outfitUrl);
    const { intent, plan, trace } = resolveClothingTransformationRoute({
      workflowType: "outfit_from_reference",
      primaryImageUrl: personUrl,
      payload,
    });
    const edit = await runEdit({
      label: "D-outfit",
      baseUrl: personUrl,
      refs: [{ url: outfitUrl, role: "outfit" }],
      prompt:
        "Edit BASE person only. Transfer clothing appearance from the outfit reference. Keep the same face, hair, skin tone, and body. Do not transfer the outfit donor face or background.",
    });
    const qa = assessClothingTransformationQa({
      maskStatus: "MASK_UNAVAILABLE",
      providerSucceeded: edit.ok,
      plan: { ...plan, actualRoute: plan.actualRoute ?? "MULTI_REFERENCE_EDIT" },
    });
    (report.probes as Record<string, unknown>).outfit = {
      inputRoles: { BASE: "person-a", CLOTHING_REFERENCE: "outfit-b" },
      requestedRoute: plan.requestedRoute,
      actualRoute: plan.actualRoute,
      maskUsed: false,
      maskNote: "MASK_UNAVAILABLE → Fusion/multi-ref fallback (explicit)",
      providerModel: edit.model,
      providerCallCount: 1,
      outputImage: edit.url ?? null,
      error: edit.error ?? null,
      qa,
      humanVerdict: edit.ok ? "ROUTE_OK_NEEDS_HUMAN_IDENTITY_REVIEW" : "FAILED_PROVIDER",
      classification: edit.ok ? "PROVIDER_CALL_OK" : "PROVIDER_OR_BUDGET_FAIL",
      traceRoles: intent.references.map((r) => r.role),
      origin: trace.origin,
    };
  }

  // E LOCATION
  {
    const intent = mapFusionWizardToTransformationIntent({
      intentId: "person_background",
      slots: [
        { slotId: "person", role: "person", url: personUrl, assetId: "person", required: true },
        { slotId: "loc", role: "location", url: locationUrl, assetId: "loc", required: true },
      ],
      baseSlotId: "person",
      origin: "FUSION_WIZARD",
    });
    const { plan } = routeImageTransformation(intent);
    const edit = await runEdit({
      label: "E-location",
      baseUrl: personUrl,
      refs: [{ url: locationUrl, role: "location" }],
      prompt:
        "Keep the same person from BASE (face, clothing, body). Change only the environment/background to match the location reference. Do not merge or replace the subject with people from the location reference.",
    });
    const qa = assessSceneRerenderQa({
      maskStatus: "MASK_UNAVAILABLE",
      providerSucceeded: edit.ok,
      plan: { ...plan, actualRoute: plan.actualRoute ?? plan.requestedRoute },
      usedApprovedBase: true,
    });
    (report.probes as Record<string, unknown>).location = {
      inputRoles: { BASE: "person-a", LOCATION_REFERENCE: "location-1" },
      requestedRoute: plan.requestedRoute,
      actualRoute: plan.actualRoute,
      maskUsed: false,
      providerModel: edit.model,
      providerCallCount: 1,
      outputImage: edit.url ?? null,
      error: edit.error ?? null,
      qa,
      humanVerdict: edit.ok ? "ROUTE_OK_NEEDS_HUMAN_IDENTITY_REVIEW" : "FAILED_PROVIDER",
      classification: edit.ok ? "PROVIDER_CALL_OK" : "PROVIDER_OR_BUDGET_FAIL",
    };
  }

  // PRODUCT / LOGO
  {
    const payload = productLogoPayload(personUrl, productUrl, logoUrl);
    const intent = mapProductLogoPayloadToIntent({
      workflowType: "product_in_scene",
      primaryImageUrl: personUrl,
      payload,
    });
    const { plan, trace } = routeImageTransformation(intent);
    const edit = await runEdit({
      label: "product-logo",
      baseUrl: personUrl,
      refs: [
        { url: productUrl, role: "product" },
        { url: logoUrl, role: "logo" },
      ],
      prompt:
        "Compose a commercial scene with the BASE subject showing the PRODUCT reference. Preserve distinctive product packaging. LOGO must remain exact and readable. MUST_PRESERVE product and logo.",
    });
    const record = buildProductLogoExecutionRecord({
      intent,
      plan,
      trace,
      providerModel: edit.model,
      providerCallCount: 1,
      postCompositeCallCount: 0,
      pixelCompositeApplied: false,
    });
    (report.probes as Record<string, unknown>).productLogo = {
      inputRoles: { BASE: "person-a", PRODUCT: "product-1", LOGO: "logo-1" },
      requestedRoute: plan.requestedRoute,
      actualRoute: plan.actualRoute,
      exactness: intent.exactnessRequirements,
      providerModel: edit.model,
      providerCallCount: 1,
      outputImage: edit.url ?? null,
      error: edit.error ?? null,
      executionQa: record.transformQa,
      humanVerdict: edit.ok ? "ROUTE_OK_NEEDS_HUMAN_PRODUCT_REVIEW" : "FAILED_PROVIDER",
      classification: edit.ok ? "PROVIDER_CALL_OK" : "PROVIDER_OR_BUDGET_FAIL",
      note: "Pixel post-composite not exercised in this probe (requires Fusion brand-lock pipeline).",
    };
  }

  // IDENTITY RERENDER
  {
    const { intent, plan } = resolveSceneRerenderRoute({
      approvedStill: {
        id: "approved-s5",
        url: personUrl,
        generationVersion: 1,
        promptVersion: 1,
      },
      changeTargets: ["lighting"],
      correctionText: "Slightly warmer cinematic lighting only; keep identity and outfit identical.",
      sceneId: "scene-5",
    });
    const edit = await runEdit({
      label: "identity-rerender-s5",
      baseUrl: personUrl,
      prompt:
        "BASE_IMAGE_EDIT: Use the approved scene still as BASE. Change only lighting to slightly warmer cinematic. Preserve face, hair, age impression, skin tone, clothing, and composition. Do not invent a new person.",
    });
    const qa = assessSceneRerenderQa({
      maskStatus: "MASK_UNAVAILABLE",
      providerSucceeded: edit.ok,
      plan: { ...plan, actualRoute: plan.actualRoute ?? "BASE_IMAGE_EDIT" },
      usedApprovedBase: true,
    });
    (report.probes as Record<string, unknown>).identityRerender = {
      inputRoles: { BASE: "approved-scene-still", change: "lighting" },
      requestedRoute: plan.requestedRoute,
      actualRoute: plan.actualRoute ?? "BASE_IMAGE_EDIT",
      usedApprovedBase: true,
      providerModel: edit.model,
      providerCallCount: 1,
      outputImage: edit.url ?? null,
      error: edit.error ?? null,
      qa,
      intentId: intent.intentId,
      humanVerdict: edit.ok ? "ROUTE_OK_NEEDS_HUMAN_IDENTITY_REVIEW" : "FAILED_PROVIDER",
      classification: edit.ok ? "PROVIDER_CALL_OK" : "PROVIDER_OR_BUDGET_FAIL",
    };
  }

  const probes = report.probes as Record<string, { error?: string | null; outputImage?: string | null }>;
  const allOk = Object.values(probes).every((p) => p.outputImage && !p.error);
  report.actualCalls = { openaiImage: openaiImageCalls };
  report.finishedAt = new Date().toISOString();
  report.verdict = allOk
    ? "PROVIDER_VISUAL_PROBES_EXECUTED"
    : "PROVIDER_VISUAL_PARTIAL_OR_FAILED";

  writeFileSync(join(OUT, "PROVIDER-VISUAL-CERT.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
