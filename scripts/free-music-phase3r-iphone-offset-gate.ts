#!/usr/bin/env npx tsx
/**
 * Phase 3R — FINAL iPhone OFFSET persistence gate only.
 *
 * FREE_LOCAL_IPHONE already PASS — do not export.
 * Track+volume already PASS — prove offset via correct canvas contract.
 *
 * Prior OFFSET_SET FAIL root cause (test artifact):
 *   click at ~2s with startSeconds=0 and window≈15s is INSIDE the selection;
 *   pointerdown+up without move never calls onStart → start stays 0.
 */
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
const PHYSICAL_WAIT_MS = Number(process.env.OFFSET_PHYSICAL_WAIT_MS ?? 120_000);

type Verdict = "PASS" | "FAIL" | "NOT_RUN" | "PENDING_USER";

const report: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  kind: "IPHONE_OFFSET_PERSISTENCE_GATE",
  studio: STUDIO,
  trackId: TRACK_ID,
  targetOffsetSeconds: TARGET_OFFSET_SEC,
  targetVolumePct: TARGET_VOLUME_PCT,
  verdicts: {} as Record<string, Verdict | string>,
  notes: [] as string[],
  offsetContract: {} as Record<string, unknown>,
  classification: null as string | null,
};

function setV(key: string, v: Verdict | string, note?: string) {
  (report.verdicts as Record<string, string>)[key] = v;
  if (note) (report.notes as string[]).push(`${key}: ${note}`);
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
    trackDurationSeconds?: number;
    durationSeconds?: number;
    title?: string;
  } | null;
}

/** Live window geometry + track meta from the canvas / draft. */
async function readOffsetContract(cdp: Ios26Cdp) {
  const raw = await cdp.evaluate<string>(`(function(){
    var canvas=document.querySelector('[data-testid="px4a-audio-window"]');
    var vol=document.querySelector('[data-testid="px4a-audio-volume"]');
    var draft=null;
    try {
      var raw=localStorage.getItem('hc-px4a-draft:v1');
      draft=raw?JSON.parse(raw).composition.audio:null;
    } catch(err){}
    var rect=canvas?canvas.getBoundingClientRect():null;
    var track=draft && typeof draft.trackDurationSeconds==='number'?draft.trackDurationSeconds:null;
    var start=draft && typeof draft.startSeconds==='number'?draft.startSeconds:null;
    var win=draft && typeof draft.durationSeconds==='number'?draft.durationSeconds:null;
    var maxStart=(track!=null && win!=null)?Math.max(0, track-win):null;
    return JSON.stringify({
      control: 'canvas[data-testid=px4a-audio-window]',
      interaction: 'pointer drag / outside-tap on waveform window',
      units: 'seconds (startSeconds)',
      displayedUnits: 'none (visual window only; no numeric offset field)',
      volumeUi: vol?{min:vol.min,max:vol.max,step:vol.step,value:vol.value}:null,
      canvasPresent: !!canvas,
      rect: rect?{left:rect.left,top:rect.top,width:rect.width,height:rect.height}:null,
      draft: draft,
      trackDurationSeconds: track,
      windowSeconds: win,
      startSeconds: start,
      maxStartSeconds: maxStart,
      priorFailureNote: 'tap at 2s with start=0 and window~15s is INSIDE selection → no onStart without move'
    });
  })()`);
  return JSON.parse(raw);
}

