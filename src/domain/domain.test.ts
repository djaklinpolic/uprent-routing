import { describe, expect, it } from "vitest";
import { LOCATIONS, MACHINES, ORDERS, TRUCKS } from "./data";
import { buildDistanceMatrix, distanceKm } from "./distance";

const loc = (id: string) => LOCATIONS.find((l) => l.id === id)!;

describe("udaljenosti", () => {
  it("zaokružuje svaku dionicu na jednu decimalu", () => {
    expect(distanceKm(loc("L0"), loc("L1"))).toBe(8.5); // sqrt(73)
    expect(distanceKm(loc("L0"), loc("L2"))).toBe(14.9); // sqrt(221)
    expect(distanceKm(loc("L1"), loc("L3"))).toBe(14.0); // sqrt(197)
  });

  it("je simetrična, a udaljenost lokacije do same sebe je 0", () => {
    const m = buildDistanceMatrix(LOCATIONS);
    expect(m["L2"]["L7"]).toBe(m["L7"]["L2"]);
    expect(m["L5"]["L5"]).toBe(0);
  });
});

describe("ulazni podaci", () => {
  it("svaki nalog upućuje na postojeći stroj i postojeće lokacije", () => {
    const machineIds = new Set(MACHINES.map((m) => m.id));
    const locationIds = new Set(LOCATIONS.map((l) => l.id));
    for (const o of ORDERS) {
      expect(machineIds.has(o.machineId)).toBe(true);
      expect(locationIds.has(o.pickup)).toBe(true);
      expect(locationIds.has(o.delivery)).toBe(true);
      expect(o.pickup).not.toBe(o.delivery);
    }
  });

  it("nijedan stroj nije teži od nosivosti najvećeg kamiona", () => {
    const maxCapacity = Math.max(...TRUCKS.map((t) => t.capacityKg));
    for (const m of MACHINES) {
      expect(m.weightKg).toBeLessThanOrEqual(maxCapacity);
    }
  });
});
