"""LangGraph workflows coordinating NUERiQ's existing sales agents."""

from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable, TypedDict

from langgraph.graph import END, START, StateGraph


DEFAULT_OUTPUT_DIR = str(Path(__file__).resolve().parent.parent / "data")


class LeadDiscoveryState(TypedDict, total=False):
    companies: list[dict[str, Any]]
    researched_companies: list[dict[str, Any]]
    leads: list[dict[str, Any]]
    final_leads: list[dict[str, Any]]
    output_dir: str
    target_leads: int
    targeting_prompt: str
    reference_text: str
    progress_callback: Callable[[str], None]
    status: str


class DraftState(TypedDict, total=False):
    lead: dict[str, Any]
    outreach_mode: str
    business_requirement: str
    api_key: str
    model: str
    reply_to_email: str
    send_log_path: Path | str
    drafts_path: Path | str
    draft_fields: tuple[str, ...]
    drafts: list[dict[str, Any]]
    draft: dict[str, Any]
    status: str


class SendState(TypedDict, total=False):
    drafts: list[dict[str, Any]]
    api_key: str
    sender_email: str
    sender_name: str
    send_log_path: Path | str
    limit: int
    outreach_mode: str
    reply_to_email: str
    sent: int
    status: str


class InboundReplyState(TypedDict, total=False):
    items: list[dict[str, Any]]
    api_key: str
    model: str
    send_log_path: Path | str
    reply_drafts_path: Path | str
    reply_events_path: Path | str
    processed: int
    status: str


def build_lead_discovery_graph(lead_agent=None):
    if lead_agent is None:
        from backend import leadscode as lead_agent

    def discover(state: LeadDiscoveryState):
        companies = lead_agent.discover_companies(
            state.get("targeting_prompt", ""),
            state.get("target_leads", lead_agent.TARGET_LEADS),
            state.get("progress_callback"),
        )
        return {
            "companies": companies,
            "status": f"Discovered {len(companies)} companies.",
        }

    def research(state: LeadDiscoveryState):
        companies = state["companies"]
        if not companies:
            return {
                "researched_companies": [],
                "status": "No companies found to research.",
            }
        workers = min(12, len(companies))
        researched = [None] * len(companies)
        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_indexes = {
                executor.submit(
                    lead_agent.extract_website_information, company
                ): index
                for index, company in enumerate(companies)
            }
            for completed, future in enumerate(
                as_completed(future_indexes), start=1
            ):
                researched[future_indexes[future]] = future.result()
                progress_callback = state.get("progress_callback")
                if progress_callback:
                    progress_callback(
                        f"Researching company websites: {completed}/{len(companies)} completed."
                    )
        return {
            "researched_companies": researched,
            "status": (
                f"Researched {len(researched)} company websites "
                f"using up to {workers} concurrent workers."
            ),
        }

    def qualify(state: LeadDiscoveryState):
        researched = state["researched_companies"]
        candidates = (
            [company for company in researched if company.get("emails")]
            if lead_agent.REQUIRE_EMAIL
            else researched
        )
        leads = lead_agent.qualify_all_companies(
            candidates,
            state.get("targeting_prompt", ""),
            state.get("reference_text", ""),
            state.get("progress_callback"),
        )
        remove_existing = getattr(lead_agent, "remove_existing_leads", None)
        if remove_existing:
            leads = remove_existing(
                leads,
                state.get("output_dir", DEFAULT_OUTPUT_DIR),
                state.get("targeting_prompt", ""),
            )
        target_leads = state.get("target_leads", lead_agent.TARGET_LEADS)
        return {
            "leads": leads,
            "final_leads": leads[:target_leads],
            "status": f"Qualified {len(leads)} leads.",
        }

    def export(state: LeadDiscoveryState):
        lead_agent.export_leads(
            state["final_leads"], state.get("output_dir", DEFAULT_OUTPUT_DIR)
        )
        return {
            "status": f"Exported {len(state['final_leads'])} qualified leads.",
        }

    graph = StateGraph(LeadDiscoveryState)
    graph.add_node("discover_companies", discover)
    graph.add_node("research_companies", research)
    graph.add_node("qualify_leads", qualify)
    graph.add_node("export_leads", export)
    graph.add_edge(START, "discover_companies")
    graph.add_edge("discover_companies", "research_companies")
    graph.add_edge("research_companies", "qualify_leads")
    graph.add_edge("qualify_leads", "export_leads")
    graph.add_edge("export_leads", END)
    return graph.compile()


