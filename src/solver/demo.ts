import { LOCATIONS, MACHINES, ORDERS, SETTINGS, TRUCKS } from "../domain/data";
import { buildDistanceMatrix } from "../domain/distance";
import type { EvaluationContext } from "../validator/types";
import { solve } from "./solve";

const ctx: EvaluationContext = {
  orders: ORDERS,
  machines: MACHINES,
  distances: buildDistanceMatrix(LOCATIONS),
  settings: SETTINGS,
};

const started = performance.now();
const result = solve(ctx, TRUCKS);
const ms = Math.round(performance.now() - started);

for (const route of result.evaluation.routes) {
  console.log(
    `\n${route.truckId}: ${route.totalKm} km, ${route.totalMinutes} min, ${route.completedOrderIds.length} naloga`,
  );
  console.log("  L0 (polazak)");
  for (const s of route.steps) {
    const action = s.stop.action === "pickup" ? "preuzimanje" : "isporuka   ";
    console.log(
      `  ${s.locationId}  ${action}  ${s.stop.orderId} (${s.machineId})  +${s.legKm} km  opterećenje: ${s.loadKg} kg, strojeva: ${s.machinesOnBoard}`,
    );
  }
  console.log(`  L0 (povratak, +${route.returnKm} km)`);
}
console.log(`\nUkupno: ${result.evaluation.totalKm} km`);
console.log(
  `Neizvršeni nalozi: ${result.evaluation.unassignedOrderIds.join(", ") || "nema"}`,
);
console.log(`Stanja DP-a: ${result.statesVisited}, vrijeme: ${ms} ms`);
