import { NextResponse } from "next/server";
import { sessaoValida, SESSION_COOKIE_NAME } from "@/lib/session";

export async function proxy(request) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (await sessaoValida(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
