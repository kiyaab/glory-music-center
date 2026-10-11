import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Download,
  Eye,
  EyeOff,
  Home,
  ImagePlus,
  KeyRound,
  LogOut,
  Mail,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  bootstrapFirstAdmin,
  createManualStudentRegistration,
  deleteManagedUser,
  deleteRegistration,
  isCurrentUserAdmin,
  listAllUsers,
  listRegistrations,
  registerManagedUser,
  resetUserPassword,
  toggleUserBan,
  updateRegistrationStatus,
  updateUserDetails,
  updateUserRole,
  type ManagedUser,
  type ManualStudentRegistrationInput,
} from "@/lib/admin.functions";
import { clearClientAdminSession } from "@/lib/auth-admin";
import { deleteGalleryPhoto, listGalleryPhotos } from "@/lib/gallery.functions";
import { formatScheduleLabel, SCHEDULE_OPTIONS } from "@/lib/registration.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal | Glory Music Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboard,
});

const STATUSES = ["new", "contacted", "enrolled", "completed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];
const CATEGORIES = ["piano", "guitar", "keyboard", "saxophone", "vocal", "performances", "events"];

type Registration = Awaited<ReturnType<typeof listRegistrations>>[number];

function generateSecurePassword(length = 12): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const adminCheckFn = useServerFn(isCurrentUserAdmin);
  const bootstrapFn = useServerFn(bootstrapFirstAdmin);

  const [activeTab, setActiveTab] = useState("users");
  const [prefilledStudent, setPrefilledStudent] = useState<{ name: string; email: string; phone: string } | null>(
    null,
  );
  const [openRegisterDialog, setOpenRegisterDialog] = useState(false);

  const adminCheck = useQuery({ queryKey: ["is-admin"], queryFn: () => adminCheckFn({}) });

  const bootstrapMutation = useMutation({
    mutationFn: () => bootstrapFn({}),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    clearClientAdminSession();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function handleConvertStudentToUser(student: { full_name: string; email: string; phone_number: string }) {
    setPrefilledStudent({
      name: student.full_name,
      email: student.email,
      phone: student.phone_number,
    });
    setActiveTab("users");
    setOpenRegisterDialog(true);
  }

  if (adminCheck.isLoading) {
    return <CenteredMessage title="Checking Authorization…" body="Verifying your administrator permissions." />;
  }

  const checkData = adminCheck.data;

  // Initial Setup / First Admin Claim Mode
  if (!checkData?.isAdmin && checkData?.canBootstrap) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-12">
        <div className="glass-panel gold-ring max-w-lg rounded-[2.5rem] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Crown className="h-8 w-8" />
          </div>
          <p className="eyebrow mt-4">Glory Music Center · Setup</p>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl">Initialize Primary Admin</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            No administrator account currently exists in the system. As the authenticated user, you can claim the
            Primary Administrator role right now to access the dashboard and control users.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button
              onClick={() => bootstrapMutation.mutate()}
              disabled={bootstrapMutation.isPending}
              className="min-h-12 w-full rounded-full text-base font-medium shadow-lg"
            >
              {bootstrapMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Initializing…
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-5 w-5" /> Claim Primary Administrator Role
                </>
              )}
            </Button>
            <Button onClick={handleSignOut} variant="ghost" className="rounded-full">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Not an admin & cannot bootstrap
  if (!checkData?.isAdmin) {
    return (
      <CenteredMessage
        title="Admin Access Required"
        body="Your account is currently registered as a standard user. An existing administrator must grant you admin access."
        action={
          <Button onClick={handleSignOut} variant="outline" className="rounded-full">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        }
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full border-primary/40 bg-primary/10 text-primary px-3 py-1 text-xs">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-primary" /> Administrator Portal
            </Badge>
            {checkData?.hasServiceRole ? (
              <Badge variant="outline" className="rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Auth Engine Active
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                <AlertTriangle className="mr-1 h-3 w-3" /> Basic Mode
              </Badge>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl">Admin Control Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register and control user accounts, manage course registrations, and curate the website gallery.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="min-h-11 rounded-full">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" /> View website
            </Link>
          </Button>
          <Button variant="outline" className="min-h-11 rounded-full text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="h-12 w-full max-w-xl grid grid-cols-4 rounded-full p-1 bg-muted/60">
          <TabsTrigger value="users" className="rounded-full font-medium text-xs sm:text-sm">
            <Users className="mr-1.5 h-4 w-4" /> Users & Roles
          </TabsTrigger>
          <TabsTrigger value="students" className="rounded-full font-medium text-xs sm:text-sm">
            <UserCheck className="mr-1.5 h-4 w-4" /> Students
          </TabsTrigger>
          <TabsTrigger value="gallery" className="rounded-full font-medium text-xs sm:text-sm">
            <ImagePlus className="mr-1.5 h-4 w-4" /> Gallery
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-full font-medium text-xs sm:text-sm">
            <Server className="mr-1.5 h-4 w-4" /> System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UsersPanel
            hasServiceRole={Boolean(checkData?.hasServiceRole)}
            currentUserId={checkData.userId}
            openRegisterDialog={openRegisterDialog}
            setOpenRegisterDialog={setOpenRegisterDialog}
            prefilledStudent={prefilledStudent}
            clearPrefill={() => setPrefilledStudent(null)}
          />
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <StudentsPanel onConvertToUser={handleConvertStudentToUser} />
        </TabsContent>

        <TabsContent value="gallery" className="mt-6">
          <GalleryPanel />
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <SystemPanel checkData={checkData} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

// ==========================================
// 1. USERS & ROLES CONTROL PANEL
// ==========================================
function UsersPanel({
  hasServiceRole,
  currentUserId,
  openRegisterDialog,
  setOpenRegisterDialog,
  prefilledStudent,
  clearPrefill,
}: {
  hasServiceRole: boolean;
  currentUserId: string;
  openRegisterDialog: boolean;
  setOpenRegisterDialog: (open: boolean) => void;
  prefilledStudent: { name: string; email: string; phone: string } | null;
  clearPrefill: () => void;
}) {
  const queryClient = useQueryClient();
  const listUsersFn = useServerFn(listAllUsers);
  const registerUserFn = useServerFn(registerManagedUser);
  const updateRoleFn = useServerFn(updateUserRole);
  const updateDetailsFn = useServerFn(updateUserDetails);
  const resetPasswordFn = useServerFn(resetUserPassword);
  const toggleBanFn = useServerFn(toggleUserBan);
  const deleteUserFn = useServerFn(deleteManagedUser);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog States
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [editUserTarget, setEditUserTarget] = useState<ManagedUser | null>(null);
  const [resetPwdTarget, setResetPwdTarget] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);

  // Queries
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsersFn({}),
  });

  const usersList = usersQuery.data ?? [];

  type RegisterUserInput = {
    fullName: string;
    email: string;
    password: string;
    role: "admin" | "user";
    phoneNumber?: string;
    emailConfirm: boolean;
  };

  // Mutations
  const registerMutation = useMutation({
    mutationFn: (data: RegisterUserInput) => registerUserFn({ data }),
    onSuccess: (res) => {
      toast.success(`User "${res.fullName}" (${res.email}) registered successfully!`);
      setOpenRegisterDialog(false);
      clearPrefill();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: (data: { userId: string; role: "admin" | "user" }) => updateRoleFn({ data }),
    onSuccess: (_, vars) => {
      toast.success(`Role updated to "${vars.role}".`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const updateDetailsMutation = useMutation({
    mutationFn: (data: { userId: string; fullName: string; email: string; phoneNumber?: string }) =>
      updateDetailsFn({ data }),
    onSuccess: () => {
      toast.success("User details updated successfully.");
      setEditUserTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (data: { userId: string; newPassword: string }) => resetPasswordFn({ data }),
    onSuccess: () => {
      toast.success("Password reset successfully.");
      setResetPwdTarget(null);
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const toggleBanMutation = useMutation({
    mutationFn: (data: { userId: string; banned: boolean; durationHours?: number }) => toggleBanFn({ data }),
    onSuccess: (_, vars) => {
      toast.success(vars.banned ? "User account suspended." : "User account unsuspended.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteUserFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("User removed successfully.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return usersList.filter((u) => {
      const matchQuery =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.phoneNumber && u.phoneNumber.toLowerCase().includes(q));

      const matchRole = roleFilter === "all" || u.role === roleFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !u.isBanned) ||
        (statusFilter === "suspended" && u.isBanned);

      return matchQuery && matchRole && matchStatus;
    });
  }, [usersList, searchQuery, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = usersList.length;
    const admins = usersList.filter((u) => u.role === "admin").length;
    const standard = usersList.filter((u) => u.role === "user").length;
    const suspended = usersList.filter((u) => u.isBanned).length;
    return { total, admins, standard, suspended };
  }, [usersList]);

  function exportUsersCsv() {
    const header = ["User ID", "Full Name", "Email", "Phone", "Role", "Status", "Email Confirmed", "Created At", "Last Sign In"];
    const lines = filteredUsers.map((u) => [
      u.id,
      u.fullName,
      u.email,
      u.phoneNumber || "",
      u.role,
      u.isBanned ? "Suspended" : "Active",
      u.emailConfirmed ? "Yes" : "No",
      new Date(u.createdAt).toISOString(),
      u.lastSignInAt ? new Date(u.lastSignInAt).toISOString() : "Never",
    ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","));

    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `glory-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  function copyToClipboard(text: string, label = "Copied to clipboard") {
    navigator.clipboard.writeText(text);
    toast.success(label);
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass-panel rounded-3xl p-5 border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Accounts</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-foreground">{stats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">Managed accounts</p>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Administrators</span>
            <Crown className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-amber-600 dark:text-amber-400">{stats.admins}</p>
          <p className="mt-1 text-xs text-muted-foreground">Full dashboard access</p>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Standard Users</span>
            <UserCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-primary">{stats.standard}</p>
          <p className="mt-1 text-xs text-muted-foreground">Students & instructors</p>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suspended</span>
            <Ban className="h-4 w-4 text-destructive" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-destructive">{stats.suspended}</p>
          <p className="mt-1 text-xs text-muted-foreground">Blocked logins</p>
        </div>
      </div>

      {/* Service Role Guidance Alert (if missing) */}
      {!hasServiceRole && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                Service Role Key Not Detected in .env
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300/90">
                To enable direct creation of Supabase Auth accounts, password overrides, and account suspensions from
                this interface, add your <code className="bg-amber-500/20 px-1 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to the{" "}
                <code className="bg-amber-500/20 px-1 py-0.5 rounded">.env</code> file. In the meantime, you can manage user roles and
                student records.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name, email, phone, ID…"
            className="min-h-11 rounded-full bg-card pl-10 pr-4"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="min-h-11 w-40 rounded-full">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Administrators</SelectItem>
            <SelectItem value="user">Standard Users</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="min-h-11 w-40 rounded-full">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="suspended">Suspended Only</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => usersQuery.refetch()}
          disabled={usersQuery.isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${usersQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>

        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={exportUsersCsv}
          disabled={!filteredUsers.length}
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>

        <Button
          onClick={() => setOpenRegisterDialog(true)}
          className="min-h-11 rounded-full px-5 shadow-md font-medium"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Register User
        </Button>
      </div>

      {/* Users Table */}
      <div className="glass-panel overflow-hidden rounded-[2rem] border border-border/60 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-80">User</TableHead>
                <TableHead className="w-36">Role</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead className="w-44">Registered</TableHead>
                <TableHead className="w-44">Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2 text-primary" />
                    Loading user directory…
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-3 opacity-40" />
                    <p className="font-medium text-base">No users found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery ? "Try refining your search or filter criteria." : "Click '+ Register User' to create the first user."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUserId;
                  const initials = user.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "U";

                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      {/* User Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className={`h-10 w-10 border ${user.role === "admin" ? "border-amber-500/40" : "border-border"}`}>
                            <AvatarFallback
                              className={
                                user.role === "admin"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold text-xs"
                                  : "bg-primary/10 text-primary font-medium text-xs"
                              }
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold truncate text-sm">{user.fullName}</span>
                              {isCurrent && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                              <span>{user.email}</span>
                              {user.phoneNumber && (
                                <>
                                  <span>·</span>
                                  <span>{user.phoneNumber}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role Column */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-full px-2.5 hover:bg-muted font-normal text-xs"
                              disabled={updateRoleMutation.isPending}
                            >
                              {user.role === "admin" ? (
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25 transition-colors gap-1">
                                  <Crown className="h-3 w-3" /> Admin
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="hover:bg-muted-foreground/15 transition-colors gap-1">
                                  <Users className="h-3 w-3 text-muted-foreground" /> User
                                </Badge>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44 rounded-xl">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Change Role</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => updateRoleMutation.mutate({ userId: user.id, role: "admin" })}
                              disabled={user.role === "admin"}
                              className="text-xs cursor-pointer"
                            >
                              <Crown className="mr-2 h-3.5 w-3.5 text-amber-500" /> Promote to Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateRoleMutation.mutate({ userId: user.id, role: "user" })}
                              disabled={user.role === "user"}
                              className="text-xs cursor-pointer"
                            >
                              <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Demote to User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Status Column */}
                      <TableCell>
                        {user.isBanned ? (
                          <Badge variant="destructive" className="rounded-full text-[11px] gap-1 px-2.5">
                            <Ban className="h-3 w-3" /> Suspended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full text-[11px] border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 px-2.5">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </Badge>
                        )}
                      </TableCell>

                      {/* Registered Date */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>

                      {/* Last Active */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {user.lastSignInAt
                          ? new Date(user.lastSignInAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never"}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-xl">
                            <DropdownMenuItem onClick={() => setSelectedUser(user)} className="text-xs cursor-pointer py-2 rounded-xl">
                              <Eye className="mr-2 h-4 w-4 text-primary" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditUserTarget(user)} className="text-xs cursor-pointer py-2 rounded-xl">
                              <UserCheck className="mr-2 h-4 w-4 text-primary" /> Edit User Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(user.id, "User ID copied")}
                              className="text-xs cursor-pointer py-2 rounded-xl"
                            >
                              <Copy className="mr-2 h-4 w-4 text-muted-foreground" /> Copy User ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setResetPwdTarget(user)} className="text-xs cursor-pointer py-2 rounded-xl">
                              <KeyRound className="mr-2 h-4 w-4 text-amber-500" /> Reset Password
                            </DropdownMenuItem>
                            {!isCurrent && (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleBanMutation.mutate({
                                    userId: user.id,
                                    banned: !user.isBanned,
                                  })
                                }
                                className={`text-xs cursor-pointer py-2 rounded-xl ${user.isBanned ? "text-emerald-600" : "text-amber-600"}`}
                              >
                                {user.isBanned ? (
                                  <>
                                    <Unlock className="mr-2 h-4 w-4" /> Unsuspend Account
                                  </>
                                ) : (
                                  <>
                                    <Ban className="mr-2 h-4 w-4" /> Suspend Account
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            {!isCurrent && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(user)}
                                  className="text-xs cursor-pointer py-2 rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DIALOG 1: REGISTER NEW USER                             */}
      {/* ======================================================== */}
      <RegisterUserDialog
        open={openRegisterDialog}
        onOpenChange={(open) => {
          setOpenRegisterDialog(open);
          if (!open) clearPrefill();
        }}
        prefill={prefilledStudent}
        onSubmit={(data) => registerMutation.mutate(data)}
        isPending={registerMutation.isPending}
      />

      {/* ======================================================== */}
      {/* DIALOG 2: EDIT USER PROFILE                             */}
      {/* ======================================================== */}
      <EditUserDialog
        user={editUserTarget}
        open={!!editUserTarget}
        onOpenChange={(open) => !open && setEditUserTarget(null)}
        onSubmit={(data) => updateDetailsMutation.mutate(data)}
        isPending={updateDetailsMutation.isPending}
      />

      {/* ======================================================== */}
      {/* DIALOG 3: RESET PASSWORD                                */}
      {/* ======================================================== */}
      <ResetPasswordDialog
        user={resetPwdTarget}
        open={!!resetPwdTarget}
        onOpenChange={(open) => !open && setResetPwdTarget(null)}
        onSubmit={(newPassword) =>
          resetPwdTarget &&
          resetPasswordMutation.mutate({
            userId: resetPwdTarget.id,
            newPassword,
          })
        }
        isPending={resetPasswordMutation.isPending}
      />

      {/* ======================================================== */}
      {/* DIALOG 4: VIEW USER DETAILS                             */}
      {/* ======================================================== */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {selectedUser?.fullName}
            </DialogTitle>
            <DialogDescription>Complete account profile and permissions record.</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 text-sm mt-2">
              <div className="grid grid-cols-3 gap-y-3 rounded-2xl bg-muted/40 p-4">
                <span className="text-muted-foreground">User ID:</span>
                <span className="col-span-2 font-mono text-xs break-all flex items-center gap-1.5">
                  {selectedUser.id}
                  <button
                    onClick={() => copyToClipboard(selectedUser.id, "ID copied")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </span>

                <span className="text-muted-foreground">Email:</span>
                <span className="col-span-2 font-medium">{selectedUser.email}</span>

                <span className="text-muted-foreground">Phone:</span>
                <span className="col-span-2">{selectedUser.phoneNumber || "None provided"}</span>

                <span className="text-muted-foreground">Role:</span>
                <span className="col-span-2 capitalize font-semibold flex items-center gap-1.5">
                  {selectedUser.role === "admin" ? (
                    <>
                      <Crown className="h-4 w-4 text-amber-500" /> Administrator
                    </>
                  ) : (
                    "Standard User"
                  )}
                </span>

                <span className="text-muted-foreground">Status:</span>
                <span className="col-span-2">
                  {selectedUser.isBanned ? (
                    <span className="text-destructive font-medium">Suspended</span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                  )}
                </span>

                <span className="text-muted-foreground">Verified Email:</span>
                <span className="col-span-2">{selectedUser.emailConfirmed ? "Yes" : "Unverified"}</span>

                <span className="text-muted-foreground">Created:</span>
                <span className="col-span-2">{new Date(selectedUser.createdAt).toLocaleString()}</span>

                <span className="text-muted-foreground">Last Sign In:</span>
                <span className="col-span-2">
                  {selectedUser.lastSignInAt ? new Date(selectedUser.lastSignInAt).toLocaleString() : "Never"}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" className="rounded-full w-full" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG 5: DELETE USER CONFIRMATION                      */}
      {/* ======================================================== */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Delete User Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete the account for{" "}
              <strong className="text-foreground">{deleteTarget?.fullName}</strong> ({deleteTarget?.email})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="rounded-full flex-1" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-full flex-1"
              onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting…" : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// REGISTER USER DIALOG COMPONENT
// ==========================================
function RegisterUserDialog({
  open,
  onOpenChange,
  prefill,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: { name: string; email: string; phone: string } | null;
  onSubmit: (data: {
    fullName: string;
    email: string;
    password: string;
    role: "admin" | "user";
    phoneNumber?: string;
    emailConfirm: boolean;
  }) => void;
  isPending: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailConfirm, setEmailConfirm] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Sync prefill values when opened with student data
  useMemo(() => {
    if (prefill) {
      setFullName(prefill.name);
      setEmail(prefill.email);
      setPhoneNumber(prefill.phone);
      setPassword(generateSecurePassword());
    } else if (open && !password) {
      setPassword(generateSecurePassword());
    }
  }, [prefill, open]);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Please enter a full name.");
    if (!email.trim()) return toast.error("Please enter an email address.");
    if (password.length < 8) return toast.error("Password must be at least 8 characters long.");

    onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      role,
      phoneNumber: phoneNumber.trim() || undefined,
      emailConfirm,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" /> Register New User
          </DialogTitle>
          <DialogDescription>
            Create a secure user or administrator account for Glory Music Center.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="reg-fullname">Full Name</Label>
            <Input
              id="reg-fullname"
              placeholder="e.g. Samuel Bekele"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="rounded-2xl min-h-11 bg-card"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email Address</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-2xl min-h-11 bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-phone">Phone Number (Optional)</Label>
              <Input
                id="reg-phone"
                placeholder="+251 91 123 4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="rounded-2xl min-h-11 bg-card"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="reg-password">Initial Password</Label>
              <button
                type="button"
                onClick={() => setPassword(generateSecurePassword())}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> Auto-generate strong
              </button>
            </div>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="rounded-2xl min-h-11 bg-card pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-role">Account Role & Privileges</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "user")}>
              <SelectTrigger id="reg-role" className="rounded-2xl min-h-11 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Standard User</span>
                      <span className="block text-[11px] text-muted-foreground">Standard portal access</span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <div>
                      <span className="font-medium">Administrator</span>
                      <span className="block text-[11px] text-muted-foreground">Full access to manage users, data & gallery</span>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-2xl border p-3.5 bg-muted/20">
            <div className="space-y-0.5">
              <Label htmlFor="auto-confirm" className="text-sm font-medium cursor-pointer">
                Auto-confirm Email
              </Label>
              <p className="text-xs text-muted-foreground">User can sign in immediately without email link verification</p>
            </div>
            <Switch id="auto-confirm" checked={emailConfirm} onCheckedChange={setEmailConfirm} />
          </div>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-full flex-1 shadow-md">
              {isPending ? "Creating Account…" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// EDIT USER PROFILE DIALOG
// ==========================================
function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { userId: string; fullName: string; email: string; phoneNumber?: string }) => void;
  isPending: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useMemo(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
      setPhoneNumber(user.phoneNumber || "");
    }
  }, [user]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim()) return toast.error("Full name cannot be blank.");
    if (!email.trim()) return toast.error("Email cannot be blank.");

    onSubmit({
      userId: user.id,
      fullName: fullName.trim(),
      email: email.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" /> Edit User Profile
          </DialogTitle>
          <DialogDescription>Update contact information for this account.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="rounded-2xl min-h-11 bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email Address</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-2xl min-h-11 bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Phone Number</Label>
            <Input
              id="edit-phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +251 91 123 4567"
              className="rounded-2xl min-h-11 bg-card"
            />
          </div>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button type="button" variant="outline" className="rounded-full flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-full flex-1 shadow-md">
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// RESET PASSWORD DIALOG
// ==========================================
function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (newPassword: string) => void;
  isPending: boolean;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);

  useMemo(() => {
    if (open) {
      setNewPassword(generateSecurePassword());
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters long.");
    onSubmit(newPassword);
  }

  function copyPassword() {
    navigator.clipboard.writeText(newPassword);
    toast.success("Password copied to clipboard!");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-500" /> Reset User Password
          </DialogTitle>
          <DialogDescription>
            Set a new password for <strong className="text-foreground">{user?.fullName}</strong> ({user?.email}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="reset-pwd">New Password</Label>
              <button
                type="button"
                onClick={() => setNewPassword(generateSecurePassword())}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> Generate New
              </button>
            </div>
            <div className="relative">
              <Input
                id="reset-pwd"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="rounded-2xl min-h-11 bg-card pr-20 font-mono text-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={copyPassword}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Be sure to securely provide this temporary password to the user.
            </p>
          </div>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button type="button" variant="outline" className="rounded-full flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-full flex-1 shadow-md">
              {isPending ? "Updating Password…" : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// MANUAL STUDENT REGISTRATION DIALOG
// ==========================================
function ManualStudentRegisterDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ManualStudentRegistrationInput) => void;
  isPending: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<number>(14);
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [altPhoneNumber, setAltPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [address, setAddress] = useState("Bale Robe");
  const [course, setCourse] = useState<"piano" | "keyboard" | "guitar" | "saxophone" | "vocal">("piano");
  const [skillLevel, setSkillLevel] = useState("beginner");
  const [hasInstrument, setHasInstrument] = useState("no");
  const [classType, setClassType] = useState("group");
  const [preferredSchedule, setPreferredSchedule] = useState("monday-saturday-2-1");
  const [status, setStatus] = useState<"new" | "contacted" | "enrolled" | "completed" | "cancelled">("enrolled");
  const [language, setLanguage] = useState<"en" | "am" | "om">("en");
  const [message, setMessage] = useState("");
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [userPassword, setUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useMemo(() => {
    if (open && !userPassword) {
      setUserPassword(generateSecurePassword());
    }
  }, [open]);

  function resetForm() {
    setFullName("");
    setAge(14);
    setGender("male");
    setPhoneNumber("");
    setAltPhoneNumber("");
    setEmail("");
    setGuardianName("");
    setGuardianRelationship("");
    setAddress("Bale Robe");
    setCourse("piano");
    setSkillLevel("beginner");
    setHasInstrument("no");
    setClassType("group");
    setPreferredSchedule("monday-saturday-2-1");
    setStatus("enrolled");
    setLanguage("en");
    setMessage("");
    setCreateUserAccount(false);
    setUserPassword(generateSecurePassword());
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Please enter student full name.");
    if (!email.trim()) return toast.error("Please enter student email.");
    if (!phoneNumber.trim()) return toast.error("Please enter student phone number.");
    if (createUserAccount && userPassword.length < 8) {
      return toast.error("User password must be at least 8 characters.");
    }

    onSubmit({
      fullName: fullName.trim(),
      age: Number(age) || 12,
      gender,
      phoneNumber: phoneNumber.trim(),
      altPhoneNumber: altPhoneNumber.trim() || undefined,
      email: email.trim(),
      guardianName: guardianName.trim() || undefined,
      guardianRelationship: guardianRelationship.trim() || undefined,
      address: address.trim() || undefined,
      course,
      skillLevel,
      hasInstrument,
      classType,
      preferredSchedule,
      status,
      language,
      message: message.trim() || undefined,
      createUserAccount,
      userPassword: createUserAccount ? userPassword : undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" /> Register Student Manually
          </DialogTitle>
          <DialogDescription>
            Directly enroll a new student with full detailed profile and assign their class schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-6 mt-2">
          {/* Section 1: Basic Student Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary border-b pb-1">
              1. Student Identity & Contact
            </h4>
            <div className="space-y-1.5">
              <Label htmlFor="m-fullname">Full Name *</Label>
              <Input
                id="m-fullname"
                placeholder="e.g. Yohannes Tesfaye"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="rounded-2xl min-h-11 bg-card"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="m-age">Age *</Label>
                <Input
                  id="m-age"
                  type="number"
                  min={4}
                  max={99}
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value, 10) || 4)}
                  required
                  className="rounded-2xl min-h-11 bg-card"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-gender">Gender *</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as "male" | "female" | "other")}>
                  <SelectTrigger id="m-gender" className="rounded-2xl min-h-11 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="m-phone">Primary Phone Number *</Label>
                <Input
                  id="m-phone"
                  placeholder="+251 91 123 4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="rounded-2xl min-h-11 bg-card"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-altphone">Alternate / Emergency Phone</Label>
                <Input
                  id="m-altphone"
                  placeholder="+251 92 987 6543"
                  value={altPhoneNumber}
                  onChange={(e) => setAltPhoneNumber(e.target.value)}
                  className="rounded-2xl min-h-11 bg-card"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="m-email">Email Address *</Label>
                <Input
                  id="m-email"
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-2xl min-h-11 bg-card"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-address">Address / Kebele</Label>
                <Input
                  id="m-address"
                  placeholder="e.g. Bale Robe, Kebele 02"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="rounded-2xl min-h-11 bg-card"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Guardian Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary border-b pb-1">
              2. Parent / Guardian Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="m-guardian">Guardian Name (Optional)</Label>
                <Input
                  id="m-guardian"
                  placeholder="e.g. Tesfaye Desta"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="rounded-2xl min-h-11 bg-card"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-relationship">Relationship</Label>
                <Input
                  id="m-relationship"
                  placeholder="e.g. Father, Mother, Relative, Self"
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  className="rounded-2xl min-h-11 bg-card"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Course & Schedule */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary border-b pb-1">
              3. Course Selection & Operational Schedule
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="m-course">Instrument / Course *</Label>
                <Select value={course} onValueChange={(v) => setCourse(v as any)}>
                  <SelectTrigger id="m-course" className="rounded-2xl min-h-11 bg-card capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piano">Piano (ክላሲካል / ዘመናዊ)</SelectItem>
                    <SelectItem value="keyboard">Keyboard (ኪቦርድ)</SelectItem>
                    <SelectItem value="guitar">Guitar (አኮስቲክ / ኤሌክትሪክ)</SelectItem>
                    <SelectItem value="saxophone">Saxophone (ሳክሶፎን)</SelectItem>
                    <SelectItem value="vocal">Vocal (የድምፅ ስልጠና)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-schedule">Preferred Schedule *</Label>
                <Select value={preferredSchedule} onValueChange={setPreferredSchedule}>
                  <SelectTrigger id="m-schedule" className="rounded-2xl min-h-11 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.id === "monday-saturday-2-1" ? `⭐ ${opt.label}` : opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="m-skill">Experience Level</Label>
                <Select value={skillLevel} onValueChange={setSkillLevel}>
                  <SelectTrigger id="m-skill" className="rounded-2xl min-h-11 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner (New)</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-instrument">Owns Instrument?</Label>
                <Select value={hasInstrument} onValueChange={setHasInstrument}>
                  <SelectTrigger id="m-instrument" className="rounded-2xl min-h-11 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes (Has instrument)</SelectItem>
                    <SelectItem value="no">No (Uses Center's)</SelectItem>
                    <SelectItem value="planning">Planning to buy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-classtype">Class Format</Label>
                <Select value={classType} onValueChange={setClassType}>
                  <SelectTrigger id="m-classtype" className="rounded-2xl min-h-11 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Group Class</SelectItem>
                    <SelectItem value="private">1-on-1 Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 4: Status & Notes */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary border-b pb-1">
              4. Registration Status & Remarks
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="m-status">Initial Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger id="m-status" className="rounded-2xl min-h-11 bg-card capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrolled">Enrolled (Active)</SelectItem>
                    <SelectItem value="new">New Inquiry</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-language">Preferred Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                  <SelectTrigger id="m-language" className="rounded-2xl min-h-11 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                    <SelectItem value="om">Afaan Oromoo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-notes">Special Goals / Administrative Notes</Label>
              <Textarea
                id="m-notes"
                placeholder="e.g. Wants to focus on gospel hymns and chord transitions; attends Monday-Saturday 2:00-1:00 sessions."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="rounded-2xl min-h-20 bg-card"
              />
            </div>
          </div>

          {/* Section 5: Student Login Account (Optional) */}
          <div className="rounded-2xl border p-4 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="m-create-auth" className="text-sm font-medium cursor-pointer">
                  Create Student Portal Login Account
                </Label>
                <p className="text-xs text-muted-foreground">
                  Generates an authenticated login for this student using their email
                </p>
              </div>
              <Switch
                id="m-create-auth"
                checked={createUserAccount}
                onCheckedChange={setCreateUserAccount}
              />
            </div>

            {createUserAccount && (
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label htmlFor="m-pwd">Student Initial Password</Label>
                  <button
                    type="button"
                    onClick={() => setUserPassword(generateSecurePassword())}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" /> Auto-generate strong
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="m-pwd"
                    type={showPassword ? "text" : "password"}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    required={createUserAccount}
                    minLength={8}
                    className="rounded-2xl min-h-11 bg-card pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full flex-1"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-full flex-1 shadow-md">
              {isPending ? "Registering Student…" : "Enroll Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 2. STUDENTS REGISTRATION PANEL
// ==========================================
function StudentsPanel({
  onConvertToUser,
}: {
  onConvertToUser: (student: { full_name: string; email: string; phone_number: string }) => void;
}) {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listRegistrations);
  const deleteFn = useServerFn(deleteRegistration);
  const statusFn = useServerFn(updateRegistrationStatus);
  const manualRegisterFn = useServerFn(createManualStudentRegistration);

  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Registration | null>(null);
  const [openManualRegister, setOpenManualRegister] = useState(false);

  const registrations = useQuery({ queryKey: ["registrations"], queryFn: () => listFn({}) });
  const rows = registrations.data ?? [];

  const manualRegisterMutation = useMutation({
    mutationFn: (data: ManualStudentRegistrationInput) => manualRegisterFn({ data }),
    onSuccess: (res) => {
      toast.success(
        "Student registered successfully" + (res.authUserCreated ? " with login account" : ""),
      );
      setOpenManualRegister(false);
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      if (res.authUserCreated) {
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      }
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Student removed");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const changeStatus = useMutation({
    mutationFn: (v: { id: string; status: Status }) => statusFn({ data: v }),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (course === "all" || r.course === course) &&
        (status === "all" || r.status === status) &&
        (!q || [r.full_name, r.email, r.phone_number, r.guardian_name ?? ""].some((f) => f.toLowerCase().includes(q))),
    );
  }, [rows, query, course, status]);

  const stats = [
    { label: "Total Students", value: rows.length },
    { label: "New Requests", value: rows.filter((r) => r.status === "new").length },
    { label: "Enrolled", value: rows.filter((r) => r.status === "enrolled").length },
    { label: "This Week", value: rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 7 * 864e5).length },
  ];

  function exportCsv() {
    const header = ["Date", "Name", "Age", "Gender", "Course", "Schedule", "Phone", "Email", "Guardian", "Status", "Message"];
    const lines = filtered.map((r) =>
      [
        new Date(r.created_at).toLocaleString(),
        r.full_name,
        r.age,
        r.gender,
        r.course,
        formatScheduleLabel(r.preferred_schedule),
        r.phone_number,
        r.email,
        r.guardian_name ?? "",
        r.status,
        r.message ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "glory-students.csv";
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-panel rounded-3xl p-5 border border-border/60">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-60">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, email…"
            className="min-h-11 rounded-full bg-card pl-10 pr-4"
          />
        </div>
        <Select value={course} onValueChange={setCourse}>
          <SelectTrigger className="min-h-11 w-40 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {["piano", "keyboard", "guitar", "saxophone", "vocal"].map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="min-h-11 w-40 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => registrations.refetch()}
          disabled={registrations.isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${registrations.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
        <Button variant="outline" className="min-h-11 rounded-full" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
        <Button
          onClick={() => setOpenManualRegister(true)}
          className="min-h-11 rounded-full px-5 shadow-md font-medium"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Register Student Manually
        </Button>
      </div>

      <div className="glass-panel overflow-hidden rounded-[2rem] border border-border/60">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2 text-primary" /> Loading students…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No registrations found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-semibold text-sm">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Age {r.age} · {r.email}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize font-medium text-xs">{r.course}</TableCell>
                    <TableCell className="text-xs text-foreground/80 font-medium">
                      {formatScheduleLabel(r.preferred_schedule)}
                    </TableCell>
                    <TableCell>
                      <a href={`tel:${r.phone_number}`} className="text-primary text-xs hover:underline">
                        {r.phone_number}
                      </a>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.status}
                        onValueChange={(v) => changeStatus.mutate({ id: r.id, status: v as Status })}
                      >
                        <SelectTrigger className="h-8 w-32 rounded-full capitalize text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize text-xs">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-xs text-primary hover:bg-primary/10 mr-1"
                        onClick={() => onConvertToUser(r)}
                        title="Create User Account for this Student"
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Create Account
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setSelected(r)}
                        aria-label="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label="Delete"
                        onClick={() => {
                          if (confirm(`Delete registration for ${r.full_name}?`)) remove.mutate(r.id);
                        }}
                        disabled={remove.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm rounded-2xl bg-muted/40 p-4">
                {(
                  [
                    ["Age", selected.age],
                    ["Gender", selected.gender],
                    ["Course", selected.course],
                    ["Schedule", formatScheduleLabel(selected.preferred_schedule)],
                    ["Phone", selected.phone_number],
                    ["Email", selected.email],
                    ["Guardian", selected.guardian_name || "—"],
                    ["Language", selected.language],
                    ["Status", selected.status],
                    ["Registered", new Date(selected.created_at).toLocaleString()],
                    ["Details / Notes", selected.message || "—"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="col-span-2 break-words capitalize-first">{String(v)}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    onConvertToUser(selected);
                    setSelected(null);
                  }}
                  className="rounded-full"
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Register as User
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ManualStudentRegisterDialog
        open={openManualRegister}
        onOpenChange={setOpenManualRegister}
        onSubmit={(data) => manualRegisterMutation.mutate(data)}
        isPending={manualRegisterMutation.isPending}
      />
    </div>
  );
}

// ==========================================
// 3. GALLERY MANAGEMENT PANEL
// ==========================================
function GalleryPanel() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listGalleryPhotos);
  const deleteFn = useServerFn(deleteGalleryPhoto);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("events");
  const [uploading, setUploading] = useState(false);

  const photos = useQuery({ queryKey: ["gallery-photos"], queryFn: () => listFn() });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Photo removed");
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Choose a photo first");
    if (!file.type.startsWith("image/")) return toast.error("Only image files are allowed");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("gallery_photos").insert({
        storage_path: path,
        caption: caption.trim() || null,
        category,
      });
      if (dbErr) throw dbErr;
      toast.success("Photo posted to the gallery");
      setFile(null);
      setCaption("");
      (e.target as HTMLFormElement).reset();
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <form onSubmit={upload} className="glass-panel h-fit space-y-4 rounded-[2rem] p-6 border border-border/60">
        <h2 className="font-display text-xl">Post a new photo</h2>
        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground hover:border-primary/50 transition-colors">
          {file ? (
            <img src={URL.createObjectURL(file)} alt="Preview" className="max-h-48 rounded-xl object-cover" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-primary" /> Click to choose a photo (max 10MB)
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          maxLength={150}
          className="rounded-full bg-card min-h-11"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="rounded-full capitalize min-h-11 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="min-h-11 w-full rounded-full shadow-md" disabled={uploading || !file}>
          {uploading ? "Uploading…" : "Post to gallery"}
        </Button>
      </form>

      <div>
        <h2 className="font-display text-xl">Posted photos ({photos.data?.length ?? 0})</h2>
        <p className="text-sm text-muted-foreground">These appear on the homepage gallery alongside built-in media.</p>
        {photos.isLoading ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : !photos.data?.length ? (
          <p className="glass-panel mt-6 rounded-3xl p-8 text-center text-muted-foreground border border-border/60">
            No photos posted yet.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            {photos.data.map((p) => (
              <div key={p.id} className="glass-panel overflow-hidden rounded-3xl border border-border/60">
                <img src={p.url} alt={p.caption ?? "Gallery photo"} className="aspect-square w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.caption || "Untitled"}</p>
                    <p className="text-xs capitalize text-muted-foreground">{p.category}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Delete photo"
                    onClick={() => {
                      if (confirm("Remove this photo?")) remove.mutate(p.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. SYSTEM & SECURITY PANEL
// ==========================================
function SystemPanel({ checkData }: { checkData: Awaited<ReturnType<typeof isCurrentUserAdmin>> }) {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="glass-panel rounded-[2rem] p-6 sm:p-8 border border-border/60">
        <h2 className="font-display text-2xl flex items-center gap-2">
          <Server className="h-6 w-6 text-primary" /> System Architecture & Security
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform credentials, authentication status, and access control policies.
        </p>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-muted/40 p-4 border border-border/50">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Admin Session Identity
              </span>
              <p className="mt-1 font-mono text-sm break-all font-semibold">{checkData.userId}</p>
              <Badge className="mt-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                Authenticated Administrator
              </Badge>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4 border border-border/50">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Service Role Key Status
              </span>
              <p className="mt-1 text-sm font-semibold">
                {checkData.hasServiceRole ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Active (Full Auth Admin API Enabled)
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Publishable Client Mode
                  </span>
                )}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {checkData.hasServiceRole
                  ? "Direct user registration, password changes, and account suspensions are active."
                  : "Add SUPABASE_SERVICE_ROLE_KEY to .env to unlock full direct auth creation."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-muted/20 p-5 border border-border/40">
            <h3 className="font-display text-base text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Role-Based Access Control (RBAC)
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Glory Music Center enforces security through PostgreSQL Row Level Security (RLS) policies and server-side
              permission assertions. All administrative mutations (updating student registrations, managing user roles,
              and deleting records) verify the caller's admin claim before execution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// CENTERED MESSAGE HELPER
// ==========================================
function CenteredMessage({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 text-center">
      <div className="glass-panel max-w-md rounded-[2rem] p-8 border border-border/60 shadow-xl">
        <h1 className="font-display text-2xl">{title}</h1>
        <p className="mt-3 text-muted-foreground text-sm leading-relaxed">{body}</p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </main>
  );
}
