import { getUsers } from "./actions";
import UserManagementClient from "./user-management-client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "User Management | Admin",
  description: "Manage users, roles, and security.",
};

export default async function UserManagementPage() {
  const session = await auth();
  
  if (session?.user?.role !== "admin") {
    redirect("/unauthorized");
  }

  const users = await getUsers();

  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <UserManagementClient initialUsers={users} />
    </div>
  );
}
