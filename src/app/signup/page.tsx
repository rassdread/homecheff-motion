import { SignupPageContent } from "@/components/auth/signup-page-content";
import { prisma } from "@/lib/prisma";

type Search = Promise<{ invite?: string | string[] }>;

export default async function SignupPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const raw = sp.invite;
  const inviteFromQuery = typeof raw === "string" ? raw.trim() : "";

  const userCount = await prisma.user.count();
  const inviteRequired = userCount > 0;
  const showBootstrapHint = userCount === 0;
  const showForm = !inviteRequired || inviteFromQuery.length > 0;

  return (
    <SignupPageContent
      inviteFromQuery={inviteFromQuery}
      inviteRequired={inviteRequired}
      showBootstrapHint={showBootstrapHint}
      showForm={showForm}
    />
  );
}
