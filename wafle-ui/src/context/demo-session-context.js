"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const SESSION_KEY = "wafle-demo-session";

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

  function logIn(email, password) {
    const account = demoUsers[email.trim().toLowerCase()];

    if (!account || account.password !== password) {
      return {
        success: false,
        message: "Use one of the demo accounts shown below.",
      };
    }

    setUser(account.user);
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(account.user));
    return { success: true, user: account.user };
  }

  function logOut() {
    setUser(null);
    window.sessionStorage.removeItem(SESSION_KEY);
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
