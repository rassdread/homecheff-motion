/**
 * Recovery probes after image[] hotfix + generated person fixtures.
 * Cap: 5 generations + 3 edits = 8 OpenAI image calls.
 */
import { config as loadEnv } from "dotenv";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { put } from "@vercel/blob";
import {
  fetchOpenAiImageEdits,
  fetchOpenAiImageGenerations,
  resolveOpenAiImageEditModel,
  openAiImageEditSupportsMultiReference,
  buildOpenAiImageGenerationsBody,
} from "../src/lib/openai-image-generation";

loadEnv({ path: ".env" });

const OUT = join("docs/audits/full-studio-cert/provider-visual");
mkdirSync(OUT, { recursive: true });

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function gen(prompt: string, name: string): Promise<string> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = resolveOpenAiImageEditModel();
  const body = buildOpenAiImageGenerationsBody({
    model,
    prompt,
    size: "1024x1024",
    n: 1,
  });
  const res = await fetchOpenAiImageGenerations({
    apiKey,
    body,
    logContext: { helperPath: "cert-gen-v2", route: name },
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`${name}: ${raw.slice(0, 400)}`);
  const j = JSON.parse(raw) as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = j.data?.[0];
  const buf = item?.b64_json
    ? Buffer.from(item.b64_json, "base64")
    : Buffer.from(await (await fetch(item!.url!)).arrayBuffer());
  writeFileSync(join(OUT, `${name}.png`), buf);
  const up = await put(`full-studio-cert/${name}-${Date.now()}.png`, buf, {
    access: "public",
    token: requireEnv("BLOB_READ_WRITE_TOKEN"),
    contentType: "image/png",
  });
  return up.url;
}

async function edit(
  label: string,
  base: string,
  refs: string[],
  prompt: string
): Promise<{ ok: boolean; url?: string; error?: string; model: string }> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = resolveOpenAiImageEditModel();
  const baseBuf = Buffer.from(await (await fetch(base)).arrayBuffer());
  const additional = [];
  for (const u of refs) {
    additional.push({
      buffer: Buffer.from(await (await fetch(u)).arrayBuffer()),
      role: "reference" as const,
      filename: "ref.png",
    });
  }
  const res = await fetchOpenAiImageEdits({
    apiKey,
    edit: {
      model,
      prompt,
      imageBuffer: baseBuf,
      additionalImages: additional.length ? additional : undefined,
      size: "1024x1024",
      n: 1,
      inputFidelity: "high",
    },
    logContext: { helperPath: "cert-edit-v2", route: label },
  });
  const raw = await res.text();
  if (!res.ok) return { ok: false, error: raw.slice(0, 400), model };
  const j = JSON.parse(raw) as { data?: Array<{ b64_json?: string }> };
  const buf = Buffer.from(j.data![0]!.b64_json!, "base64");
  writeFileSync(join(OUT, `${label}.png`), buf);
  const up = await put(`full-studio-cert/out-${label}-${Date.now()}.png`, buf, {
    access: "public",
    token: requireEnv("BLOB_READ_WRITE_TOKEN"),
    contentType: "image/png",
  });
  return {
    ok: true,
    url: up.url,
    model,
  };
}

async function main() {
  const person = await gen(
    "Photorealistic portrait of a 35-year-old woman with short dark curly hair, warm medium skin tone, wearing a plain white t-shirt, neutral studio background, facing camera, natural light",
    "person-a-gen"
  );
  const outfit = await gen(
    "Photorealistic fashion photo focused on clothing: bright red blazer and black trousers on a clean backdrop, clothing clearly visible, no recognizable face in frame",
    "outfit-b-gen"
  );
  const location = await gen(
    "Empty elegant red carpet venue with golden lights and marble floor, no people in frame, wide establishing shot",
    "location-1-gen"
  );
  const product = await gen(
    "Studio product photo of a distinctive orange juice bottle with a clear label shape, centered, white background",
    "product-1-gen"
  );
  const logo = await gen(
    "Simple flat logo mark: bold navy letters HC inside a circle on white background, crisp vector-like",
    "logo-1-gen"
  );

  const outfitOut = await edit(
    "D-outfit-v2",
    person,
    [outfit],
    "Edit BASE person only. Transfer the red blazer/black trousers clothing from the outfit reference onto the BASE woman. Keep the same face, hair, skin tone, and body. Do not transfer the outfit donor face or background."
  );
  const locOut = await edit(
    "E-location-v2",
    person,
    [location],
    "Keep the same woman from BASE (face, clothing, body). Change only the background/environment to the red carpet venue reference. Do not add people from the location."
  );
  const prodOut = await edit(
    "product-logo-v2",
    person,
    [product, logo],
    "Compose a commercial scene: BASE woman holding the orange juice bottle product. Preserve bottle shape. Place the HC logo clearly and exactly readable."
  );

  const report = {
    multiRefFormField: "image[]",
    supportsMulti: openAiImageEditSupportsMultiReference(resolveOpenAiImageEditModel()),
    inputs: { person, outfit, location, product, logo },
    probes: { outfitOut, locOut, prodOut },
    finishedAt: new Date().toISOString(),
    verdict:
      outfitOut.ok && locOut.ok && prodOut.ok
        ? "PROVIDER_VISUAL_MULTI_REF_EXECUTED"
        : "PROVIDER_VISUAL_PARTIAL_OR_FAILED",
  };
  writeFileSync(join(OUT, "PROVIDER-VISUAL-CERT-v2.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
