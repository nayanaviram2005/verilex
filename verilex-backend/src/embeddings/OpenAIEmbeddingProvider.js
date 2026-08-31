import { EmbeddingProvider } from './EmbeddingProvider.js';

export class OpenAIEmbeddingProvider extends EmbeddingProvider {
  name = 'openai';

  constructor({ apiKey, baseUrl, model, dims }) {
    super();
    if (!apiKey) throw new Error('OpenAIEmbeddingProvider requires OPENAI_API_KEY');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.dims = dims;
  }

  async embed(text) {
    const [vector] = await this.embedBatch([text]);
    return vector;
  }

  async embedBatch(texts) {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI embeddings API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.data.map((d) => d.embedding);
  }
}
