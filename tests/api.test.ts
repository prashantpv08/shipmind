import { describe, expect, it } from 'vitest';
import { POST } from '../app/api/analyze/route';
import { AnalysisResult } from '../src/domain/schemas';
import { brief } from '../src/domain/day2';

describe('analyze route', () => {
  it('rejects invalid JSON', async () => {
    const response = await POST(new Request('http://x/api/analyze', { method: 'POST', body: '{' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Request body must be valid JSON' });
  });

  it('rejects blank and short request bodies', async () => {
    for (const invalidBrief of ['   ', 'too short']) {
      const response = await POST(new Request('http://x/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ brief: invalidBrief }),
      }));
      expect(response.status).toBe(400);
    }
  });

  it('rejects request bodies larger than the SRS limit', async () => {
    const response = await POST(new Request('http://x/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ brief: 'x'.repeat(15001) }),
    }));

    expect(response.status).toBe(400);
  });

  it('returns the canonical AnalysisResult for an explicit fixture request', async () => {
    const response = await POST(new Request('http://x/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ brief, useFixture: true }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(AnalysisResult.safeParse(body).success).toBe(true);
    expect(body.run.label).toBe('Demo fixture');
  });
});
