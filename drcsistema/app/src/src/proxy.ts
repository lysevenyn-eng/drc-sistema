import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Next.js 16 renamed Middleware to Proxy (same functionality, new file name).
// This performs cheap, cookie-only "optimistic" redirects. Real authorization
// still happens server-side via requireSession()/requireAdmin() (see lib/session.ts).

const PUBLIC_PATHS = ["/login", "/register"];
// Compras e vendas envolve valores (custo de compra, receita/lucro de venda) — só
// admin deve ter acesso a valores financeiros, mesma regra já aplicada a
// /financeiro e /carteira (criador e caseiro ficam de fora igualmente).
const ADMIN_ONLY_PREFIXES = ["/financeiro", "/carteira", "/admin", "/compras-vendas"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!session) {
    if (isPublic || pathname === "/") return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session.status !== "aprovado") {
    if (pathname === "/access-pending") return NextResponse.next();
    return NextResponse.redirect(new URL("/access-pending", req.url));
  }

  if (isPublic || pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (
    ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) &&
    session.role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
