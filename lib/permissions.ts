import { browser } from 'wxt/browser';

const origins = () => browser.runtime.getManifest().host_permissions ?? [];

export function hasHostAccess(): Promise<boolean> {
  return browser.permissions.contains({ origins: origins() });
}

export function requestHostAccess(): Promise<boolean> {
  return browser.permissions.request({ origins: origins() });
}
