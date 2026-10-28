/**
 * Seeds synthetic users in homecheff_studio_v27_2_test only.
 * Refuses every other database.
 */
import { hashPassword } from "@/server/auth/session";

const DATABASE_URL = "postgresql://sergioarrias@127.0.0.1:5432/homecheff_studio_v27_2_test";
const PASSWORD = "v272-local-only-password";

function assertLocal() {
  const url = new URL(DATABASE_URL);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Seed refused a non-disposable database.");
  }
  if (/neon|homecheff\.eu|vercel/i.test(DATABASE_URL)) {
    throw new Error("Seed refused a protected database.");
  }
  process.env.DATABASE_URL = DATABASE_URL;
}

async function upsertUser(email: string, balance: number) {
  const { prisma } = await import("@/lib/prisma");
  const passwordHash = hashPassword(PASSWORD);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isActive: true },
    create: { email, passwordHash, role: "user", isActive: true },
  });
  await prisma.studioAccount.upsert({
    where: { userId: user.id },
    update: { accountStatus: "active" },
    create: { userId: user.id, accountType: "free", accountStatus: "active" },
  });
  await prisma.studioWallet.upsert({
    where: { userId: user.id },
    update: { balance, promotionalBalance: balance, purchasedBalance: 0, reservedBalance: 0 },
    create: {
      userId: user.id,
      balance,
      promotionalBalance: balance,
      purchasedBalance: 0,
      reservedBalance: 0,
      lifetimeGranted: balance,
    },
  });
  return user;
}

async function main() {
  assertLocal();
  const userA = await upsertUser("v272-user-a@studio.local.test", 500);
  const userB = await upsertUser("v272-user-b@studio.local.test", 100);
  const userC = await upsertUser("v272-user-c@studio.local.test", 0);
  const { prisma } = await import("@/lib/prisma");
  const slug = "v272-guide";
  const existing = await prisma.studioCharacter.findFirst({ where: { ownerId: userA.id, slug } });
  const character = existing ?? await prisma.studioCharacter.create({
    data: {
      ownerId: userA.id,
      name: "V272 Guide",
      slug,
      role: "human",
      referenceImageUrl: "",
      referenceStorageKey: "local/v272-guide",
    },
  });
  const counts = await prisma.user.count();
  console.log(JSON.stringify({
    users: counts,
    userA: userA.id,
    userB: userB.id,
    userC: userC.id,
    characterId: character.id,
    walletC: 0,
  }));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
