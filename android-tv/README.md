# Universal Themes TV — Android TV / Fire TV experimental client

This is a **test APK source project**, not a native Jellyfin fork or a completed playback client. It wraps the working `/web/universal-themes/index.html` viewer already installed on your Jellyfin Windows PC. All three styles (Netflix-inspired, Prime-inspired, Disney+-inspired), genre rows, and posters are loaded from that page. It does **not** synchronise a theme setting from GitHub automatically.

## Requirements
- Android Studio (includes Android SDK); JDK 17 for Android Gradle Plugin 8.7.3.
- Your Jellyfin server reachable from TV over LAN (typically `http://<PC-LAN-IP>:8096`). **Never enter `127.0.0.1` on the TV**; that refers to the TV itself.
- The web viewer already installed at `http://<PC-LAN-IP>:8096/web/universal-themes/index.html`.
- No secrets or credentials in this repository. Credentials are entered on the Jellyfin viewer page.

## Build on Windows
1. Copy the `android-tv` directory into your existing `jellyfin-universal-themes` repository.
2. Open the **android-tv** folder as a project in Android Studio.
3. Sync Gradle; choose JDK 17 and install SDK Platform 35 if prompted. This starter does **not** bundle a Gradle wrapper JAR; Android Studio may need a configured local Gradle installation, or generate a wrapper with `gradle wrapper --gradle-version 8.9` if Gradle is installed.
4. Build > Build Bundle(s) / APK(s) > Build APK(s) (debug), or run `gradle assembleDebug` with Gradle 8.9 installed.
5. Output should be `app/build/outputs/apk/debug/app-debug.apk` after a successful build.
6. Install using Android Studio or `adb install -r app-debug.apk` on an Android TV / Fire TV that supports standard Android APKs.

## First run
The app asks for the Jellyfin server URL. Use the PC's LAN address (run `ipconfig` on PC-OF-PAIN), not localhost. It loads your existing universal-themes viewer; sign in with your normal Jellyfin account. TV MENU opens server settings; holding BACK opens settings, and BACK normally goes back in the embedded browser. The app requests remote focus but native TV D-pad behaviour and playback must be tested on real hardware.

## Security / limitations
- `android:usesCleartextTraffic=true` is enabled to support local HTTP Jellyfin servers. Use HTTPS with valid certificates for untrusted networks and do not expose port 8096 directly to the public internet.
- This is a WebView integration; media playback, DRM, external players, focus navigation, on-screen keyboard and TV remote compatibility are **not guaranteed**. Some codecs may not play inside WebView. For a fully native TV player, fork the official Jellyfin Android TV release branch and implement themes as native UI components.
- This wrapper allows only same-origin links inside its WebView. It does not bypass Jellyfin user permissions.
- The source is original and separate from Jellyfin's GPL-2.0 Android TV client; don't package official client code without complying with its license.
- No automated test/compile has been run in this environment. Validate in Android Studio and on a device.
