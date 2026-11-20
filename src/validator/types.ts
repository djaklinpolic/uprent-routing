import type { DistanceMatrix } from "../domain/distance";
import type {
  LocationId,
  Machine,
  MachineId,
  Order,
  OrderId,
  Settings,
  Truck,
  TruckId,
} from "../domain/types";

export type StopAction = "pickup" | "delivery";

/** Jedna radnja u ruti: preuzimanje ili isporuka stroja iz naloga. */
export interface Stop {
  orderId: OrderId;
  action: StopAction;
}

/** Ruta jednog kamiona (redoslijed radnji; polazak i povratak u bazu su implicitni). */
export interface TruckRoute {
  truck: Truck;
  stops: Stop[];
}

export type ViolationCode =
  | "UNKNOWN_ORDER"
  | "DUPLICATE_ACTION"
  | "DELIVERY_BEFORE_PICKUP"
  | "PICKUP_WITHOUT_DELIVERY"
  | "CAPACITY_EXCEEDED"
  | "MACHINE_COUNT_EXCEEDED"
  | "WORKDAY_EXCEEDED"
  | "ORDER_ON_MULTIPLE_TRUCKS";

export interface Violation {
  code: ViolationCode;
  message: string;
  truckId?: TruckId;
  orderId?: OrderId;
  stepIndex?: number;
}

export interface RouteStep {
  index: number;
  stop: Stop;
  locationId: LocationId;
  machineId: MachineId;
  legKm: number; // od prethodne lokacije
  cumulativeKm: number;
  loadKg: number; // opterećenje NAKON radnje
  machinesOnBoard: number; // broj strojeva NAKON radnje
}

export interface RouteEvaluation {
  truckId: TruckId;
  steps: RouteStep[];
  returnKm: number; // zadnja lokacija -> baza
  totalKm: number;
  driveMinutes: number;
  serviceMinutes: number;
  totalMinutes: number;
  completedOrderIds: OrderId[];
  violations: Violation[];
  valid: boolean;
}

export interface PlanEvaluation {
  routes: RouteEvaluation[];
  totalKm: number;
  completedOrders: number;
  /** Nalozi koje nijedan kamion nije u cijelosti izvršio (upozorenje za korisnika). */
  unassignedOrderIds: OrderId[];
  violations: Violation[];
  valid: boolean;
}

export interface EvaluationContext {
  orders: Order[];
  machines: Machine[];
  distances: DistanceMatrix;
  settings: Settings;
}
