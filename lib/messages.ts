import { browser } from 'wxt/browser';

export type Message =
  | { type: 'fetchTweet'; id: string }
  | { type: 'openTabs'; urls: string[]; active: boolean }
  | { type: 'download'; url: string; filename: string | null };

export function sendMessage(message: Message): Promise<unknown> {
  return browser.runtime.sendMessage(message);
}
