import { describe, expect, it } from "vitest";
import { ADAPTERS } from "@/lib/inventory/importer/adapters";
import { canonicalizeRecord, normalizeHeader } from "@/lib/inventory/importer/headers";
import { parseCsv, parseJson } from "@/lib/inventory/importer/parse";
import { prepareRecord, prepareRecords, type PrepareContext } from "@/lib/inventory/importer/prepare";
import { withCheckDigit } from "@/lib/inventory/vin";
import { DEFAULT_FINANCE_ASSUMPTIONS, DEFAULT_MULTIPLIERS } from "@/lib/pricing.config";

const VIN = withCheckDigit("4T1B11HK0KU123456");
const ctx: PrepareContext = {
  multipliers: DEFAULT_MULTIPLIERS,
  finance: DEFAULT_FINANCE_ASSUMPTIONS,
  source: "CSV",
  sourceRef: "test",
  resolveLocationId: ({ location }) => (location === "nowhere" ? null : "00000000-0000-0000-0000-000000000001"),
  now: new Date("2026-11-18T00:00:00Z"),
};

const specRecord = {
  vin: VIN,
  stock_number: "U190042",
  condition: "Used",
  year: 2019,
  make: "Toyota",
  model: "Camry",
  trim: "SE",
  body_style: "Sedan",
  fuel_type: "Gas",
  mpg: { city: 29, highway: 41 },
  engine: "2.5L I4",
  transmission: "8-Speed Automatic",
  drivetrain: "FWD",
  mileage: "48,210",
  exterior_color: "Midnight Black Metallic",
  interior_color: "Ash",
  features: "Apple CarPlay|Heated Seats|Sunroof / Moonroof",
  safety_features: ["Blind Spot Monitoring", "Lane Departure Warning"],
  base_price: "$20,000.00",
  base_down_payment: "2,000",
  base_monthly_payment: 350,
  images: "https://res.cloudinary.com/demo/image/upload/w_800,h_600/a.jpg|https://res.cloudinary.com/demo/image/upload/b.jpg",
};

