import { HOMECHEFF_SAFARI_ICON_URLS } from "@/lib/homecheff-brand-icon";

/** Explicit head links for Safari icon cache busting (supplements metadata.icons). */
export function HomeCheffSafariIconLinks() {
  return (
    <>
      <link rel="icon" href={HOMECHEFF_SAFARI_ICON_URLS.faviconIco} sizes="any" />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href={HOMECHEFF_SAFARI_ICON_URLS.favicon32}
      />
      <link rel="apple-touch-icon" href={HOMECHEFF_SAFARI_ICON_URLS.appleTouchIcon} />
    </>
  );
}
