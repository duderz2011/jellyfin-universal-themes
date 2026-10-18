# Delivery roadmap

## Phase 1 — proof of concept (included)
Theme catalogue, three Jellyfin Web CSS themes, browser-based genre filtering via existing metadata and documentation.

## Phase 2 — Jellyfin server plugin (not yet implemented)
Use official jellyfin-plugin-template and match NuGet package versions to user's installed server. Provide authenticated theme manifest API, per-user preferences and server-side genre discovery. No folder restructuring.

## Phase 3 — web integration (not yet implemented)
Add theme selection UI, genre strips, pagination, secure image rendering, integration tests, backward-compatible updates. Avoid fragile injected JavaScript where possible.

## Phase 4 — native clients (not yet implemented)
Implement theme token adapters in maintained Android TV/Fire TV fork first, then investigate Android phone, iOS, Roku, Tizen, webOS and other clients. Each needs its own rendering code and distribution/update channel. Official apps cannot be universally changed just by a server plugin.

## Phase 5 — operational releases
GitHub Actions, release artifacts, tested upgrade/rollback pathways and documented installation per device family.
