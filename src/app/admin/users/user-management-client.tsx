"use client";

import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Search, 
  MoreVertical, 
  Key, 
  UserCheck, 
  UserMinus, 
  Trash2, 
  Edit,
  ShieldCheck,
  ShieldAlert,
  Mail,
  User as UserIcon,
  RefreshCw
} from "lucide-react";
import { 
  resetUserPassword, 
  softDeleteUser, 
  updateUserStatus, 
  updateUserInfo,
  createUser
} from "./actions";
import { useToast } from "@/components/ui/toast";
import { 
  Dialog
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface User {
  _id: string;
  username: string;
  email?: string;
  role: string;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: string;
}

export default function UserManagementClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleResetPassword = async (userId: string) => {
    try {
      const result = await resetUserPassword(userId);
      setTempPassword(result.tempPassword);
      toast("Password Reset Successful. A temporary password has been generated.", "success");
      // Update local state if needed
      setUsers(users.map(u => u._id === userId ? { ...u, forcePasswordChange: true } : u));
    } catch (error: any) {
      toast(error.message, "error");
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await updateUserStatus(user._id, { isActive: !user.isActive });
      setUsers(users.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
      toast(user.isActive ? "User Deactivated" : "User Activated", "success");
    } catch (error: any) {
      toast(error.message, "error");
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await softDeleteUser(userId);
      setUsers(users.filter(u => u._id !== userId));
      setIsDeleting(null);
      toast("User Deleted. The user has been soft-deleted from the system.", "success");
    } catch (error: any) {
      toast(error.message, "error");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as string,
    };

    try {
      await updateUserInfo(editingUser._id, data);
      setUsers(users.map(u => u._id === editingUser._id ? { ...u, ...data } : u));
      setEditingUser(null);
      toast("User Updated successfully.", "success");
    } catch (error: any) {
      toast(error.message, "error");
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as string,
      password: formData.get("password") as string,
      forcePasswordChange: formData.get("forcePasswordChange") === "on",
    };

    try {
      await createUser(data);
      toast("User Created successfully.", "success");
      setIsCreating(false);
      window.location.reload(); 
    } catch (error: any) {
      toast(error.message, "error");
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage your team, roles, and account statuses.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9 w-[250px] bg-secondary/50 border-none focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <UserPlus size={16} />
            Create User
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/20 hover:bg-secondary/20">
              <TableHead className="w-[250px]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user._id} className="group transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <UserIcon size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.username}</span>
                      <span className="text-xs text-muted-foreground">{user.email || "No email provided"}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                    {user.role === 'admin' ? <ShieldCheck size={12} className="mr-1" /> : <ShieldAlert size={12} className="mr-1" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={user.isActive ? "outline" : "secondary"} className={user.isActive ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-destructive border-destructive/20 bg-destructive/5"}>
                      {user.isActive ? "Active" : "Deactivated"}
                    </Badge>
                    {user.forcePasswordChange && (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5 text-[10px]">
                        Force PWD Change
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Edit User"
                      onClick={() => setEditingUser(user)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Reset Password"
                      onClick={() => handleResetPassword(user._id)}
                    >
                      <Key size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title={user.isActive ? "Deactivate" : "Activate"}
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.isActive ? <UserMinus size={16} className="text-amber-500" /> : <UserCheck size={16} className="text-emerald-500" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Delete User"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setIsDeleting(user._id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Temp Password Dialog */}
      <Dialog 
        open={!!tempPassword} 
        onOpenChange={() => setTempPassword(null)}
        title="Temporary Password Generated"
        description="Copy this password and give it to the user. They will be forced to change it on login."
        footer={(
          <div className="flex gap-2 w-full justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(tempPassword || "");
                toast("Password copied to clipboard", "success");
              }}
            >
              Copy Password
            </Button>
            <Button type="button" onClick={() => setTempPassword(null)}>Done</Button>
          </div>
        )}
      >
        <div className="flex items-center space-x-2 mt-4">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="temp-pwd" className="sr-only">Password</Label>
            <Input
              id="temp-pwd"
              readOnly
              value={tempPassword || ""}
              className="font-mono text-center text-lg py-6 bg-secondary/30 border-dashed"
            />
          </div>
        </div>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog 
        open={!!editingUser} 
        onOpenChange={() => setEditingUser(null)}
        title="Edit User"
        description={`Update account details for ${editingUser?.username}.`}
      >
        <form onSubmit={handleUpdateUser} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" defaultValue={editingUser?.username} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={editingUser?.email || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select 
              id="role" 
              name="role" 
              defaultValue={editingUser?.role}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="user">User</option>
              <option value="cashier">Cashier</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end mt-6">
            <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={!!isDeleting} 
        onOpenChange={() => setIsDeleting(null)}
        title="Confirm Deletion"
        description="Are you sure you want to delete this user? This will soft-delete their account and they will no longer be able to sign in. This action can be undone by an admin later if needed."
        footer={(
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => setIsDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => isDeleting && handleDelete(isDeleting)}>Delete Account</Button>
          </div>
        )}
      />
      {/* Create User Dialog */}
      <Dialog 
        open={isCreating} 
        onOpenChange={setIsCreating}
        title="Create New User"
        description="Add a new user to the system."
      >
        <form onSubmit={handleCreateUser} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-username">Username</Label>
            <Input id="new-username" name="username" required placeholder="john_doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">Email (Optional)</Label>
            <Input id="new-email" name="email" type="email" placeholder="john@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-role">Role</Label>
            <select 
              id="new-role" 
              name="role" 
              defaultValue="user"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="user">User</option>
              <option value="cashier">Cashier</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Initial Password</Label>
            <Input id="new-password" name="password" required type="password" placeholder="••••••••" />
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <input 
              type="checkbox" 
              id="forcePasswordChange" 
              name="forcePasswordChange" 
              defaultChecked 
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-background"
            />
            <Label htmlFor="forcePasswordChange" className="text-sm font-normal cursor-pointer">
              Force user to change password on first login
            </Label>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end mt-6">
            <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
