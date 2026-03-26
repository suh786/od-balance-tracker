---
name: Vercel Deployment
description: Deploy OD Balance Tracker as a static PWA on Vercel via GitHub integration, replacing GitHub Pages
type: project
---

# Vercel Deployment Design

## Goal

Replace GitHub Pages with Vercel as the hosting platform for OD Balance Tracker. Use Vercel's GitHub integration for automatic deploys on every push to `main`.

## Architecture

This is a zero-build static site. Vercel serves the following files directly — no build step, no framework, no output directory configuration needed:

- `index.html`
- `css/style.css`
- `js/app.js`
- `sw.js`
- `manifest.json`
- `icons/icon-192.svg`
- `icons/icon-512.svg`

The backend remains unchanged — a Google Apps Script Web App separate from this repo.

## Code Changes

**`manifest.json`** — update `start_url` and `scope` from `"./"` to `"/"`.

Previously patched for a GitHub Pages subpath, these values should be root-relative on Vercel since the app is served from `/`.

No other code changes are required.

## Deployment Setup (one-time)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import `suh786/od-balance-tracker` from GitHub
3. Leave all build settings blank:
   - Framework Preset: Other
   - Build Command: (empty)
   - Output Directory: (empty)
4. Click Deploy
5. Vercel assigns URL: `od-balance-tracker.vercel.app`

All future pushes to `main` trigger automatic redeployment.

## GitHub Pages Cleanup

After confirming Vercel deployment works:

1. Go to GitHub repo Settings → Pages
2. Set source to "None" to disable GitHub Pages

## Success Criteria

- App loads at `od-balance-tracker.vercel.app`
- PWA installs correctly (manifest valid, service worker registers)
- Every `git push` to `main` triggers a new Vercel deployment
- GitHub Pages is disabled
