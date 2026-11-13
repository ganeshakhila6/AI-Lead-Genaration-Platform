import {
  AlertCircle,
  CheckCircle2,
  Circle,
  LoaderCircle,
} from "lucide-react";

export default function LeadGenerationProgress({ state }) {
  if (!state || state.status === "idle") return null;

  const isError = state.status === "error";
  const isComplete = state.status === "completed";
  const stages =
    state.task === "import"
      ? ["Upload file", "Validate lead rows", "Save lead records"]
      : ["Discover companies", "Research websites", "Qualify and save leads"];
  const completedIndex = Number.isInteger(state.completedStage)
    ? state.completedStage
    : -1;
  const activeIndex = Number.isInteger(state.activeStage)
    ? state.activeStage
    : -1;

  return (
    <section
      aria-labelledby="generation-progress-title"
      className={`rounded-xl border bg-white p-5 shadow-panel sm:p-6 ${
        isError ? "border-amber-200" : "border-line"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isError
              ? "bg-amber-50 text-amber-700"
              : "bg-brand-50 text-brand-600"
          }`}
        >
          {isError ? (
            <AlertCircle size={18} />
          ) : isComplete ? (
            <CheckCircle2 size={18} />
          ) : (
            <LoaderCircle className="animate-spin" size={18} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className="text-sm font-semibold text-ink"
            id="generation-progress-title"
          >
            {isError
              ? "Lead generation failed"
              : isComplete
                ? "Lead processing complete"
                : "Lead generation progress"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            {state.message}
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
          {isError ? "Failed" : isComplete ? "Complete" : "In progress"}
        </span>
      </div>

      <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {stages.map((stage, index) => {
          const done = index <= completedIndex;
          const active = index === activeIndex;
          const StageIcon = done ? CheckCircle2 : active ? LoaderCircle : Circle;
          return (
            <li
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs ${
                active
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : done
                    ? "border-emerald-100 bg-emerald-50/50 text-emerald-800"
                    : "border-line bg-slate-50/70 text-slate-500"
              }`}
              key={stage}
            >
              <StageIcon
                className={active ? "animate-spin" : ""}
                size={15}
              />
              <span className="font-medium">{stage}</span>
            </li>
          );
        })}
      </ol>
      {state.errors?.length > 0 && (
        <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 p-3">
          <p className="text-xs font-semibold text-rose-800">
            Processing errors
          </p>
          <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-rose-700">
            {state.errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-5 border-t border-line pt-3 text-xs text-slate-500">
        <span>
          {state.task === "discovery" ? "New leads found" : "Leads stored"}{" "}
          <strong className="font-semibold text-ink">
            {state.lead_count ?? "—"}
          </strong>
        </span>
        {state.task === "discovery" && (
          <span>
            Total leads saved{" "}
            <strong className="font-semibold text-ink">
              {state.total_lead_count ?? "—"}
            </strong>
          </span>
        )}
        <span>
          Rows skipped{" "}
          <strong className="font-semibold text-ink">
            {state.skipped_rows ?? "—"}
          </strong>
        </span>
      </div>
    </section>
  );
}
