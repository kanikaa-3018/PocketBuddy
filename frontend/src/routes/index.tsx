import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: LandingPage,
});

// ── Hooks ──────────────────────────────────────────────────────────────────
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

function useInView(threshold = 0.12) {
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

// ── Particle canvas ────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.4 + 0.3,
      alpha: Math.random() * 0.35 + 0.05,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(194,125,86,${p.alpha})`; ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(140,120,83,${0.12 * (1 - dist / 120)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.65 }} />;
}

// ── Dashboard mockup (phone) ───────────────────────────────────────────────
function DashboardMockup() {
  const { ref, inView } = useInView(0.1);
  return (
    <div ref={ref} style={{ position: "relative", width: "100%", maxWidth: "400px", margin: "0 auto", opacity: inView ? 1 : 0, transform: inView ? "translateY(0) rotateX(0deg)" : "translateY(40px) rotateX(8deg)", transition: "all 1s cubic-bezier(0.16,1,0.3,1)", perspective: "1000px" }}>
      <div style={{ position: "absolute", top: "-60px", left: "50%", transform: "translateX(-50%)", width: "300px", height: "300px", background: "radial-gradient(circle, rgba(140,120,83,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ background: "linear-gradient(145deg, #1a1a1a, #0f0f0f)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "28px", padding: "3px", boxShadow: "0 60px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
        <div style={{ background: "#0A0A0A", borderRadius: "26px", overflow: "hidden", padding: "20px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", opacity: 0.35 }}>
            <span style={{ fontSize: "10px", color: "#fff", fontFamily: "monospace" }}>9:41</span>
            <span style={{ fontSize: "10px", color: "#fff", fontFamily: "monospace" }}>●●●</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "8px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>POCKETBUDDY</div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>Wing 4B · Room 214</div>
            </div>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #8C7853, #C27D56)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#0A0A0A", fontWeight: 900, fontSize: "11px" }}>P</span>
            </div>
          </div>
          {/* Runway card */}
          <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)", borderTop: "2px solid #8C7853", borderRadius: "12px", padding: "14px", marginBottom: "10px" }}>
            <div style={{ fontSize: "7px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: "6px" }}>RUNWAY STATUS</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "3px" }}>
              <span style={{ fontSize: "42px", fontWeight: 900, color: "#4ade80", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>16</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}>DAYS</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div><div style={{ fontSize: "7px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", fontFamily: "monospace" }}>SPENT</div><div style={{ fontSize: "14px", fontWeight: 800, color: "#fff" }}>₹2,840</div></div>
              <div><div style={{ fontSize: "7px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", fontFamily: "monospace" }}>SAFE/DAY</div><div style={{ fontSize: "14px", fontWeight: 800, color: "#C27D56" }}>₹125</div></div>
            </div>
          </div>
          {/* AI Alert */}
          <div style={{ background: "rgba(140,120,83,0.08)", border: "1px solid rgba(140,120,83,0.2)", borderRadius: "10px", padding: "10px", marginBottom: "8px" }}>
            <div style={{ fontSize: "7px", color: "#C27D56", letterSpacing: "0.15em", fontFamily: "monospace", marginBottom: "5px" }}>⚡ AI GUARD · BEDROCK</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>BH-2 Night Canteen: Egg Paratha <span style={{ color: "#C27D56", fontWeight: 700 }}>₹45</span> · Open till 2AM</div>
          </div>
          {/* Pool */}
          <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid #F7EC13", borderRadius: "10px", padding: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "8px", color: "#F7EC13", fontFamily: "monospace", letterSpacing: "0.1em" }}>🛒 BLINKIT POOL</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>₹165/₹199 min · 4 members</div>
              </div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>06:14</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feature card ───────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description, accent, delay }: { icon: string; title: string; description: string; accent: string; delay: number }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} style={{ background: "#111111", border: `1px solid rgba(255,255,255,0.07)`, borderTop: `2px solid ${accent}`, borderRadius: "16px", padding: "26px 22px", opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(28px)", transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100px", background: `radial-gradient(ellipse at 50% -20%, ${accent}15, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ fontSize: "26px", marginBottom: "12px" }}>{icon}</div>
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: "8px", letterSpacing: "-0.01em" }}>{title}</h3>
      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.42)", lineHeight: 1.65 }}>{description}</p>
    </div>
  );
}

