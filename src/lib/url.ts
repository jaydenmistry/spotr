/**
 * Returns true only for absolute http:/https: URLs. Guards anchor hrefs
 * against javascript:/data: schemes if the URL source is ever untrusted.
 */
export function isSafeHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Listing photos: https URLs, http upgraded to https (browsers would upgrade
 * them on an https page anyway), or inline data:image (the offline e2e
 * fixtures). Anything else is dropped, including URLs with embedded
 * credentials and http on a non-default port (which https can't reach), so
 * the CSP only has to allow `https:` and `data:` images.
 */
export function safePhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("data:image/")) return url;
  if (!isSafeHttpUrl(url)) return null;
  const parsed = new URL(url);
  if (parsed.username || parsed.password) return null;
  if (parsed.protocol === "http:") {
    if (parsed.port) return null;
    parsed.protocol = "https:";
  }
  return parsed.href;
}
