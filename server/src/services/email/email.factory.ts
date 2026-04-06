import { logger } from '../../config/logger';
import { FetchedEmail, fetchGmailSentEmails, GmailTokens } from './gmail.service';
import { fetchImapSentEmails, ImapConfig } from './imap.service';

export type EmailProvider = 'gmail' | 'outlook' | 'imap';

export interface EmailFetchOptions {
  afterDate?: Date;
  maxResults?: number;
}

/**
 * Factory pattern to fetch emails from any supported provider.
 */
export async function fetchEmailsFromProvider(
  provider: EmailProvider,
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;
    imapConfig?: ImapConfig;
    userId?: string;
  },
  options: EmailFetchOptions = {}
): Promise<FetchedEmail[]> {
  const { afterDate, maxResults = 500 } = options;

  logger.info(`Fetching emails from provider: ${provider}`, { maxResults, userId: credentials.userId });

  switch (provider) {
    case 'gmail': {
      if (!credentials.accessToken || !credentials.refreshToken) {
        throw new Error('Gmail requires accessToken and refreshToken');
      }
      const tokens: GmailTokens = {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        tokenExpiry: credentials.tokenExpiry || new Date(),
      };
      return fetchGmailSentEmails(tokens, credentials.userId, afterDate, maxResults);
    }

    case 'outlook': {
      // Outlook uses similar OAuth2 flow — stub for future implementation
      logger.warn('Outlook provider not yet implemented, falling back to IMAP');
      if (credentials.imapConfig) {
        return fetchImapSentEmails(credentials.imapConfig, afterDate, maxResults);
      }
      throw new Error('Outlook provider not yet implemented and no IMAP config provided');
    }

    case 'imap': {
      if (!credentials.imapConfig) {
        throw new Error('IMAP provider requires imapConfig');
      }
      return fetchImapSentEmails(credentials.imapConfig, afterDate, maxResults);
    }

    default:
      throw new Error(`Unsupported email provider: ${provider}`);
  }
}
