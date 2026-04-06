/**
 * LLM Prompt Templates for tone analysis and context classification.
 */

export const TONE_ANALYSIS_PROMPT = `You are an expert communication analyst. Analyze the following emails sent by a user and extract their unique writing tone and style.

For each dimension below, provide a score between 0.0 and 1.0:
- formality: How formal vs. casual is the writing? (1.0 = very formal)
- warmth: How warm and friendly vs. cold and distant? (1.0 = very warm)
- directness: How direct vs. indirect? (1.0 = very direct)
- enthusiasm: How enthusiastic vs. reserved? (1.0 = very enthusiastic)
- empathy: How empathetic and considerate? (1.0 = very empathetic)
- humor: How much humor is used? (1.0 = very humorous)
- assertiveness: How assertive vs. passive? (1.0 = very assertive)
- conciseness: How concise vs. verbose? (1.0 = very concise)

Also provide:
1. A consistency score (0.0-1.0) indicating how consistent the tone is across all emails.
2. A detailed tone prompt (3-5 paragraphs) that could be used to instruct an AI to write emails in this person's style. The prompt should capture specific patterns, vocabulary choices, greeting/sign-off styles, sentence structure, and any unique characteristics.

IMPORTANT: Return ONLY valid JSON in the following format:
{
  "styleTraits": {
    "formality": <number>,
    "warmth": <number>,
    "directness": <number>,
    "enthusiasm": <number>,
    "empathy": <number>,
    "humor": <number>,
    "assertiveness": <number>,
    "conciseness": <number>
  },
  "consistency": <number>,
  "tonePrompt": "<string>"
}

EMAILS TO ANALYZE:
---
{{emails}}
---`;

export const CONTEXT_CLASSIFICATION_PROMPT = `You are an email classifier. Classify each email into one of the following categories based on its content, recipients, and tone:

- "client": External communication with clients, customers, or business partners
- "internal": Internal team communication, updates, or discussions
- "casual": Informal, personal, or social communication

Consider these factors:
- Formality level
- Email domain of recipients (same company domain = likely internal)
- Content type (project updates, invoices = client; stand-ups, 1:1s = internal; plans, jokes = casual)
- Greeting/sign-off style

Return ONLY valid JSON in the following format:
{
  "classifications": [
    { "emailId": "<string>", "context": "<client|internal|casual>", "confidence": <0.0-1.0> }
  ]
}

EMAILS TO CLASSIFY:
---
{{emails}}
---`;

export function buildToneAnalysisPrompt(emails: Array<{ subject?: string; body: string; sentAt: string }>): string {
  const emailTexts = emails
    .map((email, i) => {
      const subject = email.subject ? `Subject: ${email.subject}` : 'Subject: (none)';
      return `Email ${i + 1} (${email.sentAt}):\n${subject}\n${email.body}`;
    })
    .join('\n\n---\n\n');

  return TONE_ANALYSIS_PROMPT.replace('{{emails}}', emailTexts);
}

export function buildContextClassificationPrompt(
  emails: Array<{ id: string; subject?: string; body: string; recipients?: any }>
): string {
  const emailTexts = emails
    .map((email) => {
      const subject = email.subject ? `Subject: ${email.subject}` : 'Subject: (none)';
      const recipients = email.recipients ? `Recipients: ${JSON.stringify(email.recipients)}` : '';
      return `ID: ${email.id}\n${subject}\n${recipients}\n${email.body.substring(0, 500)}`;
    })
    .join('\n\n---\n\n');

  return CONTEXT_CLASSIFICATION_PROMPT.replace('{{emails}}', emailTexts);
}
