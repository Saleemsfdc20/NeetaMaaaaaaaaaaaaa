import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useInView, useScroll } from "framer-motion";

/* ==========================================================================
   ✦ PERSONALISE HERE ✦
   Neeta maa's photo and Manali's voice note are embedded right in this folder!
   Quote timings are synchronized to Manali's exact spoken words in the audio.
   ========================================================================== */
const CONFIG = {
  photo: "neeta.jpg",
  audio: "voice-note.mp3",
  fallbackAudio: "voice-note.ogg",
  quotes: [
    { text: "Two strangers sitting beside each other on a bus... who turned into family and my maa ♥", at: 10 },
    { text: "From strangers to so deeply connected — forever grateful for the bond we found in each other.", at: 27 },
    { text: "Look back at everything you survived, everything that tried to break you, but you kept going.", at: 44 },
    { text: "May this chapter bring you healing, happiness, and all the love your heart deserved. I love you.", at: 120 },
  ],
  blessing:
    "Neeta maa, on your birthday I wish you all the love you have so selflessly given to everyone else... " +
    "all the happiness your heart has waited so patiently for... all the peace your soul deserves after every storm... " +
    "and all the respect you have earned by surviving everything that tried to break you. " +
    "May this year close the chapter of pain and open the most beautiful chapter of your life — healed, held, and endlessly loved.",
};

/* ---------------------------------- utils ---------------------------------- */
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const GOLDS = ["255,214,140", "255,190,95", "255,236,190", "240,180,80"];
const ROSES = ["255,182,193", "255,143,171", "255,205,215", "232,99,138"];
const fmt = (s) => {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r < 10 ? "0" : ""}${r}`;
};
const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function heartPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 0.05, s * 0.3, -s * 0.5, s * 0.05, -s * 0.5, -s * 0.2);
  ctx.bezierCurveTo(-s * 0.5, -s * 0.45, -s * 0.2, -s * 0.55, 0, -s * 0.3);
  ctx.bezierCurveTo(s * 0.2, -s * 0.55, s * 0.5, -s * 0.45, s * 0.5, -s * 0.2);
  ctx.bezierCurveTo(s * 0.5, s * 0.05, s * 0.05, s * 0.3, 0, s * 0.35);
  ctx.closePath();
}

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    let timer;
    const on = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setW(window.innerWidth), 80);
    };
    window.addEventListener("resize", on, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", on);
    };
  }, []);
  return w;
}

/* ========================================================================
   FX ENGINE — golden dust bursts + ethereal rising hearts (smart idle loop)
   ======================================================================== */
const FX = {
  p: [],
  onSpawn: null,
  burst(x, y, isMobile = false) {
    const dustCount = reduceMotion ? 20 : isMobile ? 32 : 90;
    for (let i = 0; i < dustCount; i++) {
      const a = rand(0, Math.PI * 2),
        sp = Math.pow(Math.random(), 0.6) * rand(1.8, isMobile ? 6 : 8.5);
      this.p.push({
        t: "dust",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.8,
        r: rand(0.5, isMobile ? 1.8 : 2.2),
        c: Math.random() < 0.8 ? pick(GOLDS) : pick(ROSES),
        age: 0,
        life: rand(60, 130),
        ph: rand(0, 6.28),
      });
    }
    const heartCount = reduceMotion ? 4 : isMobile ? 7 : 18;
    for (let i = 0; i < heartCount; i++) {
      const a = rand(-Math.PI, 0),
        sp = rand(1, isMobile ? 3.2 : 4.2);
      this.p.push({
        t: "heart",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        s: rand(8, isMobile ? 18 : 22),
        c: Math.random() < 0.65 ? pick(ROSES) : pick(GOLDS),
        age: 0,
        life: rand(180, 300),
        ph: rand(0, 6.28),
        rot: rand(-0.25, 0.25),
      });
    }
    this.p.push({ t: "ring", x, y, r: 8, age: 0, life: 50 });
    if (this.onSpawn) this.onSpawn();
  },
  rise(n = 3) {
    const W = window.innerWidth,
      H = window.innerHeight;
    for (let i = 0; i < n; i++) {
      this.p.push({
        t: "heart",
        x: rand(0, W),
        y: H + 25,
        vx: rand(-0.25, 0.25),
        vy: rand(-1.3, -0.6),
        s: rand(8, 18),
        c: Math.random() < 0.7 ? pick(ROSES) : pick(GOLDS),
        age: 0,
        life: rand(300, 480),
        ph: rand(0, 6.28),
        rot: rand(-0.25, 0.25),
      });
    }
    if (this.onSpawn) this.onSpawn();
  },
  pop(x, y, big = false) {
    const dustCount = big ? 45 : 12;
    for (let i = 0; i < dustCount; i++) {
      const a = rand(0, 6.28),
        sp = rand(0.7, big ? 5 : 2.8);
      this.p.push({
        t: "dust",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.5,
        r: rand(0.5, 1.8),
        c: pick(GOLDS),
        age: 0,
        life: rand(45, 90),
        ph: rand(0, 6.28),
      });
    }
    const heartCount = big ? 14 : 3;
    for (let i = 0; i < heartCount; i++) {
      this.p.push({
        t: "heart",
        x,
        y,
        vx: rand(-1.8, 1.8),
        vy: rand(-3.0, -1),
        s: rand(8, big ? 20 : 14),
        c: pick(ROSES),
        age: 0,
        life: rand(140, 240),
        ph: rand(0, 6.28),
        rot: rand(-0.25, 0.25),
      });
    }
    if (this.onSpawn) this.onSpawn();
  },
};

function FXCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d", { alpha: true });
    let raf = null;
    let running = false;
    const isMobile = window.innerWidth < 768;
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const step = () => {
      const P = FX.p;
      if (P.length === 0) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        running = false;
        raf = null;
        return;
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = "lighter";

      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.age++;
        if (p.age > p.life) {
          P.splice(i, 1);
          continue;
        }
        if (p.age < 0) continue;
        const k = p.age / p.life;

        if (p.t === "dust") {
          p.vx *= 0.972;
          p.vy = p.vy * 0.972 + 0.025;
          p.x += p.vx;
          p.y += p.vy;
          const a = (1 - k) * (0.55 + 0.45 * Math.sin(p.age * 0.35 + p.ph));
          ctx.fillStyle = `rgba(${p.c},${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.283);
          ctx.fill();
        } else if (p.t === "heart") {
          p.vx *= 0.985;
          p.vy = Math.max(p.vy * 0.99 - 0.012, -1.6);
          p.x += p.vx + Math.sin(p.age * 0.03 + p.ph) * 0.4;
          p.y += p.vy;
          const fadeIn = Math.min(1, p.age / 18);
          const a = fadeIn * (k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot + Math.sin(p.age * 0.02 + p.ph) * 0.18);
          ctx.fillStyle = `rgba(${p.c},${a * 0.72})`;
          heartPath(ctx, p.s);
          ctx.fill();
          ctx.restore();
        } else if (p.t === "ring") {
          p.r += (Math.max(window.innerWidth, window.innerHeight) * 0.85 - p.r) * 0.045;
          ctx.strokeStyle = `rgba(255,220,160,${(1 - k) * 0.5})`;
          ctx.lineWidth = 2 * (1 - k) + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.283);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(step);
    };

    FX.onSpawn = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(step);
      }
    };

    return () => {
      FX.onSpawn = null;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-50 h-full w-full" />;
}

