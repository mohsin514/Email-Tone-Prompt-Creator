# 🔐 Authentication & Email Linking Flow

## Complete User Journey

### Phase 1: User Registration & Login (Simple JWT)
```
┌─────────────────────────────┐
│  1. User visits /register   │
│     Enters: Name, Email,    │
│     Password                │
└──────────────┬──────────────┘
               │
               ↓
┌──────────────────────────────┐
│  2. Backend validates        │
│     Password hashed          │
│     User created in DB       │
│     JWT tokens generated     │
└──────────────┬───────────────┘
               │
               ↓
┌──────────────────────────────┐
│  3. User redirected to       │
│     /dashboard               │
│     Tokens stored in         │
│     localStorage             │
└──────────────────────────────┘
```

### Phase 2: Email Account Linking (OAuth2)
```
┌────────────────────────────────┐
│  1. User sees Dashboard        │
│     Clicks "Link Gmail Account"│
│     Button                     │
└──────────────┬─────────────────┘
               │
               ↓
┌──────────────────────────────────┐
│  2. Frontend calls:              │
│     GET /api/users/:id/auth/     │
│     gmail (with JWT token)       │
│                                  │
│     Backend returns Gmail OAuth  │
│     authorization URL           │
└──────────────┬──────────────────┘
               │
               ↓
┌──────────────────────────────────┐
│  3. User redirected to Gmail     │
│     Logs in with Google account  │
│     Grants permissions:          │
│     - Read Gmail emails          │
│     - Access profile             │
└──────────────┬──────────────────┘
               │
               ↓
┌──────────────────────────────────┐
│  4. Gmail redirects to:          │
│     /api/users/:id/auth/gmail/   │
│     callback?code=xyz            │
│                                  │
│     Backend exchanges code for   │
│     access token & refresh token │
└──────────────┬──────────────────┘
               │
               ↓
┌──────────────────────────────────┐
│  5. Backend stores Gmail tokens  │
│     in database for user         │
│     Updates user record:         │
│     {                            │
│       gmailAccessToken: "...",   │
│       gmailRefreshToken: "...",  │
│       gmailTokenExpiry: Date     │
│     }                            │
└──────────────┬──────────────────┘
               │
               ↓
┌──────────────────────────────────┐
│  6. Frontend now can:            │
│     - Fetch real Gmail emails    │
│     - Perform tone analysis      │
│     - Show real data in dashboard│
└──────────────────────────────────┘
```

### Phase 3: Fetch & Analyze Real Emails
```
┌────────────────────────────────────┐
│  1. Dashboard component mounts     │
│     User has Gmail tokens         │
└──────────────┬─────────────────────┘
               │
               ↓
┌────────────────────────────────────┐
│  2. Frontend calls:                │
│     GET /api/users/:id/emails      │
│     (with JWT token)               │
│                                    │
│     Backend uses stored Gmail      │
│     tokens to fetch emails from    │
│     Gmail API                      │
└──────────────┬─────────────────────┘
               │
               ↓
┌────────────────────────────────────┐
│  3. Backend processes each email:  │
│     - Extract subject, body        │
│     - Send to OpenAI API for       │
│       tone analysis                │
│     - Store results in database    │
└──────────────┬─────────────────────┘
               │
               ↓
┌────────────────────────────────────┐
│  4. Backend returns real emails    │
│     with tone analysis to frontend │
│                                    │
│     [                              │
│       {                            │
│         id: "...",                 │
│         subject: "...",            │
│         from: "...",               │
│         tone: "Professional",      │
│         sentiment: "Positive",     │
│         score: 92,                 │
│         analyzedAt: Date           │
│       }                            │
│     ]                              │
└──────────────┬─────────────────────┘
               │
               ↓
┌────────────────────────────────────┐
│  5. Dashboard displays:            │
│     - Real email data              │
│     - Tone analysis charts         │
│     - Real statistics              │
│     - All based on actual emails   │
└────────────────────────────────────┘
```

