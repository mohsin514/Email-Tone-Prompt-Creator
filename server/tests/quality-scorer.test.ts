import { calculateQualityScore } from '../src/services/scoring/quality-scorer';

describe('calculateQualityScore', () => {
  it('returns higher score with more recent emails', () => {
    const now = new Date();
    const recent = calculateQualityScore({
      emailCount: 50,
      consistency: 0.8,
      emailDates: [now],
    });
    const old = calculateQualityScore({
      emailCount: 50,
      consistency: 0.8,
      emailDates: [new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000)],
    });
    expect(recent.qualityScore).toBeGreaterThan(old.qualityScore);
  });

  it('is monotonic in email count when other inputs fixed', () => {
    const d = new Date();
    const low = calculateQualityScore({
      emailCount: 5,
      consistency: 0.5,
      emailDates: [d],
    });
    const high = calculateQualityScore({
      emailCount: 80,
      consistency: 0.5,
      emailDates: [d],
    });
    expect(high.qualityScore).toBeGreaterThanOrEqual(low.qualityScore);
  });

  it('gives zero recency when no dates', () => {
    const r = calculateQualityScore({
      emailCount: 20,
      consistency: 1,
      emailDates: [],
    });
    expect(r.recencyScore).toBe(0);
  });
});
