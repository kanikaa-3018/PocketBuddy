import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { seedDemoData } from "@/lib/seed.functions.js";
import { getProfile, updateProfile } from "@/lib/api/db.functions.js";

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  component: Onboarding,
});

const UPI_OPTIONS = ["Google Pay", "PhonePe", "Paytm", "Amazon Pay", "CRED"] as const;
const COLLEGES = [
  "ABV-IIITM Gwalior",
  "IIT Delhi",
  "IIT Bombay",
  "NIT Trichy",
  "BITS Pilani",
  "NIT Warangal",
  "IIIT Hyderabad",
  "Other",
] as const;
const CYCLE_DAYS = [
  { v: 1, l: "1st of month" },
  { v: 5, l: "5th" },
  { v: 10, l: "10th" },
  { v: 15, l: "15th" },
  { v: 28, l: "Last day" },
];

function randomPairingCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "PB-";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [allowance, setAllowance] = useState("8000");
  const [cycleDay, setCycleDay] = useState("1");
  const [college, setCollege] = useState("ABV-IIITM Gwalior");
  const [hostel, setHostel] = useState("BH-2");
  const [wing, setWing] = useState("Wing 4B");
  const [room, setRoom] = useState("412");

  // Step 2
  const [mess, setMess] = useState(true);
  const [meals, setMeals] = useState<{ breakfast: boolean; lunch: boolean; dinner: boolean }>({
    breakfast: false,
    lunch: true,
    dinner: true,
  });
  const [examStart, setExamStart] = useState("");
  const [examEnd, setExamEnd] = useState("");
  const [upiApps, setUpiApps] = useState<string[]>([]);

  // Step 3
  const pairingCode = useMemo(() => randomPairingCode(), []);

  // Pre-fill from existing profile
  useEffect(() => {
    if (!user) return;
    getProfile()
      .then((data) => {
        if (!data) return;
        if (data.monthly_allowance) setAllowance(String(Math.round(data.monthly_allowance / 100)));
        if (data.cycle_start_day) setCycleDay(String(data.cycle_start_day));
        if (data.college_name) setCollege(data.college_name);
        if (data.hostel_block) setHostel(data.hostel_block);
        if (data.wing_label) setWing(data.wing_label);
        if (data.room_number) setRoom(data.room_number);
      })
      .catch((err) => console.error("Onboarding profile load error:", err));
  }, [user]);

  async function saveStep1() {
    if (!user) return;
    if (!allowance || !hostel || !wing || !room) {
      toast.error("Fill all fields");
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        data: {
          monthly_allowance: Math.round(parseFloat(allowance) * 100),
          cycle_start_day: parseInt(cycleDay, 10),
          college_name: college,
          hostel_block: hostel,
          wing_label: wing,
          room_number: room,
        },
      });
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to save details");
    } finally {
      setBusy(false);
    }
  }

  async function saveStep2() {
    if (!user) return;
    setBusy(true);
    try {
      await updateProfile({
        data: {
          mess_enrolled: mess,
          meal_schedule: meals,
          upi_apps_used: upiApps.map((a) => a.toLowerCase().replace(/\s+/g, "")),
          exam_start_date: examStart || null,
          exam_end_date: examEnd || null,
        },
      });
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Failed to save details");
    } finally {
      setBusy(false);
    }
  }

  async function finish(connectCompanion: boolean) {
    if (!user) return;
    setBusy(true);
    try {
      await updateProfile({
        data: {
          onboarding_completed: true,
          setup_completed: true,
          pairing_code: pairingCode,
          companion_paired: false,
          companion_device_name: null,
          companion_last_sync: null,
        },
      });
      // Seed demo data
      try {
        await seedDemoData();
      } catch (e) {
        console.warn("seed", e);
      }
      if (connectCompanion) {
        toast.success("Profile saved. Finish Android setup from the companion page.");
        nav({ to: "/companion", replace: true });
        return;
      }
      toast.success("Welcome. You can add expenses manually.");
      nav({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to complete onboarding");
    } finally {
      setBusy(false);
    }
  }

  function toggleUpi(app: string) {
    setUpiApps((prev) => (prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]));
  }

  const StepBar = ({ currentStep }: { currentStep: number }) => (
    <div className="flex gap-2 w-full max-w-[280px] mx-auto mb-10">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex-1 h-0.5 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full bg-primary transition-all duration-300 ${
              s <= currentStep ? "w-full" : "w-0"
            }`}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Cinematic light overlay */}
      <div className="absolute top-0 right-0 h-[350px] w-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-[400px] relative z-10">
        <StepBar currentStep={step} />

        {step === 1 && (
          <div id="onboarding-step-1" className="space-y-6">
            <div className="mb-2">
              <h2 className="text-[20px] font-black tracking-tight text-foreground uppercase">Campus Financial Guard</h2>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Set up your profile in 60 seconds. No bank logins needed.
              </p>
            </div>
            
            <Field
              label="Monthly Allowance"
              helper="Total amount you receive each month from family"
            >
              <div className="flex items-center rounded-md border border-border bg-surface-raised/40 hover:border-white/15 focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/40 transition-all">
                <span className="px-3 text-xs text-muted-foreground font-bold border-r border-border">₹</span>
                <input
                  id="input-ob-allowance"
                  type="number"
                  value={allowance}
                  onChange={(e) => setAllowance(e.target.value)}
                  className="flex-1 bg-transparent py-2.5 px-3 text-xs outline-none text-foreground"
                />
              </div>
            </Field>

            <Field label="Allowance Arrives On" helper="Day your allowance hits your account">
              <Select value={cycleDay} onValueChange={setCycleDay}>
                <SelectTrigger id="select-ob-cycle" className="h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CYCLE_DAYS.map((d) => (
                    <SelectItem key={d.v} value={String(d.v)}>
                      {d.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="College">
              <Select value={college} onValueChange={setCollege}>
                <SelectTrigger id="select-ob-college" className="h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLLEGES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Hostel Block">
                <Input
                  id="input-ob-hostel"
                  value={hostel}
                  onChange={(e) => setHostel(e.target.value)}
                  className="h-10"
                />
              </Field>
              <Field label="Room Number">
                <Input 
                  id="input-ob-room" 
                  value={room} 
                  onChange={(e) => setRoom(e.target.value)} 
                  className="h-10"
                />
              </Field>
            </div>

            <Field
              label="Wing / Corridor"
              helper="Used to group delivery fee pooling with neighbors"
            >
              <Input 
                id="input-ob-wing" 
                value={wing} 
                onChange={(e) => setWing(e.target.value)} 
                className="h-10"
              />
            </Field>

            <Button id="btn-ob-next-1" className="w-full h-10 bg-foreground text-background font-black uppercase tracking-wider text-xs shadow-md mt-2" onClick={saveStep1} disabled={busy}>
              Next Step →
            </Button>
          </div>
        )}

        {step === 2 && (
          <div id="onboarding-step-2" className="space-y-6">
            <div className="mb-2">
              <h2 className="text-[20px] font-black tracking-tight text-foreground uppercase">Your Daily Routine</h2>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Helps us spot study stress and meal-skipping patterns.
              </p>
            </div>

            <Field label="Enrolled in Hostel Mess?">
              <div id="toggle-ob-mess" className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMess(true)}
                  className={`rounded-md border p-3.5 text-left text-xs transition-all cursor-pointer ${mess ? "border-primary bg-primary/5 font-semibold text-foreground" : "border-border bg-surface-raised/40 text-muted-foreground hover:border-white/10"}`}
                >
                  <p className="font-bold">Yes</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Mess enrolled</p>
                </button>
                <button
                  onClick={() => setMess(false)}
                  className={`rounded-md border p-3.5 text-left text-xs transition-all cursor-pointer ${!mess ? "border-primary bg-primary/5 font-semibold text-foreground" : "border-border bg-surface-raised/40 text-muted-foreground hover:border-white/10"}`}
                >
                  <p className="font-bold">No</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Self-catering</p>
                </button>
              </div>
            </Field>

            {mess && (
              <Field label="Meals You Typically Eat">
                <div id="pills-ob-meals" className="flex gap-2">
                  {(["breakfast", "lunch", "dinner"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMeals({ ...meals, [m]: !meals[m] })}
                      className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${meals[m] ? "bg-primary border-primary text-primary-foreground" : "bg-surface-raised border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Upcoming Exams (Optional)</label>
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="input-ob-exam-start"
                  type="date"
                  value={examStart}
                  onChange={(e) => setExamStart(e.target.value)}
                  className="h-10 text-xs"
                />
                <Input
                  id="input-ob-exam-end"
                  type="date"
                  value={examEnd}
                  onChange={(e) => setExamEnd(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-500 pl-1 leading-normal">
                We will monitor your schedule during this stressful period.
              </p>
            </div>

            <Field label="UPI Apps You Use">
              <div id="pills-ob-upi" className="flex flex-wrap gap-2">
                {UPI_OPTIONS.map((app) => {
                  const on = upiApps.includes(app);
                  return (
                    <button
                      key={app}
                      onClick={() => toggleUpi(app)}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${on ? "bg-primary border-primary text-primary-foreground" : "bg-surface-raised border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {app}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4 items-center pt-2">
              <button
                onClick={() => setStep(1)}
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground text-left py-2 transition-colors cursor-pointer"
              >
                ← Back
              </button>
              <Button id="btn-ob-next-2" onClick={saveStep2} disabled={busy} className="h-10 bg-foreground text-background font-black uppercase tracking-wider text-xs shadow-md">
                Next Step →
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div id="onboarding-step-3" className="space-y-6">
            <div className="mb-2">
              <h2 className="text-[20px] font-black tracking-tight text-foreground uppercase">Auto-Track Expense</h2>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pair with the Android connector app to capture UPI transactions in real-time.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { e: "01", l: "Get App" },
                { e: "02", l: "Grant Access" },
                { e: "03", l: "Instant Sync" },
              ].map((c) => (
                <div
                  key={c.l}
                  className="rounded-lg bg-surface-raised border border-border p-3 text-center"
                >
                  <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
                    {c.e}
                  </div>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">{c.l}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-surface-raised/40 p-4 space-y-1">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                Android Webhook Integration
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Build and install the connector from the repository Android module. You will paste this webhook pairing profile on the setup screen.
              </p>
            </div>

            <div className="text-center bg-surface-raised border border-border rounded-xl p-5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Pairing Code</p>
              <div
                id="text-pairing-code"
                className="mt-2 inline-block rounded-md bg-background border border-border px-6 py-2.5 text-[22px] font-black tracking-[4px] text-primary font-mono shadow-inner"
              >
                {pairingCode}
              </div>
              <p className="mt-2 text-[10px] text-zinc-500 leading-normal">
                This code associates your device webhook with this account profile.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                id="btn-ob-continue-companion"
                onClick={() => finish(true)}
                disabled={busy}
                className="w-full h-10 bg-foreground text-background font-black uppercase tracking-wider text-xs shadow-md"
              >
                Continue to Sync Setup
              </Button>
              <button
                id="link-ob-skip"
                onClick={() => finish(false)}
                disabled={busy}
                className="w-full text-center text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground py-2 transition-colors cursor-pointer"
              >
                Skip — I will log manually
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{label}</label>
      <div>{children}</div>
      {helper && <p className="text-[10px] text-zinc-500 pl-1 leading-normal">{helper}</p>}
    </div>
  );
}
