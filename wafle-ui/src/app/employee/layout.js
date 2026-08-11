import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "@/context/session-context";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export const metadata = {
  title: "Employee workspace",
};

export default async function EmployeeLayout({ children }) {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);

  if (session?.role !== "employee") {
    redirect(session ? "/manager" : "/login");
  }

  return (
    <SessionProvider user={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
