import type { CheckResult, User } from '../types';

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

  // User management
  static async getUser(): Promise<User | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['user'], (items) => {
        resolve(items.user || null);
      });
    });
  }

  static async setUser(user: User): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ user }, () => resolve());
    });
  }

  static async removeUser(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['user'], () => resolve());
    });
  }

  // Auth token management
  static async getAuthToken(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken'], (items) => {
        resolve(items.authToken || null);
      });
    });
  }

  static async setAuthToken(token: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ authToken: token }, () => resolve());
    });
  }

  static async removeAuthToken(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['authToken'], () => resolve());
    });
  }
}

