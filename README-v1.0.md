# Universal Themes v1.0 — first in-page playback and session persistence

- Keeps v0.9 catalogue navigation and Home layout.
- Plays Movie/Video items inside a modal HTML5 video player; Series show an episode picker.
- Uses a direct stream from the authenticated Jellyfin server. Compatible MP4/H.264/AAC may work; MKV, HEVC, DTS and other codecs can fail in browser/WebView. **This build does not yet implement adaptive HLS transcoding or playback progress reporting.**
- 'Log out' clears saved token and attempts to invalidate Jellyfin session.
- Saves Jellyfin's access token in browser localStorage until logout or expiry; does not save password. Use only on trusted devices (especially shared Firesticks). On the same web origin, other scripts could access this token if compromised. Use HTTPS when outside the local network.
- Token appears in the media request query URL as required by HTML5 media elements without custom request headers. Jellyfin server logs or browser diagnostic tools may record it. Avoid sharing network logs or screenshots containing those URLs.
- JavaScript source passes syntax validation only; server formats/devices require live testing.

Copy `web/` into project and run existing `windows/Install-WebViewer.ps1` again. Ctrl+Shift+R in browser. Do not rebuild Android APK for this viewer update.
