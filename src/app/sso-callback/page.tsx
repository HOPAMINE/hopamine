"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import {
  activateOAuthSession,
  getLoadedClerkInstance,
} from "@/lib/auth/ssoCallback";
import { isZimaHost } from "@/lib/zima/domain";
import {
  clearHexLoadRevealOnArrival,
  markHexLoadRevealOnArrival,
} from "@/components/zima/hexload/HexLoadTransition";
import { getZimaAuthHref } from "@/lib/zima/routes";

function SSOCallbackContent() {
  const wrapperClerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clerkLoaded = wrapperClerk.loaded;
  // Clerk consumes the OAuth attempt on the first call, so a second call (dev
  // Strict Mode re-runs effects) falls through to Clerk's sign-in fallback.
  const oauthCallbackStartedRef = useRef(false);

  useEffect(() => {
    if (!clerkLoaded || oauthCallbackStartedRef.current) return;
    oauthCallbackStartedRef.current = true;

    let cancelled = false;
    const go = (to: string) => {
      if (cancelled) return;
      cancelled = true;
      router.replace(to);
    };

    async function finish() {
      const clerk = getLoadedClerkInstance(wrapperClerk);
      const hostname = window.location.hostname;
      const isZima = isZimaHost(hostname);
      // Clerk may navigate to the destination itself below, so the destination is flagged up front.
      if (isZima) markHexLoadRevealOnArrival();
      const next =
        searchParams.get("redirect_url") ??
        searchParams.get("after_sign_in_url") ??
        (isZima ? "/" : "/dashboard");
      const signInUrl = isZima
        ? getZimaAuthHref("sign-in", next, hostname).split("?")[0] ?? "/sign-in"
        : "/sign-in";
      const signUpUrl = isZima
        ? getZimaAuthHref("sign-up", next, hostname).split("?")[0] ?? "/sign-up"
        : "/sign-up";

      // A sign-in that Clerk completed server-side arrives with the session
      // already active and the sign-in attempt consumed. Running Clerk's
      // callback then finds nothing to do and bounces to the sign-in page.
      if (clerk.isSignedIn && clerk.session) {
        go(next);
        return;
      }

      let clerkDeadEndedAt: string | null = null;
      try {
        // Shared Hopamine Clerk instance. `transferable: false` stops Clerk from
        // opaquely creating an account for an unknown Google identity; existing
        // accounts still authenticate (including ones that started from the
        // sign-up form, which Clerk transfers into a sign-in). On success Clerk
        // navigates to the force redirect URL itself; on a dead end it hands
        // us the auth page it wanted instead of navigating.
        await clerk.handleRedirectCallback(
          {
            transferable: false,
            signInUrl,
            signUpUrl,
            signInForceRedirectUrl: next,
            signUpForceRedirectUrl: next,
          },
          async (to) => {
            clerkDeadEndedAt = to;
          },
        );
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.debug("[sso-callback] handleRedirectCallback threw:", err);
        }
      }
      if (cancelled) return;

      const hasSession = await activateOAuthSession(clerk);
      if (cancelled) return;

      if (process.env.NODE_ENV === "development") {
        console.debug("[sso-callback] state after callback:", {
          hasSession,
          next,
          clerkDeadEndedAt,
          isSignedIn: clerk.isSignedIn,
          signInStatus: clerk.client?.signIn?.status,
          signUpStatus: clerk.client?.signUp?.status,
          signedInSessions: clerk.client?.signedInSessions?.length ?? 0,
        });
      }

      if (hasSession) {
        go(next);
        return;
      }

      // No Hopamine account for this identity — clear OAuth state, then sign up.
      cancelled = true;
      clearHexLoadRevealOnArrival();
      const noAccountUrl = isZima
        ? `${signUpUrl}?notice=no-account&redirect_url=${encodeURIComponent(next)}`
        : `/sign-up?notice=no-account&redirect_url=${encodeURIComponent(next)}`;

      try {
        await clerk.signOut({ redirectUrl: noAccountUrl });
      } catch {
        window.location.replace(noAccountUrl);
      }
    }

    void finish();

    return () => {
      cancelled = true;
    };
  }, [wrapperClerk, clerkLoaded, router, searchParams]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-accent-navbar text-white">
      <div
        aria-hidden
        className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent"
      />
      <p className="font-mono text-sm uppercase tracking-wide">Signing you in...</p>
    </div>
  );
}

export default function SSOPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-accent-navbar">
          <p className="font-mono text-sm uppercase tracking-wide text-white">
            Loading...
          </p>
        </div>
      }
    >
      <SSOCallbackContent />
    </Suspense>
  );
}
