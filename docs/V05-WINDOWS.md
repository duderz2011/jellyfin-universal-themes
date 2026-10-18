# v0.5 Windows dashboard update

**Development release.** This updates the embedded plugin dashboard configuration page, not the server API and not native client UIs.

## Files
Replace `plugin/Jellyfin.Plugin.UniversalThemes/Configuration/configPage.html` in your existing GitHub Desktop clone with the supplied file. Keep `Plugin.cs`, `PluginConfiguration.cs`, and `.csproj` from v0.4 unchanged.

## Build
From the repository root:

```powershell
dotnet build ".\plugin\Jellyfin.Plugin.UniversalThemes" -c Release
```

## Install safely
1. Stop Jellyfin fully (service or tray app).
2. Back up the currently installed DLL from `D:\ProgramData\Jellyfin\Data\plugins\UniversalThemes_0.3.0` to a folder **outside** the plugins directory.
3. Copy `plugin\Jellyfin.Plugin.UniversalThemes\bin\Release\net10.0\Jellyfin.Plugin.UniversalThemes.dll` over the existing DLL.
4. Restart Jellyfin, reload its web dashboard, and open **Plugins > Universal Themes & Genres**.
5. If the plugin fails to load, stop Jellyfin and restore the backed-up DLL, then restart Jellyfin.

## Test
- Select a theme, edit genres, Save, refresh, and confirm settings persist.
- Click Copy selected theme CSS; the downloaded CSS is copied only, **not applied**.
- In Jellyfin **Dashboard > Branding > Custom CSS**, save a copy of any existing CSS first, paste the selected theme, and save. Revert by restoring your previous CSS.
- Select a genre and click Search. This performs a read-only authenticated Jellyfin item query and displays up to 36 matching movies/series. If your version exposes a different client-side method, errors will appear on the page; please share those errors for a compatibility patch.

## Limitations
- GitHub RAW must be reachable from the administrator's browser for CSS copying.
- The CSS controls *web-compatible clients only*. Official native clients need separate development.
- Genre browser is an admin dashboard preview, not genre rows on the home screen.
- No media file operations are performed; no directory moves, scanning or rewrites.
- The existing plugin configuration and GUID are preserved.
