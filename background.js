// Fog: one global switch. When ON, a small control panel rides every page so you
// can dim it and lower its volume — each tab independently. The switch persists
// across refreshes and restarts.

function isBlocked(url) {
  return !url ||
    /^(chrome|edge|brave|about|view-source|chrome-extension):/.test(url) ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('https://chromewebstore.google.com');
}

async function isEnabled() { const o = await chrome.storage.local.get('enabled'); return !!o.enabled; }
async function setEnabled(v) { await chrome.storage.local.set({ enabled: v }); }

function setBadge(on) {
  chrome.action.setBadgeText({ text: on ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#C8952A' });
  chrome.action.setTitle({ title: on ? 'Fog: on (click to turn off)' : 'Fog: off (click to turn on)' });
}

async function assertFog(tabId) {
  try { await chrome.tabs.sendMessage(tabId, { type: 'fog-on' }); }
  catch (e) { try { await chrome.scripting.executeScript({ target: { tabId }, files: ['fog.js'] }); } catch (_) {} }
}
async function broadcast(on) {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) {
    if (!t.url || isBlocked(t.url)) continue;
    if (on) assertFog(t.id);
    else { try { await chrome.tabs.sendMessage(t.id, { type: 'fog-off' }); } catch (e) {} }
  }
}

// Toolbar click flips the global switch.
chrome.action.onClicked.addListener(async () => {
  const on = !(await isEnabled());
  await setEnabled(on);
  setBadge(on);
  broadcast(on);
});

// Keep fog present on every page load while the switch is on (covers new,
// reopened, and restored tabs).
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== 'complete') return;
  if (!tab || isBlocked(tab.url)) return;
  if (await isEnabled()) assertFog(tabId);
});

// Restore the badge (and re-fog restored tabs) when the browser starts.
chrome.runtime.onStartup.addListener(async () => {
  const on = await isEnabled();
  setBadge(on);
  if (on) broadcast(true);
});

// First install: default OFF, set the badge.
chrome.runtime.onInstalled.addListener(async () => { setBadge(await isEnabled()); });
