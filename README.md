# ⚡ ReachInbox | Full-Stack Email Job Scheduler & Dashboard

Production-grade email scheduler service and interactive dashboard built for high-throughput cold outreach scheduling, queue persistence across crashes/restarts, Redis-backed hourly rate limiting, Slack alert integrations, and Elasticsearch full-text search.

---

## 🎯 Architecture & Mail Client Environment Overview

The dashboard is built as an interactive, dual-pane **mail client environment** (inspired by Superhuman, Linear, and ReachInbox Onebox) featuring a dedicated navigation sidebar, a responsive email thread list, a live email reading & inspection pane, and a docked floating outreach composer.

```
+---------------------------------------------------------------------------------------------------------+
|                                    ReachInbox Mail Client Workspace                                     |
|                                                                                                         |
|  +------------------+  +-------------------------------------+  +------------------------------------+  |
|  |   Mail Sidebar   |  |        Email Thread List Pane       |  |      Reading & Inspection Pane     |  |
|  |                  |  |                                     |  |                                    |  |
|  | [+ Compose]      |  |  Recipient       Subject & Preview  |  |  Subject: Cold Outreach Sequence   |  |
|  |                  |  |  [Initials]      Time / Status      |  |  From: sales@reachinbox.ai         |  |
|  | * Scheduled (3)  |  |  ---------------------------------  |  |  To: prospect@company.com          |  |
|  | * Sent Mail (12) |  |  mitrajit@...    ReachInbox AI...   |  |  Scheduled: Wed Oct 7, 10:45 PM    |  |
|  | * Throttled (1)  |  |  restart-test... Persistence...     |  |  --------------------------------  |  |
|  | * Mailboxes (3)  |  |                                     |  |  [Message HTML / Text Body]        |  |
|  |                  |  |                                     |  |                                    |  |
|  | BullMQ Monitor   |  |                                     |  |  [View in Ethereal Fake SMTP]      |  |
|  | Slack Alerts     |  |                                     |  |  Job ID: email-job-3c5aaa...       |  |
|  | User Profile     |  |                                     |  |                                    |  |
|  +------------------+  +-------------------------------------+  +------------------------------------+  |
|                                                                 +------------------------------------+  |
|                                                                 |      Docked Outreach Composer      |  |
|                                                                 +------------------------------------+  |
+---------------------------------------------------------------------------------------------------------+
```

### 1. How Scheduling Works (Zero Cron Jobs)
- **No Cron Guarantee**: The system complies strictly with the non-negotiable requirement of using zero cron jobs (`node-cron`, `agenda`, `crontab`, etc.).
- **BullMQ Delayed Jobs**: When an email send request is received (`POST /api/emails/schedule` or batch `POST /api/emails/schedule-batch`), the scheduler calculates the millisecond difference `delayMs = Math.max(0, scheduledAt.getTime() - Date.now())`.
- It records the job in PostgreSQL with status `SCHEDULED`, and inserts a delayed job into BullMQ backed by Redis with a deterministic, unique job ID: `email-job-${job.id}`.
- BullMQ manages delayed execution using Redis sorted sets (`zset`) with execution timestamps as the score.

### 2. How Persistence Across Server Restarts is Handled
- Both PostgreSQL and Redis store state persistently (Redis utilizes RDB and AOF persistence in Docker volumes).
- When the backend restarts, future delayed jobs already in Redis remain scheduled for their exact future execution time.
- **Reconciliation Engine on Boot**: During `bootstrap()` in `src/index.ts`, `schedulerService.reconcileOnStartup()` queries PostgreSQL for all jobs in `SCHEDULED`, `PROCESSING`, or `RATE_LIMITED` state. For each pending job, it verifies if the job exists in the BullMQ Redis queue. If missing (e.g., Redis was flushed or network dropped during a crash), it safely re-enqueues the job with its remaining delay.
- **Strict Idempotency**: Jobs marked as `SENT` in PostgreSQL are never re-enqueued or re-processed, preventing duplicate sends.

