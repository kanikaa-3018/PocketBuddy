import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { signUpFn, signInWithPasswordFn, signInWithPhoneFn } from "@/lib/api/auth.functions";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("pb_session_token") : null;
    if (token) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

type Mode = "signin" | "signup";
type Tab = "email" | "phone";

function LoginPage() {
  const nav = useNavigate();
  const { session, loading, login } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("email");
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  async function handleEmail() {
    if (!email || !password) {
      toast.error("Enter email and password");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!fullName) {
          toast.error("Enter your full name");
          return;
        }
        const result = await signUpFn({ data: { email, password, fullName } });
        if (result && result.user) {
          login(result.sessionToken, result.user);
          toast.success("Account created!");
          nav({ to: "/onboarding", replace: true });
        } else {
          toast.error("Sign up failed");
        }
      } else {
        const result = await signInWithPasswordFn({ data: { email, password } });
        if (result && result.user) {
          login(result.sessionToken, result.user);
          toast.success("Signed in!");
          nav({ to: "/dashboard", replace: true });
        } else {
          toast.error("Invalid credentials");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setBusy(false);
    }
  }

  async function handlePhone() {
    if (!phone || phone.length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
    if (!otpSent) {
      setOtpSent(true);
      toast.success("OTP sent (demo: enter any 6 digits)");
      return;
    }
    if (otp.length !== 6) {
      toast.error("Invalid OTP");
      return;
    }
    setBusy(true);
    try {
      const result = await signInWithPhoneFn({ data: { phone, fullName: fullName || "Student" } });
      if (result && result.user) {
        login(result.sessionToken, result.user);
        toast.success("Signed in!");
        nav({ to: "/dashboard", replace: true });
      } else {
        toast.error("Could not verify OTP");
      }
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Cinematic ambient light overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[360px] relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-[0_0_24px_rgba(255,107,0,0.25)] mb-4">
            <span className="text-[#0A0A0A] font-black text-xl leading-none tracking-tighter">P</span>
          </div>
          <h1
            id="logo-login"
            className="text-[22px] font-black tracking-[0.25em] text-foreground uppercase"
          >
            POCKETBUDDY
          </h1>
          <p className="mt-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Campus Financial Guard
          </p>
        </div>

        <div className="flex bg-surface-raised border border-border rounded-full p-1 max-w-[200px] mx-auto text-[10px] font-bold uppercase tracking-wider">
          <button
            id="tab-login-email"
            onClick={() => setTab("email")}
            className={`flex-1 py-1.5 rounded-full transition-all duration-150 cursor-pointer ${tab === "email" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Email
          </button>
          <button
            id="tab-login-phone"
            onClick={() => setTab("phone")}
            className={`flex-1 py-1.5 rounded-full transition-all duration-150 cursor-pointer ${tab === "phone" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Phone
          </button>
        </div>

        <div className="mt-8 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Full Name</label>
              <Input
                placeholder="Student Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                id="input-login-name"
                className="h-10"
              />
            </div>
          )}
          {tab === "email" ? (
            <>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Email Address</label>
                <Input
                  id="input-login-email"
                  type="email"
                  placeholder="name@institute.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Password</label>
                <Input
                  id="input-login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="h-10"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Phone Number</label>
                <div className="flex items-center rounded-md border border-border bg-surface-raised/40 focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/40 hover:border-white/15 transition-all">
                  <span className="px-3 text-xs text-muted-foreground font-bold border-r border-border">+91</span>
                  <input
                    id="input-login-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-transparent py-2.5 px-3 text-xs outline-none placeholder:text-muted-foreground/50 text-foreground"
                  />
                </div>
              </div>
              {otpSent && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">One-Time Password</label>
                  <Input
                    id="input-login-otp"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="h-10 font-mono tracking-[0.2em] text-center"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6">
          {busy ? (
            <Skeleton className="h-10 w-full rounded-md bg-white/5" />
          ) : (
            <Button
              id={mode === "signup" ? "btn-create-account" : "btn-sign-in"}
              onClick={tab === "email" ? handleEmail : handlePhone}
              className="w-full h-10 bg-foreground text-background font-black uppercase tracking-wider text-xs shadow-md transition-all duration-150"
            >
              {tab === "phone" && !otpSent
                ? "Send OTP"
                : mode === "signup"
                  ? "Create Account"
                  : tab === "phone"
                    ? "Verify & Sign In"
                    : "Sign In"}
            </Button>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            id="link-create-account"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="text-[11px] font-bold tracking-wide text-primary hover:text-primary/80 transition-colors uppercase cursor-pointer"
          >
            {mode === "signup" ? "Have an account? Sign in" : "New student? Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}
