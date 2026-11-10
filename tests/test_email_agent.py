import csv
import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from backend import email_agent
from backend.product_info import PRODUCT_DESCRIPTION


class EmailAgentTests(unittest.TestCase):
    def setUp(self):
        self.contact = {
            "primary_email": "owner@example.com",
            "company_name": "Example Academy",
            "contact_consent": "opted_in",
            "consent_evidence": "Opt-in form submission",
            "consent_timestamp": "2026-01-01T10:00:00+05:30",
            "unsubscribed": "false",
            "unsubscribe_url": "https://example.com/unsubscribe?id=contact-1",
            "approved_to_send": "true",
            "draft_id": "draft-1",
            "subject": "A useful scheduling idea",
            "text_content": "Hello, Example Academy.\n\nUnsubscribe: https://example.com/unsubscribe?id=contact-1",
        }
        self.reply_analysis = {
            "customer_intent": "INTERESTED",
            "sentiment": "POSITIVE",
            "main_question": "How does scheduling work?",
            "customer_requirements": ["Scheduling"],
            "recommended_action": "GENERATE_RESPONSE",
            "requires_human": False,
            "stop_followups": False,
            "do_not_contact": False,
            "email_subject": "Re: A useful scheduling idea",
            "email_response": "Thank you for asking. I can share more details.",
            "followup_required": False,
            "followup_days": None,
        }

    def write_sent_record(self, path):
        row = {
            "draft_id": "draft-1",
            "email": "owner@example.com",
            "status": "sent",
            "message_id": "<provider-id>",
            "company_name": "Example Academy",
            "contact_name": "Owner",
            "subject": "A useful scheduling idea",
            "text_content": "Hello, Example Academy.",
            "conversation_history": "",
            "contact_consent": "opted_in",
            "consent_evidence": "Opt-in form submission",
            "consent_timestamp": "2026-01-01T10:00:00+05:30",
            "unsubscribe_url": self.contact["unsubscribe_url"],
            "unsubscribed": "false",
            "do_not_contact": "false",
        }
        email_agent.write_csv(path, [row], email_agent.SEND_LOG_FIELDS)

    def test_initial_message_reply_can_be_drafted_and_sent_as_customer_reply(self):
        with tempfile.TemporaryDirectory() as directory:
            send_log = Path(directory) / "send-log.csv"
            drafts_path = Path(directory) / "reply-drafts.csv"
            events_path = Path(directory) / "reply-events.csv"
            self.write_sent_record(send_log)
            sent_rows = email_agent.read_csv(send_log)
            sent_rows[0].update(
                {
                    "contact_consent": "",
                    "consent_evidence": "",
                    "consent_timestamp": "",
                    "unsubscribe_url": "",
                    "outreach_type": "permission_request",
                    "reply_to_email": "replies@example.com",
                }
            )
            email_agent.write_csv(
                send_log, sent_rows, email_agent.SEND_LOG_FIELDS
            )
            with patch.object(
                email_agent,
                "analyze_customer_reply",
                return_value=self.reply_analysis,
            ):
                email_agent.process_inbound_items(
                    [self.inbound_item()],
                    "test-api-key",
                    "test-model",
                    send_log,
                    drafts_path,
                    events_path,
                )
            draft = email_agent.read_csv(drafts_path)[0]
            self.assertEqual(draft["outreach_type"], "customer_reply")
            self.assertEqual(draft["reply_to_email"], "replies@example.com")
            self.assertEqual(draft["in_reply_to_message_id"], "<reply-id>")
            self.assertEqual(draft["approved_to_send"], "false")
            draft["approved_to_send"] = "true"
            with patch.object(email_agent, "send_to_brevo", return_value="reply-id") as send:
                sent = email_agent.send_approved_drafts(
                    [draft],
                    "test-api-key",
                    "sender@example.com",
                    "NUERiQ",
                    send_log,
                    1,
                    outreach_mode="customer_reply",
                    reply_to_email="replies@example.com",
                )
            self.assertEqual(sent, 1)
            self.assertEqual(send.call_args.args[-1], "customer_reply")

    def inbound_item(self, message="Could you explain scheduling?"):
        return {
            "MessageId": "<reply-id>",
            "InReplyTo": "<provider-id>",
            "From": {"Name": "Owner", "Address": "owner@example.com"},
            "Subject": "Re: A useful scheduling idea",
            "ExtractedMarkdownMessage": message,
            "SpamScore": 0,
        }

    def test_requires_explicit_opt_in_and_review(self):
        not_opted_in = {**self.contact, "contact_consent": ""}
        not_reviewed = {**self.contact, "approved_to_send": "false"}
        with self.assertRaises(email_agent.EmailAgentError):
            email_agent.validate_contact(not_opted_in)
        with self.assertRaises(email_agent.EmailAgentError):
            email_agent.validate_contact(not_reviewed, require_approval=True)

    def test_drafting_never_calls_ai_for_contacts_without_consent(self):
        not_opted_in = {**self.contact, "contact_consent": ""}
        with patch.object(email_agent, "generate_email") as generate:
            drafts, skipped = email_agent.prepare_drafts(
                [not_opted_in], "business requirement", "api-key", "model"
            )
        self.assertEqual(drafts, [])
        self.assertEqual(len(skipped), 1)
        generate.assert_not_called()

    def test_permission_request_draft_does_not_require_optin_fields(self):
        lead = {
            "primary_email": "owner@example.com",
            "company_name": "Example Academy",
        }
        with patch.object(
            email_agent,
            "generate_email",
            return_value=("A quick question about Example Academy", "Hello there."),
        ):
            drafts, skipped = email_agent.prepare_drafts(
                [lead],
                "Ask whether they would like product information.",
                "test-api-key",
                "test-model",
                outreach_mode="permission_request",
                reply_to_email="replies@example.com",
            )
        self.assertEqual(skipped, [])
        self.assertEqual(len(drafts), 1)
        self.assertEqual(drafts[0]["outreach_type"], "permission_request")
        self.assertEqual(drafts[0]["approved_to_send"], "false")
        self.assertIn("reply with 'unsubscribe'", drafts[0]["text_content"])
        self.assertEqual(drafts[0]["reply_to_email"], "replies@example.com")

    def test_initial_send_requires_explicit_mode_and_review(self):
        draft = {
            "primary_email": "owner@example.com",
            "company_name": "Example Academy",
            "contact_consent": "",
            "consent_evidence": "",
            "consent_timestamp": "",
            "unsubscribe_url": "",
            "unsubscribed": "false",
            "do_not_contact": "false",
            "outreach_type": "permission_request",
            "reply_to_email": "replies@example.com",
            "approved_to_send": "true",
            "draft_id": "initial-draft",
            "subject": "A quick question about Example Academy",
            "text_content": (
                "Would you like more information? Reply with 'unsubscribe'."
            ),
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "send-log.csv"
            with patch.object(email_agent, "send_to_brevo") as send:
                default_sent = email_agent.send_approved_drafts(
                    [draft],
                    "test-api-key",
                    "sender@example.com",
                    "NUERiQ",
                    path,
                    1,
                )
                self.assertEqual(default_sent, 0)
                send.assert_not_called()
                initial_sent = email_agent.send_approved_drafts(
                    [draft],
                    "test-api-key",
                    "sender@example.com",
                    "NUERiQ",
                    path,
                    1,
                    outreach_mode="permission_request",
                    reply_to_email="replies@example.com",
                )
            self.assertEqual(initial_sent, 1)
            send.assert_called_once()
            second_draft = {**draft, "draft_id": "initial-draft-2"}
            second_sent = email_agent.send_approved_drafts(
                [second_draft],
                "test-api-key",
                "sender@example.com",
                "NUERiQ",
                path,
                1,
                outreach_mode="permission_request",
                reply_to_email="replies@example.com",
            )
            self.assertEqual(second_sent, 0)
            send.assert_called_once()

    def test_initial_message_uses_reply_inbox_for_replies_and_unsubscribe(self):
        draft = {
            "primary_email": "owner@example.com",
            "company_name": "",
            "outreach_type": "permission_request",
            "reply_to_email": "replies@example.com",
            "approved_to_send": "true",
            "draft_id": "initial-draft",
            "subject": "A quick question",
            "text_content": "Would you like more information? Reply unsubscribe.",
        }

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{"messageId":"provider-id"}'

        def fake_urlopen(request, timeout):
            payload = json.loads(request.data)
            self.assertEqual(
                payload["to"],
                [{"email": "owner@example.com", "name": "Customer"}],
            )
            self.assertEqual(payload["replyTo"], {"email": "replies@example.com"})
            self.assertEqual(
                payload["headers"]["List-Unsubscribe"],
                "<mailto:replies@example.com?subject=unsubscribe>",
            )
            self.assertIn("Reply unsubscribe", payload["textContent"])
            return FakeResponse()

        with patch.object(email_agent, "urlopen", side_effect=fake_urlopen):
            message_id = email_agent.send_to_brevo(
                draft,
                "test-api-key",
                "sender@example.com",
                "NUERiQ",
                outreach_mode="permission_request",
            )
        self.assertEqual(message_id, "provider-id")

    def test_initial_send_retries_a_definitively_rejected_brevo_request(self):
        draft = {
            "primary_email": "owner@example.com",
            "company_name": "",
            "unsubscribed": "false",
            "do_not_contact": "false",
            "outreach_type": "permission_request",
            "reply_to_email": "replies@example.com",
            "approved_to_send": "true",
            "draft_id": "initial-draft-retry",
            "subject": "A quick question",
            "text_content": "Would you like more information? Reply unsubscribe.",
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "send-log.csv"
            with path.open("w", newline="", encoding="utf-8") as output:
                writer = csv.DictWriter(
                    output, fieldnames=email_agent.SEND_LOG_FIELDS
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "draft_id": "initial-draft-retry",
                        "email": "owner@example.com",
                        "status": "failed",
                        "detail": (
                            'Brevo rejected the email (HTTP 400): '
                            '{"code":"missing_parameter"}'
                        ),
                        "outreach_type": "permission_request",
                    }
                )
            with patch.object(
                email_agent, "send_to_brevo", return_value="provider-id"
            ) as send:
                sent = email_agent.send_approved_drafts(
                    [draft],
                    "test-api-key",
                    "sender@example.com",
                    "",
                    path,
                    1,
                    outreach_mode="permission_request",
                    reply_to_email="replies@example.com",
                )
            self.assertEqual(sent, 1)
            send.assert_called_once()
            rows = email_agent.read_csv(path)
            self.assertEqual(
                [row["status"] for row in rows], ["failed", "sent"]
            )

    def test_initial_send_does_not_retry_an_ambiguous_failed_request(self):
        draft = {
            "primary_email": "owner@example.com",
            "unsubscribed": "false",
            "do_not_contact": "false",
            "outreach_type": "permission_request",
            "reply_to_email": "replies@example.com",
            "approved_to_send": "true",
            "draft_id": "initial-draft-retry",
            "subject": "A quick question",
            "text_content": "Would you like more information? Reply unsubscribe.",
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "send-log.csv"
            with path.open("w", newline="", encoding="utf-8") as output:
                writer = csv.DictWriter(
                    output, fieldnames=email_agent.SEND_LOG_FIELDS
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "draft_id": "initial-draft-first-attempt",
                        "email": "owner@example.com",
                        "status": "failed",
                        "detail": "Could not reach Brevo: connection timed out",
                        "outreach_type": "permission_request",
                    }
                )
            with patch.object(email_agent, "send_to_brevo") as send:
                sent = email_agent.send_approved_drafts(
                    [draft],
                    "test-api-key",
                    "sender@example.com",
                    "",
                    path,
                    1,
                    outreach_mode="permission_request",
                    reply_to_email="replies@example.com",
                )
            self.assertEqual(sent, 0)
            send.assert_not_called()

    def test_intro_email_prompt_includes_product_information(self):
        response_body = json.dumps(
            {
                "subject": "NUERiQ for Example Academy",
                "body": (
                    "Hello.\n\nBest regards,\n[Your Name]\n[Your Company]"
                ),
            }
        )
        captured = {}

        class FakeOpenAI:
            def __init__(self, api_key):
                self.chat = SimpleNamespace(
                    completions=SimpleNamespace(create=self.create_completion)
                )

            def create_completion(self, **kwargs):
                captured.update(kwargs)
                return SimpleNamespace(
                    choices=[
                        SimpleNamespace(
                            message=SimpleNamespace(content=response_body)
                        )
                    ]
                )

        with patch.dict("sys.modules", {"openai": SimpleNamespace(OpenAI=FakeOpenAI)}):
            subject, body = email_agent.generate_email(
                {"company_name": "Example Academy"},
                "Introduce the academy management system.",
                "test-api-key",
                "test-model",
            )
            email_agent.generate_email(
                {"company_name": "Example Academy"},
                "Ask whether they would like product information.",
                "test-api-key",
                "test-model",
                outreach_mode="permission_request",
            )

        self.assertEqual(subject, "NUERiQ for Example Academy")
        self.assertEqual(body, "Hello.\n\nBest regards,\nNUERiQ")
        prompt = captured["messages"][0]["content"]
        user_payload = json.loads(captured["messages"][1]["content"])
        self.assertIn("product information", prompt)
        self.assertIn("exact signature", prompt)
        self.assertIn("NUERiQ on the line after Best regards", prompt)
        self.assertIn("do not include sender name", prompt)
        self.assertEqual(user_payload["product_information"], PRODUCT_DESCRIPTION)
        self.assertIn("AI-powered student practice feedback", user_payload["product_information"])
        self.assertIn("vocal, keyboard/harmonium, and violin", user_payload["product_information"])
        permission_prompt = captured["messages"][0]["content"]
        self.assertIn("asks whether the recipient would like", permission_prompt)
        self.assertIn("Do not presume consent", permission_prompt)

    def test_send_limit_cannot_exceed_run_cap(self):
        with self.assertRaises(email_agent.EmailAgentError):
            email_agent.send_approved_drafts(
                [], "test-api-key", "sender@example.com", "", "send-log.csv", 51
            )

    def test_do_not_contact_blocks_send(self):
        contact = {**self.contact, "do_not_contact": "true"}
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(email_agent, "send_to_brevo") as send:
                sent = email_agent.send_approved_drafts(
                    [contact],
                    "test-api-key",
                    "sender@example.com",
                    "",
                    Path(directory) / "send-log.csv",
                    1,
                )
        self.assertEqual(sent, 0)
        send.assert_not_called()

    def test_sent_log_keeps_reply_correlation_context(self):
        with tempfile.TemporaryDirectory() as directory:
            send_log = Path(directory) / "send-log.csv"
            with patch.object(email_agent, "send_to_brevo", return_value="provider-id"):
                sent = email_agent.send_approved_drafts(
                    [self.contact],
                    "test-api-key",
                    "sender@example.com",
                    "",
                    send_log,
                    1,
                )
            self.assertEqual(sent, 1)
            saved = email_agent.read_csv(send_log)[0]
            self.assertEqual(saved["status"], "sent")
            self.assertEqual(saved["message_id"], "provider-id")
            self.assertEqual(saved["subject"], self.contact["subject"])
            self.assertEqual(saved["contact_consent"], "opted_in")

    def test_requires_recipient_specific_https_unsubscribe_url(self):
        contact = {**self.contact, "unsubscribe_url": "http://example.com/stop"}
        with self.assertRaises(email_agent.EmailAgentError):
            email_agent.validate_contact(contact)

    def test_brevo_request_is_one_recipient_and_has_unsubscribe_header(self):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{"messageId":"provider-id"}'

        def fake_urlopen(request, timeout):
            self.assertEqual(timeout, 30)
            self.assertEqual(request.full_url, email_agent.BREVO_API_URL)
            self.assertEqual(request.get_header("Api-key"), "test-api-key")
            payload = json.loads(request.data)
            self.assertEqual(
                payload["to"],
                [{"email": "owner@example.com", "name": "Example Academy"}],
            )
            self.assertEqual(
                payload["headers"]["List-Unsubscribe"],
                "<https://example.com/unsubscribe?id=contact-1>",
            )
            self.assertEqual(payload["headers"]["In-Reply-To"], "<reply-id>")
            self.assertIn("unsubscribe", payload["textContent"].lower())
            self.assertIn("<a href=", payload["htmlContent"])
            return FakeResponse()

        with patch.object(email_agent, "urlopen", side_effect=fake_urlopen):
            result = email_agent.send_to_brevo(
                {
                    **self.contact,
                    "in_reply_to_message_id": "<reply-id>",
                },
                "test-api-key",
                "sender@example.com",
                "Sales",
            )
        self.assertEqual(result, "provider-id")

    def test_send_log_prevents_repeating_an_attempt(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "send-log.csv"
            with path.open("w", newline="", encoding="utf-8") as output:
                writer = csv.DictWriter(output, fieldnames=email_agent.SEND_LOG_FIELDS)
                writer.writeheader()
                writer.writerow(
                    {
                        "draft_id": "draft-1",
                        "email": "owner@example.com",
                        "status": "attempted",
                        "message_id": "",
                        "detail": "",
                        "attempted_at": "2026-01-01T00:00:00+00:00",
                    }
                )
            with patch.object(email_agent, "send_to_brevo") as send:
                sent = email_agent.send_approved_drafts(
                    [self.contact], "test-api-key", "sender@example.com", "",
                    path, 1
                )
            self.assertEqual(sent, 0)
            send.assert_not_called()

    def test_suppression_is_persistent(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "send-log.csv"
            email_agent.add_suppression("owner@example.com", path)
            self.assertEqual(email_agent.read_csv(path)[0]["status"], "unsubscribed")
            with patch.object(email_agent, "send_to_brevo") as send:
                sent = email_agent.send_approved_drafts(
                    [self.contact], "test-api-key", "sender@example.com", "",
                    path, 1
                )
            self.assertEqual(sent, 0)
            send.assert_not_called()

    def test_unsubscribe_upgrades_a_stopped_followup_record(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "send-log.csv"
            email_agent.add_suppression(
                "owner@example.com",
                path,
                "Not interested",
                status="stop_followups",
            )
            email_agent.add_suppression(
                "owner@example.com", path, "Explicit unsubscribe"
            )
            self.assertEqual(email_agent.read_csv(path)[0]["status"], "unsubscribed")

    def test_inbound_reply_creates_unapproved_draft_and_tracks_analysis(self):
        with tempfile.TemporaryDirectory() as directory:
            send_log = Path(directory) / "send-log.csv"
            drafts_path = Path(directory) / "reply-drafts.csv"
            events_path = Path(directory) / "reply-events.csv"
            self.write_sent_record(send_log)
            with patch.object(
                email_agent, "analyze_customer_reply",
                return_value=self.reply_analysis,
            ) as analyze, patch.object(email_agent, "send_to_brevo") as send:
                processed = email_agent.process_inbound_items(
                    [self.inbound_item()],
                    "test-api-key",
                    "test-model",
                    send_log,
                    drafts_path,
                    events_path,
                )
            self.assertEqual(processed, 1)
            analyze.assert_called_once()
            send.assert_not_called()
            draft = email_agent.read_csv(drafts_path)[0]
            self.assertEqual(draft["approved_to_send"], "false")
            self.assertEqual(draft["primary_email"], "owner@example.com")
            self.assertIn("unsubscribe", draft["text_content"].lower())
            self.assertEqual(draft["customer_intent"], "INTERESTED")
            self.assertEqual(email_agent.read_csv(events_path)[0]["status"], "drafted")

    def test_inbound_unsubscribe_is_recorded_without_ai_or_reply(self):
        with tempfile.TemporaryDirectory() as directory:
            send_log = Path(directory) / "send-log.csv"
            drafts_path = Path(directory) / "reply-drafts.csv"
            events_path = Path(directory) / "reply-events.csv"
            self.write_sent_record(send_log)
            with patch.object(email_agent, "analyze_customer_reply") as analyze:
                processed = email_agent.process_inbound_items(
                    [self.inbound_item("Please unsubscribe me.")],
                    "test-api-key",
                    "test-model",
                    send_log,
                    drafts_path,
                    events_path,
                )
            self.assertEqual(processed, 1)
            analyze.assert_not_called()
            self.assertFalse(drafts_path.exists())
            self.assertTrue(
                any(
                    row["status"] == "unsubscribed"
                    for row in email_agent.read_csv(send_log)
                )
            )
            self.assertEqual(
                email_agent.read_csv(events_path)[0]["status"], "suppressed"
            )

    def test_duplicate_inbound_message_does_not_create_duplicate_draft(self):
        with tempfile.TemporaryDirectory() as directory:
            send_log = Path(directory) / "send-log.csv"
            drafts_path = Path(directory) / "reply-drafts.csv"
            events_path = Path(directory) / "reply-events.csv"
            self.write_sent_record(send_log)
            with patch.object(
                email_agent, "analyze_customer_reply",
                return_value=self.reply_analysis,
            ) as analyze:
                for _ in range(2):
                    email_agent.process_inbound_items(
                        [self.inbound_item()],
                        "test-api-key",
                        "test-model",
                        send_log,
                        drafts_path,
                        events_path,
                    )
            analyze.assert_called_once()
            self.assertEqual(len(email_agent.read_csv(drafts_path)), 1)

    def test_unmatched_reply_is_not_sent_to_ai(self):
        with tempfile.TemporaryDirectory() as directory:
            send_log = Path(directory) / "send-log.csv"
            drafts_path = Path(directory) / "reply-drafts.csv"
            events_path = Path(directory) / "reply-events.csv"
            with patch.object(email_agent, "analyze_customer_reply") as analyze:
                email_agent.process_inbound_items(
                    [self.inbound_item()],
                    "test-api-key",
                    "test-model",
                    send_log,
                    drafts_path,
                    events_path,
                )
            analyze.assert_not_called()
            self.assertEqual(
                email_agent.read_csv(events_path)[0]["status"], "unmatched"
            )

    def test_out_of_office_reply_does_not_create_draft(self):
        out_of_office = {
            **self.reply_analysis,
            "customer_intent": "OUT_OF_OFFICE",
            "recommended_action": "NO_RESPONSE",
            "email_response": "",
        }
        with tempfile.TemporaryDirectory() as directory:
            send_log = Path(directory) / "send-log.csv"
            drafts_path = Path(directory) / "reply-drafts.csv"
            events_path = Path(directory) / "reply-events.csv"
            self.write_sent_record(send_log)
            with patch.object(
                email_agent, "analyze_customer_reply", return_value=out_of_office
            ):
                email_agent.process_inbound_items(
                    [self.inbound_item("I am out of office.")],
                    "test-api-key",
                    "test-model",
                    send_log,
                    drafts_path,
                    events_path,
                )
            self.assertFalse(drafts_path.exists())
            self.assertEqual(
                email_agent.read_csv(events_path)[0]["status"], "no_response"
            )

    def test_model_dnc_decision_persists_suppression(self):
        unsubscribe_analysis = {
            **self.reply_analysis,
            "customer_intent": "UNSUBSCRIBE",
            "sentiment": "NEGATIVE",
            "recommended_action": "MARK_DO_NOT_CONTACT",
            "stop_followups": True,
            "do_not_contact": True,
            "email_response": "",
        }
        with tempfile.TemporaryDirectory() as directory:
            send_log = Path(directory) / "send-log.csv"
            drafts_path = Path(directory) / "reply-drafts.csv"
            events_path = Path(directory) / "reply-events.csv"
            self.write_sent_record(send_log)
            with patch.object(
                email_agent,
                "analyze_customer_reply",
                return_value=unsubscribe_analysis,
            ) as analyze:
                email_agent.process_inbound_items(
                    [self.inbound_item("I do not wish to hear from you again.")],
                    "test-api-key",
                    "test-model",
                    send_log,
                    drafts_path,
                    events_path,
                )
            analyze.assert_called_once()
            self.assertFalse(drafts_path.exists())
            self.assertTrue(
                any(
                    row["status"] == "unsubscribed"
                    for row in email_agent.read_csv(send_log)
                )
            )
            event = email_agent.read_csv(events_path)[0]
            self.assertEqual(event["customer_intent"], "UNSUBSCRIBE")
            self.assertEqual(event["do_not_contact"], "True")

    def test_not_interested_stops_future_sends_and_records_followup_state(self):
        not_interested = {
            **self.reply_analysis,
            "customer_intent": "NOT_INTERESTED",
            "sentiment": "NEGATIVE",
            "recommended_action": "NO_RESPONSE",
            "stop_followups": True,
            "email_response": "",
        }
        with tempfile.TemporaryDirectory() as directory:
            send_log = Path(directory) / "send-log.csv"
            drafts_path = Path(directory) / "reply-drafts.csv"
            events_path = Path(directory) / "reply-events.csv"
            self.write_sent_record(send_log)
            with patch.object(
                email_agent, "analyze_customer_reply", return_value=not_interested
            ):
                email_agent.process_inbound_items(
                    [self.inbound_item("We are not interested.")],
                    "test-api-key",
                    "test-model",
                    send_log,
                    drafts_path,
                    events_path,
                )
            self.assertFalse(drafts_path.exists())
            event = email_agent.read_csv(events_path)[0]
            self.assertEqual(event["status"], "stop_followups")
            self.assertEqual(event["stop_followups"], "True")
            with patch.object(email_agent, "send_to_brevo") as send:
                sent = email_agent.send_approved_drafts(
                    [self.contact],
                    "test-api-key",
                    "sender@example.com",
                    "",
                    send_log,
                    1,
                )
            self.assertEqual(sent, 0)
            send.assert_not_called()

    def test_webhook_rejects_wrong_token(self):
        app = email_agent.create_inbound_app(
            "s" * 40, "test-api-key", "test-model"
        )
        response = app.test_client().post(
            "/webhooks/brevo/inbound/wrong-token", json={"items": []}
        )
        self.assertEqual(response.status_code, 404)

    def test_authenticated_webhook_records_unmatched_reply(self):
        with tempfile.TemporaryDirectory() as directory:
            app = email_agent.create_inbound_app(
                "s" * 40,
                "test-api-key",
                "test-model",
                Path(directory) / "send-log.csv",
                Path(directory) / "reply-drafts.csv",
                Path(directory) / "reply-events.csv",
            )
            response = app.test_client().post(
                "/webhooks/brevo/inbound/" + "s" * 40,
                json={"items": [self.inbound_item()]},
            )
            self.assertEqual(response.status_code, 202)
            self.assertEqual(response.get_json()["processed"], 1)
            self.assertEqual(
                email_agent.read_csv(Path(directory) / "reply-events.csv")[0][
                    "status"
                ],
                "unmatched",
            )


    def test_brevo_events_are_normalized_and_deduplicated(self):
        with tempfile.TemporaryDirectory() as directory:
            event_path = Path(directory) / "provider-events.csv"
            payload = {
                "event": "opened",
                "email": "Owner@Example.com",
                "message-id": "<provider-id>",
                "ts_epoch": 1772798400000,
                "ts_event": 1772802000,
                "subject": "A useful scheduling idea",
            }
            self.assertEqual(
                email_agent.record_brevo_events(payload, event_path), 1
            )
            self.assertEqual(
                email_agent.record_brevo_events(payload, event_path), 0
            )
            rows = email_agent.read_csv(event_path)
            self.assertEqual(rows[0]["email"], "owner@example.com")
            self.assertEqual(rows[0]["message_id"], "<provider-id>")
            self.assertEqual(rows[0]["event"], "opened")
            self.assertEqual(
                rows[0]["occurred_at"],
                datetime.fromtimestamp(1772802000, timezone.utc).isoformat(),
            )

    def test_brevo_events_reject_unrecognized_types(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(
                email_agent.EmailAgentError, "Unsupported"
            ):
                email_agent.record_brevo_events(
                    {
                        "event": "unknown",
                        "email": "owner@example.com",
                        "message-id": "provider-id",
                    },
                    Path(directory) / "provider-events.csv",
                )

    def test_brevo_camel_case_event_names_are_normalized(self):
        with tempfile.TemporaryDirectory() as directory:
            event_path = Path(directory) / "provider-events.csv"
            payload = [
                {
                    "event": "uniqueOpened",
                    "email": "owner@example.com",
                    "message-id": "open-id",
                    "ts_event": 1772802000,
                },
                {
                    "event": "hardBounce",
                    "email": "owner@example.com",
                    "message-id": "bounce-id",
                    "ts_event": 1772802000,
                },
            ]

            self.assertEqual(
                email_agent.record_brevo_events(payload, event_path), 2
            )
            self.assertEqual(
                [row["event"] for row in email_agent.read_csv(event_path)],
                ["unique_proxy_open", "hard_bounce"],
            )

    def test_two_business_days_skip_weekends_in_contact_timezone(self):
        india_timezone = timezone(timedelta(hours=5, minutes=30))
        sent_at = datetime(2026, 3, 6, 9, 0, tzinfo=india_timezone)
        due_at = email_agent.add_business_days(sent_at)
        self.assertEqual(due_at.weekday(), 1)
        self.assertEqual(due_at.date().isoformat(), "2026-03-10")
        self.assertEqual(due_at.hour, sent_at.hour)


if __name__ == "__main__":
    unittest.main()
