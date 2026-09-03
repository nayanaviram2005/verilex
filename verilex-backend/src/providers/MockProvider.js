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

// Common filler words are excluded from matching — without this, words
// like "and", "against", "about", "was" match almost every fixture's
// boilerplate legal text and let the entire corpus through regardless of
// actual relevance (e.g. a sexual-assault scenario incorrectly surfacing
// the Consumer Protection Act purely because both texts contain "and" and
// "about"). Only substantive, topical words should count as signal.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'not', 'with',
  'that', 'this', 'these', 'those', 'from', 'they', 'them', 'their', 'then', 'than', 'also', 'into',
  'onto', 'upon', 'about', 'against', 'because', 'while', 'when', 'where', 'what', 'which', 'who',
  'whom', 'whose', 'will', 'shall', 'should', 'would', 'could', 'can', 'may', 'might', 'must', 'you',
  'your', 'yours', 'me', 'my', 'mine', 'him', 'his', 'her', 'hers', 'its', 'our', 'ours', 'over',
  'under', 'after', 'before', 'during', 'between', 'out', 'off', 'own', 'same', 'such', 'very',
  'just', 'more', 'most', 'some', 'any', 'all', 'each', 'other', 'someone', 'something', 'anything',
  'there', 'here', 'now', 'been', 'being', 'once', 'only', 'worried', 'filed',
]);

// A word counts as a meaningful match only if it's long enough and not a
// stopword — this is the signal MockProvider's relevance scoring is built
// on, so it has to actually mean something topically.
function isMeaningfulToken(token) {
  return token.length >= 4 && !STOPWORDS.has(token);
}

function scoreAgainstQuery(record, queryTokens, filters) {
  const haystack = `${record.title} ${record.fullText} ${(record.concepts || []).join(' ')}`.toLowerCase();
  let score = 0;
  // Track *distinct* words that hit, not the number of hits — a single
  // shared word (e.g. "complaint" appearing in both a "criminal complaint"
  // query and an unrelated "consumer complaint" concept tag) must not
  // count twice just because it matched via two different checks.
  const matchedTokens = new Set();
  for (const token of queryTokens) {
    if (!isMeaningfulToken(token)) continue;
    let tokenScore = 0;
    if (haystack.includes(token)) tokenScore += 1;
    if ((record.concepts || []).some((c) => c.toLowerCase().includes(token))) tokenScore += 2;
    if (tokenScore > 0) {
      score += tokenScore;
      matchedTokens.add(token);
    }
  }
  if (filters?.state && record.state && record.state.toLowerCase() === filters.state.toLowerCase()) score += 3;
  if (filters?.sourceType && record.sourceType === filters.sourceType) score += 1;
  if (filters?.act && record.act && record.act.toLowerCase().includes(filters.act.toLowerCase())) score += 3;
  // Require at least two distinct meaningful words to overlap — a single
  // incidental word match isn't enough to call something relevant.
  return matchedTokens.size >= 2 ? score : 0;
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
