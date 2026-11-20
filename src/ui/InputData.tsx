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
    <section aria-labelledby="ulazni-podaci">
      <h2 id="ulazni-podaci">Ulazni podaci</h2>
      <p className="muted">
        Baza je {settings.baseId}. Brzina {settings.speedKmh} km/h, utovar ili
        istovar {settings.serviceMinutes} min, radni dan{" "}
        {settings.maxDriveHoursPerDay} h. Udaljenosti su euklidske, zaokružene
        na 0,1 km po dionici. Oba kamiona polaze iz baze i vraćaju se u nju.
      </p>

      <div className="grid">
        <div>
          <h3>Vozni park</h3>
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

          <h3>Lokacije</h3>
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
                  <td>{l.id === l.name ? l.id : `${l.id} (${l.name})`}</td>
                  <td className="num">{l.x}</td>
                  <td className="num">{l.y}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3>Strojevi</h3>
          <table>
            <thead>
              <tr>
                <th>Oznaka</th>
                <th className="num">Težina (kg)</th>
                <th>Sam stane na kamion</th>
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

        <div>
          <h3>Transportni nalozi</h3>
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
                    {o.machineId} ({fmtKg(weightOf.get(o.machineId) ?? 0)} kg)
                  </td>
                  <td>{o.pickup}</td>
                  <td>{o.delivery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
