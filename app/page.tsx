"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Side = "yin" | "yang";
type Ball = { x: number; y: number; vx: number; vy: number; r: number; side: Side };

const WIN_SCORE = 5;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const stateRef = useRef({
    width: 0,
    height: 0,
    dpr: 1,
    phase: "aim" as "aim" | "countdown" | "play" | "over",
    paddles: { yin: 0.5, yang: 0.5 },
    aim: { yin: { y: 0.36, armed: false }, yang: { y: 0.64, armed: false } },
    balls: [] as Ball[],
    countdownStart: 0,
    lastTime: 0,
    winner: null as Side | null,
  });
  const [score, setScore] = useState({ yin: 0, yang: 0 });
  const scoreRef = useRef(score);
  const [phase, setPhase] = useState<"aim" | "countdown" | "play" | "over">("aim");
  const [armed, setArmed] = useState({ yin: false, yang: false });
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const tone = useCallback((frequency: number, duration = 0.05, volume = 0.035) => {
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

  const resetRound = useCallback(() => {
    const s = stateRef.current;
    s.phase = "aim";
    s.balls = [];
    s.aim.yin = { y: 0.36, armed: false };
    s.aim.yang = { y: 0.64, armed: false };
    setArmed({ yin: false, yang: false });
    setPhase("aim");
  }, []);

  const resetMatch = useCallback(() => {
    scoreRef.current = { yin: 0, yang: 0 };
    setScore({ yin: 0, yang: 0 });
    stateRef.current.winner = null;
    resetRound();
  }, [resetRound]);

  const scorePoint = useCallback((side: Side) => {
    const next = { ...scoreRef.current, [side]: scoreRef.current[side] + 1 };
    scoreRef.current = next;
    setScore(next);
    tone(side === "yin" ? 260 : 520, 0.2, 0.06);
    if (next[side] >= WIN_SCORE) {
      stateRef.current.phase = "over";
      stateRef.current.winner = side;
      setPhase("over");
    } else {
      window.setTimeout(resetRound, 700);
    }
  }, [resetRound, tone]);

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
      const s = stateRef.current;
      s.width = rect.width;
      s.height = rect.height;
      s.dpr = dpr;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const drawOrb = (x: number, y: number, r: number, side: Side, glow = false) => {
      ctx.save();
      if (glow) {
        ctx.shadowColor = side === "yin" ? "rgba(255,107,69,.75)" : "rgba(255,239,198,.8)";
        ctx.shadowBlur = r * 1.5;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = side === "yin" ? "#ff6846" : "#fff0c9";
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.strokeStyle = side === "yin" ? "#1a1618" : "#f06a4d";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - r * 0.25, y - r * 0.27, r * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = side === "yin" ? "#ffdca9" : "#2a1a22";
      ctx.fill();
      ctx.restore();
    };

    const loop = (time: number) => {
      const s = stateRef.current;
      const dt = Math.min((time - (s.lastTime || time)) / 1000, 0.025);
      s.lastTime = time;
      const { width: w, height: h, dpr } = s;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const padX = Math.max(34, w * 0.055);
      const padH = Math.max(76, Math.min(128, h * 0.24));
      const padW = Math.max(12, Math.min(18, w * 0.02));
      const minY = padH / 2 + 14;
      const maxY = h - minY;
      const yinY = minY + s.paddles.yin * (maxY - minY);
      const yangY = minY + s.paddles.yang * (maxY - minY);

      ctx.save();
      ctx.globalAlpha = 0.1;
      const fieldR = Math.min(w, h) * 0.34;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, fieldR, Math.PI / 2, Math.PI * 1.5); ctx.fillStyle = "#ff6846"; ctx.fill();
      ctx.beginPath(); ctx.arc(w / 2, h / 2, fieldR, -Math.PI / 2, Math.PI / 2); ctx.fillStyle = "#fff0c9"; ctx.fill();
      ctx.beginPath(); ctx.arc(w / 2, h / 2 - fieldR / 2, fieldR / 2, 0, Math.PI * 2); ctx.fillStyle = "#fff0c9"; ctx.fill();
      ctx.beginPath(); ctx.arc(w / 2, h / 2 + fieldR / 2, fieldR / 2, 0, Math.PI * 2); ctx.fillStyle = "#ff6846"; ctx.fill();
      ctx.restore();

      ctx.setLineDash([3, 10]);
      ctx.strokeStyle = "rgba(255,235,199,.22)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w / 2, 18); ctx.lineTo(w / 2, h - 18); ctx.stroke();
      ctx.setLineDash([]);

      const drawPaddle = (x: number, y: number, side: Side) => {
        ctx.save();
        ctx.shadowColor = side === "yin" ? "rgba(255,104,70,.5)" : "rgba(255,240,201,.4)";
        ctx.shadowBlur = 20;
        ctx.fillStyle = side === "yin" ? "#ff6846" : "#fff0c9";
        ctx.beginPath(); ctx.roundRect(x - padW / 2, y - padH / 2, padW, padH, padW); ctx.fill();
        ctx.restore();
      };
      drawPaddle(padX, yinY, "yin");
      drawPaddle(w - padX, yangY, "yang");

      if (s.phase === "aim" || s.phase === "countdown") {
        const r = Math.max(12, Math.min(17, w * 0.018));
        const leftY = minY + s.aim.yin.y * (maxY - minY);
        const rightY = minY + s.aim.yang.y * (maxY - minY);
        drawOrb(padX + 42, leftY, r, "yin", s.aim.yin.armed);
        drawOrb(w - padX - 42, rightY, r, "yang", s.aim.yang.armed);
        ctx.setLineDash([4, 7]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255,235,199,.42)";
        ctx.beginPath(); ctx.moveTo(padX + 62, leftY); ctx.lineTo(w * 0.43, h / 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - padX - 62, rightY); ctx.lineTo(w * 0.57, h / 2); ctx.stroke();
        ctx.setLineDash([]);
      }

      if (s.phase === "countdown") {
        const elapsed = time - s.countdownStart;
        const count = Math.max(1, 3 - Math.floor(elapsed / 480));
        ctx.fillStyle = "#fff0c9";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `600 ${Math.min(90, h * 0.15)}px Georgia, serif`;
        ctx.fillText(String(count), w / 2, h / 2);
        if (elapsed > 1440) {
          const speed = Math.max(300, Math.min(480, w * 0.48));
          const ballR = Math.max(10, Math.min(15, w * 0.016));
          const leftY = minY + s.aim.yin.y * (maxY - minY);
          const rightY = minY + s.aim.yang.y * (maxY - minY);
          s.balls = [
            { x: padX + 46, y: leftY, vx: speed, vy: (h / 2 - leftY) * 0.75, r: ballR, side: "yin" },
            { x: w - padX - 46, y: rightY, vx: -speed, vy: (h / 2 - rightY) * 0.75, r: ballR, side: "yang" },
          ];
          s.phase = "play";
          setPhase("play");
          tone(640, 0.13, 0.05);
        }
      }

      if (s.phase === "play") {
        for (const ball of s.balls) {
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
          if (ball.y - ball.r < 6 && ball.vy < 0) { ball.y = 6 + ball.r; ball.vy *= -1; tone(190); }
          if (ball.y + ball.r > h - 6 && ball.vy > 0) { ball.y = h - 6 - ball.r; ball.vy *= -1; tone(190); }

          const hitPaddle = (px: number, py: number, isLeft: boolean) => {
            const movingToward = isLeft ? ball.vx < 0 : ball.vx > 0;
            const touchingX = isLeft
              ? ball.x - ball.r <= px + padW / 2 && ball.x > px
              : ball.x + ball.r >= px - padW / 2 && ball.x < px;
            if (movingToward && touchingX && Math.abs(ball.y - py) < padH / 2 + ball.r) {
              ball.x = isLeft ? px + padW / 2 + ball.r : px - padW / 2 - ball.r;
              ball.vx = Math.abs(ball.vx) * (isLeft ? 1.035 : -1.035);
              ball.vy += ((ball.y - py) / (padH / 2)) * 170;
              tone(ball.side === "yin" ? 330 : 440, 0.06, 0.045);
            }
          };
          hitPaddle(padX, yinY, true);
          hitPaddle(w - padX, yangY, false);
        }

        if (s.balls.length === 2) {
          const [a, b] = s.balls;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < a.r + b.r) {
            const nx = dx / dist, ny = dy / dist;
            const impulse = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (impulse < 0) {
              a.vx += impulse * nx; a.vy += impulse * ny;
              b.vx -= impulse * nx; b.vy -= impulse * ny;
              tone(760, 0.08, 0.05);
            }
          }
        }

        for (const ball of s.balls) drawOrb(ball.x, ball.y, ball.r, ball.side, true);

        const escapedLeft = s.balls.find((ball) => ball.x < -ball.r * 2);
        const escapedRight = s.balls.find((ball) => ball.x > w + ball.r * 2);
        if (escapedLeft || escapedRight) {
          s.phase = "countdown";
          scorePoint(escapedLeft ? "yang" : "yin");
        }
      }

      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => { observer.disconnect(); cancelAnimationFrame(frameRef.current); };
  }, [scorePoint, tone]);

  const armSide = (side: Side, y: number) => {
    const s = stateRef.current;
    if (s.phase !== "aim") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const normalized = Math.max(0, Math.min(1, (y - rect.top) / rect.height));
    s.aim[side].y = normalized;
    s.aim[side].armed = true;
    const next = { yin: s.aim.yin.armed, yang: s.aim.yang.armed };
    setArmed(next);
    tone(side === "yin" ? 300 : 470, 0.08, 0.04);
    if (next.yin && next.yang) {
      s.phase = "countdown";
      s.countdownStart = performance.now();
      setPhase("countdown");
    }
  };

  const onPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const side: Side = event.clientX - rect.left < rect.width / 2 ? "yin" : "yang";
    const s = stateRef.current;
    if (s.phase === "aim" && event.type === "pointerdown") {
      event.currentTarget.setPointerCapture(event.pointerId);
      armSide(side, event.clientY);
    } else if (s.phase === "play") {
      s.paddles[side] = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const s = stateRef.current;
      const step = 0.07;
      if (event.key.toLowerCase() === "w") s.paddles.yin = Math.max(0, s.paddles.yin - step);
      if (event.key.toLowerCase() === "s") s.paddles.yin = Math.min(1, s.paddles.yin + step);
      if (event.key === "ArrowUp") s.paddles.yang = Math.max(0, s.paddles.yang - step);
      if (event.key === "ArrowDown") s.paddles.yang = Math.min(1, s.paddles.yang + step);
      if (event.key === " " && phase === "aim") {
        s.aim.yin.armed = true; s.aim.yang.armed = true;
        setArmed({ yin: true, yang: true });
        s.phase = "countdown"; s.countdownStart = performance.now(); setPhase("countdown");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const status = phase === "aim"
    ? !armed.yin && !armed.yang ? "Each player taps their side to set an angle"
      : armed.yin && !armed.yang ? "Yang, choose your launch"
      : !armed.yin && armed.yang ? "Yin, choose your launch" : "Ready"
    : phase === "countdown" ? "Both forces release together"
    : phase === "play" ? "Drag your half to guard your gate"
    : `${stateRef.current.winner === "yin" ? "Yin" : "Yang"} holds the balance`;

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">☯</span><span>Yin · Yang</span><em>Ping Pong</em></div>
        <div className="round-label">First to {WIN_SCORE}</div>
        <button className="icon-button" onClick={() => setMuted((v) => !v)} aria-label={muted ? "Turn sound on" : "Mute sound"}>{muted ? "Sound off" : "Sound on"}</button>
      </header>

      <section className="scoreboard" aria-live="polite">
        <div className="player player-yin"><span>Yin</span><strong>{score.yin}</strong></div>
        <div className="status"><span className="status-dot" />{status}</div>
        <div className="player player-yang"><strong>{score.yang}</strong><span>Yang</span></div>
      </section>

      <section className="arena-wrap">
        <div className="corner-label left">01 / HEAT</div>
        <canvas
          ref={canvasRef}
          className="arena"
          aria-label="Two-player Yin Yang Ping Pong game board"
          onPointerDown={onPointer}
          onPointerMove={onPointer}
        />
        <div className="corner-label right">BALANCE / {String(score.yin + score.yang + 1).padStart(2, "0")}</div>
        {phase === "aim" && (
          <div className="launch-overlay" aria-hidden="true">
            <div className={`launch-side yin ${armed.yin ? "armed" : ""}`}><b>{armed.yin ? "Locked" : "Tap to aim"}</b><span>Yin launch</span></div>
            <div className={`launch-side yang ${armed.yang ? "armed" : ""}`}><b>{armed.yang ? "Locked" : "Tap to aim"}</b><span>Yang launch</span></div>
          </div>
        )}
        {phase === "over" && (
          <div className="winner-card">
            <span>Match complete</span>
            <h1>{stateRef.current.winner === "yin" ? "Yin" : "Yang"} wins</h1>
            <button onClick={resetMatch}>Play again</button>
          </div>
        )}
      </section>

      <footer>
        <p><strong>Touch</strong> Two fingers can play at once. <strong>Mouse</strong> arm one side, then the other.</p>
        <p className="keyboard"><strong>Keyboard</strong> W/S · ↑/↓ · Space to quick-launch</p>
        <button onClick={resetMatch} className="reset-button">Reset match</button>
      </footer>
    </main>
  );
}
