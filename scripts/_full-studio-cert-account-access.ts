#!/usr/bin/env npx tsx
/**
 * CERT_ACCOUNT_PRODUCTION_PROVIDER_ACCESS — grant / revoke bounded promotional credits.
 *
 * Usage:
 *   npx tsx scripts/_full-studio-cert-account-access.ts grant
 *   npx tsx scripts/_full-studio-cert-account-access.ts revoke
 *   npx tsx scripts/_full-studio-cert-account-access.ts status
 *
 * No emails in source. Account id comes from CERT_ACCOUNT_USER_ID env or default known cert id.
 */
import { config } from "dotenv";
config({ path: ".env" });

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { adminAdjustCredits } from "../src/server/studio-account/studio-wallet-service";
import { getActionCost } from "../src/server/studio-account/studio-action-cost-registry";
import { ensureStudioAccount } from "../src/server/studio-account/ensure-studio-account";

const OUT = join("docs/audits/full-studio-cert");
const CERT_USER_ID = process.env.CERT_ACCOUNT_USER_ID?.trim() || "cmqj9b4rt0000lb04otsiu32e";
const SYSTEM_ACTOR = "system:full-studio-cert";

const REASON_GRANT = "FULL_STUDIO_CERTIFICATION";
const REASON_REVOKE = "FULL_STUDIO_CERTIFICATION_REVOKE_UNUSED";

/**
 * Bound from registry + observed Production gate (motion_render = 450).
 * A: 450 + 450 retry
 * C: 5×scene_generation(30) + 2×image_edit(15) + 2×character_generation
 * D: 3×voice(15) + 2×music(40) + 3×sfx(20)
 * Buffer: ~200
 */
function computeGrant(): { amount: number; breakdown: Record<string, number> } {
  const motion = getActionCost("motion_render")!.defaultCreditCost;
  const scene = getActionCost("scene_generation")!.defaultCreditCost;
  const edit = getActionCost("image_edit")!.defaultCreditCost;
  const character = getActionCost("character_generation")!.defaultCreditCost;
  const voice = getActionCost("voice_generation")!.defaultCreditCost;
  const music = getActionCost("music_generation")!.defaultCreditCost;
  const sfx = getActionCost("sfx_generation")!.defaultCreditCost;

  const breakdown = {
    A_rode_loper_motion: motion,
    A_retry_reserve: motion,
    C_scene_images: scene * 5,
    C_scene5_rerender: edit * 2,
    C_characters: character * 2,
    D_voice: voice * 3,
    D_music: music * 2,
    D_sfx: sfx * 3,
    buffer: 200,
  };
  const amount = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { amount, breakdown };
}

async function status() {
  await ensureStudioAccount(CERT_USER_ID);
  const user = await prisma.user.findUnique({
    where: { id: CERT_USER_ID },
    select: { id: true, role: true, isActive: true },
  });
  const wallet = await prisma.studioWallet.findUnique({ where: { userId: CERT_USER_ID } });
  const account = await prisma.studioAccount.findUnique({ where: { userId: CERT_USER_ID } });
  const recent = await prisma.studioLedgerEntry.findMany({
    where: { userId: CERT_USER_ID },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      actionType: true,
      creditsDelta: true,
      balanceAfter: true,
      creditOrigin: true,
      createdAt: true,
      metadataJson: true,
    },
  });
  return {
    at: new Date().toISOString(),
    certAccountId: CERT_USER_ID,
    role: user?.role ?? null,
    isActive: user?.isActive ?? null,
    accountType: account?.accountType ?? null,
    studioPlan: account?.studioPlan ?? null,
    wallet: wallet
      ? {
          balance: wallet.balance,
          promotionalBalance: wallet.promotionalBalance,
          purchasedBalance: wallet.purchasedBalance,
          reservedBalance: wallet.reservedBalance,
          available: wallet.balance - wallet.reservedBalance,
          lifetimeGranted: wallet.lifetimeGranted,
        }
      : null,
    recentLedger: recent.map((r) => ({
      id: r.id,
      actionType: r.actionType,
      creditsDelta: r.creditsDelta,
      balanceAfter: r.balanceAfter,
      creditOrigin: r.creditOrigin,
      createdAt: r.createdAt.toISOString(),
      reason:
        r.metadataJson && typeof r.metadataJson === "object" && "reason" in r.metadataJson
          ? String((r.metadataJson as { reason?: string }).reason)
          : null,
    })),
  };
}

async function grant() {
  const { amount, breakdown } = computeGrant();
  await ensureStudioAccount(CERT_USER_ID);
  const before = await status();
  const result = await adminAdjustCredits({
    userId: CERT_USER_ID,
    creditsDelta: amount,
    adminUserId: SYSTEM_ACTOR,
    reason: REASON_GRANT,
    creditOrigin: "MANUAL_GRANT",
  });
  const after = await status();
  return {
    action: "grant",
    mechanism: "bounded_promotional_credits_via_adminAdjustCredits",
    reason: REASON_GRANT,
    amount,
    breakdown,
    ledgerId: result.ledgerId,
    balanceAfter: result.balanceAfter,
    before: before.wallet,
    after: after.wallet,
    isolationNote:
      "role unchanged (user); accountType remains free; only promotional balance increased via ledger",
  };
}

async function revoke() {
  await ensureStudioAccount(CERT_USER_ID);
  const before = await status();
  const availablePromo = before.wallet?.promotionalBalance ?? 0;
  if (availablePromo <= 0) {
    return {
      action: "revoke",
      skipped: true,
      reason: "no promotional balance to revoke",
      before: before.wallet,
    };
  }
  const result = await adminAdjustCredits({
    userId: CERT_USER_ID,
    creditsDelta: -availablePromo,
    adminUserId: SYSTEM_ACTOR,
    reason: REASON_REVOKE,
    creditOrigin: "MANUAL_GRANT",
  });
  const after = await status();
  return {
    action: "revoke",
    revoked: availablePromo,
    reason: REASON_REVOKE,
    ledgerId: result.ledgerId,
    balanceAfter: result.balanceAfter,
    before: before.wallet,
    after: after.wallet,
  };
}

async function main() {
  const cmd = (process.argv[2] || "status").toLowerCase();
  mkdirSync(OUT, { recursive: true });
  let result: unknown;
  if (cmd === "grant") result = await grant();
  else if (cmd === "revoke") result = await revoke();
  else result = await status();

  const path = join(OUT, `CERT-ACCOUNT-ACCESS-${cmd.toUpperCase()}.json`);
  writeFileSync(path, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
