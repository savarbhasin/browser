import type { CheckResult } from './types';

// API Base URL - inline to avoid import issues
const API_BASE = "http://localhost:8000";

// Track checked URLs to avoid duplicate notifications
const checkedUrls = new Set<string>();

async function checkUrl(url: string): Promise<CheckResult | null> {
  try {
    // Skip non-http(s) URLs
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return null;
    }

    // Skip chrome://, chrome-extension://, etc.
    if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || 
        url.startsWith("edge://") || url.startsWith("moz-extension://")) {
      return null;
    }

    const response = await fetch(`${API_BASE}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.error(`Failed to check URL: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error checking URL:", error);
    return null;
  }
}

async function showNotification(url: string, result: CheckResult) {
  const isUnsafe = !result.safe || result.final_verdict === "unsafe" || result.final_verdict === "suspicious";
  const title = isUnsafe ? "⚠️ Phishing Detected" : "✅ Safe Website";
  const message = isUnsafe 
    ? `Warning: ${url} appears to be ${result.final_verdict}! (${result.confidence} confidence)`
    : `${url} appears to be safe.`;

  chrome.notifications.create({
    type: "basic",
    iconUrl: isUnsafe ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
    title,
    message,
  });
}

// Helper function to send message with retry
async function sendMessageToTab(tabId: number, message: any, retries = 3, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      return true; // Success
    } catch (error) {
      if (i < retries - 1) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.log("Could not send message to content script after retries:", error);
        return false;
      }
    }
  }
  return false;
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only check when page is fully loaded
  if (changeInfo.status !== "complete" || !tab.url) {
    return;
  }

  const url = tab.url;
  
  // Skip if we've already checked this URL
  if (checkedUrls.has(url)) {
    return;
  }

  // Check the URL
  const result = await checkUrl(url);
  if (result) {
    checkedUrls.add(url);
    
    // Show notification for unsafe/suspicious sites
    if (!result.safe || result.final_verdict === "unsafe" || result.final_verdict === "suspicious") {
      await showNotification(url, result);
      
      // Send message to content script to show full-page warning (with retry)
      await sendMessageToTab(tabId, {
        type: "SHOW_WARNING",
        result: result
      });
    }
    
    // Store result for content script
    chrome.storage.local.set({ [`url_${url}`]: result });
  }
});

// Listen for tab activation to check current URL
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && !checkedUrls.has(tab.url)) {
      const result = await checkUrl(tab.url);
      if (result) {
        checkedUrls.add(tab.url);
        if (!result.safe || result.final_verdict === "unsafe" || result.final_verdict === "suspicious") {
          await showNotification(tab.url, result);
          
          // Send message to content script to show full-page warning (with retry)
          await sendMessageToTab(activeInfo.tabId, {
            type: "SHOW_WARNING",
            result: result
          });
        }
        chrome.storage.local.set({ [`url_${tab.url}`]: result });
      }
    }
  } catch (error) {
    console.error("Error checking active tab:", error);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("URL Phishing Detector installed");
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BATCH_CHECK_URLS') {
    // Perform batch check and send response
    batchCheckUrls(message.urls)
      .then(results => {
        sendResponse(results);
      })
      .catch(error => {
        console.error("Batch check failed:", error);
        sendResponse({ results: [], error: error.message });
      });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

async function batchCheckUrls(urls: string[]): Promise<{ results: CheckResult[]; total_checked: number; safe_count: number; unsafe_count: number }> {
  try {
    const response = await fetch(`${API_BASE}/api/check/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error batch checking URLs:", error);
    return { results: [], total_checked: 0, safe_count: 0, unsafe_count: 0 };
  }
}
