#!/usr/bin/env node

/**
 * Downloads Chromium for the current platform.
 *
 * IMPORTANT:
 * - This script uses the official Chromium snapshot storage:
 *   https://commondatastorage.googleapis.com/chromium-browser-snapshots
 * - It first fetches the latest revision number from the LAST_CHANGE file
 *   for your platform, then downloads the corresponding ZIP.
 * - This avoids hard-coding snapshot IDs that can go stale.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const CHROMIUM_DIR = path.join(__dirname, 'chromium');
const DOWNLOAD_DIR = path.join(__dirname, '.chromium-download');

// Base URL for Chromium snapshots
const SNAPSHOT_BASE =
  'https://commondatastorage.googleapis.com/chromium-browser-snapshots';

// Platform-specific configuration for snapshot paths and archive names
const PLATFORM_CONFIG = {
  'darwin-x64': {
    snapshotPath: 'Mac',
    zipName: 'chrome-mac.zip',
    extractedDir: 'chrome-mac',
  },
  'darwin-arm64': {
    snapshotPath: 'Mac_Arm',
    zipName: 'chrome-mac.zip',
    extractedDir: 'chrome-mac',
  },
  'win32-x64': {
    snapshotPath: 'Win_x64',
    zipName: 'chrome-win.zip',
    extractedDir: 'chrome-win',
  },
  'linux-x64': {
    snapshotPath: 'Linux_x64',
    zipName: 'chrome-linux.zip',
    extractedDir: 'chrome-linux',
  },
};

function getPlatform() {
  const platform = os.platform();
  const arch = os.arch();
  
  if (platform === 'darwin') {
    return arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
  } else if (platform === 'win32') {
    return 'win32-x64';
  } else if (platform === 'linux') {
    return 'linux-x64';
  }
  
  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

/**
 * Fetch the latest snapshot revision number for a given platform.
 */
