/** Keeps post-login redirects on this site. Anything else falls back to the account page. */
export function safeNext(value: string | null | undefined, fallback = "/account") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("\\") || value.includes("\n") || value.includes("\r") || value.includes("://")) return fallback;
  return value;
}
