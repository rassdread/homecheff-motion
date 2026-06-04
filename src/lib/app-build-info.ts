/** Client-visible deploy marker (set at build time on Vercel). */
export type AppBuildInfo = {
  commitSha: string;
  deploymentId: string;
  buildTime: string;
  vercelEnv: string;
};

export function getAppBuildInfo(): AppBuildInfo {
  return {
    commitSha:
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
      process.env.NEXT_PUBLIC_BUILD_COMMIT_SHA?.trim() ||
      "local",
    deploymentId:
      process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID?.trim() ||
      process.env.NEXT_PUBLIC_BUILD_DEPLOYMENT_ID?.trim() ||
      "local",
    buildTime:
      process.env.NEXT_PUBLIC_BUILD_TIME?.trim() ||
      process.env.NEXT_PUBLIC_VERCEL_BUILD_COMPLETED_AT?.trim() ||
      "",
    vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() || process.env.NODE_ENV || "",
  };
}
