import { redirect } from "next/navigation";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";
import { getSession } from "@/lib/session";
import { detectStaffRole } from "@/lib/staff-role";

export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if ((await detectStaffRole()) !== "reception") redirect("/");

  return (
    <ReceptionWorkspace
      userName={session.user.name ?? session.user.email ?? "Recepcionista"}
    />
  );
}
