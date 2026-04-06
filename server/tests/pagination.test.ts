import { parsePagination, buildPaginatedResult } from '../src/utils/pagination';

describe('parsePagination', () => {
  it('defaults page to 1 and limit to 20', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20 });
  });

  it('clamps page to at least 1', () => {
    expect(parsePagination({ page: '0' })).toEqual({ page: 1, limit: 20 });
  });

  it('caps limit at 100', () => {
    expect(parsePagination({ limit: '500' })).toEqual({ page: 1, limit: 100 });
  });
});

describe('buildPaginatedResult', () => {
  it('computes totalPages and navigation flags', () => {
    const result = buildPaginatedResult(['a', 'b'], 25, { page: 2, limit: 10 });
    expect(result.data).toEqual(['a', 'b']);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
  });
});
