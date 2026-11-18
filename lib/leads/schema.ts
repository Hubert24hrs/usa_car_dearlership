/**
 * Lead form schemas — shared by the client (React Hook Form) and the server
 * action, so validation is identical on both sides. Client-safe.
 */
import { z } from "zod";

export const LEAD_TYPE_LABELS = {
  CHECK_AVAILABILITY: "Check availability",
  TEST_DRIVE: "Test drive request",
  PRE_APPROVAL: "Finance pre-qualification",
  TRADE_IN: "Trade-in appraisal",
  TEXT_US: "Text message request",
  CONTACT: "General inquiry",
  SERVICE: "Service appointment",
} as const;

export type LeadTypeValue = keyof typeof LEAD_TYPE_LABELS;

export const TIME_SLOTS = ["Morning (9am to 12pm)", "Afternoon (12pm to 4pm)", "Evening (4pm to 7pm)"] as const;

export const SERVICE_TYPES = [
  "Oil & filter change",
  "Tire rotation / new tires",
  "Brake service",
  "Battery check / replacement",
  "EV / hybrid system service",
  "Diagnostics / check engine light",
  "Recall work",
  "State inspection",
  "Other",
] as const;

const US_PHONE = /^\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "" / NaN (empty number inputs) → undefined. */
const blankToUndefined = (v: unknown) =>
  v === "" || v === null || (typeof v === "number" && Number.isNaN(v)) ? undefined : v;

const phone = z.string().trim().regex(US_PHONE, "Enter a valid US phone number");
const optionalPhone = z.preprocess(blankToUndefined, phone.optional());
const money = (label: string, max = 10_000_000) =>
  z.preprocess(blankToUndefined, z.number({ error: `${label} must be a number` }).min(0).max(max));
const optionalMoney = (label: string, max = 10_000_000) =>
  z.preprocess(blankToUndefined, z.number({ error: `${label} must be a number` }).min(0).max(max).optional());
const futureDate = z
  .string()
  .regex(DATE, "Choose a date")
  .refine((d) => new Date(`${d}T23:59:59`) >= new Date(new Date().toDateString()), "Choose today or a future date");

const contact = {
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.email("Enter a valid email address").max(254),
  phone: optionalPhone,
  preferredContact: z.enum(["email", "phone", "text"]).optional(),
  message: z.preprocess(blankToUndefined, z.string().trim().max(2000).optional()),
  smsConsent: z.boolean().default(false),
  vehicleId: z.preprocess(blankToUndefined, z.uuid().optional()),
  locationId: z.preprocess(blankToUndefined, z.uuid().optional()),
  sourcePath: z.string().max(300).optional(),
  /** Spam honeypot — must stay empty (checked before validation). */
  website: z.string().optional(),
  /** Timestamp when the form was rendered (bot timing check). */
  startedAt: z.number().optional(),
};

export const availabilitySchema = z.object({
  type: z.literal("CHECK_AVAILABILITY"),
  ...contact,
  vehicleId: z.uuid("Missing vehicle"),
});

export const testDriveSchema = z.object({
  type: z.literal("TEST_DRIVE"),
  ...contact,
  phone,
  details: z.object({
    preferredDate: futureDate,
    preferredTime: z.enum(TIME_SLOTS),
  }),
});

export const preApprovalSchema = z.object({
  type: z.literal("PRE_APPROVAL"),
  ...contact,
  phone,
  details: z.object({
    address: z.string().trim().min(3, "Street address is required").max(120),
    city: z.string().trim().min(2, "City is required").max(60),
    state: z.string().trim().regex(/^[A-Za-z]{2}$/, "2-letter state"),
    zip: z.string().trim().regex(/^\d{5}$/, "5-digit ZIP"),
    employmentStatus: z.enum(["employed", "self-employed", "retired", "student", "other"]),
    annualIncome: money("Annual income"),
    housingStatus: z.enum(["rent", "own", "family", "other"]),
    monthlyHousingPayment: money("Housing payment", 100_000),
    creditScoreRange: z.enum(["excellent", "good", "fair", "poor", "unsure"]),
    downPayment: optionalMoney("Down payment"),
    desiredMonthlyPayment: optionalMoney("Monthly budget", 100_000),
    consent: z.literal(true, { error: "Please confirm the authorization to continue" }),
  }),
});

export const tradeInSchema = z.object({
  type: z.literal("TRADE_IN"),
  ...contact,
  details: z.object({
    vin: z.preprocess(blankToUndefined, z.string().trim().toUpperCase().regex(/^[A-HJ-NPR-Z0-9]{17}$/, "VIN must be 17 characters").optional()),
    plate: z.preprocess(blankToUndefined, z.string().trim().max(10).optional()),
    plateState: z.preprocess(blankToUndefined, z.string().trim().length(2).optional()),
    year: z.preprocess(blankToUndefined, z.number({ error: "Year is required" }).int().min(1981).max(new Date().getFullYear() + 2)),
    make: z.string().trim().min(1, "Make is required").max(40),
    model: z.string().trim().min(1, "Model is required").max(60),
    trim: z.preprocess(blankToUndefined, z.string().trim().max(60).optional()),
    mileage: z.preprocess(blankToUndefined, z.number({ error: "Mileage is required" }).int().min(0).max(1_000_000)),
    condition: z.enum(["excellent", "good", "fair", "poor"]),
    hasLoan: z.boolean().default(false),
    payoffAmount: optionalMoney("Payoff amount"),
    estimateLow: z.number().optional(),
    estimateHigh: z.number().optional(),
  }),
});

export const textUsSchema = z.object({
  type: z.literal("TEXT_US"),
  ...contact,
  phone,
  smsConsent: z.literal(true, { error: "Please agree to receive text messages so we can reply" }),
  message: z.string().trim().min(1, "Type a message").max(500),
});

export const contactSchema = z.object({
  type: z.literal("CONTACT"),
  ...contact,
  message: z.string().trim().min(5, "Tell us how we can help").max(2000),
  details: z.object({ subject: z.preprocess(blankToUndefined, z.string().trim().max(120).optional()) }).optional(),
});

export const serviceSchema = z.object({
  type: z.literal("SERVICE"),
  ...contact,
  phone,
  details: z.object({
    serviceType: z.enum(SERVICE_TYPES),
    preferredDate: futureDate,
    preferredTime: z.enum(TIME_SLOTS),
    vehicleYear: z.preprocess(blankToUndefined, z.number({ error: "Year is required" }).int().min(1981).max(new Date().getFullYear() + 2)),
    vehicleMake: z.string().trim().min(1, "Make is required").max(40),
    vehicleModel: z.string().trim().min(1, "Model is required").max(60),
    mileage: z.preprocess(blankToUndefined, z.number().int().min(0).max(1_000_000).optional()),
    transport: z.enum(["waiter", "dropoff", "loaner", "pickup"]),
  }),
});

export const leadSchema = z.discriminatedUnion("type", [
  availabilitySchema,
  testDriveSchema,
  preApprovalSchema,
  tradeInSchema,
  textUsSchema,
  contactSchema,
  serviceSchema,
]);

export type LeadInput = z.input<typeof leadSchema>;
export type LeadData = z.output<typeof leadSchema>;

export const newsletterSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  dealAlerts: z.boolean().default(true),
  website: z.string().optional(),
});

export type LeadActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
