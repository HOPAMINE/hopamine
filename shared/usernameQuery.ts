const USERNAME_CHARS = /^[a-z0-9_]+$/;

/** Search-bar username: trim, drop a leading @, lowercase. */
export function normalizeUsernameQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, "");
}

/** Inclusive prefix for the username index. Null when it cannot match a real username. */
export function usernamePrefixStart(raw: string): string | null {
  const prefix = normalizeUsernameQuery(raw);
  if (prefix.length < 2 || prefix.length > 30 || !USERNAME_CHARS.test(prefix)) {
    return null;
  }
  return prefix;
}

/** Exclusive upper bound for a username prefix range. */
export function usernamePrefixEnd(prefix: string): string {
  return (
    prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1)
  );
}

export function isExactUsernameQuery(raw: string): boolean {
  const username = normalizeUsernameQuery(raw);
  return username.length >= 3 && username.length <= 30 && USERNAME_CHARS.test(username);
}
