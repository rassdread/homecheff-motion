import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  const users = await p.user.count();
  const wallets = await p.studioWallet.count();
  const accounts = await p.studioAccount.count();
  let projects = -1;
  try {
    projects = await p.studioCreativeProject.count();
  } catch {
    projects = -1;
  }
  const cols = await p.$queryRawUnsafe<Array<{ column_name: string; is_nullable: string }>>(
    `SELECT column_name, is_nullable FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'User'
       AND column_name IN ('centralUserId','centralLinkedAt','passwordHash')
     ORDER BY 1`,
  );
  const linked = await p.user.count({ where: { centralUserId: { not: null } } }).catch(() => -1);
  console.log(
    JSON.stringify(
      { users, wallets, accounts, projects, linked, columns: cols },
      null,
      2,
    ),
  );
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
