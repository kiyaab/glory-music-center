import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin.functions";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type AttendanceRecord = {
  id: string;
  registrationId: string;
  studentId: string;
  studentName: string;
  course: string;
  schedule: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  timeIn?: string | null;
  remarks?: string | null;
  recordedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceStats = {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number; // 0 - 100%
  datesRecorded: number;
  studentCount: number;
};

// ==========================================
// STUDENT ID UTILITIES
// ==========================================

export function parseStudentId(message: string | null | undefined): string | null {
  if (!message) return null;
  const match = message.match(/Student ID:\s*([A-Za-z0-9-]+)/i);
  return match ? match[1].trim() : null;
}

export function formatStudentIdSequence(year: number, sequenceNumber: number): string {
  return `GMC-${year}-${String(sequenceNumber).padStart(4, "0")}`;
}

export function getOrGenerateStudentId(
  student: { id: string; created_at: string; message?: string | null },
  sequenceNumber = 1,
): string {
  const existing = parseStudentId(student.message);
  if (existing) return existing;
  const year = new Date(student.created_at || Date.now()).getFullYear();
  return formatStudentIdSequence(year, sequenceNumber);
}

// Local persistent file storage helper for attendance resilience
const ATTENDANCE_FILE_PATH = path.resolve(process.cwd(), "data", "attendance.json");

