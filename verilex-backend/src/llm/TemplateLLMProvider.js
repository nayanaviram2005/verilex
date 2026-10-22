import { LLMProvider } from './LLMProvider.js';

// Plain substring matching (lower.includes(k)) is not safe for short
// keywords: "rent" (meant for tenancy) matches inside "curRENT" and
// "diffeRENT", "job" could match inside a longer unrelated word, etc. —
// this silently injects a wrong concept into the search query for almost
// any unrelated scenario, which then pollutes ranking for every provider.
// Matching on a word boundary instead means a keyword only counts when it
// actually appears as its own word (or phrase).
function containsKeyword(haystackLower, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(haystackLower);
}

const CONCEPT_KEYWORDS = {
  // "paid"/"payment" alone are far too generic (paid taxes, paid rent,
  // paid a fine) — kept to words/phrases specific to a wage dispute.
  'unpaid wages': ['salary', 'wage', 'wages', 'unpaid salary', 'havent been paid', "haven't been paid", 'hasnt paid me', "hasn't paid me", 'not paid me'],
  termination: ['terminated', 'fired', 'dismissed', 'not come back', 'let go', 'sacked'],
  'security deposit': ['deposit'],
  tenancy: ['landlord', 'tenant', 'rent', 'lease', 'moved out', 'vacated'],
  'property damage': ['damage', 'damaged'],
  cheating: ['tricked', 'deceived', 'fraud', 'cheated', 'scam', 'scammed'],
  'dishonest inducement': ['tricked', 'induced', 'convinced me to'],
  'money transfer fraud': ['transferred money', 'sent money', 'bank transfer', 'upi'],
  impersonation: ['pretending to be', 'pretended to be', 'claiming to be from', 'posing as', 'impersonating', 'impersonated'],
  // Single generic words like "online", "website", "app", "call" fire on
  // almost any scenario that merely happened to occur online or involve a
  // phone call (e.g. a consumer buying a washing machine "online" and
  // customer support "calls" going nowhere is not online fraud) — kept to
  // phrases and words specific enough to actually signal fraud.
  'online fraud': ['phishing', 'fake website', 'otp fraud', 'online scam', 'fraudulent website', 'fake customer care'],
  // Matched as whole words, so inflections need listing explicitly —
  // "threatening" is not matched by a "threat"/"threatened" entry alone.
  intimidation: ['threatened', 'threatening', 'threatens', 'threat', 'threats', 'intimidated', 'intimidating'],
  // "refusing to"/"refused to" alone are far too generic — a custody
  // dispute, an insurance exchange, or a hospital declining liability
  // all involve someone "refusing to" do something, none of them a
  // consumer-service deficiency. Anchored to refusing a specific
  // product/service remedy instead.
  'service deficiency': [
    'denied service', 'defective product', 'refused to repair', 'refusing to repair', 'refuses to repair',
    'refused to replace', 'refusing to replace', 'refuses to replace', 'refused to refund', 'refusing to refund',
    'refuses to refund', 'wont repair', "won't repair", 'wont replace', "won't replace", 'wont refund', "won't refund",
  ],
  // "work"/"office" alone are far too generic ("work visa", "work of
  // art", "office supplies") — kept to words that actually imply an
  // employer/employee relationship.
  employment: ['employer', 'employee', 'workplace', 'coworker', 'colleague', 'my boss', 'my job'],
  'sexual offence': ['sexual assault', 'molested', 'harassed', 'harassment', 'outraging her modesty'],
  'false accusation': ['falsely accused', 'false allegation', 'false complaint', 'wrongly accused'],
  defamation: ['defamed', 'defamatory', 'reputation'],
};

/**
 * Deterministic, non-generative fallback used when no LLM API key is
 * configured (LLM_PROVIDER=template, or automatic fallback in dev).
 * It performs extractive summarisation only — it never generates novel
 * legal claims — so it is safe to run without any external AI credentials.
 * This keeps the full pipeline runnable end-to-end out of the box, per the
 * project's "must run locally from a clean install" requirement.
 */
export class TemplateLLMProvider extends LLMProvider {
  name = 'template';

  async extractScenario(rawQuery) {
    const lower = rawQuery.toLowerCase();
    const concepts = Object.entries(CONCEPT_KEYWORDS)
      .filter(([, keywords]) => keywords.some((k) => containsKeyword(lower, k)))
      .map(([concept]) => concept);

    const events = rawQuery
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);

    const entities = [];
    if (/landlord/i.test(rawQuery)) entities.push('Landlord');
    if (/tenant/i.test(rawQuery)) entities.push('Tenant');
    if (/employer/i.test(rawQuery)) entities.push('Employer');
    if (/employee|\bI\b was employed/i.test(rawQuery)) entities.push('Employee');

    return {
      matter: concepts[0] || 'General',
      entities,
      events,
      dispute: events[events.length - 1] || rawQuery.slice(0, 200),
      concepts: concepts.length ? concepts : ['general legal issue'],
    };
  }

  async explainRelevance({ scenarioText, source, groundingText, relatedJudgments }) {
    const text = groundingText || '';
    const excerpt = text.slice(0, 500).trim();

    const provisos = (text.match(/(Provided[^.]*\.|Explanation[^.]*\.|Note:[^.]*\.)/gi) || []).slice(0, 3);

    const scenarioLower = scenarioText.toLowerCase();
    const matchedTerms = [];
    for (const [concept, keywords] of Object.entries(CONCEPT_KEYWORDS)) {
      if (text.toLowerCase().includes(concept) && keywords.some((k) => containsKeyword(scenarioLower, k))) {
        matchedTerms.push(concept);
      }
    }

    const supportingCasesLine = (relatedJudgments || [])
      .map((j) => `${j.title} (${j.court || 'court unknown'})`)
      .join('; ');

    return {
      whatItSays: excerpt
        ? `In plain terms, this source states: "${excerpt}${text.length > 500 ? '…' : ''}" (extracted directly from the retrieved source text; no AI-generated legal interpretation has been added beyond formatting).`
        : 'The retrieved source did not include enough text to summarise. Only its metadata is available.',
      whatRelates: matchedTerms.length
        ? `Your description mentions terms associated with: ${matchedTerms.join(', ')}. These are surface-level term overlaps between your description and this source's text, not a determination of legal applicability.`
        : 'No direct keyword overlap was found between your description and this source\'s text using automated matching. Review the source text manually to judge relevance.',
      strongRelationship: matchedTerms.length
        ? `The clearest overlaps are around: ${matchedTerms.join(', ')}.`
        : 'No strong overlap was automatically identified.',
      uncertain:
        'This automated (non-AI-generated) explanation cannot judge whether all legal conditions of this provision are satisfied by your situation, whether facts are complete, or whether other provisions are more applicable. A qualified professional review is required for anything beyond general orientation.',
      exceptions: provisos.length
        ? provisos.join(' ')
        : 'No explicit provisos, exceptions or notes were detected in the retrieved source text.',
      whatThisDoesNotEstablish:
        'This does not establish that this provision legally applies to your situation, nor any outcome. It only identifies textual and conceptual overlap between your description and the retrieved source.' +
        (supportingCasesLine ? ` Related retrieved material: ${supportingCasesLine}.` : ''),
    };
  }
}
