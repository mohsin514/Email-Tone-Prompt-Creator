# Email Tone Prompt Creator - Architecture & Implementation Status

## 🎯 System Overview

The Email Tone Prompt Creator is a full-stack application that analyzes users' email writing patterns and generates tone prompts for AI-assisted email composition. It uses AI classification and tone analysis to create context-specific writing guidelines.

```
┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React + TS)                     │
│                    Client-side Admin Dashboard                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Users Table     │  │  Queue Monitor   │  │  Job Tracker │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ API Calls (x-api-key)
┌──────────────────────────────────▼──────────────────────────────┐
│                    BACKEND (Node + Express)                     │
│                     http://localhost:3001/api                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Routes & Controllers                                   │   │
│  │  • /api/users           (List, create, auth)            │   │
│  │  • /api/users/:id/prompts (List, get latest, contexts)  │   │
│  │  • /api/jobs            (List, get detail)              │   │
│  │  • /api/admin           (Stats, users, regenerate)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ▲                                     │
│         ┌──────────────────┼──────────────────┐                 │
│         │                  │                  │                 │
│  ┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐         │
│  │   Services  │  │  Queue Service  │  │  AI Service │         │
│  ├─────────────┤  ├─────────────────┤  ├─────────────┤         │
│  │ Email Fetch │  │  BullMQ Queues  │  │ LLM Prompt  │         │
│  │   Factory   │  │  • email-fetch  │  │ • Tone      │         │
│  │             │  │  • tone-analysis│  │ • Context   │         │
│  │ Gmail/IMAP  │  │                 │  │   Classifier│         │
│  │   Classifier│  │  Workers        │  │             │         │
│  │             │  │  • email-fetch  │  │ Quality     │         │
│  │ Scorer      │  │  • tone-analysis│  │ Scorer      │         │
│  └─────────────┘  └─────────────────┘  └─────────────┘         │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Prisma ORM + Database Config                │   │
│  │  • Logging, Logger Configuration                       │   │
│  │  • Redis Connection & Config                           │   │
│  │  • Auth Middleware, Rate Limiter, Error Handler        │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────┬───────────────────┬──────────────────┬───────────┘
               │                   │                  │
       ┌───────▼───┐       ┌───────▼────┐      ┌─────▼──────┐
       │ PostgreSQL│       │   Redis    │      │  OpenAI    │
       │ Database  │       │  Message   │      │   API      │
       │           │       │   Queue    │      │ (GPT-4o)   │
       │ • Users   │       │            │      │            │
       │ • Emails  │       │ BullMQ     │      │ • Classify │
       │ • Prompts │       │ Queues     │      │ • Analyze  │
       │ • Jobs    │       │            │      │   Tone     │
       └───────────┘       └────────────┘      └────────────┘
```

## 📊 Data Models

### User
- `id` (UUID): Primary key
- `email` (String): Unique identifier
- `name` (String): Optional user name
- `provider` (String): OAuth provider (gmail | outlook | imap)
- `accessToken` (String): OAuth access token
- `refreshToken` (String): OAuth refresh token
- `tokenExpiry` (DateTime): Token expiration
- **Relations**: emails, tonePrompts, processingJobs

### Email
- `id` (UUID): Primary key
- `userId` (FK): Reference to User
- `providerId` (String): Provider's email ID
- `subject` (String): Email subject
- `body` (String): Email body (up to 10KB)
- `recipients` (JSON): Array of recipient objects
- `sentAt` (DateTime): When email was sent
- `context` (String): Auto-classified (client | internal | casual)
- `metadata` (JSON): Provider-specific metadata
- **Unique Constraint**: userId + providerId

### TonePrompt
- `id` (UUID): Primary key
- `userId` (FK): Reference to User
- `context` (String): Context type (client | internal | casual | general)
- `version` (Int): Version number
- `toneText` (String): LLM-generated tone prompt
- `styleTraits` (JSON): 8 style dimensions (0-1 scale)
- `qualityScore` (Float): 0-100 composite quality score
- `emailCount` (Int): Emails analyzed
- `consistency` (Float): 0-1 consistency score from LLM
- `recencyScore` (Float): 0-1 recency of emails analyzed
- `status` (String): active | superseded | draft
- `jobId` (FK): Associated ProcessingJob
- **Unique Constraint**: userId + context + version

