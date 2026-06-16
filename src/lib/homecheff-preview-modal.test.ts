import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { lockPreviewModalBodyScroll } from "@/lib/homecheff-preview-modal-body-lock";
import { resolvePreviewModalKeyAction } from "@/lib/homecheff-preview-modal-logic";
import { growthSidebarLayoutClasses } from "@/lib/growth-sidebar-layout";
import {
  spaceGalleryPreviewHasNext,
  spaceGalleryPreviewHasPrev,
  spaceGalleryPreviewIndexAfterNext,
  spaceGalleryPreviewIndexAfterPrev,
} from "@/lib/space-gallery-preview";
import { studioVisual } from "@/lib/studio-visual-tokens";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function zIndexFromClass(token: string): number {
  const match = token.match(/z-\[(\d+)\]/);
  return match ? Number(match[1]) : 0;
}

describe("HomeCheff preview modal", () => {
  it("renders through a portal on document.body", () => {
    const modal = read("src/components/ui/homecheff-preview-modal.tsx");
    assert.match(modal, /createPortal/);
    assert.match(modal, /document\.body/);
    assert.match(modal, /data-portal-target="document\.body"/);
  });

  it("uses app-level z-index above Growth Sidebar and bottom sheets", () => {
    const modal = read("src/components/ui/homecheff-preview-modal.tsx");
    assert.match(modal, /studioVisual\.appModalOverlay/);
    const overlayZ = zIndexFromClass(studioVisual.appModalZ);
    assert.ok(overlayZ >= 1000, "modal overlay z-index must be >= 1000");
    assert.ok(overlayZ > 50, "modal must be above motion bottom sheet z-50");
    assert.ok(overlayZ > 30, "modal must be above studio header z-30");
    assert.doesNotMatch(growthSidebarLayoutClasses.sidebarColumn, /z-\[/);
  });

  it("renders persistent close button with accessible label", () => {
    const modal = read("src/components/ui/homecheff-preview-modal.tsx");
    const gallery = read("src/components/examples/space-gallery.tsx");
    assert.match(modal, /data-testid="homecheff-preview-modal-close"/);
    assert.match(modal, /aria-label=\{closeLabel\}/);
    assert.match(modal, /examples\.gallery\.close/);
    assert.match(read("src/i18n/locales/en.ts"), /"examples\.gallery\.close": "Close preview"/);
    assert.match(gallery, /HomeCheffPreviewModal/);
    assert.match(gallery, /onClose=\{closePreview\}/);
  });

  it("close button is fixed top-right with safe area inset", () => {
    const modal = read("src/components/ui/homecheff-preview-modal.tsx");
    assert.match(modal, /studioVisual\.appModalClose/);
    assert.match(modal, /safe-area-inset-top/);
    assert.match(modal, /safe-area-inset-right/);
    assert.match(modal, /onClick=\{onClose\}/);
  });

  it("prev and next controls are fixed in modal viewport with test ids", () => {
    const modal = read("src/components/ui/homecheff-preview-modal.tsx");
    assert.match(modal, /data-testid="homecheff-preview-modal-prev"/);
    assert.match(modal, /data-testid="homecheff-preview-modal-next"/);
    assert.match(modal, /studioVisual\.appModalNavBtn/);
    assert.match(modal, /disabled=\{!hasPrev\}/);
    assert.match(modal, /disabled=\{!hasNext\}/);
  });

  it("backdrop click closes modal", () => {
    const modal = read("src/components/ui/homecheff-preview-modal.tsx");
    assert.match(modal, /data-testid="homecheff-preview-modal"[\s\S]*onClick=\{onClose\}/);
    assert.match(modal, /onClick=\{\(e\) => e\.stopPropagation\(\)\}/);
  });

  it("locks body scroll while open and releases on cleanup", () => {
    const modal = read("src/components/ui/homecheff-preview-modal.tsx");
    assert.match(modal, /lockPreviewModalBodyScroll/);
  });
});

describe("lockPreviewModalBodyScroll", () => {
  it("restores previous overflow on unlock", () => {
    const body = { style: { overflow: "visible" as string } };
    const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
    Object.defineProperty(globalThis, "document", {
      value: { body },
      configurable: true,
    });
    try {
      const unlock = lockPreviewModalBodyScroll();
      assert.equal(body.style.overflow, "hidden");
      unlock();
      assert.equal(body.style.overflow, "visible");
    } finally {
      if (previous) {
        Object.defineProperty(globalThis, "document", previous);
      } else {
        delete (globalThis as { document?: unknown }).document;
      }
    }
  });
});

describe("HomeCheff preview modal (continued)", () => {
  it("ESC key closes modal", () => {
    assert.equal(resolvePreviewModalKeyAction("Escape", {}), "close");
    const modal = read("src/components/ui/homecheff-preview-modal.tsx");
    assert.match(modal, /resolvePreviewModalKeyAction/);
    assert.match(modal, /action === "close"\) onClose\(\)/);
  });

  it("arrow keys navigate when enabled", () => {
    assert.equal(resolvePreviewModalKeyAction("ArrowLeft", { hasPrev: true }), "prev");
    assert.equal(resolvePreviewModalKeyAction("ArrowLeft", { hasPrev: false }), null);
    assert.equal(resolvePreviewModalKeyAction("ArrowRight", { hasNext: true }), "next");
    assert.equal(resolvePreviewModalKeyAction("ArrowRight", { hasNext: false }), null);
    const modal = read("src/components/ui/homecheff-preview-modal.tsx");
    assert.match(modal, /action === "prev"\) onPrev/);
    assert.match(modal, /action === "next"\) onNext/);
  });

  it("close button is native button for keyboard Enter and Space", () => {
    const modal = read("src/components/ui/homecheff-preview-modal.tsx");
    assert.match(modal, /<button[\s\S]*data-testid="homecheff-preview-modal-close"/);
    assert.match(modal, /type="button"/);
  });
});

describe("resolvePreviewModalKeyAction", () => {
  it("returns null for unrelated keys", () => {
    assert.equal(resolvePreviewModalKeyAction("Enter", {}), null);
    assert.equal(resolvePreviewModalKeyAction("Tab", {}), null);
  });
});

describe("space gallery preview navigation", () => {
  it("next button advances item", () => {
    assert.equal(spaceGalleryPreviewIndexAfterNext(0, 3), 1);
    assert.equal(spaceGalleryPreviewIndexAfterNext(2, 3), 2);
    assert.equal(spaceGalleryPreviewHasNext(0, 3), true);
    assert.equal(spaceGalleryPreviewHasNext(2, 3), false);
  });

  it("previous button goes back", () => {
    assert.equal(spaceGalleryPreviewIndexAfterPrev(1), 0);
    assert.equal(spaceGalleryPreviewIndexAfterPrev(0), 0);
    assert.equal(spaceGalleryPreviewHasPrev(1), true);
    assert.equal(spaceGalleryPreviewHasPrev(0), false);
  });

  it("space gallery wires preview navigation helpers", () => {
    const gallery = read("src/components/examples/space-gallery.tsx");
    assert.match(gallery, /spaceGalleryPreviewIndexAfterNext/);
    assert.match(gallery, /spaceGalleryPreviewIndexAfterPrev/);
    assert.match(gallery, /spaceGalleryPreviewHasPrev/);
    assert.match(gallery, /spaceGalleryPreviewHasNext/);
  });
});
