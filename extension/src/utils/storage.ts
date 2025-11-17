import type { CheckResult } from '../types';

export class StorageManager {
  // Cache management
  static async getCachedResult(url: string): Promise<CheckResult | null> {
    return new Promise((resolve) => {
      const cacheKey = `url_${url}`;
      chrome.storage.local.get([cacheKey], (items) => {
        resolve(items[cacheKey] || null);
      });
    });
  }

  static async setCachedResult(url: string, result: CheckResult): Promise<void> {
    return new Promise((resolve) => {
      const cacheKey = `url_${url}`;
      chrome.storage.local.set({ [cacheKey]: result }, () => resolve());
    });
  }

  static async clearUrlCache(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        // Get all keys that start with 'url_'
        const urlKeys = Object.keys(items).filter(key => key.startsWith('url_'));
        
        if (urlKeys.length > 0) {
          chrome.storage.local.remove(urlKeys, () => resolve());
        } else {
          resolve();
        }
      });
    });
  }
}

