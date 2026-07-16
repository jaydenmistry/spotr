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