### 3. Worker Concurrency & Provider Throttle Delays
- **Configurable Concurrency**: The BullMQ worker (`emailWorker.ts`) runs with `WORKER_CONCURRENCY` (configured via `.env`, default = `5`), enabling parallel job processing.
- **Inter-Email Delay (Provider Throttling)**: To mimic real-world SMTP provider limits, each job enforces a minimum configurable sleep delay (`MIN_DELAY_BETWEEN_EMAILS_MS`, default = `2000ms`, or per-campaign `delaySeconds`) prior to sending.

### 4. Hourly Rate Limiting (Redis-Backed Atomic Counters)
- **Configurable Limits**: Configured via `DEFAULT_HOURLY_LIMIT` (default: 50 emails/hour) or custom per-sender limits.
- **Atomic Window Counters**: Keyed by sender and hour window in Redis: `ratelimit:count:${senderEmail}:${YYYY-MM-DDTHH}`.
- **Behavior Under Load & Preservation of Order**: When a sender hits their hourly limit:
  - Jobs are **NOT dropped or failed**.
  - The worker calculates the milliseconds remaining until the start of the next hour window (`nextHourDelayMs`).
  - The job status in PostgreSQL is updated to `RATE_LIMITED` / `SCHEDULED` with its new scheduled timestamp, and BullMQ reschedules the delayed job for the next hour window.
  - Jobs retain their natural queue order without losing leads.

### 5. Live Slack Alerts on Rate Limit Breach
- **Real-Time Notification**: The moment a sender reaches their hourly limit, `slackService.notifyRateLimitHit` fires a formatted Slack Block Kit alert to the user's connected Slack webhook or channel.
- **Graceful Degradation**: If Slack is disconnected, the rate-limiting engine continues throttling without crashing or throwing errors. Reconnecting Slack in the dashboard immediately restores notifications without a server redeploy.
- **Verifiable Test Call**: The dashboard includes a live **"Test Alert"** button to trigger and verify the real Slack webhook immediately.

### 6. Elasticsearch Search Indexing
- Every scheduled, rescheduled, and sent email is indexed into Elasticsearch index `reachinbox-emails`.
- Full-text search endpoint `GET /api/emails/search?q=...` uses Elasticsearch `multi_match` with fuzzy matching across `subject`, `body`, `recipient`, and `senderEmail`.
- A resilient fallback automatically routes to PostgreSQL if Elasticsearch is temporarily syncing.

### 7. Real-Time BullMQ Observability Dashboard
- Accessible at `http://localhost:5001/admin/queues` via `@bull-board/express`.
- Displays real-time counts and inspectable payloads for delayed, active, completed, and failed jobs.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | TypeScript, Node.js, Express.js |
| **Queues & Cache** | BullMQ, Redis 7 (Docker) |
| **Database & ORM**| PostgreSQL 16 (Docker), Prisma ORM |
| **Search Engine**  | Elasticsearch 8.13.4 (Docker) |
| **SMTP Provider**  | Ethereal Email (Fake SMTP via Nodemailer) |
| **Observability**  | Bull Board (`@bull-board/express`) |
| **Frontend**       | Vite, React 18, TypeScript, Tailwind CSS |
| **Icons & Style**  | Lucide React, Canvas Confetti |
| **Authentication** | Google OAuth (`@react-oauth/google`) + 1-Click Evaluator Demo |

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20/v26)
- **Docker Desktop**: Running

### 2. Start Infrastructure via Docker Compose
From the project root:
```bash
docker compose up -d
```
This starts:
- **PostgreSQL**: `localhost:5432` (db: `reachinbox_scheduler`)
- **Redis**: `localhost:6379`
- **Elasticsearch**: `localhost:9200`

Verify all containers are healthy:
```bash
docker ps
```

---

### 3. Setup and Run Backend