/* ========================================================================
   AMBIENT SKY — soft sparkling starlight & gentle ascending embers
   ======================================================================== */
function AmbientSky() {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d", { alpha: false });
    let raf, w, h;
    let stars = [], embers = [], shoots = [];
    const isMobile = window.innerWidth < 768;
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

    const ember = (init) => ({
      x: rand(0, w),
      y: init ? rand(0, h) : h + 10,
      r: rand(0.6, isMobile ? 1.6 : 2.0),
      vy: rand(0.12, 0.45),
      ph: rand(0, 6.28),
      sw: rand(0.3, 1),
      c: Math.random() < 0.55 ? pick(GOLDS) : pick(ROSES),
      a: rand(0.25, 0.75),
    });

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const numStars = isMobile ? 32 : Math.round((w * h) / 7500);
      const numEmbers = isMobile ? 14 : Math.round(Math.min(75, (w * h) / 14000));
      stars = Array.from({ length: numStars }, () => ({
        x: rand(0, w),
        y: rand(0, h),
        r: rand(0.25, 1.1),
        p: rand(0, 6.28),
        s: rand(0.4, 1.4),
      }));
      embers = Array.from({ length: numEmbers }, () => ember(true));
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    let lastT = 0;
    const loop = (t = 0) => {
      // Throttle slightly on mobile if needed, but smooth 60fps
      ctx.fillStyle = "#03050d";
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        const a = 0.15 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.001 * s.s + s.p));
        ctx.fillStyle = `rgba(220,228,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.y -= e.vy;
        e.x += Math.sin(t * 0.0006 * e.sw + e.ph) * 0.32;
        if (e.y < -10) embers[i] = ember(false);
        const fl = e.a * (0.6 + 0.4 * Math.sin(t * 0.004 + e.ph)) * Math.min(1, e.y / (h * 0.25));
        ctx.fillStyle = `rgba(${e.c},${fl * 0.75})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, 6.283);
        ctx.fill();
      }

      if (!isMobile && Math.random() < 0.004) {
        shoots.push({
          x: rand(-0.1 * w, w * 0.8),
          y: rand(-20, h * 0.35),
          vx: rand(6, 9.5),
          vy: rand(2.5, 4.2),
          life: rand(50, 75),
          age: 0,
        });
      }

      for (let i = shoots.length - 1; i >= 0; i--) {
        const s = shoots[i];
        s.age++;
        s.x += s.vx;
        s.y += s.vy;
        if (s.age > s.life) {
          shoots.splice(i, 1);
          continue;
        }
        const a = Math.sin((s.age / s.life) * Math.PI);
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 12, s.y - s.vy * 12);
        g.addColorStop(0, `rgba(255,240,210,${a})`);
        g.addColorStop(1, "rgba(255,240,210,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 12, s.y - s.vy * 12);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,#142048_0%,#0b1330_35%,#060a1a_65%,#03050d_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_85%_110%,rgba(232,99,138,0.14),transparent_45%),radial-gradient(circle_at_10%_60%,rgba(212,154,58,0.09),transparent_40%)]" />
      <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
    </>
  );
}

