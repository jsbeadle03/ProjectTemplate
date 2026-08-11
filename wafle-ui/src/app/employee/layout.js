import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "@/context/session-context";
import { getPool } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { getLink } from "@/lib/team";
import { PendingApproval } from "./pending-approval";

export const metadata = {
  title: "Employee workspace",
};

export default async function EmployeeLayout({ children }) {
  const session = await readSession(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );

  if (session?.role !== "employee") {
    redirect(session ? "/manager" : "/login");
  }

  // Read live rather than from the session cookie, so being accepted takes
  // effect on the next page load instead of the next sign-in.
  const link = await getLink(getPool(), session.userId);

  return (
    <SessionProvider user={session}>
      <AppShell>
        {link?.linkStatus === "accepted" ? children : <PendingApproval />}
      </AppShell>
    </SessionProvider>
  );
}
