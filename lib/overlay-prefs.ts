import { browser } from 'wxt/browser';

export const SIZE_ORDER = [
  'fit-width',
  'full',
  'fit-height',
  'fit-window',
] as const;

export type OverlaySize = (typeof SIZE_ORDER)[number];
export type OverlayBackground = 'black' | 'white';

export interface OverlayPrefs {
  size: OverlaySize;
  background: OverlayBackground;
}

const SIZE_KEY = 'OVERLAY_IMAGE_SIZE';
const BACKGROUND_KEY = 'OVERLAY_BACKGROUND';

function parseOverlayPrefs(stored: Record<string, unknown>): OverlayPrefs {
  const size = stored[SIZE_KEY];
  return {
    size: SIZE_ORDER.includes(size as OverlaySize)
      ? (size as OverlaySize)
      : 'fit-window',
    background: stored[BACKGROUND_KEY] === 'white' ? 'white' : 'black',
  };
}

export async function loadOverlayPrefs(): Promise<OverlayPrefs> {
  return parseOverlayPrefs(
    await browser.storage.local.get([SIZE_KEY, BACKGROUND_KEY]),
  );
}

export async function saveOverlayPrefs(prefs: OverlayPrefs): Promise<void> {
  await browser.storage.local.set({
    [SIZE_KEY]: prefs.size,
    [BACKGROUND_KEY]: prefs.background,
  });
}
