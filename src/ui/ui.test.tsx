import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LOCATIONS, MACHINES, ORDERS, SETTINGS, TRUCKS } from "../domain/data";
import { buildDistanceMatrix } from "../domain/distance";
import { solve } from "../solver/solve";
import type { EvaluationContext } from "../validator/types";
import { InputData } from "./InputData";
import { Results } from "./Results";

const ctx: EvaluationContext = {
  orders: ORDERS,
  machines: MACHINES,
  distances: buildDistanceMatrix(LOCATIONS),
  settings: SETTINGS,
};

function renderResults(c: EvaluationContext) {
  return renderToStaticMarkup(
    <Results
      result={solve(c, TRUCKS)}
      ctx={c}
      trucks={TRUCKS}
      locations={LOCATIONS}
      elapsedMs={1}
    />,
  );
}

describe("sučelje", () => {
  it("prikazuje sve ulazne podatke", () => {
    const html = renderToStaticMarkup(
      <InputData
        settings={SETTINGS}
        trucks={TRUCKS}
        locations={LOCATIONS}
        machines={MACHINES}
        orders={ORDERS}
      />,
    );
    for (const o of ORDERS) expect(html).toContain(o.id);
    for (const m of MACHINES) expect(html).toContain(m.id);
    for (const l of LOCATIONS) expect(html).toContain(l.id);
  });

  it("prikazuje rutu svakog kamiona i nema upozorenja kad su svi nalozi izvršeni", () => {
    const html = renderResults(ctx);
    expect(html).toContain("Kamion A");
    expect(html).toContain("Kamion B");
    expect(html).toContain("Povratak u bazu");
    expect(html).toContain("10 / 10");
    expect(html).not.toContain("Upozorenje");
  });

  it("jasno upozorava na nalog koji nije moguće izvršiti", () => {
    const machines = MACHINES.map((m) =>
      m.id === "M10" ? { ...m, weightKg: 12000 } : m,
    );
    const html = renderResults({ ...ctx, machines });
    expect(html).toContain("Upozorenje");
    expect(html).toContain("N10");
    expect(html).toContain("9 / 10");
  });
});
