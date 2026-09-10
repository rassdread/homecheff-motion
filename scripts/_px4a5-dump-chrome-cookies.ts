import { chromium } from "playwright";
import { join } from "node:path";

async function main(): Promise<void> {
  const profile = join(process.cwd(), ".px4a4-chrome-profile");
  const ctx = await chromium.launchPersistentContext(profile, { headless: true });
  const cookies = await ctx.cookies();
  const interesting = cookies.filter(
    (c) => /homecheff|studio/i.test(c.domain) || /session|auth|token|next-auth/i.test(c.name),
  );
  console.log(
    JSON.stringify(
      interesting.map((c) => ({
        name: c.name,
        domain: c.domain,
        path: c.path,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
        expires: c.expires,
        valLen: c.value?.length,
      })),
      null,
      2,
    ),
  );
  await ctx.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
