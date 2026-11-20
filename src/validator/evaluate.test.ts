import { describe, expect, it } from "vitest";
import { LOCATIONS, MACHINES, ORDERS, SETTINGS, TRUCKS } from "../domain/data";
import { buildDistanceMatrix } from "../domain/distance";
import { evaluatePlan, evaluateRoute } from "./evaluate";
import type { EvaluationContext, Stop, Violation } from "./types";

const ctx: EvaluationContext = {
  orders: ORDERS,
  machines: MACHINES,
  distances: buildDistanceMatrix(LOCATIONS),
  settings: SETTINGS,
};
const truckA = TRUCKS.find((t) => t.id === "A")!;
const truckB = TRUCKS.find((t) => t.id === "B")!;

const pick = (orderId: string): Stop => ({ orderId, action: "pickup" });
const drop = (orderId: string): Stop => ({ orderId, action: "delivery" });
const codes = (violations: Violation[]) => violations.map((v) => v.code);

describe("evaluateRoute: ispravne rute", () => {
  it("računa kilometražu, vrijeme i opterećenje nakon svake radnje", () => {
    const e = evaluateRoute(truckA, [pick("N01"), drop("N01")], ctx);
    expect(e.valid).toBe(true);
    expect(e.steps.map((s) => s.locationId)).toEqual(["L1", "L3"]);
    expect(e.steps.map((s) => s.loadKg)).toEqual([800, 0]);
    expect(e.returnKm).toBe(19.2); // L3 -> baza
    expect(e.totalKm).toBe(41.7); // 8.5 + 14.0 + 19.2
    expect(e.totalMinutes).toBe(81.7); // 41.7 min vožnje + 2 x 20 min
    expect(e.completedOrderIds).toEqual(["N01"]);
  });

  it("prazna ruta ne ide nigdje i ispravna je", () => {
    const e = evaluateRoute(truckA, [], ctx);
    expect(e.totalKm).toBe(0);
    expect(e.valid).toBe(true);
  });
});

describe("poslovna ograničenja", () => {
  it("nosivost: kamion A ne smije prijeći 3 500 kg", () => {
    // N04 (2 400 kg) + N02 (1 300 kg) = 3 700 kg
    const e = evaluateRoute(
      truckA,
      [pick("N04"), pick("N02"), drop("N04"), drop("N02")],
      ctx,
    );
    expect(e.valid).toBe(false);
    expect(codes(e.violations)).toContain("CAPACITY_EXCEEDED");
    expect(codes(e.violations)).not.toContain("MACHINE_COUNT_EXCEEDED");
  });

  it("nosivost: M10 (9 400 kg) ne može dijeliti kamion B ni s najlakšim strojem", () => {
    const e = evaluateRoute(
      truckB,
      [pick("N10"), pick("N01"), drop("N01"), drop("N10")],
      ctx,
    );
    expect(codes(e.violations)).toContain("CAPACITY_EXCEEDED");
  });

  it("broj strojeva: kamion B ne smije imati 4 stroja istodobno", () => {
    // 800 + 1 300 + 1 800 + 2 400 = 6 300 kg, dakle težina je u redu, ali ih je 4
    const e = evaluateRoute(
      truckB,
      [
        pick("N01"),
        pick("N02"),
        pick("N03"),
        pick("N04"),
        drop("N01"),
        drop("N02"),
        drop("N03"),
        drop("N04"),
      ],
      ctx,
    );
    expect(codes(e.violations)).toContain("MACHINE_COUNT_EXCEEDED");
    expect(codes(e.violations)).not.toContain("CAPACITY_EXCEEDED");
  });

  it("redoslijed: isporuka prije preuzimanja nije dopuštena", () => {
    const e = evaluateRoute(truckA, [drop("N01"), pick("N01")], ctx);
    expect(codes(e.violations)).toContain("DELIVERY_BEFORE_PICKUP");
  });

  it("isti kamion: preuzet stroj mora biti isporučen istim kamionom", () => {
    const only = evaluateRoute(truckA, [pick("N01")], ctx);
    expect(codes(only.violations)).toContain("PICKUP_WITHOUT_DELIVERY");

    const split = evaluatePlan(
      [
        { truck: truckA, stops: [pick("N01")] },
        { truck: truckB, stops: [drop("N01")] },
      ],
      ctx,
    );
    expect(split.valid).toBe(false);
    expect(codes(split.violations)).toContain("ORDER_ON_MULTIPLE_TRUCKS");
    expect(split.completedOrders).toBe(0);
  });

  it("radno vrijeme: vožnja + utovar/istovar ne smije prijeći 9 sati", () => {
    // Svi nalozi jedan po jedan na kamionu B (20 radnji + oko 350 km)
    const sequential = ORDERS.flatMap((o) => [pick(o.id), drop(o.id)]);
    const e = evaluateRoute(truckB, sequential, ctx);
    expect(e.totalMinutes).toBeGreaterThan(9 * 60);
    expect(codes(e.violations)).toContain("WORKDAY_EXCEEDED");
  });
});

describe("evaluatePlan", () => {
  it("javlja naloge koji nisu izvršeni, a plan ostaje ispravan", () => {
    const e = evaluatePlan(
      [
        { truck: truckA, stops: [pick("N01"), drop("N01")] },
        { truck: truckB, stops: [] },
      ],
      ctx,
    );
    expect(e.valid).toBe(true);
    expect(e.completedOrders).toBe(1);
    expect(e.unassignedOrderIds).toHaveLength(9);
    expect(e.totalKm).toBe(41.7);
  });
});
