export const SESSION_COOKIE = "wafle_session";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const encoder = new TextEncoder();

function encode(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decode(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function getKey() {
  const secret = process.env.WAFLE_SESSION_SECRET;
  if (!secret) {
    throw new Error("WAFLE_SESSION_SECRET is not set");
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSession(user) {
  const payload = encode(
    encoder.encode(
      JSON.stringify({
        userId: user.id,
        role: user.role,
        anonymousId: user.anonymousId,
        displayName: user.displayName,
        expiresAt: Date.now() + SESSION_TTL_MS,
      }),
    ),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getKey(),
    encoder.encode(payload),
  );
  return `${payload}.${encode(new Uint8Array(signature))}`;
}

export async function readSession(value) {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      decode(signature),
      encoder.encode(payload),
    );
    if (!valid) {
      return null;
    }

    const session = JSON.parse(new TextDecoder().decode(decode(payload)));
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function getSession(request) {
  return readSession(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function requireRole(request, role) {
  const session = await getSession(request);
  return session?.role === role ? session : null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};
