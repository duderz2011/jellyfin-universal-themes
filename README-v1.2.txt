Universal Themes v1.2 — Auto Next Episode + Jellyfin Continue Watching / Next Up

Copy the web folder over your repository web folder. This includes all v1.1 resume/progress functionality and v1.0 features, so no separate patch is needed.

1. Back up your repository web/universal-themes/ directory.
2. Copy web/universal-themes/{app.js,index.html,styles.css} into the same folder in your repository.
3. Run windows/Install-WebViewer.ps1 with -WebRoot matching Jellyfin web directory as in prior versions.
4. Refresh browser with Ctrl+Shift+R.

Home now adds Continue Watching and Next Up above Recently Added. Jellyfin's own user data and NextUp endpoint are used. Finishing an episode reports completion to Jellyfin and attempts to play the following accessible episode in series order. Resume prompts use Jellyfin's recorded position.

Notes: Jellyfin API behavior may vary by server version; test with your Jellyfin 12.2 server. This feature does not change library permissions. Playback URL approach still depends on browser codec support, and audio/subtitle selection/transcoding remain future work. Autoplay from the ended event may still require a user gesture depending on browser policies. No APK rebuild required.
