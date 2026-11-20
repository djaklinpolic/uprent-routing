import type { Truck } from "../domain/types";
import { evaluatePlan } from "../validator/evaluate";
import type {
  EvaluationContext,
  PlanEvaluation,
  Stop,
  TruckRoute,
} from "../validator/types";

/** Gornja granica za egzaktni algoritam (memorija i vrijeme rastu kao 3^n). */
export const MAX_EXACT_ORDERS = 11;

const INF = 0x3fffffff;

export interface SolveResult {
  plan: TruckRoute[];
  evaluation: PlanEvaluation;
  /** Broj posjećenih stanja dinamičkog programa (za opis složenosti). */
  statesVisited: number;
}

/**
 * Unaprijed pripremljeni brojevi. Radnje (stops) su numerirane:
 * 2i = preuzimanje naloga i, 2i+1 = isporuka naloga i.
 * Sve udaljenosti su cijeli brojevi u desetinkama km (bez grešaka decimalnih brojeva).
 */
interface Geometry {
  n: number;
  stopCount: number;
  pow3: number[];
  weightKg: number[];
  between: Int32Array; // [od * stopCount + do]
  fromBase: Int32Array;
  toBase: Int32Array;
  // Po stanju (svaki nalog je 0 = netaknut, 1 = na kamionu, 2 = isporučen):
  loadKg: Int32Array;
  loadCount: Int32Array;
  deliveredMask: Int32Array;
}

function popcount(x: number): number {
  let count = 0;
  while (x) {
    x &= x - 1;
    count++;
  }
  return count;
}

function buildGeometry(ctx: EvaluationContext): Geometry {
  const n = ctx.orders.length;
  const stopCount = 2 * n;
  const toTenths = (km: number) => Math.round(km * 10);

  const stopLocation: string[] = [];
  const weightKg: number[] = [];
  for (const order of ctx.orders) {
    const machine = ctx.machines.find((m) => m.id === order.machineId);
    if (!machine) {
      throw new Error(
        `Nalog ${order.id}: stroj ${order.machineId} ne postoji.`,
      );
    }
    weightKg.push(machine.weightKg);
    stopLocation.push(order.pickup, order.delivery);
  }

  const base = ctx.settings.baseId;
  const between = new Int32Array(stopCount * stopCount);
  const fromBase = new Int32Array(stopCount);
  const toBase = new Int32Array(stopCount);
  for (let a = 0; a < stopCount; a++) {
    fromBase[a] = toTenths(ctx.distances[base][stopLocation[a]]);
    toBase[a] = toTenths(ctx.distances[stopLocation[a]][base]);
    for (let b = 0; b < stopCount; b++) {
      between[a * stopCount + b] = toTenths(
        ctx.distances[stopLocation[a]][stopLocation[b]],
      );
    }
  }

  const pow3 = [1];
  for (let i = 1; i <= n; i++) pow3.push(pow3[i - 1] * 3);

  const states = pow3[n];
  const loadKg = new Int32Array(states);
  const loadCount = new Int32Array(states);
  const deliveredMask = new Int32Array(states);
  for (let s = 0; s < states; s++) {
    let rest = s;
    for (let i = 0; i < n; i++) {
      const digit = rest % 3;
      rest = (rest - digit) / 3;
      if (digit === 1) {
        loadKg[s] += weightKg[i];
        loadCount[s] += 1;
      } else if (digit === 2) {
        deliveredMask[s] |= 1 << i;
      }
    }
  }

  return {
    n,
    stopCount,
    pow3,
    weightKg,
    between,
    fromBase,
    toBase,
    loadKg,
    loadCount,
    deliveredMask,
  };
}

interface TruckTable {
  /** cost[maska] = najkraća ruta (desetinke km) koja izvršava točno naloge iz maske; INF ako je nemoguće. */
  cost: Int32Array;
  /** Zadnje stanje optimalne rute za pojedinu masku (za rekonstrukciju). */
  endState: Int32Array;
  /** parent[stanje] = prethodno stanje na najkraćem putu, -1 za prvu radnju. */
  parent: Int32Array;
  statesVisited: number;
}

