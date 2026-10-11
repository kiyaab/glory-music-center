import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseStudentId, getOrGenerateStudentId, type AttendanceRecord } from "@/lib/attendance.functions";
import { formatScheduleLabel } from "@/lib/registration.functions";

export type StudentProfile = {
  id: string; // Registration ID
  studentId: string; // e.g. GMC-2026-0001
  fullName: string;
  email: string;
  phoneNumber: string;
  altPhoneNumber?: string | null;
  age: number;
  gender: string;
  course: "piano" | "keyboard" | "guitar" | "saxophone" | "vocal";
  preferredSchedule: string;
  scheduleLabel: string;
  status: string;
  address?: string | null;
  guardianName?: string | null;
  guardianRelationship?: string | null;
  skillLevel?: string | null;
  hasInstrument?: string | null;
  classType?: string | null;
  notes?: string | null;
  registeredAt: string;
};

export type StudentAttendanceSummary = {
  attendanceRate: number; // 0-100%
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  history: Array<{
    id: string;
    date: string;
    status: "present" | "late" | "absent" | "excused";
    timeIn?: string | null;
    remarks?: string | null;
  }>;
};

export type PracticeLogEntry = {
  id: string;
  date: string;
  durationMinutes: number;
  notes: string;
};

// Course curriculum data tailored for Glory Music Center students
export const COURSE_CURRICULUM: Record<
  string,
  {
    title: string;
    description: string;
    topics: Array<{ title: string; desc: string; exercises: string[] }>;
  }
