import type { Location, Truck } from "../domain/types";
import { explainUnassigned } from "../solver/explain";
import type { SolveResult } from "../solver/solve";
import type { EvaluationContext, RouteEvaluation } from "../validator/types";
import { fmtKg, fmtKm, fmtMin } from "./format";
import { ROUTE_COLORS, RouteMap } from "./RouteMap";

interface Props {
  result: SolveResult;
  ctx: EvaluationContext;
  trucks: Truck[];
  locations: Location[];
  elapsedMs: number | null;
}

export function Results({ result, ctx, trucks, locations, elapsedMs }: Props) {
  const { evaluation } = result;
  const truckById = new Map(trucks.map((t) => [t.id, t]));
  const baseId = ctx.settings.baseId;
  const limitMinutes = ctx.settings.maxDriveHoursPerDay * 60;

  const label = (id: string) => {
    const location = locations.find((l) => l.id === id);
    return location && location.name !== location.id
      ? `${location.id} (${location.name})`
      : id;
  };

  const unassigned = evaluation.unassignedOrderIds.map(
    (id) => ctx.orders.find((o) => o.id === id)!,
  );

  return (
    <section className="results" aria-labelledby="rezultat">
      <h2 id="rezultat" className="section-title">
        Rezultat
      </h2>

      <div className="summary">
        <div className="stat stat-primary">
          <span className="stat-label">Ukupna kilometraža</span>
          <span className="stat-value">{fmtKm(evaluation.totalKm)} km</span>
        </div>
        {evaluation.routes.map((route, i) => (
          <div className="stat" key={route.truckId}>
            <span className="stat-label">
              <span
                className="dot"
                style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
              />
              {truckById.get(route.truckId)!.name}
            </span>
            <span className="stat-value">{fmtKm(route.totalKm)} km</span>
          </div>
        ))}
        <div className="stat">
          <span className="stat-label">Izvršeno naloga</span>
          <span className="stat-value">
            {evaluation.completedOrders} / {ctx.orders.length}
          </span>
        </div>
      </div>

      {unassigned.length > 0 && (
        <div className="warning" role="alert">
          <strong>Upozorenje: nije moguće izvršiti sljedeće naloge.</strong>
          <ul>
            {unassigned.map((o) => (
              <li key={o.id}>
                <b>{o.id}</b> ({o.machineId}, {label(o.pickup)} →{" "}
                {label(o.delivery)}): {explainUnassigned(o, trucks, ctx)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="results-grid">
        <div className="routes">
          {evaluation.routes.map((route, i) => (
            <RouteCard
              key={route.truckId}
              route={route}
              truck={truckById.get(route.truckId)!}
              color={ROUTE_COLORS[i % ROUTE_COLORS.length]}
              baseLabel={label(baseId)}
              label={label}
              limitMinutes={limitMinutes}
            />
          ))}
        </div>

        <aside className="card map-card">
          <h3 className="card-title">Karta ruta</h3>
          <RouteMap
            locations={locations}
            baseId={baseId}
            routes={evaluation.routes}
          />
          <div className="legend">
            {evaluation.routes.map((route, i) => (
              <span key={route.truckId}>
                <span
                  className="dot"
                  style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
                />
                {truckById.get(route.truckId)!.name}
              </span>
            ))}
            <span>
              <span className="legend-base" />
              baza
            </span>
          </div>
        </aside>
      </div>

      <p className="footnote">
        Egzaktno rješenje (dinamičko programiranje), provjereno neovisnim
        evaluatorom.
        {elapsedMs !== null &&
          ` Izračun: ${elapsedMs} ms, ${result.statesVisited} stanja.`}
      </p>
    </section>
  );
}

interface RouteCardProps {
  route: RouteEvaluation;
  truck: Truck;
  color: string;
  baseLabel: string;
  label: (id: string) => string;
  limitMinutes: number;
}

function RouteCard({
  route,
  truck,
  color,
  baseLabel,
  label,
  limitMinutes,
}: RouteCardProps) {
  const percent = Math.min(100, (route.totalMinutes / limitMinutes) * 100);
  const tight = percent >= 90;

  return (
    <article className="route-card">
      <div className="route-head">
        <h3 className="route-title">
          <span className="dot" style={{ background: color }} />
          {truck.name}
        </h3>
        <span className="route-meta">
          nosivost {fmtKg(truck.capacityKg)} kg · max. strojeva{" "}
          {truck.maxMachines}
        </span>
      </div>
      <p className="route-meta">
        {fmtKm(route.totalKm)} km · {route.completedOrderIds.length} naloga
      </p>

      <div className="meter-label">
        <span>Radno vrijeme</span>
        <span>
          {fmtMin(route.totalMinutes)} / {limitMinutes} min
        </span>
      </div>
      <div
        className={tight ? "meter tight" : "meter"}
        role="progressbar"
        aria-label="Iskorišteno radno vrijeme"
        aria-valuemin={0}
        aria-valuemax={limitMinutes}
        aria-valuenow={Math.round(route.totalMinutes)}
      >
        <span style={{ width: `${percent}%` }} />
      </div>

      {route.steps.length === 0 ? (
        <p className="muted">
          Kamion ostaje u bazi (nema dodijeljenih naloga).
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Lokacija</th>
                <th>Radnja</th>
                <th>Nalog · stroj</th>
                <th className="num">Dionica (km)</th>
                <th className="num">Ukupno (km)</th>
                <th className="num">Opterećenje (kg)</th>
                <th className="num">Strojeva</th>
              </tr>
            </thead>
            <tbody>
              <tr className="edge">
                <td>0</td>
                <td>{baseLabel}</td>
                <td>Polazak</td>
                <td>–</td>
                <td className="num">–</td>
                <td className="num">{fmtKm(0)}</td>
                <td className="num">0</td>
                <td className="num">0</td>
              </tr>
              {route.steps.map((s) => (
                <tr key={s.index}>
                  <td>{s.index + 1}</td>
                  <td>{label(s.locationId)}</td>
                  <td>
                    {s.stop.action === "pickup" ? (
                      <span className="tag tag-pickup">Preuzimanje</span>
                    ) : (
                      <span className="tag tag-delivery">Isporuka</span>
                    )}
                  </td>
                  <td>
                    {s.stop.orderId} · {s.machineId}
                  </td>
                  <td className="num">{fmtKm(s.legKm)}</td>
                  <td className="num">{fmtKm(s.cumulativeKm)}</td>
                  <td className="num">{fmtKg(s.loadKg)}</td>
                  <td className="num">{s.machinesOnBoard}</td>
                </tr>
              ))}
              <tr className="edge">
                <td>{route.steps.length + 1}</td>
                <td>{baseLabel}</td>
                <td>Povratak u bazu</td>
                <td>–</td>
                <td className="num">{fmtKm(route.returnKm)}</td>
                <td className="num">{fmtKm(route.totalKm)}</td>
                <td className="num">0</td>
                <td className="num">0</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
