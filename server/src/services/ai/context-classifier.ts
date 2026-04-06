import OpenAI from 'openai';
import { logger } from '../../config/logger';
import { withRetry } from '../../utils/retry';
import { buildContextClassificationPrompt } from './prompts';

export interface ClassificationResult {
  emailId: string;
  context: 'client' | 'internal' | 'casual';
  confidence: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Classify a batch of emails into context categories (client, internal, casual).
 * Uses OpenAI for intelligent classification.
 */
export async function classifyEmailContexts(
  emails: Array<{ id: string; subject?: string; body: string; recipients?: any }>
): Promise<ClassificationResult[]> {
  if (emails.length === 0) return [];

  // Process in batches of 20 to stay within token limits
  const BATCH_SIZE = 20;
  const results: ClassificationResult[] = [];

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    logger.info(`Classifying email batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(emails.length / BATCH_SIZE)}`);

    const batchResults = await classifyBatch(batch);
    results.push(...batchResults);
  }

  return results;
}

async function classifyBatch(
  emails: Array<{ id: string; subject?: string; body: string; recipients?: any }>
): Promise<ClassificationResult[]> {
  const prompt = buildContextClassificationPrompt(emails);

  const result = await withRetry(
    async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a precise email classifier. Always return valid JSON. Never include markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content) as { classifications: ClassificationResult[] };

      if (!Array.isArray(parsed.classifications)) {
        throw new Error('Invalid classification response: missing classifications array');
      }

      return parsed.classifications;
    },
    {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 15000,
      onRetry: (error, attempt) => {
        logger.warn(`Context classification retry attempt ${attempt}:`, { error: error.message });
      },
    }
  );

  // Validate & normalize results
  return result.map((r) => ({
    emailId: r.emailId,
    context: validateContext(r.context),
    confidence: Math.max(0, Math.min(1, r.confidence || 0.5)),
  }));
}

function validateContext(context: string): 'client' | 'internal' | 'casual' {
  const valid = ['client', 'internal', 'casual'];
  if (valid.includes(context)) return context as 'client' | 'internal' | 'casual';
  logger.warn(`Invalid context "${context}", defaulting to "casual"`);
  return 'casual';
}