### ProcessingJob
- `id` (UUID): Primary key
- `userId` (FK): Reference to User
- `type` (String): tone_analysis | email_fetch
- `status` (String): pending | processing | completed | failed
- `context` (String): Optional context filter
- `errorMessage` (String): Error details if failed
- `attempts` (Int): Number of retries
- `maxAttempts` (Int): Maximum retry limit
- `metadata` (JSON): Job-specific data (results, context, etc.)
- `createdAt`, `startedAt`, `completedAt` (DateTime)

## 🔄 Data Flow

### Email Fetch Flow
```
1. Trigger (Cron or Manual)
   └─> Enqueue email-fetch job
       └─> EmailFetchWorker receives job
           ├─> Load user credentials
           ├─> Query provider (Gmail/IMAP)
           ├─> Store emails in DB (upsert by providerId)
           ├─> Classify contexts (LLM batch)
           ├─> Create tone-analysis job
           └─> Mark email-fetch as completed

2. Context Classification (Batch)
   └─> classifyEmailContexts() in LLM service
       ├─> Build classification prompt with up to 20 emails
       ├─> Call GPT-4o with JSON response_format
       ├─> Validate classifications
       └─> Update Email.context in DB

3. Tone Analysis
   └─> ToneAnalysisWorker receives job
       ├─> For each context (client, internal, casual, general):
       │   ├─> Load emails matching context (max 100)
       │   ├─> Call analyzeTone() LLM function
       │   ├─> Calculate qualityScore via scorer
       │   ├─> Mark previous active prompt as superseded
       │   ├─> Create new TonePrompt version (active)
       │   └─> Store metadata in job
       └─> Mark tone-analysis as completed
```

### Quality Scoring Formula
```
qualityScore = (
  0.4 * normalize(emailCount, 5, 100) +
  0.35 * consistency (from LLM) +
  0.25 * recencyScore (weighted by email age)
) * 100

recencyScore weights:
- < 30 days: 1.0
- < 90 days: 0.7
- < 180 days: 0.4
- older: 0.1
```

## 📋 Implementation Status

### ✅ COMPLETED

#### Backend Core
- [x] Express server with proper middleware setup (helmet, CORS, rate limiting)
- [x] Prisma schema with all models defined
- [x] PostgreSQL database schema with migrations
- [x] Redis connection and BullMQ queue setup
- [x] Error handling middleware with custom error classes
- [x] Authentication middleware (API key based)
- [x] Rate limiting (general + regenerate-specific)
- [x] Request validation with Zod

#### Email Services
- [x] Gmail OAuth2 flow (authorization URL, token exchange)
- [x] Gmail sent emails fetching
- [x] IMAP generic email fetching
- [x] Email factory pattern for multi-provider support
- [x] Email body parsing (plain text + HTML)
- [x] Recipient parsing from email headers
- [x] Metadata extraction and storage

#### AI Services
- [x] Context classification (client | internal | casual) via GPT-4o
- [x] Tone analysis with 8 style traits via GPT-4o
- [x] Prompt building functions (tone analysis + classification)
- [x] Response validation and error handling
- [x] Retry logic with exponential backoff for LLM calls

#### Queue & Workers
- [x] BullMQ queue setup for email-fetch and tone-analysis
- [x] EmailFetchWorker implementation
- [x] ToneAnalysisWorker implementation
- [x] Worker event handlers (completed, failed)
- [x] Job status persistence in ProcessingJob table

#### Scoring
- [x] Quality score calculation with weighted components
- [x] Recency scoring based on email dates
- [x] Volume normalization (5-100 email range)
- [x] Test coverage for quality scorer

#### Cron & Scheduling
- [x] Email scheduler with configurable cron expression
- [x] Periodic email fetch for all users with credentials
- [x] Job conflict detection (skip if fetch already in progress)
- [x] Graceful shutdown with scheduler stop

