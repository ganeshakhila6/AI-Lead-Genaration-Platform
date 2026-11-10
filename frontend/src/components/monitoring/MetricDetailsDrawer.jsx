import { useEffect } from "react";
import {
  AlertCircle,
  Eye,
  Mail,
  MousePointer2,
  Reply,
  ShieldAlert,
  Ban,
  X,
} from "lucide-react";

const metricDetails = {
  sent: {
    title: "Emails sent",
    description: "Sent message, recipient, and send-time information only.",
    eventLabel: "Sent",
    matches: (event) =>
      event.send_status === "sent" ||
      (event.send_status == null && event.status === "Sent"),
    icon: Mail,
  },
  opened: {
    title: "Opened emails",
    description: "Recipients with at least one recorded open event.",
    eventLabel: "Opened",
    matches: (event) => event.opened,
    icon: Eye,
  },
  clicked: {
    title: "Clicked emails",
    description: "Recipients with at least one recorded link click.",
    eventLabel: "Clicked",
    matches: (event) => event.clicked,
    icon: MousePointer2,
  },
  bounced: {
    title: "Failed sends",
    description: "Email provider rejected the request or the send attempt failed.",
    eventLabel: "Failed",
    matches: (event) => event.status === "Bounced" || event.status === "Failed",
    icon: ShieldAlert,
  },
  unsubscribed: {
    title: "Unsubscribed contacts",
    description: "Contacts with a recorded unsubscribe event.",
    eventLabel: "Unsubscribed",
    matches: (event) => event.status === "Unsubscribed",
    icon: Ban,
  },
  replies: {
    title: "Replies received",
    description: "Recipients with an inbound reply receipt.",
    eventLabel: "Replied",
    matches: (event) => event.reply === "Replied",
    icon: Reply,
  },
};

export default function MetricDetailsDrawer({
  metric,
  events,
  demoMode,
  replyTrackingAvailable = false,
  onClose,
}) {
  const details = metricDetails[metric];

  useEffect(() => {
    if (!metric) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [metric, onClose]);

  if (!details) return null;

  const Icon = details.icon;
  const matchingEvents = events.filter(details.matches);
  const repliesUnavailable =
    metric === "replies" && !replyTrackingAvailable && !demoMode;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <aside
        aria-labelledby="metric-details-title"
        aria-modal="true"
        className="flex h-full w-full max-w-[500px] flex-col border-l border-line bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start gap-3 border-b border-line p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Icon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">
              Metric details{demoMode ? " · demo data" : ""}
            </p>
            <h2
              className="mt-1 text-sm font-semibold text-ink"
              id="metric-details-title"
            >
              {details.title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              {details.description}
            </p>
          </div>
          <button
            aria-label="Close metric details"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {repliesUnavailable ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                <AlertCircle size={15} />
                Reply tracking is not connected
              </p>
              <p className="mt-2 text-xs leading-5 text-amber-800">
                Replies cannot be listed until the inbound Brevo webhook is
                configured. No reply activity is inferred from opens or clicks.
              </p>
            </div>
          ) : matchingEvents.length > 0 ? (
            <div className="space-y-2">
              <p className="mb-3 text-[10px] font-medium text-slate-500">
                {matchingEvents.length} matching{" "}
                {matchingEvents.length === 1 ? "event" : "events"}
                {demoMode ? " · illustrative records" : ""}
              </p>
              {matchingEvents.map((event) => (
                <article
                  className="rounded-lg border border-line p-3"
                  key={event.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-800">
                        {event.company}
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-slate-500">
                        {event.recipient}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                      {details.eventLabel}
                    </span>
                  </div>
                  <span className="mt-2 block truncate text-[11px] text-slate-600">
                    {event.subject}
                  </span>
                  <span className="mt-2 block text-[10px] text-slate-400">
                    {metric === "sent" ? "Sent" : details.eventLabel} ·{" "}
                    {event.date}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                <Icon size={18} />
              </span>
              <p className="mt-3 text-xs font-semibold text-slate-700">
                No matching event details
              </p>
              <p className="mt-1 max-w-xs text-[11px] leading-5 text-slate-500">
                {demoMode
                  ? "There are no matching records in the illustrative data."
                  : "No backend event records are available for this metric."}
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
