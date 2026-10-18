# Universal Themes Web v0.8 — Jellyfin library navigation

Changes viewer top navigation from fixed Movies / TV Shows to each logged-in user's accessible Jellyfin libraries, sourced from `/Users/{userId}/Views`.

- Home keeps the overall Recently Added and per-library Recently Added rows.
- Choosing a library, e.g. Marvel Movies or TV Shows A–F, scopes Recently Added, Top Rated, Search and Genre selection to that library via `ParentId`.
- Genres are loaded with the selected library ID when available. Genres do not control library visibility; categories without metadata still appear.
- Netflix, Prime and Disney-style colour schemes and click-to-open details remain.
- No changes to media paths, database, Jellyfin plugin or Android APK.

## Install on Windows

1. Extract archive at your repository root, preserving `web/universal-themes/...`.
2. Copy/update and commit through GitHub Desktop.
3. Run (PowerShell as administrator):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\dudle\Documents\GitHub\jellyfin-universal-themes\windows\Install-WebViewer.ps1" -WebRoot "D:\Program Files\Jellyfin\Server\jellyfin-web"
```

4. Refresh `http://127.0.0.1:8096/web/universal-themes/index.html` with Ctrl+Shift+R. The installer backs up the old viewer before copying.

## Validation

Sign in as two users with different library permissions. Verify that each menu lists only that user's accessible libraries. Check Home, a library with movies, a split TV-series library and a library without genre metadata. Genre filters should be scoped within the selected library. This release has not been tested against the user's live server.

Note: This experimental viewer uses Jellyfin Web API and does not change the built-in Jellyfin home screen or native clients.
