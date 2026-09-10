import { getAuthenticatedUser } from "@/server/auth/session";
import { prisma } from "@/lib/prisma";
import { getActiveLocale } from "@/i18n";

type WalletRow = {
  availableHc: number;
  reservedHc: number;
  status: string | null;
};

function formatInt(n: number) {
  return Number.isFinite(n) ? Math.trunc(n).toLocaleString() : "—";
}

async function loadWallet(userId: string) {
  const identity = await prisma.user.findUnique({
    where: { id: userId },
    select: { centralUserId: true },
  });
  if (!identity?.centralUserId) {
    return { identityResolved: false, wallet: null as WalletRow | null };
  }

  const rows = await prisma.$queryRaw<WalletRow[]>`
    SELECT "availableHc","reservedHc", status::text AS status
    FROM "HcWallet"
    WHERE "ownerType" = 'PERSONAL'
      AND "centralUserId" = ${identity.centralUserId}
      AND "growthWorkspaceId" = ''
    LIMIT 1
  `;

  return { identityResolved: true, wallet: rows[0] ?? null };
}

export default async function AccountWalletPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return null;
  }

  const locale = getActiveLocale();
  const copy =
    locale === "nl"
      ? {
          label: "HC-tegoed",
          ecosystem:
            "Je HC-tegoed is beschikbaar voor ondersteunde HC-diensten binnen het HomeCheff-ecosysteem.",
          available: "Beschikbaar",
          reserved: "Gereserveerd",
          status: "Status",
          missing: "ONTBREEKT",
          unresolved: "IDENTITEIT_NIET_GEKOPPELD",
        }
      : {
          label: "HC balance",
          ecosystem: "Your HC balance is available for supported HC services in the HomeCheff ecosystem.",
          available: "Available",
          reserved: "Reserved",
          status: "Status",
          missing: "MISSING",
          unresolved: "IDENTITY_UNRESOLVED",
        };

  const result = await loadWallet(user.id);
  const availableHc = Number(result.wallet?.availableHc ?? 0);
  const reservedHc = Number(result.wallet?.reservedHc ?? 0);
  const walletStatus = result.wallet?.status ?? null;

  return (
    <section className="rounded-2xl border border-white/15 bg-white/5 p-5 text-white">
      <p className="text-xs uppercase tracking-wide text-white/60">{copy.label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{formatInt(availableHc)} HC</p>
      <p className="mt-2 text-sm text-white/70">{copy.ecosystem}</p>

      <div className="mt-5 space-y-2 text-sm text-white/80">
        <div className="flex items-center justify-between">
          <span>{copy.available}</span>
          <span className="font-semibold text-white">{formatInt(availableHc)} HC</span>
        </div>
        {reservedHc > 0 ? (
          <div className="flex items-center justify-between">
            <span>{copy.reserved}</span>
            <span className="font-semibold text-white">{formatInt(reservedHc)} HC</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span>{copy.status}</span>
          <span className="font-semibold text-white">
            {result.identityResolved ? walletStatus ?? copy.missing : copy.unresolved}
          </span>
        </div>
      </div>
    </section>
  );
}
