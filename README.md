# Lead generation and email workflow

## Project structure

- `backend/` — FastAPI API, lead discovery, email workflows, product content,
  and OpenAI usage tracking.
- `frontend/` — React/Vite dashboard and browser-facing services/components.
- `data/` — generated leads, drafts, send logs, and webhook audit files.
- `logs/` — local API, runtime, and debug logs.
- `tests/` — backend unit and API tests.
- `.env` — local secrets and provider configuration; keep it private.

## Run the connected dashboard

The React/Vite dashboard is built as static files and served directly by
FastAPI. Build the frontend and start the combined app from the project root:

```powershell
npm --prefix frontend run build
python -m uvicorn backend.api:app --host 0.0.0.0 --port 5173
```

Open `http://localhost:5173` on this computer. Both the frontend and API are
available on this single port. To open it from another device on the same
network, use this computer's LAN IPv4 address: `http://<LAN-IP>:5173`. Allow
Python/Uvicorn through Windows Firewall when prompted. Re-run the frontend
build after changing frontend source files.
For frontend hot reload during development, you can instead run the Vite
development server on port 5173 and FastAPI on port 8000 in two terminals:

```powershell
# Terminal 1 - backend API
python -m uvicorn backend.api:app --host 0.0.0.0 --port 8000

# Terminal 2 - Vite frontend
npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173
```

Vite proxies `/api` and `/webhooks` requests to FastAPI in this development
mode. Demo data is off by default; set
`VITE_USE_DEMO_DATA=true` to explicitly use the illustrative browser-only data.

The dashboard can import CSV/XLSX lead lists, start the existing music-academy
discovery job, generate reviewed drafts, save or reject drafts, and request a
send. The FastAPI service uses the existing CSV audit files and email-agent
validation rather than bypassing consent, suppression, approval, or duplicate
send checks. CSV imports must include company and email columns. Opted-in
campaign email still requires documented consent fields; contacts without
verified opt-in are drafted through the separate initial permission-request
path and require `BREVO_REPLY_TO_EMAIL`.

The API is intended for local development and has no user authentication. The
`0.0.0.0` binding allows trusted devices on the same LAN to reach it; do not
expose it directly to the public internet. Live Brevo metrics and automatic follow-ups remain unavailable until
the application is deployed behind a secured, publicly reachable HTTPS
configuration and both webhook types are working.

`leadscode.py` discovers and qualifies music-academy leads. `email_agent.py`
prepares AI-assisted introduction drafts, sends only manually reviewed
messages through separate opted-in and initial permission-request paths, and
processes replies received through Brevo inbound parsing. Replies are
classified and saved as drafts; the agent never sends replies automatically.
LangGraph workflows orchestrate lead discovery, draft generation, sending, and
inbound reply processing. The existing email agent remains responsible for
consent validation, suppression checks, human approval, duplicate prevention,
and Brevo delivery.

## Setup

1. Install the packages with `python -m pip install -r requirements.txt`.
2. Copy `.env.example` to `.env` and set your Serper, OpenAI, and Brevo
   credentials. Configure a sender address verified in Brevo. For local
   development, keep webhook and automatic-follow-up settings disabled.
   To show live organization-level OpenAI requests, token usage, and costs in
   the sidebar, optionally set an OpenAI Admin API key as
   `OPENAI_ADMIN_KEY`. Keep this key on the backend only. Without it, the
   sidebar shows local response-token tracking.
3. Generate leads with `python -m backend.leadscode`.
4. Choose the appropriate email path below. The initial permission-request
   path does not require existing opt-in evidence; it sends one reviewed
   introduction asking whether the recipient wants more information.

The lead finder collects publicly listed contact information; that does not
establish marketing consent. The normal opt-in campaign path requires
`consent_evidence`, a timezone-aware ISO 8601 `consent_timestamp`, and a
recipient-specific HTTPS unsubscribe mechanism. The separate permission-request
path does not presume consent and uses an inbound reply address for opt-outs.

If any provider credentials were previously stored in source files or example
configuration, revoke and regenerate them before reuse. Replacing the local
values does not invalidate previously exposed credentials.

Generate a webhook token locally rather than committing it:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Existing opt-in: draft, review, send

For contacts who have explicitly opted in, record the evidence and timestamp
in the leads CSV and provide a recipient-specific working HTTPS
`unsubscribe_url`. Generate drafts using a clear business requirement:

```powershell
python -m backend.email_agent draft --business-requirement "Explain how NUERiQ can help opted-in music academies manage scheduling and billing."
```

Review `data/email_drafts.csv` for accuracy and tone, then change
`approved_to_send` to `true` only for messages approved for sending. The send
command requires a deliberate confirmation flag and is capped at 50 recipients
per run (20 by default):

```powershell
python -m backend.email_agent send --confirm-send
```

## Initial B2B permission request

For a one-time initial introduction to a relevant business contact, the app
can draft without `contact_consent`, `consent_evidence`,
`consent_timestamp`, or a per-recipient HTTPS unsubscribe link. It still
requires an available reply inbox, asks whether the recipient would like more
information rather than assuming consent, uses the configured sender in the
From field, includes reply-to-unsubscribe instructions, checks the suppression
list, and requires manual review and an explicit initial-outreach send flag.
Applicable email rules depend on the recipients' location and circumstances;
use this only where your outreach is permitted.

Set `BREVO_REPLY_TO_EMAIL` to an address on the inbound-parsing domain that
you configure below, then draft:

```powershell
python -m backend.email_agent draft --permission-request --business-requirement "Briefly introduce NUERiQ to this music academy and ask whether they would like product information."
```

Review `data/email_drafts.csv` and set `approved_to_send` to `true` only for
the exact messages you approve. Then explicitly send the initial drafts:

