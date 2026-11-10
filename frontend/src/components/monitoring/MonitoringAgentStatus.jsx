import {
  Activity,
  AlertTriangle,
  Ban,
  MailCheck,
  MessageSquareText,
  ShieldCheck,
  StopCircle,
} from "lucide-react";
import StatusBadge from "../common/StatusBadge.jsx";
import { demoEvents, demoSuppressionList } from "../../services/demoData.js";
import { demoMode } from "../../services/demoData.js";

export default function MonitoringAgentStatus({
  events = demoEvents,
  suppressionList = demoSuppressionList,
  replies = 0,
  webhooksConnected = false,
  replyTrackingAvailable = false,
  onStopOutreach,
}) {
  const failures = events.filter(
    (event) => event.status === "Bounced" || event.status === "Failed",
  );
  const recent = events.slice(0, 3);

  return (
    <section className="rounded-xl border border-line bg-white shadow-panel">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-ink">
              Monitoring operations
            </h2>
          </div>
          <p className="mt-1 text-[10px] text-muted">
            {demoMode
              ? "Sample monitor state · no webhook connection"
              : webhooksConnected
                ? "Provider events and/or inbound replies are connected"
                : "No webhook connection"}
          </p>
        </div>
        <button
          className="inline-flex h-8 items-center justify-center gap-2 self-start rounded-lg border border-rose-200 px-3 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 sm:self-center"
          onClick={onStopOutreach}
          title="Live outreach control is unavailable until the backend is connected"
          type="button"
        >
          <StopCircle size={14} />
          Stop outreach
        </button>
      </div>

      <div className="grid gap-0 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
        <section className="p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <MailCheck size={14} className="text-slate-400" />
            Latest events
          </h3>
          <ul className="mt-3 space-y-3">
            {recent.map((event) => (
              <li
                className="flex items-start justify-between gap-2"
                key={event.id}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium text-slate-700">
                    {event.company}
                  </span>
                  <span className="mt-1 block text-[9px] text-slate-400">
                    {event.date}
                  </span>
                </span>
                <StatusBadge>{event.status}</StatusBadge>
              </li>
            ))}
          </ul>
        </section>

        <section className="p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <AlertTriangle size={14} className="text-slate-400" />
            Failures &amp; follow-up
          </h3>
          <div className="mt-3 rounded-lg bg-rose-50/70 p-3">
            <p className="text-xs font-semibold text-rose-800">
              {failures.length} {demoMode ? "sample " : ""}failed send
            </p>
            <p className="mt-1 text-[10px] leading-4 text-rose-700">
              Verify provider failure details and suppress hard bounces before
              any future outreach.
            </p>
          </div>
          <p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-slate-500">
            <MessageSquareText className="mt-0.5 shrink-0" size={13} />
            Replies recorded: {demoMode || replyTrackingAvailable ? replies : "—"}. Email reply content is not shown here.
          </p>
        </section>

        <section className="p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <ShieldCheck size={14} className="text-slate-400" />
            Suppression list
            {demoMode && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">
                sample
              </span>
            )}
          </h3>
          <ul className="mt-3 space-y-2.5">
            {suppressionList.map((contact) => (
              <li className="flex items-start gap-2" key={contact.email}>
                <Ban className="mt-0.5 shrink-0 text-slate-400" size={13} />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-medium text-slate-700">
                    {contact.email}
                  </span>
                  <span className="mt-0.5 block text-[9px] text-slate-400">
                    {contact.reason} · {contact.date}
                  </span>
                </span>
              </li>
            ))}
            {suppressionList.length === 0 && (
              <li className="text-[10px] text-slate-400">
                Suppression data unavailable.
              </li>
            )}
          </ul>
        </section>
      </div>
    </section>
  );
}
