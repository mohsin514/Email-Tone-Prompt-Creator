import { google, gmail_v1 } from 'googleapis';
import { logger } from '../../config/logger';
import { withRetry } from '../../utils/retry';

export interface FetchedEmail {
  providerId: string;
  subject?: string;
  body: string;
  recipients: Array<{ email: string; name?: string; type: 'to' | 'cc' | 'bcc' }>;
  sentAt: Date;
  metadata: Record<string, any>;
}

export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

/**
 * Generate OAuth2 authorization URL for Gmail.
 */
export function getGmailAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeGmailCode(code: string): Promise<GmailTokens> {
  const { tokens } = await oauth2Client.getToken(code);
  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    tokenExpiry: new Date(tokens.expiry_date!),
  };
}

/**
 * Fetch sent emails from Gmail using OAuth2.
 * @param tokens - User's current OAuth2 tokens
 * @param userId - User ID to persist refreshed tokens
 * @param afterDate - Only fetch emails sent after this date
 * @param maxResults - Maximum number of emails to fetch
 */
export async function fetchGmailSentEmails(
  tokens: GmailTokens,
  userId?: string, // userId is now optional for backward compatibility but recommended for refresh persistence
  afterDate?: Date,
  maxResults: number = 500
): Promise<FetchedEmail[]> {
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  // Listen for automatic token refresh events
  oauth2Client.on('tokens', async (newTokens) => {
    if (userId && newTokens.access_token) {
      logger.info(`Gmail access token refreshed for user ${userId}. Persisting...`);
      const { prisma } = await import('../../config/database');
      await prisma.user.update({
        where: { id: userId },
        data: {
          gmailAccessToken: newTokens.access_token,
          gmailTokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined,
        },
      });
    }
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Build query for sent emails
  let query = 'in:sent';
  if (afterDate) {
    query += ` after:${Math.floor(afterDate.getTime() / 1000)}`;
  }

  logger.info('Fetching Gmail sent emails', { query, maxResults });

  let messageIds: gmail_v1.Schema$Message[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const listResponse: any = await withRetry(
      () =>
        gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: Math.min(500, maxResults - messageIds.length),
          pageToken,
        }),
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        onRetry: (err, attempt) => logger.warn(`Gmail list retry ${attempt}:`, { error: err.message }),
      }
    );

    if (listResponse.data.messages) {
      messageIds = messageIds.concat(listResponse.data.messages);
    }
    
    pageToken = listResponse.data.nextPageToken;
  } while (pageToken && messageIds.length < maxResults);

  logger.info(`Found ${messageIds.length} sent emails`);

  const emails: FetchedEmail[] = [];

  for (const msg of messageIds) {
    try {
      const email = await fetchSingleEmail(gmail, msg.id!);
      if (email) emails.push(email);
    } catch (error) {
      logger.warn(`Failed to fetch email ${msg.id}:`, { error: (error as Error).message });
    }
  }

  return emails;
}

async function fetchSingleEmail(gmail: gmail_v1.Gmail, messageId: string): Promise<FetchedEmail | null> {
  const response = await withRetry(
    () =>
      gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      }),
    {
      maxRetries: 2,
      baseDelay: 500,
      maxDelay: 5000,
    }
  );

  const message = response.data;
  const headers = message.payload?.headers || [];

  const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

  const subject = getHeader('subject') || undefined;
  const toHeader = getHeader('to') || '';
  const ccHeader = getHeader('cc') || '';
  const dateHeader = getHeader('date');

  const body = extractEmailBody(message.payload);
  if (!body || body.trim().length === 0) {
    logger.debug(`Skipping email ${messageId}: empty body`);
    return null;
  }

  const recipients = [
    ...parseRecipients(toHeader, 'to'),
    ...parseRecipients(ccHeader, 'cc'),
  ];

  return {
    providerId: messageId,
    subject,
    body,
    recipients,
    sentAt: dateHeader ? new Date(dateHeader) : new Date(),
    metadata: {
      labelIds: message.labelIds,
      threadId: message.threadId,
      sizeEstimate: message.sizeEstimate,
    },
  };
}

function extractEmailBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';

  // Check for plain text body directly
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  // Check parts recursively
  if (payload.parts) {
    // Prefer plain text
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
    }

    // Fall back to HTML, strip tags
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }

    // Check nested parts
    for (const part of payload.parts) {
      const nested = extractEmailBody(part);
      if (nested) return nested;
    }
  }

  return '';
}

function parseRecipients(header: string, type: 'to' | 'cc' | 'bcc'): Array<{ email: string; name?: string; type: 'to' | 'cc' | 'bcc' }> {
  if (!header) return [];

  return header.split(',').map((entry) => {
    const match = entry.trim().match(/^(?:"?(.+?)"?\s)?<?([^\s<>]+@[^\s<>]+)>?$/);
    if (match) {
      return { email: match[2], name: match[1] || undefined, type };
    }
    return { email: entry.trim(), type };
  }).filter((r) => r.email.includes('@'));
}
