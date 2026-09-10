#!/usr/bin/env node
/**
 * Wait for iPhone Safari pages via ios_webkit_debug_proxy, then dump DOM state.
 * Requires: Web Inspector ON (iPhone Settings > Safari > Advanced > Web Inspector)
 * and at least one Safari tab open on Production.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const WebSocket = require("ws");

const OUT = path.join(__dirname, "../docs/audits/px4a7-prod-cert/iphone-webkit.json");
const PORT = Number(process.env.PX4A7_WKD_PORT || 9222);
const MAX_WAIT_MS = Number(process.env.PX4A7_WKD_WAIT_MS || 120000);

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function waitForPage() {
  const started = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    try {
      const pages = await getJson(`http://127.0.0.1:${PORT}/json`);
      const hit =
        pages.find((p) => /homecheff\.eu|studio\.homecheff\.eu/i.test(p.url || "")) ||
        pages.find((p) => p.type === "page") ||
        pages[0];
      if (hit?.webSocketDebuggerUrl) return hit;
    } catch {
      /* proxy not ready */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`No inspectable Safari page on port ${PORT} within ${MAX_WAIT_MS}ms`);
}

function cdp(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1e9);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`CDP timeout ${method}`)), 15000);
    const onMsg = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id === id) {
        clearTimeout(timer);
        ws.off("message", onMsg);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.on("message", onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const page = await waitForPage();
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.once("open", res);
    ws.once("error", rej);
  });
  await cdp(ws, "Runtime.enable");
  await cdp(ws, "Page.enable");
  const evalResult = await cdp(ws, "Runtime.evaluate", {
    expression: `({
      url: location.href,
      title: document.title,
      ua: navigator.userAgent,
      canvas: document.querySelectorAll('canvas').length,
      strip: document.querySelectorAll('[data-testid^="px4a-photo-"]').length,
      toolbar: !!document.querySelector('[data-testid="px4a-edit-toolbar"]'),
      trim: !!document.querySelector('[data-testid="px4a-video-trim"]'),
      audio: !!document.querySelector('[data-testid="px4a-video-audio"]'),
    })`,
    returnByValue: true,
  });
  const out = {
    at: new Date().toISOString(),
    page: { title: page.title, url: page.url, id: page.id },
    dom: evalResult.result?.value ?? null,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  ws.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
