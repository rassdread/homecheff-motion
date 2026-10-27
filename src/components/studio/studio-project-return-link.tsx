"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useActiveTranslator } from "@/i18n/client";
import { safeStudioProjectReturnTo } from "@/lib/studio-return-to";

export function StudioProjectReturnLink() {
  const t = useActiveTranslator();
  const pathname = usePathname();
  const params = useSearchParams();
  const href = safeStudioProjectReturnTo(params.get("returnTo"));
  if (!href || pathname.startsWith("/studio/projects/")) return null;
  return (
    <div className="border-b border-zinc-200 bg-white px-4 py-2">
      <Link
        href={href}
        data-testid="studio-v23-return"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-[#006D52] underline-offset-2 hover:underline"
      >
        {t("studio.v23.workflow.return")}
      </Link>
    </div>
  );
}
