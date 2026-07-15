import { InvitationAcceptance } from "@/features/invitations/invitation-acceptance";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function InvitationPage() {
  return <InvitationAcceptance loggedIn={Boolean(await getSession())} />;
}
