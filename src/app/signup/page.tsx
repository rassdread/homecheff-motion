import { Suspense } from "react";
import { SignupPageContent } from "@/components/auth/signup-page-content";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { homecheffRegisterHrefForStudio } from "@/lib/identity/homecheff-origin";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import { prisma } from "@/lib/prisma";

type Search = Promise<{ invite?: string | string[]; next?: string | string[] }>;

async function SignupInner({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const raw = sp.invite;
  const inviteFromQuery = typeof raw === "string" ? raw.trim() : "";
  const returnTo = validateStudioReturnTo(typeof sp.next === "string" ? sp.next : undefined);

  const userCount = await prisma.user.count();
  const showBootstrapHint = userCount === 0;
  const ssoEnabled = isCentralSsoLive();
  const registerHref = homecheffRegisterHrefForStudio(returnTo);

  return (
    <SignupPageContent
      inviteFromQuery={inviteFromQuery}
      showBootstrapHint={showBootstrapHint}
      ssoEnabled={ssoEnabled}
      registerHref={registerHref}
    />
  );
}

export default function SignupPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl px-6 py-12 text-sm text-zinc-600">…</main>
      }
    >
      <SignupInner searchParams={searchParams} />
    </Suspense>
  );
}
