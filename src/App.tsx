import { useState } from "react";
import { LOCATIONS, MACHINES, ORDERS, SETTINGS, TRUCKS } from "./domain/data";
import { buildDistanceMatrix } from "./domain/distance";
import { solve } from "./solver/solve";
import type { SolveResult } from "./solver/solve";
import { InputData } from "./ui/InputData";
import { Results } from "./ui/Results";
import type { EvaluationContext } from "./validator/types";
import "./App.css";

const ctx: EvaluationContext = {
  orders: ORDERS,
  machines: MACHINES,
  distances: buildDistanceMatrix(LOCATIONS),
  settings: SETTINGS,
};

export default function App() {
  const [result, setResult] = useState<SolveResult | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    try {
      const started = performance.now();
      const solved = solve(ctx, TRUCKS);
      setElapsedMs(Math.round(performance.now() - started));
      setResult(solved);
      setError(null);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="page">
      <header>
        <h1>Optimizacija prijevoza radnih strojeva</h1>
        <p className="muted">
          Raspoređuje transportne naloge na dva kamiona i traži raspored s
          najmanjom ukupnom kilometražom.
        </p>
      </header>

      <InputData
        settings={SETTINGS}
        trucks={TRUCKS}
        locations={LOCATIONS}
        machines={MACHINES}
        orders={ORDERS}
      />

      <div className="actions">
        <button type="button" onClick={run}>
          Izračunaj raspored
        </button>
      </div>

      {error && (
        <div className="warning" role="alert">
          <strong>Greška:</strong> {error}
        </div>
      )}

      {result && (
        <Results
          result={result}
          ctx={ctx}
          trucks={TRUCKS}
          locations={LOCATIONS}
          elapsedMs={elapsedMs}
        />
      )}
    </main>
  );
}
