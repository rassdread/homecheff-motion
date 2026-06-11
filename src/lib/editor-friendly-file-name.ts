export type FriendlyFileDisplay = {
  title: string;
  subtitle: string;
  assetType: string;
  roleSuggestion?: string;
};

function truncateHash(name: string): string {
  const stripped = name.replace(/\.[^.]+$/, "");
  if (/^[a-f0-9]{8,}$/i.test(stripped)) {
    return `${stripped.slice(0, 8)}…`;
  }
  return stripped.length > 28 ? `${stripped.slice(0, 25)}…` : stripped;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferRoleSuggestion(name: string, role?: string): string | undefined {
  const lower = name.toLowerCase();
  if (role === "person" || /person|portrait|selfie|face|human/.test(lower)) {
    return "Possible person photo";
  }
  if (role === "outfit" || /outfit|jacket|dress|shirt|clothing/.test(lower)) {
    return "Outfit reference";
  }
  if (role === "animal" || /dog|cat|pet|animal|horse/.test(lower)) {
    return "Animal reference";
  }
  if (role === "logo" || /logo|brand/.test(lower)) {
    return "Brand asset";
  }
  if (role === "product" || /product|pack/.test(lower)) {
    return "Product photo";
  }
  if (/^[a-f0-9]{8,}/i.test(name)) {
    return "Uploaded image";
  }
  return undefined;
}

function inferAssetType(name: string, mimeHint?: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (mimeHint?.includes("png") || ext === "png") {
    return "PNG image";
  }
  if (mimeHint?.includes("webp") || ext === "webp") {
    return "WebP image";
  }
  if (mimeHint?.includes("jpeg") || ext === "jpg" || ext === "jpeg") {
    return "JPEG image";
  }
  return "Image";
}

export function buildFriendlyFileDisplay(input: {
  name: string;
  role?: string;
  uploadedAt?: string;
  libraryAssetType?: string;
}): FriendlyFileDisplay {
  const hashLike = /^[a-f0-9]{12,}/i.test(input.name.replace(/\.[^.]+$/, ""));
  const roleSuggestion = inferRoleSuggestion(input.name, input.role);
  const cleanedName = titleCase(input.name.replace(/\.[^.]+$/, ""));

  let title = roleSuggestion ?? cleanedName;
  if (!hashLike && cleanedName.length > 2 && cleanedName !== roleSuggestion) {
    title = cleanedName;
  }

  const originalPart = hashLike ? `Original file: ${truncateHash(input.name)}` : undefined;
  const typePart = input.libraryAssetType ?? inferAssetType(input.name);
  const datePart = input.uploadedAt ? "uploaded recently" : "uploaded today";
  const subtitle = [typePart, originalPart ?? datePart].filter(Boolean).join(" · ");

  return {
    title,
    subtitle,
    assetType: typePart,
    roleSuggestion,
  };
}
