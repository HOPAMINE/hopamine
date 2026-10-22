"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignUp } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHexLoadTransition } from "@/components/zima/hexload/HexLoadTransition";
import { useEffect, useState, type FormEvent } from "react";
import {
  getZimaAuthHref,
  getZimaSignUpDestination,
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

function isSessionExistsError(err: unknown): boolean {
  const clerkErr = err as { errors?: Array<{ code?: string; message?: string }> };
  const firstError = clerkErr.errors?.[0];
  return (
    firstError?.code === "session_exists" ||
    firstError?.message === "Session already exists"
  );
}

export function ZimaSignUpForm() {
  const { signOut } = useClerk();
  const { isLoaded, signUp, setActive } = useSignUp();
  const searchParams = useSearchParams();
  const { coverAndNavigate } = useHexLoadTransition();
  const hostname =
    typeof window === "undefined" ? "" : window.location.hostname;
  const destination =
    searchParams.get("redirect_url") ?? getZimaSignUpDestination(hostname);
  const ssoCallback = `/sso-callback?redirect_url=${encodeURIComponent(destination)}`;
  const signInHref = getZimaAuthHref("sign-in", destination, hostname);
  const noAccount = searchParams.get("notice") === "no-account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { setAlert } = useZimaAuthAlert();

  useEffect(() => {
    if (!noAccount) return;
    void signOut().catch(() => {
      // Best-effort reset after a failed Google sign-in attempt.
    });
  }, [noAccount, signOut]);

  useEffect(() => {
    if (error) {
      setAlert(<ZimaAuthError message={error} />);
    } else if (noAccount) {
      setAlert(
        <div
          className={`${jetbrainsMono.className} border border-neutral-200 bg-neutral-100 px-4 py-3 text-[13px] leading-relaxed text-neutral-700`}
        >
          No Hopamine account matched that Google sign-in. Sign in with your
          existing account, or create one below.
        </div>,
      );
    } else {
      setAlert(null);
    }

    return () => setAlert(null);
  }, [error, noAccount, setAlert]);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded) return;

    setError("");
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.create({ emailAddress: email, password });

      if (result.status === "complete") {
        await coverAndNavigate(destination, {
          beforeNavigate: () => setActive({ session: result.createdSessionId }),
        });
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: unknown) {
      if (isSessionExistsError(err)) {
        await signOut().catch(() => undefined);
        setError("You already have a Hopamine account. Try signing in instead.");
        return;
      }

      const clerkErr = err as {
        errors?: Array<{ code?: string; message?: string }>;
      };
      const firstError = clerkErr.errors?.[0];
      if (firstError?.code === "form_identifier_exists") {
        setError("An account with that email already exists. Try signing in.");
      } else {
        setError(
          firstError?.message ?? "Couldn't create your account. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded) return;

    setError("");
    if (!code.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status === "complete") {
        await coverAndNavigate(destination, {
          beforeNavigate: () => setActive({ session: result.createdSessionId }),
        });
      } else {
        setError("That code didn't work. Please try again.");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ message?: string }> };
      setError(clerkErr.errors?.[0]?.message ?? "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isLoaded || googleLoading) return;

    setGoogleLoading(true);
    setError("");
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: ssoCallback,
        redirectUrlComplete: ssoCallback,
      });
    } catch (err: unknown) {
      if (isSessionExistsError(err)) {
        await signOut().catch(() => undefined);
        setError("You already have a Hopamine account. Try signing in instead.");
      } else {
        const clerkErr = err as { errors?: Array<{ message?: string }> };
        setError(
          clerkErr.errors?.[0]?.message ?? "Failed to continue with Google",
        );
      }
      setGoogleLoading(false);
    }
  };

  return (
    <ZimaAuthCard>
        {step === "verify" ? (
          <form
            onSubmit={(event) => void handleVerify(event)}
            className="space-y-4"
          >
            <p
              className={`${jetbrainsMono.className} text-[13px] text-neutral-600`}
            >
              We sent a verification code to{" "}
              <span className="font-semibold text-neutral-900">{email}</span>.
            </p>
            <ZimaAuthField
              id="zima-signup-code"
              label="Verification code"
              variant="rounded"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter the code"
              required
              className="tracking-[0.3em]"
            />
            <ZimaAuthSubmitButton
              disabled={loading || !isLoaded}
              label={loading ? "Verifying…" : "Verify & continue"}
            />
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setCode("");
                setError("");
              }}
              className={`${jetbrainsMono.className} w-full text-center text-[13px] text-neutral-500 underline underline-offset-4 transition hover:text-neutral-800`}
            >
              Use a different email
            </button>
          </form>
        ) : (
          <>
            <ZimaAuthGoogleButton
              loading={googleLoading}
              disabled={!isLoaded || googleLoading}
              onClick={() => void handleGoogleSignUp()}
            />

            <ZimaAuthOrDivider />

            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="space-y-4"
            >
              <ZimaAuthField
                id="zima-signup-email"
                label="Email"
                variant="rounded"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                required
              />
              <ZimaAuthField
                id="zima-signup-password"
                label="Password"
                variant="rounded"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                required
              />
              <div id="clerk-captcha" className="min-h-[78px] w-full" />
              <ZimaAuthSubmitButton
                disabled={loading || !isLoaded}
                label={loading ? "Creating account…" : "Continue"}
              />
            </form>
          </>
        )}

        <p
          className={`${jetbrainsMono.className} mt-6 text-center text-[13px] text-neutral-600`}
        >
          Already have an account?{" "}
          <Link
            href={signInHref}
            className="font-semibold text-[#00a6f3] underline underline-offset-4"
          >
            Login
          </Link>
        </p>
    </ZimaAuthCard>
  );
}
