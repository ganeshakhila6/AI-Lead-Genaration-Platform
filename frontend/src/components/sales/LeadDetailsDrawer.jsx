import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import StatusBadge from "../common/StatusBadge.jsx";
import CompanyResearch from "./CompanyResearch.jsx";
import EmailEditor from "./EmailEditor.jsx";

export default function LeadDetailsDrawer({
  lead,
  onClose,
  onGenerateEmail,
  onSaveDraft,
  onRejectDraft,
  onApproveAndSend,
  initialTab = "Research",
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, lead?.id]);

  useEffect(() => {
    if (!lead) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lead, onClose]);

  if (!lead) return null;

  const isConsentVerified =
    lead.consent === "Opt-in recorded" && Boolean(lead.consentEvidence);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <aside
        aria-labelledby="lead-drawer-title"
        aria-modal="true"
        className="flex h-full w-full max-w-[560px] flex-col border-l border-line bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Building2 size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="text-sm font-semibold text-ink"
                id="lead-drawer-title"
              >
                {lead.company}
              </h2>
              <StatusBadge>{lead.qualification}</StatusBadge>
            </div>
            <p className="mt-1 truncate text-xs text-muted">
              {lead.industry} · {lead.location}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700">
              {lead.score} / 100
            </span>
            <button
              aria-label="Close lead details"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-line bg-slate-50/70">
          {[
            ["Research", Building2],
            ["Email review", Mail],
          ].map(([label, Icon]) => (
            <button
              aria-pressed={activeTab === label}
              className={`flex items-center justify-center gap-2 border-b-2 py-3 text-xs font-medium ${
                activeTab === label
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              key={label}
              onClick={() => setActiveTab(label)}
              type="button"
            >
              <Icon size={14} />
              {label}
              {label === "Email review" && lead.draft && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {activeTab === "Research" ? (
            <div className="space-y-5">
              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Phone number
                </h3>
                <div className="mt-2 rounded-lg border border-line p-3">
                  <p className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone size={14} className="shrink-0 text-slate-400" />
                    {lead.phone || "No phone number found"}
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Contact eligibility
                </h3>
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                  {isConsentVerified ? (
                    <CheckCircle2
                      className="mt-0.5 shrink-0 text-emerald-700"
                      size={15}
                    />
                  ) : (
                    <AlertTriangle
                      className="mt-0.5 shrink-0 text-amber-700"
                      size={15}
                    />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-amber-900">
                      {lead.consent}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-amber-800">
                      {lead.consentEvidence
                        ? `Recorded evidence: ${lead.consentEvidence}. Verify its source before approving campaign email.`
                        : "No opt-in evidence is available. Use only the separate initial permission-request workflow where permitted; do not send opted-in campaign email."}
                    </p>
                    <p className="mt-1 text-[10px] text-amber-800">
                      Contact source: {lead.source}
                    </p>
                  </div>
                </div>
              </section>

              <CompanyResearch lead={lead} />

              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-600">
                <ShieldCheck className="shrink-0" size={14} />
                Review the source and verify consent records before sending
                opted-in marketing email.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-800">
                  Draft approval
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-muted">
                  Review the copy and recipient eligibility. The FastAPI
                  service enforces approval, consent, suppression, and
                  duplicate-send checks before contacting Brevo.
                </p>
              </div>
              <EmailEditor
                draft={lead.draft}
                lead={lead}
                onApproveAndSend={onApproveAndSend}
                onChange={(draft) => onSaveDraft(lead, draft, false)}
                onGenerate={onGenerateEmail}
                onReject={onRejectDraft}
                onSave={(targetLead, draft) =>
                  onSaveDraft(targetLead, draft, true)
                }
              />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
