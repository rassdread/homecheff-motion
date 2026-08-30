#!/usr/bin/env npx tsx
/**
 * Phase 3R — CLEAN physical iPhone Free Music re-cert (volume scale correct).
 * iOS 26 CDP via Target.sendMessageToTarget.
 *
 * Does NOT reuse contaminated silent-export project state.
 * Stops at CLEAN_IPHONE_EXPORT_READY_FOR_AIRDROP (no AirDrop wait loop).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STUDIO = (process.env.STUDIO_BASE_URL ?? "https://studio.homecheff.eu").replace(/\/$/, "");
const CDP_HTTP = (process.env.PX4A7_IPHONE_CDP ?? "http://127.0.0.1:9222").replace(/\/$/, "");
const TRACK_ID = "fm_oga_adventure_time";
const OUT = join(ROOT, "docs/audits/studio-free-music/phase-3r");
const TARGET_VOLUME_PCT = 80;
const TARGET_OFFSET_SEC = 2.0;

type Verdict = "PASS" | "FAIL" | "NOT_RUN" | "PENDING_USER";

const report: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  kind: "CLEAN_IPHONE_FREE_MUSIC_RECERT",
  studio: STUDIO,
  productionExpected: "dpl_CrWqFNE7qtvA7FK9gH3dnGfbC3Rz",
  priorSilentExport: "INVALID_FOR_AUDIO_CERTIFICATION / CERT_AUTOMATION_VOLUME_SCALE_ERROR",
  verdicts: {} as Record<string, Verdict | string>,
  notes: [] as string[],
  volumeContract: {} as Record<string, unknown>,
  saveReopen: {} as Record<string, unknown>,
  preExport: {} as Record<string, unknown>,
};

function setV(key: string, v: Verdict | string, note?: string) {
  (report.verdicts as Record<string, string>)[key] = v;
  if (note) report.notes.push(`${key}: ${note}`);
  console.log(`[${v}] ${key}${note ? ` — ${note}` : ""}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

class Ios26Cdp {
  private ws!: WebSocket;
  private targetId: string | null = null;
  private id = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  async connect() {
    const list = (await fetch(`${CDP_HTTP}/json/list`).then((r) => r.json())) as {
      webSocketDebuggerUrl: string;
      url: string;
    }[];
    const page = list.find((p) => (p.url || "").includes("studio.homecheff")) ?? list[0];
    if (!page) throw new Error("NO_CDP_PAGES");
    this.ws = new WebSocket(page.webSocketDebuggerUrl.replace("localhost", "127.0.0.1"));
    this.ws.on("message", (raw) => this.onMessage(String(raw)));
    await new Promise<void>((res, rej) => {
      this.ws.on("open", () => res());
      this.ws.on("error", (e) => rej(e));
    });
    for (let i = 0; i < 50 && !this.targetId; i++) await sleep(100);
    if (!this.targetId) throw new Error("NO_TARGET_ID");
    await this.toTarget("Runtime.enable");
  }

  private onMessage(raw: string) {
    const msg = JSON.parse(raw) as {
      id?: number;
      method?: string;
      params?: { targetInfo?: { targetId?: string }; message?: string };
      error?: { message?: string };
      result?: unknown;
    };
    if (msg.method === "Target.targetCreated") {
      this.targetId = msg.params?.targetInfo?.targetId ?? this.targetId;
      return;
    }
    if (msg.method === "Target.dispatchMessageFromTarget" || msg.method === "Target.receivedMessageFromTarget") {
      const inner = JSON.parse(String(msg.params?.message)) as {
        id?: number;
        error?: { message?: string };
        result?: unknown;
      };
      if (inner.id != null && this.pending.has(inner.id)) {
        const p = this.pending.get(inner.id)!;
        this.pending.delete(inner.id);
        if (inner.error) p.reject(new Error(inner.error.message ?? "target error"));
        else p.resolve(inner.result);
      }
      return;
    }
  }

  private toTarget(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const innerId = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(innerId, { resolve, reject });
      this.ws.send(
        JSON.stringify({
          id: ++this.id,
          method: "Target.sendMessageToTarget",
          params: {
            targetId: this.targetId,
            message: JSON.stringify({ id: innerId, method, params }),
          },
        })
      );
      setTimeout(() => {
        if (this.pending.has(innerId)) {
          this.pending.delete(innerId);
          reject(new Error(`timeout ${method}`));
        }
      }, 60_000);
    });
  }

  async evaluate<T = unknown>(expression: string): Promise<T> {
    const result = (await this.toTarget("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: false,
    })) as { result?: { value?: T }; wasThrown?: boolean };
    if (result?.wasThrown) throw new Error(`evaluate threw: ${JSON.stringify(result)}`);
    return result?.result?.value as T;
  }

  async evaluateAsyncPoll<T = unknown>(key: string, starter: string, timeoutMs = 30_000): Promise<T> {
    await this.evaluate(
      `(function(){ window[${JSON.stringify(key)}]=${JSON.stringify("pending")}; ${starter}; return true; })()`
    );
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await sleep(400);
      const v = await this.evaluate<string | null>(`window[${JSON.stringify(key)}]`);
      if (v != null && v !== "pending") {
        try {
          return JSON.parse(String(v)) as T;
        } catch {
          return v as T;
        }
      }
    }
    throw new Error(`async poll timeout ${key}`);
  }

  async clickTestId(testId: string) {
    const ok = await this.evaluate<boolean>(
      `(function(){ var el=document.querySelector(${JSON.stringify(`[data-testid="${testId}"]`)}); if(!el) return false; el.click(); return true; })()`
    );
    if (!ok) throw new Error(`missing ${testId}`);
  }

  async countTestId(testId: string) {
    return this.evaluate<number>(
      `document.querySelectorAll(${JSON.stringify(`[data-testid="${testId}"]`)}).length`
    );
  }

  async goto(url: string) {
    await this.evaluate(`location.href=${JSON.stringify(url)}`);
    await sleep(3000);
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* */
    }
  }
}

