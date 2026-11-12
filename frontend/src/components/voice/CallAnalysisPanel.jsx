import {
  AlertCircle,
  ClipboardList,
  MessageSquareText,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";

const callViews = [
  {
    id: "transcript",
    title: "Transcript",
    description: "Open the per-call conversation record.",
    icon: MessageSquareText,
  },
  {
    id: "interest",
    title: "Interest analysis",
    description: "Review interest, supporting evidence, and customer feedback.",
    icon: Sparkles,
  },
  {
    id: "outcome",
    title: "Outcome",
    description: "Review the call result and the required follow-up.",
    icon: ClipboardList,
  },
];

const outcomeDetails = [
  {
    title: "Interested",
    summary: "Lead expressed interest in learning more.",
    followUp: "Capture their request and route it to a human for follow-up.",
  },
  {
    title: "Not interested / do not call",
    summary: "Lead declined or asked not to receive further calls.",
    followUp: "End politely and suppress future calls if requested.",
  },
  {
    title: "Call back requested",
    summary: "Lead asked to continue the conversation at another time.",
    followUp: "Record the requested time; require human approval before calling.",
  },
  {
    title: "No answer / voicemail",
    summary: "No live conversation was completed.",
    followUp: "Record the attempt. Retry timing and voicemail policy are not set.",
  },
  {
    title: "Wrong or invalid number",
    summary: "The number did not reach the intended business contact.",
    followUp: "Flag the number for review and prevent repeated attempts.",
  },
  {
    title: "Needs human follow-up",
    summary: "The conversation requires a person to review or respond.",
    followUp: "Pass the call summary and requested next step to a human.",
  },
];

export default function CallAnalysisPanel() {
  const [selectedView, setSelectedView] = useState(null);
  const selectedCallView = callViews.find((view) => view.id === selectedView);
  const selectedOutcome = outcomeDetails.find(
    (outcome) => outcome.title === selectedView,
  );
  const SelectedIcon = selectedCallView?.icon ?? ClipboardList;

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-panel">
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                AI voice call activity
              </h2>
              <p className="mt-1 text-xs text-muted">
                Open a call feature to view its record layout and fields.
              </p>
            </div>
            <span className="self-start rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
              Not connected
            </span>
          </div>
        </div>
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-3 sm:p-5">
          {callViews.map(({ id, ...view }) => (
            <button
              aria-label={`Open ${view.title}`}
              className="rounded-lg border border-line bg-slate-50/60 p-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/50 focus:outline-none focus:ring-2 focus:ring-brand-200"
              key={id}
              onClick={() => setSelectedView(id)}
              type="button"
            >
              <view.icon className="text-brand-600" size={16} />
              <p className="mt-2 text-xs font-semibold text-slate-700">
                {view.title}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                {view.description}
              </p>
            </button>
          ))}
        </div>
        <div className="px-4 py-4 sm:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Call outcomes · open to see the follow-up behavior
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {outcomeDetails.map(({ title }) => (
              <button
                className="rounded-md border border-line bg-white px-2.5 py-1.5 text-left text-[10px] text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
                key={title}
                onClick={() => setSelectedView(title)}
                type="button"
              >
                {title}
              </button>
            ))}
          </div>
        </div>
        <p className="border-t border-line bg-slate-50/60 px-4 py-5 text-center text-xs text-slate-500 sm:px-5">
          No call records yet. Real transcripts and analysis will appear after
          the calling backend is connected.
        </p>
      </section>

      {selectedView && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedView(null);
          }}
          role="presentation"
        >
          <section
            aria-labelledby="call-detail-title"
            aria-modal="true"
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-white shadow-xl"
            role="dialog"
          >
            <header className="flex items-start gap-3 border-b border-line px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <SelectedIcon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  className="text-sm font-semibold text-ink"
                  id="call-detail-title"
                >
                  {selectedCallView?.title ?? selectedOutcome?.title}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Call record view · live data unavailable until voice calling
                  is integrated.
                </p>
              </div>
              <button
                aria-label="Close call details"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                onClick={() => setSelectedView(null)}
                type="button"
              >
                <X size={16} />
              </button>
            </header>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              {selectedView === "transcript" && <TranscriptView />}
              {selectedView === "interest" && <InterestView />}
              {selectedView === "outcome" && <OutcomeView />}
              {selectedOutcome && <OutcomeDetail outcome={selectedOutcome} />}
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[10px] leading-4 text-amber-900">
                <AlertCircle className="mt-0.5 shrink-0" size={13} />
                This is the functional layout, not sample call data. Nothing is
                saved or inferred until call-provider and backend integration
                is implemented.
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function TranscriptView() {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Lead" value="Available after a call" />
        <Field label="Call date" value="Available after a call" />
        <Field label="Language" value="English, Hindi, or Telugu" />
      </div>
      <section className="overflow-hidden rounded-lg border border-line">
        <div className="border-b border-line bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Conversation
        </div>
        <p className="px-4 py-10 text-center text-xs text-slate-500">
          No transcript is available. After a call, each speaker turn will
          appear here in chronological order.
        </p>
      </section>
      <Field
        label="Disclosure"
        value="The agent must identify itself as AI and disclose transcription."
      />
      <Field label="Audio" value="Not retained in the current plan." />
    </>
  );
}

function InterestView() {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field
          label="Interest classification"
          value="Available after transcript analysis"
        />
        <Field label="Confidence" value="Available after transcript analysis" />
      </div>
      <Field
        label="Evidence from conversation"
        value="The analysis should cite the lead’s words; it must not infer interest from silence or tone."
      />
      <Field
        label="Customer feedback"
        value="Questions, concerns, and comments will be summarized from the transcript."
      />
      <Field
        label="Requested next step"
        value="If interested, capture the request and send it to a human for follow-up."
      />
      <p className="rounded-lg border border-line bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
        No analyzed calls are available yet.
      </p>
    </>
  );
}

function OutcomeView() {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Lead" value="Available after a call" />
        <Field label="Call outcome" value="Available after a call" />
        <Field label="Call time" value="Available after a call" />
        <Field label="Follow-up status" value="Available after a call" />
      </div>
      <p className="rounded-lg border border-line bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
        No call outcomes are available yet.
      </p>
    </>
  );
}

function OutcomeDetail({ outcome }) {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="When this is selected" value={outcome.summary} />
        <Field label="Follow-up behavior" value={outcome.followUp} />
      </div>
      <Field
        label="Call record"
        value="The lead, call date, transcript, and this outcome will be linked after backend integration."
      />
      <p className="rounded-lg border border-line bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
        No leads currently have this call outcome.
      </p>
    </>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-700">{value}</p>
    </div>
  );
}