```bash
cd backend

# Install dependencies (already completed in workspace)
npm install

# Push database schema to PostgreSQL
npx prisma db push

# Start the backend server
npm run dev
```

The backend starts at **`http://localhost:5001`**:
- **Health Check**: `http://localhost:5001/health`
- **Live BullMQ Queue Dashboard**: `http://localhost:5001/admin/queues`
- **Ethereal Mailbox Credentials**: Dynamically generated and printed in console on startup, or configured via `.env`.

#### Backend Environment Variables (`backend/.env`):
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database & Queue
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/reachinbox_scheduler?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200

# Worker & Rate Limiting Controls
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_MS=2000
DEFAULT_HOURLY_LIMIT=50

# Ethereal Email SMTP (leave empty to auto-generate fresh account on boot)
ETHEREAL_USER=
ETHEREAL_PASS=

# Google OAuth
GOOGLE_CLIENT_ID=

# Slack Integration (OAuth or Incoming Webhook)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:5001/api/slack/oauth/callback
```

---

### 4. Setup and Run Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## 💻 Feature Walkthrough & Verification

### 1. Authentication
- **Real Google Sign-In**: Uses `@react-oauth/google` with Google Cloud identity verification.
- **Fast Evaluator Demo Button**: Evaluators can click *"Continue as Alex Chen (Evaluator Demo)"* to access the complete dashboard immediately without creating Google Cloud client credentials.

### 2. Main Dashboard & Metrics
- **Real-time Stat Cards**: Displays live counts of Scheduled, Sent, Rate-limited, and BullMQ worker concurrency.
- **BullMQ Live UI**: Click *"BullMQ Dashboard"* in the top navigation to view the live `@bull-board/express` monitor.

### 3. Compose New Email (Single & CSV Batch)
- Click **`+ Compose New Email`**.
- Switch to **CSV / Lead List Upload**.
- Drag & drop or select `sample_leads.csv` (included in project root).
- The frontend parses and displays the detected lead count badge (e.g. `10 valid leads detected`).
- Configure:
  - Sending Account (multi-sender selection with real-time hourly usage meters)
  - Subject & HTML/Plain body
  - Start Time
  - Minimum Delay between sends (e.g. 2s)
  - Hourly Rate Limit (e.g. 50/hr)
- Click **`Schedule Emails`** (celebrates with confetti burst).

### 4. Scheduled Emails Table
- Displays pending emails with real-time countdowns (`in 15s`, `in 2m`), sender, subject, and status (`Scheduled`, `Rescheduled`, `Sending`).
- Includes a **Cancel (Delete)** button to remove pending jobs from BullMQ and PostgreSQL.

### 5. Sent Emails Table & Fake SMTP Previews
- When a job completes, it moves to the **Sent Emails** table.
- Each row includes a clickable **`View Email`** button linking to the live rendered Ethereal Email preview (`https://ethereal.email/message/...`).

### 6. Full-Text Search via Elasticsearch
- Type any keyword in the search bar (e.g. `outreach`, `prospect`, `cyberdyne`).
- Shows the badge **`ES 8.x`** indicating results returned via Elasticsearch full-text fuzzy query.

### 7. Server Restart Persistence Verification
To demonstrate zero dropped or duplicated jobs across crashes/restarts:
1. Schedule an email for 30 seconds into the future.
2. Stop the backend server process (`Ctrl+C`).
3. Restart the backend: `npm run dev`.
4. Observe the startup logs:
   ```
   [Reconciliation] Checking for pending scheduled jobs after server restart...
   [Reconciliation] Found 1 pending jobs in database.
   [Reconciliation] Successfully reconciled jobs back into BullMQ delayed queue.
   ```
5. The email automatically sends at its scheduled time with status `SENT` and an Ethereal preview URL.

