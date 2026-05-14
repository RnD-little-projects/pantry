import { auth } from "@/auth";
import ForcePasswordChangeClientRedirect from "./ForcePasswordChangeClientRedirect";

export default async function ForcePasswordChangeHandler() {
  const session = await auth();

  // Check if password change is forced (reads freshly from DB via auth callback)
  if (session?.user?.forcePasswordChange) {
    return <ForcePasswordChangeClientRedirect />;
  }

  return null;
}
