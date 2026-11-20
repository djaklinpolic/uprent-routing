import type { Location } from "../domain/types";
import type { RouteEvaluation } from "../validator/types";

/** Boje ruta su CSS varijable (tamna i svijetla tema imaju svoje nijanse). */
export const ROUTE_COLORS = [
  "var(--route-1)",
  "var(--route-2)",
  "var(--route-3)",
  "var(--route-4)",
];

interface Props {
  locations: Location[];
  baseId: string;
  routes: RouteEvaluation[];
}

const GRID_STEP_KM = 5;

/** Jednostavna SVG karta: jedinice u viewBox-u su kilometri. */
export function RouteMap({ locations, baseId, routes }: Props) {
  const pad = 4;
  const xs = locations.map((l) => l.x);
  const ys = locations.map((l) => l.y);
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const width = maxX - minX;
  const height = maxY - minY;
  const byId = new Map(locations.map((l) => [l.id, l]));
  const px = (x: number) => x - minX;
  const py = (y: number) => maxY - y; // y raste prema gore

  const gridX: number[] = [];
  for (
    let g = Math.ceil(minX / GRID_STEP_KM) * GRID_STEP_KM;
    g <= maxX;
    g += GRID_STEP_KM
  ) {
    gridX.push(g);
  }
  const gridY: number[] = [];
  for (
    let g = Math.ceil(minY / GRID_STEP_KM) * GRID_STEP_KM;
    g <= maxY;
    g += GRID_STEP_KM
  ) {
    gridY.push(g);
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="map"
      role="img"
      aria-label="Karta ruta kamiona"
    >
      {gridX.map((g) => (
        <g key={`x${g}`}>
          <line className="map-grid" x1={px(g)} y1={0} x2={px(g)} y2={height} />
          <text
            className="map-tick"
            x={px(g) + 0.3}
            y={height - 0.4}
            fontSize={0.9}
          >
            {g}
          </text>
        </g>
      ))}
      {gridY.map((g) => (
        <g key={`y${g}`}>
          <line className="map-grid" x1={0} y1={py(g)} x2={width} y2={py(g)} />
          <text className="map-tick" x={0.3} y={py(g) - 0.3} fontSize={0.9}>
            {g}
          </text>
        </g>
      ))}

      {routes.map((route, i) => {
        if (route.steps.length === 0) return null;
        const ids = [baseId, ...route.steps.map((s) => s.locationId), baseId];
        const points = ids
          .map((id) => {
            const l = byId.get(id)!;
            return `${px(l.x)},${py(l.y)}`;
          })
          .join(" ");
        return (
          <polyline
            key={route.truckId}
            points={points}
            fill="none"
            style={{ stroke: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
            strokeWidth={0.3}
            strokeLinejoin="round"
            opacity={0.9}
          />
        );
      })}

      {locations.map((l) => (
        <g key={l.id}>
          {l.id === baseId ? (
            <rect
              className="map-base"
              x={px(l.x) - 0.8}
              y={py(l.y) - 0.8}
              width={1.6}
              height={1.6}
            />
          ) : (
            <circle className="map-node" cx={px(l.x)} cy={py(l.y)} r={0.7} />
          )}
          <text
            className="map-label"
            x={px(l.x) + 1.1}
            y={py(l.y) - 0.9}
            fontSize={1.1}
          >
            {l.id}
          </text>
        </g>
      ))}
    </svg>
  );
}
