/** Browser shims so @mediapipe/tasks-vision WASM can load in Node.js workers. */

let installed = false;

function patchCanvasElement(el: Record<string, unknown>): Record<string, unknown> {
  return Object.assign(el, {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    style: {},
  });
}

export function ensureMediaPipeNodeRuntime(): void {
  if (installed) {
    return;
  }
  installed = true;

  const g = globalThis as Record<string, unknown>;

  if (typeof g.import !== "function") {
    g.import = (url: string) => import(url);
  }

  if (typeof g.self === "undefined") {
    g.self = globalThis;
  }

  if (typeof g.document !== "undefined" && g.document && typeof (g.document as Document).body !== "undefined") {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createCanvas, Image } = require("@napi-rs/canvas") as typeof import("@napi-rs/canvas");

    g.HTMLCanvasElement = createCanvas(1, 1).constructor;
    g.HTMLImageElement = Image;
    g.Image = Image;

    const body = {
      appendChild: () => undefined,
      removeChild: () => undefined,
    };
    g.document = {
      createElement: (tag: string) => {
        if (tag === "canvas") {
          return patchCanvasElement(createCanvas(1, 1) as unknown as Record<string, unknown>);
        }
        if (tag === "img") {
          return patchCanvasElement(new Image() as unknown as Record<string, unknown>);
        }
        return patchCanvasElement({});
      },
      body,
    };
  } catch {
    const handler: ProxyHandler<object> = {
      get(_target, prop) {
        if (prop === "createElement") {
          return (tag: string) => {
            const el = patchCanvasElement({});
            if (tag === "canvas" && typeof OffscreenCanvas !== "undefined") {
              return patchCanvasElement(new OffscreenCanvas(1, 1) as unknown as Record<string, unknown>);
            }
            return el;
          };
        }
        if (prop === "body") {
          return {
            appendChild: () => undefined,
            removeChild: () => undefined,
          };
        }
        return undefined;
      },
      has() {
        return false;
      },
    };
    g.document = new Proxy({}, handler);
  }
}

export function resetMediaPipeNodeRuntimeForTests(): void {
  installed = false;
}
