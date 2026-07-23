import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";

export const metadata = {
  title: "Employee workspace",
};

export default function EmployeeLayout({ children }) {
  return (
    <RoleGate role="employee">
      <AppShell>{children}</AppShell>
    </RoleGate>
  );
}
