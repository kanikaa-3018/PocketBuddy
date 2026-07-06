import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  Landmark,
  LockKeyhole,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getAccountAggregatorInstitutions } from "@/lib/api/db.functions";

const RANGE_OPTIONS = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "180 days" },
];

export type BankConsentPayload = {
  bankCode: string;
  bankName: string;
  bankShortName?: string;
  requestedRangeDays: number;
  aaHandle?: string;
};

type AAInstitution = {
  id: string;
  name: string;
  short_name?: string;
  type?: string;
  regulator?: string;
  status?: string;
  logo_url?: string;
};

type AAInstitutionResponse = {
  source?: string;
  source_url?: string;
  institutions?: AAInstitution[];
};

type BankConsentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: BankConsentPayload) => void;
  busy?: boolean;
};

export function BankConsentDialog({
  open,
  onOpenChange,
  onConfirm,
  busy = false,
}: BankConsentDialogProps) {
  const [selectedBankId, setSelectedBankId] = useState("");
  const [requestedRangeDays, setRequestedRangeDays] = useState(30);
  const [aaHandle, setAaHandle] = useState("");
  const [search, setSearch] = useState("");

  const { data: institutionData, isLoading, isError } = useQuery<AAInstitutionResponse>({
    queryKey: ["aa-institutions"],
    enabled: open,
    queryFn: () => getAccountAggregatorInstitutions(),
    staleTime: 10 * 60 * 1000,
  });

  const institutions = institutionData?.institutions ?? [];
  const filteredInstitutions = institutions
    .filter((institution) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        institution.name.toLowerCase().includes(q) ||
        (institution.short_name || "").toLowerCase().includes(q) ||
        (institution.type || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 24);
  const selectedBank =
    institutions.find((institution) => institution.id === selectedBankId) ??
    filteredInstitutions[0] ??
    institutions[0];

  function submitConsent() {
    if (!selectedBank) return;
    onConfirm({
      bankCode: selectedBank.id,
      bankName: selectedBank.name,
      bankShortName: selectedBank.short_name,
      requestedRangeDays,
      aaHandle: aaHandle.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-2xl">
        <div className="border-b border-border bg-surface-raised px-5 py-4 sm:px-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Landmark className="h-4 w-4" />
              </span>
              <Badge variant="outline" className="border-primary/30 bg-background/70 text-[10px] text-primary">
                RBI-regulated AA flow
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                Consent only
              </Badge>
            </div>
            <DialogTitle className="text-[18px] font-semibold tracking-tight text-foreground">
              Connect your bank securely
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed text-muted-foreground">
              PocketBuddy uses the Account Aggregator consent model: you choose the bank, review what data is shared, and can revoke access anytime.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="grid gap-2 sm:grid-cols-3">
            <TrustPill icon={<ShieldCheck className="h-4 w-4" />} title="RBI framework" body="Consent-based financial data sharing" />
            <TrustPill icon={<LockKeyhole className="h-4 w-4" />} title="No credentials" body="No password, OTP, MPIN, or payment access" />
            <TrustPill icon={<BadgeCheck className="h-4 w-4" />} title="User controlled" body="Approve, review, revoke, or retry" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-semibold text-foreground">Choose your bank</p>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {institutionData?.source || "AA institution registry"}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bank or financial institution"
                className="h-10 pl-9 text-[12px]"
              />
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border bg-background/70 p-2">
              {isLoading ? (
                <RegistryState icon={<Clock3 className="h-4 w-4" />} title="Loading institution registry" body="Fetching supported Account Aggregator institutions." />
              ) : isError ? (
                <RegistryState icon={<AlertCircle className="h-4 w-4" />} title="Registry unavailable" body="Institution registry could not be loaded. Try again after checking backend connectivity." />
              ) : filteredInstitutions.length === 0 ? (
                <RegistryState icon={<Search className="h-4 w-4" />} title="No institution found" body="Try searching by full bank name, short name, or institution type." />
              ) : (
                filteredInstitutions.map((institution) => {
                  const selected = institution.id === (selectedBank?.id || selectedBankId);
                  return (
                    <button
                      key={institution.id}
                      type="button"
                      onClick={() => setSelectedBankId(institution.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-primary/45 bg-primary/10"
                          : "border-transparent bg-surface/70 hover:border-primary/25 hover:bg-surface-raised"
                      }`}
                    >
                      <InstitutionIcon institution={institution} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-foreground">{institution.name}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {institution.type || "Bank"} · {institution.regulator || "RBI"} · {institution.status || "Available"}
                        </span>
                      </span>
                      {selected ? <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-primary" /> : null}
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Source: {institutionData?.source || "AA institution registry"}
              {institutionData?.source_url ? ` · ${institutionData.source_url}` : ""}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Database className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[12px] font-semibold text-foreground">Consent request</p>
                  <Badge variant="outline" className="w-fit text-[9px] text-muted-foreground">
                    Financial information only
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 text-[11px] text-muted-foreground sm:grid-cols-2">
                  <ConsentFact label="Purpose" value="Verify transactions for budgeting and runway insights" />
                  <ConsentFact label="Data type" value="Deposit account transactions only" />
                  <ConsentFact label="Access" value="Read-only; PocketBuddy cannot move money" />
                  <ConsentFact label="Bank selected" value={selectedBank?.name || "Select a bank above"} />
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold text-foreground">Transaction history range</p>
                  <div className="grid grid-cols-3 gap-2">
                    {RANGE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRequestedRangeDays(option.value)}
                        className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors ${
                          requestedRangeDays === option.value
                            ? "border-primary/45 bg-primary/10 text-primary"
                            : "border-border bg-surface text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-raised/60 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground">AA handle or mobile number</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Used by the Account Aggregator to discover linked accounts. You can leave it blank and continue with bank selection.
                </p>
                <Input
                  value={aaHandle}
                  onChange={(event) => setAaHandle(event.target.value)}
                  placeholder="example@aa or registered mobile number"
                  className="mt-3 h-9 text-[12px]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-success/25 bg-success/10 p-3">
            <div className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Nothing is fetched until consent is approved. If you revoke or pause later, new bank-source fetches stop.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-surface-raised px-5 py-4 sm:px-6">
          <Button variant="outline" className="h-9 text-xs" disabled={busy} onClick={() => onOpenChange(false)}>
            Do this later
          </Button>
          <Button className="h-9 text-xs" disabled={busy || !selectedBank} onClick={submitConsent}>
            {busy ? "Starting consent..." : "Continue to consent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstitutionIcon({ institution }: { institution: AAInstitution }) {
  const label = (institution.short_name || institution.name.slice(0, 3)).toUpperCase();
  if (institution.logo_url) {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white">
        <img src={institution.logo_url} alt="" className="h-full w-full object-contain p-1.5" />
      </span>
    );
  }
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface-raised text-[10px] font-black text-foreground">
      {label.slice(0, 4)}
    </span>
  );
}

function RegistryState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface/70 p-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-[12px] font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function TrustPill({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="text-[11px] font-semibold text-foreground">{title}</p>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function ConsentFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-snug text-foreground">{value}</p>
    </div>
  );
}
