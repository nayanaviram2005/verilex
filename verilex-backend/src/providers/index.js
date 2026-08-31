import { config } from '../config.js';
import { MockProvider } from './MockProvider.js';
import { IndianKanoonProvider } from './IndianKanoonProvider.js';

const registry = new Map();

function build(name) {
  switch (name) {
    case 'mock':
      return new MockProvider();
    case 'indian_kanoon':
      return new IndianKanoonProvider(config.indianKanoon);
    default:
      throw new Error(`Unknown legal source provider: ${name}`);
  }
}

/**
 * Returns the active LegalSourceProvider instance (singleton per process),
 * selected via LEGAL_PROVIDER. The rest of the app should only ever talk to
 * providers through this function and the common NormalizedLegalSource shape.
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
