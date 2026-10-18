# Dashboard configuration update — v0.4 development build

This update adds an **embedded configuration page** via `IHasWebPages` to the existing Jellyfin 12.2.0 .NET 10 plugin. It reads/writes the same `ThemeId` and `DisplayGenres` fields. **This is not a complete theme or genre navigation engine.** Saving a preference does not automatically apply CSS to web clients or restyle any native client. It does not alter media files or paths.

## Add to GitHub

Extract the ZIP, copy its `plugin/` and `docs/` folder contents into your **existing** `jellyfin-universal-themes` clone, replacing the matching source files. In GitHub Desktop, review changes, Commit to main, Push origin.

## Build (PowerShell in repository root)

```powershell
dotnet build '.\plugin\Jellyfin.Plugin.UniversalThemes' -c Release
```

Do not install if build fails. This code has **not been compiled or integration-tested in this environment**; Jellyfin 12.2.0 API differences may require fixes based on your build output.

## Install (only after a successful build)

1. Stop Jellyfin using the tray app or Windows service, whichever you use.
2. Back up `D:\ProgramData\Jellyfin\Data\plugins\UniversalThemes_0.3.0\` and your Jellyfin configuration.
3. Copy the newly compiled `Jellyfin.Plugin.UniversalThemes.dll` from `plugin\Jellyfin.Plugin.UniversalThemes\bin\Release\net10.0\` into the existing `D:\ProgramData\Jellyfin\Data\plugins\UniversalThemes_0.3.0\` folder, overwriting only that plugin DLL.
4. Start Jellyfin and open Dashboard > Plugins > My Plugins > Universal Themes & Genres. A configuration screen should be available when Jellyfin detects the embedded page. If not, collect the startup log and browser errors for diagnosis.
5. Choose a theme, reorder genres, Save, reload and confirm settings persist.

## Rollback

Stop Jellyfin, restore the backed-up DLL (or the whole versioned plugin directory), restart Jellyfin. Do not edit the media database or libraries.

## Known boundaries

- Genre fields are preference strings; there is no metadata search API from this plugin yet.
- Theme ID is stored only; web CSS must be installed separately, and native apps cannot be restyled by a server plugin alone.
- A manual plugin install may show a repository-details warning even when Active.
