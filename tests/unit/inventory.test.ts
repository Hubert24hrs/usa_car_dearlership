import { describe, expect, it } from "vitest";
import {
  activeFilterChips,
  buildInventoryHref,
  countActiveFilters,
  describeFilters,
  EMPTY_FILTERS,
  parseFilters,
  toggleListValue,
} from "@/lib/inventory/filters";
import { colorFamily, normalizeBodyStyle, normalizeCondition, normalizeDrivetrain, normalizeFuelType, normalizeTransmissionType } from "@/lib/inventory/normalize";
import { publicVehicleCardSelect, publicVehicleDetailSelect } from "@/lib/inventory/public";
import { isVehicleSlug, slugify, vehicleSlug, vinFromSlug } from "@/lib/inventory/slug";
import { computeVinCheckDigit, hasValidCheckDigit, isValidVinFormat, withCheckDigit } from "@/lib/inventory/vin";
import { toPrefixTsQuery } from "@/lib/inventory/keyword";
import { affordablePrincipal, amortizedMonthlyPayment, calculatePayment } from "@/lib/finance";

describe("public selects never expose base_* pricing", () => {
  it.each([
    ["card", publicVehicleCardSelect],
    ["detail", publicVehicleDetailSelect],
  ])("%s select", (_name, select) => {
    const keys = Object.keys(select);
    expect(keys.some((k) => k.toLowerCase().startsWith("base"))).toBe(false);
    expect(keys).not.toContain("pricingMultipliers");
    expect(keys).toEqual(expect.arrayContaining(["displayPrice", "displayDownPayment", "displayMonthlyPayment"]));
  });
});

describe("SEO URLs ⇄ filters", () => {
  it("parses /inventory/electric/suv", () => {
    const { filters, unknownSegments } = parseFilters(new URLSearchParams(), ["electric", "suv"]);
    expect(filters.fuel).toEqual(["ELECTRIC"]);
    expect(filters.body).toEqual(["SUV"]);
    expect(unknownSegments).toEqual([]);
  });

  it("parses /inventory/used/toyota/camry with extra query filters", () => {
    const { filters } = parseFilters(new URLSearchParams("price_max=30000&sort=price_asc&page=2"), ["used", "toyota", "camry"]);
    expect(filters.condition).toEqual(["USED"]);
    expect(filters.make).toEqual(["toyota"]);
    expect(filters.model).toEqual(["camry"]);
    expect(filters.priceMax).toBe(30_000);
    expect(filters.sort).toBe("price_asc");
    expect(filters.page).toBe(2);
  });

  it("builds canonical SEO paths for single-valued facets", () => {
    expect(buildInventoryHref({ ...EMPTY_FILTERS, fuel: ["ELECTRIC"], body: ["SUV"] })).toBe("/inventory/electric/suv");
    expect(buildInventoryHref({ ...EMPTY_FILTERS, condition: ["USED"], make: ["toyota"], model: ["camry"], priceMax: 30_000 })).toBe(
      "/inventory/used/toyota/camry?price_max=30000",
    );
    expect(buildInventoryHref({ ...EMPTY_FILTERS, make: ["honda", "toyota"] })).toBe("/inventory?make=honda%2Ctoyota");
    expect(buildInventoryHref(EMPTY_FILTERS)).toBe("/inventory");
  });

  it("round-trips through parse → build", () => {
    const href = "/inventory/certified/hybrid/toyota?drivetrain=awd&feature=Heated+Seats&monthly_max=500&sort=price_desc";
    const [path, qs] = href.split("?");
    const segments = path!.split("/").slice(2);
    const { filters } = parseFilters(new URLSearchParams(qs), segments);
    expect(buildInventoryHref(filters)).toBe(href);
  });

  it("ignores junk values", () => {
    const { filters } = parseFilters(new URLSearchParams("fuel=steam,electric&page=-4&year_min=abc&sort=hack&ext_color=plaid,black"));
    expect(filters.fuel).toEqual(["ELECTRIC"]);
    expect(filters.page).toBe(1);
    expect(filters.yearMin).toBeUndefined();
    expect(filters.sort).toBe("featured");
    expect(filters.extColor).toEqual(["black"]);
  });

  it("toggles values, resets page and clears dependent facets", () => {
    const start = { ...EMPTY_FILTERS, make: ["toyota"], model: ["camry"], trim: ["SE"], page: 3 };
    const next = toggleListValue(start, "make", "toyota");
    expect(next.make).toEqual([]);
    expect(next.model).toEqual([]);
    expect(next.trim).toEqual([]);
    expect(next.page).toBe(1);
  });

  it("describes and counts active filters", () => {
    const f = { ...EMPTY_FILTERS, condition: ["USED" as const], fuel: ["ELECTRIC" as const], body: ["SUV" as const], priceMax: 40_000 };
    expect(describeFilters(f)).toBe("Used Electric SUVs");
    expect(countActiveFilters(f)).toBe(4);
    expect(activeFilterChips(f).map((c) => c.label)).toEqual(expect.arrayContaining(["Used", "Electric", "SUV", "Under $40,000"]));
  });
});

