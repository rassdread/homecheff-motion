import {
  resolvePublicBlobUrlByPathname,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import {
  emptyUserAccountProfile,
  mergeUserAccountProfile,
  parseUserAccountProfile,
  type UserAccountProfile,
  type UserAccountProfilePatch,
} from "@/types/user-account-profile";

function accountProfilePathname(userId: string): string {
  return `studio/${userId}/account-profile.json`;
}

export async function readUserAccountProfile(params: {
  userId: string;
  email: string;
}): Promise<UserAccountProfile> {
  const pathname = accountProfilePathname(params.userId);
  const url = await resolvePublicBlobUrlByPathname(pathname);
  if (!url) {
    return emptyUserAccountProfile(params.userId, params.email);
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return emptyUserAccountProfile(params.userId, params.email);
    }
    const raw = await res.json();
    const parsed = parseUserAccountProfile(raw);
    if (!parsed || parsed.userId !== params.userId) {
      return emptyUserAccountProfile(params.userId, params.email);
    }
    return parsed;
  } catch {
    return emptyUserAccountProfile(params.userId, params.email);
  }
}

async function writeUserAccountProfile(profile: UserAccountProfile): Promise<void> {
  const pathname = accountProfilePathname(profile.userId);
  await uploadPublicBlob({
    pathname,
    body: Buffer.from(JSON.stringify(profile), "utf8"),
    contentType: "application/json",
    allowOverwrite: true,
    context: {
      uploadTarget: pathname,
      provider: "user_account_profile",
    },
  });
}

export async function patchUserAccountProfile(params: {
  userId: string;
  email: string;
  patch: UserAccountProfilePatch;
}): Promise<UserAccountProfile> {
  const current = await readUserAccountProfile({
    userId: params.userId,
    email: params.email,
  });
  const next = mergeUserAccountProfile(current, params.patch);
  await writeUserAccountProfile(next);
  return next;
}

export async function deleteUserAccountProfile(userId: string): Promise<void> {
  await writeUserAccountProfile({
    version: 1,
    userId,
    displayName: "",
    username: "",
    avatarUrl: null,
    locale: "nl",
    emailNotifications: false,
    productUpdates: false,
    privacyAnalytics: false,
    updatedAt: new Date().toISOString(),
  });
}
