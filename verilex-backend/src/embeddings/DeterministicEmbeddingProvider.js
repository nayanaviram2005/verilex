import crypto from 'node:crypto';
import { EmbeddingProvider } from './EmbeddingProvider.js';

/**
 * Deterministic, non-AI fallback embedding provider used only when no real
 * embedding API key is configured. It hashes tokens into a fixed-size
 * bag-of-words vector — this is NOT a semantically meaningful embedding
 * model, only a stand-in that keeps the pgvector pipeline (storage,
 * indexing, cosine ranking) runnable end-to-end without external
 * credentials. Swap in a real EmbeddingProvider for anything beyond local
 * development/demo.
 */
export class DeterministicEmbeddingProvider extends EmbeddingProvider {
  name = 'deterministic-dev-fallback';
  model = 'deterministic-hashing-v1';

  constructor({ dims = 256 } = {}) {
    super();
    this.dims = dims;
  }

  async embed(text) {
    const vector = new Array(this.dims).fill(0);
    const tokens = (text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
    for (const token of tokens) {
      const hash = crypto.createHash('sha256').update(token).digest();
      const idx = hash.readUInt32BE(0) % this.dims;
      const sign = hash[4] % 2 === 0 ? 1 : -1;
      vector[idx] += sign;
    }
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
  }
}