describe("slugs & VINs", () => {
  it("builds VDP slugs that end in the VIN", () => {
    const vin = withCheckDigit("5YJ3E1EA0PF123456");
    const slug = vehicleSlug({ year: 2023, make: "Tesla", model: "Model 3", trim: "Long Range AWD", vin });
    expect(slug).toBe(`2023-tesla-model-3-long-range-awd-${vin.toLowerCase()}`);
    expect(isVehicleSlug(slug)).toBe(true);
    expect(vinFromSlug(slug)).toBe(vin);
    expect(isVehicleSlug("electric")).toBe(false);
    expect(isVehicleSlug("plug-in-hybrid")).toBe(false);
  });

  it("slugifies names", () => {
    expect(slugify("Mercedes-Benz")).toBe("mercedes-benz");
    expect(slugify("ID. Buzz")).toBe("id-buzz");
    expect(slugify("F-150 Lightning")).toBe("f-150-lightning");
  });

  it("validates VIN format and check digits", () => {
    expect(computeVinCheckDigit("1M8GDM9AXKP042788")).toBe("X");
    expect(hasValidCheckDigit("1M8GDM9AXKP042788")).toBe(true);
    expect(isValidVinFormat("1M8GDM9AXKP04278O")).toBe(false); // contains O
    expect(hasValidCheckDigit(withCheckDigit("JM3KFBCM1N0123456"))).toBe(true);
  });
});

describe("normalizers", () => {
  it.each([
    ["Certified Pre-Owned", "CPO"],
    ["Pre-Owned", "USED"],
    ["N", "NEW"],
  ])("condition %s → %s", (input, expected) => expect(normalizeCondition(input)).toBe(expected));

  it.each([
    ["Plug-In Hybrid", "PLUG_IN_HYBRID"],
    ["Gas/Electric Hybrid", "HYBRID"],
    ["BEV", "ELECTRIC"],
    ["Premium Unleaded", "GAS"],
    ["Turbo Diesel", "DIESEL"],
  ])("fuel %s → %s", (input, expected) => expect(normalizeFuelType(input)).toBe(expected));

  it.each([
    ["Crew Cab Pickup", "TRUCK"],
    ["Sport Utility", "SUV"],
    ["Cabriolet", "CONVERTIBLE"],
    ["4dr Car", "SEDAN"],
    ["Minivan", "VAN"],
  ])("body %s → %s", (input, expected) => expect(normalizeBodyStyle(input)).toBe(expected));

  it.each([
    ["4x4", "FOUR_WD"],
    ["FOUR_WD", "FOUR_WD"],
    ["All Wheel Drive", "AWD"],
    ["quattro", "AWD"],
    ["Front-Wheel Drive", "FWD"],
  ])("drivetrain %s → %s", (input, expected) => expect(normalizeDrivetrain(input)).toBe(expected));

  it("normalizes transmissions and colors", () => {
    expect(normalizeTransmissionType("Electronically Controlled CVT")).toBe("CVT");
    expect(normalizeTransmissionType("6-Speed Manual")).toBe("MANUAL");
    expect(normalizeTransmissionType("", "ELECTRIC")).toBe("DIRECT_DRIVE");
    expect(colorFamily("Celestial Silver Metallic")).toBe("silver");
    expect(colorFamily("Soul Red Crystal")).toBe("red");
    expect(colorFamily("Macchiato Beige")).toBe("beige");
  });
});

describe("keyword search query builder", () => {
  it("builds safe prefix tsqueries", () => {
    expect(toPrefixTsQuery("Toyota cam")).toBe("toyota:* & cam:*");
    expect(toPrefixTsQuery("F-150 'Lightning' & | !")).toBe("f:* & 150:* & lightning:*");
    expect(toPrefixTsQuery("  ")).toBeNull();
  });
});

describe("finance math", () => {
  it("computes standard amortized payments", () => {
    expect(amortizedMonthlyPayment(30_000, 0, 60)).toBe(500);
    expect(amortizedMonthlyPayment(25_000, 6, 60)).toBeCloseTo(483.32, 2);
    expect(amortizedMonthlyPayment(0, 6, 60)).toBe(0);
  });

  it("calculates a full breakdown with trade-in and tax", () => {
    const result = calculatePayment({ price: 30_000, downPayment: 3_000, tradeInValue: 5_000, tradeInPayoff: 1_000, aprPercent: 0, termMonths: 60, salesTaxPercent: 0 });
    expect(result.amountFinanced).toBe(23_000);
    expect(result.monthlyPayment).toBeCloseTo(383.33, 2);
    expect(result.totalInterest).toBe(0);
  });

  it("inverts the payment formula for budget shopping", () => {
    const principal = affordablePrincipal(500, 7.49, 72);
    expect(amortizedMonthlyPayment(principal, 7.49, 72)).toBeCloseTo(500, 1);
  });
});

describe("keyword search sort", () => {
  it("defaults keyword searches to relevance but honors an explicit sort", () => {
    expect(parseFilters({ q: "hybrid" }).filters.sort).toBe("relevance");
    expect(parseFilters({ q: "hybrid", sort: "price_asc" }).filters.sort).toBe("price_asc");
    expect(parseFilters({ sort: "relevance" }).filters.sort).toBe("featured");
    expect(parseFilters({}).filters.sort).toBe("featured");
  });
});
