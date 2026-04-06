import OpenAI from 'openai';
import { logger } from '../../config/logger';
import { withRetry } from '../../utils/retry';
import { buildToneAnalysisPrompt } from './prompts';

export interface ToneAnalysisResult {
  styleTraits: {
    formality: number;
    warmth: number;
    directness: number;
    enthusiasm: number;
    empathy: number;
    humor: number;
    assertiveness: number;
    conciseness: number;
  };
  consistency: number;
  tonePrompt: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze the tone of a batch of emails using OpenAI.
 * Returns structured style traits, consistency score, and a tone prompt.
 */
export async function analyzeTone(
  emails: Array<{ subject?: string; body: string; sentAt: string }>
): Promise<ToneAnalysisResult> {
  if (emails.length === 0) {
    throw new Error('No emails provided for tone analysis');
  }

  const prompt = buildToneAnalysisPrompt(emails);

  logger.info(`Starting tone analysis for ${emails.length} emails`);

  const result = await withRetry(
    async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a precise communication analyst. Always return valid JSON. Never include markdown formatting or code blocks.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      return JSON.parse(content) as ToneAnalysisResult;
    },
    {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 30000,
      onRetry: (error, attempt) => {
        logger.warn(`Tone analysis retry attempt ${attempt}:`, { error: error.message });
      },
    }
  );

  // Validate the result structure
  validateToneResult(result);

  logger.info('Tone analysis completed successfully', {
    consistency: result.consistency,
    promptLength: result.tonePrompt.length,
  });

  return result;
}

function validateToneResult(result: ToneAnalysisResult): void {
  const requiredTraits = [
    'formality', 'warmth', 'directness', 'enthusiasm',
    'empathy', 'humor', 'assertiveness', 'conciseness',
  ];

  for (const trait of requiredTraits) {
    const value = result.styleTraits[trait as keyof ToneAnalysisResult['styleTraits']];
    if (typeof value !== 'number' || value < 0 || value > 1) {
      throw new Error(`Invalid style trait "${trait}": ${value}. Must be a number between 0 and 1.`);
    }
  }

  if (typeof result.consistency !== 'number' || result.consistency < 0 || result.consistency > 1) {
    throw new Error(`Invalid consistency score: ${result.consistency}`);
  }

  if (typeof result.tonePrompt !== 'string' || result.tonePrompt.length < 50) {
    throw new Error('Tone prompt is too short or invalid');
  }
}
