import { AlertCircle, FileText, Languages, MicOff, Upload } from "lucide-react";
import { useState } from "react";

const languages = ["English", "Hindi", "Telugu"];

export default function VoiceAgentSetup() {
  const [selectedFiles, setSelectedFiles] = useState([]);

  function handleFiles(event) {
    setSelectedFiles(Array.from(event.target.files ?? []).map((file) => file.name));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-line bg-white p-4 shadow-panel sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Languages size={17} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Conversation plan</h2>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Initial languages and behavior to configure when voice services
              are selected.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Languages requested
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {languages.map((language) => (
              <span
                className="rounded-md border border-brand-100 bg-brand-50 px-2.5 py-1.5 text-[11px] font-medium text-brand-800"
                key={language}
              >
                {language}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-2 rounded-lg border border-line bg-slate-50/70 p-3">
          <p className="text-[11px] font-medium text-slate-700">
            Planned call flow
          </p>
          <ol className="list-inside list-decimal space-y-1 text-[10px] leading-4 text-slate-500">
            <li>Greet the person and clearly identify as an AI assistant.</li>
            <li>Identify the company and explain the call purpose.</li>
            <li>Use approved uploaded material to answer naturally.</li>
            <li>Disclose transcription and request human follow-up if interested.</li>
            <li>Respect a decline and mark the lead do-not-call.</li>
          </ol>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-4 shadow-panel sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <FileText size={17} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Company and product guidance
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Select reference files to preview the planned setup. This
              frontend preview does not upload or save files.
            </p>
          </div>
        </div>
        <label className="mt-4 flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center hover:bg-slate-50">
          <Upload className="text-slate-400" size={18} />
          <span className="mt-2 text-xs font-medium text-slate-700">
            Choose guidance files
          </span>
          <span className="mt-1 text-[10px] text-slate-400">
            PDF, DOCX, or TXT
          </span>
          <input
            accept=".pdf,.docx,.txt"
            className="sr-only"
            multiple
            onChange={handleFiles}
            type="file"
          />
        </label>
        {selectedFiles.length > 0 && (
          <ul className="mt-3 space-y-1">
            {selectedFiles.map((name) => (
              <li className="truncate text-[10px] text-slate-600" key={name}>
                {name}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[10px] leading-4 text-amber-900">
          <AlertCircle className="mt-0.5 shrink-0" size={13} />
          File storage and agent knowledge are not connected yet. Selected
          filenames stay in this page only.
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-4 shadow-panel sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Privacy and approvals</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Setting label="Call eligibility" value="Human approval per lead" />
          <Setting label="Transcription" value="Disclosure required" />
          <Setting label="Audio recording" value="Off — transcript only" />
          <Setting label="Transcript retention" value="Not decided" />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-4 shadow-panel sm:p-5">
        <div className="flex items-start gap-3">
          <MicOff className="mt-0.5 shrink-0 text-slate-400" size={17} />
          <div>
            <h2 className="text-sm font-semibold text-ink">Voice provider</h2>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Not selected. Provider comparison and calling setup are still
              pending; this workspace cannot place calls.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Setting({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50/60 p-3">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-medium text-slate-700">{value}</p>
    </div>
  );
}
