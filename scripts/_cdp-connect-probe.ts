#!/usr/bin/env npx tsx
import { webkit, chromium, type Browser } from "playwright";

async function tryConnect(label: string, connect: () => Promise<Browser>) {
  try {
    const b = await connect();
    const pages = b.contexts().flatMap((c) => c.pages());
    console.log(label, "OK pages", pages.length, pages[0]?.url());
    if (pages[0]) {
      const o = await pages[0].evaluate(() => ({
        w: innerWidth,
        h: innerHeight,
        so: String(screen.orientation?.type || ""),
        mm: matchMedia("(orientation: landscape)").matches,
      }));
      console.log("viewport", o);
    }
    await b.close().catch(() => undefined);
    return true;
  } catch (e) {
    console.log(label, "FAIL", String(e).slice(0, 240));
    return false;
  }
}

async function main() {
  const okW = await tryConnect("webkit", () =>
    webkit.connectOverCDP("http://127.0.0.1:9222", { timeout: 20000 })
  );
  if (!okW) {
    await tryConnect("chromium", () =>
      chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 20000 })
    );
  }
}

main();
