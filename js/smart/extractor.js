// One entry point for reading photos. Screens call extract(); which engine runs
// is chosen in config.js, so the provider can be swapped without touching the UI.
// Every provider's result is cleaned by normaliseExtraction() before use.

import { activeProvider } from './config.js';
import { normaliseExtraction } from './schema.js';
import * as mock from './providers/mock.js';
import * as cloud from './providers/cloud.js';

const PROVIDERS = { mock, cloud };

function provider() {
  const p = PROVIDERS[activeProvider()];
  if (!p) throw new Error(`Unknown photo reader "${activeProvider()}".`);
  return p;
}

export const providerInfo = () => provider().info;

/**
 * @param opts { receipt, odometer (prepared photos or null), vehicle, lastEntry, onProgress(stepId), signal }
 * @returns cleaned extraction (see schema.js)
 */
export async function extract(opts) {
  const sources = { receiptProvided: !!opts.receipt, odometerProvided: !!opts.odometer };
  const raw = await provider().extract(opts);
  return normaliseExtraction(raw, sources);
}