/**
 * Dinamičko programiranje za JEDAN kamion. Stanje = (status svakog naloga, zadnja radnja).
 * Iz stanja se može napraviti samo dopuštena radnja: preuzimanje ako stane na kamion,
 * isporuka ako je stroj već na kamionu. Time su nosivost, broj strojeva, redoslijed
 * (preuzimanje prije isporuke) i "isti kamion" ugrađeni u samu strukturu pretrage.
 */
function buildTruckTable(
  truck: Truck,
  ctx: EvaluationContext,
  g: Geometry,
): TruckTable {
  const { n, stopCount: L, pow3 } = g;
  const states = pow3[n];
  const dp = new Int32Array(states * L).fill(INF);
  const parent = new Int32Array(states * L).fill(-1);

  // Prva radnja: iz baze na preuzimanje nekog naloga
  for (let i = 0; i < n; i++) {
    if (g.weightKg[i] <= truck.capacityKg && truck.maxMachines >= 1) {
      dp[pow3[i] * L + 2 * i] = g.fromBase[2 * i];
    }
  }

  // Svaki prijelaz povećava broj stanja (0->1 ili 1->2 na jednom mjestu),
  // pa je obilazak stanja redom rastućih brojeva ispravan redoslijed.
  const status = new Int8Array(n);
  let visited = 0;
  for (let s = 1; s < states; s++) {
    let rest = s;
    for (let i = 0; i < n; i++) {
      const digit = rest % 3;
      rest = (rest - digit) / 3;
      status[i] = digit;
    }
    const kg = g.loadKg[s];
    const count = g.loadCount[s];

    for (let last = 0; last < L; last++) {
      const current = dp[s * L + last];
      if (current >= INF) continue;
      visited++;

      for (let i = 0; i < n; i++) {
        let next: number;
        if (status[i] === 0) {
          if (kg + g.weightKg[i] > truck.capacityKg) continue;
          if (count + 1 > truck.maxMachines) continue;
          next = 2 * i; // preuzimanje
        } else if (status[i] === 1) {
          next = 2 * i + 1; // isporuka
        } else {
          continue;
        }
        const target = (s + pow3[i]) * L + next;
        const cost = current + g.between[last * L + next];
        if (cost < dp[target]) {
          dp[target] = cost;
          parent[target] = s * L + last;
        }
      }
    }
  }

  // Završna stanja: ništa nije na kamionu; dodaj povratak u bazu
  const full = 1 << n;
  const cost = new Int32Array(full).fill(INF);
  const endState = new Int32Array(full).fill(-1);
  cost[0] = 0; // prazna ruta
  for (let s = 1; s < states; s++) {
    if (g.loadCount[s] !== 0) continue;
    const mask = g.deliveredMask[s];
    for (let last = 0; last < L; last++) {
      const current = dp[s * L + last];
      if (current >= INF) continue;
      const total = current + g.toBase[last];
      if (total < cost[mask]) {
        cost[mask] = total;
        endState[mask] = s * L + last;
      }
    }
  }

  // Radno vrijeme: za fiksni skup naloga vrijeme raste s kilometražom, pa je
  // dovoljno provjeriti najkraću rutu. Ako ni ona ne stane u dan, skup je nemoguć.
  const limitMinutes = ctx.settings.maxDriveHoursPerDay * 60;
  for (let mask = 1; mask < full; mask++) {
    if (cost[mask] >= INF) continue;
    const driveMinutes = (cost[mask] / 10 / ctx.settings.speedKmh) * 60;
    const serviceMinutes = 2 * popcount(mask) * ctx.settings.serviceMinutes;
    if (driveMinutes + serviceMinutes > limitMinutes + 1e-9) cost[mask] = INF;
  }

  return { cost, endState, parent, statesVisited: visited };
}