> = {
  piano: {
    title: "Piano Mastery & Worship Hymns",
    description: "Classical posture, sight reading, chord harmonization, and gospel hymns accompaniment.",
    topics: [
      {
        title: "Posture, Fingering & Hand Independence",
        desc: "Correct hand curve, relaxation, and Hanon No. 1 finger autonomy.",
        exercises: ["Hanon Exercise 1 (Metronome 60-80 BPM)", "C Major 2-Octave Parallel Scale"],
      },
      {
        title: "Chords, Inversions & Cadences",
        desc: "Root, 1st, and 2nd inversions across major and minor triads.",
        exercises: ["I - IV - V - I Cadences in C, G, D, and F", "Smooth chord transitions without looking"],
      },
      {
        title: "Worship Hymn Accompaniment",
        desc: "Playing hymns with bass octave walking and melody decoration.",
        exercises: ["Amazing Grace chord voicing", "Gospel Praise 4/4 syncopated rhythm"],
      },
      {
        title: "Ear Training & Transposition",
        desc: "Recognizing intervals by ear and transposing simple melodies on the fly.",
        exercises: ["Singing & playing 3rd and 5th intervals", "Transposing a 3-chord hymn from C to G"],
      },
    ],
  },
  keyboard: {
    title: "Keyboard Synthesis & Live Worship Band",
    description: "Modern keyboard synthesis, pad layers, split voicings, and ensemble playing.",
    topics: [
      {
        title: "Synthesizer Controls & Sound Layering",
        desc: "Mastering sustain pedals, dual voice layers (Piano + Strings), and split bass.",
        exercises: ["Balancing Piano + Warm Pad levels", "Split keyboard left hand bass control"],
      },
      {
        title: "Contemporary Praise Progressions",
        desc: "1 - 5 - 6 - 4 progressions, suspended chords (sus2, sus4) and 7ths.",
        exercises: ["C - G/B - Am - F smooth voice leading", "Sus4 resolution drills in D and E major"],
      },
      {
        title: "Arpeggios & Dynamic Expression",
        desc: "Creating ambient arpeggios that build intensity during worship prayer moments.",
        exercises: ["16th-note arpeggio sweeps", "Sustain pedal timing to prevent muddy reverb"],
      },
      {
        title: "Live Band Timing & Metronome Sync",
        desc: "Playing locked in with drummer, bass player, and vocalists.",
        exercises: ["Playing with click track at 72 BPM & 120 BPM", "Intro and outro cue signals"],
      },
    ],
  },
  guitar: {
    title: "Acoustic & Electric Guitar Worship Training",
    description: "Open chords, barre chord mastery, fingerpicking, strumming dynamics, and praise rhythm.",
    topics: [
      {
        title: "Clean Open Chords & Strumming Timing",
        desc: "Mastering G, Cadd9, D, Em7, C, Am with quick finger switches.",
        exercises: ["1-minute chord transition challenge", "Consistent 4/4 Down-Down-Up-Up-Down strum"],
      },
      {
        title: "Barre Chords & Fretboard Navigation",
        desc: "Building index finger strength for F major and B minor barre shapes.",
        exercises: ["F Major clean tone hold for 30s", "Power chords on 5th and 6th strings"],
      },
      {
        title: "Acoustic Fingerstyle & Arpeggio Picking",
        desc: "PIMA thumb and finger independence for reflective worship songs.",
        exercises: ["Travis picking pattern in C major", "P-I-M-A arpeggio loop over Am - F - C - G"],
      },
      {
        title: "Capo Mastery & Praise Band Lead",
        desc: "Using the capo to match vocal keys effortlessly and adding suspended color tones.",
        exercises: ["Capo 2 / Capo 4 transposition", "Hammer-ons and pull-offs on D and C chords"],
      },
    ],
  },
  saxophone: {
    title: "Saxophone Tone, Breath & Worship Solos",
    description: "Embouchure control, long tones, scale projection, vibrato, and expressive solos.",
    topics: [
      {
        title: "Embouchure & Diaphragm Breath Support",
        desc: "Consistent airflow, mouthpiece positioning, and reed longevity care.",
        exercises: ["Long tone sustain for 20 seconds each note", "Low Bb to Middle F tone stability"],
      },
      {
        title: "Major & Minor Scales Across Octaves",
        desc: "Finger dexterity across the register key and low pinky table keys.",
        exercises: ["Chromatic scale across full instrument range", "G major and D major scales at 90 BPM"],
      },
      {
        title: "Articulation: Tonguing & Dynamics",
        desc: "Clean attacks, slurring, staccato, and crescendo / decrescendo control.",
        exercises: ["Sixteenth-note tonguing exercises", "Expressive volume swells on sustained notes"],
      },
      {
        title: "Worship Solos & Melodic Expression",
        desc: "Adding taste, bends, and vibrato to lead worship melodies.",
        exercises: ["Call and response melody improvisation", "Playing hymns with vocal inflection"],
      },
    ],
  },
  vocal: {
    title: "Vocal Technique & Worship Leadership",
    description: "Diaphragm breathing, pitch precision, vocal health, range expansion, and worship leadership.",
    topics: [
      {
        title: "Breath Support & Vocal Resonance",
        desc: "Diaphragmatic expansion, eliminating throat tension, and warm-up scales.",
        exercises: ["Lip trills and sirens over 1.5 octaves", "Humming resonance drills for forward placement"],
      },
      {
        title: "Pitch Accuracy & Ear Training",
        desc: "Singing clean intervals and holding harmony parts steadily.",
        exercises: ["Singing root, 3rd, and 5th over piano chords", "Minor vs major interval ear detection"],
      },
      {
        title: "Chest, Mix & Head Voice Blending",
        desc: "Transitioning smoothly through the vocal break (passaggio) without straining.",
        exercises: ["Octave slides on 'Nay' and 'Mum'", "Soft head voice tone control"],
      },
      {
        title: "Worship Stage Leadership & Diction",
        desc: "Clear vowel shaping, microphone technique, and leading congregations with confidence.",
        exercises: ["Microphone distance dynamics", "Leading full worship hymn with expressive phrasing"],
      },
    ],
  },
};

const PRACTICE_LOGS_FILE = path.resolve(process.cwd(), "data", "practice-logs.json");

