import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = ["/chat", "/admin"];

export async function localeGuard(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const pathname = request.nextUrl.pathname;
  const [, locale, ...rest] = pathname.split("/");
  const path = `/${rest.join("/")}`;

  const isProtected = protectedRoutes.some((route) => path.startsWith(route));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL(`/${locale || "en"}/login`, request.url));
  }

  return null;
}
