#!/usr/bin/env npx tsx
/**
 * Minimal CDP eval over ios_webkit_debug_proxy page WebSocket.
 * Playwright connectOverCDP fails on iOS (no /json/version); use this for probes.
 */
import WebSocket from "ws";

const CDP_HTTP = process.env.PX4A7_IPHONE_CDP ?? "http://127.0.0.1:9222";

type CdpMessage = { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown; error?: { message?: string } };

async function listPages(): Promise<{ webSocketDebuggerUrl: string; title: string; url: string }[]> {
  const res = await fetch(`${CDP_HTTP}/json/list`);
  if (!res.ok) throw new Error(`CDP list ${res.status}`);
  return (await res.json()) as { webSocketDebuggerUrl: string; title: string; url: string }[];
}

function cdpEval(wsUrl: string, expression: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 1;
    const pending = new Map<number, (v: unknown) => void>();
    const fail = (e: Error) => {
      ws.removeAllListeners();
      try {
        ws.close();
      } catch {
        /* */
      }
      reject(e);
    };
    ws.on("error", fail);
    ws.on("open", () => {
      const send = (m: string, p: Record<string, unknown> = {}) => {
        const msgId = id++;
        ws.send(JSON.stringify({ id: msgId, method: m, params: p }));
        return new Promise<unknown>((res, rej) => {
          pending.set(msgId, (v) => res(v));
          setTimeout(() => {
            if (pending.has(msgId)) {
              pending.delete(msgId);
              rej(new Error(`CDP timeout ${m}`));
            }
          }, 60_000);
        });
      };
      (async () => {
        await send("Runtime.enable");
        await send("Page.enable");
        const out = await send("Runtime.evaluate", {
          expression,
          awaitPromise: true,
          returnByValue: true,
        });
        ws.close();
        resolve(out);
      })().catch(fail);
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw)) as CdpMessage;
      if (msg.id && pending.has(msg.id)) {
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message ?? "CDP error"));
        else resolve(msg.result);
      }
    });
  });
}

async function main() {
  const pages = await listPages();
  const page = pages.find((p) => p.url.includes("studio.homecheff.eu")) ?? pages[0];
  if (!page) throw new Error("no CDP pages");
  const expression =
    process.argv[2] ??
    `Promise.all([
      fetch('/api/studio/me',{credentials:'include'}).then(r=>r.json().then(b=>({me:{status:r.status,body:b}}))),
      fetch('/api/studio/free-music/catalog',{credentials:'include'}).then(r=>r.json().then(b=>({catalog:{status:r.status,enabled:b.enabled,trackCount:(b.tracks||[]).length}})))
    ]).then(([a,b])=>({...a,...b,ua:navigator.userAgent}))`;
  const result = (await cdpEval(page.webSocketDebuggerUrl, expression)) as {
    result?: { value?: unknown };
  };
  console.log(JSON.stringify({ page: { title: page.title, url: page.url }, value: result?.result?.value ?? result }, null, 2));
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
