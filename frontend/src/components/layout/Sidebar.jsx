import {
  Activity,
  Bot,
  ChevronLeft,
  ChevronRight,
  Gauge,
  LayoutDashboard,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { apiRequest } from "../../services/api.js";

const navigation = [
  { label: "Sales Dashboard", to: "/sales", icon: LayoutDashboard },
  { label: "Monitoring Dashboard", to: "/monitoring", icon: Activity },
];

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatTimestamp(value) {
  if (!value) return "Waiting for first update";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? "Waiting for first update"
    : `Updated ${timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  onCollapse,
  onCloseMobile,
  onOpenSettings,
  apiConnected,
}) {
  const [openAIUsage, setOpenAIUsage] = useState(null);
  const [showCollapsedUsage, setShowCollapsedUsage] = useState(false);

  useEffect(() => {
    let active = true;
    function refreshUsage() {
      apiRequest({ method: "get", url: "/api/openai-usage" })
        .then((usage) => {
          if (active) setOpenAIUsage(usage);
        })
        .catch(() => {
          if (active) setOpenAIUsage(null);
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

  useEffect(() => {
    if (!collapsed) {
      setShowCollapsedUsage(false);
    }
  }, [collapsed]);

  useEffect(() => {
    if (!showCollapsedUsage) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setShowCollapsedUsage(false);
    };
    const handlePointerDown = (event) => {
      if (!event.target.closest("[data-collapsed-usage]")) {
        setShowCollapsedUsage(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [showCollapsedUsage]);

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[260px] flex-col overflow-hidden border-r border-line bg-white transition-[width,transform] duration-200 lg:z-40 lg:translate-x-0 ${
          collapsed ? "lg:w-[76px]" : "lg:w-[260px]"
        } ${mobileOpen ? "translate-x-0" : "max-lg:-translate-x-full"}`}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-line px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Bot size={20} strokeWidth={2.2} />
            </div>
            <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
              <p className="truncate text-sm font-semibold tracking-tight text-ink">
                AI Sales Agent
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-muted">
                OUTREACH WORKSPACE
              </p>
            </div>
          </div>
          <button
            aria-label="Close navigation"
            className="rounded-lg p-2 text-muted hover:bg-canvas lg:hidden"
            onClick={onCloseMobile}
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          <div className="px-3 pt-7">
          <p
            className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            Workspace
          </p>
          <nav aria-label="Primary navigation" className="space-y-2">
            {navigation.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onCloseMobile}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `group flex h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-canvas hover:text-ink"
                  } ${collapsed ? "lg:justify-center lg:px-0" : ""}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      className="shrink-0"
                    />
                    <span className={collapsed ? "lg:hidden" : ""}>
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div
          data-collapsed-usage
          className={`mx-3 mt-6 rounded-xl border border-violet-100 bg-violet-50/70 p-4 ${
            collapsed
              ? "cursor-pointer lg:px-2 lg:py-4"
              : ""
          }`}
          title={collapsed ? "Open live OpenAI billing" : undefined}
          role={collapsed ? "button" : undefined}
          tabIndex={collapsed ? 0 : undefined}
          onClick={() => {
            if (collapsed) setShowCollapsedUsage((visible) => !visible);
          }}
          onKeyDown={(event) => {
            if (collapsed && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              setShowCollapsedUsage((visible) => !visible);
            }
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gauge className="shrink-0 text-violet-700" size={16} />
              <span className={`text-[11px] font-semibold text-violet-900 ${collapsed ? "lg:hidden" : ""}`}>
                Live OpenAI billing
              </span>
            </div>
            <span className={`flex items-center gap-1 text-[9px] font-medium text-emerald-700 ${collapsed ? "lg:hidden" : ""}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          <div className={`mt-4 rounded-lg border border-violet-200 bg-white/80 p-3 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="text-[10px] font-medium text-violet-700">Cost to date</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-violet-950">
              {openAIUsage?.cost_usd != null
                ? formatCurrency(openAIUsage.cost_usd)
                : "Not available"}
            </p>
            <p className="mt-1 text-[9px] text-violet-700">
              {formatTimestamp(openAIUsage?.live_updated_at || openAIUsage?.last_updated)}
            </p>
          </div>
          <div className={`mt-3 grid grid-cols-2 gap-x-3 gap-y-3 ${collapsed ? "lg:hidden" : ""}`}>
            <div>
              <p className="text-[9px] text-violet-700">Requests</p>
              <p className="text-xs font-semibold text-violet-950">
                {openAIUsage ? formatNumber(openAIUsage.total_requests) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-violet-700">Total tokens</p>
              <p className="text-xs font-semibold text-violet-950">
                {openAIUsage ? formatNumber(openAIUsage.total_tokens) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-violet-700">Input tokens</p>
              <p className="text-xs font-semibold text-violet-950">
                {openAIUsage ? formatNumber(openAIUsage.input_tokens) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-violet-700">Output tokens</p>
              <p className="text-xs font-semibold text-violet-950">
                {openAIUsage ? formatNumber(openAIUsage.output_tokens) : "—"}
              </p>
            </div>
          </div>
        </div>
        </div>

        <div className="shrink-0 border-t border-line bg-white p-3">
          <button
            onClick={onOpenSettings}
            title={collapsed ? "Settings" : undefined}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-canvas hover:text-ink"
          >
            <Settings size={18} strokeWidth={1.8} className="shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>Settings</span>
          </button>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onCollapse}
            className="mt-1 hidden h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] text-slate-500 transition-colors hover:bg-canvas hover:text-ink lg:flex"
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
            <span className={collapsed ? "lg:hidden" : ""}>Collapse menu</span>
          </button>
          {!collapsed && (
            <div className="mt-4 rounded-lg bg-canvas px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-600">
                  Workspace status
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      apiConnected === true
                        ? "bg-emerald-500"
                        : apiConnected === false
                          ? "bg-rose-500"
                          : "bg-amber-400"
                    }`}
                  />
                  {apiConnected === true
                    ? "Connected"
                    : apiConnected === false
                      ? "Not connected"
                      : "Connecting…"}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
      {collapsed && showCollapsedUsage && (
        <div
          data-collapsed-usage
          aria-label="Live OpenAI billing details"
          className="fixed left-[84px] top-1/2 z-[70] block w-[286px] -translate-y-1/2 rounded-2xl border border-violet-200 bg-white p-5 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
                Live billing
              </p>
              <h2 className="mt-1 text-base font-semibold text-violet-950">
                OpenAI usage
              </h2>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          <div className="mt-4 rounded-xl bg-violet-50 p-4">
            <p className="text-[10px] font-medium text-violet-700">Cost to date</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-violet-950">
              {openAIUsage?.cost_usd != null
                ? formatCurrency(openAIUsage.cost_usd)
                : "Not available"}
            </p>
            <p className="mt-1 text-[10px] text-violet-700">
              {formatTimestamp(openAIUsage?.live_updated_at || openAIUsage?.last_updated)}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-slate-500">Requests</p>
              <p className="mt-1 font-semibold text-slate-900">
                {openAIUsage ? formatNumber(openAIUsage.total_requests) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Total tokens</p>
              <p className="mt-1 font-semibold text-slate-900">
                {openAIUsage ? formatNumber(openAIUsage.total_tokens) : "—"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[10px] leading-4 text-slate-500">
            Refreshes every 15 seconds and whenever this window becomes active.
          </p>
        </div>
      )}
      {collapsed && (
        <button
          aria-label="Expand sidebar"
          className="fixed left-[60px] top-1/2 z-50 hidden h-10 w-8 -translate-y-1/2 items-center justify-center rounded-r-lg border border-line bg-white text-slate-500 shadow-panel transition-colors hover:bg-brand-50 hover:text-brand-700 lg:flex"
          onClick={onCollapse}
          title="Expand sidebar"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </>
  );
}
