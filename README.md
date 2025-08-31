GitHub Pages Deployment (iPhone‑friendly)

This project is ready to host as a static site on GitHub Pages and works on iPhone Safari (touch controls + audio unlock).

Quick steps

1) Create an empty repo on GitHub (no README/License).

2) In this folder, run:

   - git init -b main
   - git add .
   - git commit -m "Initial publish"
   - git remote add origin https://github.com/<your-username>/<your-repo>.git
   - git push -u origin main

3) Enable Pages:

   - GitHub → Repo → Settings → Pages
   - Source: Deploy from a branch
   - Branch: main, Folder: / (root)
   - Save and wait ~1–3 minutes

4) Open the Pages URL on your iPhone (HTTPS). Tap once to unlock audio, then use the on‑screen joystick (bottom‑right) and strike button (bottom‑left).

Notes

- index.html already includes mobile meta tags and disables touch scrolling.
- sketch.js implements responsive canvas, touch joystick, and audio unlock.
- Assets must remain under assets/ with the same filenames referenced in sketch.js.

Optional (use CDN scripts)

If you prefer not to keep local p5 files, replace the three <script> tags in index.html with:

<script src="https://cdn.jsdelivr.net/npm/p5@1.9.2/lib/p5.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/p5@1.9.2/lib/addons/p5.sound.min.js"></script>
<script src="sketch.js"></script>

