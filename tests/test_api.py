import os
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend import api


class FastApiTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        output = Path(self.temporary_directory.name)
        self.paths = {
            "LEADS_PATH": output / "leads.csv",
            "DRAFTS_PATH": output / "drafts.csv",
            "SEND_LOG_PATH": output / "send-log.csv",
            "REPLY_EVENTS_PATH": output / "reply-events.csv",
            "INBOUND_RECEIPTS_PATH": output / "inbound-receipts.csv",
            "PROVIDER_EVENTS_PATH": output / "provider-events.csv",
            "FRONTEND_DIST": output / "frontend-dist",
        }
        self.paths["FRONTEND_DIST"].mkdir()
        self.path_patches = [
            patch.object(api, name, path)
            for name, path in self.paths.items()
        ]
        for path_patch in self.path_patches:
            path_patch.start()
        self.client = TestClient(api.app)
        with api.job_lock:
            api.jobs.clear()

    def tearDown(self):
        for path_patch in reversed(self.path_patches):
            path_patch.stop()
        self.temporary_directory.cleanup()

    def test_health_reports_provider_configuration_without_secrets(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertNotIn("api_key", str(response.json()).lower())

    def test_combined_server_serves_frontend_root_and_spa_routes(self):
        frontend_dist = self.paths["FRONTEND_DIST"]
        (frontend_dist / "index.html").write_text(
            "<html>dashboard</html>", encoding="utf-8"
        )
        (frontend_dist / "assets").mkdir()
        (frontend_dist / "assets" / "app.js").write_text(
            "console.log('dashboard')", encoding="utf-8"
        )

        root = self.client.get("/")
        spa_route = self.client.get("/monitoring")
        asset = self.client.get("/assets/app.js")

        self.assertEqual(root.status_code, 200)
        self.assertIn("dashboard", root.text)
        self.assertEqual(spa_route.status_code, 200)
        self.assertIn("dashboard", spa_route.text)
        self.assertEqual(asset.status_code, 200)
        self.assertIn("console.log", asset.text)

    def test_combined_server_does_not_fallback_for_unknown_api_or_webhook_routes(self):
        self.assertEqual(self.client.get("/api/not-a-route").status_code, 404)
        self.assertEqual(self.client.get("/webhooks/not-a-route").status_code, 404)

    def test_combined_server_compresses_large_static_assets(self):
        frontend_dist = self.paths["FRONTEND_DIST"]
        (frontend_dist / "assets").mkdir()
        content = "const dashboard = 'fast';" * 1000
        (frontend_dist / "assets" / "app.js").write_text(
            content, encoding="utf-8"
        )

        response = self.client.get(
            "/assets/app.js", headers={"Accept-Encoding": "gzip"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("content-encoding"), "gzip")
        self.assertEqual(response.text, content)

    def test_imports_supported_contacts_and_skips_invalid_rows(self):
        response = self.client.post(
            "/api/leads/import",
            params={"filename": "leads.csv"},
            content=(
                "company_name,email,industry,contact_person,phone,mobile number,website,website_status\n"
                "Example Academy,owner@example.com,Music education,Alex Owner,+1 (555) 0100-100,+91 98765-43210,https://academy.example,Accessible\n"
                "Missing Email,,Music education,,,,,\n"
            ),
            headers={"Content-Type": "application/octet-stream"},
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["added"], 1)
        self.assertEqual(result["total"], 1)
        self.assertEqual(len(result["skipped"]), 1)
        self.assertEqual(result["leads"][0]["company"], "Example Academy")
        self.assertEqual(result["leads"][0]["consent"], "Consent not verified")
        self.assertEqual(
            result["leads"][0]["phone"],
            "+1 (555) 0100-100, +91 98765-43210",
        )
        self.assertEqual(result["leads"][0]["contact"], "Alex Owner")
        self.assertEqual(result["leads"][0]["websiteStatus"], "Accessible")

    def test_import_rejects_unsupported_file_type(self):
        response = self.client.post(
            "/api/leads/import",
            params={"filename": "contacts.pdf"},
            content=b"not a lead file",
        )
        self.assertEqual(response.status_code, 415)

    def test_discovery_accepts_user_prompt_count_and_pdf_reference(self):
        with patch.dict(
            os.environ,
            {"SERPER_API_KEY": "test-serper", "OPENAI_API_KEY": "test-openai"},
        ), patch.object(api.job_executor, "submit") as submit:
            response = self.client.post(
                "/api/leads/discover",
                data={
                    "lead_count": "7",
                    "targeting_prompt": "Find music academies in Hyderabad",
                },
                files={
                    "reference_file": (
                        "brief.pdf",
                        b"%PDF-test",
                        "application/pdf",
                    )
                },
            )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()["requested_lead_count"], 7)
        self.assertEqual(submit.call_args.args[2:], (
            7,
            "Find music academies in Hyderabad",
            "brief.pdf",
            b"%PDF-test",
        ))

    def test_running_discovery_job_rejects_another_request(self):
        with api.job_lock:
            api.jobs["existing-job"] = {
                "job_id": "existing-job",
                "status": "running",
            }
        with patch.dict(
            os.environ,
            {"SERPER_API_KEY": "test-serper", "OPENAI_API_KEY": "test-openai"},
        ), patch.object(api.job_executor, "submit") as submit:
            response = self.client.post(
                "/api/leads/discover",
                data={"lead_count": "3", "targeting_prompt": "Different request"},
            )
        self.assertEqual(response.status_code, 409)
        submit.assert_not_called()

    def test_discovery_background_failure_sets_failed_job_state(self):
        job_id = "failed-discovery"
        with api.job_lock:
            api.jobs[job_id] = {"job_id": job_id, "status": "running"}
        with patch.object(
            api.agent_workflows,
            "build_lead_discovery_graph",
            side_effect=RuntimeError("provider unavailable"),
        ), patch.object(api.logger, "exception") as log_exception:
            api._run_discovery(job_id, 5, "Music schools in Hyderabad", "", b"")
        self.assertEqual(api.jobs[job_id]["status"], "failed")
        self.assertEqual(api.jobs[job_id]["error"], "provider unavailable")
        log_exception.assert_called_once_with("Lead discovery failed.")

    def test_discovery_accepts_jpeg_reference(self):
        response_message = type("Message", (), {"content": "Image reference facts"})()
        response_choice = type(
            "Choice", (), {"message": response_message}
        )()
        response = type("Response", (), {"choices": [response_choice]})()
        client = type(
            "Client",
            (),
            {
                "chat": type(
                    "Chat",
                    (),
                    {
                        "completions": type(
                            "Completions",
                            (),
                            {"create": lambda self, **kwargs: response},
                        )()
                    },
                )()
            },
        )()
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-openai"}), patch(
            "openai.OpenAI", return_value=client
        ):
            result = api._extract_discovery_reference(
                "product.jpg", b"\xff\xd8\xfftest"
            )
        self.assertEqual(result, "Image reference facts")

    def test_pdf_reference_extraction_reads_every_page(self):
        class FakePage:
            def __init__(self, content):
                self.content = content

            def extract_text(self):
                return self.content

        class FakePdfReader:
            pages = [FakePage("First page."), FakePage("Second page.")]
            is_encrypted = False

        with patch("pypdf.PdfReader", return_value=FakePdfReader()):
            result = api._extract_discovery_reference("brief.pdf", b"%PDF-test")
        self.assertEqual(result, "First page.\n\nSecond page.")

    def test_pdf_reference_rejects_text_beyond_ai_context_limit(self):
        class FakePage:
            def extract_text(self):
                return "x" * (api.MAX_REFERENCE_TEXT_CHARS + 1)

        class FakePdfReader:
            pages = [FakePage()]
            is_encrypted = False

        with patch("pypdf.PdfReader", return_value=FakePdfReader()):
            with self.assertRaises(HTTPException) as raised:
                api._extract_discovery_reference("brief.pdf", b"%PDF-test")
        self.assertEqual(raised.exception.status_code, 413)

    def test_discovery_rejects_lead_count_above_limit(self):
        with patch.dict(
            os.environ,
            {"SERPER_API_KEY": "test-serper", "OPENAI_API_KEY": "test-openai"},
        ), patch.object(api.job_executor, "submit") as submit:
            response = self.client.post(
                "/api/leads/discover",
                data={"lead_count": "101", "targeting_prompt": ""},
            )
        self.assertEqual(response.status_code, 422)
        submit.assert_not_called()

    def test_initial_draft_is_saved_unapproved_for_human_review(self):
        lead = {
            "company_name": "Example Academy",
            "primary_email": "owner@example.com",
            "contact_consent": "",
            "unsubscribed": "false",
            "do_not_contact": "false",
        }
        api.email_agent.write_csv(
            self.paths["LEADS_PATH"], [lead], api.LEAD_FIELDS
        )
        generated = {
            **lead,
            "draft_id": "draft-review-1",
            "subject": "Would an overview be useful?",
            "text_content": "Would you like an overview? Reply unsubscribe.",
            "outreach_type": "permission_request",
            "reply_to_email": "replies@example.com",
            "approved_to_send": "false",
        }
        with patch.dict(
            os.environ,
            {
                "OPENAI_API_KEY": "test-key",
                "BREVO_REPLY_TO_EMAIL": "replies@example.com",
            },
        ), patch.object(
            api.email_agent, "prepare_drafts", return_value=([generated], [])
        ):
            response = self.client.post(
                f"/api/leads/{api._lead_id(lead['primary_email'])}/draft",
                json={
                    "business_requirement": (
                        "Ask whether the contact would like a product overview."
                    )
                },
            )
        self.assertEqual(response.status_code, 200)
        saved = api.email_agent.read_csv(self.paths["DRAFTS_PATH"])
        self.assertEqual(saved[0]["approved_to_send"], "false")
        self.assertEqual(saved[0]["outreach_type"], "permission_request")
        self.assertEqual(response.json()["lead"]["draft"]["draftId"], "draft-review-1")

    def test_permission_request_draft_requires_configured_reply_address(self):
        lead = {
            "company_name": "Example Academy",
            "primary_email": "owner@example.com",
            "contact_consent": "",
            "unsubscribed": "false",
            "do_not_contact": "false",
        }
        api.email_agent.write_csv(
            self.paths["LEADS_PATH"], [lead], api.LEAD_FIELDS
        )
        with patch.dict(
            os.environ,
            {
                "OPENAI_API_KEY": "test-key",
                "BREVO_REPLY_TO_EMAIL": "",
            },
        ):
            response = self.client.post(
                f"/api/leads/{api._lead_id(lead['primary_email'])}/draft",
                json={
                    "business_requirement": (
                        "Ask whether the contact would like a product overview."
                    )
                },
            )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json()["detail"],
            "Set BREVO_REPLY_TO_EMAIL in the backend .env before drafting an initial permission request.",
        )

    def test_send_requires_brevo_configuration(self):
        draft = {
            "primary_email": "owner@example.com",
            "draft_id": "draft-1",
            "subject": "Subject",
            "text_content": "Message",
            "outreach_type": "permission_request",
            "approved_to_send": "false",
        }
        api.email_agent.write_csv(
            self.paths["DRAFTS_PATH"], [draft], api.DRAFT_FIELDS
        )
        with patch.dict(
            os.environ,
            {"BREVO_API_KEY": "", "BREVO_SENDER_EMAIL": ""},
        ):
            response = self.client.post("/api/drafts/draft-1/send")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            api.email_agent.read_csv(self.paths["DRAFTS_PATH"])[0][
                "approved_to_send"
            ],
            "false",
        )

    def test_send_uses_human_approval_and_existing_send_guards(self):
        draft = {
            "primary_email": "owner@example.com",
            "company_name": "Example Academy",
            "draft_id": "draft-2",
            "subject": "Subject",
            "text_content": "Message. Reply unsubscribe.",
            "outreach_type": "permission_request",
            "reply_to_email": "replies@example.com",
            "approved_to_send": "false",
            "unsubscribed": "false",
            "do_not_contact": "false",
        }
        api.email_agent.write_csv(
            self.paths["DRAFTS_PATH"], [draft], api.DRAFT_FIELDS
        )
        with patch.dict(
            os.environ,
            {
                "BREVO_API_KEY": "test-key",
                "BREVO_SENDER_EMAIL": "sender@example.com",
                "BREVO_REPLY_TO_EMAIL": "replies@example.com",
            },
        ), patch.object(
            api.email_agent, "send_approved_drafts", return_value=1
        ) as send:
            response = self.client.post("/api/drafts/draft-2/send")
        self.assertEqual(response.status_code, 200)
        sent_draft = send.call_args.args[0][0]
        self.assertEqual(sent_draft["approved_to_send"], "true")
        self.assertEqual(send.call_args.kwargs["outreach_mode"], "permission_request")
        self.assertEqual(response.json()["sent"], True)

    def test_bulk_send_requires_confirmation_and_preapproved_drafts(self):
        draft = {
            "primary_email": "owner@example.com",
            "company_name": "Example Academy",
            "draft_id": "draft-bulk",
            "subject": "Subject",
            "text_content": "Message. Reply unsubscribe.",
            "outreach_type": "permission_request",
            "reply_to_email": "replies@example.com",
            "approved_to_send": "true",
            "unsubscribed": "false",
            "do_not_contact": "false",
        }
        api.email_agent.write_csv(
            self.paths["DRAFTS_PATH"], [draft], api.DRAFT_FIELDS
        )
        with patch.dict(
            os.environ,
            {
                "BREVO_API_KEY": "test-key",
                "BREVO_SENDER_EMAIL": "sender@example.com",
                "BREVO_REPLY_TO_EMAIL": "replies@example.com",
            },
        ), patch.object(
            api.email_agent, "send_approved_drafts", return_value=1
        ) as send:
            unconfirmed = self.client.post(
                "/api/drafts/send-approved",
                json={"confirm": False, "limit": 1},
            )
            response = self.client.post(
                "/api/drafts/send-approved",
                json={"confirm": True, "limit": 1},
            )
        self.assertEqual(unconfirmed.status_code, 400)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["sent"], 1)
        send.assert_called_once()

    def test_import_review_and_send_flow_uses_email_agent_without_live_brevo(self):
        imported = self.client.post(
            "/api/leads/import",
            params={"filename": "leads.csv"},
            content="company_name,email\nExample Academy,owner@example.com\n",
            headers={"Content-Type": "application/octet-stream"},
        )
        self.assertEqual(imported.status_code, 200)
        lead_id = imported.json()["leads"][0]["id"]
        lead_row = api.email_agent.read_csv(self.paths["LEADS_PATH"])[0]
        generated = {
            **lead_row,
            "draft_id": "draft-end-to-end",
            "subject": "An introduction to NUERiQ",
            "text_content": "Would you like an overview? Reply unsubscribe.",
            "outreach_type": "permission_request",
            "reply_to_email": "replies@example.com",
            "approved_to_send": "false",
        }
        with patch.dict(
            os.environ,
            {
                "OPENAI_API_KEY": "test-key",
                "BREVO_REPLY_TO_EMAIL": "replies@example.com",
            },
        ), patch.object(
            api.email_agent, "prepare_drafts", return_value=([generated], [])
        ):
            drafted = self.client.post(
                f"/api/leads/{lead_id}/draft",
                json={
                    "business_requirement": (
                        "Ask whether the contact would like a product overview."
                    )
                },
            )
        self.assertEqual(drafted.status_code, 200)
        self.assertEqual(
            drafted.json()["lead"]["draft"]["outreachType"],
            "permission_request",
        )

        with patch.dict(
            os.environ,
            {
                "BREVO_API_KEY": "test-key",
                "BREVO_SENDER_EMAIL": "sender@example.com",
                "BREVO_REPLY_TO_EMAIL": "replies@example.com",
            },
        ), patch.object(
            api.email_agent, "send_to_brevo", return_value="provider-message-id"
        ) as send:
            sent = self.client.post("/api/drafts/draft-end-to-end/send")
            refreshed = self.client.get("/api/leads")
        self.assertEqual(sent.status_code, 200)
        send.assert_called_once()
        self.assertEqual(refreshed.json()["leads"][0]["emailStatus"], "Sent")

    def test_inbound_webhook_rejects_an_invalid_token(self):
        response = self.client.post(
            "/webhooks/brevo/inbound/invalid-token",
            json={"items": []},
        )
        self.assertEqual(response.status_code, 404)

    def test_inbound_receipt_is_saved_before_reply_processing_can_fail(self):
        token = "r" * 40
        with patch.dict(
            os.environ,
            {
                "BREVO_INBOUND_WEBHOOK_TOKEN": token,
                "OPENAI_API_KEY": "",
            },
        ):
            response = self.client.post(
                f"/webhooks/brevo/inbound/{token}",
                json={
                    "items": [
                        {
                            "MessageId": "inbound-1",
                            "InReplyTo": "sent-message-1",
                            "From": {"Address": "owner@example.com"},
                        }
                    ]
                },
            )
        self.assertEqual(response.status_code, 503)
        receipts = api._read_rows(self.paths["INBOUND_RECEIPTS_PATH"])
        self.assertEqual(receipts[0]["email"], "owner@example.com")
        self.assertEqual(receipts[0]["message_id"], "inbound-1")

    def test_inbound_webhook_delegates_to_existing_reply_processor(self):
        token = "t" * 40
        inbound_items = [
            {
                "MessageId": "inbound-1",
                "InReplyTo": "sent-message-1",
                "From": {"Address": "owner@example.com"},
            }
        ]
        graph = type(
            "InboundGraph", (), {"invoke": Mock(return_value={"processed": 2})}
        )()
        with patch.dict(
            os.environ,
            {
                "BREVO_INBOUND_WEBHOOK_TOKEN": token,
                "OPENAI_API_KEY": "test-key",
            },
        ), patch.object(
            api.agent_workflows, "build_inbound_reply_graph", return_value=graph
        ) as build_graph:
            response = self.client.post(
                f"/webhooks/brevo/inbound/{token}",
                json={"items": inbound_items},
            )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json(), {"accepted": True, "processed": 2})
        build_graph.assert_called_once_with(api.email_agent)
        self.assertEqual(graph.invoke.call_args.args[0]["items"], inbound_items)
        self.assertEqual(
            graph.invoke.call_args.args[0]["reply_events_path"],
            self.paths["REPLY_EVENTS_PATH"],
        )

    def test_brevo_event_webhook_records_and_deduplicates_engagement(self):
        token = "e" * 40
        payload = {
            "event": "opened",
            "email": "owner@example.com",
            "message-id": "<provider-message-id>",
            "ts_epoch": 1772798400000,
        }
        with patch.dict(
            os.environ,
            {
                "BREVO_EVENT_WEBHOOK_TOKEN": token,
                "BREVO_WEBHOOK_PUBLIC_URL": "https://crm.example.com",
                "BREVO_INBOUND_WEBHOOK_TOKEN": "i" * 40,
                "BREVO_AUTOMATIC_FOLLOWUPS": "false",
                "OPENAI_API_KEY": "test-key",
            },
        ):
            first = self.client.post(
                f"/webhooks/brevo/events/{token}", json=payload
            )
            duplicate = self.client.post(
                f"/webhooks/brevo/events/{token}", json=payload
            )
            rows = api._read_rows(self.paths["PROVIDER_EVENTS_PATH"])
        self.assertEqual(first.status_code, 202)
        self.assertEqual(first.json()["recorded"], 1)
        self.assertEqual(duplicate.status_code, 202)
        self.assertEqual(duplicate.json()["recorded"], 0)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["event"], "opened")

    def test_brevo_camel_case_hard_bounce_adds_suppression(self):
        token = "e" * 40
        payload = {
            "event": "hardBounce",
            "email": "owner@example.com",
            "message-id": "<provider-message-id>",
            "ts_event": 1772802000,
        }
        with patch.dict(os.environ, {"BREVO_EVENT_WEBHOOK_TOKEN": token}):
            response = self.client.post(
                f"/webhooks/brevo/events/{token}", json=payload
            )
        self.assertEqual(response.status_code, 202)
        rows = api._read_rows(self.paths["SEND_LOG_PATH"])
        self.assertEqual(rows[0]["status"], "hard_bounce")
        self.assertEqual(rows[0]["email"], "owner@example.com")

    def test_monitoring_matches_brevo_events_to_sent_message_id(self):
        sent = {
            "draft_id": "draft-1",
            "email": "owner@example.com",
            "status": "sent",
            "message_id": "<provider-message-id>",
            "attempted_at": "2026-03-10T09:00:00+00:00",
            "subject": "A useful scheduling idea",
            "company_name": "Example Academy",
            "outreach_type": "permission_request",
        }
        api._write_rows(
            self.paths["SEND_LOG_PATH"], [sent], api.email_agent.SEND_LOG_FIELDS
        )
        api.email_agent.record_brevo_events(
            {
                "event": "opened",
                "email": "owner@example.com",
                "message-id": "provider-message-id",
                "ts_epoch": 1772798400000,
            },
            self.paths["PROVIDER_EVENTS_PATH"],
        )
        with patch.dict(
            os.environ,
            {
                "BREVO_WEBHOOK_PUBLIC_URL": "https://crm.example.com",
                "BREVO_EVENT_WEBHOOK_TOKEN": "e" * 40,
                "BREVO_INBOUND_WEBHOOK_TOKEN": "i" * 40,
                "OPENAI_API_KEY": "test-key",
            },
        ):
            result = self.client.get("/api/monitoring").json()
        self.assertTrue(result["metrics_available"])
        self.assertTrue(result["events"][0]["opened"])
        self.assertEqual(result["events"][0]["status"], "Opened")

    def test_due_followup_sends_only_valid_opted_in_contact_once(self):
        sent = {
            "draft_id": "original-draft",
            "email": "owner@example.com",
            "status": "sent",
            "message_id": "original-message",
            "attempted_at": "2026-03-09T04:30:00+00:00",
            "company_name": "Example Academy",
            "subject": "A useful scheduling idea",
            "text_content": (
                "Hello. Unsubscribe: https://example.com/unsubscribe?id=contact-1"
            ),
            "contact_consent": "opted_in",
            "consent_evidence": "Opt-in form submission",
            "consent_timestamp": "2026-01-01T10:00:00+05:30",
            "unsubscribe_url": "https://example.com/unsubscribe?id=contact-1",
            "unsubscribed": "false",
            "do_not_contact": "false",
            "outreach_type": "opted_in",
        }
        api._write_rows(
            self.paths["SEND_LOG_PATH"], [sent], api.email_agent.SEND_LOG_FIELDS
        )
        configured = {
            "BREVO_AUTOMATIC_FOLLOWUPS": "true",
            "BREVO_WEBHOOK_PUBLIC_URL": "https://crm.example.com",
            "BREVO_EVENT_WEBHOOK_TOKEN": "e" * 40,
            "BREVO_INBOUND_WEBHOOK_TOKEN": "i" * 40,
            "OPENAI_API_KEY": "test-key",
            "BREVO_API_KEY": "test-brevo",
            "BREVO_SENDER_EMAIL": "sender@example.com",
        }
        now = datetime(2026, 3, 11, 5, 0, tzinfo=timezone.utc)
        with patch.dict(os.environ, configured), patch.object(
            api.email_agent, "send_to_brevo", return_value="followup-message"
        ) as send:
            count = api.run_due_followups(now)
            second_count = api.run_due_followups(now)
        self.assertEqual(count, 1)
        self.assertEqual(second_count, 0)
        send.assert_called_once()
        followup = next(
            row
            for row in api._read_rows(self.paths["SEND_LOG_PATH"])
            if row.get("followup_of")
        )
        self.assertEqual(followup["followup_of"], "original-draft")
        self.assertEqual(followup["outreach_type"], "opted_in")

    def test_due_followup_is_blocked_by_any_recorded_reply(self):
        sent = {
            "draft_id": "original-draft",
            "email": "owner@example.com",
            "status": "sent",
            "attempted_at": "2026-03-09T04:30:00+00:00",
            "contact_consent": "opted_in",
            "consent_evidence": "Opt-in form submission",
            "consent_timestamp": "2026-01-01T10:00:00+05:30",
            "unsubscribe_url": "https://example.com/unsubscribe?id=contact-1",
            "unsubscribed": "false",
            "do_not_contact": "false",
            "outreach_type": "opted_in",
        }
        api._write_rows(
            self.paths["SEND_LOG_PATH"], [sent], api.email_agent.SEND_LOG_FIELDS
        )
        api.email_agent.record_inbound_receipts(
            [
                {
                    "MessageId": "inbound-1",
                    "From": {"Address": "OWNER@example.com"},
                }
            ],
            self.paths["INBOUND_RECEIPTS_PATH"],
        )
        with patch.dict(
            os.environ,
            {
                "BREVO_AUTOMATIC_FOLLOWUPS": "true",
                "BREVO_WEBHOOK_PUBLIC_URL": "https://crm.example.com",
                "BREVO_EVENT_WEBHOOK_TOKEN": "e" * 40,
                "BREVO_INBOUND_WEBHOOK_TOKEN": "i" * 40,
                "OPENAI_API_KEY": "test-key",
                "BREVO_API_KEY": "test-brevo",
                "BREVO_SENDER_EMAIL": "sender@example.com",
            },
        ), patch.object(api.email_agent, "send_to_brevo") as send:
            count = api.run_due_followups(
                datetime(2026, 3, 11, 5, 0, tzinfo=timezone.utc)
            )
        self.assertEqual(count, 0)
        send.assert_not_called()

    def test_due_followup_is_blocked_by_current_lead_do_not_contact_flag(self):
        sent = {
            "draft_id": "original-draft",
            "email": "owner@example.com",
            "status": "sent",
            "attempted_at": "2026-03-09T04:30:00+00:00",
            "contact_consent": "opted_in",
            "consent_evidence": "Opt-in form submission",
            "consent_timestamp": "2026-01-01T10:00:00+05:30",
            "unsubscribe_url": "https://example.com/unsubscribe?id=contact-1",
            "unsubscribed": "false",
            "do_not_contact": "false",
            "outreach_type": "opted_in",
        }
        api._write_rows(
            self.paths["SEND_LOG_PATH"], [sent], api.email_agent.SEND_LOG_FIELDS
        )
        api._write_rows(
            self.paths["LEADS_PATH"],
            [
                {
                    "primary_email": "owner@example.com",
                    "contact_consent": "opted_in",
                    "consent_evidence": "Opt-in form submission",
                    "consent_timestamp": "2026-01-01T10:00:00+05:30",
                    "unsubscribe_url": "https://example.com/unsubscribe?id=contact-1",
                    "unsubscribed": "false",
                    "do_not_contact": "true",
                }
            ],
            api.LEAD_FIELDS,
        )
        with patch.dict(
            os.environ,
            {
                "BREVO_AUTOMATIC_FOLLOWUPS": "true",
                "BREVO_WEBHOOK_PUBLIC_URL": "https://crm.example.com",
                "BREVO_EVENT_WEBHOOK_TOKEN": "e" * 40,
                "BREVO_INBOUND_WEBHOOK_TOKEN": "i" * 40,
                "OPENAI_API_KEY": "test-key",
                "BREVO_API_KEY": "test-brevo",
                "BREVO_SENDER_EMAIL": "sender@example.com",
            },
        ), patch.object(api.email_agent, "send_to_brevo") as send:
            count = api.run_due_followups(
                datetime(2026, 3, 11, 5, 0, tzinfo=timezone.utc)
            )
        self.assertEqual(count, 0)
        send.assert_not_called()

    def test_permission_request_sends_are_never_followup_candidates(self):
        candidates = api._followup_candidates(
            [
                {
                    "draft_id": "permission-draft",
                    "email": "owner@example.com",
                    "status": "sent",
                    "outreach_type": "permission_request",
                }
            ],
            [],
            [],
            [],
            [],
            datetime(2026, 3, 11, 5, 0, tzinfo=timezone.utc),
        )
        self.assertEqual(candidates, [])


if __name__ == "__main__":
    unittest.main()
