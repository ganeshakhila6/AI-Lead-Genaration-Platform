import {
  Ban,
  Eye,
  MousePointer2,
  Send,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import { demoEvents, demoMode } from "../../services/demoData.js";

const cards = [
  {
    label: "Emails sent",
    key: "sent",
    value: (events) =>
      events.filter(
        (event) =>
          event.send_status === "sent" ||
          (event.send_status == null && event.status === "Sent"),
      ).length,
    icon: Send,
    color: "bg-blue-50 text-blue-700",
  },
  {
    label: "Opened",
    key: "opened",
    value: (events, _replies, available) =>
      available ? events.filter((event) => event.opened).length : "—",
    icon: Eye,
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    label: "Clicked",
    key: "clicked",
    value: (events, _replies, available) =>
      available ? events.filter((event) => event.clicked).length : "—",
    icon: MousePointer2,
    color: "bg-cyan-50 text-cyan-700",
  },
  {
    label: "Failed",
    key: "bounced",
    value: (events) =>
      events.filter((event) => event.status === "Failed" || event.status === "Bounced").length,
    icon: ShieldAlert,
    color: "bg-rose-50 text-rose-700",
  },
  {
    label: "Unsubscribed",
    key: "unsubscribed",
    value: (events, _replies, available) =>
      available
        ? events.filter((event) => event.status === "Unsubscribed").length
        : "—",
    icon: Ban,
    color: "bg-amber-50 text-amber-700",
  },
  {
    label: "Replies",
    key: "replies",
    value: (_events, replies, _metricsAvailable, repliesAvailable) =>
      repliesAvailable ? replies : "—",
    icon: Undo2,
    color: "bg-slate-100 text-slate-600",
  },
];

export default function MonitoringSummary({
  events = demoEvents,
  onSelectMetric,
  replies = 0,
  metricsAvailable = demoMode,
  eventWebhookReady = demoMode,
  replyTrackingAvailable = demoMode,
}) {
  return (
    <section aria-label="Email activity summary">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Activity overview</h2>
          <p className="mt-1 text-[10px] text-slate-500">
            {demoMode
              ? "Counts reflect illustrative demo event rows, not provider analytics."
              : metricsAvailable
                ? "Engagement counts use Brevo webhook events; send counts use the local audit log."
                : eventWebhookReady
                  ? "Brevo event webhook is configured; engagement counts appear after the first event."
                  : "Opens and clicks are unavailable until the Brevo event webhook is configured."}
          </p>
        </div>
        <span className="text-[10px] font-medium text-slate-400">
          Select a metric to inspect
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map(({ label, key, value, icon: Icon, color, note }) => (
          <button
            className="min-w-0 rounded-xl border border-line bg-white p-3.5 text-left shadow-panel transition-colors hover:border-brand-300 hover:bg-brand-50/30 focus:outline-none focus:ring-2 focus:ring-brand-200"
            key={label}
            onClick={() => onSelectMetric?.(key)}
            type="button"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[10px] font-medium text-slate-500">
                {label}
              </span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${color}`}
              >
                <Icon size={14} />
              </span>
            </div>
            <p className="mt-2 text-xl font-semibold tracking-tight text-ink">
              {value(events, replies, metricsAvailable, replyTrackingAvailable)}
            </p>
            {note && (
              <p className="mt-1 text-[9px] leading-4 text-slate-400">{note}</p>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
