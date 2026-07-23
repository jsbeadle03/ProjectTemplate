"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDemoSession } from "@/context/demo-session-context";

export function RoleGate({ role, children }) {
  const router = useRouter();
  const { user, isLoading } = useDemoSession();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== role) {
      router.replace(user.role === "manager" ? "/manager" : "/employee");
    }
  }, [isLoading, role, router, user]);

  if (isLoading || !user || user.role !== role) {
    return (
      <main className="gate-loading" aria-live="polite">
        <span className="brand-mark brand-mark-large" aria-hidden="true" />
        <p>Opening your Waflé workspace…</p>
      </main>
    );
  }

  return children;
}
