import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: "admin" | "user";
  createdAt: string;
  lastSignInAt?: string | null;
  emailConfirmed: boolean;
  isBanned: boolean;
  bannedUntil?: string | null;
  source: "auth" | "role_only";
};

export type AdminStatus = {
  isAdmin: boolean;
  canBootstrap: boolean;
  totalAdmins: number;
  userId: string;
  hasServiceRole: boolean;
};

import { isMasterAdminId, ADMIN_CREDENTIALS } from "@/lib/auth-admin";

export async function assertAdmin(userId: string) {
  if (isMasterAdminId(userId)) {
    return;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify administrator role: ${error.message}`);
  }
  if (!data) {
    throw new Error("Forbidden: Administrator privileges required.");
  }
}

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStatus> => {
    const { supabaseAdmin, isServiceRoleConfigured } = await import("@/integrations/supabase/client.server");

    // Master admin credentials shortcut
    if (isMasterAdminId(context.userId)) {
      return {
        isAdmin: true,
        canBootstrap: false,
        totalAdmins: 1,
        userId: context.userId,
        hasServiceRole: isServiceRoleConfigured(),
      };
    }

    // Check if the current user has the admin role
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    // Check total admin count in case database needs initial admin bootstrap
    const { count: adminCount } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    const totalAdmins = adminCount ?? 0;
    const canBootstrap = totalAdmins === 0;

    return {
      isAdmin: Boolean(userRole),
      canBootstrap,
      totalAdmins,
      userId: context.userId,
      hasServiceRole: isServiceRoleConfigured(),
    };
  });

export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count: adminCount } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if ((adminCount ?? 0) > 0) {
      throw new Error("Primary administrator has already been claimed. Contact an existing admin.");
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id, role" });

    if (error) {
      throw new Error(`Failed to initialize administrator role: ${error.message}`);
    }

    return { ok: true, message: "Administrator privileges granted successfully." };
  });

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin, isServiceRoleConfigured } = await import("@/integrations/supabase/client.server");

    // Fetch all roles mapped in user_roles table
    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at");

    if (rolesError) {
      console.warn("Could not fetch user_roles:", rolesError.message);
    }

    const roleMap = new Map<string, "admin" | "user">();
    for (const r of rolesData ?? []) {
      roleMap.set(r.user_id, r.role as "admin" | "user");
    }

    const masterAdmin: ManagedUser = {
      id: ADMIN_CREDENTIALS.userId,
      email: ADMIN_CREDENTIALS.email,
      fullName: "Glory Administrator",
      phoneNumber: "+251 91 028 7951",
      role: "admin",
      createdAt: "2026-01-01T00:00:00.000Z",
      lastSignInAt: new Date().toISOString(),
      emailConfirmed: true,
      isBanned: false,
      bannedUntil: null,
      source: "auth" as const,
    };

    // Try fetching Supabase Auth users if service role key is configured
    if (isServiceRoleConfigured()) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          perPage: 1000,
        });

        if (!authError && authData?.users) {
          const authUsers = authData.users
            .filter((u) => u.id !== ADMIN_CREDENTIALS.userId && u.email !== ADMIN_CREDENTIALS.email)
            .map((u) => {
              const role = roleMap.get(u.id) || ((u.user_metadata?.role as "admin" | "user") ?? "user");
              const fullName =
                (u.user_metadata?.full_name as string) ||
                (u.user_metadata?.name as string) ||
                (u.email ? u.email.split("@")[0] : "User");
              const phoneNumber =
                (u.user_metadata?.phone_number as string) ||
                (u.user_metadata?.phone as string) ||
                u.phone ||
                "";
              const isBanned = Boolean(u.banned_until && new Date(u.banned_until).getTime() > Date.now());

              return {
                id: u.id,
                email: u.email ?? "No email",
                fullName,
                phoneNumber,
                role,
                createdAt: u.created_at,
                lastSignInAt: u.last_sign_in_at || null,
                emailConfirmed: Boolean(u.email_confirmed_at),
                isBanned,
                bannedUntil: u.banned_until || null,
                source: "auth" as const,
              };
            });

          return [masterAdmin, ...authUsers];
        }
      } catch (err) {
        console.warn("Could not list auth.users via admin API:", err);
      }
    }

    // Fallback: Return registered roles with placeholder email/details if service role key is not active
    const mappedRoles = (rolesData ?? [])
      .filter((r) => r.user_id !== ADMIN_CREDENTIALS.userId)
      .map((r) => ({
        id: r.user_id,
        email: r.user_id === context.userId ? ADMIN_CREDENTIALS.email : `User ${r.user_id.slice(0, 8)}`,
        fullName: r.role === "admin" ? "Administrator" : "Standard User",
        phoneNumber: "",
        role: r.role as "admin" | "user",
        createdAt: r.created_at,
        lastSignInAt: null,
        emailConfirmed: true,
        isBanned: false,
        bannedUntil: null,
        source: "role_only" as const,
      }));

    return [masterAdmin, ...mappedRoles];
  });

export const registerManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
        email: z.string().trim().email("Please enter a valid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        role: z.enum(["admin", "user"]),
        phoneNumber: z.string().trim().optional(),
        emailConfirm: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin, isServiceRoleConfigured } = await import("@/integrations/supabase/client.server");

    if (!isServiceRoleConfigured()) {
      throw new Error(
        "Creating auth accounts directly requires SUPABASE_SERVICE_ROLE_KEY to be set in your .env file. Alternatively, ask the user to sign up via /auth and you can manage their role here.",
      );
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: data.emailConfirm,
      user_metadata: {
        full_name: data.fullName,
        phone_number: data.phoneNumber || null,
        role: data.role,
      },
    });

    if (createError || !newUser?.user) {
      throw new Error(createError?.message ?? "Failed to create user account.");
    }

    // Store role mapping in user_roles
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: data.role,
    });

    if (roleError) {
      console.warn("User created but role mapping failed:", roleError.message);
    }

    return {
      ok: true,
      userId: newUser.user.id,
      email: newUser.user.email,
      fullName: data.fullName,
      role: data.role,
    };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid("Invalid user ID"),
        role: z.enum(["admin", "user"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin, isServiceRoleConfigured } = await import("@/integrations/supabase/client.server");

    // Prevent demoting the only remaining admin or demoting self if no other admins exist
    if (data.userId === context.userId && data.role === "user") {
      const { count: adminCount } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if ((adminCount ?? 0) <= 1) {
        throw new Error("Cannot demote yourself: at least one administrator must remain.");
      }
    }

    // Delete existing roles for this user and insert new role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error: insertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: data.userId,
      role: data.role,
    });

    if (insertError) {
      throw new Error(`Failed to update user role: ${insertError.message}`);
    }

    // Sync role in auth metadata if service role key is available
    if (isServiceRoleConfigured()) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(data.userId, {
          user_metadata: { role: data.role },
        });
      } catch (err) {
        console.warn("Could not sync role in auth user metadata:", err);
      }
    }

    return { ok: true, role: data.role };
  });

export const updateUserDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        fullName: z.string().trim().min(2),
        email: z.string().trim().email(),
        phoneNumber: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin, isServiceRoleConfigured } = await import("@/integrations/supabase/client.server");

    if (!isServiceRoleConfigured()) {
      throw new Error("Updating auth details directly requires SUPABASE_SERVICE_ROLE_KEY in .env.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: data.email,
      user_metadata: {
        full_name: data.fullName,
        phone_number: data.phoneNumber || null,
      },
    });

    if (error) {
      throw new Error(`Failed to update user details: ${error.message}`);
    }

    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin, isServiceRoleConfigured } = await import("@/integrations/supabase/client.server");

    if (!isServiceRoleConfigured()) {
      throw new Error("Password resets require SUPABASE_SERVICE_ROLE_KEY in .env.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });

    if (error) {
      throw new Error(`Failed to reset password: ${error.message}`);
    }

    return { ok: true };
  });

export const toggleUserBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        banned: z.boolean(),
        durationHours: z.number().positive().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (data.userId === context.userId) {
      throw new Error("You cannot suspend your own administrator account.");
    }

    const { supabaseAdmin, isServiceRoleConfigured } = await import("@/integrations/supabase/client.server");

    if (!isServiceRoleConfigured()) {
      throw new Error("Suspending users requires SUPABASE_SERVICE_ROLE_KEY in .env.");
    }

    const banDuration = data.banned
      ? data.durationHours
        ? `${data.durationHours}h`
        : "87600h" // ~10 years
      : "none";

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: banDuration,
    });

    if (error) {
      throw new Error(`Failed to update account suspension status: ${error.message}`);
    }

    return { ok: true, isBanned: data.banned };
  });

export const deleteManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (data.userId === context.userId) {
      throw new Error("You cannot delete your own administrator account while logged in.");
    }

    const { supabaseAdmin, isServiceRoleConfigured } = await import("@/integrations/supabase/client.server");

    // Remove user roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);

    // Delete auth user if service role key is active
    if (isServiceRoleConfigured()) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
      if (error) {
        throw new Error(`Failed to delete user from Supabase Auth: ${error.message}`);
      }
    }

    return { ok: true };
  });

export const convertRegistrationToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        registrationId: z.string().uuid(),
        password: z.string().min(8),
        role: z.enum(["admin", "user"]).default("user"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin, isServiceRoleConfigured } = await import("@/integrations/supabase/client.server");
    const { readLocalRegistrations, updateLocalRegistrationStatus } = await import("@/lib/registrations-store");

    if (!isServiceRoleConfigured()) {
      throw new Error("Creating auth accounts requires SUPABASE_SERVICE_ROLE_KEY in .env.");
    }

    let reg: any = null;
    try {
      const { data: regRemote } = await supabaseAdmin
        .from("registrations")
        .select("*")
        .eq("id", data.registrationId)
        .maybeSingle();
      if (regRemote) reg = regRemote;
    } catch {}

    if (!reg) {
      const localList = await readLocalRegistrations();
      reg = localList.find((r) => r.id === data.registrationId);
    }

    if (!reg) {
      throw new Error("Student registration record not found.");
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: reg.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: reg.full_name,
        phone_number: reg.phone_number,
        course: reg.course,
        role: data.role,
      },
    });

    if (createError || !newUser?.user) {
      throw new Error(createError?.message ?? "Failed to create user account for student.");
    }

    // Assign role
    await supabaseAdmin.from("user_roles").upsert({
      user_id: newUser.user.id,
      role: data.role,
    });

    // Mark registration as enrolled
    try {
      await supabaseAdmin.from("registrations").update({ status: "enrolled" }).eq("id", data.registrationId);
    } catch {}
    await updateLocalRegistrationStatus(data.registrationId, "enrolled");

    return {
      ok: true,
      userId: newUser.user.id,
      email: reg.email,
      fullName: reg.full_name,
    };
  });

export const listRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { readLocalRegistrations, mergeRegistrations } = await import("@/lib/registrations-store");

    let remoteList: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        remoteList = data;
      } else if (error) {
        console.warn("[Admin] Remote registrations fetch blocked/warning:", error.message);
      }
    } catch (err) {
      console.warn("[Admin] Remote registrations fetch exception:", err);
    }

    const localList = await readLocalRegistrations();
    return mergeRegistrations(remoteList, localList);
  });

export const deleteRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deleteLocalRegistration } = await import("@/lib/registrations-store");

    try {
      await supabaseAdmin.from("registrations").delete().eq("id", data.id);
    } catch {}
    await deleteLocalRegistration(data.id);
    return { ok: true };
  });

export const updateRegistrationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "contacted", "enrolled", "completed", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { updateLocalRegistrationStatus } = await import("@/lib/registrations-store");

    try {
      await supabaseAdmin.from("registrations").update({ status: data.status }).eq("id", data.id);
    } catch {}
    await updateLocalRegistrationStatus(data.id, data.status);
    return { ok: true };
  });

export const manualStudentRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(120),
  age: z.coerce.number().int().min(4, "Age must be at least 4").max(99),
  gender: z.enum(["male", "female", "other"]),
  phoneNumber: z.string().trim().min(7, "Primary phone number is required").max(30),
  altPhoneNumber: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  guardianName: z.string().trim().max(120).optional().or(z.literal("")),
  guardianRelationship: z.string().trim().max(50).optional().or(z.literal("")),
  address: z.string().trim().max(120).optional().or(z.literal("")),
  course: z.enum(["piano", "keyboard", "guitar", "saxophone", "vocal"]),
  skillLevel: z.string().optional().or(z.literal("")),
  hasInstrument: z.string().optional().or(z.literal("")),
  classType: z.string().optional().or(z.literal("")),
  preferredSchedule: z.string().min(1, "Please select a preferred schedule").max(100),
  status: z.enum(["new", "contacted", "enrolled", "completed", "cancelled"]).default("enrolled"),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
  language: z.enum(["en", "am", "om"]).default("en"),
  createUserAccount: z.boolean().default(false),
  userPassword: z.string().min(8).optional().or(z.literal("")),
});

export type ManualStudentRegistrationInput = z.infer<typeof manualStudentRegistrationSchema>;

export const createManualStudentRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => manualStudentRegistrationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin, isServiceRoleConfigured } = await import("@/integrations/supabase/client.server");
    const { readLocalRegistrations, upsertLocalRegistration } = await import("@/lib/registrations-store");

    const localList = await readLocalRegistrations();

    // Auto-generate official Student ID (GMC-YYYY-XXXX)
    const year = new Date().getFullYear();
    let sequence = 1;
    try {
      const { count } = await supabaseAdmin
        .from("registrations")
        .select("*", { count: "exact", head: true });
      sequence = Math.max((count ?? 0) + 1, localList.length + 1);
    } catch {
      sequence = localList.length + 1;
    }
    const studentId = `GMC-${year}-${String(sequence).padStart(4, "0")}`;

    // Package detailed student information into message column for complete schema resilience
    const detailsParts = [
      `Student ID: ${studentId}`,
      data.address ? `Address/Kebele: ${data.address}` : null,
      data.altPhoneNumber ? `Alt Phone: ${data.altPhoneNumber}` : null,
      data.guardianRelationship ? `Guardian Relation: ${data.guardianRelationship}` : null,
      data.skillLevel ? `Skill Level: ${data.skillLevel}` : null,
      data.hasInstrument ? `Owns Instrument: ${data.hasInstrument}` : null,
      data.classType ? `Class Type: ${data.classType}` : null,
      data.message ? `Notes: ${data.message}` : null,
    ].filter(Boolean);

    const consolidatedMessage = detailsParts.length ? detailsParts.join(" | ") : null;
    const registrationId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const regRecord = {
      id: registrationId,
      full_name: data.fullName,
      age: data.age,
      gender: data.gender,
      phone_number: data.phoneNumber,
      guardian_name: data.guardianName || null,
      email: data.email,
      course: data.course,
      preferred_schedule: data.preferredSchedule,
      message: consolidatedMessage,
      language: data.language,
      status: data.status,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Attempt remote Supabase insert
    let remoteSaved = false;
    try {
      const { error: insertError } = await supabaseAdmin
        .from("registrations")
        .insert({
          id: regRecord.id,
          full_name: regRecord.full_name,
          age: regRecord.age,
          gender: regRecord.gender,
          phone_number: regRecord.phone_number,
          guardian_name: regRecord.guardian_name,
          email: regRecord.email,
          course: regRecord.course,
          preferred_schedule: regRecord.preferred_schedule,
          message: regRecord.message,
          language: regRecord.language,
          status: regRecord.status,
        });

      if (!insertError) {
        remoteSaved = true;
      } else {
        console.warn(`[Admin] Remote Supabase registration write blocked (${insertError.code ?? "RLS"}): ${insertError.message}. Storing in resilient local store.`);
      }
    } catch (insertErr) {
      console.warn("[Admin] Remote Supabase registration exception:", insertErr);
    }

    // Always mirror to resilient local store so data is safe and immediately accessible
    await upsertLocalRegistration(regRecord);

    let authUserCreated = false;
    let authErrorMsg: string | null = null;

    // If admin requested auth account creation as well and service role is available
    if (data.createUserAccount && data.userPassword && isServiceRoleConfigured()) {
      try {
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: data.userPassword,
          email_confirm: true,
          user_metadata: {
            full_name: data.fullName,
            phone_number: data.phoneNumber,
            course: data.course,
            role: "user",
          },
        });

        if (authErr) {
          authErrorMsg = authErr.message;
        } else if (authUser?.user) {
          await supabaseAdmin.from("user_roles").upsert({
            user_id: authUser.user.id,
            role: "user",
          });
          authUserCreated = true;
        }
      } catch (err) {
        authErrorMsg = (err as Error).message;
      }
    }

    return {
      ok: true,
      registration: regRecord,
      studentId,
      remoteSaved,
      authUserCreated,
      authErrorMsg,
    };
  });

