import type { Adapter } from './common';
import { rweb } from './rweb';
import { xweb } from './xweb';

export * from './common';

export function detectAdapter(doc: Document): Adapter {
  return doc.getElementById('react-root') ? rweb : xweb;
}
