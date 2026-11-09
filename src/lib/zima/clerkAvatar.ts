/**
 * Clerk Avatar image URL and variant helpers.
 *
 * Sizing strategy:
 * Marker avatar cards are 76px square (and scaled by 1.08 to 82px when selected).
 * We construct stable 80px (1x), 160px (2x), and 240px (3x) square variants at quality 80,
 * delivered directly from Clerk's image CDN (`img.clerk.com`).
 *
 * Query transformation is restricted exclusively to valid HTTPS img.clerk.com URLs.
 * Other hosts (e.g. Convex storage) and local logos are preserved without modifications.
 */

export const CLERK_IMAGE_HOSTNAME = "img.clerk.com";
export const MARKER_AVATAR_QUALITY = 80;
export const MARKER_AVATAR_FIT = "crop";

export const MARKER_AVATAR_VARIANTS = [
  { density: "1x", size: 80 },
  { density: "2x", size: 160 },
  { density: "3x", size: 240 },
] as const;

export type ClerkImageOptions = {
  width: number;
  height: number;
  quality?: number;
  fit?: "crop" | "scale" | "scale-down" | string;
};

export type MarkerAvatarSources = {
  src: string;
  srcSet?: string;
};

/**
 * Checks whether the given string is a valid HTTPS img.clerk.com URL.
 */
export function isClerkImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.toLowerCase() === CLERK_IMAGE_HOSTNAME &&
      (parsed.port === "" || parsed.port === "443")
    );
  } catch {
    return false;
  }
}

/**
 * Constructs an optimized Clerk image CDN URL with specified dimensions and quality.
 * Preserves existing unrelated query parameters and replaces transformation parameters.
 * If the URL is not an img.clerk.com HTTPS URL, returns the original URL unchanged.
 */
export function getClerkImageUrl(
  url: string,
  options: ClerkImageOptions,
): string {
  if (!isClerkImageUrl(url)) {
    return url;
  }
  const parsed = new URL(url);
  parsed.searchParams.set("width", String(options.width));
  parsed.searchParams.set("height", String(options.height));
  if (typeof options.quality === "number") {
    parsed.searchParams.set("quality", String(options.quality));
  }
  if (options.fit) {
    parsed.searchParams.set("fit", options.fit);
  }
  return parsed.toString();
}

/**
 * Returns the src and srcSet for a map marker avatar card.
 * For Clerk images:
 *   - src: 80px variant (1x)
 *   - srcSet: 80px (1x), 160px (2x), 240px (3x)
 * For non-Clerk or local images:
 *   - src: original url
 *   - srcSet: undefined
 */
export function getMarkerAvatarSources(avatarUrl: string): MarkerAvatarSources {
  if (!isClerkImageUrl(avatarUrl)) {
    return { src: avatarUrl };
  }

  const url80 = getClerkImageUrl(avatarUrl, {
    width: 80,
    height: 80,
    quality: MARKER_AVATAR_QUALITY,
    fit: MARKER_AVATAR_FIT,
  });
  const url160 = getClerkImageUrl(avatarUrl, {
    width: 160,
    height: 160,
    quality: MARKER_AVATAR_QUALITY,
    fit: MARKER_AVATAR_FIT,
  });
  const url240 = getClerkImageUrl(avatarUrl, {
    width: 240,
    height: 240,
    quality: MARKER_AVATAR_QUALITY,
    fit: MARKER_AVATAR_FIT,
  });

  return {
    src: url80,
    srcSet: `${url80} 1x, ${url160} 2x, ${url240} 3x`,
  };
}

/**
 * Comparison variant generator for single 120px option (used during validation).
 */
export function getSingle120AvatarSources(
  avatarUrl: string,
): MarkerAvatarSources {
  if (!isClerkImageUrl(avatarUrl)) {
    return { src: avatarUrl };
  }
  const url120 = getClerkImageUrl(avatarUrl, {
    width: 120,
    height: 120,
    quality: MARKER_AVATAR_QUALITY,
    fit: MARKER_AVATAR_FIT,
  });
  return {
    src: url120,
  };
}
