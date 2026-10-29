import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handleFilmQueueRetryRejection,
  pumpFilmQueue,
  scheduleFilmDrain,
} from "./video-worker";

describe("film queue retry rejection", () => {
  it("handles a rejected retry without terminating the process", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (error: unknown) => {
      unhandled.push(error);
    };
    process.on("unhandledRejection", onUnhandled);
    const logs: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      logs.push(args);
    };
    let scheduled = 0;
    try {
      const error = new Error("DATABASE_URL");
      error.name = "PrismaClientInitializationError";
      handleFilmQueueRetryRejection(Promise.reject(error), () => {
        scheduled += 1;
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(unhandled.length, 0);
      assert.equal(scheduled, 1);
      assert.match(JSON.stringify(logs), /film_queue_retry_failed/);
      assert.match(JSON.stringify(logs), /PrismaClientInitializationError/);
    } finally {
      console.error = original;
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("keeps a successful queue promise from scheduling another retry", async () => {
    let scheduled = 0;
    handleFilmQueueRetryRejection(Promise.resolve(), () => {
      scheduled += 1;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(scheduled, 0);
  });

  it("completes an empty queue drain", async () => {
    await pumpFilmQueue(async () => null);
  });

  it("does not start a second drain while one retry is already scheduled", () => {
    const pending: ReturnType<typeof setTimeout>[] = [];
    const original = global.setTimeout;
    global.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      const id = original(handler, timeout, ...args);
      pending.push(id);
      return id;
    }) as typeof setTimeout;
    try {
      scheduleFilmDrain();
      scheduleFilmDrain();
      assert.equal(pending.length, 1);
    } finally {
      global.setTimeout = original;
      for (const id of pending) clearTimeout(id);
    }
  });
});