function fetchLatestRevision(config) {
  const lastChangeUrl = `${SNAPSHOT_BASE}/${config.snapshotPath}/LAST_CHANGE`;

  return new Promise((resolve, reject) => {
    https
      .get(lastChangeUrl, (res) => {
        if (res.statusCode !== 200) {
          reject(
            new Error(
              `Failed to get latest revision (status ${res.statusCode}) from ${lastChangeUrl}`,
            ),
          );
          res.resume();
          return;
        }

        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          const rev = body.trim();
          if (!rev || !/^\d+$/.test(rev)) {
            reject(new Error(`Invalid revision value: "${rev}"`));
            return;
          }
          resolve(rev);
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    
    console.log(`Downloading from: ${url}`);
    console.log(`Saving to: ${dest}`);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      let lastPercent = 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = Math.floor((downloadedSize / totalSize) * 100);
        
        if (percent !== lastPercent && percent % 5 === 0) {
          console.log(`Progress: ${percent}% (${Math.floor(downloadedSize / 1024 / 1024)}MB / ${Math.floor(totalSize / 1024 / 1024)}MB)`);
          lastPercent = percent;
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('Download complete!');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function extractZip(zipPath, extractTo) {
  console.log(`Extracting to: ${extractTo}`);
  
  const platform = os.platform();
  
  try {
    if (platform === 'win32') {
      // Use PowerShell on Windows
      execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractTo}' -Force"`, {
        stdio: 'inherit'
      });
    } else {
      // Use unzip on Mac/Linux
      execSync(`unzip -q -o "${zipPath}" -d "${extractTo}"`, {
        stdio: 'inherit'
      });
    }
    console.log('Extraction complete!');
  } catch (error) {
    throw new Error(`Failed to extract: ${error.message}`);
  }
}

function organizeChromium(platform) {
  console.log('Organizing Chromium files...');
  
  // Ensure chromium directory exists
  if (!fs.existsSync(CHROMIUM_DIR)) {
    fs.mkdirSync(CHROMIUM_DIR, { recursive: true });
  }
  
  // Determine extracted folder name based on platform
  let extractedDirName;
  if (platform.startsWith('darwin')) {
    extractedDirName = 'chrome-mac';
  } else if (platform === 'win32-x64') {
    extractedDirName = 'chrome-win';
  } else if (platform === 'linux-x64') {
    extractedDirName = 'chrome-linux';
  } else {
    throw new Error(`Unsupported platform in organizeChromium: ${platform}`);
  }

  const extractedPath = path.join(DOWNLOAD_DIR, extractedDirName);
  if (!fs.existsSync(extractedPath)) {
    throw new Error(
      `Expected extracted directory not found: ${extractedPath}`,
    );
  }

  const items = fs.readdirSync(extractedPath);

  items.forEach((item) => {
    const srcPath = path.join(extractedPath, item);
    const destPath = path.join(CHROMIUM_DIR, item);

    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { recursive: true, force: true });
    }

    fs.renameSync(srcPath, destPath);
  });
  
  console.log('Organization complete!');
}

async function main() {
  console.log('='.repeat(60));
  console.log('Chromium Downloader for MyCustomBrowser');
  console.log('='.repeat(60));
  console.log('');
  
  const platform = getPlatform();
  const config = PLATFORM_CONFIG[platform];

  if (!config) {
    console.error(`No platform configuration for: ${platform}`);
    process.exit(1);
  }

  console.log(`Platform: ${platform}`);

  // Fetch latest revision dynamically instead of using hard-coded URLs
  console.log('Resolving latest Chromium snapshot revision...');
  let revision;
  try {
    revision = await fetchLatestRevision(config);
  } catch (err) {
    console.error('');
    console.error('❌ Failed to resolve latest Chromium revision');
    console.error(err.message);
    process.exit(1);
  }

  const url = `${SNAPSHOT_BASE}/${config.snapshotPath}/${revision}/${config.zipName}`;
  console.log(`Using revision: ${revision}`);
  console.log(`Platform: ${platform}`);
  console.log(`Download size: ~150-200 MB`);
  console.log('');
  
  // Check if Chromium already exists
  if (fs.existsSync(CHROMIUM_DIR)) {
    const files = fs.readdirSync(CHROMIUM_DIR);
    if (files.length > 0) {
      console.log('⚠️  Chromium directory already exists.');
      console.log('Removing old version...');
      fs.rmSync(CHROMIUM_DIR, { recursive: true, force: true });
    }
  }
  
  // Create download directory
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
  
  const zipPath = path.join(DOWNLOAD_DIR, 'chromium.zip');
  
  try {
    // Download
    console.log('Step 1: Downloading Chromium...');
    await downloadFile(url, zipPath);
    console.log('');
    
    // Extract
    console.log('Step 2: Extracting Chromium...');
    extractZip(zipPath, DOWNLOAD_DIR);
    console.log('');
    
    // Organize
    console.log('Step 3: Organizing files...');
    organizeChromium(platform);
    console.log('');
    
    // Cleanup
    console.log('Step 4: Cleaning up...');
    fs.rmSync(DOWNLOAD_DIR, { recursive: true, force: true });
    console.log('Cleanup complete!');
    console.log('');
    
    console.log('='.repeat(60));
    console.log('✅ SUCCESS! Chromium is ready.');
    console.log('='.repeat(60));
    console.log(`Location: ${CHROMIUM_DIR}`);
    console.log('');
    
    // Show Chromium path for different platforms
    if (platform.startsWith('darwin')) {
      console.log('Chromium executable:');
      console.log(`  ${path.join(CHROMIUM_DIR, 'Chromium.app', 'Contents', 'MacOS', 'Chromium')}`);
    } else if (platform === 'win32-x64') {
      console.log('Chromium executable:');
      console.log(`  ${path.join(CHROMIUM_DIR, 'chrome.exe')}`);
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check your internet connection');
    console.error('2. Make sure you have enough disk space (~500MB)');
    console.error('3. On Mac/Linux, ensure unzip is installed');
    console.error('4. Try running the script again');
    process.exit(1);
  }
}

main();

