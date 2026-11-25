import { browser } from 'wxt/browser';

export const DEFAULT_OPTIONS = {
  OPERATION: true,
  SHOW_IN_TIMELINE: true,
  SHOW_IN_DETAIL_PAGE: true,
  SHOW_IN_MEDIA_PAGE: true,
  SHOW_IN_SEARCH_MEDIA: true,
  DISPLAY_ORIGINAL_BUTTONS: true,
  OVERRIDE_CLICK_EVENT: true,
  DISPLAY_ALL_IN_ONE_PAGE: true,
  SWAP_IMAGE_URL: false,
  HIDE_DOWNLOAD_BUTTON_AUTOMATICALLY: true,
  SUPPRESS_FILENAME_SUFFIX: false,
  SAME_FILENAME_AS_IN_ZIP: true,
};

export type Options = { [K in keyof typeof DEFAULT_OPTIONS]: boolean };
export type OptionKey = keyof Options;

const OPTION_KEYS = Object.keys(DEFAULT_OPTIONS) as OptionKey[];

export function parseBool(value: unknown): boolean | null {
  if (value === '0' || value === 0 || value === false || value === 'false') {
    return false;
  }
  if (value === '1' || value === 1 || value === true || value === 'true') {
    return true;
  }
  return null;
}

function parseOptions(stored: Record<string, unknown>): Options {
  const options = { ...DEFAULT_OPTIONS };
  for (const key of OPTION_KEYS) {
    options[key] = parseBool(stored[key]) ?? DEFAULT_OPTIONS[key];
  }
  return options;
}

export async function loadOptions(): Promise<Options> {
  return parseOptions(await browser.storage.local.get(OPTION_KEYS));
}

export async function saveOptions(options: Partial<Options>): Promise<void> {
  const values: Partial<Options> = {};
  for (const key of OPTION_KEYS) {
    const value = options[key];
    if (typeof value === 'boolean') {
      values[key] = value;
    }
  }
  await browser.storage.local.set(values);
}

export async function resetOptions(): Promise<void> {
  await browser.storage.local.remove(OPTION_KEYS);
}

export function onOptionsChanged(
  listener: (options: Options) => void,
): () => void {
  const handler = (changes: Record<string, unknown>, area: string) => {
    if (area !== 'local' || !OPTION_KEYS.some((key) => key in changes)) {
      return;
    }
    loadOptions().then(listener, console.error);
  };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
