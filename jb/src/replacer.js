(function () {
  const WORDMAP_URLS = [
    chrome.runtime.getURL('src/wordmap.json'),
    chrome.runtime.getURL('src/wordmapPL.json')
  ];
  let replacements = null;
  let matcher = null;
  let settings = {
    enabled: true,
    disabledHosts: []
  };
  let inputListenerAttached = false;
  Promise.all(
    [chrome.storage.sync.get(['enabled', 'disabledHosts'])].concat(
      WORDMAP_URLS.map((url) =>
        fetch(url).then((r) => (r.ok ? r.json() : [])).catch(() => [])
      )
    )
  )
    .then((results) => {
      const [{ enabled = true, disabledHosts = [] }, ...lists] = results;
      settings.enabled = enabled !== false;
      settings.disabledHosts = Array.isArray(disabledHosts) ? disabledHosts : [];
      const combined = lists.flat();
      if (!Array.isArray(combined)) return;
      const unique = new Map();
      for (const row of combined) {
        if (!Array.isArray(row) || row.length < 2) continue;
        const from = String(row[0] ?? '').trim();
        const to = String(row[1] ?? '');
        if (!from) continue;
        const key = from.toLowerCase();
        if (!unique.has(key)) unique.set(key, [from, to]);
      }
      replacements = Array.from(unique.values());
      if (replacements.length === 0) return;
      const escaped = replacements.map(([from]) => escapeRegex(from)).join('|');
      try {
        matcher = new RegExp(`(?<![\ 0-\ 255\ 0-9_])(${escaped})(?![\ 0-\ 255\ 0-9_])`, 'giu');
      } catch (_e) {
        matcher = new RegExp(`\b(${escaped})\b`, 'gi');
      }
      applyNow();
      observeMutations();
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.type === 'JbSettingsChanged') {
          chrome.storage.sync.get(['enabled', 'disabledHosts']).then((s) => {
            settings.enabled = s.enabled !== false;
            settings.disabledHosts = Array.isArray(s.disabledHosts) ? s.disabledHosts : [];
            applyNow();
          });
        }
      });
    })
    .catch(() => {});
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function replaceTextContent(text) {
    if (!matcher || !replacements) return text;
    return text.replace(matcher, (m) => lookupReplacement(m));
  }
  function lookupReplacement(match) {
    if (!replacements) return match;
    const lower = match.toLowerCase();
    for (const [from, to] of replacements) {
      if (lower === from.toLowerCase()) return preserveCase(match, to);
    }
    return match;
  }
  function preserveCase(source, target) {
    if (source === source.toUpperCase()) return target.toUpperCase();
    if (source[0] === source[0].toUpperCase()) return target.charAt(0).toUpperCase() + target.slice(1);
    return target;
  }
  function shouldSkip(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    const tag = parent.tagName;
    if (/^(SCRIPT|STYLE|NOSCRIPT|IFRAME)$/i.test(tag)) return true;
    if (/^(TEXTAREA|INPUT)$/i.test(tag)) return true;
    if (/^(CODE|PRE|KBD|SAMP)$/i.test(tag)) return true;
    if (parent.isContentEditable) return true;
    return false;
  }
  function walkAndReplace(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (shouldSkip(n)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const n of textNodes) {
      const before = n.nodeValue;
      const after = replaceTextContent(before);
      if (after !== before) n.nodeValue = after;
    }
  }
  function replaceInDocument() {
    walkAndReplace(document.documentElement || document.body || document);
  }
  function applyNow() {
    if (!isActive()) return;
    replaceInDocument();
  }
  function observeMutations() {
    const observer = new MutationObserver((mutations) => {
      if (!isActive()) return;
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              if (shouldSkip(node)) return;
              const before = node.nodeValue || '';
              const after = replaceTextContent(before);
              if (after !== before) node.nodeValue = after;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              walkAndReplace(node);
            }
          });
        } else if (m.type === 'characterData' && m.target?.nodeType === Node.TEXT_NODE) {
          const t = m.target;
          if (shouldSkip(t)) continue;
          const before = t.nodeValue || '';
          const after = replaceTextContent(before);
          if (after !== before) t.nodeValue = after;
        }
      }
    });
    observer.observe(document.documentElement || document.body || document, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
  function isActive() {
    if (!settings.enabled) return false;
    const host = location.host;
    if (host && settings.disabledHosts.includes(host)) return false;
    return true;
  }
})();

