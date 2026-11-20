import type { Location, Machine, Order, Settings, Truck } from "./types";

export const SETTINGS: Settings = {
  baseId: "L0",
  speedKmh: 60,
  serviceMinutes: 20,
  maxDriveHoursPerDay: 9,
};

export const TRUCKS: Truck[] = [
  { id: "A", name: "Kamion A", capacityKg: 3500, maxMachines: 2 },
  { id: "B", name: "Kamion B", capacityKg: 10000, maxMachines: 3 },
];

export const LOCATIONS: Location[] = [
  { id: "L0", name: "Baza", x: 0, y: 0 },
  { id: "L1", name: "L1", x: 3, y: 8 },
  { id: "L2", name: "L2", x: 10, y: 11 },
  { id: "L3", name: "L3", x: 17, y: 9 },
  { id: "L4", name: "L4", x: 9, y: -6 },
  { id: "L5", name: "L5", x: 26, y: 3 },
  { id: "L6", name: "L6", x: -7, y: 13 },
  { id: "L7", name: "L7", x: 20, y: -8 },
  { id: "L8", name: "L8", x: 23, y: 15 },
  { id: "L9", name: "L9", x: -8, y: -5 },
];

export const MACHINES: Machine[] = [
  { id: "M01", weightKg: 800 },
  { id: "M02", weightKg: 1300 },
  { id: "M03", weightKg: 1800 },
  { id: "M04", weightKg: 2400 },
  { id: "M05", weightKg: 3100 },
  { id: "M06", weightKg: 3900 },
  { id: "M07", weightKg: 4800 },
  { id: "M08", weightKg: 6100 },
  { id: "M09", weightKg: 7500 },
  { id: "M10", weightKg: 9400 },
];

export const ORDERS: Order[] = [
  { id: "N01", machineId: "M01", pickup: "L1", delivery: "L3" },
  { id: "N02", machineId: "M02", pickup: "L2", delivery: "L5" },
  { id: "N03", machineId: "M03", pickup: "L9", delivery: "L4" },
  { id: "N04", machineId: "M04", pickup: "L3", delivery: "L0" },
  { id: "N05", machineId: "M05", pickup: "L0", delivery: "L8" },
  { id: "N06", machineId: "M06", pickup: "L5", delivery: "L7" },
  { id: "N07", machineId: "M07", pickup: "L8", delivery: "L2" },
  { id: "N08", machineId: "M08", pickup: "L4", delivery: "L9" },
  { id: "N09", machineId: "M09", pickup: "L6", delivery: "L1" },
  { id: "N10", machineId: "M10", pickup: "L7", delivery: "L3" },
];
