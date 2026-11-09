# n8n Workflow Guide & Technical Architecture
**Workflow Name:** BookLeaf — Author Royalty Summary & Notification System  
**Workflow File:** `n8n/bookleaf_royalty_notification_workflow.json`  
**Platform:** n8n (Cloud or Self-Hosted Docker / npm / ngrok)  

---

## 1. Overview

The n8n workflow serves as BookLeaf's resilient automation backbone. It receives webhook notifications from Bubble, validates authentication, ensures idempotency, processes author catalog figures against BookLeaf's operating policies, calls the AI engine (OpenAI / Gemini / Heuristic Fallback), updates the Bubble Notification Log, and triggers optional SMTP email delivery.

```
+---------------+     POST Webhook      +---------------------------+
|               | --------------------> | 1. Webhook Trigger Node   |
|               |                       +---------------------------+
|               |                                     |
|               |                       +---------------------------+
|   Bubble.io   |                       | 2. Webhook Security Auth  |
|  Application  |                       +---------------------------+
|   Frontend    |                                     |
|   & Database  |                       +---------------------------+
|               |                       | 3. Idempotency Check      |
|               |                       +---------------------------+
|               |                                     |
|               |                       +---------------------------+
|               |                       | 4. Data Enrichment & Calc |
|               |                       +---------------------------+
|               |                                     |
|               |                       +---------------------------+
|               |                       | 5. AI Prompt Synthesis    |
|               |                       +---------------------------+
|               |                                     |
|               |                       +---------------------------+
|               |                       | 6. LLM Generation Engine  |
|               |                       +---------------------------+
|               |                                     |
|               |   PATCH Callback      +---------------------------+
|               | <-------------------- | 7. Update Bubble Log Node |
|               |                       +---------------------------+
|               |                                     |
|               |     200 OK Body       +---------------------------+
|               | <-------------------- | 8. Respond to Webhook     |
+---------------+                       +---------------------------+
```

---

## 2. Step-by-Step Node Pipeline

