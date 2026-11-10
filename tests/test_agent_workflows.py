import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

from backend import agent_workflows, email_agent


class LeadDiscoveryGraphTests(unittest.TestCase):
    def test_runs_discovery_research_qualification_and_export_in_order(self):
        events = []

        class LeadAgent:
            REQUIRE_EMAIL = True
            TARGET_LEADS = 1
            OUTPUT_DIR = ""

            @staticmethod
            def discover_companies(
                targeting_prompt="", target_leads=20, progress_callback=None
            ):
                events.append("discover")
                assert "target music academies" in targeting_prompt
                assert target_leads == 1
                return [{"domain": "example.com", "website": "https://example.com"}]

            @staticmethod
            def extract_website_information(company):
                events.append("research")
                return {**company, "emails": ["owner@example.com"]}

            @staticmethod
            def qualify_all_companies(
                companies,
                targeting_prompt="",
                reference_text="",
                progress_callback=None,
            ):
                events.append("qualify")
                assert targeting_prompt == "target music academies"
                assert reference_text == "Reference document facts"
                return [
                    {"primary_email": companies[0]["emails"][0]},
                    {"primary_email": "second@example.com"},
                ]

            @staticmethod
            def export_leads(leads, output_dir=None):
                events.append("export")
                assert len(leads) == 1
                assert output_dir == "test-output"

        result = agent_workflows.build_lead_discovery_graph(LeadAgent).invoke(
            {
                "output_dir": "test-output",
                "target_leads": 1,
                "targeting_prompt": "target music academies",
                "reference_text": "Reference document facts",
            }
        )

        self.assertEqual(events, ["discover", "research", "qualify", "export"])
        self.assertEqual(len(result["leads"]), 2)
        self.assertEqual(len(result["final_leads"]), 1)

    def test_company_research_runs_concurrently_and_preserves_input_order(self):
        barrier = threading.Barrier(2)
        progress = []

        class LeadAgent:
            REQUIRE_EMAIL = False
            TARGET_LEADS = 2

            @staticmethod
            def discover_companies(
                targeting_prompt="", target_leads=20, progress_callback=None
            ):
                return [
                    {"domain": "first.example"},
                    {"domain": "second.example"},
                ]

            @staticmethod
            def extract_website_information(company):
                barrier.wait(timeout=3)
                return {**company, "emails": []}

            @staticmethod
            def qualify_all_companies(
                companies,
                targeting_prompt="",
                reference_text="",
                progress_callback=None,
            ):
                return []

            @staticmethod
            def export_leads(leads, output_dir=None):
                pass

        result = agent_workflows.build_lead_discovery_graph(LeadAgent).invoke(
            {"progress_callback": progress.append}
        )

        self.assertEqual(
            [company["domain"] for company in result["researched_companies"]],
            ["first.example", "second.example"],
        )
        self.assertEqual(len(progress), 2)


class EmailWorkflowGraphTests(unittest.TestCase):
    def test_draft_graph_persists_unapproved_draft(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            send_log_path = directory / "send-log.csv"
            drafts_path = directory / "drafts.csv"
            lead = {
                "company_name": "Example Academy",
                "primary_email": "owner@example.com",
                "unsubscribed": "false",
                "do_not_contact": "false",
            }
            draft = {
                **lead,
                "draft_id": "draft-1",
                "subject": "Introduction",
                "text_content": "Would an overview be useful?",
                "outreach_type": "permission_request",
                "reply_to_email": "replies@example.com",
                "approved_to_send": "false",
            }
            with patch.object(
                email_agent, "prepare_drafts", return_value=([draft], [])
            ) as generate:
                result = agent_workflows.build_draft_graph(
                    email_agent,
                    drafts_path,
                    ("primary_email", "draft_id", "approved_to_send"),
                ).invoke(
                    {
                        "lead": lead,
                        "outreach_mode": "permission_request",
                        "business_requirement": "Ask if the recipient wants details.",
                        "api_key": "test-key",
                        "model": "test-model",
                        "reply_to_email": "replies@example.com",
                        "send_log_path": str(send_log_path),
                    }
                )

            generate.assert_called_once()
            self.assertEqual(result["status"], "draft_saved_for_review")
            self.assertEqual(
                email_agent.read_csv(drafts_path)[0]["approved_to_send"], "false"
            )

    def test_draft_graph_blocks_suppressed_contacts_before_generation(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            send_log_path = directory / "send-log.csv"
            email_agent.write_csv(
                send_log_path,
                [{"email": "owner@example.com", "status": "unsubscribed"}],
                ("email", "status"),
            )
            with patch.object(email_agent, "prepare_drafts") as generate:
                with self.assertRaises(email_agent.EmailAgentError):
                    agent_workflows.build_draft_graph(
                        email_agent, directory / "drafts.csv", ("primary_email",)
                    ).invoke(
                        {
                            "lead": {
                                "primary_email": "owner@example.com",
                                "unsubscribed": "false",
                                "do_not_contact": "false",
                            },
                            "outreach_mode": "permission_request",
                            "business_requirement": "Ask if details are wanted.",
                            "api_key": "test-key",
                            "model": "test-model",
                            "reply_to_email": "replies@example.com",
                            "send_log_path": str(send_log_path),
                        }
                    )
            generate.assert_not_called()

    def test_send_graph_delegates_to_guarded_send_agent(self):
        with patch.object(email_agent, "send_approved_drafts", return_value=1) as send:
            result = agent_workflows.build_send_graph(email_agent).invoke(
                {
                    "drafts": [{"draft_id": "draft-1"}],
                    "api_key": "test-key",
                    "sender_email": "sender@example.com",
                    "sender_name": "Sales",
                    "send_log_path": "send-log.csv",
                    "limit": 1,
                    "outreach_mode": "permission_request",
                    "reply_to_email": "replies@example.com",
                }
            )

        self.assertEqual(result["sent"], 1)
        send.assert_called_once()

    def test_inbound_graph_validates_and_processes_payload(self):
        with patch.object(
            email_agent, "process_inbound_items", return_value=2
        ) as process:
            result = agent_workflows.build_inbound_reply_graph(email_agent).invoke(
                {
                    "items": [{"event": "reply"}],
                    "api_key": "test-key",
                    "model": "test-model",
                    "send_log_path": "send-log.csv",
                    "reply_drafts_path": "reply-drafts.csv",
                    "reply_events_path": "reply-events.csv",
                }
            )

        self.assertEqual(result["status"], "replies_processed")
        self.assertEqual(result["processed"], 2)
        process.assert_called_once()

    def test_inbound_graph_rejects_invalid_items_without_processing(self):
        with patch.object(email_agent, "process_inbound_items") as process:
            with self.assertRaises(email_agent.EmailAgentError):
                agent_workflows.build_inbound_reply_graph(email_agent).invoke(
                    {
                        "items": {},
                        "api_key": "test-key",
                        "model": "test-model",
                        "send_log_path": "send-log.csv",
                        "reply_drafts_path": "reply-drafts.csv",
                        "reply_events_path": "reply-events.csv",
                    }
                )
        process.assert_not_called()


if __name__ == "__main__":
    unittest.main()
