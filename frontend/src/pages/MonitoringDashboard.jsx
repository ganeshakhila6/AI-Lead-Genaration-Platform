import { AlertCircle, Radio } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import CompanyPerformance from "../components/monitoring/CompanyPerformance.jsx";
import EmailActivityTable from "../components/monitoring/EmailActivityTable.jsx";
import EmailTimeline from "../components/monitoring/EmailTimeline.jsx";
import MetricDetailsDrawer from "../components/monitoring/MetricDetailsDrawer.jsx";
import MonitoringAgentStatus from "../components/monitoring/MonitoringAgentStatus.jsx";
import MonitoringSummary from "../components/monitoring/MonitoringSummary.jsx";
import CallAnalysisPanel from "../components/voice/CallAnalysisPanel.jsx";
import Toast from "../components/common/Toast.jsx";
import { demoEvents, demoMode } from "../services/demoData.js";
import { apiRequest } from "../services/api.js";

const EmailPerformanceChart = lazy(
  () => import("../components/monitoring/EmailPerformanceChart.jsx"),
);

export default function MonitoringDashboard() {
  const [events, setEvents] = useState(demoMode ? demoEvents : []);
  const [replies, setReplies] = useState(0);
  const [suppressions, setSuppressions] = useState([]);
  const [metricsAvailable, setMetricsAvailable] = useState(demoMode);
  const [eventWebhookReady, setEventWebhookReady] = useState(demoMode);
  const [replyTrackingAvailable, setReplyTrackingAvailable] = useState(demoMode);
  const [trends, setTrends] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [followupSetup, setFollowupSetup] = useState([]);
  const [followupAutomationReady, setFollowupAutomationReady] = useState(demoMode);
  const [backendConnected, setBackendConnected] = useState(demoMode);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [toast, setToast] = useState(null);
  const chartContainerRef = useRef(null);
  const [chartVisible, setChartVisible] = useState(false);

  useEffect(() => {
    const node = chartContainerRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setChartVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -300px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    function refreshMonitoring() {
      apiRequest({ method: "get", url: "/api/monitoring" })
        .then((result) => {
          if (!active) return;
          setEvents(result.events);
          setReplies(result.replies);
          setSuppressions(result.suppressions);
          setMetricsAvailable(result.metrics_available);
          setEventWebhookReady(result.event_webhook_ready);
          setReplyTrackingAvailable(result.reply_tracking_available);
          setTrends(result.trends || []);
          setFollowUps(result.followups || []);
          setFollowupSetup(result.followup_setup || []);
          setFollowupAutomationReady(result.followup_automation_ready);
          setBackendConnected(true);
          setSelectedEvent((selected) =>
            selected
              ? result.events.find((event) => event.id === selected.id) || selected
              : null,
          );
        })
        .catch(() => {
          if (active) setBackendConnected(false);
        });
    }
    refreshMonitoring();
    const timer = window.setInterval(refreshMonitoring, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  function showToast(message) {
    setToast({ message, type: "error" });
    window.setTimeout(() => setToast(null), 5000);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-700">
            Outreach operations
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            Monitor every touchpoint.
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            {demoMode
              ? "Demo events only · live reply and engagement tracking requires Brevo webhooks."
              : `${metricsAvailable
                ? "Delivery, opens, and clicks use Brevo transactional events."
                : eventWebhookReady
                  ? "Brevo event webhook is configured; waiting for its first event."
                  : "Engagement metrics require the Brevo event webhook."} ${
                  replyTrackingAvailable
                    ? "Replies use inbound webhook events."
                    : "Reply tracking requires the inbound webhook."
                }`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-900 sm:self-auto">
          <Radio size={13} />
          {backendConnected ? "Send log connected" : "Monitoring not connected"}
        </span>
      </div>

      {demoMode && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[10px] leading-4 text-amber-900">
          <AlertCircle className="mt-0.5 shrink-0" size={14} />
          All visible event rows, trend lines, metrics, and suppression entries
          are illustrative demo data. Replies are intentionally unavailable.
        </div>
      )}

      <CallAnalysisPanel />
      <MonitoringSummary
        events={events}
        onSelectMetric={setSelectedMetric}
        replies={replies}
        metricsAvailable={metricsAvailable}
        eventWebhookReady={eventWebhookReady}
        replyTrackingAvailable={replyTrackingAvailable}
      />
      <div ref={chartContainerRef}>
        {chartVisible ? (
          <Suspense
            fallback={
              <section
                aria-label="Loading email performance chart"
                className="h-[320px] animate-pulse rounded-xl border border-line bg-white shadow-panel"
              />
            }
          >
            <EmailPerformanceChart
              trends={trends}
              metricsAvailable={metricsAvailable}
              eventWebhookReady={eventWebhookReady}
            />
          </Suspense>
        ) : (
          <section
            aria-label="Email performance chart loads when visible"
            className="h-[320px] rounded-xl border border-line bg-white shadow-panel"
          />
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <CompanyPerformance
          events={events}
          metricsAvailable={metricsAvailable}
        />
        <div className="rounded-xl border border-line bg-white p-4 shadow-panel sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Follow-up status
              </h2>
              <p className="mt-1 text-[10px] text-muted">
                {demoMode
                  ? "Illustrative only · no follow-up is sent"
                  : followupAutomationReady
                    ? "Automatically sends once after two weekdays · opted-in contacts only"
                    : "Automatic follow-ups are paused until tracking and HTTPS setup are complete"}
              </p>
            </div>
            {demoMode && (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-500">
                DEMO
              </span>
            )}
          </div>
          <div className="mt-4 divide-y divide-line">
            {followUps.map((item) => (
              <div className="py-3 first:pt-0 last:pb-0" key={item.company}>
                <p className="text-xs font-medium text-slate-700">
                  {item.company}
                </p>
                <p className="mt-1 text-[10px] font-medium text-slate-600">
                  {item.status}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">{item.note}</p>
              </div>
            ))}
            {followUps.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-500">
                {demoMode
                  ? "No live follow-up records in demo mode."
                  : "No opted-in follow-ups are due or scheduled."}
              </p>
            )}
          </div>
          {!demoMode && followupSetup.length > 0 && (
            <p className="mt-3 border-t border-line pt-3 text-[10px] leading-4 text-slate-500">
              Setup required: {followupSetup.join("; ")}.
            </p>
          )}
        </div>
      </div>
      <EmailActivityTable
        events={events}
        onSelect={setSelectedEvent}
        metricsAvailable={metricsAvailable}
        eventWebhookReady={eventWebhookReady}
        replyTrackingAvailable={replyTrackingAvailable}
      />
      <MonitoringAgentStatus
        events={events}
        replies={replies}
        suppressionList={suppressions}
        webhooksConnected={eventWebhookReady || replyTrackingAvailable}
        replyTrackingAvailable={replyTrackingAvailable}
        onStopOutreach={() =>
          showToast(
            "No outreach was stopped. Live outreach control is unavailable until the backend is connected.",
          )
        }
      />
      {selectedEvent && (
        <EmailTimeline
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
      {selectedMetric && (
        <MetricDetailsDrawer
          demoMode={demoMode}
          events={events}
          metric={selectedMetric}
          replyTrackingAvailable={replyTrackingAvailable}
          onClose={() => setSelectedMetric(null)}
        />
      )}
      <Toast
        message={toast?.message}
        onClose={() => setToast(null)}
        type={toast?.type}
      />
    </div>
  );
}
