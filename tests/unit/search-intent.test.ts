import { describe, expect, it } from "vitest";
import { hasSearchableIntent, normalizeText, parseSearchIntent, type SearchVocabulary } from "@/lib/inventory/search-intent";

const vocabulary: SearchVocabulary = {
  makes: [
    { name: "Toyota", slug: "toyota" },
    { name: "Chevrolet", slug: "chevrolet" },
    { name: "Ford", slug: "ford" },
    { name: "Tesla", slug: "tesla" },
    { name: "Lexus", slug: "lexus" },
    { name: "Mercedes-Benz", slug: "mercedes-benz" },
  ],
  models: [
    { make: "Toyota", makeSlug: "toyota", model: "Camry", modelSlug: "camry", bodyStyle: "SEDAN", fuelType: "GAS", avgPrice: 31_000 },
    { make: "Toyota", makeSlug: "toyota", model: "RAV4", modelSlug: "rav4", bodyStyle: "SUV", fuelType: "GAS", avgPrice: 33_000 },
    { make: "Toyota", makeSlug: "toyota", model: "RAV4 Hybrid", modelSlug: "rav4-hybrid", bodyStyle: "SUV", fuelType: "HYBRID", avgPrice: 36_000 },
    { make: "Chevrolet", makeSlug: "chevrolet", model: "Silverado 1500", modelSlug: "silverado-1500", bodyStyle: "TRUCK", fuelType: "GAS", avgPrice: 52_000 },
    { make: "Ford", makeSlug: "ford", model: "F-150", modelSlug: "f-150", bodyStyle: "TRUCK", fuelType: "GAS", avgPrice: 55_000 },
    { make: "Tesla", makeSlug: "tesla", model: "Model Y", modelSlug: "model-y", bodyStyle: "SUV", fuelType: "ELECTRIC", avgPrice: 48_000 },
    { make: "Lexus", makeSlug: "lexus", model: "IS", modelSlug: "is", bodyStyle: "SEDAN", fuelType: "GAS", avgPrice: 45_000 },
  ],
};

const models = (q: string) => parseSearchIntent(q, vocabulary).models.map((m) => m.modelSlug);

describe("search intent", () => {
  it("normalizes punctuation and accents", () => {
    expect(normalizeText("Mercedes-Benz  F-150 Señor")).toBe("mercedes benz f 150 senor");
  });

  it("reads body style, fuel and budget, and knows when it understood everything", () => {
    const intent = parseSearchIntent("electric SUV under 50k", vocabulary);
    expect(intent).toMatchObject({ bodyStyles: ["SUV"], fuelTypes: ["ELECTRIC"], priceMax: 50_000, leftover: [] });
    expect(hasSearchableIntent(intent)).toBe(true);
  });

  it("recognizes makes, aliases, models and years", () => {
    const intent = parseSearchIntent("2021 chevy silverado", vocabulary);
    expect(intent.makes).toEqual([{ name: "Chevrolet", slug: "chevrolet" }]);
    expect(intent.models.map((m) => m.modelSlug)).toEqual(["silverado-1500"]);
    expect(intent.year).toBe(2021);
    expect(intent.targetPrice).toBe(52_000);
    expect(intent.leftover).toEqual([]);
    expect(models("ford f150")).toEqual(["f-150"]);
    expect(models("tesla model y")).toEqual(["model-y"]);
    expect(models("rav4 hybrid")).toEqual(["rav4-hybrid"]);
    expect(parseSearchIntent("mercedes", vocabulary).makes).toEqual([{ name: "Mercedes-Benz", slug: "mercedes-benz" }]);
  });

  it("needs the make before matching very short model names", () => {
    expect(models("is")).toEqual([]);
    expect(models("lexus is")).toEqual(["is"]);
  });

  it("maps makes the dealership doesn't carry to what shoppers usually mean", () => {
    const intent = parseSearchIntent("Porsche 911", vocabulary);
    expect(intent.makes).toEqual([{ name: "Porsche", slug: null }]);
    expect(intent.luxury).toBe(true);
    expect(intent.bodyStyles).toContain("COUPE");
    expect(intent.leftover).toEqual(["911"]);
  });

  it("tells monthly budgets from prices", () => {
    expect(parseSearchIntent("hybrid under $400 a month", vocabulary)).toMatchObject({ fuelTypes: ["HYBRID"], monthlyMax: 400, leftover: [] });
    expect(parseSearchIntent("truck under 450", vocabulary).monthlyMax).toBe(450);
    expect(parseSearchIntent("sedan under $25,000", vocabulary).priceMax).toBe(25_000);
    expect(parseSearchIntent("cheap car", vocabulary).priceMax).toBe(20_000);
    expect(parseSearchIntent("plug-in hybrid", vocabulary).fuelTypes).toEqual(["PLUG_IN_HYBRID"]);
  });

  it("reports words it doesn't understand", () => {
    expect(parseSearchIntent("toyota supra", vocabulary).leftover).toEqual(["supra"]);
    expect(hasSearchableIntent(parseSearchIntent("something nice", vocabulary))).toBe(false);
  });
});
