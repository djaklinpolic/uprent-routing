import { round1 } from "../domain/distance";
import type { OrderId, Truck, TruckId } from "../domain/types";
import type {
  EvaluationContext,
  PlanEvaluation,
  RouteEvaluation,
  RouteStep,
  Stop,
  TruckRoute,
  Violation,
} from "./types";

export function evaluateRoute(
  truck: Truck,
  stops: Stop[],
  ctx: EvaluationContext,
): RouteEvaluation {
  const orderById = new Map(ctx.orders.map((o) => [o.id, o]));
  const machineById = new Map(ctx.machines.map((m) => [m.id, m]));

  const steps: RouteStep[] = [];
  const violations: Violation[] = [];
  const pickedUp = new Set<OrderId>();
  const delivered = new Set<OrderId>();

  let currentLocation = ctx.settings.baseId;
  let distance = 0;
  let loadKg = 0;
  let machinesOnBoard = 0;

  stops.forEach((stop, index) => {
    const order = orderById.get(stop.orderId);
    const machine = order ? machineById.get(order.machineId) : undefined;
    if (!order || !machine) {
      violations.push({
        code: "UNKNOWN_ORDER",
        message: `Nalog ${stop.orderId} ne postoji.`,
        truckId: truck.id,
        orderId: stop.orderId,
        stepIndex: index,
      });
      return;
    }

    // Vožnja do lokacije radnje
    const locationId = stop.action === "pickup" ? order.pickup : order.delivery;
    distance += ctx.distances[currentLocation][locationId];
    const legKm = ctx.distances[currentLocation][locationId];
    currentLocation = locationId;

    // Radnja i provjera ograničenja
    if (stop.action === "pickup") {
      if (pickedUp.has(order.id)) {
        violations.push({
          code: "DUPLICATE_ACTION",
          message: `${truck.name}: nalog ${order.id} se preuzima više puta.`,
          truckId: truck.id,
          orderId: order.id,
          stepIndex: index,
        });
      } else {
        pickedUp.add(order.id);
        loadKg += machine.weightKg;
        machinesOnBoard += 1;
        if (loadKg > truck.capacityKg) {
          violations.push({
            code: "CAPACITY_EXCEEDED",
            message: `${truck.name}: nakon preuzimanja ${order.id} opterećenje je ${loadKg} kg, a nosivost je ${truck.capacityKg} kg.`,
            truckId: truck.id,
            orderId: order.id,
            stepIndex: index,
          });
        }
        if (machinesOnBoard > truck.maxMachines) {
          violations.push({
            code: "MACHINE_COUNT_EXCEEDED",
            message: `${truck.name}: nakon preuzimanja ${order.id} na kamionu je ${machinesOnBoard} strojeva, a maksimum je ${truck.maxMachines}.`,
            truckId: truck.id,
            orderId: order.id,
            stepIndex: index,
          });
        }
      }
    } else {
      if (delivered.has(order.id)) {
        violations.push({
          code: "DUPLICATE_ACTION",
          message: `${truck.name}: nalog ${order.id} se isporučuje više puta.`,
          truckId: truck.id,
          orderId: order.id,
          stepIndex: index,
        });
      } else if (!pickedUp.has(order.id)) {
        violations.push({
          code: "DELIVERY_BEFORE_PICKUP",
          message: `${truck.name}: nalog ${order.id} se isporučuje prije preuzimanja (ili ga je preuzeo drugi kamion).`,
          truckId: truck.id,
          orderId: order.id,
          stepIndex: index,
        });
      } else {
        delivered.add(order.id);
        loadKg -= machine.weightKg;
        machinesOnBoard -= 1;
      }
    }

    steps.push({
      index,
      stop,
      locationId,
      machineId: machine.id,
      legKm,
      cumulativeKm: round1(distance),
      loadKg,
      machinesOnBoard,
    });
  });

  // Strojevi preuzeti, a nikad isporučeni istim kamionom
  for (const orderId of pickedUp) {
    if (!delivered.has(orderId)) {
      violations.push({
        code: "PICKUP_WITHOUT_DELIVERY",
        message: `${truck.name}: nalog ${orderId} je preuzet, ali ga isti kamion nije isporučio.`,
        truckId: truck.id,
        orderId,
      });
    }
  }

  // Obavezan povrat u bazu (kamion koji nije nigdje išao ostaje u bazi)
  const returnKm =
    steps.length > 0 ? ctx.distances[currentLocation][ctx.settings.baseId] : 0;
  distance += returnKm;
  const totalKm = round1(distance);

  // Vrijeme: vožnja + 20 min po svakoj radnji (utovar ili istovar)
  const driveMinutes = (totalKm / ctx.settings.speedKmh) * 60;
  const serviceMinutes = steps.length * ctx.settings.serviceMinutes;
  const totalMinutes = driveMinutes + serviceMinutes;
  const limitMinutes = ctx.settings.maxDriveHoursPerDay * 60;
  if (totalMinutes > limitMinutes + 1e-9) {
    violations.push({
      code: "WORKDAY_EXCEEDED",
      message: `${truck.name}: ruta traje ${round1(totalMinutes)} min, a dopušteno je ${limitMinutes} min.`,
      truckId: truck.id,
    });
  }

  return {
    truckId: truck.id,
    steps,
    returnKm,
    totalKm,
    driveMinutes: round1(driveMinutes),
    serviceMinutes,
    totalMinutes: round1(totalMinutes),
    completedOrderIds: [...delivered],
    violations,
    valid: violations.length === 0,
  };
}

export function evaluatePlan(
  plan: TruckRoute[],
  ctx: EvaluationContext,
): PlanEvaluation {
  const routes = plan.map(({ truck, stops }) =>
    evaluateRoute(truck, stops, ctx),
  );
  const violations = routes.flatMap((r) => r.violations);

  // Svaki nalog smije se pojaviti na najviše jednom kamionu
  const trucksPerOrder = new Map<OrderId, Set<TruckId>>();
  for (const { truck, stops } of plan) {
    for (const stop of stops) {
      const trucks = trucksPerOrder.get(stop.orderId) ?? new Set<TruckId>();
      trucks.add(truck.id);
      trucksPerOrder.set(stop.orderId, trucks);
    }
  }
  for (const [orderId, truckIds] of trucksPerOrder) {
    if (truckIds.size > 1) {
      violations.push({
        code: "ORDER_ON_MULTIPLE_TRUCKS",
        message: `Nalog ${orderId} je dodijeljen na više kamiona (${[...truckIds].join(", ")}).`,
        orderId,
      });
    }
  }

  const completed = new Set(routes.flatMap((r) => r.completedOrderIds));
  const unassignedOrderIds = ctx.orders
    .filter((o) => !completed.has(o.id))
    .map((o) => o.id);

  return {
    routes,
    totalKm: round1(routes.reduce((sum, r) => sum + r.totalKm, 0)),
    completedOrders: completed.size,
    unassignedOrderIds,
    violations,
    valid: violations.length === 0,
  };
}
