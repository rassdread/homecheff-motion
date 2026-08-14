import StudioSsoErrorClient from "./sso-error-client";
import { getAuthenticatedUser } from "@/server/auth/session";

export default async function StudioSsoErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const sessionUser = await getAuthenticatedUser();
  return (
    <StudioSsoErrorClient
      codeRaw={params.code}
      hasLegacySession={Boolean(sessionUser)}
    />
  );
}
