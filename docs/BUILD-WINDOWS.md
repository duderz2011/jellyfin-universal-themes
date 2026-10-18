# Jellyfin Universal Themes plugin scaffold (12.2.0)

This is **source code**, not a built DLL, and is **not yet ready for installation**. Jellyfin server version 12.2.0 uses .NET 10. The project is a minimal configuration-only starting point; no custom Jellyfin routes, theme UI, plugin repository feed, or client modification is implemented yet.

## Build prerequisite

Open PowerShell and run:

```powershell
dotnet --list-sdks
```

If .NET 10 SDK is missing, install the official .NET 10 SDK from https://dotnet.microsoft.com/download/dotnet/10.0 .

## Initial validation build

From the root of your local GitHub clone:

```powershell
dotnet restore .\plugin\Jellyfin.Plugin.UniversalThemes\Jellyfin.Plugin.UniversalThemes.csproj
dotnet build .\plugin\Jellyfin.Plugin.UniversalThemes\Jellyfin.Plugin.UniversalThemes.csproj -c Release
```

If there are compiler errors, share the complete output. Do not install a DLL until the project has been built and load-tested for your Jellyfin installation; the template currently has not been compiled or executed in this environment.

## Scope and safety

Plugin configuration stores theme name and genre labels only. Genre browsing will query Jellyfin's existing genre metadata, without moving, renaming or copying files. Native Jellyfin clients must separately implement any new layouts; installing a server plugin does not re-theme Roku, Android TV or other native apps.

## GitHub Desktop

Copy the `plugin` folder and `docs/BUILD-WINDOWS.md` into the root of `jellyfin-universal-themes`, then commit and push. Do not overwrite existing `themes` or `web` files.
