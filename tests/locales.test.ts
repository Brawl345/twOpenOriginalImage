import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const localesDir = join(root, 'public/_locales');

const keysOf = (locale: string) =>
  Object.keys(
    JSON.parse(readFileSync(join(localesDir, locale, 'messages.json'), 'utf8')),
  ).sort();

const sources = (dir: string): string[] =>
  readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.(ts|vue)$/.test(file))
    .map((file) => readFileSync(join(root, dir, file), 'utf8'));

const code = [
  ...sources('entrypoints'),
  ...sources('components'),
  ...sources('lib'),
  readFileSync(join(root, 'wxt.config.ts'), 'utf8'),
].join('\n');

const isUsed = (key: string) =>
  [`'${key}'`, `"${key}"`, `__MSG_${key}__`].some((form) =>
    code.includes(form),
  );

describe('locales', () => {
  const english = keysOf('en');

  it.each(
    readdirSync(localesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== 'en')
      .map((entry) => entry.name),
  )('%s has the same keys as en', (locale) => {
    expect(keysOf(locale)).toEqual(english);
  });

  it('has no unused keys', () => {
    expect(english.filter((key) => !isUsed(key))).toEqual([]);
  });
});
