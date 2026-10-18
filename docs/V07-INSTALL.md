# Universal Themes Web v0.7 — Library-led homepage

**Test build; no changes to Jellyfin server DLL, database or media directories.**

## What's changed
- Home: recently added overall and separately in each accessible Jellyfin library (including library titles with no genre metadata), plus top-rated local movies and TV shows.
- Movies / TV Shows: content filters.
- Genres dropdown: real indexed metadata genre choices rather than 16 automatic home rows.
- Netflix / Prime / Disney-inspired visual presets retained.
- Proper poster-button clicks open a details modal; its Open in Jellyfin control navigates to the standard Jellyfin detail URL.
- TMDB trending **not yet implemented**. "Top rated in your library" comes from Jellyfin CommunityRating and must not be called TMDB trending. A future secure backend endpoint with a TMDB API credential held only on the server can feed optional discover rows, with a clear "Not necessarily in your library" label.

## Install on Windows
1. Extract this patch, and copy the **web** directory into the existing GitHub checkout, merging and replacing the three viewer files.
2. Run from PowerShell (elevated if Jellyfin's Program Files is protected):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\dudle\Documents\GitHub\jellyfin-universal-themes\windows\Install-WebViewer.ps1" -WebRoot "D:\Program Files\Jellyfin\Server\jellyfin-web"
```

3. Open http://127.0.0.1:8096/web/universal-themes/index.html, force refresh Ctrl+Shift+R, and log in.
4. Test a user with access to a library lacking genre metadata; verify it appears under Recently added. Test Movies, TV Shows and genre dropdown. Test selecting a poster.

## Rollback
The installer backs up the previous `universal-themes` directory to a timestamped sibling folder. Stop the Jellyfin server before restoring those files if Windows locks them. Alternatively restore the previous GitHub version and rerun the installer.

## Permissions and content
Only the signed-in user's accessible library views are queried through Jellyfin; no XXX or other named libraries are hard-coded. Do not assume genre tagging exists or expose recommendations from libraries the user cannot access. This patch doesn't modify permission settings or introduce parental controls.
