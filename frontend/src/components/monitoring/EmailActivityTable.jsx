import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import StatusBadge from "../common/StatusBadge.jsx";
import { demoMode } from "../../services/demoData.js";

const filters = [
  "All",
  "Sent",
  "Delivered",
  "Opened",
  "Clicked",
  "Attempted",
  "Failed",
  "Bounced",
  "Unsubscribed",
  "Replied",
];

export default function EmailActivityTable({
  events,
  onSelect,
  metricsAvailable = false,
  eventWebhookReady = false,
  replyTrackingAvailable = false,
}) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return events.filter((event) => {
      const filterMatch =
        filter === "All" ||
        (filter === "Sent" && event.status === "Sent") ||
        (filter === "Attempted" && event.status === "Attempted") ||
        (filter === "Failed" && event.status === "Failed") ||
        (filter === "Delivered" &&
          ["Delivered", "Opened", "Clicked", "Unsubscribed"].includes(
            event.status,
          )) ||
        (filter === "Opened" && event.opened) ||
        (filter === "Clicked" && event.clicked) ||
        (["Bounced", "Unsubscribed"].includes(filter) &&
          event.status === filter) ||
        (filter === "Replied" && event.reply === "Replied");
      const searchMatch =
        !search ||
        [event.company, event.recipient, event.subject].some((value) =>
          (value || "").toLowerCase().includes(search),
        );
      return filterMatch && searchMatch;
    });
  }, [events, filter, query]);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-panel">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:px-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Email activity</h2>
          <p className="mt-1 text-[10px] text-muted">
            {demoMode
              ? "Sample records · inbound replies are not connected"
              : `Send attempts use the local log · Brevo events ${metricsAvailable ? "received" : eventWebhookReady ? "configured, awaiting data" : "not connected"} · inbound replies ${replyTrackingAvailable ? "configured" : "not connected"}`}
          </p>
        </div>
        <label className="relative sm:w-56">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            aria-label="Search email activity"
            className="h-8 w-full rounded-lg border border-line pl-8 pr-3 text-[11px] outline-none focus:border-brand-400"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search company or recipient"
            value={query}
          />
        </label>
      </div>

      <div
        aria-label="Filter email activity"
        className="flex gap-1 overflow-x-auto border-b border-line px-4 py-2 sm:px-5"
        role="group"
      >
        {filters.map((item) => (
          <button
            aria-pressed={filter === item}
            className={`shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-medium ${
              filter === item
                ? "bg-brand-50 text-brand-700"
                : "text-slate-500 hover:bg-slate-50"
            }`}
            key={item}
            onClick={() => setFilter(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[790px] text-left">
          <thead>
            <tr className="border-b border-line bg-slate-50/70 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Company / recipient</th>
              <th className="px-3 py-3">Subject</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Send status</th>
              <th className="px-3 py-3">Opened</th>
              <th className="px-3 py-3">Clicked</th>
              <th className="px-4 py-3">Reply</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((event) => (
              <tr
                className="cursor-pointer hover:bg-slate-50"
                key={event.id}
                onClick={() => onSelect(event)}
              >
                <td className="px-4 py-3">
                  <p className="text-xs font-medium text-slate-700">
                    {event.company}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {event.recipient}
                  </p>
                </td>
                <td className="max-w-56 truncate px-3 py-3 text-xs text-slate-600">
                  {event.subject}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-[10px] text-slate-500">
                  {event.date}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge>{event.status}</StatusBadge>
                </td>
                <td className="px-3 py-3 text-xs text-slate-600">
                  {event.opened ? "Yes" : "—"}
                </td>
                <td className="px-3 py-3 text-xs text-slate-600">
                  {event.clicked ? "Yes" : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge>{event.reply}</StatusBadge>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-12 text-center" colSpan="7">
                  <p className="text-xs font-medium text-slate-700">
                    No matching activity
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Adjust the event filter or search terms.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
