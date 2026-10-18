# Universal Themes v0.9 – Catalogue and featured titles

Changes:
- On Home, keep the recently added horizontal rails, plus a top-rated row (only on Home).
- Library tabs show the full accessible catalogue, 60 titles per page, sorted alphabetically, with Previous and Next navigation.
- Genres and Search filter within the selected library and reset pagination.
- Home hero rotates every 3 seconds between recent releases and top-rated titles drawn from accessible Jellyfin media. No TMDB API key required.
- Featured rotation pauses while tab is hidden or details modal is open; reduced-motion preference disables automatic rotation.

Installation: extract the web folder into the project root, then run windows/Install-WebViewer.ps1 -WebRoot against your jellyfin-web directory. Hard refresh.

Known limitations: release dates/rating metadata depend on your Jellyfin library; pagination is 60 at a time; large libraries may show many pages. No Android APK change required.
