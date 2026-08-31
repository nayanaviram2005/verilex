import { LegalSourceProvider } from './LegalSourceProvider.js';

/**
 * Real provider integration for the Indian Kanoon API (https://api.indiankanoon.org/).
 * Requires INDIAN_KANOON_API_TOKEN. Indian Kanoon primarily indexes court
 * judgments/orders and some Central Acts; results are normalised into the
 * common NormalizedLegalSource shape so the rest of the app is provider-agnostic.
 *
 * API reference (per Indian Kanoon's published docs):
 *   POST {base}/search/?formInput=<query>&pagenum=<n>
 *   GET  {base}/doc/<docid>/
 *   GET  {base}/docmeta/<docid>/
 *   GET  {base}/docfragment/<docid>/?formInput=<query>
 * Auth header: Authorization: Token <token>
 */
export class IndianKanoonProvider extends LegalSourceProvider {
  name = 'indian_kanoon';

  constructor({ apiToken, baseUrl }) {
    super();
    if (!apiToken) {
      throw new Error('IndianKanoonProvider requires INDIAN_KANOON_API_TOKEN to be set');
    }
    this.apiToken = apiToken;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async _request(path, { method = 'GET' } = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Token ${this.apiToken}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Indian Kanoon API error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  _guessSourceType(doc) {
    const src = (doc.docsource || '').toLowerCase();
    if (src.includes('act') || src.includes('code') || src.includes('sanhita')) return 'act';
    return 'judgment';
  }

  _guessJurisdiction(doc) {
    const src = doc.docsource || '';
    if (/supreme court/i.test(src)) return { level: 'central', label: 'India (Supreme Court)', state: null };
    const match = src.match(/([A-Za-z ]+) High Court/i);
    if (match) return { level: 'state', label: `${match[1].trim()}`, state: match[1].trim() };
    return { level: 'unknown', label: null, state: null };
  }

  _normalizeSearchHit(doc) {
    const jurisdiction = this._guessJurisdiction(doc);
    return {
      provider: this.name,
      providerSourceId: String(doc.tid),
      title: doc.title || 'Untitled document',
      sourceType: this._guessSourceType(doc),
      url: `https://indiankanoon.org/doc/${doc.tid}/`,
      act: doc.docsource && this._guessSourceType(doc) === 'act' ? doc.docsource : null,
      section: null,
      court: doc.docsource || null,
      jurisdiction: jurisdiction.label,
      jurisdictionLevel: jurisdiction.level,
      state: jurisdiction.state,
      date: doc.publishdate || null,
      effectiveDate: null,
      repealDate: null,
      currentStatus: 'unknown',
      fullText: null,
      excerpt: doc.headline ? doc.headline.replace(/<\/?b>/g, '') : null,
      rawProviderMetadata: doc,
    };
  }

  _normalizeDoc(doc) {
    const jurisdiction = this._guessJurisdiction(doc);
    return {
      provider: this.name,
      providerSourceId: String(doc.tid),
      title: doc.title || 'Untitled document',
      sourceType: this._guessSourceType(doc),
      url: `https://indiankanoon.org/doc/${doc.tid}/`,
      act: doc.docsource && this._guessSourceType(doc) === 'act' ? doc.docsource : null,
      section: null,
      court: doc.docsource || null,
      jurisdiction: jurisdiction.label,
      jurisdictionLevel: jurisdiction.level,
      state: jurisdiction.state,
      date: doc.publishdate || null,
      effectiveDate: null,
      repealDate: null,
      currentStatus: 'unknown',
      fullText: doc.doc ? doc.doc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null,
      excerpt: null,
      rawProviderMetadata: doc,
    };
  }

  async search(query, filters = {}) {
    const params = new URLSearchParams({ formInput: query, pagenum: '0' });
    if (filters.court) params.set('formInput', `${query} doctypes:${filters.court}`);
    const data = await this._request(`/search/?${params.toString()}`, { method: 'POST' });
    const docs = data?.docs || [];
    return docs.map((doc) => this._normalizeSearchHit(doc));
  }

  async getSource(providerSourceId) {
    const doc = await this._request(`/doc/${providerSourceId}/`);
    return doc ? this._normalizeDoc(doc) : null;
  }

  async getSection(_act, _section) {
    // Indian Kanoon does not expose a dedicated act/section lookup endpoint;
    // callers should use search() with a formatted query instead.
    return null;
  }

  async getJudgment(providerSourceId) {
    return this.getSource(providerSourceId);
  }

  async getMetadata(providerSourceId) {
    return this._request(`/docmeta/${providerSourceId}/`);
  }
}
