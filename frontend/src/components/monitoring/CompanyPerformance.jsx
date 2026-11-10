import { Building2, TrendingUp } from "lucide-react";
import { demoEvents, demoMode } from "../../services/demoData.js";

function companySummary(events) {
  const groups = new Map();
  for (const event of events) {
    const current = groups.get(event.company) ?? {
      company: event.company,
      sent: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
    };
    if (
      event.send_status === "sent" ||
      (event.send_status == null &&
        (event.status === "Sent" ||
          (demoMode &&
            !["Failed", "Attempted", "Bounced"].includes(event.status))))
    ) {
      current.sent += 1;
    }
    if (event.opened) current.opened += 1;
    if (event.clicked) current.clicked += 1;
    if (event.status === "Bounced") current.bounced += 1;
    groups.set(event.company, current);
  }
  return [...groups.values()].sort((left, right) => right.sent - left.sent);
}

export default function CompanyPerformance({
  events = demoEvents,
  metricsAvailable = true,
}) {
  const companies = companySummary(events);

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-panel sm:p-5">
      <div>
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-ink">
            Company performance
          </h2>
        </div>
        <p className="mt-1 text-[10px] text-muted">
          Send-log records grouped by company
        </p>
      </div>
      <div className="mt-4 space-y-4">
        {companies.map((company) => {
          const openRate = company.sent
            ? Math.round((company.opened / company.sent) * 100)
            : 0;
          return (
            <div key={company.company}>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-xs font-medium text-slate-700">
                  {company.company}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
                  <TrendingUp size={12} />
                  {company.sent} emails
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="w-16 text-right text-[9px] text-slate-500">
                  {metricsAvailable ? `${openRate}% opened` : "Open data —"}
                </span>
              </div>
              <p className="mt-1 text-[9px] text-slate-400">
                {metricsAvailable
                  ? `${company.clicked} clicked · ${company.bounced} bounced`
                  : "Open and click tracking unavailable"}
              </p>
            </div>
          );
        })}
        {companies.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-500">
            No company events to summarize.
          </p>
        )}
      </div>
    </section>
  );
}
