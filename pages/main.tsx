import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./hub.css";

function GameHub() {
  return (
    <main className="hub">
      <header className="hub-header">
        <a className="hub-brand" href="/games/" aria-label="Pocket Arcade home">
          <span className="hub-mark" aria-hidden="true"><i /><i /></span>
          <span>Pocket Arcade</span>
        </a>
        <span className="edition">Two games · one screen</span>
      </header>

      <section className="hero">
        <p>Small games for shared moments</p>
        <h1>Pick a game.<br /><em>Pass it around.</em></h1>
      </section>

      <section className="game-grid" aria-label="Games">
        <a className="game-card yin-yang" href="/games/yin-yang/">
          <div className="card-art yin-art" aria-hidden="true">
            <span className="orbit orbit-one" /><span className="orbit orbit-two" />
            <span className="ball coral" /><span className="ball cream" />
          </div>
          <div className="card-copy">
            <span className="number">01 · Two players</span>
            <h2>Yin · Yang</h2>
            <p>Choose both opening moves, then watch two balls redraw the territory one brick at a time.</p>
            <strong>Play now <span>↗</span></strong>
          </div>
        </a>

        <a className="game-card one-short" href="/games/tiling-puzzle/">
          <div className="card-art tile-art" aria-hidden="true">
            <span /><span /><span /><span /><span /><span /><span /><span /><span />
          </div>
          <div className="card-copy">
            <span className="number">02 · One player</span>
            <h2>One Short</h2>
            <p>Fit L-triominoes around today’s date, with no hints and one piece short.</p>
            <strong>Solve today <span>↗</span></strong>
          </div>
        </a>
      </section>

      <footer><span>liuyao12 / games</span><span>Built for touch, mouse & keyboard</span></footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><GameHub /></StrictMode>);