/* Soft glowing spotlight that follows the cursor (desktop only) */
function CursorGlow() {
  const x = useSpring(-500, { stiffness: 80, damping: 20 });
  const y = useSpring(-500, { stiffness: 80, damping: 20 });
  useEffect(() => {
    if (window.innerWidth < 768) return;
    const on = (e) => {
      x.set(e.clientX - 250);
      y.set(e.clientY - 250);
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, [x, y]);

  return (
    <motion.div
      style={{ x, y }}
      className="pointer-events-none fixed left-0 top-0 z-[1] hidden h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,182,193,0.08),transparent_65%)] md:block"
    />
  );
}

/* ========================================================================
   1. MAGIC UNVEILING — silky smooth opening transition
   ======================================================================== */
function HeartIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function Intro({ onOpen }) {
  return (
    <motion.div
      key="intro"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label="Open your surprise"
      className="fixed inset-0 z-40 flex cursor-pointer select-none flex-col items-center justify-center bg-[#03050d] px-6 text-center will-change-[opacity]"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.05,
        transition: { duration: 0.75, ease: [0.33, 1, 0.68, 1] },
      }}
    >
      {/* Gentle ambient halo */}
      <motion.div
        className="pointer-events-none absolute h-[65vmin] w-[65vmin] rounded-full bg-[radial-gradient(circle,rgba(255,143,171,0.18),transparent_65%)]"
        animate={{ scale: [1, 1.1, 1, 1.06, 1], opacity: [0.6, 0.9, 0.6, 0.85, 0.6] }}
        transition={{ duration: 1.6, repeat: Infinity, times: [0, 0.14, 0.3, 0.44, 1] }}
      />

      <div className="relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: [1, 1.16, 1, 1.1, 1] }}
          transition={{
            opacity: { duration: 0.8 },
            scale: { duration: 1.6, repeat: Infinity, times: [0, 0.14, 0.3, 0.44, 1], ease: "easeInOut" },
          }}
          className="text-rose-400 drop-shadow-[0_0_25px_rgba(255,143,171,0.85)]"
        >
          <HeartIcon className="h-20 w-20 sm:h-24 sm:w-24" />
        </motion.div>
      </div>

      {/* ECG Line */}
      <svg viewBox="0 0 400 60" className="mt-6 w-[min(380px,85vw)] overflow-visible">
        <motion.path
          d="M0 30 H150 L162 30 L170 12 L180 50 L190 4 L200 44 L208 30 H400"
          fill="none"
          stroke="url(#ecg)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          style={{ filter: "drop-shadow(0 0 6px rgba(255,143,171,.8))" }}
        />
        <defs>
          <linearGradient id="ecg" x1="0" x2="1">
            <stop offset="0" stopColor="#ff8fab" stopOpacity="0" />
            <stop offset=".5" stopColor="#ffb6c1" />
            <stop offset="1" stopColor="#f5d48c" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="mt-6 max-w-md font-serif text-lg italic leading-relaxed text-rose-100/85 sm:text-2xl"
      >
        For the woman who turned from a stranger on a bus into my family...
        <span className="mt-2 block not-italic font-sans text-xs tracking-wider text-gold-300/90 sm:text-sm">
          tap anywhere to open your surprise ♥
        </span>
      </motion.p>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.2, 0.7, 0.2] }}
        transition={{ delay: 1.2, duration: 2.4, repeat: Infinity }}
        className="absolute bottom-8 text-[10px] uppercase tracking-[0.45em] text-white/45"
      >
        touch anywhere
      </motion.span>
    </motion.div>
  );
}

/* ========================================================================
   HERO — "Happy Birthday, Meri Maa." (Mobile Optimized 60fps)
   ======================================================================== */
function Hero({ opened }) {
  const vw = useWindowWidth();
  const isMobile = vw < 768;

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* Background radial gold glow */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={opened ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="pointer-events-none absolute h-[85vmin] w-[85vmin] rounded-full bg-[radial-gradient(circle,rgba(245,212,140,0.14)_0%,rgba(255,143,171,0.07)_40%,transparent_70%)]"
      />

      <div className="relative z-10 max-w-4xl">
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={opened ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.25, duration: 0.8 }}
          className="mb-4 text-[10px] uppercase tracking-[0.4em] text-gold-300/80 sm:mb-6 sm:text-xs"
        >
          A heartfelt surprise from Manali
        </motion.p>

        <h1 className="font-serif font-light leading-[1.0] text-rose-50">
          <motion.span
            initial={{ opacity: 0, y: 24 }}
            animate={opened ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="block text-[clamp(2.5rem,9.5vw,7.5rem)] drop-shadow-[0_0_25px_rgba(255,182,193,0.2)]"
          >
            Happy Birthday,
          </motion.span>

          <motion.span
            initial={{ opacity: 0, y: 28 }}
            animate={opened ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.65, duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
            className="mt-1 block text-[clamp(3.4rem,14vw,10.5rem)] font-medium italic"
          >
            <span className="gold-text drop-shadow-[0_0_35px_rgba(245,212,140,0.3)]">
              Meri Maa.
            </span>
          </motion.span>
        </h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={opened ? { scaleX: 1 } : {}}
          transition={{ delay: 1.0, duration: 0.9, ease: "easeInOut" }}
          className="mx-auto mt-6 h-px w-44 bg-gradient-to-r from-transparent via-gold-300 to-transparent sm:mt-8 sm:w-64"
        />

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={opened ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.2, duration: 0.9 }}
          className="mx-auto mt-5 max-w-lg font-serif text-base italic leading-relaxed text-rose-100/80 sm:text-xl md:text-2xl"
        >
          Neeta maa — my chosen family, my healing, my home.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={opened ? { opacity: 1 } : {}}
        transition={{ delay: 1.6 }}
        className="absolute bottom-6 flex flex-col items-center gap-1.5 text-white/45 sm:bottom-8"
      >
        <span className="text-[9px] uppercase tracking-[0.4em] sm:text-[10px]">scroll gently</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-8 w-px bg-gradient-to-b from-gold-300 to-transparent sm:h-10"
        />
      </motion.div>
    </section>
  );
}

