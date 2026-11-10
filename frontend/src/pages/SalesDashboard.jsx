import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import BulkActionToolbar from "../components/sales/BulkActionToolbar.jsx";
import FileUpload from "../components/sales/FileUpload.jsx";
import LeadDetailsDrawer from "../components/sales/LeadDetailsDrawer.jsx";
import LeadGenerationProgress from "../components/sales/LeadGenerationProgress.jsx";
import DraftEmailViewer from "../components/sales/DraftEmailViewer.jsx";
import LeadsTable from "../components/sales/LeadsTable.jsx";
import Toast from "../components/common/Toast.jsx";
import { demoLeads, demoMode } from "../services/demoData.js";
import { apiRequest } from "../services/api.js";

function makeDemoDraft(lead, revision) {
  return {
    subject:
      revision > 0
        ? `A fresh idea for ${lead.company}`
        : `An idea for ${lead.company}'s workflow`,
    body: `Hi ${lead.contact.split(" ")[0]},\n\nI came across ${lead.company} while looking into teams working in ${lead.industry.toLowerCase()}. I thought it might be useful to compare notes on ${lead.opportunities[0]?.toLowerCase() ?? "your current priorities"}.\n\nWould you be open to a short conversation?\n\nBest,\nSales Team`,
  };
}

export default function SalesDashboard() {
  const [leads, setLeads] = useState(demoMode ? demoLeads : []);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [viewingDrafts, setViewingDrafts] = useState([]);
  const [drawerInitialTab, setDrawerInitialTab] = useState("Research");
  const [generation, setGeneration] = useState(null);
  const [toast, setToast] = useState(null);
  const [draftRevisions, setDraftRevisions] = useState({});
  const [backendStatus, setBackendStatus] = useState("Connecting to FastAPI…");
  const [discovering, setDiscovering] = useState(false);

  useEffect(() => {
    if (demoMode) {
      setBackendStatus("Demo data enabled");
      return;
    }
    Promise.all([
      apiRequest({ method: "get", url: "/api/health" }),
      apiRequest({ method: "get", url: "/api/leads" }),
    ])
      .then(([, result]) => {
        setLeads(result.leads);
        setBackendStatus("FastAPI connected");
      })
      .catch((error) => {
        setBackendStatus("FastAPI unavailable");
        showToast(error.message, "error");
      });
  }, []);

  useEffect(() => {
    if (!generation?.jobId || generation.status !== "running") return undefined;
    let active = true;
    let timeoutId;
    async function checkJob() {
      try {
        const job = await apiRequest({
          method: "get",
          url: `/api/jobs/${generation.jobId}`,
        });
        if (!active) return;
        if (job.status === "running") {
          setGeneration({
            ...job,
            task: "discovery",
            activeStage: 0,
            completedStage: -1,
          });
          timeoutId = window.setTimeout(checkJob, 2500);
          return;
        }
        setGeneration({
          ...job,
          status: job.status === "failed" ? "error" : "completed",
          task: "discovery",
          errors: job.error ? [job.error] : [],
          completedStage: job.status === "completed" ? 2 : -1,
        });
        setDiscovering(false);
        if (job.status === "completed") {
          const result = await apiRequest({ method: "get", url: "/api/leads" });
          if (active) setLeads(result.leads);
        }
      } catch (error) {
        if (!active) return;
        setGeneration({
          status: "error",
          message: "Could not read the lead discovery job status.",
          errors: [error.message],
        });
        setDiscovering(false);
      }
    }
    checkJob();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [generation?.jobId, generation?.status]);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;
  const approvedCount = leads.filter(
    (lead) => lead.emailStatus === "Approved",
  ).length;
  const selectedDrafts = leads.filter(
    (lead) => selectedIds.includes(lead.id) && lead.draft,
  );

  function showToast(message, type = "info") {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 5000);
  }

  function openLead(lead, tab = "Research") {
    setDrawerInitialTab(tab);
    setSelectedLeadId(lead.id);
  }

  function viewDrafts(targetLeads) {
    setViewingDrafts(targetLeads.filter((lead) => lead.draft));
  }

  async function handleImportLeads(files) {
    if (demoMode) {
      showToast("File imports are disabled while demo data is enabled.", "error");
      return;
    }
    setGeneration({
      status: "running",
      task: "import",
      message: "Uploading and validating lead records.",
      activeStage: 0,
      completedStage: -1,
    });
    try {
      const imported = { added: 0, updated: 0, skipped: [], total: 0, leads: [] };
      for (const file of files) {
        const result = await apiRequest({
          method: "post",
          url: "/api/leads/import",
          params: { filename: file.name },
          data: file,
          headers: { "Content-Type": "application/octet-stream" },
          timeout: 60000,
        });
        imported.added += result.added;
        imported.updated += result.updated;
        imported.skipped.push(...(result.skipped ?? []));
        imported.total = result.total;
        imported.leads = result.leads;
      }
      setLeads(imported.leads);
      setGeneration({
        status: "completed",
        task: "import",
        message: `Imported ${imported.added} new lead${imported.added === 1 ? "" : "s"}; updated ${imported.updated}.`,
        completedStage: 2,
        lead_count: imported.total,
        skipped_rows: imported.skipped.length,
      });
      const skipped = imported.skipped.length;
      showToast(
        skipped
          ? `Import finished; ${skipped} row(s) need correction.`
          : `Lead import complete (${imported.total} total).`,
        skipped ? "info" : "success",
      );
    } catch (error) {
      try {
        const result = await apiRequest({ method: "get", url: "/api/leads" });
        setLeads(result.leads);
      } catch {
        setBackendStatus("FastAPI unavailable");
      }
      setGeneration({
        status: "error",
        task: "import",
        message: "The lead file could not be imported.",
        errors: [error.message],
      });
      showToast(error.message, "error");
    }
  }

  async function handleDiscoverLeads({
    leadCount,
    targetingPrompt,
    referenceFile,
  }) {
    if (demoMode || discovering) return;
    setDiscovering(true);
    setGeneration({
      status: "running",
      task: "discovery",
      message: "Starting music-academy lead discovery.",
      activeStage: 0,
      completedStage: -1,
    });
    try {
      const job = await apiRequest({
        method: "post",
        url: "/api/leads/discover",
        data: (() => {
          const form = new FormData();
          form.append("lead_count", String(leadCount));
          form.append("targeting_prompt", targetingPrompt);
          if (referenceFile) form.append("reference_file", referenceFile);
          return form;
        })(),
        timeout: 60000,
      });
      setGeneration({
        ...job,
        task: "discovery",
        activeStage: job.status === "running" ? 0 : -1,
        completedStage: job.status === "completed" ? 2 : -1,
      });
      if (job.status !== "running") {
        setDiscovering(false);
        if (job.status === "completed") {
          const result = await apiRequest({ method: "get", url: "/api/leads" });
          setLeads(result.leads);
        } else if (job.status === "failed") {
          showToast(job.error || "Lead discovery failed.", "error");
        }
      }
    } catch (error) {
      setDiscovering(false);
      setGeneration({
        status: "error",
        task: "discovery",
        message: "Lead discovery could not start.",
        errors: [error.message],
      });
      showToast(error.message, "error");
    }
  }

  async function updateLeadDraft(lead, draft, announceSaved = false) {
    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              draft,
              emailStatus:
                item.emailStatus === "Approved"
                  ? "Pending approval"
                  : "Draft generated",
            }
          : item,
      ),
    );
    if (announceSaved) {
      if (demoMode) {
        showToast("Demo draft saved in this page session.", "success");
        return;
      }
      try {
        await apiRequest({
          method: "patch",
          url: `/api/drafts/${encodeURIComponent(lead.draft.draftId)}`,
          data: { subject: draft.subject, body: draft.body },
        });
        showToast("Draft saved to FastAPI.", "success");
      } catch (error) {
        try {
          const result = await apiRequest({ method: "get", url: "/api/leads" });
          setLeads(result.leads);
        } catch {
          setBackendStatus("FastAPI unavailable");
        }
        showToast(error.message, "error");
      }
    }
  }

  async function generateEmail(lead) {
    if (!demoMode) {
      try {
        const result = await apiRequest({
          method: "post",
          url: `/api/leads/${encodeURIComponent(lead.id)}/draft`,
          data: {
            business_requirement:
              "Write a concise, accurate introduction to NUERiQ using only supplied company and product information. Ask whether the recipient would like a short overview. Do not invent personal details or claims.",
          },
        });
        setLeads((current) =>
          current.map((item) =>
            item.id === lead.id ? result.lead : item,
          ),
        );
        setSelectedLeadId(lead.id);
        setDrawerInitialTab("Email review");
        showToast("Email draft generated and saved for review.", "success");
      } catch (error) {
        showToast(error.message, "error");
      }
      return;
    }
    const revision = (draftRevisions[lead.id] ?? 0) + 1;
    setDraftRevisions((current) => ({ ...current, [lead.id]: revision }));
    updateLeadDraft(lead, makeDemoDraft(lead, revision));
    openLead(lead, "Email review");
    showToast(
      "Created a local demo draft. AI did not generate this email.",
      "info",
    );
  }

  async function generateSelectedEmails() {
    const targets = leads.filter((lead) => selectedIds.includes(lead.id));
    if (targets.length === 0) return;
    if (!demoMode) {
      const results = [];
      for (const lead of targets.slice(0, 20)) {
        try {
          const result = await apiRequest({
            method: "post",
            url: `/api/leads/${encodeURIComponent(lead.id)}/draft`,
            data: {
              business_requirement:
                "Write a concise, accurate introduction to NUERiQ using only supplied company and product information. Ask whether the recipient would like a short overview. Do not invent personal details or claims.",
            },
          });
          results.push({ status: "fulfilled", value: result });
        } catch (reason) {
          results.push({ status: "rejected", reason });
        }
      }
      const updates = new Map(
        results
          .filter((result) => result.status === "fulfilled")
          .map((result) => [result.value.lead.id, result.value.lead]),
      );
      setLeads((current) =>
        current.map((lead) => updates.get(lead.id) ?? lead),
      );
      setSelectedIds([]);
      const failures = results.filter((result) => result.status === "rejected");
      const failuresByReason = new Map();
      results.forEach((result, index) => {
        if (result.status !== "rejected") return;
        const reason = result.reason.message || "The draft request failed.";
        const companies = failuresByReason.get(reason) ?? [];
        companies.push(targets[index].company);
        failuresByReason.set(reason, companies);
      });
      const failureDetails = [...failuresByReason]
        .map(([reason, companies]) => `${reason} (${companies.join(", ")})`)
        .join("; ");
      showToast(
        failures.length
          ? `${updates.size} draft(s) generated; ${failures.length} failed. ${failureDetails}${targets.length > 20 ? " Only the first 20 were processed." : ""}`
          : `Generated ${updates.size} draft(s) for review.${targets.length > 20 ? " Only the first 20 were processed." : ""}`,
        failures.length ? "error" : "success",
      );
      return;
    }
    setLeads((current) =>
      current.map((lead) =>
        selectedIds.includes(lead.id)
          ? {
              ...lead,
              draft: makeDemoDraft(lead, draftRevisions[lead.id] ?? 0),
              emailStatus: "Draft generated",
            }
          : lead,
      ),
    );
    setSelectedIds([]);
    showToast(
      `Created ${targets.length} local demo draft${targets.length === 1 ? "" : "s"}. No email was sent.`,
      "success",
    );
  }

  function rejectDemoDraft(lead) {
    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? { ...item, draft: null, emailStatus: "Rejected" }
          : item,
      ),
    );
    showToast(
      "Demo draft rejected locally. No backend record was changed.",
      "info",
    );
  }

  async function rejectDraft(lead) {
    if (!demoMode && lead.draft?.draftId) {
      try {
        await apiRequest({
          method: "delete",
          url: `/api/drafts/${encodeURIComponent(lead.draft.draftId)}`,
        });
      } catch (error) {
        showToast(error.message, "error");
        return;
      }
      setLeads((current) =>
        current.map((item) =>
          item.id === lead.id
            ? { ...item, draft: null, emailStatus: "Rejected" }
            : item,
        ),
      );
      showToast("Draft rejected and removed from FastAPI.", "success");
      return;
    }
    rejectDemoDraft(lead);
  }

  async function approveAndSend(lead) {
    if (demoMode) {
      showToast("Sending is disabled while demo data is enabled.", "error");
      return;
    }
    if (!lead.draft?.draftId) {
      showToast("Save a generated draft before sending.", "error");
      return;
    }
    try {
      await apiRequest({
        method: "patch",
        url: `/api/drafts/${encodeURIComponent(lead.draft.draftId)}`,
        data: {
          subject: lead.draft.subject,
          body: lead.draft.body,
        },
      });
      await apiRequest({
        method: "post",
        url: `/api/drafts/${encodeURIComponent(lead.draft.draftId)}/send`,
      });
      const result = await apiRequest({ method: "get", url: "/api/leads" });
      setLeads(result.leads);
      setSelectedLeadId(null);
      showToast(`Email sent to ${lead.email}.`, "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function sendApprovedDrafts() {
    try {
      const result = await apiRequest({
        method: "post",
        url: "/api/drafts/send-approved",
        data: { confirm: true, limit: 20 },
      });
      const leadsResult = await apiRequest({
        method: "get",
        url: "/api/leads",
      });
      setLeads(leadsResult.leads);
      showToast(`Sent ${result.sent} approved email(s).`, "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-700">
            Prospecting workspace
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            Find the right conversations.
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
                Research leads and prepare outreach. Sending requires a reviewed
                draft and a permitted outreach path.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 self-start rounded-md border px-2.5 py-1.5 text-[10px] font-semibold sm:self-auto ${
            demoMode
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          <AlertCircle size={13} />
          {backendStatus}
        </span>
      </div>

      {!demoMode && (
        <FileUpload
        generating={generation?.status === "running"}
        onGenerateLeads={handleDiscoverLeads}
        onImportLeads={handleImportLeads}
        />
      )}
      <LeadGenerationProgress state={generation} />

      {demoMode && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[10px] leading-4 text-amber-900">
          <AlertCircle className="mt-0.5 shrink-0" size={14} />
          All companies, scores, research, consent labels, activity, and drafts
          on this screen are illustrative demo data. They are not real
          prospects, provider events, verified consent, or AI output.
        </div>
      )}

      <BulkActionToolbar
        approvedCount={approvedCount}
        onGenerateSelected={generateSelectedEmails}
        onViewSelected={() => viewDrafts(selectedDrafts)}
        onSendApproved={sendApprovedDrafts}
        selectedCount={selectedIds.length}
        viewableCount={selectedDrafts.length}
      />
      <LeadsTable
        leads={leads}
        onGenerateEmail={generateEmail}
        onOpenLead={(lead) => openLead(lead)}
        onSelectionChange={setSelectedIds}
        onViewDraft={(lead) => viewDrafts([lead])}
        selectedIds={selectedIds}
      />

      <div className="flex items-start gap-2 px-1 text-[10px] leading-4 text-slate-500">
        <ArrowUpRight className="mt-0.5 shrink-0" size={13} />
        {demoMode
          ? "Demo interactions are local to this browser session. Turn off demo data to connect to FastAPI."
          : "Lead imports, discovery, email drafting, review, and guarded sending are handled by the local FastAPI service."}
      </div>

      {selectedLead && (
        <LeadDetailsDrawer
          initialTab={drawerInitialTab}
          lead={selectedLead}
          onApproveAndSend={approveAndSend}
          onClose={() => setSelectedLeadId(null)}
          onGenerateEmail={generateEmail}
          onRejectDraft={rejectDraft}
          onSaveDraft={updateLeadDraft}
        />
      )}
      {viewingDrafts.length > 0 && (
        <DraftEmailViewer
          leads={viewingDrafts}
          onClose={() => setViewingDrafts([])}
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