#### Routes & Controllers
- [x] User routes (list, create, get, OAuth callback)
- [x] Prompts routes (list, latest, contexts, regenerate)
- [x] Jobs routes (list, get detail)
- [x] Admin routes (stats, users, user detail, regenerate, fetch)
- [x] Health check endpoint

#### Admin Dashboard Frontend
- [x] React + TypeScript frontend structure
- [x] API client with Axios
- [x] Admin API service layer
- [x] API key gate authentication
- [x] Stats strip display
- [x] Queue monitoring panel (BullMQ + DB jobs)
- [x] Users table with actions
- [x] User detail modal
- [x] Jobs table with pagination
- [x] Recent activity display
- [x] Dark theme CSS

#### Testing & CI/CD
- [x] Jest test setup
- [x] Unit tests for quality scorer
- [x] Pagination utility tests
- [x] GitHub Actions CI workflow

### 🟡 PARTIAL / INCOMPLETE

#### Outlook/Exchange Support
- [x] Factory pattern supports it
- [ ] Actual Outlook OAuth2 implementation
- [ ] Current: Falls back to IMAP

#### Admin Dashboard Features
- [x] Read-only views (stats, users, jobs)
- [ ] Context-aware tone prompt regeneration (parameter exists, UI ready)
- [ ] More detailed error messages in UI
- [ ] Real-time updates (WebSocket/polling)

#### Frontend Features
- [ ] User-facing portal (non-admin users can view their own prompts)
- [ ] OAuth login flow for users
- [ ] Prompt download/export functionality
- [ ] API documentation / OpenAPI spec

#### Monitoring & Observability
- [x] Winston logger configured
- [x] Error logging
- [x] Request logging (debug level)
- [ ] Distributed tracing (Jaeger/OpenTelemetry)
- [ ] Metrics collection (Prometheus)
- [ ] Health check endpoints (basic GET /api/health exists)

### ❌ NOT STARTED / OUT OF SCOPE

#### Advanced Features
- [ ] Webhook support for external integrations
- [ ] Email template generation from tone prompts
- [ ] Tone comparison (before/after) UI
- [ ] Batch user imports / admin provisioning
- [ ] Email archive export/download
- [ ] Multi-language support
- [ ] Mobile app

#### DevOps / Deployment
- [ ] Docker images for app (compose has DB & Redis only)
- [ ] Kubernetes manifests
- [ ] Environment-specific configs
- [ ] Secret management (Vault/AWS Secrets)
- [ ] Database backup/restore strategy
- [ ] Log aggregation (ELK, Datadog, etc.)

## 🎯 What's Ready to Use

1. **Backend API** - Fully functional with:
   - Email fetching from Gmail/IMAP
   - Context classification
   - Tone analysis
   - Quality scoring
   - Job queuing and worker processing

2. **Admin Dashboard** - Monitor and trigger:
   - System statistics
   - Queue health
   - User management
   - Manual email fetch and tone regeneration
   - Recent activity

3. **Development Environment** - Via docker-compose:
   - PostgreSQL database
   - Redis cache/queue
   - Express API server
   - React admin UI

## 🚀 To Get Started

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with your OpenAI key, Gmail OAuth credentials, etc.

# 2. Start infrastructure
npm run docker:up

# 3. Run migrations
npm run db:migrate -w server

# 4. Start development servers
npm run dev

# 5. Access admin dashboard
# http://localhost:5173
# Enter API_KEY from .env
```

## 📝 Next Steps for Enhancement

1. **Outlook Integration** - Implement OAuth2 for Microsoft Exchange
2. **User Portal** - Create non-admin interface for regular users to:
   - Connect email accounts
   - View their tone prompts
   - Export/download tone guides
3. **Observability** - Add Prometheus metrics and Jaeger tracing
4. **Real-time Updates** - WebSocket support for live queue monitoring
5. **Deployment** - Docker images, Kubernetes manifests, CI/CD pipeline
6. **Testing** - E2E tests, integration tests, API contract tests

