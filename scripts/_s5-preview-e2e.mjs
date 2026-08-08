/**
 * S.5 Preview certification — creative projects + library APIs via vercel curl.
 */
import { execFileSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";

const BASE =
  process.env.S5_PREVIEW_BASE ||
  process.env.S4_PREVIEW_BASE ||
  "";
const EMAIL = "s1.cert.1786212478@example.com";
const PASS = "S1CertPass2026!";
const COOKIE = "/tmp/s5-e2e-cookies.txt";

if (!BASE) {
  console.error("Set S5_PREVIEW_BASE to the Preview deployment URL.");
  process.exit(1);
}

const results = {};
function note(k, v) {
  results[k] = v;
  console.log(`${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
}

function api(method, path, { body } = {}) {
  const bodyFile = `/tmp/s5-api-body-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  const curl = ["-sS", "-X", method, "-b", COOKIE, "-c", COOKIE, "-o", bodyFile, "-w", "%{http_code}"];
  if (body !== undefined) {
    curl.push("-H", "content-type: application/json", "-d", JSON.stringify(body));
  }
  const statusRaw = execFileSync("npx", ["vercel", "curl", `${BASE}${path}`, "--", ...curl], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const status = Number(statusRaw.match(/(\d{3})$/)?.[1] || statusRaw);
  let json = null;
  let bodyText = "";
  try {
    bodyText = readFileSync(bodyFile, "utf8");
    json = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    json = { raw: bodyText.slice(0, 800) };
  }
  try {
    unlinkSync(bodyFile);
  } catch {
    /* ignore */
  }
  return { status, json };
}

function ok(status) {
  return status >= 200 && status < 300;
}

function main() {
  note("preview.base", BASE);
  const login = api("POST", "/api/auth/login", { body: { email: EMAIL, password: PASS } });
  note("login.status", login.status);
  if (login.status !== 200) throw new Error("login failed");

  const stamp = Date.now();
  const project = api("POST", "/api/studio/creative-projects", {
    body: { title: `S5 Cert ${stamp}`, description: "Preview cert", tags: ["cert", "s5"] },
  });
  note("project.create.status", project.status);
  const projectId = project.json?.project?.id;
  note("project.create", ok(project.status) && projectId ? "PASS" : "FAIL");

  const pin = api("PATCH", `/api/studio/creative-projects/${projectId}`, {
    body: { pinned: true, favorite: true },
  });
  note("project.pin_favorite", ok(pin.status) && pin.json?.project?.pinned ? "PASS" : "FAIL");

  const asset = api("POST", "/api/studio/library/assets", {
    body: {
      family: "image",
      title: "Pizza cinematic still",
      description: "Restaurant TikTok campaign",
      tags: ["pizza", "tiktok", "cinematic"],
      origin: "uploaded",
      sourceKind: "cert_upload",
      sourceId: `s5-${stamp}`,
      projectId,
      promptSummary: "drone over pizza English 8 seconds",
      language: "English",
      durationSeconds: 8,
      previewUrl: "https://example.com/pizza.jpg",
    },
  });
  note("asset.create.status", asset.status);
  const assetId = asset.json?.asset?.id;
  note("asset.create", ok(asset.status) && assetId ? "PASS" : "FAIL");

  const search = api("GET", `/api/studio/library/search?q=${encodeURIComponent("pizza cinematic")}`);
  note(
    "search",
    ok(search.status) && (search.json?.assets ?? []).some((a) => a.id === assetId) ? "PASS" : "FAIL"
  );

  const fav = api("POST", "/api/studio/library/favorites", {
    body: { targetKind: "asset", targetId: assetId, favorite: true },
  });
  note("favorite", ok(fav.status) ? "PASS" : "FAIL");

  const collection = api("POST", "/api/studio/library/collections", {
    body: { name: `Restaurant Campaign ${stamp}`, projectId },
  });
  const collectionId = collection.json?.collection?.id;
  const addMember = api("POST", "/api/studio/library/collections", {
    body: { op: "add_member", collectionId, assetId },
  });
  note(
    "collection",
    ok(collection.status) && ok(addMember.status) ? "PASS" : "FAIL"
  );

  const version = api("POST", `/api/studio/library/assets/${assetId}/versions`, {
    body: { label: "v2", previewUrl: "https://example.com/pizza-v2.jpg", promptSummary: "revised" },
  });
  note("version", ok(version.status) && version.json?.versionNumber >= 1 ? "PASS" : "FAIL");

  const brand = api("POST", "/api/studio/library/brand-kits", {
    body: {
      name: `HomeCheff Kit ${stamp}`,
      projectId,
      kit: { colors: ["#006D52"], website: "https://homecheff.eu" },
    },
  });
  note("brand_kit", ok(brand.status) ? "PASS" : "FAIL");

  const preset = api("POST", "/api/studio/library/prompt-presets", {
    body: {
      name: `Preset ${stamp}`,
      scope: "project",
      projectId,
      preset: { prompt: "cinematic food hero" },
      tags: ["food"],
    },
  });
  note("prompt_preset", ok(preset.status) ? "PASS" : "FAIL");

  const usage = api("POST", `/api/studio/library/assets/${assetId}/usage`, {
    body: { entityType: "storyboard", entityId: "cmskskf4w0001l404364pt91q", entityName: "Cert SB" },
  });
  note("usage", ok(usage.status) ? "PASS" : "FAIL");

  const delBlocked = api("POST", `/api/studio/library/assets/${assetId}/delete`);
  note(
    "safe_delete_warn",
    delBlocked.status === 409 && delBlocked.json?.code === "has_dependencies" ? "PASS" : "FAIL"
  );

  const archive = api("PATCH", `/api/studio/library/assets/${assetId}`, { body: { status: "archived" } });
  note("archive", ok(archive.status) && archive.json?.asset?.status === "archived" ? "PASS" : "FAIL");

  const restore = api("PATCH", `/api/studio/library/assets/${assetId}`, { body: { status: "active" } });
  note("restore", ok(restore.status) && restore.json?.asset?.status === "active" ? "PASS" : "FAIL");

  const sync = api("POST", "/api/studio/library/sync");
  note("sync", ok(sync.status) ? "PASS" : "FAIL");

  const gates = [
    "project.create",
    "project.pin_favorite",
    "asset.create",
    "search",
    "favorite",
    "collection",
    "version",
    "brand_kit",
    "prompt_preset",
    "usage",
    "safe_delete_warn",
    "archive",
    "restore",
    "sync",
  ];
  const failed = gates.filter((g) => results[g] !== "PASS");
  note("preview.gate", failed.length === 0 ? "GREEN" : "RED");
  note("preview.failed", failed);
  if (failed.length) process.exit(1);
}

main();
