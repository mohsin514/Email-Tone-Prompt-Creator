import { logger } from '../../config/logger';

export interface QualityScoreInput {
  emailCount: number;
  consistency: number; // 0-1 from LLM
  emailDates: Date[];  // Dates of emails analyzed
}

export interface QualityScoreResult {
  qualityScore: number;   // 0-100
  recencyScore: number;   // 0-1
  details: {
    volumeComponent: number;
    consistencyComponent: number;
    recencyComponent: number;
  };
}

/**
 * Calculate quality score using the formula:
 * qualityScore = (
 *   0.4 * normalize(emailCount, 5, 100) +
 *   0.35 * consistencyScore +
 *   0.25 * recencyScore
 * ) * 100
 */
export function calculateQualityScore(input: QualityScoreInput): QualityScoreResult {
  const { emailCount, consistency, emailDates } = input;

  const volumeScore = normalize(emailCount, 5, 100);
  const recencyScore = calculateRecencyScore(emailDates);

  const qualityScore = (
    0.4 * volumeScore +
    0.35 * consistency +
    0.25 * recencyScore
  ) * 100;

  const result: QualityScoreResult = {
    qualityScore: Math.round(qualityScore * 100) / 100,
    recencyScore: Math.round(recencyScore * 100) / 100,
    details: {
      volumeComponent: Math.round(volumeScore * 40 * 100) / 100,
      consistencyComponent: Math.round(consistency * 35 * 100) / 100,
      recencyComponent: Math.round(recencyScore * 25 * 100) / 100,
    },
  };

  logger.debug('Quality score calculated', {
    emailCount,
    consistency,
    recencyScore: result.recencyScore,
    qualityScore: result.qualityScore,
  });

  return result;
}

/**
 * Normalize a value to 0-1 range with min/max clamping.
 */
function normalize(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

/**
 * Calculate recency score based on email dates.
 * Weights: < 30 days = 1.0, < 90 days = 0.7, < 180 days = 0.4, older = 0.1
 */
function calculateRecencyScore(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const now = new Date();
  let totalWeight = 0;

  for (const date of dates) {
    const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff < 30) {
      totalWeight += 1.0;
    } else if (daysDiff < 90) {
      totalWeight += 0.7;
    } else if (daysDiff < 180) {
      totalWeight += 0.4;
    } else {
      totalWeight += 0.1;
    }
  }

  return totalWeight / dates.length;
}
