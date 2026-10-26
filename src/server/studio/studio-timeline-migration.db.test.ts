/**
 * Disposable certification of the additive timeline SQL.
 * Refuses every database except homecheff_timeline_migrate_cert on localhost.
 * Does not write _prisma_migrations and does not touch Preview or Production.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hashPassword } from "@/server/auth/session";

const CERT_DB = "homecheff_timeline_migrate_cert";

function isolatedDatabaseUrl(): string | null {
  const url = process.env.TIMELINE_MIGRATE_DATABASE_URL?.trim() ?? "";
  if (!url) return null;
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("Migration certification host is not local.");
  }
  if (name !== CERT_DB) throw new Error("Migration certification database name is not disposable.");
  if (/neon|vercel|preview|prod/i.test(`${parsed.hostname}${name}`)) {
    throw new Error("Migration certification URL looks remote.");
  }
  return url;
}

function migrationStatements(): string[] {
  const sql = readFileSync(new URL("../../../prisma/migrations/20261020120000_studio_timeline/migration.sql", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return sql.split(";").map((statement) => statement.trim()).filter(Boolean);
}

test("timeline SQL is additive, preserves fixtures, and rolls back", { timeout: 120_000 }, async (t) => {
  const url = isolatedDatabaseUrl();
  if (!url) {
    t.skip("TIMELINE_MIGRATE_DATABASE_URL is not configured");
    return;
  }
  process.env.DATABASE_URL = url;
  delete process.env.OPENAI_API_KEY;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.ELEVENLABS_API_KEY;
  const { prisma } = await import("@/lib/prisma");

  const beforeTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  assert.ok(beforeTables.some((row) => row.table_name === "StudioCreativeProject"));
  assert.equal(beforeTables.some((row) => row.table_name === "StudioWallet"), true);
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "StudioTimelineClip", "StudioTimelineTrack", "StudioTimeline"`);
  const withoutTimeline = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'StudioTimeline'
    ) AS "exists"
  `;
  assert.equal(withoutTimeline[0]?.exists, false);

  const user = await prisma.user.create({
    data: { email: `timeline-migrate-${Date.now()}@example.test`, passwordHash: hashPassword("local-only"), role: "user" },
  });
  await prisma.studioAccount.create({ data: { userId: user.id, accountType: "creator", accountStatus: "active" } });
  await prisma.studioWallet.create({ data: { userId: user.id, balance: 40, promotionalBalance: 40, lifetimeGranted: 40 } });
  const { createOwnedFilmProject, createFilmScene } = await import("@/server/studio/studio-film-preparation");
  const viewer = { id: user.id, role: "user" as const };
  const created = await createOwnedFilmProject({
    ownerId: user.id,
    title: "Migration fixture",
    description: "Existing project",
    idempotencyKey: `migrate-${Date.now()}`,
  });
  assert.equal("error" in created, false);
  if ("error" in created) return;
  const scene = await createFilmScene(user.id, created.projectId, viewer, "Existing scene");
  assert.equal("error" in scene, false);
  if ("error" in scene) return;
  await prisma.studioLibraryAsset.create({
    data: {
      ownerId: user.id,
      projectId: created.projectId,
      family: "image",
      title: "Existing still",
      sourceKind: "scene_image",
      sourceId: scene.scene.id,
      downloadUrl: "file:///tmp/existing-still.png",
    },
  });

  async function fixture() {
    const project = await prisma.studioCreativeProject.findUniqueOrThrow({ where: { id: created.projectId } });
    const wallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: user.id } });
    const scenes = await prisma.studioScene.count({ where: { storyboardId: created.storyboardId ?? "" } });
    const assets = await prisma.studioLibraryAsset.count({ where: { ownerId: user.id } });
    const users = await prisma.user.count({ where: { id: user.id } });
    return {
      title: project.title,
      storyboardId: project.storyboardId,
      balance: wallet.balance,
      reserved: wallet.reservedBalance,
      scenes,
      assets,
      users,
    };
  }
  const original = await fixture();

  const statements = migrationStatements();
  const rewritesExistingData = /^(drop|delete|update|truncate)\b/i;
  const altersUnrelatedTable = /^alter table "(?!StudioTimeline)/i;
  assert.equal(statements.some((statement) => rewritesExistingData.test(statement) || altersUnrelatedTable.test(statement)), false);
  await prisma.$executeRawUnsafe("BEGIN");
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  await prisma.$executeRawUnsafe("COMMIT");

  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename IN ('StudioTimeline', 'StudioTimelineTrack', 'StudioTimelineClip')
  `;
  const indexNames = indexes.map((row) => row.indexname).sort();
  for (const name of [
    "StudioTimeline_pkey",
    "StudioTimeline_projectId_key",
    "StudioTimelineTrack_timelineId_type_language_key",
    "StudioTimelineTrack_timelineId_sortOrder_key",
    "StudioTimelineClip_track_request_key",
  ]) {
    assert.equal(indexNames.includes(name), true, name);
  }
  const foreignKeys = await prisma.$queryRaw<Array<{ conname: string }>>`
    SELECT conname FROM pg_constraint
    WHERE contype = 'f' AND conname LIKE 'StudioTimeline%'
  `;
  assert.equal(foreignKeys.length, 3);
  assert.deepEqual(await fixture(), original);

  let secondApplyFailed = false;
  await prisma.$executeRawUnsafe("BEGIN");
  try {
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
  } catch {
    secondApplyFailed = true;
  }
  await prisma.$executeRawUnsafe("ROLLBACK");
  assert.equal(secondApplyFailed, true);
  const stillThere = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'StudioTimeline'
    ) AS "exists"
  `;
  assert.equal(stillThere[0]?.exists, true);
  assert.deepEqual(await fixture(), original);

  const { createFilmTimeline } = await import("@/server/studio/studio-timeline-service");
  const timeline = await createFilmTimeline(user.id, created.projectId);
  assert.equal("error" in timeline, false);
  if ("error" in timeline || !timeline.timeline) return;
  assert.ok(timeline.timeline.tracks.some((track) => track.type === "VIDEO"));
  assert.deepEqual(await fixture(), original);

  await prisma.$executeRawUnsafe(`DROP TABLE "StudioTimelineClip", "StudioTimelineTrack", "StudioTimeline"`);
  const afterRollback = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'StudioTimeline'
    ) AS "exists"
  `;
  assert.equal(afterRollback[0]?.exists, false);
  assert.deepEqual(await fixture(), original);
  const projectStill = await prisma.studioCreativeProject.findUnique({ where: { id: created.projectId } });
  assert.equal(projectStill?.title, "Migration fixture");
  await prisma.$disconnect();
});
