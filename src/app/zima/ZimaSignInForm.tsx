"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHexLoadTransition } from "@/components/zima/hexload/HexLoadTransition";
import { useEffect, useState, type FormEvent } from "react";
import {
  completePasswordReset,
  getClerkErrorMessage,
  sendPasswordResetCode,
  verifyPasswordResetCode,
  type PasswordResetStep,
} from "@/lib/auth/passwordReset";
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
  const [resetStep, setResetStep] = useState<PasswordResetStep | null>(null);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { setAlert } = useZimaAuthAlert();

  useEffect(() => {
    setAlert(error ? <ZimaAuthError message={error} /> : null);
    return () => setAlert(null);
  }, [error, setAlert]);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const exitReset = () => {
    setResetStep(null);
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setPassword("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

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

  const handleStartReset = async () => {
    if (!isLoaded || !signIn) return;
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendPasswordResetCode(signIn, email);
      setResetStep("code");
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err, "Could not send reset code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded || !signIn || !resetStep) return;

    setError("");
    setLoading(true);

    try {
      if (resetStep === "request") {
        await sendPasswordResetCode(signIn, email);
        setResetStep("code");
        return;
      }

      if (resetStep === "code") {
        if (!resetCode.trim()) {
          setError("Please enter the code from your email");
          return;
        }
        await verifyPasswordResetCode(signIn, resetCode.trim());
        setResetStep("new_password");
        return;
      }

      if (newPassword.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      const sessionId = await completePasswordReset(signIn, newPassword);
      if (sessionId) {
        await coverAndNavigate(redirectTo, {
          beforeNavigate: () => setActive({ session: sessionId }),
        });
      } else {
        setError("Password updated. Please sign in with your new password.");
        exitReset();
        setShowPasswordStep(true);
      }
    } catch (err: unknown) {
      setError(
        getClerkErrorMessage(
          err,
          err instanceof Error ? err.message : "Password reset failed. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn || googleLoading) return;

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

  const resetSubmitLabel = loading
    ? resetStep === "new_password"
      ? "Updating…"
      : resetStep === "code"
        ? "Verifying…"
        : "Sending…"
    : resetStep === "new_password"
      ? "Update password"
      : resetStep === "code"
        ? "Verify code"
        : "Send reset code";

  return (
    <ZimaAuthCard>
      {resetStep === null ? (
        <>
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
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="zima-signin-password"
                    className={`${jetbrainsMono.className} text-[11px] font-semibold uppercase tracking-wide text-neutral-700`}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleStartReset()}
                    disabled={loading || !isLoaded}
                    className={`${jetbrainsMono.className} text-[12px] font-semibold text-[#00a6f3] underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="zima-signin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  className={`${jetbrainsMono.className} w-full rounded-xl border border-neutral-300 bg-neutral-50 px-5 py-3 text-[15px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-[#00a6f3] focus:bg-white`}
                />
              </div>
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
        </>
      ) : (
        <form onSubmit={(event) => void handleResetSubmit(event)} className="space-y-4">
          {resetStep === "request" ? (
            <ZimaAuthField
              id="zima-reset-email"
              label="Email"
              variant="rounded"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
            />
          ) : null}

          {resetStep === "code" ? (
            <>
              <p
                className={`${jetbrainsMono.className} text-[13px] leading-relaxed text-neutral-600`}
              >
                We sent a reset code to{" "}
                <span className="font-semibold text-neutral-800">{email}</span>.
              </p>
              <ZimaAuthField
                id="zima-reset-code"
                label="Reset code"
                variant="rounded"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={resetCode}
                onChange={(event) => setResetCode(event.target.value)}
                placeholder="Enter the code"
                required
              />
            </>
          ) : null}

          {resetStep === "new_password" ? (
            <>
              <ZimaAuthField
                id="zima-reset-new-password"
                label="New password"
                variant="rounded"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
              <ZimaAuthField
                id="zima-reset-confirm-password"
                label="Confirm password"
                variant="rounded"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter new password"
                required
                minLength={8}
              />
            </>
          ) : null}

          <ZimaAuthSubmitButton
            disabled={loading || !isLoaded}
            label={resetSubmitLabel}
          />

          <div className="flex flex-col items-center gap-2 pt-1">
            {resetStep === "code" ? (
              <button
                type="button"
                onClick={() => void handleStartReset()}
                disabled={loading || !isLoaded}
                className={`${jetbrainsMono.className} text-[12px] font-semibold text-[#00a6f3] underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Resend code
              </button>
            ) : null}
            <button
              type="button"
              onClick={exitReset}
              disabled={loading}
              className={`${jetbrainsMono.className} text-[12px] text-neutral-600 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Back to sign in
            </button>
          </div>
        </form>
      )}
    </ZimaAuthCard>
  );
}
