import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OcrConcurrencyQueue } from "@/lib/ocr-concurrency-queue";

describe("OcrConcurrencyQueue", () => {
  it("limits concurrent executions", async () => {
    const queue = new OcrConcurrencyQueue(2);
    let running = 0;
    let maxRunning = 0;

    const task = async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 30));
      running -= 1;
    };

    await Promise.all([
      queue.run(task),
      queue.run(task),
      queue.run(task),
      queue.run(task),
    ]);

    assert.equal(maxRunning, 2);
  });
});