// ── Timeline step ──────────────────────────────────────────────────────────
function TimelineStep({ n, title, sub, delay }: { n: string; title: string; sub: string; delay: number }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} style={{ display: "flex", gap: "20px", alignItems: "flex-start", opacity: inView ? 1 : 0, transform: inView ? "translateX(0)" : "translateX(-30px)", transition: `all 0.7s ease ${delay}ms` }}>
      <div style={{ flexShrink: 0, width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #8C7853, #C27D56)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, color: "#0A0A0A", boxShadow: "0 0 18px rgba(140,120,83,0.3)", fontFamily: "monospace" }}>{n}</div>
      <div style={{ paddingTop: "7px" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: "3px" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>{sub}</div>
      </div>
    </div>
  );
}

// ── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return <div style={{ fontSize: "10px", letterSpacing: "0.22em", color: "#C27D56", fontFamily: "monospace", marginBottom: "14px", textTransform: "uppercase" }}>{text}</div>;
}

// ── Section heading ────────────────────────────────────────────────────────
function SectionHeading({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <h2 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 900, letterSpacing: "0.02em", lineHeight: 1.05, textTransform: "uppercase", ...style }}>{children}</h2>;
}

// ── Main landing page ──────────────────────────────────────────────────────
function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsInView, setStatsInView] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsInView(true); obs.disconnect(); } }, { threshold: 0.2 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); obs.disconnect(); };
  }, []);

  const features = [
    { icon: "📲", title: "Headless UPI Ingestion", description: "A background Android connector silently intercepts UPI push notifications from GPay, PhonePe & Paytm — zero manual entry, ever.", accent: "#8C7853", delay: 0 },
    { icon: "🗺️", title: "Crowdsourced Merchant Mapping", description: "Raw strings like SHREE_BALAJI_ENT resolve into 'Hostel 1 Night Canteen' via 1-tap crowd classification, shared globally across campus.", accent: "#C27D56", delay: 100 },
    { icon: "⚡", title: "Geofenced AI Guard", description: "Amazon Bedrock analyzes your runway against a live campus food database to surface hyper-local, cost-effective meal alternatives.", accent: "#D9A05B", delay: 200 },
    { icon: "🛒", title: "Wing Cart Pooler", description: "Open a Blinkit/Zepto pool, share it on WhatsApp, let roommates add items — delivery fees split automatically. No install needed.", accent: "#F7EC13", delay: 0 },
    { icon: "📅", title: "Exam-Week Check-In", description: "If no food transaction is detected for 16+ hours during exam week, PocketBuddy pings you and suggests the nearest open campus canteen.", accent: "#5E17EB", delay: 100 },
    { icon: "🔔", title: "Subscription Collision Guard", description: "Auto-detects recurring Spotify, YouTube & gaming debits, then flags exact days when they'll slice your food runway to dangerous levels.", accent: "#FC8019", delay: 200 },
  ];

  const faqs = [
    { q: "Does PocketBuddy access my bank account or UPI password?", a: "Absolutely not. PocketBuddy only reads push notification strings from UPI apps — it never connects to your bank, never stores credentials, and never initiates transactions. Think of it as a smart clipboard that reads your phone's notification panel." },
    { q: "What if I don't have the Android companion app?", a: "You can still use PocketBuddy in full manual mode — log transactions in one tap, get AI food suggestions, join Wing Cart Pools, and track subscriptions. The companion just makes it passive and effortless." },
    { q: "How does the crowdsourced merchant mapping work?", a: "When a new merchant string appears (e.g. SHREE_BALAJI_ENT), you get a 1-tap prompt to classify it. Once classified, it's immediately resolved for every student on your campus — your 10 seconds of effort saves hundreds of others the same friction." },
    { q: "Is this only for IIT/NIT students?", a: "No — PocketBuddy works for any residential campus. The campus food database is seeded per-college and grows via crowdsourcing. Any university can onboard by seeding their initial food menu." },
    { q: "How is the Burnout Risk Score calculated?", a: "It's derived from four real signals: food gap hours (time since last food transaction), exam period overlap, spending velocity spike vs. prior week, and late-night transaction patterns. No subjective surveys — it's entirely data-driven." },
  ];

  const comparisons = [
    { feature: "Zero manual tracking", us: true, fi: false, mint: false, splitwise: false },
    { feature: "UPI push notification ingestion", us: true, fi: false, mint: false, splitwise: false },
    { feature: "Campus-specific food intelligence", us: true, fi: false, mint: false, splitwise: false },
    { feature: "Crowdsourced merchant mapping", us: true, fi: false, mint: false, splitwise: false },
    { feature: "Burnout risk detection", us: true, fi: false, mint: false, splitwise: false },
    { feature: "Delivery fee split pooling", us: true, fi: false, mint: false, splitwise: true },
    { feature: "Subscription collision alerts", us: true, fi: true, mint: true, splitwise: false },
    { feature: "Exam-period food monitoring", us: true, fi: false, mint: false, splitwise: false },
    { feature: "Works without bank login", us: true, fi: false, mint: false, splitwise: true },
  ];

  const problems = [
    { icon: "💸", stat: "₹800", sub: "avg wasted monthly on delivery surge fees by hostel students", color: "#FC8019" },
    { icon: "🍽️", stat: "3 in 5", sub: "students skip a meal during exam week due to financial anxiety", color: "#ef4444" },
    { icon: "📱", stat: "94%", sub: "of students abandon manual finance apps within 2 weeks", color: "#f59e0b" },
    { icon: "🌙", stat: "₹450", sub: "spent late-night per month on impulse delivery orders", color: "#5E17EB" },
  ];

  const testimonials = [
    { quote: "This is exactly what I needed in my first year. I had no idea I was spending ₹900/month just on delivery fees until PocketBuddy showed me.", name: "Aryan M.", role: "2nd Year, CSE · IIT Bombay (Beta User)" },
    { quote: "The Wing Pool feature saved us ₹200 in one week. We started a Zepto pool for the whole floor every night. Game changer.", name: "Sneha K.", role: "3rd Year, ECE · BITS Pilani (Beta User)" },
    { quote: "During JEE Advanced prep I was skipping meals without realizing. The burnout detector actually made me eat. Sounds silly but it worked.", name: "Rahul S.", role: "Final Year, Mech · NIT Trichy (Beta User)" },
  ];

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh", overflowX: "hidden", color: "#fff", fontFamily: "'Inter', 'Geist', sans-serif" }}>
      <ParticleCanvas />

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", width: "calc(100% - 48px)", maxWidth: "1100px", padding: "0 20px", height: "56px", background: scrollY > 40 ? "rgba(10,10,10,0.9)" : "rgba(10,10,10,0.4)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "100px", transition: "background 0.4s ease", boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #8C7853, #D9A05B)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(140,120,83,0.4)" }}>
            <span style={{ fontWeight: 900, fontSize: "13px", color: "#0A0A0A" }}>P</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: "14px", letterSpacing: "-0.02em", color: "#fff" }}>PocketBuddy</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <a href="#why-us" style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Why Us</a>
          <a href="#features" style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Features</a>
          <a href="#how-it-works" style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>How It Works</a>
          <div style={{ display: "flex", gap: "8px" }}>
            <Link to="/login" style={{ padding: "7px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Sign In</Link>
            <Link to="/login" style={{ padding: "7px 18px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, color: "#0A0A0A", background: "linear-gradient(135deg, #8C7853, #C27D56)", textDecoration: "none", boxShadow: "0 0 18px rgba(140,120,83,0.35)" }}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", textAlign: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: "700px", height: "500px", background: "radial-gradient(ellipse, rgba(140,120,83,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none", maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent)" }} />

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "7px 18px", borderRadius: "100px", background: "rgba(140,120,83,0.08)", border: "1px solid rgba(140,120,83,0.2)", fontSize: "9px", fontWeight: 700, color: "#C27D56", letterSpacing: "0.22em", marginBottom: "40px", opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s", fontFamily: "monospace", textTransform: "uppercase" }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", animation: "pulse 2s infinite", flexShrink: 0 }} />
          POWERED BY AMAZON BEDROCK&nbsp;&nbsp;·&nbsp;&nbsp;AWS HACKATHON 2025
        </div>

        <h1 style={{ fontSize: "clamp(28px, 6vw, 72px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "0.04em", marginBottom: "28px", opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(30px)", transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s", maxWidth: "920px", textTransform: "uppercase", textAlign: "center" }}>
          <span style={{ display: "block", color: "rgba(255,255,255,0.85)", marginBottom: "2px" }}>YOUR CAMPUS MONEY,</span>
          <span style={{ display: "block", background: "linear-gradient(135deg, #8C7853 0%, #D9A05B 45%, #C27D56 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            FINALLY WATCHING OVER YOU.
          </span>
        </h1>

        {/* Subheading — monospace editorial style */}
        <p style={{ fontSize: "clamp(11px, 1.4vw, 14px)", color: "rgba(255,255,255,0.35)", lineHeight: 1.9, maxWidth: "520px", marginBottom: "44px", opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(20px)", transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.35s", fontFamily: "monospace", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Passive UPI tracking · AI burnout detection<br />Wing cart pools · Campus meal intelligence
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(20px)", transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s" }}>
          <Link to="/login" id="hero-cta-primary" style={{ padding: "14px 32px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, color: "#0A0A0A", background: "linear-gradient(135deg, #8C7853, #C27D56)", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase", boxShadow: "0 0 30px rgba(140,120,83,0.4), 0 4px 20px rgba(0,0,0,0.4)", display: "inline-block", transition: "all 0.2s ease" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}>
            Start Tracking Free →
          </Link>
          <a href="#features" style={{ padding: "14px 32px", borderRadius: "100px", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase", transition: "all 0.2s ease" }}>See How It Works</a>
        </div>

        <div style={{ position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", opacity: heroVisible ? 0.3 : 0, transition: "opacity 1s ease 1.2s", animation: "bounce 2s infinite 1.5s" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>SCROLL</div>
          <div style={{ width: "1px", height: "30px", background: "linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)" }} />
        </div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 100%, rgba(239,68,68,0.05), transparent 60%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <SectionLabel text="The Problem We Solve" />
            <SectionHeading>Indian hostel students are financially<br /><span style={{ color: "rgba(255,255,255,0.25)" }}>flying blind, every single month.</span></SectionHeading>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            {problems.map(({ icon, stat, sub, color }) => {
              const { ref, inView } = useInView();
              return (
                <div key={stat} ref={ref} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "24px 20px", opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: "all 0.7s ease", textAlign: "center" }}>
                  <div style={{ fontSize: "28px", marginBottom: "10px" }}>{icon}</div>
                  <div style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "8px" }}>{stat}</div>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{sub}</p>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "48px", background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderLeft: "3px solid #C27D56", borderRadius: "16px", padding: "28px 32px", maxWidth: "780px", margin: "48px auto 0" }}>
            <p style={{ fontSize: "clamp(14px, 2vw, 17px)", color: "rgba(255,255,255,0.65)", lineHeight: 1.75, fontStyle: "italic" }}>
              "Existing apps demand active manual entry or complex bank PDF parsing. Students try them for 3 days and abandon them. Meanwhile, they keep running out of money mid-month — right when exam pressure peaks — and respond by skipping meals."
            </p>
            <p style={{ fontSize: "11px", color: "#C27D56", marginTop: "14px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>— PocketBuddy Research Report, 2025</p>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD MOCKUP + COPY ───────────────────────────────────────── */}
      <section style={{ padding: "80px 24px 100px", maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
        <div>
          <SectionLabel text="The Dashboard" />
          <SectionHeading style={{ marginBottom: "18px" }}>Your financial runway, live.</SectionHeading>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.42)", lineHeight: 1.75, marginBottom: "28px" }}>One glance tells you everything — days until broke, safe daily spend limit, AI-suggested campus meals, active Wing pools, and your burnout risk index. All computed passively from your UPI notifications.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {["Live runway countdown with exact HH:MM:SS timer", "AI burnout risk score from 5 real behavioral signals", "Hyper-local Bedrock meal suggestions", "Crowdsourced merchant recognition", "Subscription collision calendar"].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#C27D56", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <DashboardMockup />
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{ padding: "70px 24px", background: "linear-gradient(to bottom, transparent, rgba(140,120,83,0.04), transparent)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "40px" }}>
          {[
            { value: "₹0", label: "MANUAL ENTRIES NEEDED" },
            { value: "16+h", label: "BURNOUT DETECTION THRESHOLD" },
            { value: "75%", label: "TOKEN COST REDUCTION VIA RAG" },
            { value: "∞", label: "CAMPUS MERCHANTS MAPPABLE" },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: "center", opacity: statsInView ? 1 : 0, transform: statsInView ? "scale(1)" : "scale(0.85)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, background: "linear-gradient(135deg, #8C7853, #D9A05B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", marginTop: "8px", letterSpacing: "0.1em", fontFamily: "monospace" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY US ───────────────────────────────────────────────────────── */}
      <section id="why-us" style={{ padding: "100px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <SectionLabel text="Why PocketBuddy Wins" />
          <SectionHeading>We built what the others<br /><span style={{ color: "rgba(255,255,255,0.25)" }}>forgot to build.</span></SectionHeading>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.38)", maxWidth: "500px", margin: "16px auto 0", lineHeight: 1.7 }}>Every competitor app requires either your bank credentials, manual input, or ignores the Indian UPI ecosystem entirely. PocketBuddy solves all three.</p>
        </div>
        {/* Comparison table */}
        <div style={{ overflowX: "auto", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.07)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <th style={{ padding: "16px 20px", textAlign: "left", color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.05em", background: "#111111" }}>Feature</th>
                {["PocketBuddy", "Fi Money", "Mint / Walnut", "Splitwise"].map((app, i) => (
                  <th key={app} style={{ padding: "16px 20px", textAlign: "center", fontWeight: 700, background: i === 0 ? "rgba(140,120,83,0.12)" : "#111111", color: i === 0 ? "#C27D56" : "rgba(255,255,255,0.45)", borderLeft: "1px solid rgba(255,255,255,0.05)", letterSpacing: i === 0 ? "0.05em" : 0 }}>
                    {i === 0 && <span style={{ display: "block", fontSize: "9px", color: "#4ade80", marginBottom: "2px" }}>★ THIS</span>}
                    {app}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisons.map(({ feature, us, fi, mint, splitwise }, idx) => {
                const vals = [us, fi, mint, splitwise];
                return (
                  <tr key={feature} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "13px 20px", color: "rgba(255,255,255,0.6)", background: idx % 2 === 0 ? "#0A0A0A" : "transparent", fontWeight: 500 }}>{feature}</td>
                    {vals.map((v, ci) => (
                      <td key={ci} style={{ padding: "13px 20px", textAlign: "center", background: ci === 0 ? (idx % 2 === 0 ? "rgba(140,120,83,0.06)" : "rgba(140,120,83,0.03)") : (idx % 2 === 0 ? "#0A0A0A" : "transparent"), borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
                        {v ? <span style={{ color: ci === 0 ? "#4ade80" : "#6b7280", fontSize: "16px" }}>✓</span> : <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "14px" }}>—</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 3 differentiators */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "48px" }}>
          {[
            { icon: "🔒", title: "No Bank Access Ever", body: "PocketBuddy never asks for your bank login, MPIN, or OTP. It works entirely from UPI push notification strings — publicly visible text on your own device.", accent: "#4ade80" },
            { icon: "🧠", title: "Campus-Native Intelligence", body: "Unlike generic finance apps, PocketBuddy's AI context is scoped to real campus prices, mess schedules, and hostel geography — not internet averages.", accent: "#C27D56" },
            { icon: "🤝", title: "Network Effects by Design", body: "Every merchant classification, every pool created, every check-in improves the experience for every other student on campus. It compounds.", accent: "#5E17EB" },
          ].map(({ icon, title, body, accent }) => {
            const { ref, inView } = useInView();
            return (
              <div key={title} ref={ref} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px 20px", opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: "all 0.7s ease", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px", background: `radial-gradient(circle at top right, ${accent}15, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ fontSize: "26px", marginBottom: "12px" }}>{icon}</div>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>{title}</h4>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>{body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "80px 24px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <SectionLabel text="Core Feature Set" />
            <SectionHeading>Five loops that protect<br /><span style={{ color: "rgba(255,255,255,0.25)" }}>your campus survival.</span></SectionHeading>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "14px" }}>
            {features.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <SectionLabel text="Under The Hood" />
            <SectionHeading>How it actually works</SectionHeading>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "32px", position: "relative" }}>
            <div style={{ position: "absolute", left: "18px", top: "38px", bottom: "38px", width: "1px", background: "linear-gradient(to bottom, #8C7853, transparent)" }} />
            <TimelineStep n="01" title="UPI notification fires" sub="You pay ₹30 at the hostel canteen. Your Android companion app silently intercepts the GPay push string in the background." delay={0} />
            <TimelineStep n="02" title="FastAPI parses the payload" sub="The string hits an async webhook endpoint. Bedrock extracts merchant ID, amount, and timestamp without touching your bank." delay={80} />
            <TimelineStep n="03" title="Merchant gets crowd-classified" sub="If the merchant is new, one 1-tap prompt classifies it globally for your entire campus. Next student gets it automatically." delay={160} />
            <TimelineStep n="04" title="Runway recalculates instantly" sub="Your dashboard updates the days-remaining metric, checks for subscription collisions, and flags burnout risks in real time." delay={240} />
            <TimelineStep n="05" title="AI guard activates if needed" sub="Bedrock cross-references your spending vector against the campus food database and surfaces the cheapest viable meal option near you." delay={320} />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <SectionLabel text="Beta Voices" />
            <SectionHeading>Students who tested it<br /><span style={{ color: "rgba(255,255,255,0.25)" }}>don't want to go back.</span></SectionHeading>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {testimonials.map(({ quote, name, role }, i) => {
              const { ref, inView } = useInView();
              return (
                <div key={name} ref={ref} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px", opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: `all 0.7s ease ${i * 100}ms` }}>
                  <div style={{ fontSize: "20px", color: "#C27D56", marginBottom: "12px", lineHeight: 1 }}>"</div>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: "16px", fontStyle: "italic" }}>{quote}</p>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{name}</p>
                    <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ───────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <SectionLabel text="Architecture" />
          <SectionHeading>Built for speed.<br /><span style={{ color: "rgba(255,255,255,0.25)" }}>Built to scale.</span></SectionHeading>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "12px" }}>
          {[
            { layer: "AI Engine", tech: "Amazon Bedrock", color: "#FF9900" },
            { layer: "Frontend", tech: "React + TanStack", color: "#61DAFB" },
            { layer: "Backend", tech: "FastAPI (Python)", color: "#009688" },
            { layer: "Database", tech: "Supabase + MongoDB", color: "#3ECF8E" },
            { layer: "Native Hook", tech: "Android (Kotlin)", color: "#7B52FF" },
            { layer: "Tunneling", tech: "ngrok (Sandbox)", color: "#1F5FFF" },
          ].map(({ layer, tech, color }) => {
            const { ref, inView } = useInView();
            return (
              <div key={tech} ref={ref} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "18px", opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(18px)", transition: "all 0.6s ease" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, marginBottom: "10px", boxShadow: `0 0 10px ${color}66` }} />
                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: "3px" }}>{layer}</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{tech}</div>
              </div>
            );
          })}
        </div>

        {/* Architecture flow */}
        <div style={{ marginTop: "40px", background: "#111111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px 28px" }}>
          <p style={{ fontSize: "9px", color: "#C27D56", letterSpacing: "0.15em", fontFamily: "monospace", marginBottom: "16px" }}>DATA FLOW</p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
            {["Android Companion", "→", "UPI Push String", "→", "FastAPI Webhook", "→", "Bedrock Extraction", "→", "MongoDB", "→", "React Dashboard"].map((item, i) => (
              <span key={i} style={{ color: item === "→" ? "rgba(255,255,255,0.15)" : i === 0 ? "#4ade80" : i === 10 ? "#C27D56" : "rgba(255,255,255,0.5)", fontWeight: item === "→" ? 300 : 600 }}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <SectionLabel text="FAQ" />
            <SectionHeading>Questions we get asked<br /><span style={{ color: "rgba(255,255,255,0.25)" }}>every time we demo.</span></SectionHeading>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {faqs.map(({ q, a }, i) => (
              <div key={i} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", transition: "border-color 0.2s", borderColor: openFaq === i ? "rgba(140,120,83,0.3)" : "rgba(255,255,255,0.07)" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", textAlign: "left", padding: "18px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>{q}</span>
                  <span style={{ color: "#C27D56", fontSize: "18px", flexShrink: 0, transition: "transform 0.3s", transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 18px", fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.75 }}>{a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px 120px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", background: "linear-gradient(135deg, rgba(140,120,83,0.12), rgba(194,125,86,0.06))", border: "1px solid rgba(140,120,83,0.2)", borderRadius: "28px", padding: "64px 40px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "400px", height: "200px", background: "radial-gradient(ellipse at 50% 0%, rgba(140,120,83,0.22), transparent 70%)", pointerEvents: "none" }} />
          <SectionLabel text="Don't Go Broke Before Exams" />
          <SectionHeading style={{ marginBottom: "18px" }}>Your financial guard<br />is one tap away.</SectionHeading>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.42)", marginBottom: "36px", lineHeight: 1.65 }}>Free for all campus students. No credit card. No complex setup.<br />Just install the Android companion and you're live in 60 seconds.</p>
          <Link to="/login" id="footer-cta" style={{ display: "inline-block", padding: "15px 36px", borderRadius: "100px", fontSize: "14px", fontWeight: 700, color: "#0A0A0A", background: "linear-gradient(135deg, #8C7853, #C27D56)", textDecoration: "none", letterSpacing: "0.03em", boxShadow: "0 0 40px rgba(140,120,83,0.5), 0 4px 24px rgba(0,0,0,0.4)" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "scale(1.04)"; el.style.boxShadow = "0 0 60px rgba(140,120,83,0.65), 0 4px 24px rgba(0,0,0,0.4)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "scale(1)"; el.style.boxShadow = "0 0 40px rgba(140,120,83,0.5), 0 4px 24px rgba(0,0,0,0.4)"; }}>
            Create Free Account →
          </Link>
          {/* Trust badges */}
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "32px", flexWrap: "wrap" }}>
            {["🔒 No bank access", "📱 Works offline", "🎓 Built for India", "⚡ Setup in 60s"].map((b) => (
              <span key={b} style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "28px 24px", maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "linear-gradient(135deg, #8C7853, #D9A05B)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontWeight: 900, fontSize: "10px", color: "#0A0A0A" }}>P</span>
          </div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>PocketBuddy</span>
        </div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.18)", fontFamily: "monospace" }}>CAMPUS FINANCIAL GUARD · AWS HACKATHON 2025 · THEME 4: AI FOR CAMPUS</div>
        <Link to="/login" style={{ fontSize: "12px", color: "#C27D56", textDecoration: "none", fontWeight: 600 }}>Sign In →</Link>
      </footer>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes bounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-8px); } }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #1E1E1E; border-radius: 2px; }
        @media (max-width: 768px) {
          nav > div:last-child > a:not(:last-child):not(:nth-last-child(2)) { display: none; }
          section[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          section[style*="grid-template-columns: repeat(4, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }
          section[style*="grid-template-columns: repeat(3, 1fr)"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
