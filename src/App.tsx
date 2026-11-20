import { useEffect, useRef, useState } from "react";
import { LOCATIONS, MACHINES, ORDERS, SETTINGS, TRUCKS } from "./domain/data";
import { buildDistanceMatrix } from "./domain/distance";
import { solve } from "./solver/solve";
import type { SolveResult } from "./solver/solve";
import { InputData } from "./ui/InputData";
import { Results } from "./ui/Results";
import type { EvaluationContext } from "./validator/types";

const ctx: EvaluationContext = {
  orders: ORDERS,
  machines: MACHINES,
  distances: buildDistanceMatrix(LOCATIONS),
  settings: SETTINGS,
};

type Theme = "dark" | "light";
const THEME_KEY = "uprent-theme";

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark"; // npr. privatni način rada bez pristupa pohrani
  }
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // pohrana nije dostupna, tema vrijedi samo za ovu sesiju
    }
  }, [theme]);

  // Nakon izračuna odmah prikaži rezultat
  useEffect(() => {
    if (result)
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }, [result]);

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

  function clear() {
    setResult(null);
    setError(null);
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div>
            <h1>Optimizacija prijevoza radnih strojeva</h1>
            <p className="subtitle">
              {TRUCKS.length} kamiona · {ORDERS.length} naloga · cilj: najmanja
              ukupna kilometraža
            </p>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "☀ Svijetla tema" : "☾ Tamna tema"}
            </button>
            {(result || error) && (
              <button type="button" className="btn" onClick={clear}>
                Očisti rezultat
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={run}
            >
              ▶ Izračunaj raspored
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        <InputData
          settings={SETTINGS}
          trucks={TRUCKS}
          locations={LOCATIONS}
          machines={MACHINES}
          orders={ORDERS}
        />

        {error && (
          <div className="warning" role="alert">
            <strong>Greška:</strong> {error}
          </div>
        )}

        {result ? (
          <div ref={resultsRef} className="results-anchor">
            <Results
              result={result}
              ctx={ctx}
              trucks={TRUCKS}
              locations={LOCATIONS}
              elapsedMs={elapsedMs}
            />
          </div>
        ) : (
          !error && (
            <p className="hint">
              Pritisni „Izračunaj raspored” za prikaz rezultata.
            </p>
          )
        )}
      </main>
    </>
  );
}