describe("prepareRecord — pricing applied at import time", () => {
  it("stores base_* untouched and computes display_* with the multipliers", () => {
    const result = prepareRecord(specRecord, 2, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const v = result.vehicle.data;
    expect(v.basePrice).toBe(20_000);
    expect(v.baseDownPayment).toBe(2_000);
    expect(v.baseMonthlyPayment).toBe(350);
    expect(v.displayPrice).toBe(24_000); // +20%
    expect(v.displayDownPayment).toBe(2_400); // +20%
    expect(v.displayMonthlyPayment).toBe(385); // +10%
    expect(v.pricingMultipliers).toMatchObject({ vehiclePrice: 1.2, downPayment: 1.2, monthlyPayment: 1.1 });
  });

  it("ignores display_* values supplied by a feed (always recomputed)", () => {
    const result = prepareRecord({ ...specRecord, display_price: 1, display_monthly_payment: 1 }, 2, ctx);
    expect(result.ok && result.vehicle.data.displayPrice).toBe(24_000);
    expect(result.ok && result.vehicle.data.displayMonthlyPayment).toBe(385);
  });

  it("derives down/monthly payments when the feed only has a price", () => {
    const { base_down_payment: _d, base_monthly_payment: _m, ...priceOnly } = specRecord;
    const result = prepareRecord(priceOnly, 2, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vehicle.data.baseDownPayment).toBe(2_000); // 10% default
    expect(result.vehicle.data.displayDownPayment).toBe(2_400);
    expect(result.vehicle.data.displayMonthlyPayment).toBeGreaterThan(0);
  });

  it("normalizes values and builds slug, facets and search text", () => {
    const result = prepareRecord(specRecord, 2, ctx);
    if (!result.ok) throw new Error("expected ok");
    const v = result.vehicle.data;
    expect(v.condition).toBe("USED");
    expect(v.bodyStyle).toBe("SEDAN");
    expect(v.fuelType).toBe("GAS");
    expect(v.mileage).toBe(48_210);
    expect(v.mpgCombined).toBe(33);
    expect(v.exteriorColorFamily).toBe("black");
    expect(v.interiorColorFamily).toBe("other");
    expect(v.slug).toBe(`2019-toyota-camry-se-${VIN.toLowerCase()}`);
    expect(v.images).toHaveLength(2);
    expect(v.images[0]).toContain("w_800,h_600");
    expect(v.searchText).toContain("toyota");
    expect(v.searchText).toContain("pre-owned");
    expect(v.features).toEqual(["Apple CarPlay", "Heated Seats", "Sunroof / Moonroof"]);
  });

  it("drops MPG for EVs and EV specs for gas vehicles", () => {
    const ev = prepareRecord(
      { ...specRecord, fuel_type: "BEV", ev_specs: { range_miles: 300, battery_kwh: 82, charge_port: "J3400" }, mpg: { city: 120, highway: 110 } },
      2,
      ctx,
    );
    if (!ev.ok) throw new Error("expected ok");
    expect(ev.vehicle.data.fuelType).toBe("ELECTRIC");
    expect(ev.vehicle.data.mpgCity).toBeNull();
    expect(ev.vehicle.data.evRangeMiles).toBe(300);
    expect(ev.vehicle.data.evChargePort).toBe("NACS");

    const gas = prepareRecord({ ...specRecord, ev_range_miles: 300 }, 2, ctx);
    if (!gas.ok) throw new Error("expected ok");
    expect(gas.vehicle.data.evRangeMiles).toBeNull();
  });

  it("reports readable validation errors", () => {
    const result = prepareRecord({ ...specRecord, vin: "BADVIN", year: 1950, base_price: "", fuel_type: "steam" }, 7, ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const fields = result.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(["vin", "year", "base_price", "fuel_type"]));
    expect(result.errors.every((e) => e.row === 7)).toBe(true);
  });

  it("requires mileage for used vehicles and rejects unknown locations", () => {
    const { mileage: _m, ...noMileage } = specRecord;
    expect(prepareRecord(noMileage, 2, ctx).ok).toBe(false);
    expect(prepareRecord({ ...specRecord, location: "nowhere" }, 2, ctx).ok).toBe(false);
  });

  it("rejects unsafe media URLs", () => {
    const result = prepareRecord({ ...specRecord, images: "javascript:alert(1)" }, 2, ctx);
    expect(result.ok).toBe(false);
  });

  it("dedupes VINs within a batch (last row wins)", () => {
    const batch = prepareRecords([specRecord, { ...specRecord, base_price: 30_000 }], ctx, 2);
    expect(batch.vehicles).toHaveLength(1);
    expect(batch.vehicles[0]!.data.displayPrice).toBe(36_000);
    expect(batch.duplicates).toHaveLength(1);
  });
});

describe("CSV / JSON parsing and header aliasing", () => {
  it("parses CSV with provider-style headers", () => {
    const csv = [
      "VIN,Stock #,New/Used,Year,Make,Model,Trim,Body,Fuel Type,Drivetrain,Miles,Ext Color,Int Color,Selling Price,Options,Photo URL List",
      `${VIN},U190042,Used,2019,Toyota,Camry,SE,4dr Car,Gasoline,Front Wheel Drive,"48,210",Super White,Black,"$20,000","Heated Seats|Navigation",https://img.example.com/1.jpg|https://img.example.com/2.jpg`,
    ].join("\n");
    const parsed = parseCsv(csv);
    expect(parsed.errors).toEqual([]);
    const canonical = canonicalizeRecord(parsed.records[0]!);
    expect(canonical).toMatchObject({ vin: VIN, stock_number: "U190042", condition: "Used", base_price: "$20,000", mileage: "48,210" });
    const result = prepareRecord(canonical, 2, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.vehicle.data.displayPrice).toBe(24_000);
      expect(result.vehicle.data.drivetrain).toBe("FWD");
      expect(result.vehicle.data.bodyStyle).toBe("SEDAN");
    }
  });

  it("parses JSON arrays and wrapped objects", () => {
    expect(parseJson(JSON.stringify([specRecord])).records).toHaveLength(1);
    expect(parseJson(JSON.stringify({ vehicles: [specRecord] })).records).toHaveLength(1);
    expect(parseJson("{oops").errors[0]!.message).toMatch(/Invalid JSON/);
  });

  it("normalizes headers", () => {
    expect(normalizeHeader("Stock #")).toBe("stock_#");
    expect(normalizeHeader("exteriorColor")).toBe("exterior_color");
    expect(normalizeHeader(" Selling Price ")).toBe("selling_price");
  });

  it("maps vAuto certified flags and one-letter condition codes", () => {
    const mapped = ADAPTERS.VAUTO.map({ Vin: VIN, "New/Used": "U", Certified: "Y", Odometer: "12000" });
    expect(mapped.condition).toBe("CPO");
    expect(mapped.mileage).toBe("12000");
    const cdk = ADAPTERS.CDK.map({ VIN: VIN, NewUsed: "N" });
    expect(cdk.condition).toBe("New");
  });
});
