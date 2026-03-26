# Vercel Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy OD Balance Tracker as a static PWA on Vercel via GitHub integration, replacing GitHub Pages.

**Architecture:** Pure static site — no build step. Vercel serves files directly from the repo root. `manifest.json` needs its paths updated from GitHub Pages subpath-relative (`"./"`) to root-relative (`"/"`). Vercel connection is a one-time manual step in the Vercel dashboard.

**Tech Stack:** Static HTML/CSS/JS, PWA (service worker + manifest), Vercel (static hosting), GitHub (source + auto-deploy trigger)

---

### Task 1: Fix manifest.json paths for Vercel

**Files:**
- Modify: `manifest.json`

- [ ] **Step 1: Open manifest.json and update start_url and scope**

The current values (`"./"`) were set for GitHub Pages subpath hosting. Vercel serves from root `/`.

Edit `manifest.json` so it reads:

```json
{
  "name": "OD Balance Tracker",
  "short_name": "OD Tracker",
  "description": "Track OD account balance and transactions",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e",
  "orientation": "portrait",
  "icons": [
    {
      "src": "icons/icon-192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: Commit and push**

```bash
git add manifest.json
git commit -m "fix: update manifest start_url and scope for Vercel root deployment"
git push origin main
```

Expected: push succeeds, GitHub shows new commit on `main`.

---

### Task 2: Connect repo to Vercel (manual)

**Files:** None — this is a Vercel dashboard action.

- [ ] **Step 1: Create a Vercel account or log in**

Go to https://vercel.com and sign in (use "Continue with GitHub" for the smoothest experience).

- [ ] **Step 2: Import the GitHub repo**

1. Click **Add New → Project**
2. Under "Import Git Repository", find `suh786/od-balance-tracker` and click **Import**

- [ ] **Step 3: Configure build settings**

On the configuration screen, set the following (leave everything else blank):

| Setting | Value |
|---|---|
| Framework Preset | Other |
| Root Directory | `./` (default) |
| Build Command | *(leave empty)* |
| Output Directory | *(leave empty)* |
| Install Command | *(leave empty)* |

- [ ] **Step 4: Deploy**

Click **Deploy**. Vercel will build (instantly, since there's no build step) and assign a URL.

Expected: deployment succeeds, URL shown is `od-balance-tracker.vercel.app` (or similar — Vercel may append a suffix if the name is taken; you can rename it in project settings).

---

### Task 3: Verify the deployment

**Files:** None — browser verification only.

- [ ] **Step 1: Open the Vercel URL in a browser**

Navigate to the URL shown after deploy (e.g. `https://od-balance-tracker.vercel.app`).

Expected: OD Balance Tracker app loads, shows the balance card UI.

- [ ] **Step 2: Verify the PWA manifest is valid**

In Chrome/Edge:
1. Open DevTools → Application tab → Manifest
2. Confirm no errors are shown
3. Confirm `start_url` shows `/`

Expected: No manifest errors. `start_url: /` is displayed.

- [ ] **Step 3: Verify the service worker registers**

In Chrome/Edge DevTools → Application → Service Workers:

Expected: `sw.js` is listed as active and running. No errors.

- [ ] **Step 4: Verify auto-deploy is wired up**

Make a trivial change (e.g. add a space to a comment in `js/app.js`), commit and push:

```bash
git add js/app.js
git commit -m "chore: trigger test deploy"
git push origin main
```

Go to the Vercel dashboard → your project → Deployments tab.

Expected: A new deployment appears within ~30 seconds and completes successfully.

Revert the trivial change:

```bash
git revert HEAD --no-edit
git push origin main
```

---

### Task 4: Disable GitHub Pages

**Files:** None — GitHub repo settings action.

- [ ] **Step 1: Open GitHub repo settings**

Go to https://github.com/suh786/od-balance-tracker/settings/pages

- [ ] **Step 2: Disable Pages**

Under "Build and deployment" → Source, change the value to **None** and click **Save**.

Expected: GitHub Pages is disabled. Any previous `github.io` URL will return 404.

---

## Done

All success criteria met:
- App loads at the Vercel URL
- PWA installs correctly (manifest valid, service worker active)
- Every `git push` to `main` triggers a new Vercel deployment
- GitHub Pages is disabled
