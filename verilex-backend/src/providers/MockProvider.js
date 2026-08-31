import { LegalSourceProvider } from './LegalSourceProvider.js';
import { MOCK_SOURCES, MOCK_JUDGMENTS } from './mockFixtures.js';

const ALL = [...MOCK_SOURCES, ...MOCK_JUDGMENTS];

function normalize(record) {
  const { concepts, ...rest } = record;
  return {
    provider: 'mock',
    providerSourceId: rest.providerSourceId,
    title: rest.title,
    sourceType: rest.sourceType,
    url: rest.url ?? null,
    act: rest.act ?? null,
    section: rest.section ?? null,
    court: rest.court ?? null,
    jurisdiction: rest.jurisdiction ?? null,
    jurisdictionLevel: rest.jurisdictionLevel ?? 'unknown',
    state: rest.state ?? null,
    date: rest.date ?? null,
    effectiveDate: rest.effectiveDate ?? null,
    repealDate: rest.repealDate ?? null,
    currentStatus: rest.currentStatus ?? 'unknown',
    fullText: rest.fullText ?? null,
    excerpt: rest.fullText ? `${rest.fullText.slice(0, 240)}${rest.fullText.length > 240 ? '…' : ''}` : null,
    rawProviderMetadata: { source: 'mock-fixtures', concepts, ...rest },
  };
}

function scoreAgainstQuery(record, queryTokens, filters) {
  const haystack = `${record.title} ${record.fullText} ${(record.concepts || []).join(' ')}`.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (token.length < 3) continue;
    if (haystack.includes(token)) score += 1;
    if ((record.concepts || []).some((c) => c.toLowerCase().includes(token))) score += 2;
  }
  if (filters?.state && record.state && record.state.toLowerCase() === filters.state.toLowerCase()) score += 3;
  if (filters?.sourceType && record.sourceType === filters.sourceType) score += 1;
  if (filters?.act && record.act && record.act.toLowerCase().includes(filters.act.toLowerCase())) score += 3;
  return score;
}

/**
 * Local, clearly-separated mock provider. Active only when
 * LEGAL_PROVIDER=mock. Never used to backfill a production deployment.
 */
export class MockProvider extends LegalSourceProvider {
  name = 'mock';

  async search(query, filters = {}) {
    const queryTokens = (query || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const scored = ALL.map((record) => ({ record, score: scoreAgainstQuery(record, queryTokens, filters) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map(({ record, score }) => ({
      ...normalize(record),
      _mockScore: score,
    }));
  }

  async getSource(providerSourceId) {
    const record = ALL.find((r) => r.providerSourceId === providerSourceId);
    return record ? normalize(record) : null;
  }

  async getSection(act, section) {
    const record = ALL.find(
      (r) => r.act?.toLowerCase() === act?.toLowerCase() && r.section?.toLowerCase() === section?.toLowerCase()
    );
    return record ? normalize(record) : null;
  }

  async getJudgment(providerSourceId) {
    const record = MOCK_JUDGMENTS.find((r) => r.providerSourceId === providerSourceId);
    return record ? normalize(record) : null;
  }

  async getMetadata(providerSourceId) {
    const record = ALL.find((r) => r.providerSourceId === providerSourceId);
    return record ? { source: 'mock-fixtures', concepts: record.concepts } : null;
  }
}
