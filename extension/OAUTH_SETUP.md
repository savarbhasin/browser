# Google OAuth Setup for Chrome Extension

This guide explains how to set up Google OAuth for the Windsurf URL Checker extension.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** > **New Project**
3. Enter project name: `Windsurf URL Checker`
4. Click **Create**

## Step 2: Enable Required APIs

1. In your project, go to **APIs & Services** > **Library**
2. Search and enable:
   - **Google+ API** (for user profile info)
   - **Google Identity Toolkit API**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Windsurf URL Checker
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **Save and Continue**
6. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
7. Click **Save and Continue**
8. Add test users (your email and any testers)
9. Click **Save and Continue**

## Step 4: Create OAuth Client ID

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Chrome App** as application type
4. **Important**: You need your extension ID first!

## Step 5: Get Your Extension ID

### Option A: Load Unpacked Extension

1. Build your extension:
   ```bash
   cd extension
   npm run build
   ```

2. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `extension/dist` folder

3. Copy the Extension ID (shown under the extension name)
   - Example: `abcdefghijklmnopqrstuvwxyz123456`

### Option B: Generate a Key (Recommended)

1. Generate a private key:
   ```bash
   cd extension
   # Chrome will generate this when you pack the extension
   # Or use: openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out key.pem
   ```

2. In Chrome:
   - Go to `chrome://extensions/`
   - Click **Pack extension**
   - Extension root: `/path/to/extension/dist`
   - Leave private key blank for first time
   - Click **Pack Extension**
   - This creates `dist.crx` and `dist.pem`

3. Extract the public key from manifest:
   ```bash
   # Load the unpacked extension
   # Chrome will show the ID
   ```

## Step 6: Update OAuth Client ID

1. Go back to **Google Cloud Console** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Application type: **Chrome App**
4. Name: `Windsurf URL Checker Extension`
5. Application ID: `YOUR_EXTENSION_ID` (from step 5)
6. Click **Create**
7. Copy the **Client ID** (e.g., `123456789-abc.apps.googleusercontent.com`)

## Step 7: Update Extension Manifest

Edit `extension/public/manifest.json`:

```json
{
  "oauth2": {
    "client_id": "123456789-abc.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ]
  },
  "key": "YOUR_PUBLIC_KEY_HERE"
}
```

**Note**: The `key` field ensures your extension ID stays the same across builds.

## Step 8: Update Backend Configuration

Add the client ID to your backend `.env`:

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

## Step 9: Rebuild and Test

1. Rebuild the extension:
   ```bash
   cd extension
   npm run build
   ```

2. Reload the extension in Chrome:
   - Go to `chrome://extensions/`
   - Click the reload icon on your extension

3. Test OAuth:
   - Click the extension icon
   - Click "Sign in with Google"
   - Authorize the extension
   - You should be logged in!

## Troubleshooting

### Error: "Invalid OAuth client"

- **Cause**: Extension ID doesn't match OAuth client configuration
- **Fix**: 
  1. Check the extension ID in `chrome://extensions/`
  2. Update the OAuth client in Google Cloud Console
  3. Or regenerate the OAuth client with the correct ID

### Error: "This app isn't verified"

- **Cause**: App is in testing mode
- **Fix**: 
  1. Click "Advanced"
  2. Click "Go to Windsurf URL Checker (unsafe)"
  3. Or add yourself as a test user in OAuth consent screen

### Error: "Access blocked: Authorization Error"

- **Cause**: Scopes not properly configured
- **Fix**:
  1. Check OAuth consent screen scopes
  2. Ensure manifest.json has correct scopes
  3. Rebuild extension

### Error: "Extension ID changed"

- **Cause**: No key field in manifest
- **Fix**:
  1. Pack the extension once to get a key
  2. Add the key to manifest.json
  3. This keeps the ID stable

### Token expires immediately

- **Cause**: Backend not validating token
- **Fix**:
  1. Check backend is running
  2. Verify GOOGLE_CLIENT_ID in backend .env
  3. Check backend logs

## Getting the Public Key

To get a stable extension ID, you need the public key:

1. Load unpacked extension
2. Go to `chrome://extensions/`
3. Pack extension (leave private key empty first time)
4. Open the generated `.pem` file
5. Convert to public key format
6. Add to manifest.json

Or use this approach:

```bash
# After packing once, the .pem is your private key
# The public key is in the manifest when loaded
# Copy it from chrome://extensions/ (Developer mode > ID)
```

## Production Deployment

For production:

1. Publish to Chrome Web Store
2. Complete OAuth verification process
3. Update OAuth consent screen to "Published"
4. Remove test user restrictions
5. Update backend CORS to allow production extension ID

## Security Notes

- Never commit `.pem` files (private keys) to git
- Add `*.pem` to `.gitignore`
- Keep OAuth client secrets secure
- Use environment variables for sensitive data
- Rotate keys if compromised

## Reference Links

- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Chrome Extension OAuth](https://developer.chrome.com/docs/extensions/mv3/tut_oauth/)

