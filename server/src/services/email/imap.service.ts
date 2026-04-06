import Imap from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { logger } from '../../config/logger';
import { withRetry } from '../../utils/retry';
import { FetchedEmail } from './gmail.service';

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

/**
 * Fetch sent emails from a generic IMAP server.
 */
export async function fetchImapSentEmails(
  config: ImapConfig,
  afterDate?: Date,
  maxResults: number = 500
): Promise<FetchedEmail[]> {
  return withRetry(
    () => doImapFetch(config, afterDate, maxResults),
    {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 15000,
      onRetry: (err, attempt) => logger.warn(`IMAP fetch retry ${attempt}:`, { error: err.message }),
    }
  );
}

function doImapFetch(config: ImapConfig, afterDate?: Date, maxResults: number = 50): Promise<FetchedEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 10000,
    });

    const emails: FetchedEmail[] = [];

    imap.once('ready', () => {
      // Try common sent folder names
      const sentFolders = ['[Gmail]/Sent Mail', 'Sent', 'INBOX.Sent', 'Sent Items', 'Sent Messages'];

      openSentFolder(imap, sentFolders, 0)
        .then(() => {
          const searchCriteria: any[] = ['ALL'];
          if (afterDate) {
            searchCriteria.push(['SINCE', afterDate]);
          }

          imap.search(searchCriteria, (err, results) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            if (!results || results.length === 0) {
              imap.end();
              return resolve([]);
            }

            // Take the most recent emails
            const uids = results.slice(-maxResults);
            const fetch = imap.fetch(uids, { bodies: '' });
            let pending = uids.length;

            fetch.on('message', (msg) => {
              let buffer = '';

              msg.on('body', (stream) => {
                stream.on('data', (chunk: Buffer) => {
                  buffer += chunk.toString('utf8');
                });
              });

              msg.once('attributes', (attrs) => {
                msg.once('end', async () => {
                  try {
                    const parsed = await simpleParser(buffer);
                    const email = parsedMailToFetchedEmail(parsed, String(attrs.uid));
                    if (email) emails.push(email);
                  } catch (parseErr) {
                    logger.warn('Failed to parse IMAP email:', { error: (parseErr as Error).message });
                  }

                  pending--;
                  if (pending === 0) {
                    imap.end();
                    resolve(emails);
                  }
                });
              });
            });

            fetch.once('error', (fetchErr) => {
              imap.end();
              reject(fetchErr);
            });
          });
        })
        .catch((openErr) => {
          imap.end();
          reject(openErr);
        });
    });

    imap.once('error', (err: Error) => {
      logger.error('IMAP connection error:', err);
      reject(err);
    });

    imap.connect();
  });
}

function openSentFolder(imap: Imap, folders: string[], index: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (index >= folders.length) {
      return reject(new Error('Could not find sent mail folder'));
    }

    imap.openBox(folders[index], true, (err) => {
      if (err) {
        // Try next folder name
        openSentFolder(imap, folders, index + 1).then(resolve).catch(reject);
      } else {
        logger.info(`Opened IMAP sent folder: ${folders[index]}`);
        resolve();
      }
    });
  });
}

function parsedMailToFetchedEmail(parsed: ParsedMail, uid: string): FetchedEmail | null {
  const body = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '');

  if (!body || body.trim().length === 0) return null;

  const recipients: FetchedEmail['recipients'] = [];

  if (parsed.to) {
    const toAddresses = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
    for (const addr of toAddresses) {
      if ('value' in addr) {
        for (const v of addr.value) {
          recipients.push({ email: v.address || '', name: v.name || undefined, type: 'to' });
        }
      }
    }
  }

  if (parsed.cc) {
    const ccAddresses = Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc];
    for (const addr of ccAddresses) {
      if ('value' in addr) {
        for (const v of addr.value) {
          recipients.push({ email: v.address || '', name: v.name || undefined, type: 'cc' });
        }
      }
    }
  }

  return {
    providerId: uid,
    subject: parsed.subject || undefined,
    body: body.substring(0, 10000), // Limit body size
    recipients,
    sentAt: parsed.date || new Date(),
    metadata: {
      messageId: parsed.messageId,
      inReplyTo: parsed.inReplyTo,
    },
  };
}
