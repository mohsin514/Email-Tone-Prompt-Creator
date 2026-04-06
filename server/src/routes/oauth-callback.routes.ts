import { Router, Response } from 'express';
import { exchangeGmailCode } from '../services/email/gmail.service';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/auth/gmail/callback
 * Handle Gmail OAuth2 callback from Google
 * This is where Google redirects after user grants permission
 */
router.get('/gmail/callback', async (req, res: Response) => {
  try {
    const { code, state, error } = req.query;

    // Check for errors from Google
    if (error) {
      logger.error('Gmail OAuth error:', { error });
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gmail Linking Failed</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui; display: flex; justify-content: center; align-items: center; 
                     min-height: 100vh; margin: 0; background: #f5f5f5; }
              .container { background: white; padding: 2rem; border-radius: 8px; 
                          box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; }
              .error { color: #d32f2f; margin-bottom: 1rem; }
              h1 { color: #1976d2; margin-top: 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⚠️ Gmail Linking Failed</h1>
              <p class="error">Error: ${error}</p>
              <p>There was an issue linking your Gmail account. Please try again.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Validate required params
    if (!code || !state) {
      logger.error('Gmail callback missing required params:', { code: !!code, state: !!state });
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gmail Linking Failed</title>
            <meta charset="utf-8">
            <style>
              body { font-family: system-ui; display: flex; justify-content: center; align-items: center; 
                     min-height: 100vh; margin: 0; background: #f5f5f5; }
              .container { background: white; padding: 2rem; border-radius: 8px; 
                          box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; }
              h1 { color: #d32f2f; margin-top: 0; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Authorization Failed</h1>
              <p>Missing required authorization parameters. Please try linking your Gmail account again.</p>
            </div>
          </body>
        </html>
      `);
    }

    // State should be the userId
    const userId = state as string;

    logger.info(`Processing Gmail OAuth callback for user: ${userId}`);

    // Exchange code for tokens
    const tokens = await exchangeGmailCode(code as string);

    // Update user in database with tokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: tokens.accessToken || undefined,
        gmailRefreshToken: tokens.refreshToken || undefined,
        gmailTokenExpiry: tokens.tokenExpiry || undefined,
        gmailLinkedAt: new Date(),
        gmailEmail: tokens.accessToken ? 'gmail-linked' : undefined, // Placeholder - we'll get the actual email later
      },
    });

    logger.info(`Gmail linked successfully for user ${userId}`);

    // Send success HTML that notifies the popup opener
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gmail Account Linked</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; display: flex; justify-content: center; align-items: center; 
                   min-height: 100vh; margin: 0; background: #f5f5f5; }
            .container { background: white; padding: 2rem; border-radius: 8px; 
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; text-align: center; }
            .success { color: #388e3c; }
            h1 { color: #1976d2; margin-top: 0; margin-bottom: 0.5rem; }
            p { color: #666; margin-bottom: 1rem; }
            .spinner { display: inline-block; width: 20px; height: 20px; 
                      border: 3px solid #f3f3f3; border-top: 3px solid #1976d2; 
                      border-radius: 50%; animation: spin 1s linear infinite; margin-right: 0.5rem; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
          <script>
            window.onload = function() {
              // Notify the parent window that authorization succeeded
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'GMAIL_AUTH_SUCCESS' }, '*');
              }
              
              // Close popup after 2 seconds
              setTimeout(function() {
                // Method 1: Try standard close
                try {
                  window.close();
                } catch (e) {
                  // Method 2: Try closing via opener reference
                  if (window.opener) {
                    try {
                      window.opener.focus();
                      window.opener = null;
                      window.close();
                    } catch (e2) {
                      // Method 3: Just hide the window
                      document.body.innerHTML = '<p style="text-align:center; padding-top: 50vh; color: #999;">Closing...</p>';
                      // Keep popup open but hidden - parent will detect via polling
                    }
                  }
                }
              }, 2000);
            };
          </script>
        </head>
        <body>
          <div class="container">
            <h1>✓ Success!</h1>
            <p><span class="spinner"></span>Gmail account linked successfully!</p>
            <p style="font-size: 0.9rem; color: #999;">This window will close automatically...</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('Gmail callback processing error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gmail Linking Error</title>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui; display: flex; justify-content: center; align-items: center; 
                   min-height: 100vh; margin: 0; background: #f5f5f5; }
            .container { background: white; padding: 2rem; border-radius: 8px; 
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; }
            h1 { color: #d32f2f; margin-top: 0; }
            p { color: #666; }
            .error-detail { background: #ffebee; color: #c62828; padding: 1rem; 
                           border-radius: 4px; margin-top: 1rem; font-size: 0.9rem; 
                           font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Error Processing Request</h1>
            <p>There was an error linking your Gmail account. Please try again.</p>
            <div class="error-detail">${(error instanceof Error ? error.message : 'Unknown error').slice(0, 200)}</div>
            <p style="font-size: 0.9rem; margin-top: 1rem;"><a href="javascript:window.close()">Close this window</a></p>
          </div>
        </body>
      </html>
    `);
  }
});

export default router;
