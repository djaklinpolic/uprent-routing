import type { Location } from "../domain/types";
import type { RouteEvaluation } from "../validator/types";

export const ROUTE_COLORS = ["#2563eb", "#ea580c", "#16a34a", "#9333ea"];

interface Props {
  locations: Location[];
  baseId: string;
  routes: RouteEvaluation[];
}

/** Jednostavna SVG karta: jedinice u viewBox-u su kilometri. */
export function RouteMap({ locations, baseId, routes }: Props) {
  const pad = 4;
  const xs = locations.map((l) => l.x);
  const ys = locations.map((l) => l.y);
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const byId = new Map(locations.map((l) => [l.id, l]));
  const px = (x: number) => x - minX;
  const py = (y: number) => maxY - y; // y raste prema gore

  return (
    <svg
      viewBox={`0 0 ${maxX - minX} ${maxY - minY}`}
      className="map"
      role="img"
      aria-label="Karta ruta kamiona"
    >
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
            stroke={ROUTE_COLORS[i % ROUTE_COLORS.length]}
            strokeWidth={0.35}
            strokeLinejoin="round"
            opacity={0.85}
          />
        );
      })}
      {locations.map((l) => (
        <g key={l.id}>
          {l.id === baseId ? (
            <rect
              x={px(l.x) - 0.9}
              y={py(l.y) - 0.9}
              width={1.8}
              height={1.8}
              fill="#111827"
            />
          ) : (
            <circle
              cx={px(l.x)}
              cy={py(l.y)}
              r={0.8}
              fill="#ffffff"
              stroke="#111827"
              strokeWidth={0.25}
            />
          )}
          <text x={px(l.x) + 1.2} y={py(l.y) - 1} fontSize={1.8} fill="#111827">
            {l.id}
          </text>
        </g>
      ))}
    </svg>
  );
}
