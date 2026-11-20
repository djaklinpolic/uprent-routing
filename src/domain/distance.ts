import type { Location, LocationId } from "./types";

/** Zaokruživanje na jednu decimalu (pravilo iz zadatka vrijedi po dionici). */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Euklidska udaljenost dviju lokacija u km, zaokružena na jednu decimalu. */
export function distanceKm(a: Location, b: Location): number {
  return round1(Math.hypot(a.x - b.x, a.y - b.y));
}

export type DistanceMatrix = Record<LocationId, Record<LocationId, number>>;

/** Unaprijed izračunate udaljenosti svih parova lokacija. */
export function buildDistanceMatrix(locations: Location[]): DistanceMatrix {
  const matrix: DistanceMatrix = {};
  for (const from of locations) {
    matrix[from.id] = {};
    for (const to of locations) {
      matrix[from.id][to.id] = distanceKm(from, to);
    }
  }
  return matrix;
}
