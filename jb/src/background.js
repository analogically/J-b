const CONTEXT_MENU_ID = 'jb_toggle_highlight';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'J*B: Toggle highlight',
    contexts: ['page', 'selection']
  });
  setActionIconFromIconPng();
});

chrome.runtime.onStartup.addListener(() => {
  setActionIconFromIconPng();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  if (!tab?.id) return;
  await toggleHighlight(tab.id);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'JbToggleHighlight') {
    const tabId = message.tabId;
    if (typeof tabId === 'number') {
      toggleHighlight(tabId).then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: String(e) }));
      return true;
    }
  }
  return undefined;
});

async function toggleHighlight(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['src/contentScript.js']
  });
}

async function setActionIconFromIconPng() {
  try {
    await chrome.action.setIcon({
      path: {
        16: 'icon.png',
        32: 'icon.png',
        48: 'icon.png',
        128: 'icon.png'
      }
    });
  } catch (_e) {}
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'JbToggleThemeIcon') {
    const light = Boolean(msg.light);
    chrome.action.setIcon({
      path: light
        ? { 16: 'icon-light.png', 32: 'icon-light.png', 48: 'icon-light.png', 128: 'icon-light.png' }
        : { 16: 'icon.png', 32: 'icon.png', 48: 'icon.png', 128: 'icon.png' }
    });
  }
});