async function ensureMusicAndVolume(cdp: Ios26Cdp) {
  await cdp.evaluate(`(function(){ var g=document.querySelector('[data-testid="px4a-global-video"]'); if(g && !g.open){ var s=g.querySelector('summary'); if(s) s.click(); } })()`);
  await sleep(400);
  if ((await cdp.countTestId("px4a-music-panel")) === 0) {
    await cdp.clickTestId("px4a-audio-catalog");
    await waitFor(cdp, "px4a-free-music-browser", 20_000);
    await cdp.clickTestId(`px4a-free-music-select-${TRACK_ID}`);
    await waitFor(cdp, "px4a-music-panel", 15_000);
  }
  await cdp.evaluate(`(function(){
    var el=document.querySelector('[data-testid="px4a-audio-volume"]');
    if(!el) return;
    var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    setter.call(el, ${JSON.stringify(String(TARGET_VOLUME_PCT))});
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await sleep(400);
}

/** Fire one pointerdown/up (or drag) on the audio window canvas. Must be awaited between steps so React re-renders. */
async function canvasPointer(
  cdp: Ios26Cdp,
  mode: "tap" | "drag",
  secA: number,
  secB?: number
) {
  return cdp.evaluate<string>(`(function(){
    var canvas=document.querySelector('[data-testid="px4a-audio-window"]');
    if(!canvas) return JSON.stringify({ok:false,reason:'no-canvas'});
    var draft=null;
    try {
      var raw=localStorage.getItem('hc-px4a-draft:v1');
      draft=raw?JSON.parse(raw).composition.audio:null;
    } catch(err){}
    var track= (draft && draft.trackDurationSeconds) || 86;
    var rect=canvas.getBoundingClientRect();
    function xFor(sec){
      var r=sec/track;
      return rect.left + Math.max(2, Math.min(rect.width-2, r*rect.width));
    }
    var y=rect.top + rect.height/2;
    function fire(type, cx, cy, buttons){
      var ev=new PointerEvent(type,{
        bubbles:true, cancelable:true, composed:true,
        pointerId:1, pointerType:'touch', isPrimary:true,
        clientX:cx, clientY:cy, buttons: buttons
      });
      canvas.dispatchEvent(ev);
    }
    var a=${JSON.stringify(secA)};
    var b=${JSON.stringify(secB ?? null)};
    if(${JSON.stringify(mode)}==='drag' && b!=null){
      fire('pointerdown', xFor(a), y, 1);
      fire('pointermove', xFor(b), y, 1);
      fire('pointerup', xFor(b), y, 0);
      return JSON.stringify({ok:true,mode:'drag',from:a,to:b,xFrom:xFor(a),xTo:xFor(b),track:track});
    }
    fire('pointerdown', xFor(a), y, 1);
    fire('pointerup', xFor(a), y, 0);
    return JSON.stringify({ok:true,mode:'tap',at:a,x:xFor(a),track:track,startBefore:draft&&draft.startSeconds,winBefore:draft&&draft.durationSeconds});
  })()`);
}

async function probeDraftHealth(cdp: Ios26Cdp) {
  return cdp.evaluateAsyncPoll(
    "__draftHealth",
    `;(function(){
      try {
        var metaRaw=localStorage.getItem('hc-px4a-draft:v1');
        if(!metaRaw){ window.__draftHealth=JSON.stringify({meta:false}); return; }
        var meta=JSON.parse(metaRaw);
        var photos=(meta.composition&&meta.composition.photos)||[];
        var req=indexedDB.open('hc-px4a-draft-blobs');
        req.onerror=function(){ window.__draftHealth=JSON.stringify({meta:true,idb:false,audio:meta.composition&&meta.composition.audio}); };
        req.onsuccess=function(){
          var db=req.result;
          var storeName=db.objectStoreNames.contains('media')?'media':db.objectStoreNames[0];
          if(!storeName){
            window.__draftHealth=JSON.stringify({meta:true,idb:'no-store',audio:meta.composition&&meta.composition.audio,photoCount:photos.length});
            return;
          }
          var tx=db.transaction(storeName,'readonly');
          var store=tx.objectStore(storeName);
          var pending=photos.length; var found=0; var missing=[];
          if(!pending){
            window.__draftHealth=JSON.stringify({meta:true,idb:true,photoBlobsFound:0,photoCount:0,audio:meta.composition&&meta.composition.audio});
            return;
          }
          photos.forEach(function(p){
            var g=store.get('photo:'+p.id);
            g.onsuccess=function(){
              if(g.result) found++; else missing.push(p.id);
              pending--;
              if(pending===0){
                window.__draftHealth=JSON.stringify({
                  meta:true,idb:true,photoCount:photos.length,photoBlobsFound:found,missing:missing,
                  audio:meta.composition&&meta.composition.audio
                });
              }
            };
            g.onerror=function(){
              missing.push(p.id); pending--;
              if(pending===0) window.__draftHealth=JSON.stringify({meta:true,idb:true,photoBlobsFound:found,missing:missing,audio:meta.composition&&meta.composition.audio});
            };
          });
        };
      } catch(err){ window.__draftHealth=JSON.stringify({error:String(err)}); }
    })()`,
    15_000
  );
}

/**
 * Correct UI semantics (steps separated so React can commit):
 * A) Drag from near window left → TARGET (~2s) while start≈0 (grab inside, move)
 * B) If needed: outside-tap far → flush → outside-tap TARGET
 */
async function setOffsetViaCorrectPointerSemantics(cdp: Ios26Cdp) {
  const draft = await readDraftAudio(cdp);
  const track = draft?.trackDurationSeconds || 86;
  const win = draft?.durationSeconds || 15;
  const target = TARGET_OFFSET_SEC;
  const far = Math.min(track - 1, Math.max(win + 5, target + win + 5));

  // Drag: pointerdown slightly inside window at ~0.2s, move to target+0.2 with grab≈0.2 → start≈target
  const stepDrag = JSON.parse(await canvasPointer(cdp, "drag", 0.2, target + 0.2));
  await sleep(900);
  await flushSave(cdp);
  let after = await readDraftAudio(cdp);
  let mid = after;

  let step1: unknown = null;
  let step2: unknown = null;
  if ((after?.startSeconds ?? 0) < 0.5) {
    step1 = JSON.parse(await canvasPointer(cdp, "tap", far));
    await sleep(900);
    await flushSave(cdp);
    mid = await readDraftAudio(cdp);

    step2 = JSON.parse(await canvasPointer(cdp, "tap", target));
    await sleep(900);
    await flushSave(cdp);
    after = await readDraftAudio(cdp);
  }

  return {
    ok: true,
    track,
    win,
    far,
    target,
    stepDrag,
    step1,
    step2,
    midStart: mid?.startSeconds,
    afterStart: after?.startSeconds,
    strategy: "drag-to-target → (fallback outside-far → outside-target)",
  };
}

async function flushSave(cdp: Ios26Cdp) {
  if ((await cdp.countTestId("px4a-save")) > 0) {
    await cdp.clickTestId("px4a-save");
    await sleep(1800);
  } else {
    await cdp.evaluate(`(function(){ try{ window.dispatchEvent(new Event('pagehide')); }catch(err){} })()`);
    await sleep(1000);
  }
}

function offsetNear(actual: number | undefined, expected: number, tol = 0.75) {
  return typeof actual === "number" && Math.abs(actual - expected) <= tol;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const build = await fetch(`${STUDIO}/api/meta/build`).then((r) => r.json());
  report.productionBuild = build;

  const cdp = new Ios26Cdp();
  await cdp.connect();
  const ua = await cdp.evaluate<string>("navigator.userAgent");
  report.userAgent = ua;
  setV("PHYSICAL_IPHONE_DEVICE", ua.includes("iPhone") ? "PASS" : "FAIL", ua.slice(0, 120));

  // Fresh project — avoid resume race (autosave before photoBlobsRef rehydrates can wipe IDB photos)
  await cdp.goto(`${STUDIO}/studio/photo-video`);
  await waitFor(cdp, "px4a-composer", 60_000);
  await cdp.evaluate(`(function(){
    try { localStorage.removeItem('hc-px4a-draft:v1'); } catch(err){}
    try {
      var keys=[]; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k && k.indexOf('hc-px4a')===0 && k.indexOf('funnel')<0) keys.push(k); }
      keys.forEach(function(k){ localStorage.removeItem(k); });
    } catch(err){}
  })()`);
  // Clear IDB blobs too
  await cdp.evaluateAsyncPoll(
    "__idbClear",
    `;(function(){
      try {
        var req=indexedDB.deleteDatabase('hc-px4a-draft-blobs');
        req.onsuccess=function(){ window.__idbClear=JSON.stringify({ok:true}); };
        req.onerror=function(){ window.__idbClear=JSON.stringify({ok:false}); };
        req.onblocked=function(){ window.__idbClear=JSON.stringify({ok:false,blocked:true}); };
      } catch(err){ window.__idbClear=JSON.stringify({ok:false,error:String(err)}); }
    })()`,
    10_000
  ).catch(() => ({ ok: false }));

  if ((await cdp.countTestId("px4a-resume-fresh")) > 0) {
    await cdp.clickTestId("px4a-resume-fresh");
    await sleep(1200);
  } else {
    await cdp.goto(`${STUDIO}/studio/photo-video`);
    await waitFor(cdp, "px4a-composer", 60_000);
    if ((await cdp.countTestId("px4a-resume-fresh")) > 0) {
      await cdp.clickTestId("px4a-resume-fresh");
      await sleep(1200);
    }
  }
  setV("PROJECT_BASE", "PASS", "fresh project (wipe meta+IDB, inject photos)");

  await cdp.evaluateAsyncPoll(
    "__offInject",
    `;(function(){
      var input=document.querySelector('[data-testid="px4a-file-input"]');
      if(!input){ window.__offInject=JSON.stringify({ok:false,reason:'no-input'}); return; }
      function pngBlob(cb){
        var c=document.createElement('canvas'); c.width=720; c.height=1280;
        var ctx=c.getContext('2d'); ctx.fillStyle='#0a6b4a'; ctx.fillRect(0,0,720,1280);
        ctx.fillStyle='#fff'; ctx.font='40px sans-serif'; ctx.fillText('OFFSET GATE',40,120);
        c.toBlob(function(b){ cb(b); }, 'image/png');
      }
      pngBlob(function(b1){
        pngBlob(function(b2){
          try {
            var dt=new DataTransfer();
            dt.items.add(new File([b1],'offset-a.png',{type:'image/png'}));
            dt.items.add(new File([b2],'offset-b.png',{type:'image/png'}));
            input.files=dt.files;
            input.dispatchEvent(new Event('change',{bubbles:true}));
            window.__offInject=JSON.stringify({ok:true});
          } catch(err){ window.__offInject=JSON.stringify({ok:false,reason:String(err)}); }
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
  await sleep(1200); // let photoBlobsRef + autosave settle

  await ensureMusicAndVolume(cdp);
  await flushSave(cdp); // flush track+volume so draft readable
  await sleep(500);

  const contract = await readOffsetContract(cdp);
  report.offsetContract = contract;
  console.log("OFFSET_CONTRACT", JSON.stringify(contract, null, 2));

  const beforeSet = await readDraftAudio(cdp);
  report.audioBeforeOffset = beforeSet;

  // --- Attempt A: corrected pointer semantics (steps separated for React) ---
  const gestureA = await setOffsetViaCorrectPointerSemantics(cdp);
  report.offsetGestureCorrected = gestureA;
  let afterSet = await readDraftAudio(cdp);
  report.audioAfterCorrectedGesture = afterSet;
  let setOk = offsetNear(afterSet?.startSeconds, TARGET_OFFSET_SEC) || (afterSet?.startSeconds ?? 0) > 0.5;
  setV(
    "OFFSET_SET_CORRECTED_AUTOMATION",
    setOk ? "PASS" : "FAIL",
    `startSeconds=${afterSet?.startSeconds} expected≈${TARGET_OFFSET_SEC} mid=${gestureA.midStart} strategy=${gestureA.strategy}`
  );

  // --- Attempt B: physical drag if automation still at ~0 ---
  if (!setOk) {
    console.log("\n════════════════════════════════════════════════════════════");
    console.log("  PHYSICAL OFFSET REQUIRED");
    console.log("  On the iPhone Free Music waveform (green window):");
    console.log(`  Drag so the window starts ~${TARGET_OFFSET_SEC}s into the track`);
    console.log("  (slide the green selection a bit to the right).");
    console.log(`  Waiting up to ${Math.round(PHYSICAL_WAIT_MS / 1000)}s…`);
    console.log("════════════════════════════════════════════════════════════\n");
    setV("OFFSET_PHYSICAL_PROMPT", "PENDING_USER", `drag window to ~${TARGET_OFFSET_SEC}s`);

    const startWait = Date.now();
    while (Date.now() - startWait < PHYSICAL_WAIT_MS) {
      await sleep(1500);
      await flushSave(cdp);
      afterSet = await readDraftAudio(cdp);
      if ((afterSet?.startSeconds ?? 0) > 0.5) {
        setOk = true;
        break;
      }
      const elapsed = Math.round((Date.now() - startWait) / 1000);
      console.log(`  …waiting physical offset (${elapsed}s) startSeconds=${afterSet?.startSeconds ?? "?"}`);
    }
    report.audioAfterPhysical = afterSet;
    setV(
      "OFFSET_SET_PHYSICAL",
      setOk ? "PASS" : "FAIL",
      `startSeconds=${afterSet?.startSeconds}`
    );
  } else {
    setV("OFFSET_SET_PHYSICAL", "NOT_RUN", "corrected automation already set non-zero offset");
  }

  if (!setOk) {
    report.classification = "IPHONE_OFFSET_SET_INCONCLUSIVE — could not establish non-zero offset via UI";
    setV("IPHONE_PROJECT_SAVE_REOPEN", "FAIL", "offset never set before save");
    writeFileSync(join(OUT, "IPHONE-OFFSET-PERSISTENCE-GATE.json"), JSON.stringify(report, null, 2));
    writeFileSync(
      join(OUT, "IPHONE-OFFSET-PERSISTENCE-GATE.md"),
      `# iPhone Offset Persistence Gate\n\nSee \`IPHONE-OFFSET-PERSISTENCE-GATE.json\`.\n`
    );
    console.log("\nIPHONE_OFFSET_GATE_FAILED_BEFORE_SAVE\n");
    cdp.close();
    process.exit(1);
  }

  const expectedStart = afterSet!.startSeconds!;
  const expectedVol = afterSet!.volume ?? TARGET_VOLUME_PCT / 100;
  report.expectedBeforeLeave = {
    trackId: TRACK_ID,
    startSeconds: expectedStart,
    volume: expectedVol,
  };

  await flushSave(cdp);
  const beforeLeave = await readDraftAudio(cdp);
  report.audioBeforeLeave = beforeLeave;
  const health = await probeDraftHealth(cdp);
  report.draftHealthBeforeLeave = health;
  console.log("DRAFT_HEALTH_BEFORE_LEAVE", health);
  if (!(health as { photoBlobsFound?: number })?.photoBlobsFound) {
    setV("DRAFT_IDB_PHOTOS", "FAIL", JSON.stringify(health));
    report.classification =
      "DRAFT_RESTORE_PRECONDITION_FAIL — meta saved but IDB photo blobs missing (resume/autosave race); not offset-specific";
    writeFileSync(join(OUT, "IPHONE-OFFSET-PERSISTENCE-GATE.json"), JSON.stringify(report, null, 2));
    cdp.close();
    process.exit(1);
  }
  setV("DRAFT_IDB_PHOTOS", "PASS", `found=${(health as { photoBlobsFound: number }).photoBlobsFound}`);

  // Leave + reopen — soft path: studio home then photo-video, continue resume
  await cdp.goto(`${STUDIO}/studio`);
  await sleep(2000);
  await cdp.goto(`${STUDIO}/studio/photo-video`);
  await waitFor(cdp, "px4a-composer", 60_000);
  // Wait for resume offer (meta present)
  for (let i = 0; i < 30; i++) {
    if ((await cdp.countTestId("px4a-resume-continue")) > 0) break;
    await sleep(400);
  }
  if ((await cdp.countTestId("px4a-resume-continue")) > 0) {
    await cdp.clickTestId("px4a-resume-continue");
    await sleep(3500); // allow blob rehydrate before any accidental autosave race
  } else {
    report.resumeMissing = true;
    setV("RESUME_OFFER", "FAIL", "no resume-continue after leave");
  }
  await cdp.evaluate(`(function(){ var g=document.querySelector('[data-testid="px4a-global-video"]'); if(g && !g.open){ var s=g.querySelector('summary'); if(s) s.click(); } })()`);
  await sleep(800);
  if ((await cdp.countTestId("px4a-music-panel")) === 0 && (await cdp.countTestId("px4a-audio-catalog")) > 0) {
    // open panel if needed — catalog already selected should show panel after expanding global
    await cdp.clickTestId("px4a-audio-catalog").catch(() => undefined);
    await sleep(600);
  }

  const after = await readDraftAudio(cdp);
  let uiVolAfter = NaN;
  if ((await cdp.countTestId("px4a-audio-volume")) > 0) {
    uiVolAfter = await cdp.evaluate<number>(
      `Number(document.querySelector('[data-testid="px4a-audio-volume"]').value)`
    );
  }
  report.saveReopen = { beforeLeave, after, uiVolAfter };

  const trackOk = after?.kind === "catalog" && after.trackId === TRACK_ID;
  const volOk = typeof after?.volume === "number" && Math.abs(after.volume - expectedVol) < 0.1;
  const offOk = offsetNear(after?.startSeconds, expectedStart, 0.85);
  const reopenPass = trackOk && volOk && offOk;

  setV(
    "IPHONE_PROJECT_SAVE_REOPEN",
    reopenPass ? "PASS" : "FAIL",
    JSON.stringify({
      trackOk,
      volOk,
      offOk,
      expectedStart,
      afterStart: after?.startSeconds,
      afterVol: after?.volume,
      uiVolAfter,
    })
  );

  if (reopenPass) {
    report.classification = "IPHONE_OFFSET_TEST_ARTIFACT — prior fail was inside-window tap without move; product offset persistence PASS";
    setV("OFFSET_CLASSIFICATION", "IPHONE_OFFSET_TEST_ARTIFACT");
  } else if (trackOk && volOk && !offOk) {
    report.classification = "IPHONE_OFFSET_PERSISTENCE_PRODUCT_DEFECT — non-zero offset set in UI but not restored after reopen";
    setV("OFFSET_CLASSIFICATION", "IPHONE_OFFSET_PERSISTENCE_PRODUCT_DEFECT");
  } else {
    report.classification = "IPHONE_OFFSET_GATE_PARTIAL_FAIL";
    setV("OFFSET_CLASSIFICATION", "PARTIAL_FAIL");
  }

  writeFileSync(join(OUT, "IPHONE-OFFSET-PERSISTENCE-GATE.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(OUT, "IPHONE-OFFSET-PERSISTENCE-GATE.md"),
    [
      "# iPhone Offset Persistence Gate",
      "",
      `- Classification: **${report.classification}**`,
      `- IPHONE_PROJECT_SAVE_REOPEN: **${(report.verdicts as Record<string, string>).IPHONE_PROJECT_SAVE_REOPEN}**`,
      `- Expected startSeconds: ${expectedStart}`,
      `- After reopen startSeconds: ${after?.startSeconds}`,
      "",
      "See `IPHONE-OFFSET-PERSISTENCE-GATE.json`.",
      "",
    ].join("\n")
  );

  console.log("\n" + JSON.stringify({
    classification: report.classification,
    IPHONE_PROJECT_SAVE_REOPEN: (report.verdicts as Record<string, string>).IPHONE_PROJECT_SAVE_REOPEN,
    expectedStart,
    after,
  }, null, 2));

  cdp.close();
  process.exit(reopenPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  writeFileSync(join(OUT, "IPHONE-OFFSET-PERSISTENCE-GATE.json"), JSON.stringify({ ...report, fatal: String(err) }, null, 2));
  process.exit(1);
});