function reconstructStops(
  table: TruckTable,
  mask: number,
  ctx: EvaluationContext,
  L: number,
): Stop[] {
  const stops: Stop[] = [];
  let index = table.endState[mask];
  while (index !== -1) {
    const last = index % L;
    stops.push({
      orderId: ctx.orders[last >> 1].id,
      action: last % 2 === 0 ? "pickup" : "delivery",
    });
    index = table.parent[index];
  }
  return stops.reverse();
}

/**
 * Egzaktno rješenje:
 *  1) za svaki kamion i svaki podskup naloga: najkraća dopuštena ruta (DP gore),
 *  2) podjela naloga među kamionima (DP po podskupovima): prvo najviše izvršenih
 *     naloga, zatim najmanja ukupna kilometraža.
 * Nalozi koji se ne mogu izvršiti ostaju neraspoređeni (evaluation.unassignedOrderIds).
 */
export function solve(ctx: EvaluationContext, trucks: Truck[]): SolveResult {
  const n = ctx.orders.length;
  if (n > MAX_EXACT_ORDERS) {
    throw new Error(
      `Egzaktni algoritam podržava najviše ${MAX_EXACT_ORDERS} naloga, a zadano je ${n}.`,
    );
  }

  const geometry = buildGeometry(ctx);
  const tables = trucks.map((truck) => buildTruckTable(truck, ctx, geometry));
  const full = 1 << n;

  // previous[U] = najmanja kilometraža kojom prvih t kamiona izvrši TOČNO naloge iz U
  let previous = new Int32Array(full).fill(INF);
  previous[0] = 0;
  const choices: Int32Array[] = [];
  for (let t = 0; t < trucks.length; t++) {
    const current = new Int32Array(full).fill(INF);
    const choice = new Int32Array(full);
    const cost = tables[t].cost;
    for (let covered = 0; covered < full; covered++) {
      // svi podskupovi `sub` skupa `covered` koje preuzima kamion t
      for (let sub = covered; ; sub = (sub - 1) & covered) {
        const rest = covered ^ sub;
        if (previous[rest] < INF && cost[sub] < INF) {
          const total = previous[rest] + cost[sub];
          if (total < current[covered]) {
            current[covered] = total;
            choice[covered] = sub;
          }
        }
        if (sub === 0) break;
      }
    }
    choices.push(choice);
    previous = current;
  }

  // Najviše izvršenih naloga, pa najmanja kilometraža
  let bestMask = 0;
  for (let mask = 1; mask < full; mask++) {
    if (previous[mask] >= INF) continue;
    const moreOrders = popcount(mask) > popcount(bestMask);
    const sameButShorter =
      popcount(mask) === popcount(bestMask) &&
      previous[mask] < previous[bestMask];
    if (moreOrders || sameButShorter) bestMask = mask;
  }

  // Rekonstrukcija: koji kamion nosi koje naloge
  const masks = new Array<number>(trucks.length).fill(0);
  let remaining = bestMask;
  for (let t = trucks.length - 1; t >= 0; t--) {
    const sub = choices[t][remaining];
    masks[t] = sub;
    remaining ^= sub;
  }

  const plan: TruckRoute[] = trucks.map((truck, t) => ({
    truck,
    stops:
      masks[t] === 0
        ? []
        : reconstructStops(tables[t], masks[t], ctx, geometry.stopCount),
  }));

  // Rezultat uvijek prolazi kroz neovisni evaluator
  const evaluation = evaluatePlan(plan, ctx);
  if (!evaluation.valid) {
    throw new Error(
      "Interna greška: solver je vratio nevaljan plan: " +
        evaluation.violations.map((v) => v.message).join(" | "),
    );
  }
  if (Math.round(evaluation.totalKm * 10) !== previous[bestMask]) {
    throw new Error(
      "Interna greška: kilometraža evaluatora ne odgovara kilometraži solvera.",
    );
  }

  return {
    plan,
    evaluation,
    statesVisited: tables.reduce((sum, table) => sum + table.statesVisited, 0),
  };
}
