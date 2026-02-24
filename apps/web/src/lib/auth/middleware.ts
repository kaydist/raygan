import { NextResponse, type NextRequest } from "next/server";
import { STORAGE_KEYS } from "../constants";

const PUBLIC_ROUTES = ["/", "/pricing", "/docs", "/about", "/contact"];
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/callback", "/email-verified"];
const PROTECTED_ROUTE_PREFIXES = ["/dashboard", "/workspace"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/docs/");
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

function isProtectedRoute(pathname: string): boolean {
  if (PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  const projectRoutePattern = /^\/[a-zA-Z0-9-]+$/;
  if (projectRoutePattern.test(pathname) && !isPublicRoute(pathname) && !isAuthRoute(pathname)) {
    return true;
  }
  return false;
}

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(STORAGE_KEYS.ACCESS_TOKEN)?.value;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (!accessToken && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (accessToken && isAuthRoute(pathname) && !pathname.startsWith("/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
