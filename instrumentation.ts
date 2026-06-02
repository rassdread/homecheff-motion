export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }
  const { logVisionSetupWarningsOnce } = await import(
    "@/server/animation-export/local-vision/vision-setup-validation"
  );
  await logVisionSetupWarningsOnce();
}
