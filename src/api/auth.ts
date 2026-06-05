/**
 * Google Service Account authentication via JWT (RFC 7523).
 * Uses the browser's native SubtleCrypto — zero npm dependencies, zero popups.
 *
 * Required .env variables:
 *   VITE_SA_CLIENT_EMAIL  — acs-569@acsrefrigeracao.iam.gserviceaccount.com
 *   VITE_SA_PRIVATE_KEY   — PEM private_key from the service account JSON (with \n)
 */

const nodeEnv = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
const CLIENT_EMAIL    = (import.meta.env?.VITE_SA_CLIENT_EMAIL    ?? nodeEnv?.VITE_SA_CLIENT_EMAIL)    as string;
const PRIVATE_KEY_RAW = (import.meta.env?.VITE_SA_PRIVATE_KEY     ?? nodeEnv?.VITE_SA_PRIVATE_KEY)     as string;
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE     = "https://www.googleapis.com/auth/spreadsheets";

// ── Token cache ───────────────────────────────────────────────────────────────
let _token:     string    | null = null;
let _expiry:    number           = 0;
let _cryptoKey: CryptoKey | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function b64url(value: string | ArrayBuffer): string {
  let binary: string;
  if (typeof value === "string") {
    binary = unescape(encodeURIComponent(value));
  } else {
    binary = String.fromCharCode(...new Uint8Array(value));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importKey(pem: string): Promise<CryptoKey> {
  const clean = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const binary = atob(clean);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signJWT(email: string, key: CryptoKey): Promise<string> {
  const now     = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss:   email,
    sub:   email,
    scope: SCOPE,
    aud:   TOKEN_URL,
    iat:   now,
    exp:   now + 3600,
  }));

  const toSign = `${header}.${payload}`;
  const sig    = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(toSign)
  );

  return `${toSign}.${b64url(sig)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!(CLIENT_EMAIL && PRIVATE_KEY_RAW);
}

/** Service Account não tem sessão de usuário — sempre retorna true se configurado */
export function isAuthenticated(): boolean {
  return isConfigured();
}

export async function getToken(): Promise<string> {
  if (_token && Date.now() < _expiry) return _token;

  if (!isConfigured()) {
    throw new Error(
      "Service Account não configurada. Adicione VITE_SA_CLIENT_EMAIL e VITE_SA_PRIVATE_KEY no .env"
    );
  }

  if (!_cryptoKey) {
    _cryptoKey = await importKey(PRIVATE_KEY_RAW);
  }

  const jwt = await signJWT(CLIENT_EMAIL, _cryptoKey);

  const res = await fetch(TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error_description?: string }).error_description ?? "Falha ao obter token");
  }

  const data   = await res.json() as { access_token: string; expires_in: number };
  _token       = data.access_token;
  _expiry      = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

export function revokeToken(): void {
  _token  = null;
  _expiry = 0;
}