def build_draft_graph(email_agent, drafts_path, draft_fields):
    destination = Path(drafts_path)

    def validate(state: DraftState):
        lead = state.get("lead")
        if not isinstance(lead, dict):
            raise email_agent.EmailAgentError("A lead record is required.")
        mode = state.get("outreach_mode")
        if mode not in {"opted_in", "permission_request"}:
            raise email_agent.EmailAgentError("Unsupported draft outreach mode.")
        email = email_agent.validate_email(lead.get("primary_email", ""))
        send_log = Path(state["send_log_path"])
        if send_log.exists():
            suppressions = {
                row.get("email", "").strip().lower()
                for row in email_agent.read_csv(send_log)
                if row.get("status") in email_agent.SUPPRESSION_STATUSES
            }
            if email.lower() in suppressions:
                raise email_agent.EmailAgentError(
                    "This address is on the suppression list."
                )
        if mode == "opted_in":
            email_agent.validate_contact(lead)
        else:
            if email_agent.contact_is_unsubscribed(lead.get("unsubscribed", "")):
                raise email_agent.EmailAgentError("Contact is marked unsubscribed.")
            if email_agent.contact_is_unsubscribed(lead.get("do_not_contact", "")):
                raise email_agent.EmailAgentError("Contact is marked do-not-contact.")
            email_agent.validate_email(state.get("reply_to_email", ""))
        if not state.get("api_key"):
            raise email_agent.EmailAgentError(
                "Set OPENAI_API_KEY before generating drafts."
            )
        return {"status": "validated"}

    def generate(state: DraftState):
        drafts, skipped = email_agent.prepare_drafts(
            [state["lead"]],
            state["business_requirement"],
            state["api_key"],
            state["model"],
            state["outreach_mode"],
            state.get("reply_to_email", ""),
        )
        if skipped or not drafts:
            reason = skipped[0][1] if skipped else "Draft generation returned no draft."
            raise email_agent.EmailAgentError(reason)
        return {"draft": drafts[0], "status": "draft_generated"}

    def persist(state: DraftState):
        existing = (
            email_agent.read_csv(destination) if destination.exists() else []
        )
        email = state["draft"]["primary_email"].strip().lower()
        retained = [
            row
            for row in existing
            if row.get("primary_email", "").strip().lower() != email
        ]
        retained.append(state["draft"])
        email_agent.write_csv(destination, retained, draft_fields)
        return {
            "drafts": retained,
            "status": "draft_saved_for_review",
        }

    graph = StateGraph(DraftState)
    graph.add_node("validate_contact", validate)
    graph.add_node("generate_draft", generate)
    graph.add_node("persist_unapproved_draft", persist)
    graph.add_edge(START, "validate_contact")
    graph.add_edge("validate_contact", "generate_draft")
    graph.add_edge("generate_draft", "persist_unapproved_draft")
    graph.add_edge("persist_unapproved_draft", END)
    return graph.compile()


def build_send_graph(email_agent):
    def validate(state: SendState):
        if state.get("outreach_mode") not in email_agent.OUTREACH_MODES:
            raise email_agent.EmailAgentError("Unsupported send outreach mode.")
        if not state.get("drafts"):
            raise email_agent.EmailAgentError("At least one reviewed draft is required.")
        if not state.get("api_key"):
            raise email_agent.EmailAgentError("Set BREVO_API_KEY before sending.")
        return {"status": "send_validated"}

    def send(state: SendState):
        sent = email_agent.send_approved_drafts(
            state["drafts"],
            state["api_key"],
            state["sender_email"],
            state.get("sender_name", ""),
            state["send_log_path"],
            state["limit"],
            outreach_mode=state["outreach_mode"],
            reply_to_email=state.get("reply_to_email", ""),
        )
        return {"sent": sent, "status": "send_completed"}

    graph = StateGraph(SendState)
    graph.add_node("validate_send", validate)
    graph.add_node("send_through_guarded_agent", send)
    graph.add_edge(START, "validate_send")
    graph.add_edge("validate_send", "send_through_guarded_agent")
    graph.add_edge("send_through_guarded_agent", END)
    return graph.compile()


def build_inbound_reply_graph(email_agent):
    def validate(state: InboundReplyState):
        if not state.get("api_key"):
            raise email_agent.EmailAgentError(
                "Set OPENAI_API_KEY before processing replies."
            )
        if not isinstance(state.get("items"), list):
            raise email_agent.EmailAgentError(
                "Brevo inbound payload must contain an items list."
            )
        return {"status": "inbound_payload_validated"}

    def process(state: InboundReplyState):
        processed = email_agent.process_inbound_items(
            state["items"],
            state["api_key"],
            state["model"],
            state["send_log_path"],
            state["reply_drafts_path"],
            state["reply_events_path"],
        )
        return {"processed": processed, "status": "replies_processed"}

    graph = StateGraph(InboundReplyState)
    graph.add_node("validate_inbound_payload", validate)
    graph.add_node("classify_and_record_replies", process)
    graph.add_edge(START, "validate_inbound_payload")
    graph.add_edge("validate_inbound_payload", "classify_and_record_replies")
    graph.add_edge("classify_and_record_replies", END)
    return graph.compile()
