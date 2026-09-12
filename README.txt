GAIN FOCUS PWA v4.0.8 — GitHub Pages package

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


GITHUB WEB UPLOAD NOTE
All files, including the three PNG icons, are now in the repository root. No icons folder is required.


V4.0.8
Account/profile editing added: profile picture, name, age, sex, height, current weight, goal weight, experience and equipment. Profile image is stored locally on the device and compressed before saving.


v4.0.9: Onboarding baseline videos now use the normal iOS/browser file picker. No capture attribute is used, so existing videos can be selected from Photos or Files instead of forcing camera capture.
