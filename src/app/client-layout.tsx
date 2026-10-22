"use client";

import { usePathname } from "next/navigation";
import Navbar from "../../components/Navbar";
import { UserGate } from "@/components/UserGate";
import { isPortalRoute, isProjectsRoute, isGreenNavRoute } from "@/lib/navRoutes";
import { PORTAL_GRADIENT_BG } from "@/lib/layoutConstants";
import { Providers } from "./providers";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = isPortalRoute(pathname);
  const usePortalGradient = isPortal && !isProjectsRoute(pathname) && !isGreenNavRoute(pathname);

  if (usePortalGradient) {
    return (
      <div className="relative min-h-dvh w-full">
        <div
          className={`pointer-events-none absolute inset-0 ${PORTAL_GRADIENT_BG}`}
          aria-hidden
        />
        <Navbar />
        <div className="relative">{children}</div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function scrollShellClass(pathname: string, isLanding: boolean): string {
  const overflow = isLanding ? "overflow-y-hidden" : "overflow-y-auto";
  if (isGreenNavRoute(pathname)) {
    return `h-dvh overflow-x-hidden bg-accent-events ${overflow}`;
  }
  // Solid blue routes + default so rubber-band overscroll never flashes white.
  return `h-dvh overflow-x-hidden bg-accent-navbar ${overflow}`;
}

export default function ClientLayout({
  children,
  isZimaSite = false,
}: Readonly<{
  children: React.ReactNode;
  isZimaSite?: boolean;
}>) {
  const pathname = usePathname();
  const isHopathon = pathname === "/hopathon" || pathname.startsWith("/hopathon/");
  const isZima =
    isZimaSite || pathname === "/zima" || pathname.startsWith("/zima/");
  const isPixel = pathname === "/pixel" || pathname.startsWith("/pixel/");
  const isLoadingPlayground =
    pathname === "/loading" || pathname.startsWith("/loading/");
  const isClaim = pathname === "/claim" || pathname.startsWith("/claim/");
  const isLanding = pathname === "/" && !isZimaSite;
  const isSsoCallback =
    pathname === "/sso-callback" || pathname.startsWith("/sso-callback/");
  const isSocial = pathname === "/social" || pathname.startsWith("/social/");

  if (isHopathon || isZima || isPixel || isLoadingPlayground) {
    if (isSocial) {
      return (
        <div className="h-dvh overflow-x-hidden overflow-y-auto bg-white">
          {children}
        </div>
      );
    }
    // OAuth lands on /sso-callback (not under /zima/*), but Zima host still skips
    // the default Providers shell — Clerk hooks need ClerkProvider here.
    if (isSsoCallback) {
      return <Providers>{children}</Providers>;
    }
    return <>{children}</>;
  }

  if (isClaim) {
    return (
      <Providers>
        <UserGate />
        {children}
      </Providers>
    );
  }

  return (
    <Providers>
      <UserGate />
      <div className={scrollShellClass(pathname, isLanding)}>
        <AppShell>{children}</AppShell>
      </div>
    </Providers>
  );
}
