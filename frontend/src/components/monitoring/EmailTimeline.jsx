import { useEffect } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  MailOpen,
  MousePointer2,
  Reply,
  X,
} from "lucide-react";
import StatusBadge from "../common/StatusBadge.jsx";

export default function EmailTimeline({ event, onClose }) {
  useEffect(() => {
    if (!event) return undefined;
    function onKeyDown(keyEvent) {
      if (keyEvent.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [event, onClose]);

  if (!event) return null;

  const defaultSteps = [
    {
      label: event.status === "Sent" ? "Accepted by Brevo" : "Send attempted",
      Icon: ArrowUpRight,
      visible: true,
    },
    {
      label: "Delivered",
      Icon: CheckCircle2,
      visible: ["Delivered", "Opened", "Clicked", "Unsubscribed"].includes(
        event.status,
      ),
    },
    { label: "Opened", Icon: MailOpen, visible: event.opened },
    { label: "Link clicked", Icon: MousePointer2, visible: event.clicked },
    {
      label: "Bounced",
      Icon: AlertTriangle,
      visible: event.status === "Bounced",
    },
    {
      label: "Unsubscribed",
      Icon: X,
      visible: event.status === "Unsubscribed",
    },
  ].filter((step) => step.visible);
  const eventIcons = {
    click: MousePointer2,
    opened: MailOpen,
    first_opening: MailOpen,
    proxy_open: MailOpen,
    unique_proxy_open: MailOpen,
    hard_bounce: AlertTriangle,
    soft_bounce: AlertTriangle,
    unsubscribed: X,
    delivered: CheckCircle2,
    replied: Reply,
  };
  const steps = event.timeline?.length
    ? event.timeline.map((item) => ({
        label: item.status,
        date: item.date,
        detail: item.reason,
        Icon: eventIcons[item.event] || ArrowUpRight,
      }))
    : defaultSteps;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) onClose();
      }}
      role="presentation"
    >
      <aside
        aria-labelledby="email-history-title"
        aria-modal="true"
        className="flex h-full w-full max-w-[480px] flex-col border-l border-line bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start gap-3 border-b border-line p-5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">
              Email send history
            </p>
            <h2
              className="mt-1 text-sm font-semibold text-ink"
              id="email-history-title"
            >
              {event.company}
            </h2>
            <p className="mt-1 truncate text-xs text-muted">{event.recipient}</p>
          </div>
          <button
            aria-label="Close email history"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <section className="rounded-lg border border-line p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Subject
            </p>
            <p className="mt-1.5 text-xs font-medium leading-5 text-slate-800">
              {event.subject}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="text-[10px] text-slate-500">
                Current status
              </span>
              <StatusBadge>{event.status}</StatusBadge>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-800">
              Event timeline
            </h3>
            <ol className="mt-3 space-y-0">
              {steps.map(({ label, Icon, date, detail }, index) => (
                <li className="flex gap-3" key={label}>
                  <div className="flex flex-col items-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Icon size={14} />
                    </span>
                    {index < steps.length - 1 && (
                      <span className="my-1 min-h-5 w-px flex-1 bg-line" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-xs font-medium text-slate-700">
                      {label}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {date || (label === "Replied" ? "Time unavailable" : event.date)}
                    </p>
                    {detail && (
                      <p className="mt-1 text-[10px] text-rose-600">{detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {event.status === "Bounced" && (
            <section className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <h3 className="text-xs font-semibold text-rose-800">
                Bounce details unavailable
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-rose-700">
                A real bounce reason and suppression event must come from the
                email provider webhook.
              </p>
            </section>
          )}

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Reply size={14} />
              Reply history
            </h3>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
              {event.reply === "Replied"
                ? "A reply from this recipient was recorded by the inbound webhook."
                : event.reply_tracking_available
                  ? "No reply from this recipient has been recorded."
                  : "Unavailable — the inbound email webhook is not configured. No reply activity is inferred."}
            </p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Clock3 size={14} />
              Follow-up
            </h3>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
              {event.followup_note ||
                "No follow-up is planned for this send."}{" "}
              {event.followup_status && `Status: ${event.followup_status}.`}
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}
