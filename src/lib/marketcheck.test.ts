import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { mapMarketcheckListing } from "./marketcheck";

const fullListing = {
  vin: "WP0AB2A99KS123456",
  heading: "2019 Porsche 911 Carrera S",
  dist: 12.44,
  price: 118500,
  miles: 21800,
  source: "example-dealer.com",
  vdp_url: "https://example.com/listing",
  build: { year: 2019, make: "Porsche", model: "911", trim: "Carrera S" },
  dealer: { city: "Lawrenceville", state: "GA", name: "Example Motors" },
  media: { photo_links: ["https://example.com/a.jpg", "https://example.com/b.jpg"] },
};

describe("mapMarketcheckListing", () => {
  it("maps provider fields including trim", () => {
    const lead = mapMarketcheckListing(fullListing, "30043", 100);
    expect(lead.trim).toBe("Carrera S");
    expect(lead.vin).toBe(fullListing.vin);
    expect(lead.price).toBe(118500);
    expect(lead.distanceMiles).toBe(12.4);
    expect(lead.searchZip).toBe("30043");
    expect(lead.stage).toBe("New Leads");
  });

  it("leaves trim null when the provider omits it", () => {
    const lead = mapMarketcheckListing({ ...fullListing, build: { year: 2019, make: "Porsche", model: "911" } }, "30043", 100);
    expect(lead.trim).toBeNull();
  });
});

describe("trim write-path integrity", () => {
  it("only the Marketcheck mapping writes Lead.trim inside src/", () => {
    const root = path.resolve(__dirname, "..");
    const files = fs
      .readdirSync(root, { recursive: true })
      .map(String)
      .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith(".test.ts"));

    const offenders: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(path.join(root, file), "utf8");
      // Scalar object-literal writes look like `trim: value`. Query filters
      // (`trim: { contains: ... }`), the optional type declaration
      // (`trim?:`), and String.prototype.trim() don't match.
      if (/\btrim:(?!\s*\{)/.test(content) && !file.endsWith("lib/marketcheck.ts")) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
