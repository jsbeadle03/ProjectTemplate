import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcryptjs";

process.env.WAFLE_SESSION_SECRET ??= "test-secret-for-the-suite";

const { createSession, readSession, requireRole, getSession } =
  await import("../src/lib/session.js");

const user = {
  id: 7,
  role: "employee",
  anonymousId: "11111111-1111-1111-1111-111111111111",
  displayName: "Robin Vance",
};

function asRequest(cookieValue) {
  return { cookies: { get: () => ({ value: cookieValue }) } };
}

describe("session cookie", () => {
  it("round-trips the signed payload", async () => {
    const session = await readSession(await createSession(user));
    assert.equal(session.userId, 7);
    assert.equal(session.role, "employee");
    assert.equal(session.anonymousId, user.anonymousId);
  });

  it("rejects a tampered payload", async () => {
    const cookie = await createSession(user);
    const [payload, signature] = cookie.split(".");
    const forged = Buffer.from(
      JSON.stringify({
        ...user,
        role: "manager",
        expiresAt: Date.now() + 1000,
      }),
    )
      .toString("base64url")
      .replaceAll("=", "");

    assert.equal(await readSession(`${forged}.${signature}`), null);
    assert.equal(await readSession(`${payload}.${signature}x`), null);
  });

  it("rejects an expired session", async () => {
    const expired = await createSession(user);
    const [, signature] = expired.split(".");
    const stale = Buffer.from(
      JSON.stringify({ ...user, expiresAt: Date.now() - 1 }),
    )
      .toString("base64url")
      .replaceAll("=", "");

    assert.equal(await readSession(`${stale}.${signature}`), null);
  });

  it("rejects malformed and missing cookies", async () => {
    for (const value of ["", null, undefined, "no-dot", "a.b.c"]) {
      assert.equal(await readSession(value), null, `should reject ${value}`);
    }
  });
});

describe("requireRole", () => {
  it("allows the matching role", async () => {
    const request = asRequest(await createSession(user));
    assert.ok(await getSession(request));
    assert.ok(await requireRole(request, "employee"));
  });

  it("refuses an employee asking for manager access", async () => {
    const request = asRequest(await createSession(user));
    assert.equal(await requireRole(request, "manager"), null);
  });

  it("refuses a forged manager cookie", async () => {
    const request = asRequest("forged.cookie");
    assert.equal(await requireRole(request, "manager"), null);
  });
});

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await bcrypt.hash("correct-horse-battery", 10);
    assert.notEqual(hash, "correct-horse-battery");
    assert.ok(await bcrypt.compare("correct-horse-battery", hash));
    assert.equal(await bcrypt.compare("wrong-password", hash), false);
  });

  it("salts, so the same password hashes differently each time", async () => {
    const [a, b] = await Promise.all([
      bcrypt.hash("same-password", 10),
      bcrypt.hash("same-password", 10),
    ]);
    assert.notEqual(a, b);
  });
});
