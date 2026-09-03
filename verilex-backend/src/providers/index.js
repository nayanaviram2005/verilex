import { config } from '../config.js';
import { MockProvider } from './MockProvider.js';
import { IndianKanoonProvider } from './IndianKanoonProvider.js';
import { InsightLawProvider } from './InsightLawProvider.js';

const registry = new Map();

function build(name) {
  switch (name) {
    case 'mock':
      return new MockProvider();
    case 'indian_kanoon':
      return new IndianKanoonProvider(config.indianKanoon);
    case 'insightlaw':
      return new InsightLawProvider(config.insightLaw);
    default:
      throw new Error(`Unknown legal source provider: ${name}`);
  }
}

/**
 * Returns the primary LegalSourceProvider instance (singleton per process),
 * selected via LEGAL_PROVIDER.
 */
export function getActiveProvider() {
  const name = config.legalProvider;
  if (!registry.has(name)) {
    registry.set(name, build(name));
  }
  return registry.get(name);
}

export function getProviderByName(name) {
  if (!registry.has(name)) {
    registry.set(name, build(name));
  }
  return registry.get(name);
}

/**
 * Returns every provider that should be queried for a given search: the
 * configured primary provider (LEGAL_PROVIDER) plus InsightLaw, unless
 * INSIGHTLAW_ENABLED=false or the primary provider already *is* InsightLaw.
 * The rest of the app should use this (not getActiveProvider) for search
 * fan-out, so results always carry both providers' distinct provenance.
 */
export function getActiveProviders() {
  const providers = [getActiveProvider()];
  if (config.insightLaw.enabled && !providers.some((p) => p.name === 'insightlaw')) {
    providers.push(getProviderByName('insightlaw'));
  }
  return providers;
}
