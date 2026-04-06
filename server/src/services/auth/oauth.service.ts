import { google } from 'googleapis';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { GmailTokens, exchangeGmailCode } from '../email/gmail.service';

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

/**
 * Generate Gmail OAuth authorization URL
 * User will be redirected to Google login and consent screen
 */
export function getGmailAuthUrl(state?: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',
    state: state || 'default',
  });
}

/**
 * Handle Gmail OAuth callback
 * Exchange authorization code for tokens and store in database
 */
export async function handleGmailCallback(
  code: string,
  userId: string
): Promise<{ success: boolean; message: string; email?: string }> {
  try {
    logger.info(`Processing Gmail OAuth callback for user ${userId}`);

    // Exchange code for tokens
    const tokens = await exchangeGmailCode(code);

    // Get user's Gmail email address
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const gmailEmail = profile.data.emailAddress;

    // Update user in database with tokens
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: tokens.accessToken || undefined,
        gmailRefreshToken: tokens.refreshToken || undefined,
        gmailTokenExpiry: tokens.tokenExpiry || undefined,
        gmailLinkedAt: new Date(),
        gmailEmail: gmailEmail || undefined,
      },
    });

    logger.info(`Gmail linked successfully for user ${userId}: ${gmailEmail}`);

    return {
      success: true,
      message: `Gmail account (${gmailEmail}) linked successfully`,
      email: gmailEmail || undefined,
    };
  } catch (error) {
    logger.error('Gmail OAuth callback error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to process Gmail callback'
    );
  }
}

/**
 * Unlink Gmail from user account
 * Removes stored tokens and linked Gmail email
 */
export async function unlinkGmail(userId: string): Promise<void> {
  try {
    logger.info(`Unlinking Gmail for user ${userId}`);

    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: null,
        gmailRefreshToken: null,
        gmailTokenExpiry: null,
        gmailLinkedAt: null,
        gmailEmail: null,
      },
    });

    logger.info(`Gmail unlinked successfully for user ${userId}`);
  } catch (error) {
    logger.error('Unlink Gmail error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to unlink Gmail'
    );
  }
}

/**
 * Check if user has Gmail linked and tokens are still valid
 */
export async function isGmailLinked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      gmailAccessToken: true,
      gmailTokenExpiry: true,
    }
  });

  if (!user || !user.gmailAccessToken) {
    return false;
  }

  // Check if token is expired
  if (user.gmailTokenExpiry && user.gmailTokenExpiry < new Date()) {
    logger.warn(`Gmail token expired for user ${userId}`);
    return false;
  }

  return true;
}

/**
 * Get user's Gmail tokens
 * Returns null if Gmail is not linked or tokens are expired
 */
export async function getGmailTokens(userId: string): Promise<GmailTokens | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.gmailAccessToken || !user.gmailRefreshToken) {
    return null;
  }

  // Check if token is expired
  if (user.gmailTokenExpiry && user.gmailTokenExpiry < new Date()) {
    logger.warn(`Gmail token expired for user ${userId}`);
    return null;
  }

  return {
    accessToken: user.gmailAccessToken,
    refreshToken: user.gmailRefreshToken,
    tokenExpiry: user.gmailTokenExpiry!,
  };
}
