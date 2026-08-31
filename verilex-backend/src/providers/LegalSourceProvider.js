/**
 * Common normalised representation of a legal source, regardless of which
 * external provider supplied it. Every field the rest of the app touches
 * must go through this shape — provider-specific response structures must
 * never leak past the provider layer.
 *
 * @typedef {Object} NormalizedLegalSource
 * @property {string} provider              e.g. "mock", "indian_kanoon"
 * @property {string} providerSourceId      provider's own identifier for this document
 * @property {string} title
 * @property {'act'|'section'|'rule'|'regulation'|'judgment'|'order'|'other'} sourceType
 * @property {string|null} url              link back to the original, authoritative source
 * @property {string|null} act
 * @property {string|null} section
 * @property {string|null} court
 * @property {string|null} jurisdiction     human-readable jurisdiction label
 * @property {'central'|'state'|'unknown'} jurisdictionLevel
 * @property {string|null} state
 * @property {string|null} date             ISO date (decision/enactment date)
 * @property {string|null} effectiveDate
 * @property {string|null} repealDate
 * @property {'current'|'repealed'|'amended'|'unknown'} currentStatus
 * @property {string|null} fullText         full available source text
 * @property {string|null} excerpt          short source-derived excerpt for result lists
 * @property {Object} rawProviderMetadata   untouched provider payload, retained for provenance
 */

/**
 * Base class every legal source provider must implement. Search results
 * and documents returned by concrete providers MUST be normalised to
 * {@link NormalizedLegalSource} before leaving the provider.
 */
export class LegalSourceProvider {
  /** @type {string} */
  name = 'base';

  /**
   * @param {string} _query
   * @param {{state?: string, jurisdictionLevel?: string, sourceType?: string, dateFrom?: string, dateTo?: string, court?: string, act?: string}} [_filters]
   * @returns {Promise<NormalizedLegalSource[]>}
   */
  async search(_query, _filters = {}) {
    throw new Error(`${this.name} provider does not implement search()`);
  }

  /**
   * @param {string} _providerSourceId
   * @returns {Promise<NormalizedLegalSource|null>}
   */
  async getSource(_providerSourceId) {
    throw new Error(`${this.name} provider does not implement getSource()`);
  }

  /**
   * @param {string} _act
   * @param {string} _section
   * @returns {Promise<NormalizedLegalSource|null>}
   */
  async getSection(_act, _section) {
    throw new Error(`${this.name} provider does not implement getSection()`);
  }

  /**
   * @param {string} _providerSourceId
   * @returns {Promise<NormalizedLegalSource|null>}
   */
  async getJudgment(_providerSourceId) {
    throw new Error(`${this.name} provider does not implement getJudgment()`);
  }

  /**
   * @param {string} _providerSourceId
   * @returns {Promise<Object|null>} raw provider metadata only, not a normalised source
   */
  async getMetadata(_providerSourceId) {
    throw new Error(`${this.name} provider does not implement getMetadata()`);
  }
}
