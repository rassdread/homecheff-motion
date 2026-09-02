import { cookies } from "next/headers";
import {
  parseStudioUtmCookieValue,
  STUDIO_UTM_COOKIE,
  type StudioUtmCapture,
} from "@/lib/acquisition/utm-persistence";

/** Read first-touch Studio UTM cookie from the request (server). */
export async function readStudioUtmFromCookies(): Promise<StudioUtmCapture | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(STUDIO_UTM_COOKIE)?.value;
    return parseStudioUtmCookieValue(raw);
  } catch {
    return null;
  }
}
