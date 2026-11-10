import { Building2, ExternalLink, Lightbulb, MapPin } from "lucide-react";

export default function CompanyResearch({ lead }) {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-xs font-semibold text-slate-800">
          Company overview
        </h3>
        <p className="mt-1.5 text-xs leading-5 text-slate-600">
          {lead.companyDescription}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={13} />
            {lead.industry}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={13} />
            {lead.location}
          </span>
          <a
            className="inline-flex items-center gap-1.5 text-brand-700 hover:underline"
            href={`https://${lead.website}`}
            onClick={(event) => event.preventDefault()}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink size={12} />
            {lead.website}
          </a>
        </div>
      </section>
      <section className="rounded-lg border border-line bg-slate-50/70 p-3">
        <h3 className="text-xs font-semibold text-slate-800">Research summary</h3>
        <p className="mt-1.5 text-xs leading-5 text-slate-600">{lead.summary}</p>
        <p className="mt-2 text-[10px] text-slate-500">
          Source: {lead.source} · Example research, not live sourced
        </p>
      </section>
      <section>
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <Lightbulb size={14} className="text-amber-500" />
          Potential opportunities
        </h3>
        <ul className="mt-2 space-y-1.5">
          {lead.opportunities.map((item) => (
            <li
              className="flex gap-2 text-xs leading-5 text-slate-600"
              key={item}
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
        <h3 className="text-xs font-semibold text-amber-900">
          Qualification explanation
        </h3>
        <p className="mt-1.5 text-xs leading-5 text-amber-800">
          This sample lead has a demo score of {lead.score}/100. Qualification
          and research are illustrative only until the live backend is connected.
        </p>
      </section>
    </div>
  );
}
