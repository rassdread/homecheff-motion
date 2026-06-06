import assert from "node:assert/strict";
import test from "node:test";
import { isTechnicalUserMessage, userFacingApiError } from "@/lib/user-facing-error";

test("isTechnicalUserMessage detects codes and env hints", () => {
  assert.ok(isTechnicalUserMessage("AUTH_REQUIRED"));
  assert.ok(isTechnicalUserMessage("Load failed due to access control checks."));
  assert.ok(isTechnicalUserMessage("Set OPENAI_API_KEY for scene images."));
  assert.equal(isTechnicalUserMessage("Could not save your storyboard."), false);
});

test("userFacingApiError returns fallback for technical messages", () => {
  assert.equal(
    userFacingApiError("AUTH_REQUIRED", "Please sign in again."),
    "Please sign in again."
  );
  assert.equal(
    userFacingApiError("Title is required.", "Could not save."),
    "Title is required."
  );
});

test("userFacingApiError preserves raw text for admins", () => {
  assert.equal(
    userFacingApiError("AUTH_REQUIRED", "Please sign in again.", { isAdmin: true }),
    "AUTH_REQUIRED"
  );
});
