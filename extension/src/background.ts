import type { CheckResult } from './types';

// API Base URL - inline to avoid import issues
const API_BASE = "http://localhost:8000";

// Log service worker startup
console.log('[Background] ========================================');
console.log('[Background] Service Worker Starting...', new Date().toISOString());
console.log('[Background] ========================================');

// Track if we've initialized (for debugging)
let isInitialized = false;

// Helper to manage notified URLs in session storage (persists while browser is open)
async function hasNotified(url: string): Promise<boolean> {
  const data = await chrome.storage.session.get("notifiedUrls");
  const list = data.notifiedUrls || [];
  return list.includes(url);
}

async function addNotified(url: string) {
  const data = await chrome.storage.session.get("notifiedUrls");
  const list = data.notifiedUrls || [];
  if (!list.includes(url)) {
    list.push(url);
    await chrome.storage.session.set({ notifiedUrls: list });
  }
}

// Initialize function to set up all listeners
function initializeServiceWorker() {
  if (isInitialized) {
    console.log('[Background] Already initialized, skipping...');
    return;
  }
  
  console.log('[Background] Initializing service worker...');
  isInitialized = true;
  
  // Log when service worker becomes active
  console.log('[Background] Service worker is ACTIVE and ready to receive messages');
}

// Call initialization immediately
initializeServiceWorker();

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

// Helper function to send message with retry and injection
async function sendMessageToTab(tabId: number, message: any, retries = 10, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      // Try to ping the tab first to ensure it's ready
      try {
        await chrome.tabs.sendMessage(tabId, { type: "PING" });
      } catch (e) {
        // If ping fails, try to inject content script
        console.log(`[Background] Ping failed for tab ${tabId}, attempting to inject content script...`);
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"]
          });
          // Wait for script to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try ping again immediately
          await chrome.tabs.sendMessage(tabId, { type: "PING" });
        } catch (injectError) {
           console.log(`[Background] Failed to inject/ping content script (attempt ${i+1}/${retries}):`, injectError);
           // Don't throw here, let the outer loop retry
           throw new Error("Content script not ready after injection attempt");
        }
      }
      
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
  
  // Check the URL (always check, don't skip)
  console.log(`[Background] Checking URL: ${url}`);
  const result = await checkUrl(url);
  console.log(`[Background] Check result for ${url}:`, result);
  
  if (result) {
    // Store result for content script immediately so it's available if the script loads late
    await chrome.storage.local.set({ [`url_${url}`]: result });
    
    // Show notification for unsafe/suspicious sites (but only once per URL per session)
    if (!result.safe || result.final_verdict === "unsafe" || result.final_verdict === "suspicious") {
      console.log(`[Background] Unsafe/Suspicious URL detected: ${url}. Verdict: ${result.final_verdict}`);
      
      // Check storage instead of Set
      const alreadyNotified = await hasNotified(url);
      if (!alreadyNotified) {
        await showNotification(url, result);
        await addNotified(url);
      }
      
      // Send message to content script to show full-page warning (with retry)
      console.log(`[Background] Sending warning to tab ${tabId}`);
      const sent = await sendMessageToTab(tabId, {
        type: "SHOW_WARNING",
        result: result
      });
      console.log(`[Background] Warning sent to tab ${tabId}: ${sent}`);
    }
  }
});

// Listen for tab activation to check current URL
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      const result = await checkUrl(tab.url);
      if (result) {
        chrome.storage.local.set({ [`url_${tab.url}`]: result });
        
        if (!result.safe || result.final_verdict === "unsafe" || result.final_verdict === "suspicious") {
          // Check storage instead of Set
          const alreadyNotified = await hasNotified(tab.url);
          if (!alreadyNotified) {
            await showNotification(tab.url, result);
            await addNotified(tab.url);
          }
          
          // Send message to content script to show full-page warning (with retry)
          await sendMessageToTab(activeInfo.tabId, {
            type: "SHOW_WARNING",
            result: result
          });
        }
      }
    }
  } catch (error) {
    console.error("Error checking active tab:", error);
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  console.log("URL Phishing Detector installed");
  
  // Inject content script into all open tabs (to fix "orphan" tabs after reload)
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:") || tab.url.startsWith("moz-extension://") || tab.url.startsWith("chrome-extension://")) {
        continue;
      }
      
      try {
        // Check if we can inject
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
        console.log(`[Background] Injected content script into ${tab.url}`);
      } catch (err) {
        // It's expected to fail on some pages (restricted domains)
        console.log(`[Background] Skipped injection for ${tab.url}:`, err);
      }
    }
  } catch (e) {
    console.error("Failed to inject content scripts:", e);
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received:', message.type, 'from tab:', sender.tab?.id);
  
  // Handle keep-alive ping (keeps service worker awake)
  if (message.type === 'KEEP_ALIVE_PING') {
    console.log('[Background] Keep-alive ping received - responding with OK');
    sendResponse({ ok: true, timestamp: Date.now() });
    return true;  // Keep channel open for async response
  }

  if (message.type === 'BATCH_CHECK_URLS') {
    console.log(`[Background] Received BATCH_CHECK_URLS request for ${message.urls?.length || 0} URLs`);
    
    // Perform batch check and send response
    batchCheckUrls(message.urls)
      .then(results => {
        console.log(`[Background] Batch check complete, sending ${results.results?.length || 0} results`);
        sendResponse(results);
      })
      .catch(error => {
        console.error("[Background] Batch check failed:", error);
        sendResponse({ results: [], error: error.message });
      });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
  
  if (message.type === 'CHECK_CURRENT_PAGE') {
    // Content script is requesting a check for the current page
    console.log(`[Background] Content script requesting check for: ${message.url}`);
    checkUrl(message.url)
      .then(result => {
        if (result) {
          chrome.storage.local.set({ [`url_${message.url}`]: result });
          console.log(`[Background] Check complete for ${message.url}, verdict: ${result.final_verdict}`);
          sendResponse({ result });
        } else {
          console.log(`[Background] No result for ${message.url}`);
          sendResponse({ result: null });
        }
      })
      .catch(error => {
        console.error("[Background] Check failed:", error);
        sendResponse({ result: null, error: error.message });
      });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
  
  // Log unknown message types
  console.warn('[Background] Unknown message type:', message.type);
  sendResponse({ error: 'Unknown message type' });
  return true;
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
