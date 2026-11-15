"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import {
  AuthCard,
  AuthErrorBanner,
  AuthHeading,
  GoogleButton,
  OrDivider,
  authFieldBase,
  authGradient,
  authShell,
  authSubmitButton,
} from "@/components/AuthUI";
import {
  completePasswordReset,
  getClerkErrorMessage,
  sendPasswordResetCode,
  verifyPasswordResetCode,
  type PasswordResetStep,
} from "@/lib/auth/passwordReset";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className={`${authShell} flex items-center justify-center ${authGradient}`}>
          <p className="font-mono text-sm text-white">Loading…</p>
        </div>
      }
    >
      <SignInPageContent />
    </Suspense>
  );
}

function SignInPageContent() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_url") ?? "/dashboard";
  const ssoCallback = `/sso-callback?redirect_url=${encodeURIComponent(redirectTo)}`;
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
  const router = useRouter();

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const exitReset = () => {
    setResetStep(null);
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setPassword("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    setError("");

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push(redirectTo);
      } else {
        setError("Sign in failed. Please try again.");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ code?: string; message?: string }> };
      const firstError = clerkErr.errors?.[0];
      // No account exists for this email — guide them to sign up instead of
      // showing a generic "invalid credentials" message.
      if (firstError?.code === "form_identifier_not_found") {
        setError("No account found for that email. Please sign up first.");
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

  const handleResetSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
        await setActive({ session: sessionId });
        router.push(redirectTo);
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

  const signUpHref =
    redirectTo.startsWith("/claim")
      ? `/sign-up?redirect_url=${encodeURIComponent(redirectTo)}`
      : "/sign-up";

  const headingTitle =
    resetStep === null
      ? "Sign in & build."
      : resetStep === "new_password"
        ? "Choose a new password."
        : "Reset your password.";

  return (
    <div className={`${authShell} flex items-center justify-center ${authGradient}`}>
      <div className="flex w-full max-w-md flex-col items-stretch">
        <div className="w-full">
          <AuthHeading title={headingTitle} />

          <AuthCard>
            {error ? <AuthErrorBanner message={error} /> : null}

            {resetStep === null ? (
              <>
                <GoogleButton
                  loading={googleLoading}
                  disabled={!isLoaded || googleLoading}
                  onClick={() => void handleGoogleSignIn()}
                />

                <OrDivider />

                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                  <div>
                    <label htmlFor="signin-email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(ev) => {
                        setEmail(ev.target.value);
                        if (showPasswordStep) {
                          setShowPasswordStep(false);
                          setPassword("");
                        }
                      }}
                      placeholder="Enter your email"
                      required
                      className={`${authFieldBase} py-3 font-inter text-lg md:py-[0.7rem]`}
                    />
                  </div>

                  {showPasswordStep ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label
                          htmlFor="signin-password"
                          className="font-mono text-sm font-medium text-neutral-800"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => void handleStartReset()}
                          disabled={loading || !isLoaded}
                          className="font-mono text-sm font-semibold text-accent-navbar underline decoration-accent-navbar/40 underline-offset-4 transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <input
                        id="signin-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(ev) => setPassword(ev.target.value)}
                        placeholder="Enter your password"
                        required
                        className={`${authFieldBase} py-3 font-mono text-sm md:text-base`}
                      />
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || !isLoaded}
                    className={authSubmitButton}
                  >
                    {loading ? "Signing in…" : "Continue"}
                  </button>
                </form>

                <p className="mt-6 text-center font-mono text-sm text-neutral-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href={signUpHref}
                    className="font-semibold text-accent-navbar underline decoration-accent-navbar/40 underline-offset-4 transition hover:brightness-[1.05]"
                  >
                    Sign up
                  </Link>
                </p>
              </>
            ) : (
              <form onSubmit={(e) => void handleResetSubmit(e)} className="space-y-4">
                {resetStep === "request" ? (
                  <div>
                    <label htmlFor="reset-email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                      placeholder="Enter your email"
                      required
                      className={`${authFieldBase} py-3 font-inter text-lg md:py-[0.7rem]`}
                    />
                  </div>
                ) : null}

                {resetStep === "code" ? (
                  <div className="space-y-2">
                    <p className="font-mono text-sm text-neutral-600">
                      We sent a reset code to{" "}
                      <span className="font-semibold text-neutral-800">{email}</span>.
                    </p>
                    <label
                      htmlFor="reset-code"
                      className="font-mono text-sm font-medium text-neutral-800"
                    >
                      Reset code
                    </label>
                    <input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={resetCode}
                      onChange={(ev) => setResetCode(ev.target.value)}
                      placeholder="Enter the code"
                      required
                      className={`${authFieldBase} py-3 font-mono text-sm md:text-base`}
                    />
                  </div>
                ) : null}

                {resetStep === "new_password" ? (
                  <>
                    <div className="space-y-2">
                      <label
                        htmlFor="reset-new-password"
                        className="font-mono text-sm font-medium text-neutral-800"
                      >
                        New password
                      </label>
                      <input
                        id="reset-new-password"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(ev) => setNewPassword(ev.target.value)}
                        placeholder="At least 8 characters"
                        required
                        minLength={8}
                        className={`${authFieldBase} py-3 font-mono text-sm md:text-base`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="reset-confirm-password"
                        className="font-mono text-sm font-medium text-neutral-800"
                      >
                        Confirm password
                      </label>
                      <input
                        id="reset-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(ev) => setConfirmPassword(ev.target.value)}
                        placeholder="Re-enter new password"
                        required
                        minLength={8}
                        className={`${authFieldBase} py-3 font-mono text-sm md:text-base`}
                      />
                    </div>
                  </>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || !isLoaded}
                  className={authSubmitButton}
                >
                  {loading
                    ? resetStep === "new_password"
                      ? "Updating…"
                      : resetStep === "code"
                        ? "Verifying…"
                        : "Sending…"
                    : resetStep === "new_password"
                      ? "Update password"
                      : resetStep === "code"
                        ? "Verify code"
                        : "Send reset code"}
                </button>

                <div className="flex flex-col items-center gap-2 pt-2">
                  {resetStep === "code" ? (
                    <button
                      type="button"
                      onClick={() => void handleStartReset()}
                      disabled={loading || !isLoaded}
                      className="font-mono text-sm font-semibold text-accent-navbar underline decoration-accent-navbar/40 underline-offset-4 transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={exitReset}
                    disabled={loading}
                    className="font-mono text-sm text-neutral-600 underline underline-offset-4 transition hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Back to sign in
                  </button>
                </div>
              </form>
            )}
          </AuthCard>
        </div>
      </div>
    </div>
  );
}
