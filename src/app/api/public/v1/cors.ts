/** API publique v1 : lecture seule, uniquement du contenu PUBLIÉ. CORS configurable. */
export function corsHeaders(): Record<string, string> {
  const origin = process.env.PORKONIA_PUBLIC_CORS_ORIGIN || "https://porkopedia.totoken.chatgpt.site";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
    "cache-control": "public, max-age=60",
    "content-type": "application/json; charset=utf-8",
  };
}
