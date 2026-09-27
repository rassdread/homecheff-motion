import { cookies, headers } from "next/headers";
import {
  ECOSYSTEM_LOCALE_COOKIE,
  ECOSYSTEM_LOCALE_PREF_COOKIE,
  MARKETPLACE_LEGACY_LOCALE_COOKIE,
  countryFromRequestHeaders,
  parseEcosystemLanguage,
  resolveEcosystemLanguage,
  type EcosystemLanguage,
} from "@/lib/ecosystem-locale";

/** Same resolution as the document lang: explicit cookie, then cookie, then country, then English. */
export async function resolveStudioRequestLocale(): Promise<EcosystemLanguage> {
  const jar = await cookies();
  const h = await headers();
  const fromHeader = parseEcosystemLanguage(h.get("x-hc-locale"));
  if (fromHeader) return fromHeader;
  const eco = parseEcosystemLanguage(jar.get(ECOSYSTEM_LOCALE_COOKIE)?.value);
  const legacy = parseEcosystemLanguage(
    jar.get(MARKETPLACE_LEGACY_LOCALE_COOKIE)?.value ?? jar.get("hc_locale")?.value,
  );
  const cookieLanguage = eco ?? legacy;
  const prefFlag = jar.get(ECOSYSTEM_LOCALE_PREF_COOKIE)?.value;
  const countryCode = countryFromRequestHeaders((name) => h.get(name));
  return resolveEcosystemLanguage({
    explicitLanguage: prefFlag === "1" ? cookieLanguage : null,
    cookieLanguage,
    countryCode,
  });
}
