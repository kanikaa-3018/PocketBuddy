import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: LandingPage,
});

// ── Animated counter hook ──────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

// ── Intersection observer hook ─────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Floating particle canvas ───────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.4 + 0.05,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(194,125,86,${p.alpha})`;
        ctx.fill();
      });
      // draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(140,120,83,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.7 }}
    />
  );
}

// ── Animated dashboard mockup ──────────────────────────────────────────────
function DashboardMockup() {
  const { ref, inView } = useInView(0.1);
  const days = useCountUp(16, 1600, inView);
  const spent = useCountUp(2840, 2000, inView);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "420px",
        margin: "0 auto",
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0) rotateX(0deg)" : "translateY(40px) rotateX(8deg)",
        transition: "all 1s cubic-bezier(0.16,1,0.3,1)",
        perspective: "1000px",
      }}
    >
      {/* Glow orbs behind mockup */}
      <div style={{
        position: "absolute", top: "-60px", left: "50%", transform: "translateX(-50%)",
        width: "300px", height: "300px",
        background: "radial-gradient(circle, rgba(140,120,83,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Phone frame */}
      <div style={{
        background: "linear-gradient(145deg, #1a1a1a, #0f0f0f)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "28px",
        padding: "3px",
        boxShadow: "0 60px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}>
        <div style={{
          background: "#0A0A0A",
          borderRadius: "26px",
          overflow: "hidden",
          padding: "24px 20px",
        }}>
          {/* Status bar */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", opacity: 0.4 }}>
            <span style={{ fontSize: "10px", color: "#fff", fontFamily: "monospace" }}>9:41</span>
            <span style={{ fontSize: "10px", color: "#fff", fontFamily: "monospace" }}>●●●</span>
          </div>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>POCKETBUDDY</div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>Wing 4B · Room 214</div>
            </div>
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg, #8C7853, #C27D56)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#0A0A0A", fontWeight: 900, fontSize: "12px" }}>P</span>
            </div>
          </div>

          {/* Runway card */}
          <div style={{
            background: "#111111",
            border: "1px solid rgba(255,255,255,0.07)",
            borderTop: "2px solid #8C7853",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "12px",
          }}>
            <div style={{ fontSize: "8px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)", fontFamily: "monospace", marginBottom: "8px" }}>RUNWAY STATUS</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "4px" }}>
              <span style={{ fontSize: "48px", fontWeight: 900, color: days > 10 ? "#4ade80" : days > 5 ? "#f59e0b" : "#ef4444", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {days}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}>DAYS</span>
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>Until allowance resets on <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>1 Jul</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", fontFamily: "monospace" }}>SPENT</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>₹{spent.toLocaleString("en-IN")}</div>
              </div>
              <div>
                <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", fontFamily: "monospace" }}>SAFE/DAY</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#C27D56", fontVariantNumeric: "tabular-nums" }}>₹125</div>
              </div>
            </div>
          </div>

          {/* AI Alert */}
          <div style={{
            background: "rgba(140,120,83,0.08)",
            border: "1px solid rgba(140,120,83,0.2)",
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "10px",
          }}>
            <div style={{ fontSize: "8px", color: "#C27D56", letterSpacing: "0.15em", fontFamily: "monospace", marginBottom: "6px" }}>⚡ AI GUARD · BEDROCK</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
              BH-2 Night Canteen: Egg Paratha <span style={{ color: "#C27D56", fontWeight: 700 }}>₹45</span> · Open till 2AM
            </div>
          </div>

          {/* Pool card */}
          <div style={{
            background: "#111111",
            border: "1px solid rgba(255,255,255,0.07)",
            borderLeft: "3px solid #F7EC13",
            borderRadius: "12px",
            padding: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "9px", color: "#F7EC13", fontFamily: "monospace", letterSpacing: "0.1em" }}>🛒 BLINKIT POOL</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginTop: "3px" }}>₹165/₹199 min · 4 members</div>
              </div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>06:14</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feature card ───────────────────────────────────────────────────────────
