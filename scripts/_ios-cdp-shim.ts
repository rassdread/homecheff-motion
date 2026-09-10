#!/usr/bin/env npx tsx
/**
 * iOS 26 CDP shim for ios_webkit_debug_proxy → Playwright connectOverCDP.
 *
 * iOS 26 site-isolation: Runtime/Page live on Frame targets, reached only via
 * Target.sendMessageToTarget. This shim presents a Chrome-like browser CDP
 * endpoint and rewrites session commands to sendMessageToTarget.
 */
import http from "node:http";
import WebSocket from "ws";

const WebSocketServer = WebSocket.Server;
const IOS_HTTP = process.env.IOS_CDP_HTTP ?? "http://127.0.0.1:9222";
const SHIM_PORT = Number(process.env.IOS_CDP_SHIM_PORT ?? "9333");
const SESSION = "ios-session-1";

type Json = Record<string, unknown>;

async function iosPages(): Promise<{ webSocketDebuggerUrl: string; title: string; url: string }[]> {
  const res = await fetch(`${IOS_HTTP}/json/list`);
  if (!res.ok) throw new Error(`ios list ${res.status}`);
  return (await res.json()) as { webSocketDebuggerUrl: string; title: string; url: string }[];
}

function log(...args: unknown[]) {
  process.stdout.write(`[shim] ${args.map(String).join(" ")}\n`);
}

class Bridge {
  private upstream: WebSocket;
  private client: WebSocket;
  private targetId: string | null = null;
  private pageUrl = "https://studio.homecheff.eu/";
  private pageTitle = "HomeCheff Studio";
  private nextUpId = 1;
  private pendingUp = new Map<number, (msg: Json) => void>();
  private clientMsgIdToInner = new Map<number, number>(); // unused; keep for clarity
  private sessionCmdQueue: Json[] = [];
  private ready = false;

  constructor(client: WebSocket, upstream: WebSocket) {
    this.client = client;
    this.upstream = upstream;
    upstream.on("message", (data) => this.onUpstream(String(data)));
    client.on("message", (data) => this.onClient(String(data)));
    client.on("close", () => upstream.close());
    upstream.on("close", () => client.close());
  }

  private sendClient(msg: Json) {
    if (this.client.readyState === WebSocket.OPEN) this.client.send(JSON.stringify(msg));
  }