async function readLocalPracticeLogs(): Promise<Record<string, PracticeLogEntry[]>> {
  try {
    const raw = await fs.readFile(PRACTICE_LOGS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeLocalPracticeLogs(data: Record<string, PracticeLogEntry[]>): Promise<void> {
  try {
    await fs.mkdir(path.dirname(PRACTICE_LOGS_FILE), { recursive: true });
    await fs.writeFile(PRACTICE_LOGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write practice logs file:", err);
  }
}

// ==========================================
// STUDENT PORTAL SERVER FUNCTIONS
// ==========================================

/**
 * Fetch the authenticated student's complete profile, attendance stats, and practice history.
 */
export const getStudentPortalData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Get authenticated user details
    const { data: authUserData, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(
      context.userId,
    );

    const userEmail = authUserData?.user?.email?.trim().toLowerCase() || "";
    const userMetadata = authUserData?.user?.user_metadata || {};
    const userFullName = (userMetadata.full_name as string) || "";
    const userPhone = (userMetadata.phone_number as string) || "";

    // 2. Fetch all registrations (remote + local fallback store) to find this student's registration
    const { readLocalRegistrations, mergeRegistrations } = await import("@/lib/registrations-store");
    let remoteRegistrations: any[] = [];
    try {
      const { data, error: regError } = await supabaseAdmin
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: true });
      if (!regError && data) {
        remoteRegistrations = data;
      }
    } catch {}

    const localRegistrations = await readLocalRegistrations();
    const rows = mergeRegistrations(remoteRegistrations, localRegistrations).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    // Match student: by email, or phone, or full name
    let matchedIndex = -1;
    let studentReg = rows.find((r, idx) => {
      const match =
        (userEmail && r.email?.trim().toLowerCase() === userEmail) ||
        (userPhone && r.phone_number?.replace(/\s+/g, "") === userPhone.replace(/\s+/g, "")) ||
        (userFullName && r.full_name?.trim().toLowerCase() === userFullName.trim().toLowerCase());
      if (match) matchedIndex = idx;
      return match;
    });

    // If still not matched, check if there's an explicit match stored in message
    if (!studentReg && userEmail) {
      studentReg = rows.find((r, idx) => {
        if (r.message && r.message.toLowerCase().includes(userEmail)) {
          matchedIndex = idx;
          return true;
        }
        return false;
      });
    }

    // 3. Fallback or matched student profile assembly
    let profile: StudentProfile;

    if (studentReg) {
      const studentId = getOrGenerateStudentId(studentReg, matchedIndex + 1);
      profile = {
        id: studentReg.id,
        studentId,
        fullName: studentReg.full_name,
        email: studentReg.email,
        phoneNumber: studentReg.phone_number,
        altPhoneNumber: null,
        age: studentReg.age,
        gender: studentReg.gender,
        course: studentReg.course as any,
        preferredSchedule: studentReg.preferred_schedule,
        scheduleLabel: formatScheduleLabel(studentReg.preferred_schedule),
        status: studentReg.status,
        guardianName: studentReg.guardian_name,
        guardianRelationship: null,
        notes: studentReg.message,
        registeredAt: studentReg.created_at,
      };
    } else {
      // Default starter student profile if registration record is still pending linking
      const defaultCourse = (userMetadata.course as any) || "piano";
      profile = {
        id: context.userId,
        studentId: `GMC-${new Date().getFullYear()}-0001`,
        fullName: userFullName || "Music Academy Student",
        email: userEmail,
        phoneNumber: userPhone || "+251 91 000 0000",
        altPhoneNumber: null,
        age: 16,
        gender: "male",
        course: defaultCourse,
        preferredSchedule: "monday-saturday-2-1",
        scheduleLabel: formatScheduleLabel("monday-saturday-2-1"),
        status: "enrolled",
        guardianName: null,
        guardianRelationship: null,
        notes: "Enrolled student account",
        registeredAt: authUserData?.user?.created_at || new Date().toISOString(),
      };
    }

    // 4. Fetch attendance records for this student
    let attendanceRecords: AttendanceRecord[] = [];
    try {
      const { data: dbAtt, error: attErr } = await supabaseAdmin
        .from("attendance" as any)
        .select("*")
        .or(`registration_id.eq.${profile.id},student_id.eq.${profile.studentId}`)
        .order("date", { ascending: false });

      if (!attErr && Array.isArray(dbAtt)) {
        attendanceRecords = dbAtt.map((r: any) => ({
          id: r.id,
          registrationId: r.registration_id,
          studentId: r.student_id,
          studentName: r.student_name,
          course: r.course,
          schedule: r.schedule,
          date: r.date,
          status: r.status,
          timeIn: r.time_in,
          remarks: r.remarks,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch {
      // Fallback to local attendance file
    }

    if (!attendanceRecords.length) {
      try {
        const attPath = path.resolve(process.cwd(), "data", "attendance.json");
        const raw = await fs.readFile(attPath, "utf-8");
        const allAtt: AttendanceRecord[] = JSON.parse(raw);
        attendanceRecords = allAtt
          .filter(
            (r) =>
              r.registrationId === profile.id ||
              r.studentId.toLowerCase() === profile.studentId.toLowerCase() ||
              r.studentName.toLowerCase() === profile.fullName.toLowerCase(),
          )
          .sort((a, b) => b.date.localeCompare(a.date));
      } catch {
        attendanceRecords = [];
      }
    }

    // Compute attendance metrics
    const totalSessions = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
    const lateCount = attendanceRecords.filter((r) => r.status === "late").length;
    const absentCount = attendanceRecords.filter((r) => r.status === "absent").length;
    const excusedCount = attendanceRecords.filter((r) => r.status === "excused").length;
    const attendanceRate = totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 100;

    const attendanceSummary: StudentAttendanceSummary = {
      attendanceRate,
      totalSessions,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      history: attendanceRecords.map((r) => ({
        id: r.id,
        date: r.date,
        status: r.status,
        timeIn: r.timeIn,
        remarks: r.remarks,
      })),
    };

    // 5. Fetch student practice logs
    const practiceLogsMap = await readLocalPracticeLogs();
    const practiceLogs = practiceLogsMap[profile.id] || practiceLogsMap[context.userId] || [];

    // 6. Get course curriculum
    const curriculum = COURSE_CURRICULUM[profile.course] || COURSE_CURRICULUM.piano;

    return {
      profile,
      attendance: attendanceSummary,
      curriculum,
      practiceLogs,
      hasMatchedRegistration: Boolean(studentReg),
    };
  });

/**
 * Log daily student practice minutes with notes.
 */
export const logStudentPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        registrationId: z.string().min(1),
        durationMinutes: z.number().int().min(5).max(480),
        notes: z.string().trim().max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const logsMap = await readLocalPracticeLogs();
    const studentLogs = logsMap[data.registrationId] || [];

    const newEntry: PracticeLogEntry = {
      id: `prac_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toISOString().slice(0, 10),
      durationMinutes: data.durationMinutes,
      notes: data.notes || "Instrument practice session",
    };

    studentLogs.unshift(newEntry);
    logsMap[data.registrationId] = studentLogs.slice(0, 50); // Keep last 50 entries
    await writeLocalPracticeLogs(logsMap);

    return { ok: true, entry: newEntry };
  });

/**
 * Link an existing registration record to the current authenticated student by Student ID or Phone.
 */
export const linkStudentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        studentIdOrPhone: z.string().trim().min(3),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const target = data.studentIdOrPhone.trim().toLowerCase();

    const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const userEmail = userAuth?.user?.email;

    if (!userEmail) throw new Error("Could not find authenticated user session.");

    // Query registrations to find matching student
    const { data: rows, error } = await supabaseAdmin.from("registrations").select("*");
    if (error) throw new Error(error.message);

    const found = (rows ?? []).find((r, idx) => {
      const sid = getOrGenerateStudentId(r, idx + 1).toLowerCase();
      const phone = (r.phone_number || "").replace(/\s+/g, "").toLowerCase();
      const targetPhone = target.replace(/\s+/g, "");
      return sid === target || phone.includes(targetPhone);
    });

    if (!found) {
      throw new Error(
        `No student record found matching "${data.studentIdOrPhone}". Please contact the admin desk at +251 91 028 7951.`,
      );
    }

    // Link by updating email in registration record
    await supabaseAdmin
      .from("registrations")
      .update({
        email: userEmail,
        message: found.message
          ? `${found.message} | Linked Student Account: ${userEmail}`
          : `Linked Student Account: ${userEmail}`,
      })
      .eq("id", found.id);

    return { ok: true, studentName: found.full_name, course: found.course };
  });
