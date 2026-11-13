import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  MailPlus,
  PhoneCall,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import StatusBadge from "../common/StatusBadge.jsx";

const pageSize = 5;

export default function LeadsTable({
  leads,
  selectedIds,
  onSelectionChange,
  onOpenLead,
  onGenerateEmail,
  onViewDraft,
}) {
  const [query, setQuery] = useState("");
  const [qualificationFilter, setQualificationFilter] = useState("All");
  const [emailFilter, setEmailFilter] = useState("All");
  const [sortDescending, setSortDescending] = useState(true);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...leads]
      .filter(
        (lead) =>
          qualificationFilter === "All" ||
          lead.qualification === qualificationFilter,
      )
      .filter(
        (lead) => emailFilter === "All" || lead.emailStatus === emailFilter,
      )
      .filter(
        (lead) =>
          !search ||
          [
            lead.company,
            lead.contact,
            lead.email,
            lead.phone || "",
            lead.website,
            lead.industry,
          ].some((value) => value.toLowerCase().includes(search)),
      )
      .sort((left, right) =>
        sortDescending ? right.score - left.score : left.score - right.score,
      );
  }, [emailFilter, leads, query, qualificationFilter, sortDescending]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const allVisibleSelected =
    visible.length > 0 && visible.every((lead) => selectedIds.includes(lead.id));

  function updateQuery(value) {
    setQuery(value);
    setPage(0);
  }

  function toggleAllVisible() {
    const visibleIds = visible.map((lead) => lead.id);
    onSelectionChange(
      allVisibleSelected
        ? selectedIds.filter((id) => !visibleIds.includes(id))
        : [...new Set([...selectedIds, ...visibleIds])],
    );
  }

  function toggleLead(id) {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <section
      aria-labelledby="leads-title"
      className="overflow-hidden rounded-xl border border-line bg-white shadow-panel"
    >
      <div className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink" id="leads-title">
              Generated leads
            </h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {filtered.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Review, qualify, and prepare compliant outreach.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <label className="relative min-w-0 sm:w-52">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            <input
              aria-label="Search leads"
              className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="Search leads"
              type="search"
              value={query}
            />
          </label>
          <select
            aria-label="Filter by qualification"
            className="h-9 rounded-lg border border-line bg-white px-3 text-xs text-slate-600 outline-none focus:border-brand-400"
            onChange={(event) => {
              setQualificationFilter(event.target.value);
              setPage(0);
            }}
            value={qualificationFilter}
          >
            <option value="All">All qualification</option>
            <option value="Qualified">Qualified</option>
            <option value="Needs review">Needs review</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select
            aria-label="Filter by email status"
            className="h-9 rounded-lg border border-line bg-white px-3 text-xs text-slate-600 outline-none focus:border-brand-400"
            onChange={(event) => {
              setEmailFilter(event.target.value);
              setPage(0);
            }}
            value={emailFilter}
          >
            <option value="All">All email statuses</option>
            <option value="Not generated">Not generated</option>
            <option value="Draft generated">Draft generated</option>
            <option value="Pending approval">Pending approval</option>
            <option value="Approved">Approved</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1160px] text-left">
          <thead>
            <tr className="border-b border-line bg-[#fbfcfe] text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-400">
              <th className="w-11 px-4 py-3">
                <input
                  aria-label="Select all visible leads"
                  checked={allVisibleSelected}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-600"
                  onChange={toggleAllVisible}
                  type="checkbox"
                />
              </th>
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Website</th>
              <th className="px-3 py-3">Industry</th>
              <th className="px-3 py-3">
                <button
                  className="inline-flex items-center gap-1 uppercase tracking-[0.09em]"
                  onClick={() => setSortDescending((value) => !value)}
                  type="button"
                >
                  Lead score
                  {sortDescending ? (
                    <ArrowDown size={12} />
                  ) : (
                    <ArrowUp size={12} />
                  )}
                  <span className="sr-only">Toggle score sort</span>
                </button>
              </th>
              <th className="px-3 py-3">Qualification</th>
              <th className="px-3 py-3">Email status</th>
              <th className="px-3 py-3">View draft email</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((lead) => (
              <tr
                className="group transition-colors hover:bg-slate-50/80"
                key={lead.id}
              >
                <td className="px-4 py-3.5">
                  <input
                    aria-label={`Select ${lead.company}`}
                    checked={selectedIds.includes(lead.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-600"
                    onChange={() => toggleLead(lead.id)}
                    type="checkbox"
                  />
                </td>
                <td className="px-3 py-3.5">
                  <button
                    className="text-left text-xs font-semibold text-ink hover:text-brand-700"
                    onClick={() => onOpenLead(lead)}
                    type="button"
                  >
                    {lead.company}
                  </button>
                </td>
                <td className="px-3 py-3.5 text-xs text-slate-600">
                  {lead.phone || "No phone number found"}
                </td>
                <td className="px-3 py-3.5 text-xs text-slate-600">
                  {lead.email}
                </td>
                <td className="px-3 py-3.5 text-xs text-slate-600">
                  {lead.website}
                </td>
                <td className="px-3 py-3.5 text-xs text-slate-600">
                  {lead.industry}
                </td>
                <td className="px-3 py-3.5">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    {lead.score}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <StatusBadge>{lead.qualification}</StatusBadge>
                </td>
                <td className="px-3 py-3.5">
                  <StatusBadge>{lead.emailStatus}</StatusBadge>
                </td>
                <td className="px-3 py-3.5">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
                    disabled={!lead.draft}
                    onClick={() => onViewDraft(lead)}
                    type="button"
                  >
                    <Eye size={13} />
                    {lead.draft ? "View draft email" : "No draft"}
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      aria-label={`View ${lead.company} details`}
                      className="rounded-md p-2 text-slate-500 hover:bg-white hover:text-brand-700"
                      onClick={() => onOpenLead(lead)}
                      title="View details"
                      type="button"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      aria-label={`Generate email for ${lead.company}`}
                      className="rounded-md p-2 text-slate-500 hover:bg-white hover:text-brand-700"
                      onClick={() => onGenerateEmail(lead)}
                      title="Generate email"
                      type="button"
                    >
                      <MailPlus size={15} />
                    </button>
                    <button
                      aria-label={`Call ${lead.company} (coming soon)`}
                      className="rounded-md p-2 text-slate-400 disabled:cursor-not-allowed"
                      disabled
                      title="AI voice calling is not connected yet."
                      type="button"
                    >
                      <PhoneCall size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td className="px-5 py-14 text-center" colSpan="11">
                  <p className="text-sm font-medium text-slate-700">
                    {leads.length === 0 ? "No leads yet" : "No matching leads"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {leads.length === 0
                      ? "No new qualified leads were found. Broaden your search criteria and try again."
                      : "Try changing your search or filters."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[11px] text-slate-500 sm:px-5">
        <span>
          {filtered.length
            ? `Showing ${page * pageSize + 1}–${Math.min(
                (page + 1) * pageSize,
                filtered.length,
              )} of ${filtered.length}`
            : "Showing 0"}
        </span>
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous page"
            className="rounded-md border border-line p-1.5 hover:bg-slate-50 disabled:opacity-40"
            disabled={page === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            type="button"
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            Page {page + 1} of {pageCount}
          </span>
          <button
            aria-label="Next page"
            className="rounded-md border border-line p-1.5 hover:bg-slate-50 disabled:opacity-40"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            type="button"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
