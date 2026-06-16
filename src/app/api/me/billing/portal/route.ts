import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { createStripeCustomerPortalSession } from "@/server/studio-account/stripe-billing";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let returnPath = "/account/billing";
  try {
    const body = (await request.json()) as { returnPath?: string };
    if (body.returnPath?.trim()) {
      returnPath = body.returnPath.trim();
    }
  } catch {
    /* optional body */
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const result = await createStripeCustomerPortalSession({
    userId: user.id,
    email: user.email,
    returnUrl: `${baseUrl}${returnPath}`,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true, url: result.url }, { status: 200 });
}
