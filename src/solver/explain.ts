import type { Order, Truck } from "../domain/types";
import { evaluateRoute } from "../validator/evaluate";
import type { EvaluationContext } from "../validator/types";

/** Ljudski razumljiv razlog zašto nalog nije izvršen (za upozorenje u sučelju). */
export function explainUnassigned(
  order: Order,
  trucks: Truck[],
  ctx: EvaluationContext,
): string {
  const machine = ctx.machines.find((m) => m.id === order.machineId);
  if (!machine) {
    return `Stroj ${order.machineId} ne postoji u popisu strojeva.`;
  }

  const maxCapacity = Math.max(...trucks.map((t) => t.capacityKg));
  if (machine.weightKg > maxCapacity) {
    return `Stroj ${machine.id} (${machine.weightKg} kg) teži je od nosivosti najvećeg kamiona (${maxCapacity} kg).`;
  }

  // Može li ga ijedan kamion prevesti sam, bez ostalih naloga?
  const alone = trucks.map((truck) =>
    evaluateRoute(
      truck,
      [
        { orderId: order.id, action: "pickup" },
        { orderId: order.id, action: "delivery" },
      ],
      ctx,
    ),
  );
  if (alone.some((r) => r.valid)) {
    return "Izvediv je sam za sebe, ali ga uz ostale naloge nije moguće uklopiti u zadana ograničenja (radno vrijeme i kapacitet kamiona).";
  }
  if (
    alone.every((r) => r.violations.some((v) => v.code === "WORKDAY_EXCEEDED"))
  ) {
    return "Čak ni sam ne stane u dopušteni radni dan ni na jednom kamionu.";
  }
  return "Nijedan kamion ga ne može izvršiti sam uz zadana ograničenja (nosivost, broj strojeva ili radno vrijeme).";
}
