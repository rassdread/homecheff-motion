/**
 * Smoke-test REMBG_API_URL against the HomeCheff contract.
 *
 * Usage:
 *   REMBG_API_URL=https://host/segment npm run verify:rembg -- path/to/photo.jpg
 */

import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const endpoint = process.env.REMBG_API_URL?.trim();
  if (!endpoint) {
    console.error("REMBG_API_URL is not set.");
    process.exit(1);
  }

  const healthUrl = endpoint.replace(/\/segment\/?$/, "").replace(/\/$/, "") + "/health";
  const healthRes = await fetch(healthUrl, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!healthRes?.ok) {
    console.error(`Health check failed: GET ${healthUrl} → ${healthRes?.status ?? "network error"}`);
    process.exit(1);
  }
  const healthJson = (await healthRes.json()) as { ok?: boolean };
  console.log("health:", healthJson);

  const imageArg = process.argv[2];
  if (!imageArg) {
    console.log("Health OK. Pass an image path to verify POST /segment.");
    process.exit(0);
  }

  const body = await fs.readFile(path.resolve(imageArg));
  const segRes = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!segRes.ok) {
    const text = await segRes.text().catch(() => "");
    console.error(`Segment failed: POST ${endpoint} → ${segRes.status} ${text.slice(0, 200)}`);
    process.exit(1);
  }

  const png = Buffer.from(await segRes.arrayBuffer());
  const isPng = png.length >= 8 && png[0] === 0x89 && png[1] === 0x50;
  console.log("segment:", {
    ok: true,
    bytes: png.length,
    contentType: segRes.headers.get("content-type"),
    isPng,
  });

  if (!isPng || png.length < 100) {
    console.error("Response is not a valid PNG mask.");
    process.exit(1);
  }

  console.log("REMBG contract verification passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
