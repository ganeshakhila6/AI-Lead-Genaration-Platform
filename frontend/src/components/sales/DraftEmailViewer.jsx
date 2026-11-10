import { useEffect } from "react";
import { Eye, X } from "lucide-react";

export default function DraftEmailViewer({ leads, onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!leads.length) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="draft-viewer-title"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-line bg-white shadow-xl"
        role="dialog"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Eye size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              className="text-sm font-semibold text-ink"
              id="draft-viewer-title"
            >
              Generated draft emails
            </h2>
            <p className="mt-1 text-xs text-muted">
              {leads.length} saved draft{leads.length === 1 ? "" : "s"} · not
              sent
            </p>
          </div>
          <button
            aria-label="Close draft viewer"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </header>
        <div className="space-y-4 overflow-y-auto p-5">
          {leads.map((lead) => (
            <article
              className="overflow-hidden rounded-lg border border-line"
              key={lead.id}
            >
              <div className="border-b border-line bg-slate-50 px-4 py-3">
                <h3 className="text-xs font-semibold text-slate-800">
                  {lead.company}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">{lead.email}</p>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Subject
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-800">
                    {lead.draft.subject}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Email
                  </p>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-xs leading-5 text-slate-700">
                    {lead.draft.body}
                  </pre>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