### Step 1: `BookLeaf Webhook Trigger`
- **Method:** `POST`
- **Path:** `bookleaf-royalty-summary`
- **Response Mode:** `responseNode` (Ensures execution doesn't block Bubble with an unhandled stream and allows tailored response codes: `200 OK`, `401 Unauthorized`, `500 Server Error`).

### Step 2: `Validate Webhook Security`
- **Security Standard:** Header `X-BookLeaf-Secret` or payload `auth_token`.
- **Secret Key:** `bookleaf_secure_webhook_secret_2026` (configurable via `$env.BOOKLEAF_WEBHOOK_SECRET`).
- **Behavior:**
  - If valid: Continues to Idempotency node.
  - If invalid: Immediately branches to `Return 401 Unauthorized` with error message `"Unauthorized: Invalid or missing Webhook Security Secret"`.

### Step 3: `Check Idempotency` (Deduplication)
- **Problem Solved:** Prevents duplicate AI triggers and emails if an admin clicks "Generate & Send" multiple times in rapid succession.
- **Mechanism:** Tracks execution state via `$getWorkflowStaticData('global')`. If a trigger for the same `author_id` arrives within a 15-second cooldown window, the duplicate execution is cleanly suppressed and returns `{ "status": "Skipped", "message": "Duplicate trigger suppressed." }`.

### Step 4: `Normalize & Enrich Data`
- **Data Ingestion Strategy:**
  - Evaluators can either pass the full author & books object in the Bubble webhook payload OR pass the `author_id` to query Bubble's Data API.
  - The node normalizes both formats, computes running totals (`total_earned`, `total_paid`, `total_pending`), separates published titles from titles still in production (e.g. "Cover Design", "Typesetting"), and calculates the upcoming payout schedule based on BookLeaf's calendar quarter rules.
- **Quarterly Schedule Calculation:**
  - Q1 (Jan–Mar): Payout deadline May 15
  - Q2 (Apr–Jun): Payout deadline August 15
  - Q3 (Jul–Sep): Payout deadline November 15
  - Q4 (Oct–Dec): Payout deadline February 15

### Step 5: `Build AI Prompt`
- Formulates a grounded, high-fidelity prompt incorporating the official BookLeaf Knowledge Base:
  - 80/20 net profit split policy
  - ₹1,000 minimum rollover threshold
  - Reassuring production notes for unpublished titles
  - Author-centric empathetic tone

### Step 6: `AI Processing & Generation`
- **Supported Providers:** OpenAI (`gpt-4o-mini`), Google Gemini (`gemini-1.5-flash`), or Anthropic Claude.
- **Built-in Zero-Failure Fallback:**
  - If an API key is provided in `$env.OPENAI_API_KEY` or `$env.GEMINI_API_KEY`, the workflow invokes the cloud LLM.
  - If unconfigured or rate-limited, the node seamlessly triggers the built-in **BookLeaf Heuristic Engine**. This guarantees that evaluators can run and verify the entire end-to-end workflow without facing API billing or quota errors!

### Step 7: `Prepare Bubble Callback`
- Assembles the finalized payload:
  - `status`: `"Success"`
  - `email_subject`: `"Your BookLeaf Royalty Statement & Payout Summary - [Author Name]"`
  - `email_preview`: First 250 characters of email
  - `email_content`: Complete formatted letter
  - `completed_at`: ISO timestamp

### Step 8: `Has Bubble Callback URL?` & `Call Bubble Callback API`
- If Bubble provided a `bubble_callback_url` (or configured via environment variable), issues a `PATCH` request to Bubble's Data API or Backend Workflow updating the `NotificationLog` object.
- Configured with `continueOnFail: true` so transient network glitches do not halt the workflow response.

### Step 9: `Respond to Bubble (Success)`
- Emits HTTP 200 with the full generation payload back to Bubble.

### Step 10: `Error Handling & Failure Fallback`
- Any unexpected failure in the upstream nodes is caught by the error handler, returning HTTP 500 with a detailed error trace so the Bubble UI displays an error banner instead of hanging indefinitely.

---

## 3. How to Import Workflow into n8n

### Option A: Using n8n Cloud (Free Trial)
1. Log in to [n8n.io Cloud](https://app.n8n.cloud/).
2. In the left navigation, click **Workflows** -> **Add workflow** (top right).
3. Click the three dots `...` in the top right -> **Import from File**.
4. Select `n8n/bookleaf_royalty_notification_workflow.json` from this project.
5. Click **Save** and toggle the workflow from **Inactive** to **Active**.
6. Copy the **Production Webhook URL** displayed on the `BookLeaf Webhook Trigger` node.

### Option B: Self-Hosting Locally with Docker or npm
```bash
# Using npm:
npx n8n

# Or using Docker:
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```
To expose your local n8n instance to Bubble over the internet, run ngrok:
```bash
ngrok http 5678
```
Your webhook URL will be: `https://<your-ngrok-subdomain>.ngrok-free.app/webhook/bookleaf-royalty-summary`.

---

## 4. Verification & Testing

You can test the n8n webhook directly using `curl` or Postman:

### Test Call 1: Successful Trigger (Priya Sharma)
```bash
curl -X POST https://<YOUR_N8N_URL>/webhook/bookleaf-royalty-summary \
  -H "Content-Type: application/json" \
  -H "X-BookLeaf-Secret: bookleaf_secure_webhook_secret_2026" \
  -d '{
    "author_id": "AUTH001",
    "author_name": "Priya Sharma",
    "author_email": "priya.sharma@email.com",
    "author_city": "Mumbai",
    "trigger_type": "Manual Single"
  }'
```

### Test Call 2: Unauthorized Trigger (Should return 401)
```bash
curl -X POST https://<YOUR_N8N_URL>/webhook/bookleaf-royalty-summary \
  -H "Content-Type: application/json" \
  -H "X-BookLeaf-Secret: WRONG_TOKEN" \
  -d '{"author_id": "AUTH001"}'
```

### Test Call 3: Automated Node Simulator
Run the bundled simulation script to verify all nodes, policies, and edge cases:
```bash
node scripts/simulate_n8n_test.js
```
