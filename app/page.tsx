"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Side = 0 | 1;
type Phase = "setup" | "countdown" | "play" | "pause" | "over";
type Aim = { x: number; y: number; tx: number; ty: number; ready: boolean };
type Ball = { x: number; y: number; vx: number; vy: number; r: number; side: Side };

const COLS = 32;
const ROWS = 20;
const ROUND_SECONDS = 60;
const CAPTURE_WIN = 75;
const BALL_SPEED = 67.5;
const palette = { dark: "#171318", light: "#f5ead5", coral: "#f46642", grid: "#6c625e" };

function freshCells() {
  const cells = new Uint8Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) {
    for (let x = Math.floor(COLS / 2); x < COLS; x++) cells[y * COLS + x] = 1;
  }
  return cells;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const pointersRef = useRef(new Map<number, Side>());
  const audioRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const stateRef = useRef({
    cells: freshCells(),
    phase: "setup" as Phase,
    aims: {
      0: { x: 7.5, y: 10, tx: 4.5, ty: 12, ready: false },
      1: { x: 24.5, y: 10, tx: 27.5, ty: 8, ready: false },
    } as Record<Side, Aim>,
    balls: [] as Ball[],
    width: 0,
    height: 0,
    dpr: 1,
    lastTime: 0,
    countdownStart: 0,
    roundStart: 0,
    pauseStart: 0,
    lastUiUpdate: 0,
    winner: null as Side | null,
  });

  const [phase, setPhase] = useState<Phase>("setup");
  const [ready, setReady] = useState({ dark: false, light: false });
  const [territory, setTerritory] = useState({ dark: 50, light: 50 });
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [winner, setWinner] = useState<Side | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const tone = useCallback((frequency: number, duration = 0.045, volume = 0.026) => {
    if (mutedRef.current) return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = audioRef.current || new AudioCtx();
    audioRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, []);

  const countTerritory = useCallback(() => {
    const light = stateRef.current.cells.reduce((sum, value) => sum + value, 0);
    const lightPercent = Math.round((light / stateRef.current.cells.length) * 100);
    return { dark: 100 - lightPercent, light: lightPercent };
  }, []);

  const finishRound = useCallback((winner: Side | null) => {
    const s = stateRef.current;
    if (s.phase === "over") return;
    const score = countTerritory();
    s.phase = "over";
    s.winner = winner ?? (score.dark === score.light ? null : score.dark > score.light ? 0 : 1);
    setWinner(s.winner);
    setTerritory(score);
    setSeconds(0);
    setPhase("over");
    tone(s.winner === 0 ? 240 : 520, 0.35, 0.055);
  }, [countTerritory, tone]);

  const reset = useCallback(() => {
    const s = stateRef.current;
    s.cells = freshCells();
    s.phase = "setup";
    s.aims[0] = { x: 7.5, y: 10, tx: 4.5, ty: 12, ready: false };
    s.aims[1] = { x: 24.5, y: 10, tx: 27.5, ty: 8, ready: false };
    s.balls = [];
    s.winner = null;
    s.lastTime = 0;
    pointersRef.current.clear();
    setReady({ dark: false, light: false });
    setTerritory({ dark: 50, light: 50 });
    setSeconds(ROUND_SECONDS);
    setWinner(null);
    setPhase("setup");
  }, []);

  const pauseGame = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "play") return;
    s.phase = "pause";
    s.pauseStart = performance.now();
    s.balls.forEach((ball) => {
      const length = Math.hypot(ball.vx, ball.vy) || 1;
      s.aims[ball.side] = {
        x: ball.x,
        y: ball.y,
        tx: ball.x - (ball.vx / length) * 3,
        ty: ball.y - (ball.vy / length) * 3,
        ready: false,
      };
    });
    pointersRef.current.clear();
    setReady({ dark: false, light: false });
    setPhase("pause");
  }, []);

  const resumeGame = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "pause") return;
    s.balls.forEach((ball) => {
      const aim = s.aims[ball.side];
      let dx = aim.x - aim.tx, dy = aim.y - aim.ty;
      const length = Math.hypot(dx, dy) || 1;
      dx /= length; dy /= length;
      ball.x = aim.x; ball.y = aim.y;
      ball.vx = dx * BALL_SPEED; ball.vy = dy * BALL_SPEED;
    });
    s.roundStart += performance.now() - s.pauseStart;
    s.phase = "play";
    pointersRef.current.clear();
    setPhase("play");
    tone(620, .1, .035);
  }, [tone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      stateRef.current.width = rect.width;
      stateRef.current.height = rect.height;
      stateRef.current.dpr = dpr;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const drawBall = (ball: Pick<Ball, "x" | "y" | "r" | "side">, sx: number, sy: number, glow = true) => {
      const x = ball.x * sx, y = ball.y * sy, r = ball.r * Math.min(sx, sy);
      ctx.save();
      if (glow) {
        ctx.shadowColor = ball.side === 0 ? "rgba(244,102,66,.55)" : "rgba(245,234,213,.65)";
        ctx.shadowBlur = r * 1.4;
      }
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = ball.side === 0 ? palette.dark : palette.light; ctx.fill();
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.strokeStyle = ball.side === 0 ? palette.light : palette.dark; ctx.stroke();
      ctx.beginPath(); ctx.arc(x - r * .27, y - r * .28, r * .17, 0, Math.PI * 2);
      ctx.fillStyle = ball.side === 0 ? palette.light : palette.dark; ctx.fill();
      ctx.restore();
    };

    const capture = (cellX: number, cellY: number, side: Side) => {
      if (cellX < 0 || cellX >= COLS || cellY < 0 || cellY >= ROWS) return false;
      const index = cellY * COLS + cellX;
      if (stateRef.current.cells[index] === side) return false;
      stateRef.current.cells[index] = side;
      tone(side === 0 ? 185 : 370, .032, .018);
      return true;
    };

    const collidingEnemyCells = (x: number, y: number, r: number, side: Side) => {
      const hits: Array<[number, number]> = [];
      const minX = Math.max(0, Math.floor(x - r));
      const maxX = Math.min(COLS - 1, Math.floor(x + r));
      const minY = Math.max(0, Math.floor(y - r));
      const maxY = Math.min(ROWS - 1, Math.floor(y + r));
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          if (stateRef.current.cells[cy * COLS + cx] === side) continue;
          const nearestX = Math.max(cx, Math.min(x, cx + 1));
          const nearestY = Math.max(cy, Math.min(y, cy + 1));
          const dx = x - nearestX, dy = y - nearestY;
          if (dx * dx + dy * dy < r * r) hits.push([cx, cy]);
        }
      }
      return hits;
    };

    const stepBall = (ball: Ball, dt: number) => {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(ball.vx), Math.abs(ball.vy)) * dt / .16));
      const step = dt / steps;
      for (let i = 0; i < steps; i++) {
        let nextX = ball.x + ball.vx * step;
        if (nextX - ball.r < 0 || nextX + ball.r > COLS) {
          ball.vx *= -1;
          nextX = Math.max(ball.r, Math.min(COLS - ball.r, nextX));
        } else {
          const hits = collidingEnemyCells(nextX, ball.y, ball.r, ball.side);
          if (hits.length) {
            hits.forEach(([x, y]) => capture(x, y, ball.side));
            ball.vx *= -1;
            nextX = ball.x;
          }
        }
        ball.x = nextX;

        let nextY = ball.y + ball.vy * step;
        if (nextY - ball.r < 0 || nextY + ball.r > ROWS) {
          ball.vy *= -1;
          nextY = Math.max(ball.r, Math.min(ROWS - ball.r, nextY));
        } else {
          const hits = collidingEnemyCells(ball.x, nextY, ball.r, ball.side);
          if (hits.length) {
            hits.forEach(([x, y]) => capture(x, y, ball.side));
            ball.vy *= -1;
            nextY = ball.y;
          }
        }
        ball.y = nextY;
      }
    };

    const launch = () => {
      const s = stateRef.current;
      s.balls = ([0, 1] as Side[]).map((side) => {
        const aim = s.aims[side];
        let dx = aim.x - aim.tx, dy = aim.y - aim.ty;
        const length = Math.hypot(dx, dy) || 1;
        dx /= length; dy /= length;
        return { x: aim.x, y: aim.y, vx: dx * BALL_SPEED, vy: dy * BALL_SPEED, r: .38, side };
      });
      s.phase = "play";
      s.roundStart = performance.now();
      setPhase("play");
      tone(620, .14, .045);
    };

    const loop = (time: number) => {
      const s = stateRef.current;
      const dt = Math.min((time - (s.lastTime || time)) / 1000, .025);
      s.lastTime = time;
      const { width: w, height: h, dpr } = s;
      const sx = w / COLS, sy = h / ROWS;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = palette.grid;
      ctx.fillRect(0, 0, w, h);
      const gap = Math.max(.7, Math.min(1.5, sx * .055));
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          ctx.fillStyle = s.cells[y * COLS + x] === 0 ? palette.dark : palette.light;
          ctx.fillRect(x * sx + gap / 2, y * sy + gap / 2, sx - gap, sy - gap);
        }
      }

      if (s.phase === "setup" || s.phase === "countdown" || s.phase === "pause") {
        ([0, 1] as Side[]).forEach((side) => {
          const aim = s.aims[side];
          const color = side === 0 ? palette.light : palette.dark;
          ctx.save();
          ctx.strokeStyle = color; ctx.fillStyle = color; ctx.globalAlpha = aim.ready ? .95 : .65;
          ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
          ctx.beginPath(); ctx.moveTo(aim.x * sx, aim.y * sy); ctx.lineTo(aim.tx * sx, aim.ty * sy); ctx.stroke();
          ctx.setLineDash([]); ctx.beginPath(); ctx.arc(aim.tx * sx, aim.ty * sy, 4, 0, Math.PI * 2); ctx.fill();
          const launchX = aim.x + (aim.x - aim.tx);
          const launchY = aim.y + (aim.y - aim.ty);
          ctx.globalAlpha = aim.ready ? .95 : .82;
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(aim.x * sx, aim.y * sy); ctx.lineTo(launchX * sx, launchY * sy); ctx.stroke();
          const angle = Math.atan2((launchY - aim.y) * sy, (launchX - aim.x) * sx);
          const ex = launchX * sx, ey = launchY * sy;
          ctx.beginPath();
          ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(angle - .55) * 11, ey - Math.sin(angle - .55) * 11);
          ctx.lineTo(ex - Math.cos(angle + .55) * 11, ey - Math.sin(angle + .55) * 11); ctx.closePath(); ctx.fill();
          ctx.restore();
          if (s.phase !== "pause") drawBall({ x: aim.x, y: aim.y, r: .46, side }, sx, sy, aim.ready);
        });
      }

      if (s.phase === "countdown") {
        const elapsed = time - s.countdownStart;
        const count = Math.max(1, 3 - Math.floor(elapsed / 560));
        ctx.save();
        ctx.fillStyle = palette.coral; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = `600 ${Math.min(96, h * .18)}px Georgia, serif`;
        ctx.shadowColor = "rgba(23,19,24,.25)"; ctx.shadowBlur = 20;
        ctx.fillText(String(count), w / 2, h / 2);
        ctx.restore();
        if (elapsed >= 1680) launch();
      }

      if (s.phase === "play" || s.phase === "pause" || s.phase === "over") {
        if (s.phase === "play") {
          s.balls.forEach((ball) => stepBall(ball, dt));
          if (s.balls.length === 2) {
            const [a, b] = s.balls;
            const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
            if (distance > 0 && distance < a.r + b.r) {
              const nx = dx / distance, ny = dy / distance;
              const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
              if (relative < 0) {
                a.vx += relative * nx; a.vy += relative * ny;
                b.vx -= relative * nx; b.vy -= relative * ny;
                tone(760, .06, .03);
              }
            }
          }
        }
        s.balls.forEach((ball) => drawBall(ball, sx, sy));

        if (s.phase === "play" && (time - s.lastUiUpdate > 80)) {
          s.lastUiUpdate = time;
          const score = countTerritory();
          const remaining = Math.max(0, Math.ceil(ROUND_SECONDS - (time - s.roundStart) / 1000));
          setTerritory(score); setSeconds(remaining);
          if (score.dark >= CAPTURE_WIN) finishRound(0);
          else if (score.light >= CAPTURE_WIN) finishRound(1);
          else if (remaining <= 0) finishRound(null);
        }
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => { observer.disconnect(); cancelAnimationFrame(frameRef.current); };
  }, [countTerritory, finishRound, tone]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(.6, Math.min(COLS - .6, ((event.clientX - rect.left) / rect.width) * COLS)),
      y: Math.max(.6, Math.min(ROWS - .6, ((event.clientY - rect.top) / rect.height) * ROWS)),
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (s.phase !== "setup" && s.phase !== "pause") return;
    const point = pointFromEvent(event);
    let side: Side;
    if (s.phase === "pause") {
      const distances = ([0, 1] as Side[]).map((candidate) => ({
        side: candidate,
        distance: Math.hypot(point.x - s.aims[candidate].x, point.y - s.aims[candidate].y),
      })).sort((a, b) => a.distance - b.distance);
      if (distances[0].distance > 2.2) return;
      side = distances[0].side;
    } else {
      side = point.x < COLS / 2 ? 0 : 1;
    }
    if ((s.phase === "setup" && s.aims[side].ready) || [...pointersRef.current.values()].includes(side)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, side);
    if (s.phase === "setup") {
      const clampedX = side === 0 ? Math.min(point.x, COLS / 2 - 1) : Math.max(point.x, COLS / 2 + 1);
      s.aims[side] = { x: clampedX, y: point.y, tx: side === 0 ? clampedX - 3 : clampedX + 3, ty: point.y, ready: false };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const side = pointersRef.current.get(event.pointerId);
    if (side === undefined || (stateRef.current.phase !== "setup" && stateRef.current.phase !== "pause")) return;
    const point = pointFromEvent(event);
    stateRef.current.aims[side].tx = point.x;
    stateRef.current.aims[side].ty = point.y;
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const side = pointersRef.current.get(event.pointerId);
    if (side === undefined || (stateRef.current.phase !== "setup" && stateRef.current.phase !== "pause")) return;
    pointersRef.current.delete(event.pointerId);
    const aim = stateRef.current.aims[side];
    if (Math.hypot(aim.tx - aim.x, aim.ty - aim.y) < .8) {
      aim.tx = aim.x + (side === 0 ? -3 : 3);
      aim.ty = aim.y;
    }
    aim.ready = true;
    const next = { dark: stateRef.current.aims[0].ready, light: stateRef.current.aims[1].ready };
    setReady(next);
    tone(side === 0 ? 260 : 440, .08, .035);
    if (stateRef.current.phase === "setup" && next.dark && next.light) {
      stateRef.current.phase = "countdown";
      stateRef.current.countdownStart = performance.now();
      setPhase("countdown");
    }
  };

  const status = phase === "setup"
    ? !ready.dark && !ready.light ? "Place a ball, pull back, then release"
      : ready.dark && !ready.light ? "Light, pull back and release"
      : !ready.dark && ready.light ? "Dark, pull back and release" : "Both forces ready"
    : phase === "countdown" ? "Release together"
    : phase === "play" ? "The frontier moves with every strike"
    : phase === "pause" ? "Pull either ball to redirect its path"
    : winner === null ? "Balance holds — a draw"
    : `${winner === 0 ? "Dark" : "Light"} claims the board`;

  return (
    <main className="territory-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">☯</span><span>Yin · Yang</span><em>Territory</em></div>
        <div className="round-label">{ROUND_SECONDS} seconds · {CAPTURE_WIN}% captures instantly</div>
        <div className="top-actions">
          <button className="sound-button" onClick={() => setMuted((value) => !value)}>{muted ? "Sound off" : "Sound on"}</button>
        </div>
      </header>

      <section className="scoreboard" aria-live="polite">
        <div className="force dark-force"><span>Dark</span><strong>{territory.dark}<small>%</small></strong></div>
        <div className="center-status"><span>{String(seconds).padStart(2, "0")}</span><p>{status}</p></div>
        <div className="force light-force"><strong>{territory.light}<small>%</small></strong><span>Light</span></div>
      </section>

      <section className="arena-shell">
        <canvas
          ref={canvasRef}
          className="territory-canvas"
          aria-label="Yin Yang territory board"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {phase === "setup" && (
          <div className="setup-labels" aria-hidden="true">
            <span className={ready.dark ? "is-ready" : ""}>{ready.dark ? "Dark locked" : "Touch · pull · release"}</span>
            <span className={ready.light ? "is-ready" : ""}>{ready.light ? "Light locked" : "Touch · pull · release"}</span>
          </div>
        )}
        {phase === "pause" && <div className="pause-hint">Press a ball · pull back · release · resume</div>}
        {phase === "over" && (
          <div className="result-card">
            <span>Territory settled</span>
            <h1>{winner === null ? "Perfect balance" : `${winner === 0 ? "Dark" : "Light"} prevails`}</h1>
            <p>{territory.dark}% dark · {territory.light}% light</p>
            <button onClick={reset}>Set a new opening</button>
          </div>
        )}
      </section>

      <footer className="instructions">
        <div className="instruction-copy">
          <p><strong>Touch</strong> Both players pull and release at once.</p>
          <p><strong>Mouse</strong> Pull one opening, then the other.</p>
        </div>
        <button
          className={`arena-pause ${phase === "pause" ? "is-paused" : ""}`}
          disabled={phase !== "play" && phase !== "pause"}
          onClick={phase === "play" ? pauseGame : resumeGame}
        >
          <span aria-hidden="true">{phase === "pause" ? "▶" : "Ⅱ"}</span>
          {phase === "pause" ? "Resume" : "Pause"}
        </button>
        <button onClick={reset}>Reset field</button>
      </footer>
    </main>
  );
}
