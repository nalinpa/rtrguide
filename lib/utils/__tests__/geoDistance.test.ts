import { distanceMeters } from "@/lib/utils/geoDistance";

describe("distanceMeters", () => {
  it("returns 0 for identical points", () => {
    const point = { lat: -38.1368, lng: 176.2497 };
    expect(distanceMeters(point, point)).toBe(0);
  });

  it("computes the great-circle distance between two known points", () => {
    const lakefront = { lat: -38.1368, lng: 176.2497 };
    const skyline = { lat: -38.1446, lng: 176.262 };
    expect(distanceMeters(lakefront, skyline)).toBeCloseTo(1381.79, 1);
  });

  it("is symmetric regardless of argument order", () => {
    const lakefront = { lat: -38.1368, lng: 176.2497 };
    const skyline = { lat: -38.1446, lng: 176.262 };
    expect(distanceMeters(lakefront, skyline)).toBe(distanceMeters(skyline, lakefront));
  });
});
