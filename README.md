# Email Tone Prompt Creator - Complete Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Tech Stack](#tech-stack)
4. [Features](#features)
5. [Setup & Installation](#setup--installation)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Real-Time Features](#real-time-features)
9. [Background Jobs & Cron](#background-jobs--cron)
10. [User Guide](#user-guide)
11. [Troubleshooting](#troubleshooting)

---

## 📌 Project Overview

**Email Tone Prompt Creator** is a comprehensive service that analyzes a user's sent emails to generate personalized tone prompts. These prompts capture the user's unique writing style and are stored for other applications to consume via API for drafting emails matching that style.

### Core Value Proposition
- **Analyze**: Automatically fetch and analyze user emails from Gmail
- **Learn**: Extract tone patterns, writing styles, and preferences
- **Generate**: Create reusable tone prompts for AI-powered email drafting
- **Monitor**: Real-time dashboard to track analysis progress and results

### System Components
1. **Background Service**: Processes emails using AI (OpenAI)
2. **API Server**: Serves generated prompts and metadata to external applications
3. **Admin Dashboard**: Monitor analysis jobs, view statistics, and manage users

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  User Dashboard  │  Admin Dashboard  │  Auth Pages   │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↑                                     │
│                  Socket.IO (Real-time)                        │
│                         ↑                                     │
├─────────────────────────────────────────────────────────────┤
│                    Backend (Express + Node)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ OAuth Auth    │  Job Queue  │  Email Fetch  │  AI   │   │
│  │ (Gmail)       │  (BullMQ)   │  (IMAP)       │       │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↑                                     │
│                  REST API / WebSocket                         │
│                         ↑                                     │
├─────────────────────────────────────────────────────────────┤
│  Background Services                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Cron Scheduler │ Email Worker │ Tone Analysis Worker│   │
│  │ (every 15min)  │ (fetch emails)│ (OpenAI analysis)  │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↑                                     │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ PostgreSQL  │  Redis  │  Gmail API  │  OpenAI API   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Express.js (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache & Queue**: Redis + BullMQ
- **Authentication**: JWT + Gmail OAuth 2.0
- **Email**: Gmail API, node-imap, mailparser
- **AI**: OpenAI API (GPT-4/3.5-turbo)
- **Scheduling**: node-cron
- **Real-time**: Socket.IO
- **Testing**: Jest + Supertest
- **Logging**: Winston

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + PostCSS
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router v7

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Environment**: Node.js 20+

---

## ✨ Features

### 1. Email Analysis & Tone Extraction
- **Gmail Integration**: OAuth 2.0 authentication for secure access
- **Automatic Fetching**: Scheduled cron jobs fetch emails every 15 minutes
- **AI Analysis**: OpenAI analyzes tone, sentiment, writing style, and keywords
- **Multi-Context Support**: Classify emails as client, internal, or casual

### 2. Tone Prompt Generation
- **Personalized Prompts**: Creates context-specific tone prompts
- **Style Traits**: Extracts vocabulary, phrases, and communication patterns
- **Quality Scoring**: Rates prompts based on consistency and email count
- **Version Control**: Maintains multiple versions for A/B testing

### 3. Real-Time Monitoring
- **WebSocket Updates**: Live job status updates via Socket.IO
- **Progress Tracking**: See emails being processed in real-time
- **Admin Dashboard**: Monitor all users' jobs and statistics
- **Error Handling**: Detailed error messages for failed jobs

### 4. API Access
- **Public API**: Generate emails using stored tone prompts
- **Authentication**: API key-based authentication for external apps
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Comprehensive Endpoints**: Full CRUD operations on prompts and emails

### 5. User Management
- **Authentication**: Email/password and Gmail OAuth signup
- **Profile Management**: Update profile information
- **API Keys**: Generate and manage API keys for external access
- **Role-Based Access**: Admin and user roles

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 20+ and npm/pnpm
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- Gmail account (for testing OAuth)
- OpenAI API key

### 1. Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd Email-Tone-Prompt-Creator

# Install root dependencies
npm install

# Install workspace dependencies
npm install -w server -w client
```

### 2. Environment Setup

**Server** (`.env` in `server/` folder):
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/email_tone_db

# Redis
REDIS_URL=redis://localhost:6379

# Server Config
API_PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Gmail OAuth
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_CALLBACK_URL=http://localhost:3001/api/oauth/gmail/callback

# OpenAI
OPENAI_API_KEY=sk-your_openai_key

# Email Fetch Cron (every 15 minutes)
EMAIL_FETCH_CRON=*/15 * * * *

# Logging
LOG_LEVEL=info
```

**Client** (`.env.local` in `client/` folder):
```env
VITE_API_URL=http://localhost:3001
```

### 3. Database Setup

```bash
cd server

# Create migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Run seeds (optional)
npm run db:seed

# View database
npm run db:studio
```

### 4. Start Services (Docker)

```bash
# Start PostgreSQL, Redis, and other services
docker-compose up -d

# Verify containers
docker-compose ps
```

### 5. Development Mode

```bash
# Root directory - start both server and client concurrently
npm run dev

# Or separately:
npm run dev:server  # Terminal 1
npm run dev:client  # Terminal 2
```

**Server runs on**: `http://localhost:3001`  
**Client runs on**: `http://localhost:5173`

### 6. Production Build

```bash
npm run build
npm run start -w server
```

---

## 🗄️ Database Schema

### User Table (`users`)
```typescript
{
  id: string              // UUID primary key
  email: string           // Unique email
  name: string            // User name
  passwordHash: string    // Hashed password
  provider: string        // "password" | "gmail" | "outlook"
  
  // Gmail OAuth
  gmailAccessToken: string        // Access token
  gmailRefreshToken: string       // Refresh token
  gmailTokenExpiry: DateTime      // Token expiration
  gmailLinkedAt: DateTime         // When linked
  gmailEmail: string              // Gmail address
  
  apiKey: string          // Unique API key
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relations
  emails: Email[]
  tonePrompts: TonePrompt[]
  processingJobs: ProcessingJob[]
}
```

### Email Table (`emails`)
```typescript
{
  id: string              // UUID
  userId: string          // Foreign key
  providerId: string      // Gmail message ID
  subject: string         // Email subject
  body: string            // Email body (full content)
  recipients: Json        // [{"email": "...", "name": "..."}]
  sentAt: DateTime        // When email was sent
  context: string         // "client" | "internal" | "casual"
  
  // Tone Analysis Results
  tone: string            // "professional" | "casual" | "formal" | "friendly"
  sentiment: string       // "positive" | "negative" | "neutral"
  confidenceScore: float  // 0.0 - 1.0
  keywords: Json          // ["keyword1", "keyword2", ...]
  
  createdAt: DateTime
  analyzedAt: DateTime
  
  // Indexes
  @@unique([userId, providerId])
  @@index([userId])
  @@index([userId, context])
  @@index([tone])
}
```

### TonePrompt Table (`tone_prompts`)
```typescript
{
  id: string              // UUID
  userId: string          // Foreign key
  context: string         // "client" | "internal" | "casual" | "general"
  version: int            // Version number
  toneText: string        // The generated prompt text
  styleTraits: Json       // {vocabulary, phrases, formality, tone, ...}
  qualityScore: float     // 0 - 1 (based on consistency)
  emailCount: int         // Emails used to create this
  consistency: float      // How consistent the style is
  recencyScore: float     // Recent emails weighted higher
  status: string          // "active" | "superseded" | "draft"
  jobId: string           // Link to ProcessingJob
  createdAt: DateTime
}
```

### ProcessingJob Table (`processing_jobs`)
```typescript
{
  id: string              // UUID
  userId: string          // Foreign key
  type: string            // "tone_analysis" | "email_fetch"
  status: string          // "pending" | "processing" | "completed" | "failed"
  context: string         // Context for the job (e.g., "internal", "client")
  errorMessage: string    // Error details if failed
  attempts: int           // Number of attempts
  maxAttempts: int        // Max retries (default 3)
  metadata: Json          // {emailCount, processedCount, ...}
  createdAt: DateTime
  startedAt: DateTime
  completedAt: DateTime
}
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register              - Register new user
POST   /api/auth/login                 - Login with email/password
POST   /api/auth/logout                - Logout (clear tokens)
GET    /api/oauth/gmail/authorize      - Redirect to Gmail OAuth
GET    /api/oauth/gmail/callback       - Gmail OAuth callback
POST   /api/auth/refresh               - Refresh access token
```

### User Profile
```
GET    /api/users/profile              - Get current user profile
PUT    /api/users/profile              - Update profile
GET    /api/users/api-key              - Get API key
POST   /api/users/api-key/regenerate   - Regenerate API key
```

### Tone Prompts (Main Features)
```
GET    /api/prompts                    - Get all prompts for user
GET    /api/prompts/:id                - Get specific prompt
POST   /api/prompts                    - Create new prompt (manually)
PUT    /api/prompts/:id                - Update prompt
DELETE /api/prompts/:id                - Delete prompt
GET    /api/prompts/context/:context   - Get prompts by context
GET    /api/prompts/stats              - Get statistics
```

### Analyzed Emails
```
GET    /api/emails                     - List all analyzed emails
GET    /api/emails/:id                 - Get email details
GET    /api/emails/context/:context    - Get emails by context
GET    /api/emails/stats/average-score - Get average tone score
GET    /api/emails/patterns            - Get discovered patterns
```

### Processing Jobs
```
GET    /api/jobs                       - List all jobs
GET    /api/jobs/:id                   - Get job details
POST   /api/jobs/manual-fetch          - Manually trigger email fetch
GET    /api/jobs/status/:jobId         - Real-time job status
```

### Admin Dashboard
```
GET    /api/admin/stats                - Get system statistics
GET    /api/admin/users                - List all users
GET    /api/admin/jobs                 - List all jobs (all users)
POST   /api/admin/users/:id/disable    - Disable user account
```

### Public API (For External Apps)
```
POST   /api/public/generate-email      - Generate email using tone prompt
  Headers: X-API-Key: <user_api_key>
  Body: {
    "promptId": "...",
    "emailBody": "...",
    "context": "client"
  }
```

### Health Check
```
GET    /api/health                     - Server health status
```

---

## 🔄 Real-Time Features

### WebSocket Connections (Socket.IO)

#### Events from Client → Server
```typescript
// Subscribe to job updates
socket.emit('subscribe-jobs', userId);

// Unsubscribe from updates
socket.emit('unsubscribe-jobs', userId);

// Admin: Subscribe to system stats
socket.emit('subscribe-admin-stats');

// Admin: Unsubscribe from stats
socket.emit('unsubscribe-admin-stats');
```

#### Events from Server → Client
```typescript
// Job status update (sent to subscribed users)
socket.on('job-update', (update: JobUpdate) => {
  jobId: string;
  userId: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;              // 0-100
  message?: string;               // Status message
  results?: {
    emailsProcessed: number;
    contexts: string[];
    summary: string;
  };
  error?: string;
  timestamp: string;
});

// Connection status
socket.on('connect', () => {...});
socket.on('disconnect', () => {...});
socket.on('connect_error', (error) => {...});

// Admin stats update
socket.on('stats-update', (stats: AdminStats) => {
  totalUsers: number;
  activeJobs: number;
  failedJobs: number;
  totalEmailsProcessed: number;
  averageScore: number;
  timestamp: string;
});
```

### Real-Time Hook (React)
```typescript
// In client components:
const { socket, isConnected } = useSocketIO();
const { jobUpdates, latestUpdate } = useJobUpdates(userId);

// Subscribe to specific job updates
useEffect(() => {
  if (latestUpdate?.status === 'completed') {
    // Refresh UI
  }
}, [latestUpdate]);
```

---

## ⏰ Background Jobs & Cron

### Cron Scheduler
**Schedule**: Every 15 minutes (configurable via `EMAIL_FETCH_CRON`)

**What it does**:
1. Finds all users with valid Gmail credentials
2. Creates a `ProcessingJob` record for tracking
3. Enqueues email fetch task in BullMQ queue
4. Emits real-time update via Socket.IO

```typescript
// Cron expression examples:
'*/15 * * * *'    // Every 15 minutes
'*/5 * * * *'     // Every 5 minutes
'0 * * * *'       // Every hour
'0 0 * * *'       // Daily at midnight
```

### Email Fetch Worker
**Queue**: `email-fetch`  
**Purpose**: Fetch unprocessed emails from Gmail

**Process**:
1. Authenticate with Gmail API using user's OAuth token
2. Fetch emails since last sync (using stored `lastEmailSync` timestamp)
3. Extract email metadata (subject, body, recipients, sentAt)
4. Store emails in database
5. Enqueue for tone analysis
6. Emit real-time progress updates

**Retry Logic**: Automatic retry up to 3 times with exponential backoff

### Tone Analysis Worker
**Queue**: `tone-analysis`  
**Purpose**: Analyze emails and extract tone patterns

**Process**:
1. Fetch batch of unanalyzed emails
2. Send to OpenAI with prompt for tone analysis
3. Extract: tone, sentiment, confidence, keywords, writing style
4. Classify email context (client, internal, casual)
5. Store results in database
6. Generate/Update tone prompts for each context
7. Calculate statistics

**AI Prompt Example**:
```
Analyze this email and extract:
1. Tone (professional, casual, formal, friendly, neutral)
2. Sentiment (positive, negative, neutral)
3. Key characteristics of writing style
4. Main keywords and themes
5. Context (business/client, internal, casual)

Email:
[email body]

Return JSON response with these fields...
```

---

## 👥 User Guide

### For End Users

#### 1. Sign Up
- Go to http://localhost:5173
- Click "Sign Up"
- Enter email and password (or use Gmail OAuth)
- Verify email (if configured)

#### 2. Link Gmail Account
- Dashboard → Settings → "Connect Gmail"
- Authorize with your Gmail account
- Grant permission to read emails
- System will start fetching emails automatically

#### 3. Monitor Analysis
- **Dashboard**: See real-time progress
- **Emails Tab**: View analyzed emails with tone/sentiment
- **Patterns Tab**: See discovered writing patterns
- **Prompts Tab**: View generated tone prompts

#### 4. View Results
- **Average Score**: Overall tone consistency across emails
- **Analyzed Emails**: Full list with metadata
- **Found Patterns**: Extracted vocabulary, phrases, formality level
- **Tone Prompts**: Generated prompts for different contexts

#### 5. Use API (External Integration)
- Go to Profile → API Keys
- Copy your API key
- Use in external app:
```bash
curl -X POST http://localhost:3001/api/public/generate-email \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "promptId": "...",
    "emailBody": "Draft email here...",
    "context": "client"
  }'
```

### For Admins

#### 1. Admin Dashboard
- URL: http://localhost:5173/admin
- View all users, jobs, and system stats
- Monitor real-time queue activity

#### 2. System Statistics
- Total users and active jobs
- Email processing rate
- Average tone scores
- Error rates and failed jobs

#### 3. Job Management
- View all processing jobs
- Check job status and progress
- See error messages for failed jobs
- Manually trigger email fetch for users

#### 4. User Management
- View all user accounts
- See last sync dates
- Disable accounts if needed
- Monitor API usage

---

## 🐛 Troubleshooting

### Cron Not Running / Emails Not Fetching

**Problem**: Cron job scheduled but emails aren't being fetched.

**Solutions**:
```bash
# 1. Check if server is running
ps aux | grep node

# 2. Check logs for cron messages
tail -f server/logs/combined.log | grep "Cron\|scheduler"

# 3. Verify Gmail credentials in database
# In Prisma Studio: npm run db:studio
# Check User table for gmailAccessToken

# 4. Test email fetch manually via API
curl -X POST http://localhost:3001/api/jobs/manual-fetch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# 5. Check Redis connection
redis-cli ping  # Should return PONG

# 6. Verify workers are running
grep "Worker" server/logs/combined.log | tail -20
```

### Real-Time Updates Not Showing

**Problem**: UI doesn't update when cron finishes or job completes.

**Solutions**:
```bash
# 1. Check WebSocket connection
# Open browser DevTools → Network → WS
# Look for connection to /socket.io

# 2. Verify Socket.IO is initialized
grep "Socket.IO" server/logs/combined.log

# 3. Check if job updates are being emitted
grep "Broadcasted job update" server/logs/combined.log

# 4. Manually test subscription (browser console)
// In browser console of http://localhost:5173
socket.on('job-update', (data) => console.log('Update:', data));

# 5. Restart Socket.IO
npm run dev:server  # Restart server
```

### OpenAI API Errors

**Problem**: "OpenAI API key missing" or "Invalid API key"

**Solutions**:
```bash
# 1. Verify API key in .env
cat server/.env | grep OPENAI_API_KEY

# 2. Check API key validity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 3. Check API key permissions in OpenAI dashboard

# 4. Check logs for specific error
grep -i openai server/logs/combined.log | tail -20
```

### Database Connection Issues

**Problem**: "Database connection failed" or "Cannot connect to PostgreSQL"

**Solutions**:
```bash
# 1. Check if PostgreSQL is running
docker-compose ps | grep postgres

# 2. Test connection manually
psql $DATABASE_URL

# 3. Verify DATABASE_URL format
echo $DATABASE_URL

# Should be: postgresql://user:password@host:5432/dbname

# 4. Restart services
docker-compose down
docker-compose up -d

# 5. Check migrations
npm run db:migrate
```

### Redis Connection Issues

**Problem**: "Cannot connect to Redis" or "Queue errors"

**Solutions**:
```bash
# 1. Check if Redis is running
docker-compose ps | grep redis

# 2. Test Redis connection
redis-cli ping

# 3. Check REDIS_URL
echo $REDIS_URL

# Should be: redis://localhost:6379

# 4. Clear Redis (if needed - WARNING: clears all data)
redis-cli FLUSHALL

# 5. Restart Redis
docker-compose restart redis
```

### No Emails Appearing After Link

**Problem**: Linked Gmail but no emails in database.

**Solutions**:
```bash
# 1. Check if emails were fetched
# In Prisma Studio: npm run db:studio
# Check Email table

# 2. Check worker logs
grep "email-fetch.worker" server/logs/combined.log

# 3. Manually trigger fetch
curl -X POST http://localhost:3001/api/jobs/manual-fetch \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Verify Gmail token isn't expired
# Check gmailTokenExpiry in database
# If expired, user needs to re-link Gmail

# 5. Check Gmail OAuth scopes
# Verify you requested: https://www.googleapis.com/auth/gmail.readonly
```

### UI Not Showing Analyzed Emails or Patterns

**Problem**: Emails exist but don't show up in dashboard, or patterns not displayed.

**Solutions**:
```bash
# 1. Check if tone analysis completed
# Look for completed tone-analysis jobs in ProcessingJob table

# 2. Verify emails have tone data
# Check Email.tone, Email.sentiment, Email.keywords fields

# 3. Check frontend API calls
# Open DevTools → Network tab
# Check `/api/emails` responses

# 4. Restart frontend
npm run dev:client

# 5. Clear browser cache and localStorage
# DevTools → Application → Clear site data
```

---

## 📊 Monitoring & Logs

### Server Logs
```bash
# Real-time logs
tail -f server/logs/combined.log

# Filter by component
grep "Worker\|Cron\|Socket\|Error" server/logs/combined.log

# Log levels
# DEBUG: Development info
# INFO: General information
# WARN: Warnings
# ERROR: Errors
```

### Database Query Logs
```bash
# Enable in Prisma
# Add to DATABASE_URL: ?schema=public&connection_limit=5&pool_timeout=30
# Then in code:
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Redis Monitoring
```bash
# Connect to Redis CLI
redis-cli

# Monitor commands
MONITOR

# Check queue status
# Use BullMQ admin UI or logs

# Clear queue (WARNING)
FLUSHDB  # Current database
FLUSHALL # All databases
```

---

## 🔐 Security Considerations

1. **API Keys**: Treat like passwords, rotate regularly
2. **OAuth Tokens**: Stored encrypted, refresh automatically
3. **Database**: Use strong PostgreSQL password, enable SSL
4. **Rate Limiting**: Built-in, configurable per endpoint
5. **CORS**: Whitelist specific origins in production
6. **HTTPS**: Use in production only
7. **Environment Variables**: Never commit `.env` files

---

## 📈 Performance Tips

1. **Batch Processing**: Email analysis processes in batches
2. **Caching**: Redis caches computed statistics
3. **Indexing**: Database indexes on frequently queried fields
4. **WebSocket**: Use for real-time instead of polling
5. **Rate Limits**: Prevents API abuse
6. **Pagination**: List endpoints support pagination

---

## 📝 Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add your feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Open Pull Request

---

## 📄 License

This project is proprietary. All rights reserved.

---

## 🆘 Support

For issues, questions, or feature requests, please open an issue in the repository or contact the development team.

---

**Last Updated**: April 2026
**Version**: 1.0.0