### 8. Slack Rate Limit Alert Verification
1. Click **`Connect Slack`** in the dashboard header.
2. Enter an incoming webhook URL (or click **Test Alert** with any webhook).
3. Click **`Send Test Alert`** to verify live dispatch.
4. When a sender reaches their configured hourly limit during scheduling, an automated alert card is posted to Slack detailing the sender, the limit reached, and the next rescheduled window.

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # PostgreSQL models (User, EmailJob, Sender, Slack, RateLimitEvent)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts           # Typed environment configuration
│   │   │   ├── db.ts            # Prisma client singleton
│   │   │   ├── redis.ts         # Redis connection configured for BullMQ
│   │   │   └── elasticsearch.ts # Elasticsearch 8.x client & index setup
│   │   ├── queue/
│   │   │   ├── emailQueue.ts    # BullMQ Queue instance
│   │   │   ├── emailWorker.ts   # BullMQ Worker with rate limiter & SMTP sender
│   │   │   └── bullBoard.ts     # Live Bull Board dashboard router
│   │   ├── routes/
│   │   │   ├── auth.routes.ts   # Google & Demo login endpoints
│   │   │   ├── email.routes.ts  # Schedule, batch, search, and cancel endpoints
│   │   │   ├── slack.routes.ts  # Slack OAuth and Webhook endpoints
│   │   │   └── sender.routes.ts # Multi-sender management & live usage
│   │   ├── services/
│   │   │   ├── rateLimiter.service.ts # Redis sliding window counter & order preservation
│   │   │   ├── scheduler.service.ts   # Delayed job creation & startup reconciliation
│   │   │   ├── search.service.ts      # Elasticsearch index & query service
│   │   │   ├── slack.service.ts       # Slack webhook & API notifier
│   │   │   └── smtp.service.ts        # Ethereal fake SMTP transport & preview URLs
│   │   └── index.ts             # Express server entrypoint & graceful shutdown
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx         # Top bar with Slack & BullMQ dashboard links
│   │   │   ├── StatsCards.tsx     # Overview metrics & worker specs
│   │   │   ├── ScheduledTable.tsx # Scheduled queue table with countdowns
│   │   │   ├── SentTable.tsx      # Sent emails table with Ethereal previews
│   │   │   ├── ComposeModal.tsx   # Campaign compose modal & CSV parser
│   │   │   ├── SlackModal.tsx     # Slack webhook/OAuth & test alert modal
│   │   │   ├── SendersView.tsx    # Senders & rate limit usage meter
│   │   │   └── LoginView.tsx      # Google OAuth login screen
│   │   ├── services/
│   │   │   └── api.ts             # Axios API integration
│   │   ├── types/
│   │   │   └── index.ts           # Shared TypeScript interfaces
│   │   ├── App.tsx                # Main dashboard view
│   │   ├── main.tsx               # React root with GoogleOAuthProvider
│   │   └── index.css              # Tailwind styles & dark mode palette
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docker-compose.yml             # Postgres 16, Redis 7, Elasticsearch 8.13.4
├── sample_leads.csv               # Ready-to-use CSV file with 10 sample leads
└── README.md
```

---

## 🛡️ Design Decisions & Trade-Offs

1. **BullMQ Delayed Jobs vs. Cron**: Cron-based architectures suffer from polling overhead and race conditions across multiple instances. BullMQ relies on Redis sorted sets, making scheduling deterministic, low-latency, and distributed by design.
2. **Postgres + Redis Dual Persistence**: Redis stores in-flight and delayed queue states, while PostgreSQL serves as the durable system of record. On restarts, the reconciliation service cross-checks both layers to guarantee zero lost or duplicated jobs.
3. **Sliding Window Hourly Limits**: Using Redis `INCR` with 2-hour TTLs ensures atomic increments across concurrent workers. When limits are exceeded, jobs are rescheduled into the next hour window rather than discarded.
4. **Elasticsearch with Database Fallback**: If Elasticsearch is re-indexing or restarting, full-text search falls back gracefully to PostgreSQL `ILIKE`/`contains` without failing user queries.
