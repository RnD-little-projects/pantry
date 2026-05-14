import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ForcePasswordChangeForm from "./force-password-change-form";

export const metadata = {
  title: "Security Update Required | Pantry",
  description: "Please update your password to continue.",
};

export default async function ForcePasswordChangePage() {
  const session = await auth();

  // If no session, go to login
  if (!session) {
    redirect("/login");
  }

  // If password change is NOT forced, go home
  if (!session.user?.forcePasswordChange) {
    redirect("/");
  }

  return <ForcePasswordChangeForm />;
}