## Database Schema Changes Needed

### User Table (Add Gmail Fields)
```typescript
user {
  id: string (PK)
  email: string
  password: string (hashed)
  name: string
  
  // Gmail OAuth fields
  gmailAccessToken?: string
  gmailRefreshToken?: string
  gmailTokenExpiry?: Date
  gmailLinkedAt?: Date
  
  createdAt: Date
  updatedAt: Date
}
```

### Email Table (New)
```typescript
email {
  id: string (PK)
  userId: string (FK)
  
  gmailId: string (unique)
  subject: string
  body: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  
  tone?: string // "Professional", "Casual", etc.
  sentiment?: string // "Positive", "Negative", "Neutral"
  confidenceScore?: number
  
  sentAt: Date
  analyzedAt?: Date
  
  createdAt: Date
  updatedAt: Date
}
```

## API Endpoints Needed

### 1. Get Gmail OAuth URL
```
GET /api/users/:id/auth/gmail
Headers: Authorization: Bearer {JWT}

Response:
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### 2. Gmail OAuth Callback
```
GET /api/auth/gmail/callback?code=xyz

Backend:
- Exchanges code for tokens
- Updates user record
- Redirects to frontend /dashboard or OAuth callback page
```

### 3. Fetch Real Emails
```
GET /api/users/:id/emails
Headers: Authorization: Bearer {JWT}

Response:
[
  {
    id: "email-1",
    subject: "Project Update",
    from: "john@example.com",
    tone: "Professional",
    sentiment: "Positive",
    score: 92,
    body: "...",
    sentAt: "2026-04-05T10:30:00Z",
    analyzedAt: "2026-04-05T10:31:00Z"
  },
  ...
]
```

### 4. Get Email Analytics
```
GET /api/users/:id/emails/analytics
Headers: Authorization: Bearer {JWT}

Response:
{
  totalEmails: 45,
  analyzedEmails: 42,
  toneDistribution: {
    Professional: 35,
    Casual: 5,
    Formal: 2,
    Friendly: 0
  },
  averageScore: 89.2,
  lastFetched: "2026-04-05T10:31:00Z"
}
```

## Frontend Components Structure

```
/pages
  └── UserDashboard.tsx
      ├── Uses: LinkedAccountStatus (shows Gmail status)
      ├── Uses: LinkGmailButton (connects Gmail account)
      ├── Uses: EmailList (shows real emails)
      ├── Uses: ToneAnalyticsChart (real analytics)
      └── Fetches: GET /api/users/:id/emails

/components
  ├── LinkGmailButton.tsx (OAuth popup)
  ├── LinkedAccountStatus.tsx (Gmail status indicator)
  ├── EmailList.tsx (displays real emails)
  └── ToneAnalyticsChart.tsx (charts real data)
```

## Backend Services Structure

```
/services/email
  ├── gmail.service.ts (OAuth flow)
  ├── gmail-fetch.service.ts (fetch emails)
  └── email-analyzer.service.ts (tone analysis)

/controllers
  ├── auth.controller.ts (Gmail OAuth)
  └── emails.controller.ts (fetch/analyze)

/routes
  ├── auth.routes.ts (OAuth endpoints)
  └── emails.routes.ts (email fetching)
```

## Key Security Considerations

1. **Tokens stored securely**: Gmail tokens encrypted in database
2. **JWT validation**: All email endpoints require valid JWT
3. **User isolation**: Can only access own emails
4. **Token refresh**: Auto-refresh Gmail token when expired
5. **CORS**: Restrict to frontend domain
6. **Rate limiting**: Prevent abuse of Gmail API

## Implementation Timeline

1. **Day 1**: Update database schema, create Email table
2. **Day 2**: Implement Gmail OAuth callback in backend
3. **Day 3**: Create email fetching service
4. **Day 4**: Create LinkGmailButton component
5. **Day 5**: Integrate real data into Dashboard
6. **Day 6**: Add email analytics
7. **Day 7**: Testing & bug fixes
