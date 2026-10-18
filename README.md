# Jellyfin Universal Themes & Genre Manager

**Status: v0.1 starter / proof of concept, not a completed universal Jellyfin client.**

## Objectives
- Maintain theme presets in one GitHub repository.
- Browse **existing** Jellyfin movie and TV series libraries by **genre metadata**, without changing storage directories.
- Provide a companion genre browser and CSS themes for Jellyfin Web.
- Develop native integrations for each client platform separately (Android TV/Fire TV, Android, iOS, Roku, Tizen, webOS etc.). Official native clients cannot be forcibly restyled by server CSS.

## What's included
- `themes/catalog.json`: shared design tokens and genre list.
- `themes/*.css`: three initial web-only themes.
- `web/`: browser-side genre search prototype using Jellyfin's authenticated API.
- `docs/ROADMAP.md`: architecture and integration boundaries.

## Install a web theme
1. Open the chosen `themes/*.css` file.
2. Copy its entire contents into **Jellyfin Dashboard → Branding → Custom CSS**.
3. Reload web-based clients. Existing media files and libraries are untouched.

## Run the genre browser (experimental)
Host the `web/` directory on a trusted local server or same HTTPS origin as Jellyfin (through an appropriately configured reverse proxy); it is not a server plugin yet. Enter your Jellyfin base URL and **your own user session access token**. Token is only held in page memory, never stored or uploaded to GitHub. Do not embed admin/API keys in HTML, public repositories, URLs or front-end source. Jellyfin might reject calls from other origins due to CORS. Some image URLs won't work until an authenticated image proxy or browser-compatible credentials are implemented. Browser links to Jellyfin may differ with base-path or client versions.

The starter queries `/Users/Me`, `/Genres`, and `/Items` and displays up to 100 matches. Genre filters use metadata and do not create/alter directories. More robust pagination, token-safe images, accessibility and formal testing are future work.

## Planned production architecture
- C# Jellyfin server plugin for shared catalogue/configuration and genre queries, built against the **exact** installed Jellyfin server version.
- Web client theme manager and genre navigation.
- Native Android TV/Fire TV theme-aware client fork; separate adapters/forks for other platforms, subject to each platform's development and store rules.
- Automated build/test/release workflows and a manifest for optional compatible clients to fetch versioned themes.

## Safety
Never publish Jellyfin session tokens, API keys, database files, or private server details. Back up Jellyfin configuration before installing plugins or altering clients. This repository does not modify your media files.
