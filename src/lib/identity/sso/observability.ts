/**
 * SP.2B — safe Studio SSO observability (no secrets / emails / tokens).
 */

export type StudioSsoObsEvent =
  | "silent_sso_attempt"
  | "silent_sso_success"
  | "silent_sso_no_central_session"
  | "silent_sso_failure"
  | "silent_sso_loop_prevented"
  | "product_session_created"
  | "product_session_reused"
  | "sso_interaction_started"
  | "sso_callback_received"
  | "silent_sso"
  | "interactive_login"
  | "account_switch_requested"
  | "google_account_selected"
  | "email_login_selected"
  | "claim_identity_confirmed"
  | "claim_cancelled"
  | "existing_identity_candidate_found"
  | "existing_identity_linked"
  | "jit_product_user_created"
  | "identity_not_linked"
  | "identity_conflict"
  | "central_identity_claim"
  | "sso_success"
  | "sso_failure";

export function logStudioSsoEvent(
  event: StudioSsoObsEvent,
  meta: Record<string, string | number | boolean | null | undefined> = {},
): void {
  const safe: Record<string, string | number | boolean | null> = { event };
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined) continue;
    const key = k.toLowerCase();
    if (
      key.includes("password") ||
      key.includes("token") ||
      key.includes("secret") ||
      key.includes("hash") ||
      key === "email" ||
      key.endsWith("email")
    ) {
      continue;
    }
    safe[k] = v;
  }
  console.info(JSON.stringify(safe));
}
