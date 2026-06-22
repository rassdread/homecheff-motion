import type { TranslationKey } from "@/i18n";

/** Canonical vision part labels → i18n keys for hierarchy/summary UI. */
export function visionPartDisplayLabelKey(rawLabel: string): TranslationKey | null {
  const lower = rawLabel.toLowerCase().trim();

  if (
    /\bsunglasses\b/.test(lower) ||
    /\b(aviator|pilot)\s*glasses\b/.test(lower) ||
    (/\beyewear\b/.test(lower) && /\bsun/i.test(lower))
  ) {
    return "editor.visionPart.sunglasses";
  }
  if (
    /\b(reading|prescription)\s*glasses\b/.test(lower) ||
    /\b(eyeglasses|spectacles|eyewear)\b/.test(lower) ||
    (/\bglasses\b/.test(lower) && !/\bsun/i.test(lower))
  ) {
    return "editor.visionPart.glasses";
  }
  if (/\bnecklace\b/.test(lower) || /\bketting\b/.test(lower)) {
    return "editor.visionPart.necklace";
  }
  if (/\bearrings?\b/.test(lower) || /\boorbellen\b/.test(lower)) {
    return "editor.visionPart.earrings";
  }
  if (/\bheadphones\b/.test(lower) || /\bearbuds\b/.test(lower) || /\bkoptelefoon\b/.test(lower)) {
    return "editor.visionPart.headphones";
  }
  if (/\bwatch\b/.test(lower) || /\bhorloge\b/.test(lower)) {
    return "editor.visionPart.watch";
  }
  if (/\b(bracelet|wristband|wrist band)\b/.test(lower) || /\barmband\b/.test(lower)) {
    return "editor.visionPart.bracelet";
  }
  if (/\bbackpack\b/.test(lower) || /\brugzak\b/.test(lower)) {
    return "editor.visionPart.backpack";
  }
  if (/\bbag\b/.test(lower) || /\btas\b/.test(lower)) {
    return "editor.visionPart.bag";
  }
  if (/\bhat\b/.test(lower) || /\bhoed\b/.test(lower)) {
    return "editor.visionPart.hat";
  }
  if (/\bcap\b/.test(lower) || /\bpet\b/.test(lower)) {
    return "editor.visionPart.cap";
  }
  if (/\bhelmet\b/.test(lower) || /\bhelm\b/.test(lower)) {
    return "editor.visionPart.helmet";
  }
  if (/\bbeard\b/.test(lower) || /\bbaard\b/.test(lower)) {
    return "editor.visionPart.beard";
  }
  if (/\b(moustache|mustache)\b/.test(lower) || /\bsnor\b/.test(lower)) {
    return "editor.visionPart.moustache";
  }
  if (/\bcollar\b/.test(lower) || /\bhalsband\b/.test(lower)) {
    return "editor.visionPart.collar";
  }
  if (/\bleash\b/.test(lower) || /\blijn\b/.test(lower)) {
    return "editor.visionPart.leash";
  }
  if (/\bharness\b/.test(lower) || /\bharnas\b/.test(lower)) {
    return "editor.visionPart.harness";
  }
  if (/\bbandana\b/.test(lower)) {
    return "editor.visionPart.bandana";
  }
  if (/\bbow\b/.test(lower) || /\bstrik\b/.test(lower)) {
    return "editor.visionPart.bow";
  }
  if (/\btoy\b/.test(lower) || /\bspeeltje\b/.test(lower)) {
    return "editor.visionPart.toy";
  }
  if (/\bglobe\b/.test(lower) || /\bwereldbol\b/.test(lower)) {
    return "editor.visionPart.globe";
  }
  if (/\bbadge\b/.test(lower)) {
    return "editor.visionPart.badge";
  }
  if (/\bmicrophone\b/.test(lower) || /\bmic\b/.test(lower)) {
    return "editor.visionPart.microphone";
  }
  if (/\blaptop\b/.test(lower)) {
    return "editor.visionPart.laptop";
  }
  if (/\bphone\b/.test(lower) || /\btelefoon\b/.test(lower)) {
    return "editor.visionPart.phone";
  }
  if (/\bmug\b/.test(lower) || /\bmok\b/.test(lower)) {
    return "editor.visionPart.mug";
  }

  return null;
}

export function localizeVisionPartLabel(
  label: string,
  t: (key: TranslationKey) => string
): string {
  const key = visionPartDisplayLabelKey(label);
  return key ? t(key) : label;
}
