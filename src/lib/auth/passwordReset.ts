/**
 * Clerk custom password-reset helpers for the legacy `useSignIn` API
 * (`@clerk/nextjs/legacy`). Flow: send email code → verify → set password.
 */

export type PasswordResetStep = "request" | "code" | "new_password";

type ClerkLikeError = {
  errors?: Array<{ code?: string; message?: string }>;
};

type SignInResource = {
  create: (params: {
    strategy: "reset_password_email_code";
    identifier: string;
  }) => Promise<unknown>;
  attemptFirstFactor: (params: {
    strategy: "reset_password_email_code";
    code: string;
  }) => Promise<{ status: string | null }>;
  resetPassword: (params: {
    password: string;
  }) => Promise<{ status: string | null; createdSessionId: string | null }>;
};

export function getClerkErrorMessage(err: unknown, fallback: string): string {
  const clerkErr = err as ClerkLikeError;
  const first = clerkErr.errors?.[0];
  if (first?.code === "form_identifier_not_found") {
    return "No account found for that email.";
  }
  if (first?.code === "form_password_pwned") {
    return "That password has appeared in a data breach. Please choose another.";
  }
  return first?.message ?? fallback;
}

/** Sends the reset email code for `email`. */
export async function sendPasswordResetCode(
  signIn: SignInResource,
  email: string,
): Promise<void> {
  await signIn.create({
    strategy: "reset_password_email_code",
    identifier: email,
  });
}

/** Verifies the email code. Next step is setting a new password. */
export async function verifyPasswordResetCode(
  signIn: SignInResource,
  code: string,
): Promise<void> {
  const result = await signIn.attemptFirstFactor({
    strategy: "reset_password_email_code",
    code,
  });
  if (result.status !== "needs_new_password") {
    throw new Error("Invalid or expired code. Please try again.");
  }
}

/**
 * Sets the new password and returns the new session id when Clerk
 * completes sign-in as part of the reset.
 */
export async function completePasswordReset(
  signIn: SignInResource,
  password: string,
): Promise<string | null> {
  const result = await signIn.resetPassword({ password });
  if (result.status === "complete") {
    return result.createdSessionId;
  }
  throw new Error("Could not reset password. Please try again.");
}
