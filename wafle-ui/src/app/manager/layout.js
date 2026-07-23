import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";

export const metadata = {
  title: "Manager workspace",
};

export default function ManagerLayout({ children }) {
  return (
    <RoleGate role="manager">
      <AppShell>{children}</AppShell>
    </RoleGate>
  );
}
