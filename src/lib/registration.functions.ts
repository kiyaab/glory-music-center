import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const registrationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  age: z.coerce.number().int().min(4).max(99),
  gender: z.enum(["male", "female", "other"]),
  phoneNumber: z.string().trim().min(7).max(30),
  guardianName: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email().max(255),
  course: z.enum(["piano", "keyboard", "guitar", "saxophone", "vocal"]),
  preferredSchedule: z.enum(["weekday-morning", "weekday-afternoon", "weekend"]),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  language: z.enum(["en", "am", "om"]),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((data) => registrationSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("registrations").insert({
      full_name: data.fullName,
      age: data.age,
      gender: data.gender,
      phone_number: data.phoneNumber,
      guardian_name: data.guardianName || null,
      email: data.email,
      course: data.course,
      preferred_schedule: data.preferredSchedule,
      message: data.message || null,
      language: data.language,
    });

    if (error) {
      throw new Error("Failed to submit registration");
    }

    return { ok: true };
  });
