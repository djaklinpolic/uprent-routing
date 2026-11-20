export type LocationId = string;
export type MachineId = string;
export type OrderId = string;
export type TruckId = string;

export interface Location {
  id: LocationId;
  name: string;
  x: number; // km
  y: number; // km
}

export interface Truck {
  id: TruckId;
  name: string;
  capacityKg: number;
  maxMachines: number;
}

export interface Machine {
  id: MachineId;
  weightKg: number;
}

export interface Order {
  id: OrderId;
  machineId: MachineId;
  pickup: LocationId;
  delivery: LocationId;
}

export interface Settings {
  baseId: LocationId;
  speedKmh: number;
  serviceMinutes: number; // po jednom utovaru ili istovaru
  maxDriveHoursPerDay: number;
}
