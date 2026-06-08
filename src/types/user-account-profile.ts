export type UserAccountProfile = {
  version: 1;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  locale: "nl" | "en";
  emailNotifications: boolean;
  productUpdates: boolean;
  privacyAnalytics: boolean;
  updatedAt: string;
};

export type UserAccountProfilePatch = Partial<
  Pick<
    UserAccountProfile,
    | "displayName"
    | "username"
    | "avatarUrl"
    | "locale"
    | "emailNotifications"
    | "productUpdates"
    | "privacyAnalytics"
  >
>;

export function emptyUserAccountProfile(userId: string, email: string): UserAccountProfile {
  const localPart = email.split("@")[0]?.trim() ?? "user";
  return {
    version: 1,
    userId,
    displayName: localPart,
    username: localPart.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) || "user",
    avatarUrl: null,
    locale: "nl",
    emailNotifications: true,
    productUpdates: true,
    privacyAnalytics: true,
    updatedAt: new Date(0).toISOString(),
  };
}

export function mergeUserAccountProfile(
  current: UserAccountProfile,
  patch: UserAccountProfilePatch
): UserAccountProfile {
  return {
    ...current,
    displayName:
      typeof patch.displayName === "string" ?
        patch.displayName.trim().slice(0, 80) || current.displayName
      : current.displayName,
    username:
      typeof patch.username === "string" ?
        patch.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) ||
        current.username
      : current.username,
    avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : current.avatarUrl,
    locale: patch.locale === "en" || patch.locale === "nl" ? patch.locale : current.locale,
    emailNotifications:
      typeof patch.emailNotifications === "boolean" ?
        patch.emailNotifications
      : current.emailNotifications,
    productUpdates:
      typeof patch.productUpdates === "boolean" ? patch.productUpdates : current.productUpdates,
    privacyAnalytics:
      typeof patch.privacyAnalytics === "boolean" ?
        patch.privacyAnalytics
      : current.privacyAnalytics,
    updatedAt: new Date().toISOString(),
  };
}

export function parseUserAccountProfile(raw: unknown): UserAccountProfile | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const userId = typeof row.userId === "string" ? row.userId.trim() : "";
  if (!userId || row.version !== 1) {
    return null;
  }
  return {
    version: 1,
    userId,
    displayName: typeof row.displayName === "string" ? row.displayName : "",
    username: typeof row.username === "string" ? row.username : "",
    avatarUrl: typeof row.avatarUrl === "string" ? row.avatarUrl : null,
    locale: row.locale === "en" ? "en" : "nl",
    emailNotifications: row.emailNotifications !== false,
    productUpdates: row.productUpdates !== false,
    privacyAnalytics: row.privacyAnalytics !== false,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date(0).toISOString(),
  };
}

export type UserAccountResponse = {
  email: string;
  profile: UserAccountProfile;
};
