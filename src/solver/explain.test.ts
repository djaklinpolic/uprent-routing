import { describe, expect, it } from "vitest";
import { LOCATIONS, MACHINES, ORDERS, SETTINGS, TRUCKS } from "../domain/data";
import { buildDistanceMatrix } from "../domain/distance";
import type { EvaluationContext } from "../validator/types";
import { explainUnassigned } from "./explain";

const ctx: EvaluationContext = {
  orders: ORDERS,
  machines: MACHINES,
  distances: buildDistanceMatrix(LOCATIONS),
  settings: SETTINGS,
};
const n10 = ORDERS.find((o) => o.id === "N10")!;

describe("explainUnassigned", () => {
  it("prepoznaje stroj pretežak za sve kamione", () => {
    const machines = MACHINES.map((m) =>
      m.id === "M10" ? { ...m, weightKg: 12000 } : m,
    );
    expect(explainUnassigned(n10, TRUCKS, { ...ctx, machines })).toContain(
      "teži je od nosivosti",
    );
  });

  it("prepoznaje nalog koji ne stane u radni dan", () => {
    const short = { ...ctx, settings: { ...SETTINGS, maxDriveHoursPerDay: 1 } };
    expect(explainUnassigned(n10, TRUCKS, short)).toContain("radni dan");
  });

  it("prepoznaje nalog koji je izvediv sam, ali ne uz ostale", () => {
    expect(explainUnassigned(n10, TRUCKS, ctx)).toContain(
      "Izvediv je sam za sebe",
    );
  });
});
