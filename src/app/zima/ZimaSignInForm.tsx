"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHexLoadTransition } from "@/components/zima/hexload/HexLoadTransition";
import { useEffect, useState, type FormEvent } from "react";
import {
  getZimaAuthHref,
  getZimaPostAuthRedirect,
} from "@/lib/zima/routes";
import { jetbrainsMono } from "../../../fonts";
import {
  ZimaAuthCard,
  ZimaAuthError,
  ZimaAuthField,
  ZimaAuthGoogleButton,
  ZimaAuthOrDivider,
  ZimaAuthSubmitButton,
} from "./ZimaAuthUI";
import { useZimaAuthAlert } from "./ZimaAuthShell";

export function ZimaSignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const searchParams = useSearchParams();
  const { coverAndNavigate } = useHexLoadTransition();
  const hostname =
    typeof window === "undefined" ? "" : window.location.hostname;
  const redirectTo =
    searchParams.get("redirect_url") ?? getZimaPostAuthRedirect(hostname);
  const ssoCallback = `/sso-callback?redirect_url=${encodeURIComponent(redirectTo)}`;
  const signUpHref = getZimaAuthHref("sign-up", redirectTo, hostname);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const { setAlert } = useZimaAuthAlert();

  useEffect(() => {
    setAlert(error ? <ZimaAuthError message={error} /> : null);
    return () => setAlert(null);
  }, [error, setAlert]);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded) return;

    setError("");

    if (!showPasswordStep) {
      if (!validateEmail(email)) {
        setError("Please enter a valid email address");
        return;
      }
      setShowPasswordStep(true);
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await coverAndNavigate(redirectTo, {
          beforeNavigate: () => setActive({ session: result.createdSessionId }),
        });
      } else {
        setError("Sign in failed. Please try again.");
      }
    } catch (err: unknown) {
      const clerkErr = err as {
        errors?: Array<{ code?: string; message?: string }>;
      };
      const firstError = clerkErr.errors?.[0];
      if (firstError?.code === "form_identifier_not_found") {
        setError("No account found for that email. Please create an account.");
      } else {
        setError(firstError?.message ?? "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLoaded || googleLoading) return;

    setGoogleLoading(true);
    setError("");

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: ssoCallback,
        redirectUrlComplete: ssoCallback,
      });
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ message?: string }> };
      setError(
        clerkErr.errors?.[0]?.message ?? "Failed to sign in with Google",
      );
      setGoogleLoading(false);
    }
  };

  return (
    <ZimaAuthCard>
      <ZimaAuthGoogleButton
        loading={googleLoading}
        disabled={!isLoaded || googleLoading}
        onClick={() => void handleGoogleSignIn()}
      />

      <ZimaAuthOrDivider />

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <ZimaAuthField
          id="zima-signin-email"
          label="Email"
          variant="rounded"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (showPasswordStep) {
              setShowPasswordStep(false);
              setPassword("");
            }
          }}
          placeholder="Enter your email"
          required
        />

        {showPasswordStep ? (
          <ZimaAuthField
            id="zima-signin-password"
            label="Password"
            variant="rounded"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />
        ) : null}

        <ZimaAuthSubmitButton
          disabled={loading || !isLoaded}
          label={loading ? "Signing in…" : "Continue"}
        />
      </form>

      <p
        className={`${jetbrainsMono.className} mt-6 text-center text-[13px] text-neutral-600`}
      >
        Don&apos;t have an account?{" "}
        <Link
          href={signUpHref}
          className="font-semibold text-[#00a6f3] underline underline-offset-4"
        >
          Create your account
        </Link>
      </p>
    </ZimaAuthCard>
  );
}
