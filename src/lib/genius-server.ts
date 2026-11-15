type CachedToken = {
  token: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

function envToken(): string {
  return (
    process.env.GENIUS_ACCESS_TOKEN?.trim() ||
    process.env.GENIUS_CLIENT_ACCESS_TOKEN?.trim() ||
    ""
  );
}

function clientCredentials(): { id: string; secret: string } | null {
  const id = process.env.GENIUS_CLIENT_ID?.trim() ?? "";
  const secret =
    process.env.GENIUS_SECRET_ID?.trim() ||
    process.env.GENIUS_CLIENT_SECRET?.trim() ||
    "";
  if (!id || !secret) return null;
  return { id, secret };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

async function fetchClientCredentialsToken(): Promise<CachedToken | null> {
  const creds = clientCredentials();
  if (!creds) return null;

  const basic = Buffer.from(`${creds.id}:${creds.secret}`).toString("base64");
  const response = await fetch("https://api.genius.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!response.ok) return null;

  const payload = asRecord(await response.json());
  if (!payload) return null;
  const token = typeof payload.access_token === "string" ? payload.access_token : "";
  if (!token) return null;

  const expiresIn =
    typeof payload.expires_in === "number" ? payload.expires_in : 60 * 60 * 24;
  return {
    token,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 60) * 1000,
  };
}

export async function getGeniusAccessToken(): Promise<string | null> {
  const staticToken = envToken();
  if (staticToken) return staticToken;

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const exchanged = await fetchClientCredentialsToken();
  if (!exchanged) return null;
  cachedToken = exchanged;
  return exchanged.token;
}

export function isGeniusConfigured(): boolean {
  return Boolean(envToken() || clientCredentials());
}
