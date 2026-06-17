import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { HOMECHEFF_EXAMPLES } from "@/lib/homecheff-examples";
import { studioShowcaseItemToExample } from "@/lib/showcase-item-mapper";
import {
  filterActiveShowcaseItems,
  isShowcaseItemScheduleActive,
  resolvePublicShowcaseExamples,
} from "@/lib/showcase-item-resolve";
import {
  SHOWCASE_MAX_IMAGE_BYTES,
  SHOWCASE_MAX_VIDEO_BYTES,
  validateShowcaseItemInput,
  validateShowcaseUpload,
} from "@/lib/showcase-media-rules";
import { spaceGalleryModalSrc } from "@/lib/space-gallery-media";
import type { StudioShowcaseItemRecord } from "@/types/studio-showcase-item";

const ROOT = process.cwd();

function sampleItem(overrides: Partial<StudioShowcaseItemRecord> = {}): StudioShowcaseItemRecord {
  return {
    id: "item-1",
    title: "Doelpunt vieren",
    subtitle: null,
    description: "Celebrate a goal with your character.",
    mediaType: "video",
    mediaUrl: "https://blob.example/clip.mp4",
    thumbnailUrl: "https://blob.example/thumb.jpg",
    posterUrl: "https://blob.example/poster.jpg",
    pageKey: "home",
    serviceKey: null,
    category: "social",
    assistantPrompt: "Ik wil een filmpje waarin ik een doelpunt vier.",
    ctaLabel: "Maak dit",
    ctaHref: null,
    sortOrder: 0,
    isActive: true,
    startsAt: null,
    endsAt: null,
    locale: null,
    createdByUserId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("studio showcase items CMS", () => {
  it("Prisma model StudioShowcaseItem exists", () => {
    const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
    assert.match(schema, /model StudioShowcaseItem/);
    assert.match(schema, /pageKey/);
    assert.match(schema, /assistantPrompt/);
  });

  it("admin CRUD routes exist", () => {
    const list = readFileSync(
      join(ROOT, "src/app/api/admin/showcase-items/route.ts"),
      "utf8"
    );
    const item = readFileSync(
      join(ROOT, "src/app/api/admin/showcase-items/[id]/route.ts"),
      "utf8"
    );
    assert.match(list, /export async function GET/);
    assert.match(list, /export async function POST/);
    assert.match(item, /export async function PATCH/);
    assert.match(item, /export async function DELETE/);
    assert.match(list, /requireAdmin/);
  });

  it("public API route exists with pageKey filter", () => {
    const route = readFileSync(join(ROOT, "src/app/api/showcase-items/route.ts"), "utf8");
    assert.match(route, /pageKey/);
    assert.match(route, /resolvePublicShowcaseExamples/);
  });

  it("public API returns active sorted items and respects inactive + date windows", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    assert.equal(isShowcaseItemScheduleActive(sampleItem(), now), true);
    assert.equal(isShowcaseItemScheduleActive(sampleItem({ isActive: false }), now), false);
    assert.equal(
      isShowcaseItemScheduleActive(
        sampleItem({ startsAt: "2026-07-01T00:00:00.000Z" }),
        now
      ),
      false
    );
    assert.equal(
      isShowcaseItemScheduleActive(sampleItem({ endsAt: "2026-06-01T00:00:00.000Z" }), now),
      false
    );

    const active = filterActiveShowcaseItems(
      [
        sampleItem({ id: "b", sortOrder: 2 }),
        sampleItem({ id: "a", sortOrder: 1 }),
        sampleItem({ id: "c", isActive: false, sortOrder: 0 }),
      ],
      now
    );
    assert.deepEqual(
      active.map((row) => row.id),
      ["a", "b"]
    );
  });

  it("pageKey filter and global fallback work", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const pageOnly = resolvePublicShowcaseExamples({
      pageKey: "motion",
      pageItems: [sampleItem({ id: "motion-1", pageKey: "motion" })],
      globalItems: [sampleItem({ id: "global-1", pageKey: "global" })],
      now,
    });
    assert.equal(pageOnly.source, "page");
    assert.equal(pageOnly.examples[0]?.id, "motion-1");

    const globalFallback = resolvePublicShowcaseExamples({
      pageKey: "editor",
      pageItems: [],
      globalItems: [sampleItem({ id: "global-1", pageKey: "global" })],
      now,
    });
    assert.equal(globalFallback.source, "global");
    assert.equal(globalFallback.examples[0]?.id, "global-1");
  });

  it("static HOMECHEFF_EXAMPLES fallback works when DB empty", () => {
    const resolved = resolvePublicShowcaseExamples({
      pageKey: "home",
      pageItems: [],
      globalItems: [],
    });
    assert.equal(resolved.source, "static");
    assert.equal(resolved.examples.length, HOMECHEFF_EXAMPLES.length);
  });

  it("admin upload validates media type and size", () => {
    assert.equal(
      validateShowcaseUpload({
        mimeType: "image/jpeg",
        sizeBytes: SHOWCASE_MAX_IMAGE_BYTES,
        slot: "media",
      }).ok,
      true
    );
    assert.equal(
      validateShowcaseUpload({
        mimeType: "application/pdf",
        sizeBytes: 1000,
        slot: "media",
      }).ok,
      false
    );
    assert.equal(
      validateShowcaseUpload({
        mimeType: "video/mp4",
        sizeBytes: SHOWCASE_MAX_VIDEO_BYTES + 1,
        slot: "media",
      }).ok,
      false
    );
    assert.equal(validateShowcaseItemInput({ title: "", mediaUrl: "x", mediaType: "image" }).ok, false);
    assert.equal(
      validateShowcaseItemInput({
        title: "T",
        description: "D",
        mediaUrl: "https://x/y.jpg",
        mediaType: "image",
      }).ok,
      true
    );
  });

  it("homepage and category pages use pageKey showcase fetch", () => {
    const showcase = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-space-showcase.tsx"),
      "utf8"
    );
    const landing = readFileSync(
      join(ROOT, "src/components/suite/studio-product-landing-page.tsx"),
      "utf8"
    );
    assert.match(showcase, /pageKey/);
    assert.match(showcase, /useShowcaseExamples/);
    assert.match(landing, /useShowcaseExamples/);
    assert.match(landing, /landingModuleKeyToShowcasePageKey/);
  });

  it("CTA with assistantPrompt triggers assistant flow wiring", () => {
    const hook = readFileSync(join(ROOT, "src/hooks/use-showcase-cta-action.ts"), "utf8");
    const gallery = readFileSync(join(ROOT, "src/components/examples/space-gallery.tsx"), "utf8");
    assert.match(hook, /assistantPrompt/);
    assert.match(hook, /sendMessage/);
    assert.match(hook, /storeShowcaseAssistantPending/);
    assert.match(gallery, /space-gallery-cta/);
    assert.match(gallery, /onCtaClick/);
  });

  it("modal supports image and video items", () => {
    const gallery = readFileSync(join(ROOT, "src/components/examples/space-gallery.tsx"), "utf8");
    assert.match(gallery, /space-gallery-modal-video/);
    assert.match(gallery, /space-gallery-modal-image/);
    const videoExample = studioShowcaseItemToExample(sampleItem());
    assert.equal(spaceGalleryModalSrc(videoExample), "https://blob.example/clip.mp4");
    const imageExample = studioShowcaseItemToExample(
      sampleItem({ mediaType: "image", mediaUrl: "https://blob.example/photo.jpg" })
    );
    assert.equal(spaceGalleryModalSrc(imageExample), "https://blob.example/photo.jpg");
  });

  it("admin showcase editor replaces read-only examples page", () => {
    const admin = readFileSync(join(ROOT, "src/app/admin/examples/page.tsx"), "utf8");
    const panel = readFileSync(
      join(ROOT, "src/components/admin/showcase-carousel-admin-panel.tsx"),
      "utf8"
    );
    assert.match(admin, /ShowcaseCarouselAdminPanel/);
    assert.doesNotMatch(admin, /listAllExamples/);
    assert.match(panel, /SpaceGallery/);
    assert.match(panel, /showcase-carousel-admin/);
  });
});
