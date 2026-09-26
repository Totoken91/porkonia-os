import { NextResponse, type NextRequest } from "next/server";

/**
 * Contrôle d'accès minimal V1 (HTTP Basic) si PORKONIA_ADMIN_PASSWORD est défini.
 * L'API publique /api/public/* (lecture seule, contenu publié) reste accessible.
 * Phase 2 : remplacé par une authentification complète.
 */
export function proxy(req: NextRequest) {
  const password = process.env.PORKONIA_ADMIN_PASSWORD;
  if (!password || req.nextUrl.pathname.startsWith("/api/public/")) return NextResponse.next();
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const pass = decoded.slice(decoded.indexOf(":") + 1);
    if (pass.length === password.length && timingSafeEqual(pass, password)) return NextResponse.next();
  }
  return new NextResponse("Accès réservé au Ministère.", {
    status: 401,
    headers: { "www-authenticate": 'Basic realm="PORKONIA OS", charset="UTF-8"' },
  });
}

function timingSafeEqual(a: string, b: string) {
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const config = { matcher: ["/((?!_next/static|_next/image|brand/|icon.png).*)"] };
