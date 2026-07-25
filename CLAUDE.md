# CLAUDE.md

Conventions and architecture notes for this project.

## What this is

**Slider** (extension name: **Fog**) — a Chrome/Edge/Brave Manifest V3
extension that adds a draggable per-tab control chip for dimming/brightening
the page and controlling the volume of any video/audio on it. Built by
Railroad Earth ATL; source is confidential — see `LICENSE`.

## Design Principles

Shared across all Palette apps (Eyes, Ears, Slider):

- **Recorder controls are real toggles.** Any control that turns a recorder
  (camera, mic, video/audio recording) on must use that same single button
  to turn it off — a genuine state-based toggle, never a separate start/stop
  button pair, and never a "start" action that silently stops-then-restarts
  as an internal reset step. The button's label (or visual state, for
  icon-only controls) should switch to reflect current on/off state.

  Fog itself has no recording feature, so this principle doesn't currently
  apply to any control here — noted for consistency with sibling apps and
  in case recording-adjacent features are added later.

## Architecture

### `manifest.json`

MV3 manifest: `scripting` + `storage` permissions, `<all_urls>` host
permission, a `background.js` service worker, and `fog.js` injected into
every page (`run_at: document_idle`). Toolbar `action` icon set
(16/32/48/128) lives in `icons/`.

### `background.js` — global on/off state

A single global enabled/disabled switch, persisted in `chrome.storage.local`
(not per-tab — Fog is either on everywhere or off everywhere):

- `isBlocked(url)` filters out URLs Fog can't/shouldn't run on: chrome://,
  edge://, brave://, about:, view-source:, chrome-extension://, and the
  Chrome Web Store.
- `assertFog(tabId)` pushes the current on-state into a tab — first tries
  messaging the content script (`fog-on`), falling back to
  `chrome.scripting.executeScript` if the content script isn't there yet.
- `broadcast(on)` iterates all open tabs and calls `assertFog`/sends `fog-off`
  as appropriate.
- Toolbar icon click toggles the global switch, updates the badge
  (`chrome.action.setBadgeText`, amber `#C8952A`), and broadcasts the new
  state to every tab.
- `chrome.tabs.onUpdated` re-asserts Fog after navigation completes, so a
  page load doesn't silently drop back to un-fogged.
- `chrome.runtime.onStartup` / `onInstalled` restore the badge and re-fog
  already-open tabs after a browser restart or extension reload.

### `fog.js` — the per-tab chip

Content script; guards against double-injection via
`window.__reaFogInit`. On load it self-checks
`chrome.storage.local.get('enabled')` and listens for `fog-on`/`fog-off`
runtime messages from the background worker.

Builds a small draggable "chip" (`#rea-fog-chip`) containing two custom
`<input type=range>` controls, each styled as an octagon-clip-path knob
(`OCTAGON` constant) with a randomized faceted conic-gradient texture
(`buildFacets()`) rather than the native slider thumb — dragging is
implemented manually via hit-testing (`knobCenter`, `valueFromX`,
`nearKnob`) rather than relying on native slider drag behavior. The whole
chip itself is draggable around the viewport (`clampToViewport` keeps it
on-screen).

- **Brightness slider** (`.ff-bright`): maps its 0–100 value through a
  signed `t = (v-50)/50` into
  `document.body.style.filter = brightness(1+0.6*t) contrast(1-0.5*t)`
  (`B_SPAN=0.6`, `C_SPAN=0.5`) — so 50 is neutral, below dims+lowers
  contrast, above brightens+raises contrast.
- **Volume slider** (`.ff-vol`): sets `.volume` directly on every
  `video`/`audio` element found via `querySelectorAll`, plus a
  `MutationObserver` on `document.documentElement` (only active once the
  user has actually touched the slider, via `volTouched`) to catch media
  elements added to the page later. Cleanup restores volume to 1 rather
  than leaving pages muted/altered after Fog is turned off.

### Worktrees

`~/fog` is the `main` branch (pushed to
`https://github.com/neilvfried/fog.git`). `~/fog_pii` is a linked worktree
on a `playground` branch used for active R&D not yet merged to main (e.g.
a 2D polar-pad UI experiment) — treat it as in-progress work, not a fork to
clean up.
