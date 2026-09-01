import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/server/auth/permissions";
import { getCentralHcWallet, isHcCentralAdapterReady } from "@/server/studio-account/hc-central-adapter";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  const linked = await prisma.user.findUnique({
    where: { id: user.id },
    select: { centralUserId: true },
  });
  const centralUserId = linked?.centralUserId?.trim() ?? "";
  if (!centralUserId) {
    return NextResponse.json(
      { ok: false, code: "CENTRAL_USER_REQUIRED" },
      { status: 400 },
    );
  }

  if (!isHcCentralAdapterReady()) {
    return NextResponse.json(
      { ok: false, code: "HC_CENTRAL_ADAPTER_NOT_READY" },
      { status: 503 },
    );
  }

  try {
    const wallet = await getCentralHcWallet(centralUserId);
    return NextResponse.json({
      ok: true,
      availableHc: wallet.availableHc,
      reservedHc: wallet.reservedHc,
      ledgerOwner: "homecheff-leads/HcWallet",
    });
  } catch {
    return NextResponse.json({ ok: false, code: "HC_WALLET_READ_FAILED" }, { status: 502 });
  }
}
