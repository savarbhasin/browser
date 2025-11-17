# Testing the Extension in Browser

This guide will walk you through testing the Windsurf URL Phishing Detector extension.

## Prerequisites

1. **Backend must be running** on `http://localhost:8000`
2. **Model file** must exist at `models/url_model.joblib`
3. **Chrome, Edge, or Brave browser** (Chromium-based)

## Step 1: Start the Backend Server

You have two options:

### Option A: Using Docker (Recommended)
```bash
# From project root
docker-compose up --build
```

### Option B: Running Locally
```bash
# From project root
cd backend
# Install dependencies (if using pipenv)
pipenv install
# Or using pip
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Verify backend is running:**
- Open `http://localhost:8000/health` in your browser
- Should return: `{"status":"ok"}`
- API docs available at: `http://localhost:8000/docs`

## Step 2: Build the Extension

```bash
# From project root
cd extension

# Install dependencies (if not already done)
npm install
# OR if using pnpm:
# pnpm install

# Build the extension
npm run build
# OR if using pnpm:
# pnpm build
```

This creates a `dist` folder with:
- `manifest.json`
- `background.js`
- `content.js`
- `popup.html` and related assets

## Step 3: Load Extension in Browser

### Chrome / Edge / Brave:

1. Open your browser and navigate to:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`

2. **Enable Developer Mode:**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the extension:**
   - Click "Load unpacked" button
   - Navigate to and select the `extension/dist` folder
   - Click "Select Folder"

4. **Verify installation:**
   - You should see "Windsurf URL Phishing Detector" in your extensions list
   - The extension icon should appear in your browser toolbar

## Step 4: Test the Extension Features

### Test 1: Automatic URL Checking

1. Navigate to any website (e.g., `https://example.com`)
2. The background script will automatically check the URL
3. If it's detected as phishing, you'll see a browser notification
4. Open the browser console (F12) to see background script logs

### Test 2: Popup - Current Page Status

1. Click the extension icon in the toolbar
2. The popup should show:
   - Current page URL
   - Safety status (SAFE or PHISHING)
   - Score (0.000 to 1.000)
3. Status badge will be:
   - 🟢 Green for safe sites
   - 🔴 Red for phishing sites

### Test 3: Popup - Manual URL Check

1. Click the extension icon
2. In the "Check Any URL" section:
   - Enter a URL (e.g., `https://google.com` or `https://example.com`)
   - Click "Check" button
3. Results should appear below showing:
   - Status badge
   - Score
   - The URL you checked

### Test 4: Link Highlighting on Pages

1. Navigate to a page with multiple links (e.g., a news website)
2. Wait 1-2 seconds for the content script to process
3. Links on the page should be highlighted:
   - **Green border** = Safe URL
   - **Red border with background tint** = Phishing URL
4. Hover over links to see the highlighting clearly

### Test 5: Dynamic Content (SPAs)

1. Navigate to a Single Page Application (e.g., `https://react.dev`)
2. Navigate within the SPA (click internal links)
3. New links should be automatically checked and highlighted
4. The MutationObserver should detect new content and check links

### Test 6: Test Pages (Backend)

The backend includes test pages you can use:

1. Visit `http://localhost:8000/tests/pages/` to see available test pages
2. Navigate to:
   - `http://localhost:8000/tests/pages/safe1.html` - Should show as SAFE
   - `http://localhost:8000/tests/pages/phishing1.html` - Should show as PHISHING
3. Check the extension popup and link highlighting on these pages

## Step 5: Debugging

### Check Background Script Logs

1. Go to `chrome://extensions/`
2. Find "Windsurf URL Phishing Detector"
3. Click "service worker" (or "background page" in older Chrome)
4. This opens the background script console
5. Look for errors or check logs

### Check Content Script Logs

1. Open any webpage
2. Press F12 to open DevTools
3. Go to the "Console" tab
4. Look for logs from the content script
5. Errors will appear here if the content script fails

### Check Popup Console

1. Right-click the extension icon
2. Select "Inspect popup"
3. This opens DevTools for the popup
4. Check console for errors

### Common Issues

**Extension not loading:**
- Make sure you selected the `dist` folder, not `src` or `extension` folder
- Check that `manifest.json` exists in `dist/`
- Check browser console for manifest errors

**Backend connection errors:**
- Verify backend is running: `curl http://localhost:8000/health`
- Check CORS settings in backend config
- Make sure `http://localhost:8000/*` is in host_permissions

**Links not highlighting:**
- Check content script console for errors
- Verify content script is injected (check DevTools Sources tab)
- Make sure page has finished loading

**Notifications not showing:**
- Check browser notification permissions
- Verify `notifications` permission in manifest.json
- Check background script console for errors

## Step 6: Rebuild After Changes

If you make changes to the extension code:

1. Stop the extension (toggle off in `chrome://extensions/`)
2. Rebuild: `npm run build` (or `pnpm build`)
3. Reload the extension (click refresh icon in extensions page)
4. Test again

## Quick Test Checklist

- [ ] Backend running on port 8000
- [ ] Extension built successfully (`dist` folder exists)
- [ ] Extension loaded in browser
- [ ] Extension icon visible in toolbar
- [ ] Popup opens and shows current page
- [ ] Manual URL check works
- [ ] Links highlighted on test pages
- [ ] Notifications appear for phishing sites
- [ ] No errors in console

## Testing URLs

You can test with these URLs (results depend on your trained model):

**Likely Safe:**
- `https://google.com`
- `https://github.com`
- `https://stackoverflow.com`

**Likely Phishing (test with caution):**
- Test with URLs from your test dataset
- Use the backend test pages at `http://localhost:8000/tests/pages/`

**Note:** The actual classification depends on your trained ML model. URLs may be classified differently based on the model's training data and thresholds.

