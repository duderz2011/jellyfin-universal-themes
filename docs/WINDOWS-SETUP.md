# Windows Jellyfin Setup

## 1. Check the server (read-only)
From PowerShell in the repository folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\windows\Test-Jellyfin.ps1
```

If the Jellyfin server listens on another address/port, append `-Server 'http://HOST:PORT'`. The script only reads `/System/Info/Public`.

## 2. Choose a web theme (no automatic server changes)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\windows\Install-Theme.ps1 -Theme cinema-dark
```

Themes: `cinema-dark`, `ocean-blue`, `midnight-purple`.

The installer **copies CSS to the clipboard** but **does not edit Jellyfin**. In the Jellyfin administrator dashboard locate **Branding > Custom CSS** (name/location may differ by server version). **Back up your existing CSS**, paste and save. Reload the Jellyfin web browser with Ctrl+F5. To undo the theme, restore the backup.

Use `-ShowOnly` to print the CSS without placing it on the clipboard. Review remotely downloaded CSS before using it.

## 3. Genre browser
The existing `web/` files are an experimental API-based prototype, not a complete production plugin. They query Jellyfin genre metadata without relocating any media. Production deployment needs proper Jellyfin user authentication and compatible cross-origin hosting.

## 4. Native Jellyfin apps
CSS themes cover Jellyfin Web and some embedded browser views only. Android TV, Fire TV, Roku, iOS, Tizen and webOS clients require separately implemented interfaces/integrations. The official clients cannot universally be re-skinned from server CSS.

## Safety
Never share admin API keys or long-lived access tokens. These PowerShell scripts do not change Jellyfin libraries, database or media folders.
