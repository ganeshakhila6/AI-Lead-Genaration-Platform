import {
  AlertCircle,
  Check,
  Eye,
  Mail,
  PhoneCall,
  Send,
  X,
} from "lucide-react";
import { useState } from "react";

export default function BulkActionToolbar({
  selectedCount,
  viewableCount,
  approvedCount,
  totalLeadCount,
  onGenerateSelected,
  onViewSelected,
  onSendApproved,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-3 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-brand-50 px-1.5 font-semibold text-brand-700">
            {selectedCount}
          </span>
          <span className="text-slate-600">selected</span>
          {selectedCount === 0 && (
            <span className="hidden text-slate-400 sm:inline">
              Select prospects to generate drafts
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={selectedCount === 0}
            onClick={onGenerateSelected}
            type="button"
          >
            <Mail size={15} />
            Generate emails for selected
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={viewableCount === 0}
            onClick={onViewSelected}
            type="button"
          >
            <Eye size={15} />
            View selected drafts
            {viewableCount > 0 && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">
                {viewableCount}
              </span>
            )}
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            disabled={approvedCount === 0}
            onClick={() => setConfirmOpen(true)}
            type="button"
          >
            <Send size={14} />
            Send all approved
            {approvedCount > 0 && (
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px]">
                {approvedCount}
              </span>
            )}
          </button>
          <button
            aria-label={`Call all ${totalLeadCount} leads`}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-slate-50 px-3 text-xs font-semibold text-slate-500 disabled:cursor-not-allowed"
            disabled
            title="AI voice calling is not connected yet."
            type="button"
          >
            <PhoneCall size={14} />
            Call all ({totalLeadCount}) · Coming soon
          </button>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmOpen(false);
          }}
          role="presentation"
        >
          <section
            aria-labelledby="bulk-send-title"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-line bg-white p-5 shadow-xl"
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <AlertCircle size={18} />
              </span>
              <div>
                <h2
                  className="text-sm font-semibold text-ink"
                  id="bulk-send-title"
                >
                  Review approved sends
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {approvedCount} individually approved draft
                  {approvedCount === 1 ? "" : "s"} will be checked against
                  suppression, consent, and duplicate-send rules before sending.
                </p>
              </div>
              <button
                aria-label="Close confirmation"
                className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100"
                onClick={() => setConfirmOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="flex items-start gap-2 text-xs leading-5 text-amber-900">
                <AlertCircle className="mt-0.5 shrink-0" size={14} />
                Sending contacts a real recipient through Brevo. Each draft is
                revalidated by FastAPI before it is sent.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-9 rounded-lg border border-line px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                disabled={approvedCount === 0}
                onClick={() => {
                  setConfirmOpen(false);
                  onSendApproved?.();
                }}
                type="button"
              >
                <Check size={14} />
                Confirm send
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