/* Shared section heading */
function SectionTitle({ eyebrow, title, sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="mb-10 text-center sm:mb-16 md:mb-20"
    >
      <p className="mb-3 text-[10px] uppercase tracking-[0.45em] text-gold-300/80 sm:text-xs">
        {eyebrow}
      </p>
      <h2 className="font-serif text-3xl font-light text-rose-50 sm:text-5xl md:text-6xl">{title}</h2>
      {sub && (
        <p className="mx-auto mt-3 max-w-xl font-serif text-base italic text-white/60 sm:mt-5 sm:text-xl">
          {sub}
        </p>
      )}
      <div className="mx-auto mt-4 flex items-center justify-center gap-3 text-gold-300/70 sm:mt-6">
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold-300/70" />
        <HeartIcon className="h-3 w-3 text-rose-300" />
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold-300/70" />
      </div>
    </motion.div>
  );
}

/* ========================================================================
   2. INTERACTIVE MEMORY GALLERY
   ======================================================================== */
function TiltCard({ children, className = "", max = 12 }) {
  const ref = useRef(null);
  const [isTouch, setIsTouch] = useState(false);
  const mx = useMotionValue(0.5),
    my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 140, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 140, damping: 18 });
  const glare = useTransform(
    [mx, my],
    ([x, y]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,245,225,0.18), transparent 55%)`
  );

  useEffect(() => {
    setIsTouch(window.innerWidth < 768 || "ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const move = (e) => {
    if (isTouch || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };

  const leave = () => {
    if (!isTouch) {
      mx.set(0.5);
      my.set(0.5);
    }
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      style={
        isTouch
          ? { boxShadow: "0 10px 30px -8px rgba(0,0,0,0.7)" }
          : {
              rotateX: rx,
              rotateY: ry,
              transformPerspective: 1100,
              transformStyle: "preserve-3d",
              boxShadow: "0 25px 50px -15px rgba(0,0,0,0.8)",
            }
      }
      whileHover={
        isTouch
          ? {}
          : {
              scale: 1.02,
              boxShadow:
                "0 0 20px rgba(255,182,193,0.4), 0 0 50px rgba(255,182,193,0.18), 0 25px 50px -15px rgba(0,0,0,0.8)",
            }
      }
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`relative ${className}`}
    >
      {children}
      {!isTouch && (
        <motion.div
          style={{ background: glare }}
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-screen"
        />
      )}
    </motion.div>
  );
}

function PhotoSlot() {
  const [src, setSrc] = useState(CONFIG.photo);
  const [failed, setFailed] = useState(false);
  const input = useRef(null);

  const choose = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setSrc(URL.createObjectURL(f));
      setFailed(false);
    }
  };

  const handleImgError = () => {
    if (src === "neeta.jpg") setSrc("./neeta.jpg");
    else if (src === "./neeta.jpg") setSrc("/neeta.jpg");
    else if (src === "/neeta.jpg") setSrc("public/neeta.jpg");
    else setFailed(true);
  };

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[inherit] bg-midnight-950">
      {!failed ? (
        <motion.img
          src={src}
          alt="Neeta maa smiling beside her birthday cake"
          onError={handleImgError}
          initial={{ scale: 1.08 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          style={{ objectPosition: "center 22%" }}
          className="h-full w-full object-cover"
        />
      ) : (
        <button
          onClick={() => input.current?.click()}
          className="group flex h-full w-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_40%,rgba(245,212,140,0.12),rgba(11,19,48,0.9)_70%)] p-6 text-center"
        >
          <div className="absolute inset-4 rounded-2xl border border-dashed border-gold-300/35 transition group-hover:border-rose-300/70" />
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2.0, repeat: Infinity }}
            className="text-rose-300 drop-shadow-[0_0_18px_rgba(255,143,171,0.8)]"
          >
            <HeartIcon className="h-10 w-10 sm:h-12 sm:w-12" />
          </motion.div>
          <p className="font-serif text-xl italic text-rose-50 sm:text-2xl">Neeta maa's photo</p>
          <p className="max-w-[15rem] text-xs leading-relaxed text-white/55">
            Tap to choose her photo, or save it as <span className="text-gold-300">neeta.jpg</span>.
          </p>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={choose} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight-950/70 via-transparent to-transparent" />
    </div>
  );
}

const CHAPTERS = [
  { n: "I", title: "A Seat Beside You", text: "Two strangers, one bus ride, and a conversation that quietly changed the course of my life." },
  { n: "II", title: "Strangers to Family", text: "Somewhere between the stops, you stopped being someone I met and became someone I needed." },
  { n: "III", title: "Through Every Storm", text: "I watched you survive what tried to break you — and still choose softness, still choose love." },
  { n: "IV", title: "My Chosen Maa", text: "Not by blood, but by every moment you held my heart as if it were your own." },
  { n: "V", title: "New Chapters", text: "Here's to healing, to peace, and to the beautiful life that is still waiting for you." },
];

function Coverflow() {
  const vw = useWindowWidth();
  const isMobile = vw < 640;
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const cardW = Math.min(320, vw * 0.78);
  const gap = cardW * (isMobile ? 0.48 : 0.65);
  const go = useCallback((d) => setActive((a) => (a + d + CHAPTERS.length) % CHAPTERS.length), []);

  useEffect(() => {
    if (hover) return;
    const id = setInterval(() => go(1), 5400);
    return () => clearInterval(id);
  }, [hover, go]);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only swipe if horizontal move was clearly greater than vertical scroll
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 35) {
      if (dx < 0) go(1);
      else go(-1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative select-none"
    >
      <div className="relative mx-auto h-[370px] sm:h-[400px] [perspective:1200px]">
        {CHAPTERS.map((c, i) => {
          let off = i - active;
          if (off > CHAPTERS.length / 2) off -= CHAPTERS.length;
          if (off < -CHAPTERS.length / 2) off += CHAPTERS.length;
          const abs = Math.abs(off);

          return (
            <motion.div
              key={i}
              onClick={() => setActive(i)}
              animate={{
                x: off * gap,
                rotateY: isMobile ? off * -25 : off * -35,
                scale: 1 - abs * 0.12,
                opacity: abs > 2 ? 0 : 1 - abs * 0.28,
                z: -abs * 100,
              }}
              transition={{ type: "spring", stiffness: 100, damping: 18 }}
              style={{
                width: cardW,
                marginLeft: -cardW / 2,
                zIndex: 10 - abs,
                transformStyle: "preserve-3d",
              }}
              className="absolute left-1/2 top-0 cursor-pointer"
            >
              <TiltCard max={abs === 0 && !isMobile ? 8 : 0} className="rounded-3xl">
                <div className="relative h-[350px] sm:h-[380px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1330] md:bg-[linear-gradient(160deg,rgba(20,32,72,0.9),rgba(6,10,26,0.95))] p-6 sm:p-8 md:backdrop-blur-xl">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,143,171,0.22),transparent_70%)]" />
                  <div className="pointer-events-none absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(245,212,140,0.15),transparent_70%)]" />

                  <span className="gold-text relative font-serif text-6xl sm:text-7xl font-light italic">
                    {c.n}
                  </span>
                  <h3 className="relative mt-6 sm:mt-8 font-serif text-2xl sm:text-3xl text-rose-50">
                    {c.title}
                  </h3>
                  <div className="relative my-4 sm:my-5 h-px w-14 bg-gradient-to-r from-gold-300 to-transparent" />
                  <p className="relative font-serif text-base sm:text-lg italic leading-relaxed text-white/70">
                    {c.text}
                  </p>
                  <HeartIcon className="absolute bottom-6 right-6 h-4 w-4 sm:h-5 sm:w-5 text-rose-300/60" />
                </div>
              </TiltCard>
            </motion.div>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="mt-6 sm:mt-8 flex items-center justify-center gap-5 sm:gap-6">
        <button
          onClick={() => go(-1)}
          aria-label="Previous Chapter"
          className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full border border-white/20 text-gold-200 transition active:scale-95 hover:border-rose-300/70 hover:shadow-[0_0_15px_rgba(255,182,193,0.4)]"
        >
          ‹
        </button>

        <div className="flex gap-2">
          {CHAPTERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Go to chapter ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-400 ${
                i === active
                  ? "w-7 sm:w-8 bg-gold-300 shadow-[0_0_8px_#f5d48c]"
                  : "w-1.5 bg-white/25"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => go(1)}
          aria-label="Next Chapter"
          className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full border border-white/20 text-gold-200 transition active:scale-95 hover:border-rose-300/70 hover:shadow-[0_0_15px_rgba(255,182,193,0.4)]"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function Gallery() {
  return (
    <section className="relative px-4 py-14 sm:px-6 sm:py-24 md:py-36">
      <SectionTitle
        eyebrow="The Memory Gallery"
        title="Frames of Us"
        sub="Every picture of you holds a little piece of my healing."
      />

      <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-2 md:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8 }}
          className="relative mx-auto w-full max-w-sm sm:max-w-md"
        >
          <div className="absolute -inset-3 sm:-inset-5 rounded-[2.2rem] bg-[conic-gradient(from_180deg,rgba(245,212,140,0.3),rgba(255,143,171,0.25),rgba(20,32,72,0.2),rgba(245,212,140,0.3))] opacity-60 blur-lg" />
          <TiltCard className="rounded-[1.8rem] border border-gold-300/30 bg-midnight-900 p-2.5 sm:p-3">
            <div className="overflow-hidden rounded-[1.4rem]">
              <PhotoSlot />
            </div>
            <p className="pb-1.5 pt-3.5 text-center font-script text-2xl sm:text-3xl text-gold-200">
              My Neeta maa ♥
            </p>
          </TiltCard>
          {[
            { c: "-left-3 top-8", d: 0 },
            { c: "-right-2 top-1/3", d: 1 },
            { c: "left-6 -bottom-4", d: 2 },
          ].map((h, i) => (
            <div
              key={i}
              className={`absolute ${h.c} text-rose-300/80 drop-shadow-[0_0_10px_rgba(255,143,171,0.7)]`}
            >
              <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-center md:text-left"
        >
          <p className="mb-2 text-[10px] uppercase tracking-[0.45em] text-rose-300/80">Chapter One</p>
          <h3 className="font-serif text-2xl font-light leading-tight text-rose-50 sm:text-4xl md:text-5xl">
            The smile that <span className="gold-text">became home</span>
          </h3>
          <p className="mt-4 font-serif text-base italic leading-relaxed text-white/70 sm:text-xl">
            That smile, that glow, that cake dripping with chocolate and gold — this is how I want the
            whole world to see you, maa: radiant, celebrated, and so deeply loved.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-white/50 sm:text-sm">
            You spent years holding everyone else together. Today, let us hold you.
          </p>
        </motion.div>
      </div>

      <div className="mx-auto mt-16 max-w-5xl sm:mt-24 md:mt-32">
        <SectionTitle eyebrow="Cinematic Reel" title="Our Story, Frame by Frame" />
        <Coverflow />
      </div>
    </section>
  );
}

/* ========================================================================
   3. HEARTBEAT AUDIO PLAYER — vinyl heart + radial visualizer + quotes
   ======================================================================== */
const QUOTE_POS = [
  "md:left-0 md:top-4",
  "md:right-0 md:top-20",
  "md:left-6 md:bottom-16",
  "md:right-4 md:bottom-2",
];

function VoiceNote() {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const glowRef = useRef(null);
  const fileRef = useRef(null);
  const playingRef = useRef(false);
  const [src, setSrc] = useState(CONFIG.audio);
  const [missing, setMissing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [ended, setEnded] = useState(false);
  const vw = useWindowWidth();
  const isMobile = vw < 768;

  const times = useMemo(
    () =>
      CONFIG.quotes.map((q, i) =>
        q.at != null ? q.at : dur * (0.04 + (0.9 * i) / CONFIG.quotes.length)
      ),
    [dur]
  );

  const activeIdx = useMemo(() => {
    if (!dur || (!playing && time === 0)) return -1;
    let a = -1;
    times.forEach((t, i) => {
      if (time >= t) a = i;
    });
    return a;
  }, [time, times, dur, playing]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (missing) {
      fileRef.current?.click();
      return;
    }
    if (a.paused) {
      try {
        await a.play();
      } catch (e) {
        console.error("Audio playback error:", e);
      }
    } else {
      a.pause();
    }
  };

  const chooseAudio = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const newUrl = URL.createObjectURL(f);
    setSrc(newUrl);
    setMissing(false);
    setTime(0);
    setEnded(false);
    if (audioRef.current) {
      audioRef.current.src = newUrl;
      audioRef.current.load();
      audioRef.current.play().catch(console.error);
    }
  };

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Radial heartbeat pulse / visualizer
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d", { alpha: true });
    const isSmall = window.innerWidth < 768;
    const N = isSmall ? 36 : 64;
    const bars = new Float32Array(N);
    let raf,
      size = 0,
      level = 0;
    const dpr = isSmall ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      size = c.clientWidth;
      c.width = size * dpr;
      c.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const loop = (t = 0) => {
      ctx.clearRect(0, 0, size, size);
      const on = playingRef.current;
      const beat =
        Math.pow(Math.max(0, Math.sin(t * 0.0068)), 10) +
        0.5 * Math.pow(Math.max(0, Math.sin(t * 0.0068 - 0.85)), 10);
      let sum = 0;

      for (let i = 0; i < N; i++) {
        let v;
        if (on) {
          v =
            0.2 +
            0.32 * beat +
            0.18 * Math.abs(Math.sin(t * 0.0028 + i * 0.35) * Math.sin(t * 0.0012 + i * 0.12));
        } else {
          v = 0.04 + 0.04 * Math.sin(t * 0.002 + i * 0.3) + 0.06 * beat;
        }
        bars[i] += (v - bars[i]) * 0.22;
        sum += bars[i];
      }

      level += (sum / N - level) * 0.15;
      const cx = size / 2,
        R = size * 0.31;
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      for (let i = 0; i < N; i++) {
        const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
        const L = 3 + bars[i] * size * 0.15;
        const mix = (Math.sin(ang * 2 + t * 0.0005) + 1) / 2;
        const col = `rgba(255,${Math.round(214 - mix * 60)},${Math.round(140 + mix * 40)},${
          0.35 + bars[i] * 0.65
        })`;
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1.5, size * 0.008);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * R, cx + Math.sin(ang) * R);
        ctx.lineTo(cx + Math.cos(ang) * (R + L), cx + Math.sin(ang) * (R + L));
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
      if (glowRef.current) {
        glowRef.current.style.transform = `scale(${1 + level * 0.65})`;
        glowRef.current.style.opacity = String(0.35 + level * 0.9);
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const progress = dur ? time / dur : 0;
  const C = 2 * Math.PI * 48;

  const currentMobileQuote = useMemo(() => {
    if (activeIdx >= 0 && activeIdx < CONFIG.quotes.length) {
      return CONFIG.quotes[activeIdx].text;
    }
    if (ended) {
      return CONFIG.quotes[CONFIG.quotes.length - 1].text;
    }
    return "Tap the heart to listen to Manali's voice...";
  }, [activeIdx, ended]);

  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-24 md:py-36">
      <SectionTitle
        eyebrow="The Heartbeat"
        title="A Voice Note, Just for You"
        sub="Close your eyes, maa. Let my words hold you."
      />

      <audio
        ref={audioRef}
        preload="auto"
        onLoadedMetadata={(e) => {
          setDur(e.currentTarget.duration);
          setMissing(false);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setEnded(true);
          if (canvasRef.current) {
            const r = canvasRef.current.getBoundingClientRect();
            FX.pop(r.left + r.width / 2, r.top + r.height / 2, true);
          }
        }}
      >
        <source src="voice-note.mp3" type="audio/mpeg" />
        <source src="voice-note.ogg" type="audio/ogg" />
        <source src="./voice-note.mp3" type="audio/mpeg" />
        <source src="./voice-note.ogg" type="audio/ogg" />
        <source src="/voice-note.mp3" type="audio/mpeg" />
        <source src="/voice-note.ogg" type="audio/ogg" />
        <source src="public/voice-note.mp3" type="audio/mpeg" />
        <source src="public/voice-note.ogg" type="audio/ogg" />
      </audio>
      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={chooseAudio} />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center md:h-[620px] md:justify-center">
        {/* Player Vinyl Circle */}
        <div className="relative grid h-[260px] w-[260px] place-items-center sm:h-[320px] sm:w-[320px] md:h-[420px] md:w-[420px]">
          <div
            ref={glowRef}
            className="absolute h-[60%] w-[60%] rounded-full bg-[radial-gradient(circle,rgba(255,143,171,0.5),rgba(245,212,140,0.18)_50%,transparent_72%)] blur-2xl transition-[filter]"
          />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          <AnimatePresence>
            {playing &&
              [0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute h-32 w-32 rounded-full border border-rose-300/40 sm:h-40 sm:w-40 md:h-52 md:w-52"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2.0, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
                />
              ))}
          </AnimatePresence>

          {/* Progress Ring */}
          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute h-[10.5rem] w-[10.5rem] -rotate-90 sm:h-[13rem] sm:w-[13rem] md:h-[16rem] md:w-[16rem]"
          >
            <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="url(#pg)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ filter: "drop-shadow(0 0 3px #f5d48c)" }}
            />
            <defs>
              <linearGradient id="pg">
                <stop offset="0" stopColor="#f5d48c" />
                <stop offset="1" stopColor="#ff8fab" />
              </linearGradient>
            </defs>
          </svg>

          {/* Vinyl Heart Play Button */}
          <motion.button
            onClick={toggle}
            aria-label={playing ? "Pause voice note" : "Play voice note"}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            animate={playing ? { scale: 1 } : { scale: [1, 1.04, 1, 1.02, 1] }}
            transition={playing ? {} : { duration: 1.6, repeat: Infinity, times: [0, 0.14, 0.3, 0.44, 1] }}
            className="relative h-32 w-32 rounded-full shadow-[0_0_30px_rgba(255,143,171,0.4),0_0_60px_rgba(245,212,140,0.18),inset_0_0_20px_rgba(0,0,0,0.9)] sm:h-40 sm:w-40 md:h-52 md:w-52"
          >
            <motion.div
              animate={{ rotate: playing ? 360 : 0 }}
              transition={playing ? { duration: 5.5, repeat: Infinity, ease: "linear" } : { duration: 0.8 }}
              className="vinyl absolute inset-0 rounded-full border border-gold-300/30"
            >
              <div className="absolute inset-[30%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd6df,#ff8fab_45%,#b8862f)] shadow-[0_0_20px_rgba(255,143,171,0.7)]" />
              <div className="absolute left-1/2 top-[33%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/70" />
            </motion.div>
            <div className="absolute inset-0 grid place-items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={playing ? "p" : "l"}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-midnight-950"
                >
                  {playing ? (
                    <svg viewBox="0 0 24 24" className="h-7 w-7 sm:h-8 sm:w-8" fill="currentColor">
                      <rect x="6" y="5" width="4" height="14" rx="1.5" />
                      <rect x="14" y="5" width="4" height="14" rx="1.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="ml-0.5 h-8 w-8 sm:h-9 sm:w-9" fill="currentColor">
                      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
                    </svg>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.button>
        </div>

        {/* Audio Controls & Timeline */}
        <div className="relative z-10 mt-3 w-full max-w-xs sm:max-w-sm text-center">
          {missing ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-gold-300/40 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-gold-200 transition hover:border-rose-300"
            >
              ♥ Add Manali's voice note
            </button>
          ) : (
            <>
              <input
                type="range"
                className="seek"
                min="0"
                max={dur || 0}
                step="0.1"
                value={time}
                style={{ "--p": `${progress * 100}%` }}
                onChange={(e) => {
                  const v = +e.target.value;
                  if (audioRef.current) audioRef.current.currentTime = v;
                  setTime(v);
                }}
                aria-label="Seek voice note"
              />
              <div className="mt-1 flex justify-between font-sans text-[11px] tracking-widest text-white/45">
                <span>{fmt(time)}</span>
                <span>{fmt(dur)}</span>
              </div>
            </>
          )}
          <p className="mt-3 font-serif text-sm sm:text-base italic text-white/50">
            {missing
              ? "Or save it as voice-note.mp3 next to this file."
              : playing
              ? "Listening with my whole heart..."
              : ended
              ? "Every word, forever yours."
              : "Tap the heart to hear my voice."}
          </p>
        </div>

        {/* MOBILE: Single Dynamic Spoken Quote Card */}
        {isMobile ? (
          <div className="mt-6 w-full max-w-sm px-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx >= 0 ? activeIdx : ended ? "end" : "idle"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-2xl border border-rose-300/35 bg-[#0b1330]/90 px-5 py-4 text-center shadow-[0_0_20px_rgba(255,182,193,0.2)]"
              >
                <span className="gold-text absolute -top-3 left-4 font-serif text-3xl not-italic">“</span>
                <p className="font-serif text-base italic leading-relaxed text-rose-50">
                  {currentMobileQuote}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          /* DESKTOP: 4 Artistic Floating Quotes surrounding player */
          <div className="absolute inset-0 pointer-events-none">
            {CONFIG.quotes.map((q, i) => {
              const state = ended ? "past" : i === activeIdx ? "active" : i < activeIdx ? "past" : "future";
              return (
                <motion.div
                  key={i}
                  className={`pointer-events-auto absolute w-[280px] lg:w-[320px] ${QUOTE_POS[i % QUOTE_POS.length]}`}
                  animate={{
                    opacity: state === "active" ? 1 : state === "past" ? 0.45 : 0.18,
                    scale: state === "active" ? 1.02 : 0.98,
                    y: state === "future" ? 10 : 0,
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                  <blockquote
                    className={`relative rounded-2xl border px-5 py-4 text-left font-serif text-xl italic leading-snug transition-colors duration-700 ${
                      state === "active"
                        ? "border-rose-300/40 bg-white/[0.08] text-rose-50 shadow-[0_0_25px_rgba(255,182,193,0.3)] backdrop-blur-md"
                        : "border-white/5 bg-white/[0.02] text-white/70"
                    }`}
                  >
                    <span className="gold-text absolute -top-4 left-5 font-serif text-4xl not-italic">“</span>
                    {q.text}
                  </blockquote>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ========================================================================
   4. FINAL BLESSING — typed wishes + hug button
   ======================================================================== */
function Blessing() {
  const ref = useRef(null),
    btn = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const [shown, setShown] = useState("");
  const done = shown.length >= CONFIG.blessing.length;

  useEffect(() => {
    if (!inView) return;
    let i = 0,
      id;
    const tick = () => {
      i++;
      setShown(CONFIG.blessing.slice(0, i));
      if (i >= CONFIG.blessing.length) return;
      const ch = CONFIG.blessing[i - 1];
      id = setTimeout(
        tick,
        reduceMotion ? 5 : ch === "." ? 160 : ch === "," || ch === "—" ? 220 : 32
      );
    };
    id = setTimeout(tick, 500);
    return () => clearTimeout(id);
  }, [inView]);

  const hug = () => {
    if (!btn.current) return;
    const r = btn.current.getBoundingClientRect();
    FX.pop(r.left + r.width / 2, r.top + r.height / 2, true);
    FX.rise(12);
  };

  return (
    <section ref={ref} className="relative px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-20 md:pt-32">
      <SectionTitle eyebrow="The Final Blessing" title="My Wishes for You" />

      <div className="relative mx-auto max-w-3xl">
        <div className="absolute -inset-4 sm:-inset-8 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_center,rgba(245,212,140,0.12),rgba(255,143,171,0.07)_45%,transparent_72%)] blur-xl" />

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-[1.8rem] border border-gold-300/20 bg-[#0b1330]/95 md:bg-[linear-gradient(160deg,rgba(20,32,72,0.55),rgba(6,10,26,0.7))] px-5 py-7 sm:px-8 sm:py-10 md:px-12 md:py-14 shadow-[0_0_50px_rgba(245,212,140,0.07),inset_0_1px_0_rgba(255,255,255,0.06)] md:backdrop-blur-xl"
        >
          <p className="min-h-[12rem] font-serif text-lg font-light leading-relaxed text-rose-50/90 sm:text-2xl md:min-h-[11rem] md:text-[1.85rem]">
            {shown}
            {!done && <span className="caret" />}
          </p>

          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="mt-6 text-center sm:mt-8 md:text-right"
              >
                <p className="gold-text font-script text-3xl sm:text-5xl md:text-6xl">
                  Forever your Manali
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-8 flex justify-center sm:mt-12"
            >
              <motion.button
                ref={btn}
                onClick={hug}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                className="group relative overflow-hidden rounded-full border border-rose-300/50 bg-rose-400/10 px-7 py-3 sm:px-9 sm:py-3.5 font-serif text-base sm:text-xl italic text-rose-50 shadow-[0_0_25px_rgba(255,143,171,0.35)]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                <span className="relative flex items-center gap-2.5">
                  <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-rose-300" />
                  Send Neeta maa a hug
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
        className="mt-16 text-center sm:mt-24 md:mt-32"
      >
        <p className="font-serif text-2xl font-light italic text-rose-50/90 sm:text-4xl md:text-5xl">
          Happy Birthday, <span className="gold-text">Neeta maa</span>
        </p>
        <p className="mt-4 text-[9px] uppercase tracking-[0.45em] text-white/35 sm:text-[10px]">
          made with every heartbeat · Manali ♥ Neeta
        </p>
      </motion.footer>
    </section>
  );
}

/* ========================================================================
   APP
   ======================================================================== */
function App() {
  const [opened, setOpened] = useState(false);
  const [flash, setFlash] = useState(false);
  const { scrollYProgress } = useScroll();

  const open = (e) => {
    if (opened) return;
    const isMobile = window.innerWidth < 768;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    FX.burst(cx, cy, isMobile);
    setFlash(true);
    setOpened(true);

    setTimeout(() => {
      document.body.classList.remove("locked");
    }, 700);

    // Gentle ascending hearts
    let count = 0;
    const id = setInterval(() => {
      FX.rise(isMobile ? 1 : 2);
      if (++count > (isMobile ? 5 : 8)) clearInterval(id);
    }, 450);
  };

  // Sparkles on desktop click (never fire on mobile touch scroll)
  useEffect(() => {
    if (!opened) return;
    const on = (e) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") return;
      if (e.target.closest("button,input,a,[role='button']")) return;
      FX.pop(e.clientX, e.clientY);
    };
    window.addEventListener("pointerdown", on, { passive: true });
    return () => window.removeEventListener("pointerdown", on);
  }, [opened]);

  return (
    <>
      <AmbientSky />
      <CursorGlow />
      <FXCanvas />

      <AnimatePresence>{!opened && <Intro onOpen={open} />}</AnimatePresence>

      <AnimatePresence>
        {flash && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[45] bg-[radial-gradient(circle_at_center,rgba(255,236,190,0.6),rgba(255,143,171,0.2)_45%,transparent_75%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.65, 0] }}
            transition={{ duration: 0.85, times: [0, 0.25, 1], ease: "easeOut" }}
            onAnimationComplete={() => setFlash(false)}
          />
        )}
      </AnimatePresence>

      {/* Reading Progress Bar */}
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed left-0 right-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-gold-400 via-rose-300 to-gold-300 shadow-[0_0_10px_#f5d48c]"
      />

      <main
        className={`relative z-10 transition-opacity duration-700 ${
          opened ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <Hero opened={opened} />
        <Gallery />
        <VoiceNote />
        <Blessing />
      </main>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
