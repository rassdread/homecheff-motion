import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  MOTION_BOTTOM_SHEET_MOBILE_MQ,
  shouldMotionBottomSheetLockBody,
} from "@/components/ui/motion-bottom-sheet";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("MotionBottomSheet document scroll lock", () => {
  it("only locks body on mobile viewport when open", () => {
    assert.equal(
      shouldMotionBottomSheetLockBody({ open: true, lockBodyScroll: true, mobileViewport: false }),
      false,
      "desktop lg+ must not lock body even when sheet open"
    );
    assert.equal(
      shouldMotionBottomSheetLockBody({ open: true, lockBodyScroll: true, mobileViewport: true }),
      true,
      "mobile open sheet locks body"
    );
    assert.equal(
      shouldMotionBottomSheetLockBody({ open: false, lockBodyScroll: true, mobileViewport: true }),
      false,
      "mobile closed sheet restores body scroll"
    );
  });

  it("respects lockBodyScroll=false", () => {
    assert.equal(
      shouldMotionBottomSheetLockBody({ open: true, lockBodyScroll: false, mobileViewport: true }),
      false
    );
  });

  it("gates body lock with media query matching lg:hidden sheet", () => {
    const sheet = read("src/components/ui/motion-bottom-sheet.tsx");
    assert.equal(MOTION_BOTTOM_SHEET_MOBILE_MQ, "(max-width: 1023px)");
    assert.match(sheet, /lg:hidden/);
    assert.match(sheet, /shouldMotionBottomSheetLockBody/);
    assert.match(sheet, /lockBodyScroll = true/);
    assert.match(sheet, /if \(!lockBody\)/);
  });

  it("mobile assistant sheet defaults closed on desktop", () => {
    const provider = read("src/components/assistant/homecheff-assistant-provider.tsx");
    assert.match(provider, /Mobile bottom sheet only/);
    assert.match(provider, /const \[open, setOpen\] = useState\(false\)/);
  });

  it("Growth Sidebar desktop layout does not depend on mobile sheet open", () => {
    const mount = read("src/components/assistant/homecheff-assistant-mount.tsx");
    const layout = read("src/components/growth/growth-sidebar-layout.tsx");
    assert.match(mount, /GrowthSidebarLayout showSidebar/);
    assert.match(layout, /growth-sidebar-column/);
    const assistant = read("src/components/assistant/homecheff-assistant.tsx");
    assert.match(assistant, /lg:hidden/);
    assert.match(assistant, /setOpen\(true\)/);
  });
});

describe("assistant route document scroll contract", () => {
  const auditedRoutes = [
    "/",
    "/editor",
    "/studio",
    "/motion",
    "/publish",
    "/projects",
    "/library",
    "/usage",
    "/studio/assets",
    "/studio/assets/browse",
    "/animate/instant",
  ];

  it("desktop default state keeps body scroll unlocked on all audited routes", () => {
    for (const route of auditedRoutes) {
      assert.equal(
        shouldMotionBottomSheetLockBody({
          open: false,
          lockBodyScroll: true,
          mobileViewport: false,
        }),
        false,
        `${route} desktop should not lock body when mobile sheet closed`
      );
    }
  });

  it("mobile sheet open locks body only below lg breakpoint", () => {
    assert.equal(
      shouldMotionBottomSheetLockBody({ open: true, lockBodyScroll: true, mobileViewport: true }),
      true
    );
    assert.equal(
      shouldMotionBottomSheetLockBody({ open: true, lockBodyScroll: true, mobileViewport: false }),
      false
    );
  });
});
