import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Mail, Radio, Server } from "lucide-react";
import { apiRequest, isApiConfigured } from "../../services/api.js";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

function SettingsDialog({ onClose }) {
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState("");

  useEffect(() => {
    apiRequest({ method: "get", url: "/api/health" })
      .then(setHealth)
      .catch((error) => setHealthError(error.message));
  }, []);

  const leadDiscoveryReady = Boolean(health?.providers?.lead_discovery);
  const draftingReady = Boolean(health?.providers?.draft_generation);
  const sendingReady = Boolean(health?.providers?.email_sending);
  const permissionRequestReady = Boolean(health?.providers?.permission_request);
  const inboundWebhookReady = Boolean(health?.providers?.inbound_webhook);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="settings-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
              Workspace
            </p>
            <h2
              className="mt-1 text-lg font-semibold tracking-tight text-ink"
              id="settings-title"
            >
              Settings
            </h2>
          </div>
          <button
            aria-label="Close settings"
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-canvas"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">
          Connection status only reflects configuration presence; credentials
          and service health are never exposed in this UI.
        </p>
        <div className="mt-4 divide-y divide-line rounded-lg border border-line">
          {[
            {
              label: "FastAPI backend",
              detail: health
                ? "Connected"
                : healthError || (isApiConfigured ? "Connecting…" : "Not configured"),
              icon: Server,
              ready: Boolean(health),
            },
            {
              label: "OpenAI draft generation",
              detail: draftingReady ? "Configured" : "Not configured",
              icon: KeyRound,
              ready: draftingReady,
            },
            {
              label: "Lead discovery",
              detail: leadDiscoveryReady
                ? "Serper and OpenAI configured"
                : "Provider credentials not configured",
              icon: KeyRound,
              ready: leadDiscoveryReady,
            },
            {
              label: "Brevo sending",
              detail: sendingReady ? "Configured" : "Not configured",
              icon: Mail,
              ready: sendingReady,
            },
            {
              label: "Initial permission requests",
              detail: permissionRequestReady
                ? "Reply-to inbox configured"
                : "Reply-to inbox not configured",
              icon: Mail,
              ready: permissionRequestReady,
            },
            {
              label: "Event webhooks",
              detail: inboundWebhookReady
                ? "Inbound reply processing configured"
                : "Webhook token or AI provider not configured",
              icon: Radio,
              ready: inboundWebhookReady,
            },
          ].map(({ label, detail, icon: Icon, ready }) => (
            <div
              className="flex items-center gap-3 px-3 py-3"
              key={label}
            >
              <Icon className="shrink-0 text-slate-400" size={15} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-slate-700">
                  {label}
                </span>
                <span className="mt-0.5 block text-[10px] text-slate-400">
                  {detail}
                </span>
              </span>
              {ready ? (
                <CheckCircle2 className="text-emerald-600" size={15} />
              ) : (
                <AlertCircle className="text-amber-500" size={15} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[10px] leading-5 text-slate-500">
          Email sending:{" "}
          <strong className="text-slate-700">
            {sendingReady ? "Configured; approval and eligibility required" : "Not configured"}
          </strong>
          <br />
          Sender identity:{" "}
          <strong className="text-slate-700">
            {sendingReady ? "Configured in backend environment" : "Not configured"}
          </strong>
        </div>
      </section>
    </div>
  );
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiConnected, setApiConnected] = useState(null);

  useEffect(() => {
    let active = true;
    apiRequest({ method: "get", url: "/api/health" })
      .then(() => {
        if (active) setApiConnected(true);
      })
      .catch(() => {
        if (active) setApiConnected(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="flex min-h-screen">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCollapse={() => setCollapsed((value) => !value)}
          onCloseMobile={() => setMobileOpen(false)}
          onOpenSettings={() => {
            setMobileOpen(false);
            setSettingsOpen(true);
          }}
          apiConnected={apiConnected}
        />
        <div
          className={`min-w-0 flex-1 transition-[margin] duration-200 ${
            collapsed ? "lg:ml-[76px]" : "lg:ml-[260px]"
          }`}
        >
          <Header
            onOpenMobileMenu={() => setMobileOpen(true)}
            apiConnected={apiConnected}
          />
          <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
