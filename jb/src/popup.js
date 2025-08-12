document.addEventListener('DOMContentLoaded', async () => {
  const enabledToggle = document.getElementById('enabled-toggle');
  const siteToggleBtn = document.getElementById('site-toggle');
  const siteHost = document.getElementById('site-host');
  const xBtn = document.getElementById('x-link');
  const githubBtn = document.getElementById('github-link');
  const themeBtn = document.getElementById('theme-btn');
  const settingsBtn = document.getElementById('settings-btn');

  const logo = document.getElementById('logo');
  if (logo) {
    logo.addEventListener('error', function() {
      this.style.display = 'none';
    });
  }

  const [{ enabled = true, disabledHosts = [] } = {}, tab] = await Promise.all([
    chrome.storage.sync.get(['enabled', 'disabledHosts']),
    chrome.tabs.query({ active: true, currentWindow: true }).then((t) => t[0])
  ]);

  const url = new URL(tab?.url || '');
  const host = url.host;
  siteHost.textContent = (host || 'current site').replace(/^www\./i, '');

  enabledToggle.checked = enabled !== false;
  const isDisabledForSite = host && disabledHosts.includes(host);
  updateSiteButton(isDisabledForSite);
  updateSiteBadge(isDisabledForSite);

  enabledToggle.addEventListener('change', async () => {
    await chrome.storage.sync.set({ enabled: enabledToggle.checked });
    notifyTabs('JbSettingsChanged');
    updateSiteBadge(host && (await isHostDisabled(host)));
  });

  siteToggleBtn.addEventListener('click', async () => {
    if (!host) return;
    const { disabledHosts: current = [] } = await chrome.storage.sync.get('disabledHosts');
    const idx = current.indexOf(host);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(host);
    await chrome.storage.sync.set({ disabledHosts: current });
    updateSiteButton(current.includes(host));
    updateSiteBadge(current.includes(host));
    notifyTabs('JbSettingsChanged');
  });

  function updateSiteButton(disabled) {
    siteToggleBtn.textContent = disabled ? 'Enable on this site' : 'Disable on this site';
  }

  function updateSiteBadge(disabled) {
    const siteStatus = document.getElementById('site-status');
    const enabled = enabledToggle.checked && !disabled;
    siteStatus.textContent = enabled ? 'Enabled' : 'Disabled';
    siteStatus.style.background = enabled ? 'rgba(11,95,255,0.15)' : 'rgba(255,77,0,0.15)';
    siteStatus.style.borderColor = enabled ? 'rgba(11,95,255,0.35)' : 'rgba(255,77,0,0.35)';
    siteStatus.style.color = enabled ? '#7fb2ff' : '#ffae91';
  }

  try {
    const urlBase = chrome.runtime.getURL('src/links.json');
    const links = await fetch(urlBase).then((r) => r.json());
    xBtn?.addEventListener('click', () => openLink(links?.X));
    githubBtn?.addEventListener('click', () => openLink(links?.github));
  } catch (e) {}

  const { theme = 'dark' } = await chrome.storage.sync.get('theme');
  applyTheme(theme);
  themeBtn.addEventListener('click', async () => {
    const next = (await chrome.storage.sync.get('theme')).theme === 'light' ? 'dark' : 'light';
    await chrome.storage.sync.set({ theme: next });
    applyTheme(next);
    chrome.runtime.sendMessage({ type: 'JbToggleThemeIcon', light: next === 'light' }).catch(() => {});
    animateThemeIcon(next);
  });

  settingsBtn.addEventListener('click', () => {
    const panel = document.getElementById('settings-panel');
    panel.classList.toggle('collapsed');
  });

  document.querySelectorAll('.donate-row, .copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const selector = btn.getAttribute('data-copy');
      const el = selector ? document.querySelector(selector) : null;
      if (!el) return;
      try {
        await navigator.clipboard.writeText(el.textContent || '');
        showToast('Copied');
      } catch (e) {
        showToast('Copy failed');
      }
    });
  });
});

async function notifyTabs(type) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
      if (t.id) chrome.tabs.sendMessage(t.id, { type }).catch(() => {});
    }
  } catch (e) {}
}

function openLink(href) {
  if (!href) return;
  chrome.tabs.create({ url: href });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => (toast.hidden = true), 1400);
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.style.setProperty('color-scheme', 'light');
    document.body.style.background = 'linear-gradient(180deg, #f7f4ff, #efeaff)';
    document.body.style.color = '#3b2a55';
    document.querySelectorAll('.card').forEach((el) => {
      el.setAttribute('style', 'border:1px solid rgba(124,58,237,0.25); background: linear-gradient(180deg, rgba(255,255,255,0.85), rgba(238,232,255,0.95)); box-shadow: 0 12px 30px rgba(124,58,237,0.15);');
    });
    document.querySelectorAll('.mono').forEach((el) => {
      el.style.color = '#4c1d95';
    });
    document.querySelectorAll('.donate strong').forEach((el) => {
      el.style.color = '#4c1d95';
      el.style.fontWeight = '700';
    });
  } else {
    root.style.setProperty('color-scheme', 'dark');
    document.body.style.background = 'linear-gradient(180deg, #0b0b10, #121018)';
    document.body.style.color = '#e9d5ff';
    document.querySelectorAll('.card').forEach((el) => {
      el.setAttribute('style', 'border:1px solid rgba(124,58,237,0.22); background: linear-gradient(180deg, rgba(124,58,237,0.08), rgba(28,24,37,0.35)); box-shadow: 0 20px 60px rgba(0,0,0,0.45);');
    });
    document.querySelectorAll('.mono').forEach((el) => {
      el.style.color = '#e9d5ff';
    });
    document.querySelectorAll('.donate strong').forEach((el) => {
      el.style.color = '#e9d5ff';
      el.style.fontWeight = '700';
    });
  }
}

function animateThemeIcon(next) {}

