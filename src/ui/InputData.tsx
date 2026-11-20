import type {
  Location,
  Machine,
  Order,
  Settings,
  Truck,
} from "../domain/types";
import { fmtKg } from "./format";

interface Props {
  settings: Settings;
  trucks: Truck[];
  locations: Location[];
  machines: Machine[];
  orders: Order[];
}

export function InputData({
  settings,
  trucks,
  locations,
  machines,
  orders,
}: Props) {
  const weightOf = new Map(machines.map((m) => [m.id, m.weightKg]));

  // Koji kamioni mogu prevesti stroj sam (bez ostalih strojeva)?
  const fitsOn = (weightKg: number) => {
    const ids = trucks
      .filter((t) => weightKg <= t.capacityKg && t.maxMachines >= 1)
      .map((t) => t.id);
    return ids.length > 0 ? ids.join(", ") : "nijedan";
  };

  return (
    <details className="panel">
      <summary>
        <span className="summary-head">
          <h2 className="section-title">Ulazni podaci</h2>
          <span className="summary-meta">
            {trucks.length} kamiona · {machines.length} strojeva ·{" "}
            {locations.length} lokacija · {orders.length} naloga
          </span>
        </span>
        <span className="summary-toggle">prikaži / sakrij</span>
      </summary>

      <div className="panel-body">
        <p className="muted">
          Baza je {settings.baseId}. Brzina {settings.speedKmh} km/h, utovar ili
          istovar {settings.serviceMinutes} min, radni dan{" "}
          {settings.maxDriveHoursPerDay} h. Udaljenosti su euklidske, zaokružene
          na 0,1 km po dionici. Oba kamiona polaze iz baze i vraćaju se u nju.
        </p>

        <div className="grid-3">
          <div className="stack">
            <section className="card">
              <h3 className="card-title">Vozni park</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Vozilo</th>
                      <th className="num">Nosivost (kg)</th>
                      <th className="num">Max. strojeva</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trucks.map((t) => (
                      <tr key={t.id}>
                        <td>{t.name}</td>
                        <td className="num">{fmtKg(t.capacityKg)}</td>
                        <td className="num">{t.maxMachines}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h3 className="card-title">Lokacije</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Oznaka</th>
                      <th className="num">X (km)</th>
                      <th className="num">Y (km)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((l) => (
                      <tr key={l.id}>
                        <td>
                          {l.id === l.name ? l.id : `${l.id} (${l.name})`}
                        </td>
                        <td className="num">{l.x}</td>
                        <td className="num">{l.y}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="card">
            <h3 className="card-title">Strojevi</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Oznaka</th>
                    <th className="num">Težina (kg)</th>
                    <th>Stane sam na</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((m) => (
                    <tr key={m.id}>
                      <td>{m.id}</td>
                      <td className="num">{fmtKg(m.weightKg)}</td>
                      <td>{fitsOn(m.weightKg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h3 className="card-title">Transportni nalozi</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nalog</th>
                    <th>Stroj</th>
                    <th>Preuzimanje</th>
                    <th>Isporuka</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.id}</td>
                      <td>
                        {o.machineId} ({fmtKg(weightOf.get(o.machineId) ?? 0)}{" "}
                        kg)
                      </td>
                      <td>{o.pickup}</td>
                      <td>{o.delivery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </details>
  );
}
