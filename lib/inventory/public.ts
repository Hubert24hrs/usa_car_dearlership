/**
 * Public (shopper-facing) vehicle shapes.
 *
 * SECURITY / BUSINESS RULE: these selects intentionally exclude every base_*
 * column. Public pages, APIs and JSON-LD must only use these helpers so the
 * dealer's feed pricing is never exposed. (Enforced by a unit test.)
 */
import type { Prisma } from "@/lib/generated/prisma/client";

export const publicVehicleCardSelect = {
  id: true,
  slug: true,
  vin: true,
  stockNumber: true,
  condition: true,
  year: true,
  make: true,
  makeSlug: true,
  model: true,
  modelSlug: true,
  trim: true,
  bodyStyle: true,
  fuelType: true,
  evRangeMiles: true,
  mpgCombined: true,
  drivetrain: true,
  mileage: true,
  exteriorColor: true,
  exteriorColorFamily: true,
  displayPrice: true,
  displayDownPayment: true,
  displayMonthlyPayment: true,
  images: true,
  status: true,
  isFeatured: true,
  isDemo: true,
  createdAt: true,
  location: { select: { slug: true, name: true, city: true, state: true } },
} satisfies Prisma.VehicleSelect;

export const publicVehicleDetailSelect = {
  ...publicVehicleCardSelect,
  evBatteryKwh: true,
  evDcFastChargeMin: true,
  evChargePort: true,
  mpgCity: true,
  mpgHighway: true,
  engine: true,
  transmission: true,
  transmissionType: true,
  interiorColor: true,
  interiorColorFamily: true,
  features: true,
  safetyFeatures: true,
  description: true,
  spinImages: true,
  videoUrl: true,
  carfaxUrl: true,
  updatedAt: true,
  location: {
    select: {
      id: true,
      slug: true,
      name: true,
      address1: true,
      address2: true,
      city: true,
      state: true,
      zip: true,
      phone: true,
      smsPhone: true,
      latitude: true,
      longitude: true,
      salesHours: true,
    },
  },
} satisfies Prisma.VehicleSelect;

type CardRow = Prisma.VehicleGetPayload<{ select: typeof publicVehicleCardSelect }>;
type DetailRow = Prisma.VehicleGetPayload<{ select: typeof publicVehicleDetailSelect }>;

/** Decimal → number, Date → ISO string, so results are serializable/cachable. */
export function toPublicCard(row: CardRow) {
  return {
    ...row,
    displayPrice: Number(row.displayPrice),
    displayDownPayment: Number(row.displayDownPayment),
    displayMonthlyPayment: Number(row.displayMonthlyPayment),
    createdAt: row.createdAt.toISOString(),
  };
}

export type HoursRow = { day: string; open: string | null; close: string | null };

export function toPublicDetail(row: DetailRow) {
  return {
    ...row,
    displayPrice: Number(row.displayPrice),
    displayDownPayment: Number(row.displayDownPayment),
    displayMonthlyPayment: Number(row.displayMonthlyPayment),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    location: { ...row.location, salesHours: (row.location.salesHours ?? []) as HoursRow[] },
  };
}

export type PublicVehicleCard = ReturnType<typeof toPublicCard>;
export type PublicVehicleDetail = ReturnType<typeof toPublicDetail>;
