GAIN FOCUS PWA v4.0.7 — GitHub Pages package

Upload the CONTENTS of this folder to the root of your GitHub repository.
Keep these files/folders together:
  index.html
  manifest.webmanifest
  service-worker.js
  icons/
  .gitignore
  .nojekyll

GitHub Pages setup:
1. Repository > Settings > Pages.
2. Source: Deploy from a branch.
3. Branch: main, folder: / (root).
4. Save and wait for the HTTPS Pages URL.
5. Open the Pages URL in Safari on iPhone.
6. Share > Add to Home Screen.

.gitignore excludes local/editor files, logs, dependencies and secret .env files.
.nojekyll tells GitHub Pages to serve this static PWA directly without Jekyll processing.
