import { SignupPageContent } from "@/components/auth/signup-page-content";
import { prisma } from "@/lib/prisma";

type Search = Promise<{ invite?: string | string[] }>;

export default async function SignupPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const raw = sp.invite;
  const inviteFromQuery = typeof raw === "string" ? raw.trim() : "";

  const userCount = await prisma.user.count();
  const showBootstrapHint = userCount === 0;

  return (
    <SignupPageContent inviteFromQuery={inviteFromQuery} showBootstrapHint={showBootstrapHint} />
  );
}
