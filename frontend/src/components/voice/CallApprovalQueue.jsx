import { AlertCircle, Phone, ShieldCheck } from "lucide-react";

export default function CallApprovalQueue({ leads, loading, error }) {
  const leadsWithPhones = leads.filter((lead) => lead.phone);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-panel">
      <div className="border-b border-line px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Lead call queue</h2>
            <p className="mt-1 text-xs text-muted">
              Review phone availability. Every call will require human
              eligibility review and approval.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-900">
            <AlertCircle size={13} />
            Approval and calling not connected
          </span>
        </div>
      </div>

      <div className="grid gap-3 border-b border-line bg-slate-50/60 p-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Leads loaded
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">
            {loading ? "—" : leads.length}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-white p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Have a phone number
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">
            {loading ? "—" : leadsWithPhones.length}
          </p>
        </div>
      </div>

      {error ? (
        <p className="p-5 text-xs text-rose-700">{error}</p>
      ) : loading ? (
        <p className="p-5 text-xs text-slate-500">Loading leads…</p>
      ) : leads.length === 0 ? (
        <p className="p-8 text-center text-xs text-slate-500">
          No leads are available yet. Generate or import leads to review them
          here.
        </p>
      ) : (
        <div className="divide-y divide-line">
          {leads.map((lead) => (
            <div
              className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"
              key={lead.id}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Phone size={15} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {lead.company}
                  </p>
                  <p className="mt-1 break-all text-[11px] text-slate-500">
                    {lead.phone || "No phone number found"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 self-start rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800 sm:self-center">
                <ShieldCheck size={12} />
                Human review required
              </span>
              <button
                className="h-8 shrink-0 rounded-lg border border-line bg-slate-50 px-3 text-[10px] font-semibold text-slate-400 disabled:cursor-not-allowed"
                disabled
                title="Call approval and provider integration are not connected."
                type="button"
              >
                Call unavailable
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="border-t border-line bg-slate-50/60 px-4 py-3 text-[10px] leading-4 text-slate-500 sm:px-5">
        A public phone number is not proof of permission to call. No calls are
        queued or placed from this preview.
      </p>
    </section>
  );
}