async function waitFor(cdp: Ios26Cdp, testId: string, ms = 45_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if ((await cdp.countTestId(testId)) > 0) return;
    await sleep(400);
  }
  throw new Error(`timeout ${testId}`);
}

async function readDraftAudio(cdp: Ios26Cdp) {
  const raw = await cdp.evaluate<string>(`(function(){
    try {
      var raw=localStorage.getItem('hc-px4a-draft:v1');
      if(!raw) return 'null';
      var j=JSON.parse(raw);
      return JSON.stringify(j.composition && j.composition.audio || null);
    } catch(err){ return 'null'; }
  })()`);
  return JSON.parse(raw || "null") as {
    kind?: string;
    trackId?: string;
    startSeconds?: number;
    volume?: number;
    title?: string;
  } | null;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const build = await fetch(`${STUDIO}/api/meta/build`).then((r) => r.json());
  report.productionBuild = build;

  const cdp = new Ios26Cdp();
  await cdp.connect();
  const ua = await cdp.evaluate<string>("navigator.userAgent");
  report.userAgent = ua;
  setV("PHYSICAL_IPHONE_DEVICE", ua.includes("iPhone") ? "PASS" : "FAIL", ua.slice(0, 100));

  // Fresh project — wipe contaminated draft, open composer fresh
  await cdp.goto(`${STUDIO}/studio/photo-video`);
  await waitFor(cdp, "px4a-composer", 60_000);
  await cdp.evaluate(`(function(){
    try { localStorage.removeItem('hc-px4a-draft:v1'); } catch(err){}
    try {
      var keys=[]; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k && k.indexOf('hc-px4a')===0) keys.push(k); }
      keys.forEach(function(k){ localStorage.removeItem(k); });
    } catch(err){}
  })()`);
  if ((await cdp.countTestId("px4a-resume-fresh")) > 0) {
    await cdp.clickTestId("px4a-resume-fresh");
    await sleep(1200);
  } else {
    // force reload after wipe
    await cdp.goto(`${STUDIO}/studio/photo-video`);
    await waitFor(cdp, "px4a-composer", 60_000);
    if ((await cdp.countTestId("px4a-resume-fresh")) > 0) {
      await cdp.clickTestId("px4a-resume-fresh");
      await sleep(1200);
    }
  }

  await cdp.evaluate(`(function(){ var g=document.querySelector('[data-testid="px4a-global-video"]'); if(g && !g.open){ var s=g.querySelector('summary'); if(s) s.click(); } })()`);
  await waitFor(cdp, "px4a-audio-catalog", 30_000);

  // Inject fresh photos (new project media)
  console.log("\n*** Injecting fresh photos into NEW project… ***\n");
  await cdp.evaluateAsyncPoll(
    "__cleanInject",
    `;(function(){
      var input=document.querySelector('[data-testid="px4a-file-input"]');
      if(!input){ window.__cleanInject=JSON.stringify({ok:false,reason:'no-input'}); return; }
      function pngBlob(cb){
        var c=document.createElement('canvas'); c.width=720; c.height=1280;
        var ctx=c.getContext('2d'); ctx.fillStyle='#0a6b4a'; ctx.fillRect(0,0,720,1280);
        ctx.fillStyle='#fff'; ctx.font='48px sans-serif'; ctx.fillText('CLEAN CERT',40,120);
        c.toBlob(function(b){ cb(b); }, 'image/png');
      }
      pngBlob(function(b1){
        pngBlob(function(b2){
          try {
            var dt=new DataTransfer();
            dt.items.add(new File([b1],'clean-a.png',{type:'image/png'}));
            dt.items.add(new File([b2],'clean-b.png',{type:'image/png'}));
            input.files=dt.files;
            input.dispatchEvent(new Event('change',{bubbles:true}));
            window.__cleanInject=JSON.stringify({ok:true});
          } catch(err){ window.__cleanInject=JSON.stringify({ok:false,reason:String(err)}); }
        });
      });
    })()`,
    20_000
  ).catch(() => ({ ok: false }));
  for (let i = 0; i < 25; i++) {
    const n = await cdp.evaluate<number>(
      `[...document.querySelectorAll('[data-testid]')].filter(function(el){ return /^px4a-photo-\\d+$/.test(el.getAttribute('data-testid')||''); }).length`
    );
    if (n >= 1) break;
    await sleep(800);
  }

  // Free Music → Adventure Time
  await cdp.clickTestId("px4a-audio-catalog");
  await waitFor(cdp, "px4a-free-music-browser", 20_000);
  await cdp.clickTestId(`px4a-free-music-preview-${TRACK_ID}`);
  await sleep(2000);
  const previewErr = await cdp.countTestId("px4a-free-music-error");
  setV("IPHONE_MP3_PREVIEW_CLEAN", previewErr ? "FAIL" : "PASS");

  await cdp.clickTestId(`px4a-free-music-select-${TRACK_ID}`);
  await waitFor(cdp, "px4a-music-panel", 15_000);

  // Inspect REAL volume contract
  const contract = await cdp.evaluate<string>(`(function(){
    var el=document.querySelector('[data-testid="px4a-audio-volume"]');
    if(!el) return JSON.stringify({error:'missing'});
    return JSON.stringify({
      tag: el.tagName,
      type: el.getAttribute('type'),
      min: el.min,
      max: el.max,
      step: el.step,
      valueAttr: el.value,
      valueAsNumber: el.valueAsNumber
    });
  })()`);
  const volumeContract = JSON.parse(contract);
  report.volumeContract = volumeContract;
  console.log("VOLUME_CONTRACT", volumeContract);

  const min = Number(volumeContract.min);
  const max = Number(volumeContract.max);
  const isPercentScale = max === 100;
  const setValue = isPercentScale ? String(TARGET_VOLUME_PCT) : String(TARGET_VOLUME_PCT / 100);
  const expectedInternal = isPercentScale ? TARGET_VOLUME_PCT / 100 : TARGET_VOLUME_PCT / 100;

  // Set volume via native setter + input/change (React controlled path)
  const setVolResult = await cdp.evaluate<string>(`(function(){
    var el=document.querySelector('[data-testid="px4a-audio-volume"]');
    if(!el) return JSON.stringify({ok:false});
    var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    setter.call(el, ${JSON.stringify(setValue)});
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return JSON.stringify({
      ok:true,
      valueAfter: el.value,
      valueAsNumber: el.valueAsNumber,
      setValue: ${JSON.stringify(setValue)},
      scale: ${JSON.stringify(isPercentScale ? "0-100" : "other")}
    });
  })()`);
  const setVol = JSON.parse(setVolResult);
  report.volumeSet = setVol;
  console.log("VOLUME_SET", setVol);

  // Verify effective ~80% in draft/composition
  await sleep(500);
  let audioAfterVol = await readDraftAudio(cdp);
  // Also read live React state via UI displayed value
  const uiVol = await cdp.evaluate<number>(
    `Number(document.querySelector('[data-testid="px4a-audio-volume"]').value)`
  );
  const effectiveOk =
    isPercentScale
      ? Math.abs(uiVol - TARGET_VOLUME_PCT) <= 5 &&
        (audioAfterVol?.volume == null || Math.abs((audioAfterVol.volume ?? 0) - expectedInternal) < 0.08)
      : Math.abs(uiVol - expectedInternal) < 0.08;
  // Draft may lag until save — require UI value correct
  const uiEffectiveOk = isPercentScale
    ? Math.abs(uiVol - TARGET_VOLUME_PCT) <= 5
    : Math.abs(uiVol - expectedInternal) < 0.08;
  setV(
    "VOLUME_SCALE_CORRECT",
    uiEffectiveOk ? "PASS" : "FAIL",
    `ui=${uiVol} expected≈${isPercentScale ? TARGET_VOLUME_PCT : expectedInternal} draft=${JSON.stringify(audioAfterVol)}`
  );

  // Offset via real pointer sequence on audio window canvas (~2s into 86s track)
  const offsetResult = await cdp.evaluate<string>(`(function(){
    var canvas=document.querySelector('[data-testid="px4a-audio-window"]');
    if(!canvas) return JSON.stringify({ok:false,reason:'no-canvas'});
    var rect=canvas.getBoundingClientRect();
    // Adventure Time ~86s; place click at ~2s → ratio 2/86
    var ratio=${TARGET_OFFSET_SEC}/86;
    var x=rect.left + Math.max(2, Math.min(rect.width-2, ratio*rect.width));
    var y=rect.top + rect.height/2;
    function fire(type, cx, cy){
      var ev=new PointerEvent(type,{
        bubbles:true, cancelable:true, pointerId:1, pointerType:'touch',
        clientX:cx, clientY:cy, buttons: type==='pointerup'?0:1
      });
      canvas.dispatchEvent(ev);
    }
    fire('pointerdown', x, y);
    fire('pointerup', x, y);
    return JSON.stringify({ok:true,x:x,y:y,ratio:ratio,targetOffset:${TARGET_OFFSET_SEC}});
  })()`);
  report.offsetGesture = JSON.parse(offsetResult);
  await sleep(600);
  audioAfterVol = await readDraftAudio(cdp);
  const offsetOk =
    typeof audioAfterVol?.startSeconds === "number" && audioAfterVol.startSeconds > 0.5;
  setV(
    "OFFSET_SET",
    offsetOk ? "PASS" : "FAIL",
    `startSeconds=${audioAfterVol?.startSeconds}`
  );

  const expectedBeforeSave = {
    trackId: TRACK_ID,
    volumeApprox: expectedInternal,
    startSecondsMin: 0.5,
    uiVolume: uiVol,
  };
  report.expectedBeforeSave = expectedBeforeSave;

  // Save
  if ((await cdp.countTestId("px4a-save")) > 0) {
    await cdp.clickTestId("px4a-save");
    await sleep(1500);
  } else {
    // trigger draft commit via any blur/save path
    await cdp.evaluate(`(function(){ try{ window.dispatchEvent(new Event('pagehide')); }catch(err){} })()`);
    await sleep(800);
  }

  const beforeLeave = await readDraftAudio(cdp);
  report.audioBeforeLeave = beforeLeave;

  // Leave and reopen
  await cdp.goto(`${STUDIO}/studio`);
  await sleep(1500);
  await cdp.goto(`${STUDIO}/studio/photo-video`);
  await waitFor(cdp, "px4a-composer", 60_000);
  if ((await cdp.countTestId("px4a-resume-continue")) > 0) {
    await cdp.clickTestId("px4a-resume-continue");
    await sleep(2000);
  }
  await cdp.evaluate(`(function(){ var g=document.querySelector('[data-testid="px4a-global-video"]'); if(g && !g.open){ var s=g.querySelector('summary'); if(s) s.click(); } })()`);
  await sleep(800);

  const after = await readDraftAudio(cdp);
  report.saveReopen = { beforeLeave, after };
  let uiVolAfter = NaN;
  if ((await cdp.countTestId("px4a-music-panel")) === 0 && after?.kind === "catalog") {
    // open panel if collapsed
    await cdp.clickTestId("px4a-audio-catalog").catch(() => undefined);
    await sleep(500);
  }
  if ((await cdp.countTestId("px4a-audio-volume")) > 0) {
    uiVolAfter = await cdp.evaluate<number>(
      `Number(document.querySelector('[data-testid="px4a-audio-volume"]').value)`
    );
  }
  report.saveReopen = { ...((report.saveReopen as object) ?? {}), uiVolAfter };

  const trackOk = after?.kind === "catalog" && after.trackId === TRACK_ID;
  const volOk =
    typeof after?.volume === "number" && Math.abs(after.volume - expectedInternal) < 0.1;
  const offOk = typeof after?.startSeconds === "number" && after.startSeconds > 0.5;
  const reopenPass = trackOk && volOk && offOk;
  setV(
    "IPHONE_PROJECT_SAVE_REOPEN",
    reopenPass ? "PASS" : "FAIL",
    JSON.stringify({ trackOk, volOk, offOk, after, uiVolAfter })
  );
  if (!reopenPass && trackOk && !volOk) {
    report.saveReopenClassification = "PRODUCT_DEFECT_CANDIDATE — clean project + correct 0-100 scale still failed volume persist";
  } else if (reopenPass) {
    report.saveReopenClassification = "PASS — clean project + correct UI scale";
  } else if (!trackOk) {
    report.saveReopenClassification = "FAIL — track not restored";
  }

  // Ensure music panel selected again for pre-export
  if ((await cdp.countTestId("px4a-audio-volume")) === 0) {
    await cdp.clickTestId("px4a-audio-catalog");
    await waitFor(cdp, "px4a-free-music-browser", 15_000).catch(() => undefined);
    if ((await cdp.countTestId(`px4a-free-music-select-${TRACK_ID}`)) > 0) {
      await cdp.clickTestId(`px4a-free-music-select-${TRACK_ID}`);
      await waitFor(cdp, "px4a-music-panel", 15_000);
      // re-apply volume if reopen failed
      if (!volOk) {
        await cdp.evaluate(`(function(){
          var el=document.querySelector('[data-testid="px4a-audio-volume"]');
          var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
          setter.call(el, ${JSON.stringify(setValue)});
          el.dispatchEvent(new Event('input',{bubbles:true}));
          el.dispatchEvent(new Event('change',{bubbles:true}));
        })()`);
        await sleep(400);
      }
    }
  }

  // Pre-export: play preview and check element state
  await cdp.clickTestId(`px4a-free-music-preview-${TRACK_ID}`).catch(async () => {
    // already on panel — use panel play if present
  });
  // Also click panel play button if available
  await cdp.evaluate(`(function(){
    var btns=[...document.querySelectorAll('button')];
    // no stable testid for play — trigger catalog preview again
  })()`);
  await sleep(1500);

  const pre = await cdp.evaluate<string>(`(function(){
    var el=document.querySelector('[data-testid="px4a-audio-volume"]');
    var audios=[...document.querySelectorAll('audio')];
    var a=audios.find(function(x){ return x.src && x.src.indexOf('free-music')>=0; }) || audios[0];
    var draft=null;
    try {
      var raw=localStorage.getItem('hc-px4a-draft:v1');
      draft=raw?JSON.parse(raw).composition.audio:null;
    } catch(err){}
    return JSON.stringify({
      uiVolume: el?Number(el.value):null,
      audioElVolume: a?a.volume:null,
      audioPaused: a?a.paused:null,
      audioCurrentTime: a?a.currentTime:null,
      draftVolume: draft&&draft.volume,
      draftTrack: draft&&draft.trackId,
      draftStart: draft&&draft.startSeconds
    });
  })()`);
  const preExport = JSON.parse(pre);
  report.preExport = preExport;
  const uiNear80 = isPercentScale
    ? Math.abs(Number(preExport.uiVolume) - TARGET_VOLUME_PCT) <= 8
    : Math.abs(Number(preExport.uiVolume) - expectedInternal) < 0.1;
  const draftNear80 =
    typeof preExport.draftVolume === "number" && Math.abs(preExport.draftVolume - expectedInternal) < 0.12;

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("  PRE_EXPORT — confirm music is AUDIBLE on the physical iPhone");
  console.log(`  UI volume control value: ${preExport.uiVolume} (expect ~${isPercentScale ? 80 : 0.8})`);
  console.log(`  Draft volume: ${preExport.draftVolume} (expect ~0.80)`);
  console.log("════════════════════════════════════════════════════════════\n");

  if (uiNear80 || draftNear80) {
    setV(
      "PRE_EXPORT_IPHONE_MUSIC_AUDIBLE",
      "PENDING_USER",
      `UI/state ready for audible check — user must confirm hearing music. ui=${preExport.uiVolume} draftVol=${preExport.draftVolume}`
    );
  } else {
    setV(
      "PRE_EXPORT_IPHONE_MUSIC_AUDIBLE",
      "FAIL",
      `volume not ~80% before export — ui=${preExport.uiVolume} draft=${preExport.draftVolume}`
    );
  }

  // Click export if button present (user finishes native share / AirDrop)
  if ((await cdp.countTestId("px4a-export-download")) > 0) {
    await cdp.clickTestId("px4a-export-download").catch(() => undefined);
  }

  setV("CLEAN_IPHONE_EXPORT", "PENDING_USER", "AirDrop as ~/Downloads/iphone-free-music-export-clean.mp4");

  writeFileSync(join(OUT, "CLEAN-IPHONE-RECERT.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(OUT, "CLEAN-IPHONE-RECERT.md"),
    `# Clean iPhone Free Music Re-cert\n\nSee \`CLEAN-IPHONE-RECERT.json\`.\n\nPrior silent export: **INVALID_FOR_AUDIO_CERTIFICATION** (\`CERT_AUTOMATION_VOLUME_SCALE_ERROR\`).\n`
  );

  console.log("\nCLEAN_IPHONE_EXPORT_READY_FOR_AIRDROP\n");
  console.log(
    JSON.stringify(
      {
        IPHONE_PROJECT_SAVE_REOPEN: (report.verdicts as Record<string, string>).IPHONE_PROJECT_SAVE_REOPEN,
        VOLUME_CONTRACT: volumeContract,
        PRE_EXPORT: preExport,
        SAVE_REOPEN: report.saveReopen,
      },
      null,
      2
    )
  );

  cdp.close();
}

void main().catch((e) => {
  console.error(e);
  try {
    writeFileSync(join(OUT, "CLEAN-IPHONE-RECERT.json"), JSON.stringify(report, null, 2));
  } catch {
    /* */
  }
  process.exit(1);
});
