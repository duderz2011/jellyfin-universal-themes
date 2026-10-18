# v0.6 — Jellyfin Web viewer, Windows 12.2.0

This is a **separate web viewer**, not a replacement for Jellyfin's official home screen. The plugin settings can be used to choose one of three CSS styles, but the standalone viewer's theme selector is local to the page and does not yet sync to those plugin preferences. Device-wide theming is not implemented.

## 1. Install the viewer files

Extract v0.6 into your cloned GitHub project folder. Determine your *actual* Jellyfin Web root, which contains `index.html` and other Jellyfin Web assets. On Windows it may be under `D:\Program Files\Jellyfin\Server\jellyfin-web` or another installation location; do not assume it is the data or plugins directory. To find it, run in PowerShell:

```powershell
Get-ChildItem 'D:\' -Filter index.html -Recurse -ErrorAction SilentlyContinue |
 Where-Object { $_.FullName -match 'jellyfin-web' } |
 Select-Object -First 10 FullName
```

Once the correct web root is known, run from the cloned repository folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\windows\Install-WebViewer.ps1 -WebRoot 'D:\ACTUAL\PATH\TO\jellyfin-web'
```

Open `http://127.0.0.1:8096/web/universal-themes/index.html` and sign in with your Jellyfin **user** login. The viewer retrieves library data from the **same Jellyfin origin**. Use HTTPS if accessing remotely. The viewer holds the access token in page memory, not in persistent storage, and retrieves images with authenticated requests; nothing is sent to GitHub except optional CSS requests via the dashboard helper.

If the URL gives 404, the folder may have been copied to the wrong web root or static file serving may restrict unknown subdirectories. The URL also assumes the usual `/web` path, not a custom reverse-proxy prefix.

## 2. Build and install the updated plugin settings

```powershell
dotnet build .\plugin\Jellyfin.Plugin.UniversalThemes -c Release
```

Stop Jellyfin first. Back up your currently installed plugin DLL, then replace **only** that DLL with the new compiled one. Restart Jellyfin. Keep the existing plugin GUID and settings.

## 3. Revert

To remove the viewer, delete only the `universal-themes` folder from the Jellyfin Web root (not any core Jellyfin Web files). If a previous viewer folder was backed up, restore it. The built-in Jellyfin Web is unaffected; no library paths were changed.

## Limitations

- Standalone, viewer-facing homepage; **does not yet automatically load as Jellyfin's default home**.
- No playback UI inside viewer. Click a title to open its Jellyfin details page in a new browser tab.
- The three themes are visually inspired by popular streaming services, not official branded implementations.
- Uses fixed genre labels; server plugin genre order is not yet synchronised with the standalone viewer.
- For native Android TV, Fire TV, Roku, iOS and other clients, separate supported client integrations are required.
- Verify playback and authentication on your own installation; this package was not executed against your Windows server.
