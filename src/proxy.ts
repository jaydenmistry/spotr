import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createNonce, nonceContentSecurityPolicy } from "@/lib/csp";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const token = await getToken({ req: request });

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Dev needs eval + HMR websockets, so the CSP only ships in production builds.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  // Next reads the nonce from the request's CSP header while rendering and
  // applies it to its scripts; the response carries the same policy.
  const csp = nonceContentSecurityPolicy(createNonce());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Exact complement of the static CSP's source in next.config.ts.
  matcher: ["/dashboard/:path*", "/login/:path*"],
};
