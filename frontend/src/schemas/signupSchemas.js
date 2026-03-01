import { z } from "zod";

/* ── Step 1: Basic Identity ───────────────────────────── */
export const step1Schema = z
  .object({
    full_name: z.string().min(2, "Full name must be at least 2 characters").max(100),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    confirm_password: z.string().min(1, "Please confirm your password"),
    country: z.string().min(1, "Please select your country"),
    city: z.string().optional(),
    phone: z
      .string()
      .optional()
      .refine((v) => !v || /^\+?[\d\s\-()]{7,20}$/.test(v), "Invalid phone number format"),
    gender: z.enum(["", "male", "female", "prefer_not_to_say"]).optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

/* ── Step 2: Spiritual Background ────────────────────── */
const ministryAreas = [
  "youth",
  "worship",
  "preaching",
  "intercession",
  "evangelism",
  "instrumentalist",
  "church_worker",
  "discipleship",
  "media",
];

export const step2Schema = z.object({
  born_again: z.enum(["yes", "no", ""], { required_error: "Please select an option" }),
  year_of_salvation: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v ||
        (/^\d{4}$/.test(v) && parseInt(v) >= 1900 && parseInt(v) <= new Date().getFullYear()),
      "Enter a valid year"
    ),
  church_name: z.string().max(100).optional(),
  denomination: z.string().max(100).optional(),
  serves_in_church: z.enum(["yes", "no", ""]).optional(),
  ministry_areas: z.array(z.enum(ministryAreas)).optional().default([]),
  testimony: z.string().max(500).optional(),
});

/* ── Step 3: Revival Alignment ───────────────────────── */
export const step3Schema = z.object({
  why_join: z
    .string()
    .min(20, "Please tell us a bit more (at least 20 characters)")
    .max(600),
  unity_agreement: z.literal(true, {
    errorMap: () => ({ message: "You must agree to uphold unity across denominations" }),
  }),
  statement_of_faith: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the statement of faith" }),
  }),
  code_of_conduct: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the code of conduct" }),
  }),
  subscribe_scripture: z.boolean().optional().default(true),
});

/* ── Step 4: Leadership Interest ─────────────────────── */
export const step4Schema = z
  .object({
    membership_type: z
      .enum(["member", "digital_group", "revival_hub"], {
        required_error: "Please select your membership preference",
      })
      .default("member"),
    led_ministry_before: z.enum(["yes", "no", ""]).optional(),
    leadership_experience: z.string().max(400).optional(),
    profile_picture: z.any().optional(),
  })
  .refine(
    (data) =>
      data.led_ministry_before !== "yes" ||
      (data.leadership_experience && data.leadership_experience.trim().length > 0),
    {
      message: "Please describe your leadership experience",
      path: ["leadership_experience"],
    }
  );

/* ── Password strength util ──────────────────────────── */
export function getPasswordStrength(password = "") {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
    password.length >= 12,
  ];
  const score = checks.filter(Boolean).length;
  if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "w-1/5", score };
  if (score <= 3) return { label: "Fair", color: "bg-orange-500", width: "w-2/5", score };
  if (score <= 4) return { label: "Good", color: "bg-yellow-500", width: "w-3/5", score };
  if (score <= 5) return { label: "Strong", color: "bg-emerald-500", width: "w-4/5", score };
  return { label: "Very Strong", color: "bg-emerald-400", width: "w-full", score };
}

export const COUNTRIES = [
  "Nigeria","Ghana","Kenya","South Africa","Tanzania","Uganda","Ethiopia",
  "Rwanda","Zimbabwe","Zambia","Malawi","Mozambique","Angola","Cameroon",
  "Ivory Coast","Senegal","DR Congo","Sudan","Somalia","Libya","Morocco",
  "Algeria","Tunisia","Egypt","United Kingdom","United States","Canada",
  "Australia","Germany","France","Netherlands","Norway","Sweden","Finland",
  "Brazil","India","China","Other",
];

export const MINISTRY_AREA_LABELS = {
  youth: "Youth",
  worship: "Worship",
  preaching: "Preaching",
  intercession: "Intercession",
  evangelism: "Evangelism",
  instrumentalist: "Instrumentalist",
  church_worker: "Church Worker",
  discipleship: "Discipleship",
  media: "Media",
};
