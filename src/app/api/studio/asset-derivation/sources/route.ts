import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { listAssetDerivationSources } from "@/server/studio/list-asset-derivation-sources";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const sources = await listAssetDerivationSources(user);
  return NextResponse.json({ ok: true, sources });
}
