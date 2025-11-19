import type { CheckResult } from './types';

// Log immediately to confirm script loads
console.log('[Content] Script loaded at', new Date().toISOString(), 'URL:', window.location.href);

declare global {
  interface Window {
    _phishingDetectorInitialized?: boolean;
  }
}

// Prevent multiple initializations
if (window._phishingDetectorInitialized) {
  console.log('[Content] Already initialized, skipping...');
  // Already initialized - exit early
} else {
  console.log('[Content] Initializing content script...');
  window._phishingDetectorInitialized = true;

  // API Base URL - inline to avoid import issues
  const API_BASE = "http://192.168.2.235:8000";

  // Keep-alive mechanism to wake up background service worker
  const KEEP_ALIVE_PING_INTERVAL = 25000; // 25 seconds (before 30s timeout)
  let keepAliveInterval: number | null = null;

  function startPingLoop() {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    keepAliveInterval = window.setInterval(() => {
      chrome.runtime.sendMessage({ type: 'KEEP_ALIVE_PING' }, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          console.warn('[Content] Keep-alive ping failed:', err.message);
        }
      });
    }, KEEP_ALIVE_PING_INTERVAL);
  }

  async function wakeUpServiceWorker(): Promise<boolean> {
    // Try to wake up the service worker with a simple message
    // This forces Chrome to start the service worker if it's asleep
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'KEEP_ALIVE_PING' }, (response) => {
          const err = chrome.runtime.lastError;
          if (err) {
            console.log('[Content] Service worker ping failed:', err.message);
            resolve(false);
          } else {
            console.log('[Content] Service worker is awake and responding');
            resolve(true);
          }
        });
      } catch (error) {
        console.error('[Content] Failed to send wake-up message:', error);
        resolve(false);
      }
    });
  }

  async function ensureServiceWorkerReady(): Promise<boolean> {
    // Try multiple times to wake up the service worker
    for (let attempt = 0; attempt < 10; attempt++) {
      const isAwake = await wakeUpServiceWorker();
      if (isAwake) {
        console.log('[Content] Service worker ready after', attempt + 1, 'attempt(s)');
        return true;
      }
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, then cap at 2000ms
      const delay = Math.min(100 * Math.pow(2, attempt), 2000);
      console.log(`[Content] Service worker not ready, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    console.error('[Content] Service worker failed to respond after 10 attempts');
    return false;
  }

  // Initialize keep-alive system
  async function initializeKeepAlive() {
    console.log('[Content] Initializing keep-alive system...');
    
    // First, ensure service worker is awake
    const ready = await ensureServiceWorkerReady();
    
    if (ready) {
      // Start periodic pinging to keep it awake
      startPingLoop();
      console.log('[Content] Keep-alive system initialized successfully');
    } else {
      console.error('[Content] Could not initialize keep-alive system - service worker not responding');
    }
  }

  // Start keep-alive in background (non-blocking)
  initializeKeepAlive().catch(err => {
    console.error('[Content] Keep-alive initialization failed:', err);
  });

interface LinkCheck {
  element: HTMLAnchorElement;
  url: string;
  result: CheckResult | null;
}

// Helper function to send messages with retry (waits for service worker to wake up)
async function sendMessageWithRetry(message: any, retries = 5, delay = 500): Promise<any> {
  console.log(`[Content] Sending message:`, message.type);
  
  // First, ensure service worker is awake (but don't wait too long)
  let workerReady = false;
  for (let i = 0; i < 3; i++) {
    workerReady = await wakeUpServiceWorker();
    if (workerReady) break;
    await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
  }
  
  if (!workerReady) {
    console.warn('[Content] Service worker not responding, attempting message anyway...');
  }
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          const err = chrome.runtime.lastError;
          if (err) {
            console.warn(`[Content] Message ${message.type} failed (attempt ${attempt + 1}/${retries}):`, err.message);
            reject(new Error(err.message));
          } else {
            console.log(`[Content] Message ${message.type} succeeded on attempt ${attempt + 1}`);
            resolve(response);
          }
        });
      });
    } catch (error: any) {
      if (attempt === retries - 1) {
        console.error(`[Content] Failed to send message ${message.type} after ${retries} attempts:`, error);
        throw error;
      }
      // Try to wake up service worker again before retrying
      await wakeUpServiceWorker();
      // Exponential backoff: delay * 2^attempt
      const waitTime = delay * Math.pow(2, attempt);
      console.log(`[Content] Retrying ${message.type} in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

async function checkUrl(url: string): Promise<CheckResult | null> {
  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return null;
    }

    const response = await fetch(`${API_BASE}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error checking URL:", error);
    return null;
  }
}

async function batchCheckUrls(urls: string[]): Promise<Map<string, CheckResult>> {
  try {
    console.log(`[Content] Starting batch check for ${urls.length} URLs...`);
    
    // Send message to background script to perform batch check (with retry)
    const response = await sendMessageWithRetry({
      type: 'BATCH_CHECK_URLS',
      urls: urls
    });

    console.log(`[Content] Batch check response:`, response);

    const resultMap = new Map<string, CheckResult>();
    
    if (response && response.results) {
      // Map results by URL for easy lookup
      for (const result of response.results) {
        resultMap.set(result.url, result);
      }
      console.log(`[Content] Mapped ${resultMap.size} results from batch check`);
    }
    
    return resultMap;
  } catch (error) {
    console.error("[Content] Error batch checking URLs:", error);
    return new Map();
  }
}

function highlightLink(element: HTMLAnchorElement, result: CheckResult) {
  // Remove existing highlights
  element.style.border = "";
  element.style.borderRadius = "";
  element.style.padding = "";
  element.style.backgroundColor = "";
  element.title = ""; // Clear tooltip
  
  // Only highlight suspicious and unsafe links - skip safe links
  if (result.final_verdict === "safe") {
    // Don't highlight safe links
    return;
  } else if (result.final_verdict === "suspicious") {
    // Suspicious - orange border
    element.style.border = "2px solid #f59e0b";
    element.style.borderRadius = "2px";
    element.style.padding = "1px";
    element.style.backgroundColor = "rgba(245, 158, 11, 0.1)";
    element.title = `⚠️ Suspicious (ML Score: ${result.ml_score.toFixed(2)}, Confidence: ${result.confidence})`;
  } else {
    // Unsafe - red border
    element.style.border = "2px solid #ef4444";
    element.style.borderRadius = "2px";
    element.style.padding = "1px";
    element.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
    const threats = result.safe_browsing.threats.length > 0 
      ? ` Safe Browsing: ${result.safe_browsing.threats.map(t => t.threatType).join(", ")}`
      : "";
    element.title = `🚨 Unsafe (ML Score: ${result.ml_score.toFixed(2)}, Confidence: ${result.confidence})${threats}`;
  }
}

// URL regex pattern to find URLs in text
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

// Track highlighted text URLs to avoid re-highlighting
const highlightedTextUrls = new WeakSet<Node>();

function wrapTextUrl(textNode: Text, url: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'url-safety-highlight';
  span.textContent = url;
  span.style.cursor = 'pointer';
  span.style.textDecoration = 'underline';
  span.style.fontWeight = '500';
  span.dataset.url = url;
  
  textNode.parentNode?.replaceChild(span, textNode);
  return span;
}

function findAndWrapTextUrls(element: Node) {
  // Skip if already processed or if it's a script/style tag
  if (highlightedTextUrls.has(element) || 
      element.nodeType !== Node.TEXT_NODE ||
      (element.parentElement && 
       (element.parentElement.tagName === 'SCRIPT' || 
        element.parentElement.tagName === 'STYLE' ||
        element.parentElement.tagName === 'A'))) {
    return;
  }
  
  if (element.nodeType === Node.TEXT_NODE) {
    const textNode = element as Text;
    const text = textNode.textContent || '';
    const matches = Array.from(text.matchAll(URL_REGEX));
    
    if (matches.length > 0) {
      highlightedTextUrls.add(element);
      const parent = textNode.parentNode;
      if (!parent) return;
      
      let lastIndex = 0;
      const fragment = document.createDocumentFragment();
      
      matches.forEach((match) => {
        const url = match[0];
        const index = match.index!;
        
        // Add text before URL
        if (index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
        }
        
        // Create span for URL
        const span = document.createElement('span');
        span.className = 'url-safety-highlight';
        span.textContent = url;
        span.style.cursor = 'pointer';
        span.style.textDecoration = 'underline';
        span.style.fontWeight = '500';
        span.dataset.url = url;
        
        fragment.appendChild(span);
        lastIndex = index + url.length;
      });
      
      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }
      
      parent.replaceChild(fragment, textNode);
    }
  } else {
    // Recursively process child nodes
    const children = Array.from(element.childNodes);
    children.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.ELEMENT_NODE) {
        findAndWrapTextUrls(child);
      }
    });
  }
}

function highlightTextUrl(span: HTMLElement, result: CheckResult) {
  // Remove existing styles
  span.style.border = "";
  span.style.borderRadius = "";
  span.style.padding = "";
  span.style.backgroundColor = "";
  span.style.color = "";
  
  // Only highlight suspicious and unsafe links - skip safe links
  if (result.final_verdict === "safe") {
    // Don't highlight safe URLs
    return;
  } else if (result.final_verdict === "suspicious") {
    span.style.color = "#f59e0b";
    span.style.borderBottom = "2px solid #f59e0b";
    span.style.backgroundColor = "rgba(245, 158, 11, 0.1)";
    span.style.padding = "1px 2px";
    span.style.borderRadius = "2px";
    span.title = `⚠️ Suspicious (ML Score: ${result.ml_score.toFixed(2)}, Confidence: ${result.confidence})`;
  } else {
    span.style.color = "#ef4444";
    span.style.borderBottom = "2px solid #ef4444";
    span.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
    span.style.padding = "1px 2px";
    span.style.borderRadius = "2px";
    const threats = result.safe_browsing.threats.length > 0 
      ? ` Safe Browsing: ${result.safe_browsing.threats.map(t => t.threatType).join(", ")}`
      : "";
    span.title = `🚨 Unsafe (ML Score: ${result.ml_score.toFixed(2)}, Confidence: ${result.confidence})${threats}`;
  }
  
  // Make clickable
  span.onclick = (e) => {
    e.preventDefault();
    window.open(result.url, '_blank');
  };
}

async function checkAndHighlightLinks() {
  // Get all anchor tags on the page
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
  
  // Find and wrap URLs in text content
  if (document.body) {
    findAndWrapTextUrls(document.body);
  }
  
  // Get all highlighted text URLs
  const textUrlSpans = Array.from(document.querySelectorAll<HTMLElement>('.url-safety-highlight'));
  
  // Extract unique URLs and map them to their elements
  const urlMap = new Map<string, Array<{ element: HTMLElement; isLink: boolean }>>();
  
  // Process anchor tags
  for (const link of links) {
    try {
      const href = link.href;
      if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
        // Normalize URL (remove fragments, etc.)
        const url = new URL(href);
        url.hash = "";
        const normalizedUrl = url.toString();
        
        if (!urlMap.has(normalizedUrl)) {
          urlMap.set(normalizedUrl, []);
        }
        urlMap.get(normalizedUrl)!.push({ element: link, isLink: true });
      }
    } catch (e) {
      // Invalid URL, skip
      continue;
    }
  }
  
  // Process text URLs
  for (const span of textUrlSpans) {
    const url = span.dataset.url;
    if (url) {
      try {
        const normalizedUrl = new URL(url).toString();
        if (!urlMap.has(normalizedUrl)) {
          urlMap.set(normalizedUrl, []);
        }
        urlMap.get(normalizedUrl)!.push({ element: span, isLink: false });
      } catch (e) {
        // Invalid URL, skip
        continue;
      }
    }
  }

  const allUrls = Array.from(urlMap.keys());
  if (allUrls.length === 0) {
    return;
  }

  console.log(`[URL Safety] Found ${allUrls.length} unique URLs on page`);

  // Check cache for all URLs
  const cacheKeys = allUrls.map(url => `url_${url}`);
  const cachedResults = await new Promise<Record<string, CheckResult>>((resolve) => {
    chrome.storage.local.get(cacheKeys, (items) => {
      resolve(items);
    });
  });

  // Separate cached and uncached URLs
  const resultsMap = new Map<string, CheckResult>();
  const urlsToCheck: string[] = [];

  for (const url of allUrls) {
    const cacheKey = `url_${url}`;
    const cached = cachedResults[cacheKey];
    if (cached) {
      resultsMap.set(url, cached);
    } else {
      urlsToCheck.push(url);
    }
  }

  if (resultsMap.size > 0) {
    console.log(`[URL Safety] ${resultsMap.size} URLs loaded from cache`);
  }

  // Batch check uncached URLs (in chunks of 100)
  if (urlsToCheck.length > 0) {
    console.log(`[URL Safety] Checking ${urlsToCheck.length} uncached URLs using batch API...`);
    const startTime = performance.now();
    
    const BATCH_SIZE = 100;
    const batches: string[][] = [];
    
    for (let i = 0; i < urlsToCheck.length; i += BATCH_SIZE) {
      batches.push(urlsToCheck.slice(i, i + BATCH_SIZE));
    }

    // Process all batches in parallel
    const batchResults = await Promise.all(
      batches.map(batch => batchCheckUrls(batch))
    );

    // Merge all batch results
    const cacheUpdates: Record<string, CheckResult> = {};
    const unsafeUrls: Array<{ url: string; result: CheckResult }> = [];
    
    for (const batchResult of batchResults) {
      for (const [url, result] of batchResult.entries()) {
        resultsMap.set(url, result);
        cacheUpdates[`url_${url}`] = result;
        
        // Log unsafe/suspicious URLs from batch API
        if (result && (!result.safe || result.final_verdict === "unsafe" || result.final_verdict === "suspicious")) {
          unsafeUrls.push({ url, result });
        }
      }
    }

    // Log unsafe websites found in batch
    if (unsafeUrls.length > 0) {
      console.log(`[URL Safety] ⚠️ Found ${unsafeUrls.length} unsafe/suspicious URL(s) in batch:`);
      unsafeUrls.forEach(({ url, result }) => {
        console.log(`  🚨 ${url} - Verdict: ${result.final_verdict}, Confidence: ${result.confidence}, Risk Score: ${result.risk_score}/100`);
      });
    }

    // Update cache with all new results
    if (Object.keys(cacheUpdates).length > 0) {
      chrome.storage.local.set(cacheUpdates);
    }
    
    const endTime = performance.now();
    console.log(`[URL Safety] Batch check completed in ${(endTime - startTime).toFixed(2)}ms (${batches.length} batch${batches.length > 1 ? 'es' : ''})`);
  }

  // Highlight all URLs based on results
  for (const [url, linkElements] of urlMap.entries()) {
    const result = resultsMap.get(url);
    if (result) {
      linkElements.forEach((item) => {
        if (item.isLink) {
          highlightLink(item.element as HTMLAnchorElement, result);
        } else {
          highlightTextUrl(item.element, result);
        }
      });
    }
  }
}

// Debounce function to avoid excessive checks
let checkTimeout: number | null = null;
function debouncedCheckAndHighlight() {
  if (checkTimeout) {
    clearTimeout(checkTimeout);
  }
  checkTimeout = window.setTimeout(() => {
    checkAndHighlightLinks();
  }, 500);
}

// Check if the current page itself is unsafe
async function checkCurrentPageSafety() {
  try {
    const currentUrl = window.location.href;
    
    // First, check storage
    let result = await new Promise<CheckResult | null>((resolve) => {
      chrome.storage.local.get([`url_${currentUrl}`], (items) => {
        resolve(items[`url_${currentUrl}`] || null);
      });
    });

    // If no result in storage, request a check from background script
    if (!result) {
      console.log(`[Content] No cached result for ${currentUrl}, requesting check from background...`);
      try {
        const response = await sendMessageWithRetry({
          type: 'CHECK_CURRENT_PAGE',
          url: currentUrl
        });
        result = response?.result || null;
      } catch (e) {
        console.error("[Content] Failed to request check from background:", e);
      }
    }

    // Show overlay if unsafe/suspicious
    if (result && (!result.safe || result.final_verdict === "unsafe" || result.final_verdict === "suspicious")) {
      console.log(`[Content] Unsafe/suspicious page detected: ${currentUrl}. Verdict: ${result.final_verdict}`);
      const overlay = createWarningOverlay(result);
      document.body.appendChild(overlay);
    } else if (result) {
      console.log(`[Content] Page ${currentUrl} is safe. Verdict: ${result.final_verdict}`);
    }
  } catch (e) {
    console.error("[Content] Error checking current page safety:", e);
  }
}

// Run on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    checkCurrentPageSafety();
    setTimeout(checkAndHighlightLinks, 1000); // Wait a bit for page to fully load
  });
} else {
  checkCurrentPageSafety();
  setTimeout(checkAndHighlightLinks, 1000);
}

// Also check when new content is added (for SPAs)
const observer = new MutationObserver(() => {
  debouncedCheckAndHighlight();
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
} else {
  // Wait for body to be available
  const bodyObserver = new MutationObserver(() => {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      bodyObserver.disconnect();
    }
  });
  bodyObserver.observe(document.documentElement, {
    childList: true,
  });
}

// Full-page warning overlay functionality
function createWarningOverlay(result: CheckResult): HTMLElement {
  // Check if overlay already exists
  const existing = document.getElementById('phishing-warning-overlay');
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'phishing-warning-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    backdrop-filter: blur(10px);
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 40px;
    max-width: 600px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    position: relative;
    animation: slideIn 0.3s ease-out;
  `;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    font-size: 32px;
    font-weight: 300;
    color: #666;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    border-radius: 8px;
  `;
  closeBtn.onmouseover = () => {
    closeBtn.style.background = '#f3f4f6';
    closeBtn.style.color = '#000';
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'none';
    closeBtn.style.color = '#666';
  };
  closeBtn.onclick = () => {
    overlay.style.animation = 'fadeOut 0.2s ease-out';
    setTimeout(() => overlay.remove(), 200);
  };

  // Warning icon
  const icon = document.createElement('div');
  icon.style.cssText = `
    font-size: 64px;
    text-align: center;
    margin-bottom: 20px;
  `;
  
  // Determine icon and colors based on verdict
  let iconEmoji = '🚨';
  let titleColor = '#dc2626';
  let title = 'Warning: Unsafe Website Detected!';
  
  if (result.final_verdict === 'suspicious') {
    iconEmoji = '⚠️';
    titleColor = '#f59e0b';
    title = 'Warning: Suspicious Website Detected!';
  }
  
  icon.textContent = iconEmoji;

  // Title
  const titleEl = document.createElement('h1');
  titleEl.textContent = title;
  titleEl.style.cssText = `
    color: ${titleColor};
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 16px 0;
    text-align: center;
    line-height: 1.3;
  `;

  // URL display
  const urlEl = document.createElement('div');
  urlEl.style.cssText = `
    background: #f3f4f6;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    word-break: break-all;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    color: #374151;
  `;
  urlEl.textContent = result.url;

  // Warning message
  const message = document.createElement('p');
  message.style.cssText = `
    color: #374151;
    font-size: 16px;
    line-height: 1.6;
    margin: 0 0 20px 0;
    text-align: center;
  `;
  
  let messageText = 'This website has been identified as potentially dangerous. ';
  if (result.final_verdict === 'unsafe') {
    messageText += 'It may attempt to steal your personal information, passwords, or financial data.';
  } else {
    messageText += 'It shows suspicious characteristics that may indicate phishing or malicious activity.';
  }
  message.textContent = messageText;

  // Details section
  const details = document.createElement('div');
  details.style.cssText = `
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 24px;
    font-size: 14px;
  `;

  const detailsTitle = document.createElement('div');
  detailsTitle.textContent = 'Detection Details:';
  detailsTitle.style.cssText = `
    font-weight: 600;
    color: #92400e;
    margin-bottom: 8px;
  `;

  const detailsList = document.createElement('ul');
  detailsList.style.cssText = `
    margin: 0;
    padding-left: 20px;
    color: #92400e;
  `;

  // Check if flagged by security services (highest priority)
  const flaggedServices = result.enhanced_checks?.reputation?.flagged_by_services;
  if (flaggedServices && flaggedServices.length > 0) {
    const servicesItem = document.createElement('li');
    servicesItem.innerHTML = `<strong>⚠️ FLAGGED BY:</strong> ${flaggedServices.join(', ')}`;
    servicesItem.style.cssText = `
      margin-bottom: 8px;
      color: #991b1b;
      font-weight: 600;
      background: #fee2e2;
      padding: 6px 8px;
      border-radius: 4px;
      list-style: none;
      margin-left: -20px;
      padding-left: 28px;
    `;
    detailsList.appendChild(servicesItem);
  } else if (result.safe_browsing.threats.length > 0) {
    const threatsItem = document.createElement('li');
    threatsItem.innerHTML = `<strong>⚠️ Google Safe Browsing:</strong> ${result.safe_browsing.threats.map(t => t.threatType).join(', ')}`;
    threatsItem.style.cssText = `
      margin-bottom: 8px;
      color: #991b1b;
      font-weight: 600;
      background: #fee2e2;
      padding: 6px 8px;
      border-radius: 4px;
      list-style: none;
      margin-left: -20px;
      padding-left: 28px;
    `;
    detailsList.appendChild(threatsItem);
  }

  const riskScoreItem = document.createElement('li');
  riskScoreItem.textContent = `Risk Score: ${result.risk_score}/100`;
  riskScoreItem.style.marginBottom = '4px';


  detailsList.appendChild(riskScoreItem);

  details.appendChild(detailsTitle);
  details.appendChild(detailsList);

  // Buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 24px;
  `;

  // Go back button (primary)
  const backBtn = document.createElement('button');
  backBtn.textContent = '← Go Back to Safety';
  backBtn.style.cssText = `
    background: ${titleColor};
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    flex: 1;
    max-width: 250px;
  `;
  backBtn.onmouseover = () => {
    backBtn.style.transform = 'translateY(-1px)';
    backBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  };
  backBtn.onmouseout = () => {
    backBtn.style.transform = 'translateY(0)';
    backBtn.style.boxShadow = 'none';
  };
  backBtn.onclick = () => {
    window.history.back();
  };

  // Proceed anyway button (secondary, dangerous)
  const proceedBtn = document.createElement('button');
  proceedBtn.textContent = 'Proceed Anyway (Not Recommended)';
  proceedBtn.style.cssText = `
    background: white;
    color: #6b7280;
    border: 2px solid #d1d5db;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  `;
  proceedBtn.onmouseover = () => {
    proceedBtn.style.borderColor = '#9ca3af';
    proceedBtn.style.color = '#374151';
  };
  proceedBtn.onmouseout = () => {
    proceedBtn.style.borderColor = '#d1d5db';
    proceedBtn.style.color = '#6b7280';
  };
  proceedBtn.onclick = () => {
    overlay.style.animation = 'fadeOut 0.2s ease-out';
    setTimeout(() => overlay.remove(), 200);
  };

  buttonsContainer.appendChild(backBtn);
  buttonsContainer.appendChild(proceedBtn);

  // Assemble the content
  content.appendChild(closeBtn);
  content.appendChild(icon);
  content.appendChild(titleEl);
  content.appendChild(urlEl);
  content.appendChild(message);
  content.appendChild(details);
  content.appendChild(buttonsContainer);

  overlay.appendChild(content);

  return overlay;
}

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ status: 'pong' });
      return;
    }

    console.log(`[Content] Received message:`, message);
    if (message.type === 'SHOW_WARNING') {
      console.log(`[Content] Showing warning overlay for ${message.result.url}`);
      const overlay = createWarningOverlay(message.result);
      document.body.appendChild(overlay);
    }
  });
} // End of global guard


export {};
