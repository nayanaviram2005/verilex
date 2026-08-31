/**
 * Base class for embedding providers used to build the pgvector semantic
 * index. Implementations must report their own model identifier and
 * dimensionality so embeddings stay attributable to the model/version
 * that produced them, and can be regenerated if the model changes.
 */
export class EmbeddingProvider {
  /** @type {string} */
  name = 'base';
  /** @type {string} */
  model = 'unknown';
  /** @type {number} */
  dims = 0;

  /**
   * @param {string} _text
   * @returns {Promise<number[]>}
   */
  async embed(_text) {
    throw new Error(`${this.name} embedding provider does not implement embed()`);
  }

  /**
   * @param {string[]} texts
   * @returns {Promise<number[][]>}
   */
  async embedBatch(texts) {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}
