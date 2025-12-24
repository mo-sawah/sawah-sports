# Sawah Sports (MVP v0.1.0)

Premium white-mode football widgets for Elementor, powered by Sportmonks (API v3).

## Features (Phase 1 MVP)
- Elementor widget category: **Sawah Sport**
- Widgets:
  - **Live Matches** (auto-refresh)
  - **Standings** (by Season ID)
  - **League Fixtures & Results** (by Date + League IDs)
- Admin settings:
  - Sportmonks API token + connection test
  - Cache toggles + TTL controls
  - Basic public REST rate-limit

## Install
1. Install/activate **Elementor**.
2. Upload `sawah-sports.zip` in WordPress → Plugins → Add New → Upload.
3. Go to **Sawah Sports → Settings** and paste your Sportmonks API token.
4. Open Elementor editor and search for **Sawah**.

## Notes
- This MVP uses server-side token storage. Visitors never see your Sportmonks token.
- Some Sportmonks fields (images, deep stats) depend on your subscription plan.
- Next phase: Match Center (events + lineups + stats), Team pages, Player pages, editor-friendly league picker, Greek UI packs.
