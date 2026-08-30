/**
 * Studio multi-tab session identity contracts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

test("STUDIO_AUTH_CHANNEL and guard wired", () => {
  const channel = read("src/lib/identity/studio-session-identity-channel.ts");
  assert.match(channel, /homecheff-studio-auth/);
  assert.match(channel, /clearStudioIdentityBoundClientResidue/);
  assert.match(channel, /hc-instant-wizard/);

  const guard = read("src/components/identity/studio-session-identity-guard.tsx");
  assert.match(guard, /visibilitychange/);
  assert.match(guard, /pageshow/);
  assert.match(guard, /\/api\/auth\/session/);
  assert.match(guard, /Sessie gewijzigd/);

  const shell = read("src/components/layout/app-shell.tsx");
  assert.match(shell, /StudioSessionIdentityGuard/);

  const bar = read("src/components/layout/app-shell-user-bar.tsx");
  assert.match(bar, /postStudioAuthChannel/);
  assert.match(bar, /type: "logout"/);
});

test("studio_session remains host-only", () => {
  const session = read("src/server/auth/session.ts");
  assert.doesNotMatch(session, /Domain:\s*["']\.homecheff\.eu["']/);
});
