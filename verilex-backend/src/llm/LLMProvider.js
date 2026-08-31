/**
 * Base class for the explanation/interpretation LLM layer. Implementations
 * must never invent section numbers, act names, cases, courts, tests,
 * penalties, amendments, dates, exceptions or definitions — they explain
 * ONLY the retrieved source material handed to them as grounding context.
 */
export class LLMProvider {
  /** @type {string} */
  name = 'base';

  /**
   * Extract a structured scenario representation from a raw user description.
   * Must not assert that an extracted concept is legally applicable — it is
   * a retrieval aid, not a legal conclusion.
   * @param {string} _rawQuery
   * @returns {Promise<{matter:string, entities:string[], events:string[], dispute:string, concepts:string[]}>}
   */
  async extractScenario(_rawQuery) {
    throw new Error(`${this.name} LLM provider does not implement extractScenario()`);
  }

  /**
   * Produce a grounded explanation of how a selected legal source relates
   * to the user's scenario. `groundingText` is the ONLY legal material the
   * model may treat as authoritative; it must not supplement from general
   * knowledge. If groundingText is insufficient, the model must say so
   * rather than filling gaps.
   * @param {{scenarioText: string, structuredScenario: Object|null, source: Object, groundingText: string, relatedJudgments: Object[]}} _input
   * @returns {Promise<{whatItSays:string, whatRelates:string, strongRelationship:string, uncertain:string, exceptions:string, whatThisDoesNotEstablish:string}>}
   */
  async explainRelevance(_input) {
    throw new Error(`${this.name} LLM provider does not implement explainRelevance()`);
  }
}
