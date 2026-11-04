import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS } from '../lib/defaults';

const EXTENSION_ONLY = new Set(['TAB_SORTING']);

const userscriptDefaults = (() => {
  const source = readFileSync(
    resolve(import.meta.dirname, '../public/js/twOpenOriginalImage.user.js'),
    'utf8',
  );
  const block = source.match(/var OPTIONS = \{([\s\S]*?)\n\};/)?.[1] ?? '';
  return Object.fromEntries(
    [...block.matchAll(/^[,\s]*(\w+)\s*:\s*(true|false)\b/gm)].map(
      ([, key, value]) => [key, value === 'true'],
    ),
  );
})();

describe('DEFAULT_OPTIONS', () => {
  it.each(
    Object.entries(DEFAULT_OPTIONS).filter(([key]) => !EXTENSION_ONLY.has(key)),
  )('%s matches the userscript default', (key, value) => {
    expect(userscriptDefaults[key]).toBe(value);
  });
});
