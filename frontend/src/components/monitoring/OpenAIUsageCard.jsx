import { useEffect, useState } from "react";
import { Activity, CircleDollarSign, Gauge, MessageSquare, Sparkles } from "lucide-react";
import { apiRequest } from "../../services/api.js";

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(Number(value || 0));
}

function formatTimestamp(value) {
  if (!value) return "Waiting for first update";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? "Waiting for first update"
    : `Updated ${timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function OpenAIUsageCard() {
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    function refreshUsage() {
      apiRequest({ method: "get", url: "/api/openai-usage" })
        .then((result) => {
          if (!active) return;
          setUsage(result);
          setError("");
        })
        .catch((requestError) => {
          if (!active) return;
          setError(requestError.message);
        });
    }
    refreshUsage();
    const handleFocus = () => refreshUsage();
    window.addEventListener("focus", handleFocus);
    const timer = window.setInterval(refreshUsage, 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const metrics = [
    {
      label: "Total requests",
      value: usage ? formatNumber(usage.total_requests) : "—",
      icon: Activity,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Input tokens",
      value: usage ? formatNumber(usage.input_tokens) : "—",
      icon: MessageSquare,
      color: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Output tokens",
      value: usage ? formatNumber(usage.output_tokens) : "—",
      icon: Sparkles,
      color: "bg-violet-50 text-violet-700",
    },
    {
      label: "Total tokens",
      value: usage ? formatNumber(usage.total_tokens) : "—",
      icon: Gauge,
      color: "bg-cyan-50 text-cyan-700",
    },
    {
      label: "Cost to date",
      value: usage?.cost_usd != null ? formatCurrency(usage.cost_usd) : "—",
      icon: CircleDollarSign,
      color: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <section
      aria-label="OpenAI API usage"
      className="rounded-xl border border-line bg-white p-4 shadow-panel sm:p-5"
      id="openai-usage"
    >
      <div>
        <div>
          <h2 className="text-sm font-semibold text-ink">OpenAI API usage</h2>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Current-month usage recorded from successful backend OpenAI responses.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div className="rounded-lg border border-line bg-slate-50/60 p-3" key={label}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[10px] font-medium text-slate-500">
                {label}
              </span>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${color}`}>
                <Icon size={14} />
              </span>
            </div>
            <p className="mt-2 text-lg font-semibold tracking-tight text-ink">{value}</p>
          </div>
        ))}
      </div>

      <p className={`mt-3 text-[10px] leading-4 ${error ? "text-rose-700" : "text-slate-500"}`}>
        {error || usage?.usage_source || "Loading live usage data…"}
        {usage && !error && (
          <span className="ml-2">{formatTimestamp(usage.live_updated_at || usage.last_updated)}</span>
        )}
      </p>
    </section>
  );
}
