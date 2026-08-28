import { requireStaff } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import SessionGuard from "@/components/SessionGuard";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();

  return (
    <AdminShell profile={profile}>
      <SessionGuard />
      {children}
    </AdminShell>
  );
}
