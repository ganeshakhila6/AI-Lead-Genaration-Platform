const styles = {
  Qualified: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  "Needs review": "bg-amber-50 text-amber-700 ring-amber-600/10",
  Rejected: "bg-slate-100 text-slate-600 ring-slate-500/10",
  "Not generated": "bg-slate-100 text-slate-600 ring-slate-500/10",
  "Draft generated": "bg-blue-50 text-blue-700 ring-blue-600/10",
  "Pending approval": "bg-violet-50 text-violet-700 ring-violet-600/10",
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  Sent: "bg-blue-50 text-blue-700 ring-blue-600/10",
  Attempted: "bg-amber-50 text-amber-700 ring-amber-600/10",
  Failed: "bg-rose-50 text-rose-700 ring-rose-600/10",
  "Not interested": "bg-slate-100 text-slate-600 ring-slate-500/10",
  "Send failed": "bg-rose-50 text-rose-700 ring-rose-600/10",
  "Send attempted": "bg-amber-50 text-amber-700 ring-amber-600/10",
  Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  Opened: "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
  Clicked: "bg-cyan-50 text-cyan-700 ring-cyan-600/10",
  Bounced: "bg-rose-50 text-rose-700 ring-rose-600/10",
  Unsubscribed: "bg-amber-50 text-amber-700 ring-amber-600/10",
  Replied: "bg-violet-50 text-violet-700 ring-violet-600/10",
  "Consent not verified": "bg-rose-50 text-rose-700 ring-rose-600/10",
  "Opt-in recorded (demo only)":
    "bg-amber-50 text-amber-700 ring-amber-600/10",
  "Not assessed": "bg-slate-100 text-slate-600 ring-slate-500/10",
  Unavailable: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

export default function StatusBadge({ children, className = "" }) {
  const label = String(children ?? "Unknown");
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-semibold ring-1 ring-inset ${
        styles[label] ?? "bg-slate-100 text-slate-600 ring-slate-500/10"
      } ${className}`}
    >
      {label}
    </span>
  );
}
