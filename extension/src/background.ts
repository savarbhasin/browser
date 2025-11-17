import type { CheckResult } from './types';

// API Base URL - inline to avoid import issues
const API_BASE = "http://localhost:8000";

// OAuth configuration for Electron-based browsers
// This flow opens a popup window for authentication (works when chrome.identity API is not available)
const GOOGLE_CLIENT_ID = '715101676292-vcc0d5sontjegivlo3af11qfn1vfu7mf.apps.googleusercontent.com';
const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const REDIRECT_URI = chrome.identity?.getRedirectURL?.() || `https://${chrome.runtime.id}.chromiumapp.org/`;

// Track checked URLs to avoid duplicate notifications
const checkedUrls = new Set<string>();

// Track if we need to spoof User-Agent (for Electron-based browsers)
let oauthInProgress = false;

// Spoof User-Agent for Google OAuth to bypass Electron browser detection
// Google blocks Electron-based browsers with "This browser or app may not be secure" error
// We modify the User-Agent header to appear as a standard Chrome browser
async function enableUserAgentSpoofing() {
  oauthInProgress = true;
  
  // Add rule to modify User-Agent header for Google OAuth
  const rules = [{
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders" as chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          header: "User-Agent",
          operation: "set" as chrome.declarativeNetRequest.HeaderOperation.SET,
          value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      ]
    },
    condition: {
      urlFilter: "*://accounts.google.com/*",
      resourceTypes: ["main_frame" as chrome.declarativeNetRequest.ResourceType.MAIN_FRAME, 
                      "sub_frame" as chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
                      "xmlhttprequest" as chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST]
    }
  }];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: rules
  });
}

async function disableUserAgentSpoofing() {
  oauthInProgress = false;
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1]
  });
}

// Handle OAuth flow for Electron-based browsers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_OAUTH') {
    handleOAuthFlow()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function handleOAuthFlow() {
  // Enable User-Agent spoofing to bypass Google's Electron browser detection
  await enableUserAgentSpoofing();
  
  // Build OAuth URL
  const authUrl = new URL(GOOGLE_OAUTH_URL);
  authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'token');
  authUrl.searchParams.append('scope', 'openid email profile');

  // Open popup window
  const authWindow = await chrome.windows.create({
    url: authUrl.toString(),
    type: 'popup',
    width: 500,
    height: 600,
  });

  return new Promise((resolve, reject) => {
    // Listen for redirect
    const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (authWindow.tabs && authWindow.tabs[0]?.id === tabId && changeInfo.url) {
        const url = new URL(changeInfo.url);
        
        // Check if this is our redirect URL
        if (url.origin === new URL(REDIRECT_URI).origin) {
          // Extract token from hash
          const hash = url.hash.substring(1);
          const params = new URLSearchParams(hash);
          const token = params.get('access_token');
          const error = params.get('error');

          // Clean up
          chrome.tabs.onUpdated.removeListener(listener);
          if (authWindow.id) {
            chrome.windows.remove(authWindow.id);
          }
          
          // Disable User-Agent spoofing
          disableUserAgentSpoofing();

          if (error) {
            reject(new Error(error));
            return;
          }

          if (token) {
            // Get user info
            fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => response.json())
            .then(userInfo => {
              // Send message to popup
              chrome.runtime.sendMessage({
                type: 'OAUTH_SUCCESS',
                token,
                userInfo
              });
              resolve(undefined);
            })
            .catch((err) => {
              disableUserAgentSpoofing();
              reject(err);
            });
          } else {
            reject(new Error('No token received'));
          }
        }
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // Handle window close
    const windowListener = (windowId: number) => {
      if (windowId === authWindow.id) {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.windows.onRemoved.removeListener(windowListener);
        disableUserAgentSpoofing();
        reject(new Error('Authentication window closed'));
      }
    };
    chrome.windows.onRemoved.addListener(windowListener);
  });
}

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
