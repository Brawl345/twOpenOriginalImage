import { browser } from 'wxt/browser';

// WXT types the key as a union of known message names, which rules out dynamic keys.
const getMessage = browser.i18n.getMessage as (
  key: string,
  substitutions?: string | string[],
) => string;

export function t(key: string, substitutions?: string | string[]): string {
  return getMessage(key, substitutions) || key;
}
