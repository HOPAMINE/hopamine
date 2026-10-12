import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { getZimaSiteUrl, isZimaHost } from "@/lib/zima/domain";

function isZimaSitePath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/social") ||
    pathname.startsWith("/chats") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/onboard") ||
    pathname.startsWith("/api/zima") ||
    pathname.startsWith("/sso-callback") ||
    pathname.startsWith("/zima/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg"
  );
}

function handleZimaRouting(req: NextRequest): NextResponse | null {
  const host = req.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search, protocol, port } = req.nextUrl;

  if (isZimaHost(host)) {
    if (pathname === "/zima" || pathname === "/zima/") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (!isZimaSitePath(pathname) && !pathname.includes(".")) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/zima/search";
      return NextResponse.rewrite(url);
    }

    if (pathname === "/sign-in" || pathname.startsWith("/sign-in/")) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(/^\/sign-in/, "/zima/sign-in");
      return NextResponse.rewrite(url);
    }

    if (pathname === "/sign-up" || pathname.startsWith("/sign-up/")) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(/^\/sign-up/, "/zima/sign-up");
      return NextResponse.rewrite(url);
    }

    if (pathname === "/profile" || pathname.startsWith("/profile/")) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(/^\/profile/, "/zima/profile");
      return NextResponse.rewrite(url);
    }

    if (pathname === "/settings" || pathname.startsWith("/settings/")) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(/^\/settings/, "/zima/settings");
      return NextResponse.rewrite(url);
    }

    if (pathname === "/social" || pathname.startsWith("/social/")) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(/^\/social/, "/zima/social");
      return NextResponse.rewrite(url);
    }

    if (pathname === "/search" || pathname.startsWith("/search/")) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(/^\/search/, "/zima/search");
      return NextResponse.rewrite(url);
    }

    if (pathname === "/chats" || pathname.startsWith("/chats/")) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(/^\/chats/, "/zima/chats");
      return NextResponse.rewrite(url);
    }

    if (pathname === "/onboard" || pathname.startsWith("/onboard/")) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(/^\/onboard/, "/zima/onboard");
      return NextResponse.rewrite(url);
    }

    return null;
  }

  if (pathname === "/") {
    const zimaUrl = getZimaSiteUrl("/search", search, protocol, port);
    return NextResponse.redirect(zimaUrl, 307);
  }

  if (pathname === "/zima" || pathname.startsWith("/zima/")) {
    if (/\.[a-z0-9]+$/i.test(pathname)) {
      return null;
    }

    const zimaPath = pathname.replace(/^\/zima/, "") || "/";
    const zimaUrl = getZimaSiteUrl(zimaPath, search, protocol, port);
    return NextResponse.redirect(zimaUrl, 308);
  }

  return null;
}

/** Marketing + auth routes stay public; expand `isPublicRoute` as you add app-only sections. */
const isPublicRoute = createRouteMatcher([
  "/",
  "/projects(.*)",
  "/builders(.*)",
  "/social(.*)",
  "/directory(.*)",
  "/001(.*)",
  "/sponsor-tee(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/profile-compare(.*)",
  "/zima",
  "/zima/search(.*)",
  "/zima/sign-in(.*)",
  "/zima/sign-up(.*)",
  "/zima/onboard(.*)",
  "/api/zima(.*)",
  "/pixel(.*)",
  "/favicon.ico",
  "/icon.svg",
]);

const isAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isZimaAuthRoute = createRouteMatcher([
  "/zima/sign-in(.*)",
  "/zima/sign-up(.*)",
]);

function getZimaSignInRedirect(req: NextRequest): URL {
  const host = req.headers.get("host")?.split(":")[0] ?? "";
  return new URL(isZimaHost(host) ? "/sign-in" : "/zima/sign-in", req.url);
}

export default clerkMiddleware(async (auth, req) => {
  const zimaResponse = handleZimaRouting(req);
  if (zimaResponse) {
    return zimaResponse;
  }

  // Public browse pages don't need a Clerk session check. Awaiting auth() here
  // was hanging for 20s+ when Clerk was slow and aborting RSC soft navigations.
  if (isPublicRoute(req) && !isAuthRoute(req)) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  if (userId && (isAuthRoute(req) || isZimaAuthRoute(req))) {
    if (isZimaAuthRoute(req)) {
      const host = req.headers.get("host")?.split(":")[0] ?? "";
      return NextResponse.redirect(new URL(isZimaHost(host) ? "/" : "/zima", req.url));
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isPublicRoute(req) && !userId) {
    if (
      req.nextUrl.pathname.startsWith("/zima/profile") ||
      req.nextUrl.pathname.startsWith("/zima/settings") ||
      req.nextUrl.pathname.startsWith("/zima/chats") ||
      req.nextUrl.pathname.startsWith("/zima/onboard")
    ) {
      return NextResponse.redirect(getZimaSignInRedirect(req));
    }

    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
