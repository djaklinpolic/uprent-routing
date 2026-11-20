import { describe, expect, it } from "vitest";
import { LOCATIONS, MACHINES, ORDERS, SETTINGS, TRUCKS } from "../domain/data";
import { buildDistanceMatrix } from "../domain/distance";
import type { Truck } from "../domain/types";
import { evaluateRoute } from "../validator/evaluate";
import type { EvaluationContext, Stop } from "../validator/types";
import { MAX_EXACT_ORDERS, solve } from "./solve";

const ctx: EvaluationContext = {
  orders: ORDERS,
  machines: MACHINES,
  distances: buildDistanceMatrix(LOCATIONS),
  settings: SETTINGS,
};
const truckA = TRUCKS.find((t) => t.id === "A")!;
const truckB = TRUCKS.find((t) => t.id === "B")!;

describe("solve: stvarni zadatak", () => {
  const result = solve(ctx, TRUCKS);

  it("izvršava svih 10 naloga i plan je valjan", () => {
    expect(result.evaluation.valid).toBe(true);
    expect(result.evaluation.completedOrders).toBe(10);
    expect(result.evaluation.unassignedOrderIds).toEqual([]);
  });

  it("teški strojevi (iznad nosivosti kamiona A) nikad nisu na kamionu A", () => {
    const heavyIds = ORDERS.filter(
      (o) =>
        MACHINES.find((m) => m.id === o.machineId)!.weightKg >
        truckA.capacityKg,
    ).map((o) => o.id);
    expect(heavyIds.length).toBeGreaterThan(0);

    const routeA = result.plan.find((r) => r.truck.id === "A")!;
    for (const stop of routeA.stops) {
      expect(heavyIds).not.toContain(stop.orderId);
    }
  });

  it("nijedan kamion ne prelazi nosivost, broj strojeva ni radno vrijeme", () => {
    for (const route of result.evaluation.routes) {
      const truck = TRUCKS.find((t) => t.id === route.truckId)!;
      for (const step of route.steps) {
        expect(step.loadKg).toBeLessThanOrEqual(truck.capacityKg);
        expect(step.machinesOnBoard).toBeLessThanOrEqual(truck.maxMachines);
      }
      expect(route.totalMinutes).toBeLessThanOrEqual(
        SETTINGS.maxDriveHoursPerDay * 60,
      );
    }
  });
});

describe("solve: neizvedivi nalozi", () => {
  it("upozorava na nalog čiji je stroj pretežak za oba kamiona", () => {
    const machines = MACHINES.map((m) =>
      m.id === "M10" ? { ...m, weightKg: 12000 } : m,
    );
    const result = solve({ ...ctx, machines }, TRUCKS);
    expect(result.evaluation.valid).toBe(true);
    expect(result.evaluation.unassignedOrderIds).toEqual(["N10"]);
    expect(result.evaluation.completedOrders).toBe(9);
  });

  it("zbog kratkog radnog dana izvršava samo ono što stane i prijavljuje ostatak", () => {
    const short = { ...ctx, settings: { ...SETTINGS, maxDriveHoursPerDay: 2 } };
    const result = solve(short, TRUCKS);
    expect(result.evaluation.valid).toBe(true);
    expect(result.evaluation.unassignedOrderIds.length).toBeGreaterThan(0);
    for (const route of result.evaluation.routes) {
      expect(route.totalMinutes).toBeLessThanOrEqual(120);
    }
  });

  it("odbija previše naloga za egzaktni algoritam", () => {
    const orders = Array.from({ length: MAX_EXACT_ORDERS + 1 }, (_, i) => ({
      ...ORDERS[i % ORDERS.length],
      id: `X${i}`,
    }));
    expect(() => solve({ ...ctx, orders }, TRUCKS)).toThrow();
  });
});

// --- Usporedba s grubom silom na manjem primjeru -------------------------------

const pick = (orderId: string): Stop => ({ orderId, action: "pickup" });
const drop = (orderId: string): Stop => ({ orderId, action: "delivery" });

/** Najkraća valjana ruta jednog kamiona za zadane naloge, isprobavanjem svih redoslijeda. */
function bruteForceKm(
  truck: Truck,
  orderIds: string[],
  c: EvaluationContext,
): number {
  if (orderIds.length === 0) return 0;
  let best = Infinity;
  const stops: Stop[] = [];
  const picked = new Set<string>();
  const done = new Set<string>();

  const recurse = () => {
    if (stops.length === orderIds.length * 2) {
      const e = evaluateRoute(truck, stops, c);
      if (e.valid && e.totalKm < best) best = e.totalKm;
      return;
    }
    for (const id of orderIds) {
      if (!picked.has(id)) {
        picked.add(id);
        stops.push(pick(id));
        recurse();
        stops.pop();
        picked.delete(id);
      } else if (!done.has(id)) {
        done.add(id);
        stops.push(drop(id));
        recurse();
        stops.pop();
        done.delete(id);
      }
    }
  };
  recurse();
  return best;
}

describe("solve: usporedba s grubom silom", () => {
  it("nalazi istu najmanju kilometražu kao potpuno isprobavanje (4 naloga)", () => {
    const orders = ORDERS.slice(0, 4);
    const small = { ...ctx, orders };

    let best = Infinity;
    for (let mask = 0; mask < 1 << orders.length; mask++) {
      const forA = orders.filter((_, i) => mask & (1 << i)).map((o) => o.id);
      const forB = orders.filter((_, i) => !(mask & (1 << i))).map((o) => o.id);
      best = Math.min(
        best,
        bruteForceKm(truckA, forA, small) + bruteForceKm(truckB, forB, small),
      );
    }

    const solved = solve(small, TRUCKS);
    expect(solved.evaluation.completedOrders).toBe(4);
    expect(solved.evaluation.totalKm).toBeCloseTo(best, 5);
  });
});
