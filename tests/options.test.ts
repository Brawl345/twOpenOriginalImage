import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  DEFAULT_OPTIONS,
  loadOptions,
  onOptionsChanged,
  parseBool,
  resetOptions,
  saveOptions,
} from '../lib/options';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('parseBool', () => {
  it.each([
    ['1', true],
    [1, true],
    [true, true],
    ['true', true],
    ['0', false],
    [0, false],
    [false, false],
    ['false', false],
    [undefined, null],
    ['', null],
    ['yes', null],
  ])('%j → %j', (value, expected) => {
    expect(parseBool(value)).toBe(expected);
  });
});

describe('storage', () => {
  it('uses defaults for missing and invalid values', async () => {
    await browser.storage.local.set({ SWAP_IMAGE_URL: 'nope' });
    expect(await loadOptions()).toEqual(DEFAULT_OPTIONS);
  });

  it('reads legacy string values', async () => {
    await browser.storage.local.set({
      OPERATION: '0',
      SWAP_IMAGE_URL: '1',
      DISPLAY_ALL_IN_ONE_PAGE: false,
    });
    expect(await loadOptions()).toMatchObject({
      OPERATION: false,
      SWAP_IMAGE_URL: true,
      DISPLAY_ALL_IN_ONE_PAGE: false,
      SHOW_IN_TIMELINE: true,
    });
  });

  it('writes booleans and only known keys', async () => {
    await saveOptions({ SWAP_IMAGE_URL: true, OPERATION: false });
    expect(await browser.storage.local.get(null)).toEqual({
      SWAP_IMAGE_URL: true,
      OPERATION: false,
    });
  });

  it('resets to defaults', async () => {
    await browser.storage.local.set({ OPERATION: '0', OTHER: 1 });
    await resetOptions();
    expect(await browser.storage.local.get(null)).toEqual({ OTHER: 1 });
  });

  it('notifies about option changes only', async () => {
    const listener = vi.fn();
    const stop = onOptionsChanged(listener);
    await browser.storage.local.set({ CONTENT_TAB_INFOS: {} });
    await saveOptions({ SWAP_IMAGE_URL: true });
    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    expect(listener.mock.calls[0]?.[0]).toMatchObject({ SWAP_IMAGE_URL: true });
    stop();
    await saveOptions({ SWAP_IMAGE_URL: false });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