async function readLocalAttendance(): Promise<AttendanceRecord[]> {
  try {
    const raw = await fs.readFile(ATTENDANCE_FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeLocalAttendance(records: AttendanceRecord[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(ATTENDANCE_FILE_PATH), { recursive: true });
    await fs.writeFile(ATTENDANCE_FILE_PATH, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local attendance file:", err);
  }
}

// ==========================================
// SERVER FUNCTIONS (ADMIN-ONLY)
// ==========================================

/**
 * Automatically assign official Student IDs to all existing registered students
 * and persist them into the registration message metadata.
 */
export const syncStudentIds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch all registrations in chronological order
    const { data: rows, error } = await supabaseAdmin
      .from("registrations")
      .select("id, full_name, created_at, message")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch students for ID assignment: ${error.message}`);
    }

    let updatedCount = 0;
    const yearSequenceMap: Record<number, number> = {};

    for (const reg of rows ?? []) {
      const year = new Date(reg.created_at || Date.now()).getFullYear();
      yearSequenceMap[year] = (yearSequenceMap[year] || 0) + 1;
      const assignedId = formatStudentIdSequence(year, yearSequenceMap[year]);

      const currentId = parseStudentId(reg.message);
      if (!currentId) {
        // Prepend Student ID to message
        const updatedMessage = reg.message
          ? `Student ID: ${assignedId} | ${reg.message}`
          : `Student ID: ${assignedId}`;

        await supabaseAdmin
          .from("registrations")
          .update({ message: updatedMessage })
          .eq("id", reg.id);

        updatedCount++;
      }
    }

    return { ok: true, updatedCount, totalStudents: (rows ?? []).length };
  });

/**
 * List attendance records for a specific date or search filter.
 */
export const listAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        date: z.string().optional(), // YYYY-MM-DD
        course: z.string().optional(),
        schedule: z.string().optional(),
        studentId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data: filter, context }): Promise<AttendanceRecord[]> => {
    await assertAdmin(context.userId);

    // Try reading from Supabase attendance table first if available
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let query = supabaseAdmin.from("attendance" as any).select("*");

      if (filter.date) query = query.eq("date", filter.date);
      if (filter.course && filter.course !== "all") query = query.eq("course", filter.course);
      if (filter.schedule && filter.schedule !== "all") query = query.eq("schedule", filter.schedule);
      if (filter.studentId) query = query.eq("student_id", filter.studentId);

      const { data, error } = await query.order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((r: any) => ({
          id: r.id,
          registrationId: r.registration_id,
          studentId: r.student_id,
          studentName: r.student_name,
          course: r.course,
          schedule: r.schedule,
          date: r.date,
          status: r.status as AttendanceStatus,
          timeIn: r.time_in,
          remarks: r.remarks,
          recordedBy: r.recorded_by,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch {
      // Fallback to local persistent storage
    }

    // Local JSON fallback
    const all = await readLocalAttendance();
    return all.filter((r) => {
      if (filter.date && r.date !== filter.date) return false;
      if (filter.course && filter.course !== "all" && r.course !== filter.course) return false;
      if (filter.schedule && filter.schedule !== "all" && r.schedule !== filter.schedule) return false;
      if (filter.studentId && r.studentId.toLowerCase() !== filter.studentId.toLowerCase()) return false;
      return true;
    });
  });

/**
 * Record or update attendance for students on a given date.
 */
export const recordAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)"),
        records: z.array(
          z.object({
            registrationId: z.string().uuid(),
            studentId: z.string().min(1),
            studentName: z.string().min(1),
            course: z.string().min(1),
            schedule: z.string().min(1),
            status: z.enum(["present", "absent", "late", "excused"]),
            timeIn: z.string().optional().or(z.literal("")),
            remarks: z.string().optional().or(z.literal("")),
          }),
        ),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const now = new Date().toISOString();

    // 1. Try upserting to Supabase attendance table
    let supabaseSaved = false;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const rowsToUpsert = data.records.map((r) => ({
        registration_id: r.registrationId,
        student_id: r.studentId,
        student_name: r.studentName,
        course: r.course,
        schedule: r.schedule,
        date: data.date,
        status: r.status,
        time_in: r.timeIn || null,
        remarks: r.remarks || null,
        recorded_by: context.userId,
        updated_at: now,
      }));

      const { error } = await supabaseAdmin
        .from("attendance" as any)
        .upsert(rowsToUpsert, { onConflict: "registration_id, date" });

      if (!error) supabaseSaved = true;
    } catch {
      supabaseSaved = false;
    }

    // 2. Always sync to persistent local JSON storage
    const existing = await readLocalAttendance();
    const updatedMap = new Map<string, AttendanceRecord>();

    // Index existing records by registrationId + date
    for (const rec of existing) {
      updatedMap.set(`${rec.registrationId}_${rec.date}`, rec);
    }

    // Upsert incoming batch
    for (const r of data.records) {
      const key = `${r.registrationId}_${data.date}`;
      const prev = updatedMap.get(key);

      const record: AttendanceRecord = {
        id: prev?.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        registrationId: r.registrationId,
        studentId: r.studentId,
        studentName: r.studentName,
        course: r.course,
        schedule: r.schedule,
        date: data.date,
        status: r.status,
        timeIn: r.timeIn || null,
        remarks: r.remarks || null,
        recordedBy: context.userId,
        createdAt: prev?.createdAt || now,
        updatedAt: now,
      };

      updatedMap.set(key, record);
    }

    await writeLocalAttendance(Array.from(updatedMap.values()));

    return {
      ok: true,
      date: data.date,
      count: data.records.length,
      supabaseSaved,
    };
  });

/**
 * Get aggregated attendance stats and metrics.
 */
export const getAttendanceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AttendanceStats> => {
    await assertAdmin(context.userId);

    // Read all records
    let records: AttendanceRecord[] = [];
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin.from("attendance" as any).select("*");
      if (!error && Array.isArray(data)) {
        records = data.map((r: any) => ({
          id: r.id,
          registrationId: r.registration_id,
          studentId: r.student_id,
          studentName: r.student_name,
          course: r.course,
          schedule: r.schedule,
          date: r.date,
          status: r.status as AttendanceStatus,
          timeIn: r.time_in,
          remarks: r.remarks,
          recordedBy: r.recorded_by,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch {
      records = [];
    }

    if (!records.length) {
      records = await readLocalAttendance();
    }

    const totalSessions = records.length;
    const presentCount = records.filter((r) => r.status === "present").length;
    const absentCount = records.filter((r) => r.status === "absent").length;
    const lateCount = records.filter((r) => r.status === "late").length;
    const excusedCount = records.filter((r) => r.status === "excused").length;

    // Attendance rate counts present + late as attended
    const attended = presentCount + lateCount;
    const attendanceRate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

    const uniqueDates = new Set(records.map((r) => r.date));
    const uniqueStudents = new Set(records.map((r) => r.studentId));

    return {
      totalSessions,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendanceRate,
      datesRecorded: uniqueDates.size,
      studentCount: uniqueStudents.size,
    };
  });

/**
 * Retrieve complete attendance history for an individual student.
 */
export const getStudentAttendanceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ registrationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    let records: AttendanceRecord[] = [];
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: dbData, error } = await supabaseAdmin
        .from("attendance" as any)
        .select("*")
        .eq("registration_id", data.registrationId)
        .order("date", { ascending: false });

      if (!error && Array.isArray(dbData)) {
        records = dbData.map((r: any) => ({
          id: r.id,
          registrationId: r.registration_id,
          studentId: r.student_id,
          studentName: r.student_name,
          course: r.course,
          schedule: r.schedule,
          date: r.date,
          status: r.status as AttendanceStatus,
          timeIn: r.time_in,
          remarks: r.remarks,
          recordedBy: r.recorded_by,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch {
      records = [];
    }

    if (!records.length) {
      const all = await readLocalAttendance();
      records = all
        .filter((r) => r.registrationId === data.registrationId)
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const late = records.filter((r) => r.status === "late").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const excused = records.filter((r) => r.status === "excused").length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return {
      records,
      stats: { total, present, late, absent, excused, rate },
    };
  });
