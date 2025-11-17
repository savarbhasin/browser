import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Plugin to copy manifest.json and fix popup.html location after build
const copyManifestPlugin = () => {
  return {
    name: "copy-manifest",
    writeBundle() {
      // Copy manifest.json
      const manifestSrc = resolve(__dirname, "public/manifest.json");
      const manifestDest = resolve(__dirname, "dist/manifest.json");
      copyFileSync(manifestSrc, manifestDest);
      console.log("✓ Copied manifest.json to dist/");
      
      // Move popup.html to root if it's in a subdirectory
      const popupInSubdir = resolve(__dirname, "dist/src/popup/popup.html");
      const popupInRoot = resolve(__dirname, "dist/popup.html");
      
      if (existsSync(popupInSubdir) && !existsSync(popupInRoot)) {
        // Read the file and update script paths
        let content = readFileSync(popupInSubdir, "utf-8");
        // Update script paths from absolute to relative
        content = content.replace(/src="\/assets\//g, 'src="./assets/');
        writeFileSync(popupInRoot, content);
        console.log("✓ Moved popup.html to dist/ root");
      }
    }
  };
};

export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
  publicDir: "public",
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/popup.html"),
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts")
      },
      output: {
        entryFileNames: (assetInfo) => {
          if (assetInfo.name?.includes("background")) return "background.js";
          if (assetInfo.name?.includes("content")) return "content.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        // Inline all dependencies for background and content scripts
        manualChunks: undefined,
        inlineDynamicImports: false
      }
    },
    outDir: "dist",
    emptyOutDir: true,
    // Ensure background and content scripts are self-contained
    modulePreload: false
  },
  base: "./"
});
