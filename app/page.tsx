import { redirect } from "next/navigation";
import { WorkspaceSelector } from "@/features/workspaces/workspace-selector";
import { getSession } from "@/lib/session";
import { getStaffContext } from "@/lib/staff-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  const context = await getStaffContext();

  return (
    <WorkspaceSelector
      memberships={context?.membresias ?? []}
      accountLabel={session.user.name ?? session.user.email ?? "usuario"}
    />
  );
}
