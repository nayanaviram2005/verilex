import { LegalSourceProvider } from './LegalSourceProvider.js';

/**
 * Real provider integration for InsightLaw (https://insightlaw.in) — a
 * free, keyless API covering the Constitution of India, IPC, BNS 2023 and
 * a set of Kerala Acts, in English/Hindi/Malayalam.
 *
 * IMPORTANT CAVEAT: this environment's network egress is blocked for
 * insightlaw.in, so the exact JSON response shape (field names) could not
 * be confirmed against the live OpenAPI spec (https://insightlaw.in/openapi.json,
 * OAS 3.1, API v2.1.0) while writing this. The endpoint paths below are
 * taken directly from InsightLaw's published endpoint list, which is
 * reliable; the field-name lookups inside each normaliser are
 * best-effort, tolerant of a few common naming conventions (e.g. both
 * "text" and "content"), and fall back to `null`/omission rather than
 * guessing when a field genuinely isn't found — per the "never invent a
 * source URL" rule, `url` is only ever set from a field that is actually
 * present in the response. If live testing shows different field names,
 * only the `_pick(...)` lookups below need updating — the rest of the
 * app (caching, ranking, explanation) is unaffected because it only ever
 * sees the normalised NormalizedLegalSource shape.
 */
export class InsightLawProvider extends LegalSourceProvider {
  name = 'insightlaw';

  constructor({ baseUrl, timeoutMs }) {
    super();
    this.baseUrl = (baseUrl || 'https://insightlaw.in').replace(/\/$/, '');
    this.timeoutMs = timeoutMs || 6000;
  }

  async _get(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`InsightLaw API error ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // Tolerant field lookup: returns the first present, non-empty value.
  static _pick(obj, keys) {
    for (const key of keys) {
      const value = obj?.[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
  }

  _corpusMeta(corpus) {
    switch (corpus) {
      case 'constitution':
        return { act: 'Constitution of India', jurisdictionLevel: 'central', jurisdiction: 'India (Central)', state: null };
      case 'ipc':
        return { act: 'Indian Penal Code, 1860', jurisdictionLevel: 'central', jurisdiction: 'India (Central)', state: null };
      case 'bns':
        return { act: 'Bharatiya Nyaya Sanhita, 2023', jurisdictionLevel: 'central', jurisdiction: 'India (Central)', state: null };
      case 'kerala':
        return { act: null, jurisdictionLevel: 'state', jurisdiction: 'Kerala', state: 'Kerala' };
      case 'sahakary':
        return { act: 'Kerala Co-operative Societies Act', jurisdictionLevel: 'state', jurisdiction: 'Kerala', state: 'Kerala' };
      default:
        return { act: null, jurisdictionLevel: 'unknown', jurisdiction: null, state: null };
    }
  }

  _normalize(item, fallbackCorpus) {
    const pick = InsightLawProvider._pick;
    const corpus = pick(item, ['corpus', 'source', 'category']) || fallbackCorpus || 'unknown';
    const number = pick(item, ['number', 'section', 'article', 'id']);
    const meta = this._corpusMeta(String(corpus).toLowerCase());
    const act = pick(item, ['act', 'act_name', 'law']) || meta.act;
    const title =
      pick(item, ['title', 'heading', 'name']) ||
      (act && number ? `${act} — Section ${number}` : `InsightLaw ${corpus} ${number || ''}`.trim());
    const text = pick(item, ['text', 'content', 'body', 'full_text']);
    const url = pick(item, ['url', 'source_url', 'link']);
    const providerSourceId = pick(item, ['id', 'slug']) || `${String(corpus).toLowerCase()}:${number}`;

    return {
      provider: this.name,
      providerSourceId: String(providerSourceId),
      title: String(title),
      sourceType: 'section',
      url: url ? String(url) : null,
      act: act || null,
      section: number !== null ? String(number) : null,
      court: null,
      jurisdiction: pick(item, ['jurisdiction']) || meta.jurisdiction,
      jurisdictionLevel: meta.jurisdictionLevel,
      state: pick(item, ['state']) || meta.state,
      date: pick(item, ['date']),
      effectiveDate: pick(item, ['effective_date']),
      repealDate: pick(item, ['repeal_date']),
      // Deliberately not defaulted to "current": InsightLaw's response may
      // not flag amendment/repeal status per item, and this app never
      // silently asserts a version is current without provider confirmation.
      currentStatus: pick(item, ['status', 'current_status']) || 'unknown',
      fullText: text ? String(text) : null,
      excerpt: text ? `${String(text).slice(0, 240)}${String(text).length > 240 ? '…' : ''}` : null,
      rawProviderMetadata: item,
    };
  }

  /**
   * "Search All" (GET /api/search?q=) — queried once per call rather than
   * fanning out to every per-corpus search endpoint, to keep this simple
   * and match the endpoint's own "search everything" purpose.
   */
  async search(query, _filters = {}) {
    const params = new URLSearchParams({ q: query });
    const data = await this._get(`/api/search?${params.toString()}`);
    if (!data) return [];
    const items = Array.isArray(data) ? data : data.results || data.items || data.data || [];
    return items.map((item) => this._normalize(item));
  }

  _corpusFromAct(act) {
    const a = (act || '').toLowerCase();
    if (a.includes('constitution')) return 'constitution';
    if (a.includes('bharatiya nyaya sanhita') || a.includes('bns')) return 'bns';
    if (a.includes('indian penal code') || a.includes('ipc')) return 'ipc';
    return null;
  }

  async _fetchByCorpus(corpus, identifier) {
    switch (corpus) {
      case 'constitution':
        return this._get(`/api/constitution/article/${encodeURIComponent(identifier)}`);
      case 'ipc':
        return this._get(`/api/ipc/section/${encodeURIComponent(identifier)}`);
      case 'bns':
        return this._get(`/api/bns/section/${encodeURIComponent(identifier)}`);
      default:
        return null;
    }
  }

  // providerSourceId is our own scheme: "<corpus>:<number>" for
  // constitution/ipc/bns, or "kerala:<act_id>:<section>" for Kerala Acts —
  // InsightLaw has no single cross-corpus document id, so getSource/
  // getSection reconstruct the right endpoint from it.
  async getSource(providerSourceId) {
    const parts = String(providerSourceId).split(':');
    const corpus = parts[0];
    if (corpus === 'kerala' && parts.length === 3) {
      const [, actId, section] = parts;
      const data = await this._get(`/api/kerala/${encodeURIComponent(actId)}/section/${encodeURIComponent(section)}`);
      return data ? this._normalize(data, 'kerala') : null;
    }
    const identifier = parts.slice(1).join(':');
    const data = await this._fetchByCorpus(corpus, identifier);
    return data ? this._normalize(data, corpus) : null;
  }

  async getSection(act, section) {
    const corpus = this._corpusFromAct(act);
    if (!corpus) return null;
    const data = await this._fetchByCorpus(corpus, section);
    return data ? this._normalize(data, corpus) : null;
  }

  // InsightLaw has no case-law corpus.
  async getJudgment(_providerSourceId) {
    return null;
  }

  async getMetadata(_providerSourceId) {
    return null;
  }
}