function FeatureCard({
  icon, title, description, accent, delay,
}: {
  icon: string; title: string; description: string; accent: string; delay: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      style={{
        background: "#111111",
        border: `1px solid rgba(255,255,255,0.07)`,
        borderTop: `2px solid ${accent}`,
        borderRadius: "16px",
        padding: "28px 24px",
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "120px",
        background: `radial-gradient(ellipse at 50% -20%, ${accent}18, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{ fontSize: "28px", marginBottom: "14px" }}>{icon}</div>
      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: "10px", letterSpacing: "-0.01em" }}>{title}</h3>
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>{description}</p>
    </div>
  );
}

// ── Stat block ─────────────────────────────────────────────────────────────
function StatBlock({ value, label, inView }: { value: string; label: string; inView: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: "clamp(36px, 5vw, 56px)",
        fontWeight: 900,
        background: "linear-gradient(135deg, #8C7853, #D9A05B)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        lineHeight: 1,
        opacity: inView ? 1 : 0,
        transform: inView ? "scale(1)" : "scale(0.8)",
        transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "8px", letterSpacing: "0.1em", fontFamily: "monospace" }}>{label}</div>
    </div>
  );
}

// ── Timeline step ──────────────────────────────────────────────────────────
function TimelineStep({ n, title, sub, delay }: { n: string; title: string; sub: string; delay: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        gap: "20px",
        alignItems: "flex-start",
        opacity: inView ? 1 : 0,
        transform: inView ? "translateX(0)" : "translateX(-30px)",
        transition: `all 0.7s ease ${delay}ms`,
      }}
    >
      <div style={{
        flexShrink: 0,
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #8C7853, #C27D56)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: 900,
        color: "#0A0A0A",
        boxShadow: "0 0 20px rgba(140,120,83,0.3)",
        fontFamily: "monospace",
      }}>
        {n}
      </div>
      <div style={{ paddingTop: "8px" }}>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: "4px" }}>{title}</div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{sub}</div>
      </div>
    </div>
  );
}

// ── Main landing page ──────────────────────────────────────────────────────
function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsInView, setStatsInView] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStatsInView(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); obs.disconnect(); };
  }, []);

  const features = [
    {
      icon: "📲",
      title: "Headless UPI Ingestion",
      description: "A background Android connector silently intercepts UPI push notifications from GPay, PhonePe & Paytm — zero manual entry, ever.",
      accent: "#8C7853",
      delay: 0,
    },
    {
      icon: "🗺️",
      title: "Crowdsourced Merchant Mapping",
      description: "Raw strings like SHREE_BALAJI_ENT resolve into 'Hostel 1 Night Canteen' via 1-tap crowd classification, shared globally across campus.",
      accent: "#C27D56",
      delay: 100,
    },
    {
      icon: "⚡",
      title: "Geofenced AI Guard",
      description: "Amazon Bedrock analyzes your runway against a live campus food database to surface hyper-local, cost-effective meal alternatives.",
      accent: "#D9A05B",
      delay: 200,
    },
    {
      icon: "🛒",
      title: "Wing Cart Pooler",
      description: "Open a Blinkit/Zepto pool, share it on WhatsApp, let roommates add items — delivery fees get split automatically. No app install needed.",
      accent: "#F7EC13",
      delay: 0,
    },
    {
      icon: "📅",
      title: "Exam-Week Check-In",
      description: "If no food transaction is detected for 16+ hours during exam week, PocketBuddy pings you and suggests the nearest open campus canteen.",
      accent: "#5E17EB",
      delay: 100,
    },
    {
      icon: "🔔",
      title: "Subscription Collision Guard",
      description: "Auto-detects recurring Spotify, YouTube & gaming debits, then flags exact calendar days when they'll slice your food runway.",
      accent: "#FC8019",
      delay: 200,
    },
  ];

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh", overflowX: "hidden", color: "#fff", fontFamily: "'Inter', 'Geist', sans-serif" }}>
      <ParticleCanvas />

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "calc(100% - 48px)",
        maxWidth: "1100px",
        padding: "0 20px",
        height: "56px",
        background: scrollY > 40 ? "rgba(10,10,10,0.85)" : "rgba(10,10,10,0.4)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "100px",
        transition: "background 0.4s ease",
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "50%",
            background: "linear-gradient(135deg, #8C7853, #D9A05B)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(140,120,83,0.4)",
          }}>
            <span style={{ fontWeight: 900, fontSize: "13px", color: "#0A0A0A" }}>P</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: "14px", letterSpacing: "-0.02em", color: "#fff" }}>PocketBuddy</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link
            to="/login"
            style={{
              padding: "8px 18px",
              borderRadius: "100px",
              fontSize: "12px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.65)",
              textDecoration: "none",
              transition: "color 0.2s",
              letterSpacing: "0.02em",
            }}
          >
            Sign In
          </Link>
          <Link
            to="/login"
            style={{
              padding: "8px 20px",
              borderRadius: "100px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#0A0A0A",
              background: "linear-gradient(135deg, #8C7853, #C27D56)",
              textDecoration: "none",
              letterSpacing: "0.03em",
              boxShadow: "0 0 20px rgba(140,120,83,0.35)",
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 24px 80px",
        textAlign: "center",
        overflow: "hidden",
      }}>
        {/* Radial glow */}
        <div style={{
          position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
          width: "700px", height: "500px",
          background: "radial-gradient(ellipse, rgba(140,120,83,0.12) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          pointerEvents: "none",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent)",
        }} />

        {/* Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 16px",
          borderRadius: "100px",
          background: "rgba(140,120,83,0.1)",
          border: "1px solid rgba(140,120,83,0.25)",
          fontSize: "11px",
          fontWeight: 600,
          color: "#C27D56",
          letterSpacing: "0.08em",
          marginBottom: "32px",
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", animation: "pulse 2s infinite" }} />
          POWERED BY AMAZON BEDROCK · HACKATHON 2025
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(40px, 7vw, 88px)",
          fontWeight: 900,
          lineHeight: 1.02,
          letterSpacing: "-0.04em",
          marginBottom: "24px",
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s",
          maxWidth: "900px",
        }}>
          Your campus money,{" "}
          <span style={{
            background: "linear-gradient(135deg, #8C7853 0%, #D9A05B 50%, #C27D56 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            finally watching over you.
          </span>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: "clamp(15px, 2vw, 20px)",
          color: "rgba(255,255,255,0.45)",
          lineHeight: 1.65,
          maxWidth: "560px",
          marginBottom: "44px",
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.35s",
          fontWeight: 400,
        }}>
          The passive UPI spending guard built for Indian hostel students. No manual logging.
          No spreadsheets. Just a silent AI that makes sure you never go broke before exams.
        </p>

        {/* CTAs */}
        <div style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s",
        }}>
          <Link
            to="/login"
            id="hero-cta-primary"
            style={{
              padding: "14px 32px",
              borderRadius: "100px",
              fontSize: "14px",
              fontWeight: 700,
              color: "#0A0A0A",
              background: "linear-gradient(135deg, #8C7853, #C27D56)",
              textDecoration: "none",
              letterSpacing: "0.03em",
              boxShadow: "0 0 30px rgba(140,120,83,0.4), 0 4px 20px rgba(0,0,0,0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
              display: "inline-block",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
          >
            Start Tracking Free →
          </Link>
          <a
            href="#features"
            style={{
              padding: "14px 32px",
              borderRadius: "100px",
              fontSize: "14px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              textDecoration: "none",
              letterSpacing: "0.02em",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,0.08)"; el.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,0.05)"; el.style.borderColor = "rgba(255,255,255,0.1)"; }}
          >
            See How It Works
          </a>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: "absolute",
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          opacity: heroVisible ? 0.35 : 0,
          transition: "opacity 1s ease 1.2s",
          animation: "bounce 2s infinite 1.5s",
        }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>SCROLL</div>
          <div style={{ width: "1px", height: "32px", background: "linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)" }} />
        </div>
      </section>

      {/* ── DASHBOARD MOCKUP SECTION ─────────────────────────────────────── */}
      <section style={{
        padding: "40px 24px 120px",
        maxWidth: "1100px",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "80px",
        alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#C27D56", fontFamily: "monospace", marginBottom: "16px" }}>THE DASHBOARD</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "20px" }}>
            Your financial<br />runway, live.
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: "32px" }}>
            One glance tells you everything — days until broke, safe daily spend limit, AI-suggested campus meals, and active Wing pools. All computed passively from your UPI notifications.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              "Live runway countdown in days",
              "Hyper-local AI meal suggestions",
              "Crowdsourced merchant recognition",
              "Subscription collision calendar",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#C27D56", flexShrink: 0 }} />
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <DashboardMockup />
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{
        padding: "80px 24px",
        background: "linear-gradient(to bottom, transparent, rgba(140,120,83,0.04), transparent)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{
          maxWidth: "900px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "40px",
        }}>
          <StatBlock value="₹0" label="MANUAL ENTRIES" inView={statsInView} />
          <StatBlock value="16+" label="HOUR BURNOUT DETECTION" inView={statsInView} />
          <StatBlock value="75%" label="TOKEN COST REDUCTION" inView={statsInView} />
          <StatBlock value="∞" label="CAMPUS MERCHANTS" inView={statsInView} />
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#C27D56", fontFamily: "monospace", marginBottom: "16px" }}>CORE FEATURE SET</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Five loops that protect<br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>your campus survival.</span>
          </h2>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px",
        }}>
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{
        padding: "100px 24px",
        background: "rgba(255,255,255,0.015)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#C27D56", fontFamily: "monospace", marginBottom: "16px" }}>UNDER THE HOOD</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              How it actually works
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "36px", position: "relative" }}>
            <div style={{
              position: "absolute", left: "19px", top: "40px", bottom: "40px",
              width: "1px", background: "linear-gradient(to bottom, #8C7853, transparent)",
            }} />
            <TimelineStep n="01" title="UPI notification fires" sub="You pay ₹30 at the hostel canteen. Your Android companion app silently intercepts the GPay push string in the background." delay={0} />
            <TimelineStep n="02" title="FastAPI parses the payload" sub="The string hits an async webhook endpoint. Bedrock extracts merchant ID, amount, and timestamp without touching your bank." delay={100} />
            <TimelineStep n="03" title="Merchant gets crowd-classified" sub="If the merchant is new, one 1-tap prompt classifies it globally for your entire campus. Next student gets it automatically." delay={200} />
            <TimelineStep n="04" title="Runway recalculates instantly" sub="Your dashboard updates the days-remaining metric, checks for subscription collisions, and flags burnout risks in real time." delay={300} />
            <TimelineStep n="05" title="AI guard activates if needed" sub="Bedrock cross-references your spending vector against the campus food database and surfaces the cheapest viable meal option near you." delay={400} />
          </div>
        </div>
      </section>

      {/* ── TECH STACK ───────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#C27D56", fontFamily: "monospace", marginBottom: "16px" }}>ARCHITECTURE</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, letterSpacing: "-0.03em" }}>Built for speed. Built to scale.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {[
            { layer: "AI Engine", tech: "Amazon Bedrock", color: "#FF9900" },
            { layer: "Frontend", tech: "React + TanStack", color: "#61DAFB" },
            { layer: "Backend", tech: "FastAPI (Python)", color: "#009688" },
            { layer: "Database", tech: "Supabase + PostgreSQL", color: "#3ECF8E" },
            { layer: "Native Hook", tech: "Android (Kotlin)", color: "#7B52FF" },
            { layer: "Tunneling", tech: "ngrok", color: "#1F5FFF" },
          ].map(({ layer, tech, color }) => {
            const { ref, inView } = useInView();
            return (
              <div
                key={tech}
                ref={ref}
                style={{
                  background: "#111111",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "14px",
                  padding: "20px",
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(20px)",
                  transition: "all 0.6s ease",
                }}
              >
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, marginBottom: "12px", boxShadow: `0 0 10px ${color}66` }} />
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: "4px" }}>{layer}</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{tech}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px 120px" }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto",
          textAlign: "center",
          background: "linear-gradient(135deg, rgba(140,120,83,0.12), rgba(194,125,86,0.06))",
          border: "1px solid rgba(140,120,83,0.2)",
          borderRadius: "28px",
          padding: "72px 48px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: "400px", height: "200px",
            background: "radial-gradient(ellipse at 50% 0%, rgba(140,120,83,0.2), transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#C27D56", fontFamily: "monospace", marginBottom: "20px" }}>DON'T GO BROKE BEFORE EXAMS</div>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "20px" }}>
            Your financial guard<br />is one tap away.
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.45)", marginBottom: "40px", lineHeight: 1.6 }}>
            Free for all campus students. No credit card. No complex setup.<br />Just install the Android companion and you're live.
          </p>
          <Link
            to="/login"
            id="footer-cta"
            style={{
              display: "inline-block",
              padding: "16px 40px",
              borderRadius: "100px",
              fontSize: "15px",
              fontWeight: 700,
              color: "#0A0A0A",
              background: "linear-gradient(135deg, #8C7853, #C27D56)",
              textDecoration: "none",
              letterSpacing: "0.03em",
              boxShadow: "0 0 40px rgba(140,120,83,0.5), 0 4px 24px rgba(0,0,0,0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "scale(1.04)"; el.style.boxShadow = "0 0 60px rgba(140,120,83,0.6), 0 4px 24px rgba(0,0,0,0.4)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "scale(1)"; el.style.boxShadow = "0 0 40px rgba(140,120,83,0.5), 0 4px 24px rgba(0,0,0,0.4)"; }}
          >
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "32px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: "1100px",
        margin: "0 auto",
        flexWrap: "wrap",
        gap: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "linear-gradient(135deg, #8C7853, #D9A05B)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontWeight: 900, fontSize: "10px", color: "#0A0A0A" }}>P</span>
          </div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>PocketBuddy</span>
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
          CAMPUS FINANCIAL GUARD · HACKATHON 2025
        </div>
        <Link to="/login" style={{ fontSize: "12px", color: "#C27D56", textDecoration: "none", fontWeight: 600 }}>
          Sign In →
        </Link>
      </footer>

      {/* ── Keyframe styles ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-8px); }
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #1E1E1E; border-radius: 2px; }

        @media (max-width: 768px) {
          section[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          section[style*="grid-template-columns: repeat(4, 1fr)"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
