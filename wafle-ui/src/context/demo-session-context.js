"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const SESSION_KEY = "wafle-demo-session";
const ANONYMOUS_ID_KEY = "wafle-anonymous-id";

const demoUsers = {
  "employee@wafle.local": {
    password: "demo",
    user: { role: "employee", displayName: "Alex Morgan" },
  },
  "manager@wafle.local": {
    password: "demo",
    user: { role: "manager", displayName: "Jordan Lee" },
  },
};

const DemoSessionContext = createContext(null);

export function DemoSessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          setUser(JSON.parse(saved));
        }
      } catch {
        window.sessionStorage.removeItem(SESSION_KEY);
      } finally {
        setIsLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function logIn(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const account = demoUsers[normalizedEmail];

    if (!account || account.password !== password) {
      return {
        success: false,
        message: "Use one of the demo accounts shown below.",
      };
    }

    // The anonymous id is the pseudonym already stored on the account, not a
    // freshly generated one — feedback.anonymous_id has a foreign key into
    // users.anonymous_id, so only that stable value can be written there.
    try {
      const res = await fetch(
        `/api/session/anonymous-id?email=${encodeURIComponent(normalizedEmail)}`,
      );
      if (res.ok) {
        const { anonymousId } = await res.json();
        window.sessionStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
      }
    } catch {
      // The demo session still works without a live database; feedback
      // submission will simply fail until the anonymous id is available.
    }

    setUser(account.user);
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(account.user));
    return { success: true, user: account.user };
  }

  function logOut() {
    setUser(null);
    window.sessionStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(ANONYMOUS_ID_KEY);
  }

  const value = useMemo(
    () => ({ user, isLoading, logIn, logOut }),
    [user, isLoading],
  );

  return (
    <DemoSessionContext.Provider value={value}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession() {
  const context = useContext(DemoSessionContext);

  if (!context) {
    throw new Error("useDemoSession must be used inside DemoSessionProvider.");
  }

  return context;
}
