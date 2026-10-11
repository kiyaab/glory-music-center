import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const SCHEDULE_OPTIONS = [
  { id: "monday-saturday-2-1", label: "Monday – Saturday (2:00 – 1:00)", am: "ሰኞ - ቅዳሜ (2:00 - 1:00)", om: "Wiixata - Sanbata (2:00 - 1:00)" },
  { id: "monday-saturday-morning", label: "Monday – Saturday: Morning (2:00 – 6:00)", am: "ሰኞ - ቅዳሜ: ጠዋት (2:00 - 6:00)", om: "Wiixata - Sanbata: Ganama (2:00 - 6:00)" },
  { id: "monday-saturday-afternoon", label: "Monday – Saturday: Afternoon (8:00 – 1:00)", am: "ሰኞ - ቅዳሜ: ከሰዓት (8:00 - 1:00)", om: "Wiixata - Sanbata: Waaree Booda (8:00 - 1:00)" },
  { id: "weekday-morning", label: "Weekday Morning (Mon – Fri)", am: "የሳምንት ጠዋት (ሰኞ - ዓርብ)", om: "Ganama Guyyaa Hojii" },
  { id: "weekday-afternoon", label: "Weekday Afternoon (Mon – Fri)", am: "የሳምንት ከሰዓት (ሰኞ - ዓርብ)", om: "Waaree Booda Guyyaa Hojii" },
  { id: "weekend", label: "Weekend Class (Saturday & Sunday)", am: "የሳምንት መጨረሻ (ቅዳሜና እሁድ)", om: "Dhuma Torbanii" },
  { id: "flexible", label: "Custom / Flexible Hours", am: "ተለዋዋጭ / የተስተካከለ ሰዓት", om: "Yeroo Dabalataa / Jijjiiramaa" },
] as const;

export function formatScheduleLabel(scheduleKey: string): string {
  const found = SCHEDULE_OPTIONS.find((s) => s.id === scheduleKey);
  if (found) return found.label;
  return scheduleKey.replace(/-/g, " ");
}

export const registrationSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(120),
  age: z.number().int().min(4, "Age must be at least 4").max(99),
  gender: z.enum(["male", "female", "other"]),
  phoneNumber: z.string().trim().min(7, "Primary phone number is required").max(30),
  altPhoneNumber: z.string().trim().max(30).optional().or(z.literal("")),
  guardianName: z.string().trim().max(120).optional().or(z.literal("")),
  guardianRelationship: z.string().trim().max(50).optional().or(z.literal("")),
  address: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  course: z.enum(["piano", "keyboard", "guitar", "saxophone", "vocal"]),
  skillLevel: z.string().optional().or(z.literal("")),
  hasInstrument: z.string().optional().or(z.literal("")),
  classType: z.string().optional().or(z.literal("")),
  preferredSchedule: z.string().min(1, "Please select a preferred schedule").max(100),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
  language: z.enum(["en", "am", "om"]),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((data) => registrationSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Auto-generate official Student ID (GMC-YYYY-XXXX)
    const year = new Date().getFullYear();
    let sequence = 1;
    try {
      const { count } = await supabaseAdmin
        .from("registrations")
        .select("*", { count: "exact", head: true });
      sequence = (count ?? 0) + 1;
    } catch {
      sequence = Math.floor(1000 + Math.random() * 9000);
    }
    const studentId = `GMC-${year}-${String(sequence).padStart(4, "0")}`;

    // Combine structured extra student details into message text to preserve across all database versions
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

    const { error } = await supabaseAdmin.from("registrations").insert({
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
      status: "new",
    });

    if (error) {
      throw new Error(`Failed to submit registration: ${error.message}`);
    }

    return { ok: true };
  });