```powershell
python -m backend.email_agent send --initial-outreach --confirm-send
```

The app allows at most one initial-outreach attempt per email address. It uses
`BREVO_REPLY_TO_EMAIL` for replies and `List-Unsubscribe`; a recipient can
reply with "unsubscribe", which the inbound webhook records in the suppression
log. Do not send initial messages until that reply address is configured and
working. To add a known opt-out manually:

```powershell
python -m backend.email_agent unsubscribe owner@example.com
```

Customer-reply drafts made by inbound parsing also require human approval and
must be sent in their separate mode:

```powershell
python -m backend.email_agent send --drafts data/email_reply_drafts.csv --customer-replies --confirm-send
```

All sends go individually through Brevo's transactional email API, are capped
per run, and are recorded in `data/email_send_log.csv`. An attempted draft
is not automatically retried, to avoid duplicate sends when a network failure
leaves delivery uncertain.

## Receive customer replies through Brevo

Brevo Inbound Parsing requires a verified receiving subdomain that differs
from the sending domain (for example, `reply.example.com`). Configure its MX
records as documented by Brevo (`inbound1.sendinblue.com`, priority 10, and
`inbound2.sendinblue.com`, priority 20), then create an inbound webhook using
event `inboundEmailProcessed`, that receiving domain, and the HTTPS URL:

```text
https://YOUR_PUBLIC_HOST/webhooks/brevo/inbound/YOUR_BREVO_INBOUND_WEBHOOK_TOKEN
```

For Brevo's webhook API, the relevant configuration has this shape:

```json
{
  "type": "inbound",
  "events": ["inboundEmailProcessed"],
  "url": "https://YOUR_PUBLIC_HOST/webhooks/brevo/inbound/YOUR_BREVO_INBOUND_WEBHOOK_TOKEN",
  "domain": "reply.example.com",
  "description": "NUERiQ customer replies"
}
```

The FastAPI application above receives the webhook on its configured port
(5173 in the combined local setup).
Configure a public HTTPS reverse proxy to forward the webhook path to this
local service; do not expose the development machine directly:

```powershell
python -m uvicorn backend.api:app --host 127.0.0.1 --port 5173
```

The receiver matches `InReplyTo` to a previously sent Brevo message and checks
that the sender is the original recipient. Unmatched messages are not sent to
the AI or answered. Valid inbound sender addresses are durably recorded in
`data/email_inbound_receipts.csv` before AI processing, so an AI processing
failure cannot be mistaken for "no reply" by the follow-up worker. Replies and
analysis are recorded in `data/email_reply_events.csv`; response drafts are written to
`data/email_reply_drafts.csv` with `approved_to_send=false`. Review them, set
approval to `true` only after a human check, and send with:

```powershell
python -m backend.email_agent send --drafts data/email_reply_drafts.csv --customer-replies --confirm-send
```

Unsubscribe requests immediately enter the persistent suppression log and do
not produce a reply draft. "Not interested" also stops future sends; requested
follow-ups in customer replies are recorded but are not scheduled automatically.
Out-of-office replies do not receive a response. Demo/meeting requests are
marked for human attention.

## Brevo event tracking and automatic follow-ups

The transactional-event receiver records Brevo `request`, `delivered`,
`opened`, `first_opening`, `proxy_open`, `unique_proxy_open`, `click`,
`soft_bounce`, `hard_bounce`, `spam`, `unsubscribed`, `invalid`, `blocked`,
`error`, and `deferred` events in
`data/brevo_transactional_events.csv`. Repeated webhook deliveries are
deduplicated. Delivery events are matched to sends by Brevo `message-id`;
hard bounces, invalid addresses, spam reports, and unsubscribes are added to
the suppression log.

Deploy the backend behind a secured HTTPS endpoint before configuring webhooks.
This API has no general user authentication: do not make the entire API
publicly accessible. Restrict access at the deployment proxy/firewall and
allow Brevo callbacks only to the webhook paths. Set `BREVO_WEBHOOK_PUBLIC_URL`
to the public HTTPS base URL, then create a random
`BREVO_EVENT_WEBHOOK_TOKEN` and register this URL in Brevo's transactional
webhook settings, selecting the event types above:

```text
https://YOUR_PUBLIC_HOST/webhooks/brevo/events/YOUR_BREVO_EVENT_WEBHOOK_TOKEN
```

Use the inbound-parsing setup above for replies, with a separate
`BREVO_INBOUND_WEBHOOK_TOKEN`. Both tokens must be at least 32 characters.
Keep tokens out of source control and configure reverse-proxy access logs not
to record token-bearing webhook paths. Confirm both webhook types work and
check `/api/health` for `brevo_event_webhook` and `inbound_webhook` readiness.

Automatic follow-ups are opt-in only and remain gated until both webhooks,
public HTTPS URL, Brevo send credentials, and OpenAI inbound-reply processing
are ready. Verify both callbacks in Brevo and receive test events/replies
before explicitly setting `BREVO_AUTOMATIC_FOLLOWUPS=true`; tokens alone do
not prove that Brevo is delivering webhooks. The worker checks every five
minutes and sends at most one follow-up at the next check, no earlier than two
weekdays after a successful opted-in send (weekends are skipped; public
holidays are not). It uses the original reviewed email and unsubscribe URL.
Permission requests are never repeated. Any recorded reply, suppression,
bounce, spam report, invalid address, or missing/invalid consent data prevents
the follow-up. The worker does not infer “no reply” when inbound tracking is
unavailable. Check the monitoring dashboard and `/api/health` before enabling
the setting.

Protect the webhook token and the generated CSV files. Configure access logs at
the reverse proxy so the token-bearing URL path is not retained in clear text.
Do not expose the development machine directly to the internet.