  private sendUp(method: string, params: Json = {}): Promise<Json> {
    const id = this.nextUpId++;
    return new Promise((resolve, reject) => {
      this.pendingUp.set(id, resolve);
      this.upstream.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pendingUp.has(id)) {
          this.pendingUp.delete(id);
          reject(new Error(`upstream timeout ${method}`));
        }
      }, 60_000);
    });
  }

  private sendToTarget(method: string, params: Json = {}, clientId?: number) {
    if (!this.targetId) {
      if (clientId != null) this.sendClient({ id: clientId, error: { message: "no target yet" } });
      return;
    }
    const innerId = this.nextUpId++;
    if (clientId != null) this.clientMsgIdToInner.set(innerId, clientId);
    const message = JSON.stringify({ id: innerId, method, params });
    this.upstream.send(
      JSON.stringify({
        id: this.nextUpId++,
        method: "Target.sendMessageToTarget",
        params: { targetId: this.targetId, message },
      })
    );
    // Wait for Target.dispatchMessageFromTarget with matching inner id
    this.pendingUp.set(innerId, (inner) => {
      if (clientId == null) return;
      if (inner.error) this.sendClient({ id: clientId, error: inner.error });
      else this.sendClient({ id: clientId, result: inner.result ?? {} });
    });
  }

  private onUpstream(raw: string) {
    const msg = JSON.parse(raw) as Json;
    if (msg.method === "Target.targetCreated") {
      const info = (msg.params as Json)?.targetInfo as Json;
      this.targetId = String(info?.targetId ?? "");
      this.pageUrl = String(info?.url ?? this.pageUrl);
      this.pageTitle = String(info?.title ?? this.pageTitle);
      log("targetCreated", this.targetId);
      this.ready = true;
      this.flushSessionQueue();
      return;
    }
    if (msg.method === "Target.dispatchMessageFromTarget" || msg.method === "Target.receivedMessageFromTarget") {
      const params = msg.params as Json;
      const inner = JSON.parse(String(params.message)) as Json;
      if (inner.method) {
        // Event from target → rebroadcast with sessionId for Playwright
        this.sendClient({ method: inner.method, params: inner.params, sessionId: SESSION });
        return;
      }
      if (inner.id != null && this.pendingUp.has(Number(inner.id))) {
        const done = this.pendingUp.get(Number(inner.id))!;
        this.pendingUp.delete(Number(inner.id));
        done(inner);
      }
      return;
    }
    if (msg.id != null && this.pendingUp.has(Number(msg.id))) {
      const done = this.pendingUp.get(Number(msg.id))!;
      this.pendingUp.delete(Number(msg.id));
      done(msg);
    }
  }

  private flushSessionQueue() {
    const q = this.sessionCmdQueue.splice(0);
    for (const msg of q) this.handleSessionCommand(msg);
  }

  private handleSessionCommand(msg: Json) {
    const method = String(msg.method ?? "");
    const id = msg.id as number | undefined;
    const params = (msg.params as Json) ?? {};
    // Strip Playwright session wrapper — already session-scoped
    this.sendToTarget(method, params, id);
  }

  private pageInfo() {
    return {
      targetId: this.targetId ?? "ios-page-1",
      type: "page",
      title: this.pageTitle,
      url: this.pageUrl,
      attached: true,
      canAccessOpener: false,
    };
  }

  ingestClient(raw: string) {
    this.onClient(raw);
  }

  private onClient(raw: string) {
    const msg = JSON.parse(raw) as Json;
    const method = String(msg.method ?? "");
    const id = msg.id as number | undefined;
    log(">>", method, id ?? "");

    if (msg.sessionId) {
      if (!this.ready) this.sessionCmdQueue.push(msg);
      else this.handleSessionCommand(msg);
      return;
    }

    if (method === "Browser.getVersion") {
      this.sendClient({
        id,
        result: {
          protocolVersion: "1.3",
          product: "Safari/iOS WebKit",
          revision: "ios26",
          userAgent: "Safari/iOS",
          jsVersion: "Safari",
        },
      });
      return;
    }
    if (method === "Browser.getBrowserContexts" || method === "Target.getBrowserContexts") {
      this.sendClient({ id, result: { browserContextIds: [""] } });
      return;
    }
    if (method === "Browser.setDownloadBehavior") {
      this.sendClient({ id, result: {} });
      return;
    }
    if (method === "Target.setDiscoverTargets") {
      this.sendClient({ id, result: {} });
      if (this.targetId) {
        this.sendClient({ method: "Target.targetCreated", params: { targetInfo: this.pageInfo() } });
      }
      return;
    }
    if (method === "Target.setAutoAttach") {
      this.sendClient({ id, result: {} });
      const emitAttach = () => {
        this.sendClient({
          method: "Target.attachedToTarget",
          params: {
            sessionId: SESSION,
            targetInfo: this.pageInfo(),
            waitingForDebugger: false,
          },
        });
      };
      if (this.targetId) emitAttach();
      else {
        const wait = setInterval(() => {
          if (this.targetId) {
            clearInterval(wait);
            emitAttach();
          }
        }, 50);
        setTimeout(() => clearInterval(wait), 10000);
      }
      return;
    }
    if (method === "Target.getTargets") {
      this.sendClient({
        id,
        result: { targetInfos: this.targetId ? [this.pageInfo()] : [] },
      });
      return;
    }
    if (method === "Target.getTargetInfo") {
      this.sendClient({ id, result: { targetInfo: this.pageInfo() } });
      return;
    }
    if (method === "Target.attachToTarget") {
      this.sendClient({ id, result: { sessionId: SESSION } });
      this.sendClient({
        method: "Target.attachedToTarget",
        params: {
          sessionId: SESSION,
          targetInfo: this.pageInfo(),
          waitingForDebugger: false,
        },
      });
      return;
    }

    // Flat Runtime/Page from older clients → route to target
    if (method.startsWith("Runtime.") || method.startsWith("Page.") || method.startsWith("DOM.") || method.startsWith("Input.")) {
      if (!this.ready) this.sessionCmdQueue.push(msg);
      else this.handleSessionCommand(msg);
      return;
    }

    // Default stub success for unknown browser-level commands
    this.sendClient({ id, result: {} });
  }
}

async function main() {
  const wss = new WebSocketServer({ noServer: true });
  const server = http.createServer(async (req, res) => {
    const url = req.url ?? "/";
    if (url.startsWith("/json/version")) {
      const pages = await iosPages();
      if (!pages[0]) {
        res.writeHead(503);
        res.end("no ios pages");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          Browser: "Safari/iOS WebKit",
          "Protocol-Version": "1.3",
          "User-Agent": "Safari/iOS",
          webSocketDebuggerUrl: `ws://127.0.0.1:${SHIM_PORT}/devtools/browser/ios`,
        })
      );
      return;
    }
    if (url.startsWith("/json/list") || url === "/json" || url.startsWith("/json?")) {
      const pages = await iosPages();
      const mapped = pages.map((p, i) => ({
        ...p,
        id: `ios-${i}`,
        type: "page",
        webSocketDebuggerUrl: `ws://127.0.0.1:${SHIM_PORT}/devtools/page/${i}`,
        devtoolsFrontendUrl: `devtools://devtools/bundled/inspector.html?ws=127.0.0.1:${SHIM_PORT}/devtools/page/${i}`,
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(mapped));
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });

  server.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", async (client) => {
    const early: Buffer[] = [];
    const onEarly = (data: WebSocket.RawData) => early.push(Buffer.from(data as Buffer));
    client.on("message", onEarly);
    try {
      const pages = await iosPages();
      const upUrl = pages[0]?.webSocketDebuggerUrl?.replace("localhost", "127.0.0.1");
      if (!upUrl) {
        client.close();
        return;
      }
      const upstream = new WebSocket(upUrl);
      upstream.on("open", () => {
        log("upstream open", upUrl);
        client.off("message", onEarly);
        const bridge = new Bridge(client, upstream);
        for (const chunk of early) bridge.ingestClient(String(chunk));
      });
      upstream.on("error", (e) => {
        log("upstream error", e.message);
        client.close();
      });
    } catch (e) {
      log("connection fail", e);
      client.close();
    }
  });

  server.listen(SHIM_PORT, "127.0.0.1", () => {
    log(`listening http://127.0.0.1:${SHIM_PORT} (ios ${IOS_HTTP})`);
  });
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
